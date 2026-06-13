import { describe, it, expect } from "vitest";
import type {
  Options,
  SDKMessage,
  AgentDefinition,
} from "@anthropic-ai/claude-agent-sdk";
import {
  createQueryRunner,
  QueryRunnerError,
  DEFAULT_CAPS,
  type QueryFn,
} from "../src/sdk/query-runner.js";
import type { StepRunCall } from "../src/orchestrator/types.js";

/** Agent minimal (issu de l'adaptateur §2.4-A) pour les appels de test. */
const AGENT: AgentDefinition = {
  description: "Agent de cadrage",
  prompt: "Tu es l'agent BUSINESS-ANALYST.",
  tools: ["Read", "Grep", "Glob"],
};

function call(overrides: Partial<StepRunCall> = {}): StepRunCall {
  return { stepId: "STEP-01", agent: AGENT, input: { brief: "x" }, ...overrides };
}

/** Message de résultat `success` minimal, complété puis casté en SDKMessage. */
function successResult(fields: Record<string, unknown>): SDKMessage {
  return {
    type: "result",
    subtype: "success",
    is_error: false,
    result: "",
    num_turns: 1,
    errors: [],
    ...fields,
  } as unknown as SDKMessage;
}

/** Message de résultat d'erreur minimal. */
function errorResult(subtype: string, errors: string[] = []): SDKMessage {
  return {
    type: "result",
    subtype,
    is_error: true,
    num_turns: 1,
    errors,
  } as unknown as SDKMessage;
}

/** Faux `query` qui émet la liste de messages fournie, et capture les params reçus. */
function fakeQuery(
  messages: SDKMessage[],
): QueryFn & { lastParams?: { prompt: string; options?: Options } } {
  const fn = async function* (params: { prompt: string; options?: Options }) {
    fn.lastParams = params;
    for (const m of messages) yield m;
  } as QueryFn & { lastParams?: { prompt: string; options?: Options } };
  return fn;
}

const emptyEnv: Record<string, string | undefined> = {};

describe("createQueryRunner — adaptateur query() → StepRunner (§2.4-B.3)", () => {
  it("mappe l'agent vers les options query() (systemPrompt, tools, model) + plan forcé", async () => {
    const q = fakeQuery([successResult({ result: "ok" })]);
    const runner = createQueryRunner({ query: q, env: emptyEnv });
    await runner(
      call({ agent: { ...AGENT, model: "claude-opus-4-8" } }),
    );
    const opts = q.lastParams!.options!;
    expect(opts.systemPrompt).toBe(AGENT.prompt);
    expect(opts.allowedTools).toEqual(["Read", "Grep", "Glob"]);
    expect(opts.model).toBe("claude-opus-4-8");
    expect(opts.permissionMode).toBe("plan");
    expect(opts.maxBudgetUsd).toBe(DEFAULT_CAPS.maxBudgetUsd);
  });

  it("sérialise une entrée non-string en JSON pour le prompt", async () => {
    const q = fakeQuery([successResult({ result: "ok" })]);
    const runner = createQueryRunner({ query: q, env: emptyEnv });
    await runner(call({ input: { brief: "x" } }));
    expect(q.lastParams!.prompt).toBe(JSON.stringify({ brief: "x" }));
  });

  it("passe une entrée string telle quelle", async () => {
    const q = fakeQuery([successResult({ result: "ok" })]);
    const runner = createQueryRunner({ query: q, env: emptyEnv });
    await runner(call({ input: "déroule le cadrage" }));
    expect(q.lastParams!.prompt).toBe("déroule le cadrage");
  });

  it("plafonne maxTurns au cap dur même si l'agent en demande plus", async () => {
    const q = fakeQuery([successResult({ result: "ok" })]);
    const runner = createQueryRunner({
      query: q,
      env: emptyEnv,
      caps: { maxTurns: 3 },
    });
    await runner(call({ agent: { ...AGENT, maxTurns: 100 } }));
    expect(q.lastParams!.options!.maxTurns).toBe(3);
  });

  it("REFUSE l'exécution si ANTHROPIC_API_KEY est défini (garde budget)", async () => {
    const q = fakeQuery([successResult({ result: "ok" })]);
    const runner = createQueryRunner({
      query: q,
      env: { ANTHROPIC_API_KEY: "sk-xxx" },
    });
    await expect(runner(call())).rejects.toBeInstanceOf(QueryRunnerError);
    expect(q.lastParams).toBeUndefined(); // jamais appelé
  });

  it("renvoie le texte de résultat en sortie sur succès", async () => {
    const q = fakeQuery([successResult({ result: "livrable cadrage" })]);
    const runner = createQueryRunner({ query: q, env: emptyEnv });
    const res = await runner(call());
    expect(res.output).toBe("livrable cadrage");
  });

  it("privilégie structured_output quand présent", async () => {
    const q = fakeQuery([
      successResult({ result: "txt", structured_output: { ok: true } }),
    ]);
    const runner = createQueryRunner({ query: q, env: emptyEnv });
    const res = await runner(call());
    expect(res.output).toEqual({ ok: true });
  });

  it("lève fail-closed sur un résultat d'erreur (budget dépassé)", async () => {
    const q = fakeQuery([errorResult("error_max_budget_usd", ["budget"])]);
    const runner = createQueryRunner({ query: q, env: emptyEnv });
    await expect(runner(call())).rejects.toThrow(/error_max_budget_usd/);
  });

  it("lève fail-closed si le flux se termine sans message de résultat", async () => {
    const q = fakeQuery([]);
    const runner = createQueryRunner({ query: q, env: emptyEnv });
    await expect(runner(call())).rejects.toThrow(/sans message de résultat/);
  });
});

describe("createQueryRunner — format de sortie imposé (outputSchema)", () => {
  const schema = {
    type: "object",
    required: ["besoins"],
    properties: { besoins: { type: "array" } },
  };

  it("injecte l'instruction de format + le schéma dans le prompt", async () => {
    const q = fakeQuery([successResult({ result: '{"besoins":["x"]}' })]);
    const runner = createQueryRunner({ query: q, env: emptyEnv });
    await runner(call({ outputSchema: schema }));
    expect(q.lastParams!.prompt).toContain("FORMAT DE SORTIE IMPOSÉ");
    expect(q.lastParams!.prompt).toContain(JSON.stringify(schema));
  });

  it("impose le schéma NATIVEMENT au SDK via outputFormat json_schema", async () => {
    const q = fakeQuery([successResult({ result: '{"besoins":["x"]}' })]);
    const runner = createQueryRunner({ query: q, env: emptyEnv });
    await runner(call({ outputSchema: schema }));
    expect(q.lastParams!.options!.outputFormat).toEqual({ type: "json_schema", schema });
  });

  it("ne définit pas outputFormat en l'absence d'outputSchema", async () => {
    const q = fakeQuery([successResult({ result: "ok" })]);
    const runner = createQueryRunner({ query: q, env: emptyEnv });
    await runner(call());
    expect(q.lastParams!.options!.outputFormat).toBeUndefined();
  });

  it("n'altère PAS le prompt quand aucun outputSchema n'est fourni", async () => {
    const q = fakeQuery([successResult({ result: "ok" })]);
    const runner = createQueryRunner({ query: q, env: emptyEnv });
    await runner(call({ input: { brief: "x" } }));
    expect(q.lastParams!.prompt).toBe(JSON.stringify({ brief: "x" }));
  });

  it("parse la réponse texte en OBJET quand outputSchema fourni", async () => {
    const q = fakeQuery([successResult({ result: '{"besoins":["réduire le délai"]}' })]);
    const runner = createQueryRunner({ query: q, env: emptyEnv });
    const res = await runner(call({ outputSchema: schema }));
    expect(res.output).toEqual({ besoins: ["réduire le délai"] });
  });

  it("tolère une clôture markdown ```json autour du JSON", async () => {
    const q = fakeQuery([
      successResult({ result: 'Voici le livrable :\n```json\n{"besoins":["a"]}\n```' }),
    ]);
    const runner = createQueryRunner({ query: q, env: emptyEnv });
    const res = await runner(call({ outputSchema: schema }));
    expect(res.output).toEqual({ besoins: ["a"] });
  });

  it("FAIL-CLOSED : réponse en prose non parsable malgré outputSchema → lève", async () => {
    const q = fakeQuery([successResult({ result: "Le cadrage consiste à analyser les besoins." })]);
    const runner = createQueryRunner({ query: q, env: emptyEnv });
    await expect(runner(call({ outputSchema: schema }))).rejects.toBeInstanceOf(QueryRunnerError);
  });

  it("FAIL-CLOSED : un tableau JSON n'est pas un objet → lève", async () => {
    const q = fakeQuery([successResult({ result: "[1,2,3]" })]);
    const runner = createQueryRunner({ query: q, env: emptyEnv });
    await expect(runner(call({ outputSchema: schema }))).rejects.toBeInstanceOf(QueryRunnerError);
  });

  it("structured_output natif reste prioritaire (pas de parsing de texte)", async () => {
    const q = fakeQuery([
      successResult({ result: "texte ignoré", structured_output: { besoins: ["s"] } }),
    ]);
    const runner = createQueryRunner({ query: q, env: emptyEnv });
    const res = await runner(call({ outputSchema: schema }));
    expect(res.output).toEqual({ besoins: ["s"] });
  });
});
