import { describe, it, expect } from "vitest";
import type { Options, SDKMessage, AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import { runWf009, Wf009ConfigError } from "../src/spines/run-wf-009.js";
import type { AgentResolver } from "../src/manifest/load-manifest.js";
import type { QueryFn } from "../src/sdk/query-runner.js";
import { QueryRunnerError } from "../src/sdk/query-runner.js";
import type { Sidecar } from "../src/sidecar/types.js";
import { wf009HappyOutputs as happyOutputs } from "./fixtures/wf-009-outputs.js";

/**
 * HERMETIC end-to-end test of the WF-009 run wiring (§2.4-B.4):
 * assembly (loadSpine) → REAL createQueryRunner (4 guards) → runSpine.
 * `query` injected (fake) ⇒ zero network, zero billed call. Outputs conform to the
 * tightened schema (producer-output handoff) AND the criteria.
 *
 * AGENT-RH-IA carries three consecutive steps (STEP-04/05/06), so the fake query
 * discriminates by CALL ORDER (the linear orchestrator calls the runner once per
 * step, in backbone order) rather than by systemPrompt.
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
  generatedAt: "2026-07-12T00:00:00Z",
  assets: [
    agentAsset("AGENT-BUSINESS-ANALYST", "Business Analyst"),
    agentAsset("AGENT-CONSULTANT-IA", "AI Consultant"),
    agentAsset("AGENT-REDACTEUR-IA", "AI Writer"),
    agentAsset("AGENT-RH-IA", "AI HR Partner"),
  ],
};

const resolveAgent: AgentResolver = (asset): AgentDefinition => ({
  description: asset.description,
  prompt: `stub-prompt:${asset.id}`,
  tools: [],
});

const STEP_ORDER = ["STEP-01", "STEP-02A", "STEP-03", "STEP-04", "STEP-05", "STEP-06"];

function fakeQuery(outputs: Record<string, unknown>): QueryFn {
  let i = 0;
  return async function* (_params: { prompt: string; options?: Options }) {
    const stepId = STEP_ORDER[i++]!;
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

describe("runWf009 — WF-009 spine run wiring (§2.4-B.4)", () => {
  it("DoD-conformant outputs → spine completed via the real runner query()", async () => {
    const res = await runWf009({
      sidecar,
      resolveAgent,
      initialInput: { role: "Senior AI Engineer", contract: "Permanent" },
      runnerDeps: { query: fakeQuery(happyOutputs), env: emptyEnv },
    });
    expect(res.status).toBe("completed");
    expect(res.traces).toHaveLength(6);
    expect(res.traces.every((t) => t.gate.verdict === "pass")).toBe(true);
  });

  it("MoSCoW grid missing (STEP-01) → failed at STEP-01", async () => {
    const broken = {
      ...happyOutputs,
      "STEP-01": { needSheet: "role brief only, no structured MoSCoW grid" },
    };
    const res = await runWf009({
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
      runWf009({
        sidecar,
        resolveAgent,
        runnerDeps: { query: fakeQuery(happyOutputs), env: { ANTHROPIC_API_KEY: "sk-xxx" } },
      }),
    ).rejects.toBeInstanceOf(QueryRunnerError);
  });

  it("insufficient config: neither catalogRoot nor resolveAgent ⇒ Wf009ConfigError", async () => {
    await expect(
      runWf009({ sidecar, runnerDeps: { query: fakeQuery(happyOutputs), env: emptyEnv } }),
    ).rejects.toBeInstanceOf(Wf009ConfigError);
  });
});
