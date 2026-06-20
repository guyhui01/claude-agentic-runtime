import { describe, it, expect } from "vitest";
import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import { loadSpine, ManifestValidationError, type AgentResolver } from "../src/manifest/load-manifest.js";
import { runSpine } from "../src/orchestrator/run-spine.js";
import type { StepRunner } from "../src/orchestrator/types.js";
import type { Sidecar } from "../src/sidecar/types.js";
import {
  WF_002_DELIVERY_MANIFEST,
  WF_002_DELIVERY_CRITERIA,
  buildWf002DeliveryRegistry,
} from "../src/spines/wf-002-delivery.js";

/** Hermetic tests for the REAL WF-002 spine (SAFe Delivery), mocked runner. */

function agentAsset(id: string) {
  return {
    id,
    type: "agent" as const,
    path: `${id}.md`,
    title: id,
    description: `Agent ${id}.`,
    catalogVersion: "v3.25.0",
    source: { file: `${id}.md`, catalogTag: "v3.25.0" },
  };
}
const sidecar: Sidecar = {
  schemaVersion: "1.0.0",
  catalog: { name: "claude-agents", version: "v3.25.0" },
  generatedAt: "2026-06-03T14:00:00Z",
  assets: [
    agentAsset("AGENT-PRODUCT-MANAGER-SAFE"),
    agentAsset("AGENT-RELEASE-TRAIN-ENGINEER"),
    agentAsset("AGENT-PO-SAFE"),
    agentAsset("AGENT-SCRUM-MASTER"),
    agentAsset("AGENT-CHEF-PROJET-IA"),
  ],
};
const resolveAgent: AgentResolver = (asset): AgentDefinition => ({
  description: asset.description,
  prompt: `stub:${asset.id}`,
  tools: [],
});

const backlog = Array.from({ length: 6 }, (_, i) => ({ statement: `US ${i + 1}`, wsjf: 10 - i }));
const happyOutputs: Record<string, unknown> = {
  "STEP-01": {
    visionBoard: "Vision board PI-07 (1 page)",
    featuresWsjf: [{ nom: "F1", wsjf: 18 }, { nom: "F2", wsjf: 12 }],
    leanBusinessCase: "Lean BC for F1",
  },
  "STEP-02": {
    programBoard: [{ from: "EQ1", to: "EQ2", dep: "API" }],
    voteConfiance: 4,
    roamRisks: [{ risk: "external dependency", roam: "Owned" }],
  },
  "STEP-03": {
    piObjectives: ["O1", "O2", "O3"],
    backlogSprint: backlog,
  },
  "STEP-04": {
    sprintGoal: "Deliver SSO authentication",
    sprintPlan: { usEngagees: ["US1", "US2"], storyPoints: 21 },
    impediments: [],
  },
  "STEP-06": {
    noteCodir: "Exec committee note: PI-07 on track, 1 Owned risk.",
    dashboard: { avancement: "32%", risques: ["external dep."] },
    evm: { cpi: 1.02, spi: 0.98 },
  },
};
const mockRunner = (outputs: Record<string, unknown>): StepRunner =>
  async ({ stepId }) => ({ output: outputs[stepId] });

describe("WF-002 spine — loading and execution (mocked runner)", () => {
  it("assembles the backbone STEP-01→02→03→04→06 with provenance and criteria", () => {
    const steps = loadSpine(WF_002_DELIVERY_MANIFEST, sidecar, buildWf002DeliveryRegistry(), resolveAgent);
    expect(steps.map((s) => s.provenance.stepId)).toEqual(["STEP-01", "STEP-02", "STEP-03", "STEP-04", "STEP-06"]);
    expect(steps[0]!.contract.input).toBeUndefined(); // seed
    expect(steps[1]!.contract.input).toBeDefined();
  });

  it("registry: every manifest criterion resolves (no dangling id)", () => {
    const registry = buildWf002DeliveryRegistry();
    const allIds = WF_002_DELIVERY_MANIFEST.steps.flatMap((s) => s.criteriaIds);
    expect(() => registry.resolve(allIds)).not.toThrow();
    expect(allIds.length).toBe(WF_002_DELIVERY_CRITERIA.length);
  });

  it("fail-closed: agent missing from the sidecar → ManifestValidationError", () => {
    const incomplete: Sidecar = { ...sidecar, assets: sidecar.assets.slice(0, 4) }; // CHEF-PROJET removed
    expect(() => loadSpine(WF_002_DELIVERY_MANIFEST, incomplete, buildWf002DeliveryRegistry(), resolveAgent)).toThrow(
      ManifestValidationError,
    );
  });

  it("DoD-conformant outputs → spine completed, 5 traces, pass verdicts", async () => {
    const steps = loadSpine(WF_002_DELIVERY_MANIFEST, sidecar, buildWf002DeliveryRegistry(), resolveAgent);
    const res = await runSpine(steps, mockRunner(happyOutputs), { art: "ART Digital Banking" });
    expect(res.status).toBe("completed");
    expect(res.traces).toHaveLength(5);
    expect(res.traces.every((t) => t.gate.verdict === "pass")).toBe(true);
  });

  it("confidence vote < 3.5 (STEP-02) → failed at STEP-02's eval gate", async () => {
    const steps = loadSpine(WF_002_DELIVERY_MANIFEST, sidecar, buildWf002DeliveryRegistry(), resolveAgent);
    const broken = { ...happyOutputs, "STEP-02": { ...(happyOutputs["STEP-02"] as object), voteConfiance: 3.0 } };
    const res = await runSpine(steps, mockRunner(broken), {});
    expect(res.status).toBe("failed");
    expect(res.failure?.stepId).toBe("STEP-02");
    expect(res.failure?.kind).toBe("eval-gate");
    expect(res.traces).toHaveLength(2);
  });
});
