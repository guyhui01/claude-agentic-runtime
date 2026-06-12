import { describe, it, expect } from "vitest";
import type { Options, SDKMessage, AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import { runWf002, Wf002ConfigError } from "../src/spines/run-wf-002.js";
import type { AgentResolver } from "../src/manifest/load-manifest.js";
import type { QueryFn } from "../src/sdk/query-runner.js";
import { QueryRunnerError } from "../src/sdk/query-runner.js";
import type { Sidecar } from "../src/sidecar/types.js";
import { wf002HappyOutputs as happyOutputs } from "./fixtures/wf-002-outputs.js";

/**
 * Test bout-en-bout HERMÉTIQUE du câblage du run WF-002 (§2.4-B.4) :
 * assemblage (loadSpine) → VRAI createQueryRunner (4 gardes) → runSpine.
 * `query` est injecté (faux) ⇒ zéro réseau, zéro appel facturé. Les sorties
 * respectent le schéma RESSERRÉ (donc le handoff producer-output) ET les critères.
 */

function agentAsset(id: string, title: string) {
  return {
    id,
    type: "agent" as const,
    path: `${id}.md`,
    title,
    description: `Agent ${title}.`,
    catalogVersion: "v3.26.2",
    source: { file: `${id}.md`, catalogTag: "v3.26.2" },
  };
}
const sidecar: Sidecar = {
  schemaVersion: "1.0.0",
  catalog: { name: "claude-agents", version: "v3.26.2" },
  generatedAt: "2026-06-13T00:00:00Z",
  assets: [
    agentAsset("AGENT-PRODUCT-MANAGER-SAFE", "Product Manager SAFe"),
    agentAsset("AGENT-RELEASE-TRAIN-ENGINEER", "Release Train Engineer"),
    agentAsset("AGENT-PO-SAFE", "Product Owner SAFe"),
    agentAsset("AGENT-SCRUM-MASTER", "Scrum Master"),
    agentAsset("AGENT-CHEF-PROJET-IA", "Chef de Projet IA"),
  ],
};

const resolveAgent: AgentResolver = (asset): AgentDefinition => ({
  description: asset.description,
  prompt: `stub-prompt:${asset.id}`,
  tools: [],
});

const STEP_BY_ASSET: Record<string, string> = {
  "AGENT-PRODUCT-MANAGER-SAFE": "STEP-01",
  "AGENT-RELEASE-TRAIN-ENGINEER": "STEP-02",
  "AGENT-PO-SAFE": "STEP-03",
  "AGENT-SCRUM-MASTER": "STEP-04",
  "AGENT-CHEF-PROJET-IA": "STEP-06",
};

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

describe("runWf002 — câblage run de la spine WF-002 (§2.4-B.4)", () => {
  it("sorties conformes au DoD → spine completed via le vrai runner query()", async () => {
    const res = await runWf002({
      sidecar,
      resolveAgent,
      initialInput: { art: "ART Digital Banking" },
      runnerDeps: { query: fakeQuery(happyOutputs), env: emptyEnv },
    });
    expect(res.status).toBe("completed");
    expect(res.traces).toHaveLength(5);
    expect(res.traces.every((t) => t.gate.verdict === "pass")).toBe(true);
  });

  it("vote de confiance < 3.5 (STEP-02) → failed à l'eval gate de STEP-02", async () => {
    const broken = {
      ...happyOutputs,
      "STEP-02": { ...(happyOutputs["STEP-02"] as object), voteConfiance: 3.0 },
    };
    const res = await runWf002({
      sidecar,
      resolveAgent,
      runnerDeps: { query: fakeQuery(broken), env: emptyEnv },
    });
    expect(res.status).toBe("failed");
    expect(res.failure?.stepId).toBe("STEP-02");
    expect(res.failure?.kind).toBe("eval-gate");
    expect(res.traces).toHaveLength(2);
  });

  it("garde budget propagée : ANTHROPIC_API_KEY défini ⇒ le run lève (fail-closed)", async () => {
    await expect(
      runWf002({
        sidecar,
        resolveAgent,
        runnerDeps: { query: fakeQuery(happyOutputs), env: { ANTHROPIC_API_KEY: "sk-xxx" } },
      }),
    ).rejects.toBeInstanceOf(QueryRunnerError);
  });

  it("config insuffisante : ni catalogRoot ni resolveAgent ⇒ Wf002ConfigError", async () => {
    await expect(
      runWf002({ sidecar, runnerDeps: { query: fakeQuery(happyOutputs), env: emptyEnv } }),
    ).rejects.toBeInstanceOf(Wf002ConfigError);
  });
});
