import { describe, it, expect } from "vitest";
import type { Options, SDKMessage, AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import { runWf004, Wf004ConfigError } from "../src/spines/run-wf-004.js";
import type { AgentResolver } from "../src/manifest/load-manifest.js";
import type { QueryFn } from "../src/sdk/query-runner.js";
import { QueryRunnerError } from "../src/sdk/query-runner.js";
import type { Sidecar } from "../src/sidecar/types.js";
import { wf004HappyOutputs as happyOutputs } from "./fixtures/wf-004-outputs.js";

/**
 * HERMETIC end-to-end test of the WF-004 run wiring (§2.4-B.4):
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
    agentAsset("AGENT-FINANCIAL-ANALYST", "Financial Analyst"),
    agentAsset("AGENT-CDO-DIRECTEUR-IA", "CDO / AI Director"),
    agentAsset("AGENT-CHANGE-MANAGER", "Change Manager"),
    agentAsset("AGENT-FORMATEUR-IA", "AI Trainer"),
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
  "AGENT-FINANCIAL-ANALYST": "STEP-02",
  "AGENT-CDO-DIRECTEUR-IA": "STEP-03",
  "AGENT-CHANGE-MANAGER": "STEP-04",
  "AGENT-FORMATEUR-IA": "STEP-05",
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

describe("runWf004 — WF-004 spine run wiring (§2.4-B.4)", () => {
  it("DoD-conformant outputs → spine completed via the real runner query()", async () => {
    const res = await runWf004({
      sidecar,
      resolveAgent,
      initialInput: { client: "CAC40 insurer", scope: "Full" },
      runnerDeps: { query: fakeQuery(happyOutputs), env: emptyEnv },
    });
    expect(res.status).toBe("completed");
    expect(res.traces).toHaveLength(6);
    expect(res.traces.every((t) => t.gate.verdict === "pass")).toBe(true);
  });

  it("out-of-range maturity score (STEP-01) → failed at STEP-01", async () => {
    const broken = {
      ...happyOutputs,
      "STEP-01": { ...(happyOutputs["STEP-01"] as object), maturityScore: 12 },
    };
    const res = await runWf004({
      sidecar,
      resolveAgent,
      runnerDeps: { query: fakeQuery(broken), env: emptyEnv },
    });
    expect(res.status).toBe("failed");
    expect(res.failure?.stepId).toBe("STEP-01");
    expect(res.failure?.kind).toBe("eval-gate");
    expect(res.traces).toHaveLength(1);
  });

  it("budget guard propagated: ANTHROPIC_API_KEY set ⇒ the run throws (fail-closed)", async () => {
    await expect(
      runWf004({
        sidecar,
        resolveAgent,
        runnerDeps: { query: fakeQuery(happyOutputs), env: { ANTHROPIC_API_KEY: "sk-xxx" } },
      }),
    ).rejects.toBeInstanceOf(QueryRunnerError);
  });

  it("insufficient config: neither catalogRoot nor resolveAgent ⇒ Wf004ConfigError", async () => {
    await expect(
      runWf004({ sidecar, runnerDeps: { query: fakeQuery(happyOutputs), env: emptyEnv } }),
    ).rejects.toBeInstanceOf(Wf004ConfigError);
  });
});
