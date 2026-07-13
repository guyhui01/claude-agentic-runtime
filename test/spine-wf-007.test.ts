import { describe, it, expect } from "vitest";
import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import { loadSpine, ManifestValidationError, type AgentResolver } from "../src/manifest/load-manifest.js";
import { runSpine } from "../src/orchestrator/run-spine.js";
import type { StepRunner } from "../src/orchestrator/types.js";
import type { Sidecar } from "../src/sidecar/types.js";
import {
  WF_007_ONBOARDING_MANIFEST,
  WF_007_ONBOARDING_CRITERIA,
  buildWf007OnboardingRegistry,
} from "../src/spines/wf-007-onboarding.js";
import { wf007HappyOutputs as happyOutputs } from "./fixtures/wf-007-outputs.js";

/** Hermetic tests for the REAL WF-007 spine (Client Engagement Onboarding), mocked runner. */

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
    agentAsset("AGENT-BUSINESS-ANALYST"),
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

describe("WF-007 spine — loading and execution (mocked runner)", () => {
  it("assembles the 4-step backbone STEP-01→02→03→05 with provenance and criteria", () => {
    const steps = loadSpine(WF_007_ONBOARDING_MANIFEST, sidecar, buildWf007OnboardingRegistry(), resolveAgent);
    expect(steps.map((s) => s.provenance.stepId)).toEqual(["STEP-01", "STEP-02", "STEP-03", "STEP-05"]);
    expect(steps[0]!.contract.input).toBeUndefined(); // seed
    expect(steps[3]!.criteria.map((c) => c.id)).toContain("red-d5-scoping");
  });

  it("registry: every manifest criterion resolves (no dangling id)", () => {
    const registry = buildWf007OnboardingRegistry();
    const allIds = WF_007_ONBOARDING_MANIFEST.steps.flatMap((s) => s.criteriaIds);
    expect(() => registry.resolve(allIds)).not.toThrow();
    expect(allIds.length).toBe(WF_007_ONBOARDING_CRITERIA.length);
  });

  it("fail-closed: agent missing from the sidecar → ManifestValidationError", () => {
    const incomplete: Sidecar = { ...sidecar, assets: sidecar.assets.slice(0, 3) }; // REDACTEUR-IA removed
    expect(() => loadSpine(WF_007_ONBOARDING_MANIFEST, incomplete, buildWf007OnboardingRegistry(), resolveAgent)).toThrow(
      ManifestValidationError,
    );
  });

  it("DoD-conformant outputs → spine completed, 4 traces, pass verdicts", async () => {
    const steps = loadSpine(WF_007_ONBOARDING_MANIFEST, sidecar, buildWf007OnboardingRegistry(), resolveAgent);
    const res = await runSpine(steps, mockRunner(happyOutputs), { client: "Mid-cap industrial", type: "Scoping" });
    expect(res.status).toBe("completed");
    expect(res.traces).toHaveLength(4);
    expect(res.traces.every((t) => t.gate.verdict === "pass")).toBe(true);
  });

  it("hardening: a modest-but-valid run (1-entry plan/lists) COMPLETES — schema bounds = blocking floor, no false KO at the strict handoff", async () => {
    const modest: Record<string, unknown> = {
      "STEP-01": {
        kickoffPlan: [{ slot: "D1-AM", activity: "kickoff" }],
        raci: [{ stakeholder: "Sponsor", raci: "A" }],
      },
      "STEP-02": { clientContext: "small client, clear scope", isMapping: ["one ERP"] },
      "STEP-03": {
        stakeholderMap: [{ stakeholder: "Sponsor", stance: "ally" }],
        engagementPlan: [{ who: "Sponsor", when: "D1", why: "align" }],
      },
      "STEP-05": {
        d1Kit: "# D1 kit\n...",
        introEmail: "Hi, see you D1.",
        d1ReportTemplate: "# D1 report\n...",
        d5ScopingNote: "D5: scope confirmed.",
      },
    };
    const steps = loadSpine(WF_007_ONBOARDING_MANIFEST, sidecar, buildWf007OnboardingRegistry(), resolveAgent);
    const res = await runSpine(steps, mockRunner(modest), {});
    expect(res.status).toBe("completed");
    expect(res.traces).toHaveLength(4);
    // Advisory checks (D1-D5 ≥5, logistics, glossary, etc.) fail but do not block → verdict pass.
    expect(res.traces.every((t) => t.gate.verdict === "pass")).toBe(true);
  });

  it("empty stakeholder RACI (STEP-01) → failed at STEP-01", async () => {
    const broken = { ...happyOutputs, "STEP-01": { ...(happyOutputs["STEP-01"] as object), raci: [] } };
    const steps = loadSpine(WF_007_ONBOARDING_MANIFEST, sidecar, buildWf007OnboardingRegistry(), resolveAgent);
    const res = await runSpine(steps, mockRunner(broken), {});
    expect(res.status).toBe("failed");
    expect(res.failure?.stepId).toBe("STEP-01");
    expect(res.failure?.kind).toBe("eval-gate");
    expect(res.traces).toHaveLength(1);
  });

  it("missing D5 scoping note (STEP-05) → failed at STEP-05", async () => {
    const broken = { ...happyOutputs, "STEP-05": { ...(happyOutputs["STEP-05"] as object), d5ScopingNote: "" } };
    const steps = loadSpine(WF_007_ONBOARDING_MANIFEST, sidecar, buildWf007OnboardingRegistry(), resolveAgent);
    const res = await runSpine(steps, mockRunner(broken), {});
    expect(res.status).toBe("failed");
    expect(res.failure?.stepId).toBe("STEP-05");
    expect(res.traces).toHaveLength(4);
  });
});
