import { describe, it, expect } from "vitest";
import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import { loadSpine, ManifestValidationError, type AgentResolver } from "../src/manifest/load-manifest.js";
import { runSpine } from "../src/orchestrator/run-spine.js";
import type { StepRunner } from "../src/orchestrator/types.js";
import type { Sidecar } from "../src/sidecar/types.js";
import {
  WF_010_POST_MORTEM_MANIFEST,
  WF_010_POST_MORTEM_CRITERIA,
  buildWf010PostMortemRegistry,
} from "../src/spines/wf-010-post-mortem.js";
import { wf010HappyOutputs as happyOutputs } from "./fixtures/wf-010-outputs.js";

/** Hermetic tests for the REAL WF-010 spine (Project Post-mortem / Lessons Learned), mocked runner. */

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
  generatedAt: "2026-07-13T00:00:00Z",
  assets: [
    agentAsset("AGENT-CHEF-PROJET-IA"),
    agentAsset("AGENT-QA-AGILE"),
    agentAsset("AGENT-CHANGE-MANAGER"),
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

describe("WF-010 spine — loading and execution (mocked runner)", () => {
  it("assembles the 4-step backbone STEP-01→02→03→06 with provenance and criteria", () => {
    const steps = loadSpine(WF_010_POST_MORTEM_MANIFEST, sidecar, buildWf010PostMortemRegistry(), resolveAgent);
    expect(steps.map((s) => s.provenance.stepId)).toEqual(["STEP-01", "STEP-02", "STEP-03", "STEP-06"]);
    expect(steps[0]!.contract.input).toBeUndefined(); // seed
    expect(steps[3]!.criteria.map((c) => c.id)).toContain("red-capitalization");
  });

  it("registry: every manifest criterion resolves (no dangling id)", () => {
    const registry = buildWf010PostMortemRegistry();
    const allIds = WF_010_POST_MORTEM_MANIFEST.steps.flatMap((s) => s.criteriaIds);
    expect(() => registry.resolve(allIds)).not.toThrow();
    expect(allIds.length).toBe(WF_010_POST_MORTEM_CRITERIA.length);
  });

  it("fail-closed: agent missing from the sidecar → ManifestValidationError", () => {
    const incomplete: Sidecar = { ...sidecar, assets: sidecar.assets.slice(0, 3) }; // REDACTEUR-IA removed
    expect(() => loadSpine(WF_010_POST_MORTEM_MANIFEST, incomplete, buildWf010PostMortemRegistry(), resolveAgent)).toThrow(
      ManifestValidationError,
    );
  });

  it("DoD-conformant outputs → spine completed, 4 traces, pass verdicts", async () => {
    const steps = loadSpine(WF_010_POST_MORTEM_MANIFEST, sidecar, buildWf010PostMortemRegistry(), resolveAgent);
    const res = await runSpine(steps, mockRunner(happyOutputs), { project: "AI platform", closeout: "Partial failure" });
    expect(res.status).toBe("completed");
    expect(res.traces).toHaveLength(4);
    expect(res.traces.every((t) => t.gate.verdict === "pass")).toBe(true);
  });

  it("hardening: a modest-but-valid run (1-entry lists) COMPLETES — schema bounds = blocking floor, no false KO at the strict handoff", async () => {
    const modest: Record<string, unknown> = {
      "STEP-01": {
        timeline: [{ milestone: "Go-live", note: "late" }],
        gaps: ["+2 weeks"],
        rootCauses: [{ problem: "scope creep", fiveWhys: ["w1"] }],
        improvementPlan: [{ action: "gate integration tests", priority: "High" }],
      },
      "STEP-02": { qualityReview: "acceptable, some debt" },
      "STEP-03": { teamReview: "cohesive team", hrRecommendations: ["stabilize earlier"] },
      "STEP-06": {
        lessonsReport: "# Lessons\n...",
        execSummary: "Late but shipped; gate tests earlier.",
        capitalizationMemo: "Best: CI. Pitfall: deferred E2E.",
      },
    };
    const steps = loadSpine(WF_010_POST_MORTEM_MANIFEST, sidecar, buildWf010PostMortemRegistry(), resolveAgent);
    const res = await runSpine(steps, mockRunner(modest), {});
    expect(res.status).toBe("completed");
    expect(res.traces).toHaveLength(4);
    // Advisory checks (5 Whys ×3, 5-10 actions, top-5 lists, etc.) fail but do not block → verdict pass.
    expect(res.traces.every((t) => t.gate.verdict === "pass")).toBe(true);
  });

  it("empty root-cause analysis (STEP-01) → failed at STEP-01", async () => {
    const broken = { ...happyOutputs, "STEP-01": { ...(happyOutputs["STEP-01"] as object), rootCauses: [] } };
    const steps = loadSpine(WF_010_POST_MORTEM_MANIFEST, sidecar, buildWf010PostMortemRegistry(), resolveAgent);
    const res = await runSpine(steps, mockRunner(broken), {});
    expect(res.status).toBe("failed");
    expect(res.failure?.stepId).toBe("STEP-01");
    expect(res.failure?.kind).toBe("eval-gate");
    expect(res.traces).toHaveLength(1);
  });

  it("missing capitalization memo (STEP-06) → failed at STEP-06", async () => {
    const broken = { ...happyOutputs, "STEP-06": { ...(happyOutputs["STEP-06"] as object), capitalizationMemo: "" } };
    const steps = loadSpine(WF_010_POST_MORTEM_MANIFEST, sidecar, buildWf010PostMortemRegistry(), resolveAgent);
    const res = await runSpine(steps, mockRunner(broken), {});
    expect(res.status).toBe("failed");
    expect(res.failure?.stepId).toBe("STEP-06");
    expect(res.traces).toHaveLength(4);
  });
});
