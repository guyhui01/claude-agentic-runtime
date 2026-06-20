import { describe, it, expect } from "vitest";
import type { Options, SDKMessage, AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import { runWf003, Wf003ConfigError } from "../src/spines/run-wf-003.js";
import type { AgentResolver } from "../src/manifest/load-manifest.js";
import type { QueryFn } from "../src/sdk/query-runner.js";
import { QueryRunnerError } from "../src/sdk/query-runner.js";
import type { Sidecar } from "../src/sidecar/types.js";
import { wf003HappyOutputs as happyOutputs } from "./fixtures/wf-003-outputs.js";

/**
 * HERMETIC end-to-end test of the WF-003 run wiring (§2.4-B.4):
 * assembly (loadSpine) → REAL createQueryRunner (4 guards) → runSpine.
 * `query` injected (fake) ⇒ zero network, zero billed call. Outputs conform to the
 * TIGHTENED schema (producer-output handoff) AND the criteria.
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
    agentAsset("AGENT-FINANCIAL-ANALYST", "Financial Analyst"),
    agentAsset("AGENT-PROMPT-ENGINEER", "Prompt Engineer"),
    agentAsset("AGENT-AI-ARCHITECT", "AI Architect"),
    agentAsset("AGENT-DEV-PYTHON-IA", "AI Python Developer"),
    agentAsset("AGENT-QA-AGILE", "QA Agile"),
    agentAsset("AGENT-DEVOPS-CLOUD", "DevOps Cloud"),
    agentAsset("AGENT-SECURITE-IA", "AI Security"),
  ],
};

const resolveAgent: AgentResolver = (asset): AgentDefinition => ({
  description: asset.description,
  prompt: `stub-prompt:${asset.id}`,
  tools: [],
});

const STEP_BY_ASSET: Record<string, string> = {
  "AGENT-FINANCIAL-ANALYST": "STEP-00",
  "AGENT-PROMPT-ENGINEER": "STEP-01",
  "AGENT-AI-ARCHITECT": "STEP-02",
  "AGENT-DEV-PYTHON-IA": "STEP-03",
  "AGENT-QA-AGILE": "STEP-04",
  "AGENT-DEVOPS-CLOUD": "STEP-05",
  "AGENT-SECURITE-IA": "STEP-06",
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

describe("runWf003 — WF-003 spine run wiring (§2.4-B.4)", () => {
  it("DoD-conformant outputs → spine completed via the real runner query()", async () => {
    const res = await runWf003({
      sidecar,
      resolveAgent,
      initialInput: { app: "RAG support chatbot" },
      runnerDeps: { query: fakeQuery(happyOutputs), env: emptyEnv },
    });
    expect(res.status).toBe("completed");
    expect(res.traces).toHaveLength(7);
    expect(res.traces.every((t) => t.gate.verdict === "pass")).toBe(true);
  });

  it("financial Go not granted (STEP-00 No-Go) → failed at STEP-00", async () => {
    const broken = {
      ...happyOutputs,
      "STEP-00": { ...(happyOutputs["STEP-00"] as object), decision: "No-Go" },
    };
    const res = await runWf003({
      sidecar,
      resolveAgent,
      runnerDeps: { query: fakeQuery(broken), env: emptyEnv },
    });
    expect(res.status).toBe("failed");
    expect(res.failure?.stepId).toBe("STEP-00");
    expect(res.failure?.kind).toBe("eval-gate");
    expect(res.traces).toHaveLength(1);
  });

  it("budget guard propagated: ANTHROPIC_API_KEY set ⇒ the run throws (fail-closed)", async () => {
    await expect(
      runWf003({
        sidecar,
        resolveAgent,
        runnerDeps: { query: fakeQuery(happyOutputs), env: { ANTHROPIC_API_KEY: "sk-xxx" } },
      }),
    ).rejects.toBeInstanceOf(QueryRunnerError);
  });

  it("insufficient config: neither catalogRoot nor resolveAgent ⇒ Wf003ConfigError", async () => {
    await expect(
      runWf003({ sidecar, runnerDeps: { query: fakeQuery(happyOutputs), env: emptyEnv } }),
    ).rejects.toBeInstanceOf(Wf003ConfigError);
  });
});
