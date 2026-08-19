import { describe, it, expect } from "vitest";
import { loadSpine, ManifestValidationError } from "../src/manifest/load-manifest.js";
import { runSpine } from "../src/orchestrator/run-spine.js";
import {
  WF_001_CADRAGE_MANIFEST,
  WF_001_CADRAGE_CRITERIA,
  buildWf001CadrageRegistry,
} from "../src/spines/wf-001-cadrage.js";
import type { Sidecar } from "../src/sidecar/types.js";
import {
  wf001InterimSidecar as sidecar,
  wf001ResolveAgent as resolveAgent,
  mockRunner,
} from "./fixtures/wf-001-spine.js";
import { wf001HappyBacklog as happyBacklog, wf001HappyOutputs as happyOutputs } from "./fixtures/wf-001-outputs.js";

/**
 * Hermetic tests for the REAL WF-001 spine (§2.4-B.3, offline prep).
 * Validate that the manifest sourced from the real workflow assembles and that the
 * real gates (DoD) block/let through as expected — mocked runner, zero network.
 * Interim sidecar / resolver / runner + DoD-compliant outputs come from the shared
 * fixtures (`fixtures/wf-001-spine.ts`, `fixtures/wf-001-outputs.ts`).
 */

// --- Tests ------------------------------------------------------------------

describe("WF-001 spine — loading the real manifest", () => {
  it("assembles 3 steps STEP-01→03→04 with provenance, criteria, and contracts", () => {
    const steps = loadSpine(WF_001_CADRAGE_MANIFEST, sidecar, buildWf001CadrageRegistry(), resolveAgent);
    expect(steps.map((s) => s.provenance.stepId)).toEqual(["STEP-01", "STEP-03", "STEP-04"]);
    expect(steps.map((s) => s.provenance.assetId)).toEqual([
      "AGENT-BUSINESS-ANALYST",
      "AGENT-PO-SCRUM",
      "AGENT-QA-AGILE",
    ]);
    expect(steps[0]!.contract.input).toBeUndefined(); // seed
    expect(steps[1]!.contract.input).toBeDefined();
    expect(steps[0]!.criteria.map((c) => c.id)).toContain("ba-perimetre-in-out");
  });

  it("registry: every manifest criterion resolves (no dangling id)", () => {
    const registry = buildWf001CadrageRegistry();
    const allIds = WF_001_CADRAGE_MANIFEST.steps.flatMap((s) => s.criteriaIds);
    expect(() => registry.resolve(allIds)).not.toThrow();
    expect(allIds.length).toBe(WF_001_CADRAGE_CRITERIA.length);
  });

  it("fail-closed: an agent missing from the sidecar throws ManifestValidationError", () => {
    const incomplete: Sidecar = { ...sidecar, assets: sidecar.assets.slice(0, 2) }; // QA-AGILE removed
    expect(() => loadSpine(WF_001_CADRAGE_MANIFEST, incomplete, buildWf001CadrageRegistry(), resolveAgent)).toThrow(
      ManifestValidationError,
    );
  });
});

describe("WF-001 spine — end-to-end execution (mocked runner)", () => {
  it("DoD-conformant outputs → spine completed, 3 traces, pass verdicts", async () => {
    const steps = loadSpine(WF_001_CADRAGE_MANIFEST, sidecar, buildWf001CadrageRegistry(), resolveAgent);
    const res = await runSpine(steps, mockRunner(happyOutputs), { brief: "Rebuild the B2B portal" });
    expect(res.status).toBe("completed");
    expect(res.traces).toHaveLength(3);
    expect(res.traces.every((t) => t.gate.verdict === "pass")).toBe(true);
  });

  it("STEP-03 below the DoD threshold (5 US) → failed at STEP-03's eval gate", async () => {
    const steps = loadSpine(WF_001_CADRAGE_MANIFEST, sidecar, buildWf001CadrageRegistry(), resolveAgent);
    const broken = {
      ...happyOutputs,
      "STEP-03": { backlog: happyBacklog.slice(0, 5), epics: ["A", "B", "C"] },
    };
    const res = await runSpine(steps, mockRunner(broken), {});
    expect(res.status).toBe("failed");
    expect(res.failure?.stepId).toBe("STEP-03");
    expect(res.failure?.kind).toBe("eval-gate");
    expect(res.traces).toHaveLength(2); // STEP-01 passed, STEP-03 faulty, traced
  });

  it("unsatisfied advisory criterion (no error/boundary case) → spine completed anyway", async () => {
    const steps = loadSpine(WF_001_CADRAGE_MANIFEST, sidecar, buildWf001CadrageRegistry(), resolveAgent);
    const advisoryOnly = {
      ...happyOutputs,
      "STEP-04": {
        gherkin: [{ given: "g", when: "w", then: "t", type: "nominal" }],
        planTest: "Sprint 1",
      },
    };
    const res = await runSpine(steps, mockRunner(advisoryOnly), {});
    expect(res.status).toBe("completed"); // advisory does not block
    const qaTrace = res.traces[2]!;
    expect(qaTrace.gate.verdict).toBe("pass");
    expect(qaTrace.gate.results.find((r) => r.id === "qa-cas-erreur-et-limite")?.passed).toBe(false);
  });
});
