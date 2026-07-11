import { describe, it, expect } from "vitest";
import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import { loadSpine, ManifestValidationError, type AgentResolver } from "../src/manifest/load-manifest.js";
import { runSpine } from "../src/orchestrator/run-spine.js";
import type { StepRunner } from "../src/orchestrator/types.js";
import type { Sidecar } from "../src/sidecar/types.js";
import {
  WF_008_AUDIT_MANIFEST,
  WF_008_AUDIT_CRITERIA,
  buildWf008AuditRegistry,
} from "../src/spines/wf-008-audit.js";
import { wf008HappyOutputs } from "./fixtures/wf-008-outputs.js";

/** Hermetic tests for the REAL WF-008 spine (AI Act / GDPR Compliance Audit), mocked runner. */

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
  generatedAt: "2026-07-10T14:00:00Z",
  assets: [
    agentAsset("AGENT-JURIDIQUE-IA"),
    agentAsset("AGENT-AI-ARCHITECT"),
    agentAsset("AGENT-SECURITE-IA"),
    agentAsset("AGENT-DATA-ENGINEER"),
    agentAsset("AGENT-CDO-DIRECTEUR-IA"),
    agentAsset("AGENT-CHANGE-MANAGER"),
    agentAsset("AGENT-AUDIT-METHODO-IA"),
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

describe("WF-008 spine — loading and execution (mocked runner)", () => {
  it("assembles the 8-step backbone STEP-01→06C→07 with provenance and criteria", () => {
    const steps = loadSpine(WF_008_AUDIT_MANIFEST, sidecar, buildWf008AuditRegistry(), resolveAgent);
    expect(steps.map((s) => s.provenance.stepId)).toEqual([
      "STEP-01", "STEP-02", "STEP-03", "STEP-04", "STEP-05", "STEP-06", "STEP-06C", "STEP-07",
    ]);
    expect(steps[0]!.contract.input).toBeUndefined(); // seed
    // The counter-review clearance gate lives on STEP-06C, before the report (STEP-07).
    expect(steps[6]!.provenance.assetId).toBe("AGENT-AUDIT-METHODO-IA");
    expect(steps[6]!.criteria.map((c) => c.id)).toContain("audit-verdict-cleared");
  });

  it("registry: every manifest criterion resolves (no dangling id)", () => {
    const registry = buildWf008AuditRegistry();
    const allIds = WF_008_AUDIT_MANIFEST.steps.flatMap((s) => s.criteriaIds);
    expect(() => registry.resolve(allIds)).not.toThrow();
    expect(allIds.length).toBe(WF_008_AUDIT_CRITERIA.length);
  });

  it("fail-closed: agent missing from the sidecar → ManifestValidationError", () => {
    const incomplete: Sidecar = { ...sidecar, assets: sidecar.assets.slice(0, 7) }; // REDACTEUR-IA removed
    expect(() => loadSpine(WF_008_AUDIT_MANIFEST, incomplete, buildWf008AuditRegistry(), resolveAgent)).toThrow(
      ManifestValidationError,
    );
  });

  it("DoD-conformant outputs → spine completed, 8 traces, pass verdicts", async () => {
    const steps = loadSpine(WF_008_AUDIT_MANIFEST, sidecar, buildWf008AuditRegistry(), resolveAgent);
    const res = await runSpine(steps, mockRunner(wf008HappyOutputs), {
      client: "Insurer", system: "Claims-triage AI", origin: "Preventive audit",
    });
    expect(res.status).toBe("completed");
    expect(res.traces).toHaveLength(8);
    expect(res.traces.every((t) => t.gate.verdict === "pass")).toBe(true);
  });

  it("gateway: « Unacceptable » AI Act tier → failed at STEP-01 (recommend cessation)", async () => {
    const steps = loadSpine(WF_008_AUDIT_MANIFEST, sidecar, buildWf008AuditRegistry(), resolveAgent);
    const broken = { ...wf008HappyOutputs, "STEP-01": { ...(wf008HappyOutputs["STEP-01"] as object), tier: "Unacceptable" } };
    const res = await runSpine(steps, mockRunner(broken), {});
    expect(res.status).toBe("failed");
    expect(res.failure?.stepId).toBe("STEP-01");
    expect(res.failure?.kind).toBe("eval-gate");
    expect(res.traces).toHaveLength(1);
  });

  it("counter-review gate: « returned » verdict → failed at STEP-06C, report (STEP-07) never produced", async () => {
    const steps = loadSpine(WF_008_AUDIT_MANIFEST, sidecar, buildWf008AuditRegistry(), resolveAgent);
    const broken = {
      ...wf008HappyOutputs,
      "STEP-06C": {
        ...(wf008HappyOutputs["STEP-06C"] as object),
        verdict: "returned",
        reservations: [{ issue: "Tier justification too thin", severity: "high" }],
      },
    };
    const res = await runSpine(steps, mockRunner(broken), {});
    expect(res.status).toBe("failed");
    expect(res.failure?.stepId).toBe("STEP-06C");
    expect(res.failure?.kind).toBe("eval-gate");
    expect(res.traces).toHaveLength(7); // STEP-07 not reached
    expect(res.traces.some((t) => t.provenance.stepId === "STEP-07")).toBe(false);
  });

  it("anti-theater: cleared verdict but empty bias log → still failed at STEP-06C", async () => {
    const steps = loadSpine(WF_008_AUDIT_MANIFEST, sidecar, buildWf008AuditRegistry(), resolveAgent);
    const broken = {
      ...wf008HappyOutputs,
      "STEP-06C": { ...(wf008HappyOutputs["STEP-06C"] as object), biasLog: [] },
    };
    const res = await runSpine(steps, mockRunner(broken), {});
    expect(res.status).toBe("failed");
    expect(res.failure?.stepId).toBe("STEP-06C");
    expect(res.traces).toHaveLength(7);
  });
});
