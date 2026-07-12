import { describe, it, expect } from "vitest";
import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import { loadSpine, ManifestValidationError, type AgentResolver } from "../src/manifest/load-manifest.js";
import { runSpine } from "../src/orchestrator/run-spine.js";
import type { StepRunner } from "../src/orchestrator/types.js";
import type { Sidecar } from "../src/sidecar/types.js";
import {
  WF_009_RECRUTEMENT_MANIFEST,
  WF_009_RECRUTEMENT_CRITERIA,
  buildWf009RecrutementRegistry,
} from "../src/spines/wf-009-recrutement.js";
import { wf009HappyOutputs as happyOutputs } from "./fixtures/wf-009-outputs.js";

/** Hermetic tests for the REAL WF-009 spine (IT/AI Recruitment), mocked runner. */

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
  generatedAt: "2026-07-12T00:00:00Z",
  assets: [
    agentAsset("AGENT-BUSINESS-ANALYST"),
    agentAsset("AGENT-CONSULTANT-IA"),
    agentAsset("AGENT-REDACTEUR-IA"),
    agentAsset("AGENT-RH-IA"),
  ],
};
const resolveAgent: AgentResolver = (asset): AgentDefinition => ({
  description: asset.description,
  prompt: `stub:${asset.id}`,
  tools: [],
});

const mockRunner = (outputs: Record<string, unknown>): StepRunner =>
  async ({ stepId }) => ({ output: outputs[stepId] });

describe("WF-009 spine — loading and execution (mocked runner)", () => {
  it("assembles the 6-step backbone STEP-01→06 with provenance and criteria", () => {
    const steps = loadSpine(WF_009_RECRUTEMENT_MANIFEST, sidecar, buildWf009RecrutementRegistry(), resolveAgent);
    expect(steps.map((s) => s.provenance.stepId)).toEqual([
      "STEP-01", "STEP-02A", "STEP-03", "STEP-04", "STEP-05", "STEP-06",
    ]);
    expect(steps[0]!.contract.input).toBeUndefined(); // seed
    // RH-IA carries three consecutive backbone steps.
    expect(steps.slice(3).every((s) => s.provenance.assetId === "AGENT-RH-IA")).toBe(true);
    expect(steps[4]!.criteria.map((c) => c.id)).toContain("sel-candidate-selected");
  });

  it("registry: every manifest criterion resolves (no dangling id)", () => {
    const registry = buildWf009RecrutementRegistry();
    const allIds = WF_009_RECRUTEMENT_MANIFEST.steps.flatMap((s) => s.criteriaIds);
    expect(() => registry.resolve(allIds)).not.toThrow();
    expect(allIds.length).toBe(WF_009_RECRUTEMENT_CRITERIA.length);
  });

  it("fail-closed: agent missing from the sidecar → ManifestValidationError", () => {
    const incomplete: Sidecar = { ...sidecar, assets: sidecar.assets.slice(0, 3) }; // RH-IA removed
    expect(() => loadSpine(WF_009_RECRUTEMENT_MANIFEST, incomplete, buildWf009RecrutementRegistry(), resolveAgent)).toThrow(
      ManifestValidationError,
    );
  });

  it("DoD-conformant outputs → spine completed, 6 traces, pass verdicts", async () => {
    const steps = loadSpine(WF_009_RECRUTEMENT_MANIFEST, sidecar, buildWf009RecrutementRegistry(), resolveAgent);
    const res = await runSpine(steps, mockRunner(happyOutputs), { role: "Senior AI Engineer" });
    expect(res.status).toBe("completed");
    expect(res.traces).toHaveLength(6);
    expect(res.traces.every((t) => t.gate.verdict === "pass")).toBe(true);
  });

  it("<shortlist validated?> gateway: shortlist < 3 (STEP-04) → failed fail-closed at the eval gate", async () => {
    const broken = {
      ...happyOutputs,
      "STEP-04": {
        ...(happyOutputs["STEP-04"] as object),
        shortlist: [{ candidate: "candidate-1", justification: "only one qualified" }],
      },
    };
    const steps = loadSpine(WF_009_RECRUTEMENT_MANIFEST, sidecar, buildWf009RecrutementRegistry(), resolveAgent);
    const res = await runSpine(steps, mockRunner(broken), {});
    expect(res.status).toBe("failed");
    expect(res.failure?.stepId).toBe("STEP-04");
    expect(res.failure?.kind).toBe("eval-gate");
    expect(res.traces).toHaveLength(4);
    // The gateway criterion is the one that blocked.
    const last = res.traces[3]!;
    expect(last.gate.results.find((r) => r.id === "rh-shortlist-validated")?.passed).toBe(false);
  });

  it("<candidate selected?> gateway: no selected candidate (STEP-05) → failed fail-closed at the eval gate", async () => {
    const broken = {
      ...happyOutputs,
      "STEP-05": { ...(happyOutputs["STEP-05"] as object), selectedCandidate: "" },
    };
    const steps = loadSpine(WF_009_RECRUTEMENT_MANIFEST, sidecar, buildWf009RecrutementRegistry(), resolveAgent);
    const res = await runSpine(steps, mockRunner(broken), {});
    expect(res.status).toBe("failed");
    expect(res.failure?.stepId).toBe("STEP-05");
    expect(res.failure?.kind).toBe("eval-gate");
    expect(res.traces).toHaveLength(5);
    const last = res.traces[4]!;
    expect(last.gate.results.find((r) => r.id === "sel-candidate-selected")?.passed).toBe(false);
  });
});
