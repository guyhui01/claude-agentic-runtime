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

/** Minimal agent (from the §2.4-A adapter) for the test calls. */
const AGENT: AgentDefinition = {
  description: "Scoping agent",
  prompt: "You are the BUSINESS-ANALYST agent.",
  tools: ["Read", "Grep", "Glob"],
};

function call(overrides: Partial<StepRunCall> = {}): StepRunCall {
  return { stepId: "STEP-01", agent: AGENT, input: { brief: "x" }, ...overrides };
}

/** Minimal `success` result message, completed then cast to SDKMessage. */
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

/** Minimal error result message. */
function errorResult(subtype: string, errors: string[] = []): SDKMessage {
  return {
    type: "result",
    subtype,
    is_error: true,
    num_turns: 1,
    errors,
  } as unknown as SDKMessage;
}

/** Fake `query` that emits the provided message list, and captures the received params. */
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

describe("createQueryRunner — query() → StepRunner adapter (§2.4-B.3)", () => {
  it("maps the agent to query() options (systemPrompt, tools, model) + forced plan", async () => {
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

  it("serializes a non-string input to JSON for the prompt", async () => {
    const q = fakeQuery([successResult({ result: "ok" })]);
    const runner = createQueryRunner({ query: q, env: emptyEnv });
    await runner(call({ input: { brief: "x" } }));
    expect(q.lastParams!.prompt).toBe(JSON.stringify({ brief: "x" }));
  });

  it("passes a string input through as-is", async () => {
    const q = fakeQuery([successResult({ result: "ok" })]);
    const runner = createQueryRunner({ query: q, env: emptyEnv });
    await runner(call({ input: "run the scoping" }));
    expect(q.lastParams!.prompt).toBe("run the scoping");
  });

  it("caps maxTurns at the hard cap even if the agent asks for more", async () => {
    const q = fakeQuery([successResult({ result: "ok" })]);
    const runner = createQueryRunner({
      query: q,
      env: emptyEnv,
      caps: { maxTurns: 3 },
    });
    await runner(call({ agent: { ...AGENT, maxTurns: 100 } }));
    expect(q.lastParams!.options!.maxTurns).toBe(3);
  });

  it("REFUSES execution if ANTHROPIC_API_KEY is set (budget guard)", async () => {
    const q = fakeQuery([successResult({ result: "ok" })]);
    const runner = createQueryRunner({
      query: q,
      env: { ANTHROPIC_API_KEY: "sk-xxx" },
    });
    await expect(runner(call())).rejects.toBeInstanceOf(QueryRunnerError);
    expect(q.lastParams).toBeUndefined(); // never called
  });

  it("returns the result text as output on success", async () => {
    const q = fakeQuery([successResult({ result: "scoping deliverable" })]);
    const runner = createQueryRunner({ query: q, env: emptyEnv });
    const res = await runner(call());
    expect(res.output).toBe("scoping deliverable");
  });

  it("prefers structured_output when present", async () => {
    const q = fakeQuery([
      successResult({ result: "txt", structured_output: { ok: true } }),
    ]);
    const runner = createQueryRunner({ query: q, env: emptyEnv });
    const res = await runner(call());
    expect(res.output).toEqual({ ok: true });
  });

  it("throws fail-closed on an error result (budget exceeded)", async () => {
    const q = fakeQuery([errorResult("error_max_budget_usd", ["budget"])]);
    const runner = createQueryRunner({ query: q, env: emptyEnv });
    await expect(runner(call())).rejects.toThrow(/error_max_budget_usd/);
  });

  it("throws fail-closed if the stream ends with no result message", async () => {
    const q = fakeQuery([]);
    const runner = createQueryRunner({ query: q, env: emptyEnv });
    await expect(runner(call())).rejects.toThrow(/stream ended with no result message/);
  });
});

describe("createQueryRunner — enforced output format (outputSchema)", () => {
  const schema = {
    type: "object",
    required: ["besoins"],
    properties: { besoins: { type: "array" } },
  };

  it("injects the format instruction + the schema into the prompt", async () => {
    const q = fakeQuery([successResult({ result: '{"besoins":["x"]}' })]);
    const runner = createQueryRunner({ query: q, env: emptyEnv });
    await runner(call({ outputSchema: schema }));
    expect(q.lastParams!.prompt).toContain("ENFORCED OUTPUT FORMAT");
    expect(q.lastParams!.prompt).toContain(JSON.stringify(schema));
  });

  it("enforces the schema NATIVELY at the SDK via outputFormat json_schema", async () => {
    const q = fakeQuery([successResult({ result: '{"besoins":["x"]}' })]);
    const runner = createQueryRunner({ query: q, env: emptyEnv });
    await runner(call({ outputSchema: schema }));
    expect(q.lastParams!.options!.outputFormat).toEqual({ type: "json_schema", schema });
  });

  it("does not set outputFormat when no outputSchema is provided", async () => {
    const q = fakeQuery([successResult({ result: "ok" })]);
    const runner = createQueryRunner({ query: q, env: emptyEnv });
    await runner(call());
    expect(q.lastParams!.options!.outputFormat).toBeUndefined();
  });

  it("does NOT alter the prompt when no outputSchema is provided", async () => {
    const q = fakeQuery([successResult({ result: "ok" })]);
    const runner = createQueryRunner({ query: q, env: emptyEnv });
    await runner(call({ input: { brief: "x" } }));
    expect(q.lastParams!.prompt).toBe(JSON.stringify({ brief: "x" }));
  });

  it("parses the text response into an OBJECT when outputSchema is provided", async () => {
    const q = fakeQuery([successResult({ result: '{"besoins":["reduce the lead time"]}' })]);
    const runner = createQueryRunner({ query: q, env: emptyEnv });
    const res = await runner(call({ outputSchema: schema }));
    expect(res.output).toEqual({ besoins: ["reduce the lead time"] });
  });

  it("tolerates a markdown ```json fence around the JSON", async () => {
    const q = fakeQuery([
      successResult({ result: 'Here is the deliverable:\n```json\n{"besoins":["a"]}\n```' }),
    ]);
    const runner = createQueryRunner({ query: q, env: emptyEnv });
    const res = await runner(call({ outputSchema: schema }));
    expect(res.output).toEqual({ besoins: ["a"] });
  });

  it("FAIL-CLOSED: unparsable prose response despite outputSchema → throws", async () => {
    const q = fakeQuery([successResult({ result: "Scoping means analyzing the needs." })]);
    const runner = createQueryRunner({ query: q, env: emptyEnv });
    await expect(runner(call({ outputSchema: schema }))).rejects.toBeInstanceOf(QueryRunnerError);
  });

  it("FAIL-CLOSED: a JSON array is not an object → throws", async () => {
    const q = fakeQuery([successResult({ result: "[1,2,3]" })]);
    const runner = createQueryRunner({ query: q, env: emptyEnv });
    await expect(runner(call({ outputSchema: schema }))).rejects.toBeInstanceOf(QueryRunnerError);
  });

  it("native structured_output stays prioritized (no text parsing)", async () => {
    const q = fakeQuery([
      successResult({ result: "ignored text", structured_output: { besoins: ["s"] } }),
    ]);
    const runner = createQueryRunner({ query: q, env: emptyEnv });
    const res = await runner(call({ outputSchema: schema }));
    expect(res.output).toEqual({ besoins: ["s"] });
  });
});
