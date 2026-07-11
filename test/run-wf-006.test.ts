import { describe, it, expect } from "vitest";
import type { Options, SDKMessage, AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import { runWf006, Wf006ConfigError } from "../src/spines/run-wf-006.js";
import type { AgentResolver } from "../src/manifest/load-manifest.js";
import type { QueryFn } from "../src/sdk/query-runner.js";
import { QueryRunnerError } from "../src/sdk/query-runner.js";
import type { Sidecar } from "../src/sidecar/types.js";
import { wf006HappyOutputs as happyOutputs } from "./fixtures/wf-006-outputs.js";

/**
 * HERMETIC end-to-end test of the WF-006 run wiring (§2.4-B.4):
 * assembly (loadSpine) → REAL createQueryRunner (4 guards) → runSpine.
 * `query` injected (fake) ⇒ zero network, zero billed call. Outputs conform to the
 * tightened schema (producer-output handoff) AND the criteria.
 */

function agentAsset(id: string, title: string) {
  return {
    id,
    type: "agent" as const,
    path: `${id}.md`,
    title,
    description: `Agent ${title}.`,
    catalogVersion: "v4.1.0",
    source: { file: `${id}.md`, catalogTag: "v4.1.0" },
  };
}
const sidecar: Sidecar = {
  schemaVersion: "1.0.0",
  catalog: { name: "claude-agents", version: "v4.1.0" },
  generatedAt: "2026-07-11T00:00:00Z",
  assets: [
    agentAsset("AGENT-CONSULTANT-IA", "AI Consultant"),
    agentAsset("AGENT-BUSINESS-ANALYST", "Business Analyst"),
    agentAsset("AGENT-AI-ARCHITECT", "AI Architect"),
    agentAsset("AGENT-CHEF-PROJET-IA", "AI Project Manager"),
    agentAsset("AGENT-FINANCIAL-ANALYST", "Financial Analyst"),
    agentAsset("AGENT-REDACTEUR-IA", "AI Writer"),
  ],
};

const resolveAgent: AgentResolver = (asset): AgentDefinition => ({
  description: asset.description,
  prompt: `stub-prompt:${asset.id}`,
  tools: [],
});

const STEP_BY_ASSET: Record<string, string> = {
  "AGENT-CONSULTANT-IA": "STEP-01",
  "AGENT-BUSINESS-ANALYST": "STEP-02",
  "AGENT-AI-ARCHITECT": "STEP-03A",
  "AGENT-CHEF-PROJET-IA": "STEP-04",
  "AGENT-FINANCIAL-ANALYST": "STEP-05",
  "AGENT-REDACTEUR-IA": "STEP-07",
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

describe("runWf006 — WF-006 spine run wiring (§2.4-B.4)", () => {
  it("DoD-conformant outputs (verdict GO) → spine completed via the real runner query()", async () => {
    const res = await runWf006({
      sidecar,
      resolveAgent,
      initialInput: { prospect: "CAC40 insurer", requestType: "RFP" },
      runnerDeps: { query: fakeQuery(happyOutputs), env: emptyEnv },
    });
    expect(res.status).toBe("completed");
    expect(res.traces).toHaveLength(6);
    expect(res.traces.every((t) => t.gate.verdict === "pass")).toBe(true);
  });

  it("GO/NO-GO gateway: NO-GO verdict (STEP-01) → failed at STEP-01 (no-bid)", async () => {
    const noBid = {
      ...happyOutputs,
      "STEP-01": { ...(happyOutputs["STEP-01"] as object), verdict: "NO-GO" },
    };
    const res = await runWf006({
      sidecar,
      resolveAgent,
      runnerDeps: { query: fakeQuery(noBid), env: emptyEnv },
    });
    expect(res.status).toBe("failed");
    expect(res.failure?.stepId).toBe("STEP-01");
    expect(res.failure?.kind).toBe("eval-gate");
    expect(res.traces).toHaveLength(1);
  });

  it("budget guard propagated: ANTHROPIC_API_KEY set ⇒ the run throws (fail-closed)", async () => {
    await expect(
      runWf006({
        sidecar,
        resolveAgent,
        runnerDeps: { query: fakeQuery(happyOutputs), env: { ANTHROPIC_API_KEY: "sk-xxx" } },
      }),
    ).rejects.toBeInstanceOf(QueryRunnerError);
  });

  it("insufficient config: neither catalogRoot nor resolveAgent ⇒ Wf006ConfigError", async () => {
    await expect(
      runWf006({ sidecar, runnerDeps: { query: fakeQuery(happyOutputs), env: emptyEnv } }),
    ).rejects.toBeInstanceOf(Wf006ConfigError);
  });
});
