import { describe, it, expect } from "vitest";
import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import { loadSpine, ManifestValidationError, type AgentResolver } from "../src/manifest/load-manifest.js";
import { runSpine } from "../src/orchestrator/run-spine.js";
import type { StepRunner } from "../src/orchestrator/types.js";
import type { Sidecar } from "../src/sidecar/types.js";
import {
  WF_004_CONSEIL_MANIFEST,
  WF_004_CONSEIL_CRITERIA,
  buildWf004ConseilRegistry,
} from "../src/spines/wf-004-conseil.js";
import { wf004HappyOutputs as happyOutputs } from "./fixtures/wf-004-outputs.js";

/** Hermetic tests for the REAL WF-004 spine (AI Consulting Engagement), mocked runner. */

function agentAsset(id: string) {
  return {
    id,
    type: "agent" as const,
    path: `${id}.md`,
    title: id,
    description: `Agent ${id}.`,
    catalogVersion: "v4.1.0",
    source: { file: `${id}.md`, catalogTag: "v4.1.0" },
  };
}
const sidecar: Sidecar = {
  schemaVersion: "1.0.0",
  catalog: { name: "claude-agents", version: "v4.1.0" },
  generatedAt: "2026-07-11T00:00:00Z",
  assets: [
    agentAsset("AGENT-CONSULTANT-IA"),
    agentAsset("AGENT-FINANCIAL-ANALYST"),
    agentAsset("AGENT-CDO-DIRECTEUR-IA"),
    agentAsset("AGENT-CHANGE-MANAGER"),
    agentAsset("AGENT-FORMATEUR-IA"),
    agentAsset("AGENT-REDACTEUR-IA"),
  ],
};
const resolveAgent: AgentResolver = (asset): AgentDefinition => ({
  description: asset.description,
  prompt: `stub:${asset.id}`,
  tools: [],
});

const mockRunner = (outputs: Record<string, unknown>): StepRunner =>
  async ({ stepId }) => ({ output: outputs[stepId] });

describe("WF-004 spine — loading and execution (mocked runner)", () => {
  it("assembles the 6-step backbone STEP-01→05,07 with provenance and criteria", () => {
    const steps = loadSpine(WF_004_CONSEIL_MANIFEST, sidecar, buildWf004ConseilRegistry(), resolveAgent);
    expect(steps.map((s) => s.provenance.stepId)).toEqual([
      "STEP-01", "STEP-02", "STEP-03", "STEP-04", "STEP-05", "STEP-07",
    ]);
    expect(steps[0]!.contract.input).toBeUndefined(); // seed
    expect(steps[5]!.criteria.map((c) => c.id)).toContain("red-comex-deck");
  });

  it("registry: every manifest criterion resolves (no dangling id)", () => {
    const registry = buildWf004ConseilRegistry();
    const allIds = WF_004_CONSEIL_MANIFEST.steps.flatMap((s) => s.criteriaIds);
    expect(() => registry.resolve(allIds)).not.toThrow();
    expect(allIds.length).toBe(WF_004_CONSEIL_CRITERIA.length);
  });

  it("fail-closed: agent missing from the sidecar → ManifestValidationError", () => {
    const incomplete: Sidecar = { ...sidecar, assets: sidecar.assets.slice(0, 5) }; // REDACTEUR-IA removed
    expect(() => loadSpine(WF_004_CONSEIL_MANIFEST, incomplete, buildWf004ConseilRegistry(), resolveAgent)).toThrow(
      ManifestValidationError,
    );
  });

  it("DoD-conformant outputs → spine completed, 6 traces, pass verdicts", async () => {
    const steps = loadSpine(WF_004_CONSEIL_MANIFEST, sidecar, buildWf004ConseilRegistry(), resolveAgent);
    const res = await runSpine(steps, mockRunner(happyOutputs), { client: "CAC40 insurer" });
    expect(res.status).toBe("completed");
    expect(res.traces).toHaveLength(6);
    expect(res.traces.every((t) => t.gate.verdict === "pass")).toBe(true);
  });

  it("out-of-range maturity score (STEP-01) → failed at STEP-01", async () => {
    const broken = { ...happyOutputs, "STEP-01": { ...(happyOutputs["STEP-01"] as object), maturityScore: 12 } };
    const steps = loadSpine(WF_004_CONSEIL_MANIFEST, sidecar, buildWf004ConseilRegistry(), resolveAgent);
    const res = await runSpine(steps, mockRunner(broken), {});
    expect(res.status).toBe("failed");
    expect(res.failure?.stepId).toBe("STEP-01");
    expect(res.failure?.kind).toBe("eval-gate");
    expect(res.traces).toHaveLength(1);
  });

  it("empty executive-committee deck (STEP-07) → failed at STEP-07", async () => {
    const broken = { ...happyOutputs, "STEP-07": { ...(happyOutputs["STEP-07"] as object), comexDeck: [] } };
    const steps = loadSpine(WF_004_CONSEIL_MANIFEST, sidecar, buildWf004ConseilRegistry(), resolveAgent);
    const res = await runSpine(steps, mockRunner(broken), {});
    expect(res.status).toBe("failed");
    expect(res.failure?.stepId).toBe("STEP-07");
    expect(res.traces).toHaveLength(6);
  });
});
