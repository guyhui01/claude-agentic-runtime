import { describe, it, expect } from "vitest";
import { loadSpine, ManifestValidationError } from "../src/manifest/load-manifest.js";
import { runSpine } from "../src/orchestrator/run-spine.js";
import type { Sidecar } from "../src/sidecar/types.js";
import {
  WF_008_AUDIT_MANIFEST,
  WF_008_AUDIT_CRITERIA,
  buildWf008AuditRegistry,
} from "../src/spines/wf-008-audit.js";
import { wf008HappyOutputs } from "./fixtures/wf-008-outputs.js";
import {
  wf008InterimSidecar as sidecar,
  wf008ResolveAgent as resolveAgent,
  mockRunner,
} from "./fixtures/wf-008-spine.js";

/** Hermetic tests for the REAL WF-008 spine (AI Act / GDPR Compliance Audit), mocked runner. */

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
