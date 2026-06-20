import { describe, it, expect } from "vitest";
import type {
  Options,
  SDKMessage,
  AgentDefinition,
} from "@anthropic-ai/claude-agent-sdk";
import { runWf001, Wf001ConfigError } from "../src/spines/run-wf-001.js";
import type { AgentResolver } from "../src/manifest/load-manifest.js";
import type { QueryFn } from "../src/sdk/query-runner.js";
import { QueryRunnerError } from "../src/sdk/query-runner.js";
import type { Sidecar } from "../src/sidecar/types.js";

/**
 * Test bout-en-bout HERMÉTIQUE du câblage du run WF-001 (§2.4-B.3, étape 2) :
 * assemblage (loadSpine) → VRAI createQueryRunner (donc ses 4 gardes) → runSpine.
 * `query` est injecté (faux) ⇒ zéro réseau, zéro appel facturé.
 */

// --- Sidecar intérimaire (les 3 agents du backbone) -------------------------
function agentAsset(id: string, title: string) {
  return {
    id,
    type: "agent" as const,
    path: `${id}.md`,
    title,
    description: `Agent ${title}.`,
    catalogVersion: "v3.25.0",
    source: { file: `${id}.md`, catalogTag: "v3.25.0" },
  };
}
const sidecar: Sidecar = {
  schemaVersion: "1.0.0",
  catalog: { name: "claude-agents", version: "v3.25.0" },
  generatedAt: "2026-06-03T14:00:00Z",
  assets: [
    agentAsset("AGENT-BUSINESS-ANALYST", "Business Analyst"),
    agentAsset("AGENT-PO-SCRUM", "Product Owner Scrum"),
    agentAsset("AGENT-QA-AGILE", "QA Agile"),
  ],
};

// Resolver stub : prompt = marqueur d'asset, exploité par le faux query pour router.
const resolveAgent: AgentResolver = (asset): AgentDefinition => ({
  description: asset.description,
  prompt: `stub-prompt:${asset.id}`,
  tools: [],
});

const STEP_BY_ASSET: Record<string, string> = {
  "AGENT-BUSINESS-ANALYST": "STEP-01",
  "AGENT-PO-SCRUM": "STEP-03",
  "AGENT-QA-AGILE": "STEP-04",
};

// --- DoD-compliant outputs (same shapes as spine-wf-001.test.ts) ------------
const happyBacklog = Array.from({ length: 8 }, (_, i) => ({
  statement: `As a user I want feature ${i + 1} so that I save time`,
  priorite: "must",
  estimation: 3,
  dod: "Tested and validated in UAT",
}));
const happyOutputs: Record<string, unknown> = {
  "STEP-01": {
    besoins: ["Reduce processing time"],
    partiesPrenantes: [{ nom: "Business", role: "sponsor" }],
    perimetre: { in: ["authentication"], out: ["billing"] },
    questionsOuvertes: [],
  },
  "STEP-03": { backlog: happyBacklog, epics: ["Auth", "Search", "Reporting"] },
  "STEP-04": {
    gherkin: [
      { given: "a logged-in user", when: "they search", then: "they see the results", type: "nominal" },
      { given: "an invalid term", when: "they search", then: "an error is shown", type: "error" },
      { given: "0 results", when: "they search", then: "an empty state is shown", type: "boundary" },
    ],
    planTest: "Sprint 1: smoke tests + 3 priority scenarios",
  },
};

/** Faux query : route par le systemPrompt (marqueur d'asset) → structured_output. */
function fakeQuery(outputs: Record<string, unknown>): QueryFn {
  return async function* (params: { prompt: string; options?: Options }) {
    const sp = String(params.options?.systemPrompt ?? "");
    const assetId = sp.replace("stub-prompt:", "");
    const stepId = STEP_BY_ASSET[assetId]!;
    yield {
      type: "result",
      subtype: "success",
      is_error: false,
      result: "",
      num_turns: 1,
      errors: [],
      structured_output: outputs[stepId],
    } as unknown as SDKMessage;
  };
}

const emptyEnv: Record<string, string | undefined> = {};

// --- Tests ------------------------------------------------------------------

describe("runWf001 — câblage run de la spine WF-001 (§2.4-B.3)", () => {
  it("sorties conformes au DoD → spine completed via le vrai runner query()", async () => {
    const res = await runWf001({
      sidecar,
      resolveAgent,
      initialInput: { brief: "Refondre le portail B2B" },
      runnerDeps: { query: fakeQuery(happyOutputs), env: emptyEnv },
    });
    expect(res.status).toBe("completed");
    expect(res.traces).toHaveLength(3);
    expect(res.traces.every((t) => t.gate.verdict === "pass")).toBe(true);
  });

  it("STEP-03 sous le seuil DoD (5 US) → failed à l'eval gate de STEP-03", async () => {
    const broken = {
      ...happyOutputs,
      "STEP-03": { backlog: happyBacklog.slice(0, 5), epics: ["A", "B", "C"] },
    };
    const res = await runWf001({
      sidecar,
      resolveAgent,
      runnerDeps: { query: fakeQuery(broken), env: emptyEnv },
    });
    expect(res.status).toBe("failed");
    expect(res.failure?.stepId).toBe("STEP-03");
    expect(res.failure?.kind).toBe("eval-gate");
    expect(res.traces).toHaveLength(2);
  });

  it("garde budget propagée : ANTHROPIC_API_KEY défini ⇒ le run lève (fail-closed)", async () => {
    await expect(
      runWf001({
        sidecar,
        resolveAgent,
        runnerDeps: {
          query: fakeQuery(happyOutputs),
          env: { ANTHROPIC_API_KEY: "sk-xxx" },
        },
      }),
    ).rejects.toBeInstanceOf(QueryRunnerError);
  });

  it("config insuffisante : ni catalogRoot ni resolveAgent ⇒ Wf001ConfigError", async () => {
    await expect(
      runWf001({ sidecar, runnerDeps: { query: fakeQuery(happyOutputs), env: emptyEnv } }),
    ).rejects.toBeInstanceOf(Wf001ConfigError);
  });
});
