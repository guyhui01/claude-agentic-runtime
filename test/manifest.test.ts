import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { loadSidecar } from "../src/loader/load-sidecar.js";
import { toAgentDefinition } from "../src/sdk/to-agent-definition.js";
import { CriterionRegistry } from "../src/eval/criteria-registry.js";
import {
  loadSpine,
  ManifestValidationError,
  type AgentResolver,
} from "../src/manifest/load-manifest.js";
import { runSpine } from "../src/orchestrator/run-spine.js";
import type { SpineManifest } from "../src/manifest/types.js";
import type { Criterion } from "../src/eval/types.js";
import type { StepRunner } from "../src/orchestrator/types.js";

/**
 * Hermetic tests for manifest loading (ADR-0007, §2.4-B.2).
 * Cross a runtime manifest with the fixture sidecar + a criteria registry,
 * agents resolved via `toAgentDefinition` (local disk read = hermetic).
 */

const catalogRoot = fileURLToPath(
  new URL("./fixtures/catalog/", import.meta.url),
);
const sidecar = loadSidecar(
  fileURLToPath(new URL("./fixtures/catalog/sidecar.json", import.meta.url)),
);
const resolveAgent: AgentResolver = (asset) =>
  toAgentDefinition(asset, catalogRoot);

// --- Criteria registry ------------------------------------------------------

function asRecord(o: unknown): Record<string, unknown> {
  return (o ?? {}) as Record<string, unknown>;
}
function nonEmptyArray(v: unknown): boolean {
  return Array.isArray(v) && v.length > 0;
}
const CRITERIA: Criterion[] = [
  { id: "objectif-present", description: "non-empty objective", severity: "blocking", check: (o) => typeof asRecord(o)["objectif"] === "string" },
  { id: "perimetre-non-vide", description: "non-empty scope", severity: "blocking", check: (o) => nonEmptyArray(asRecord(o)["perimetre"]) },
  { id: "backlog-non-vide", description: "non-empty backlog", severity: "blocking", check: (o) => nonEmptyArray(asRecord(o)["backlog"]) },
  { id: "plan-present", description: "non-empty plan", severity: "blocking", check: (o) => typeof asRecord(o)["plan"] === "string" },
];
function freshRegistry(): CriterionRegistry {
  return new CriterionRegistry().registerAll(CRITERIA);
}

// --- Valid manifest (spine WF-001→002→003, fixture agent reused) ------------

const sObj = (required: string[], properties: Record<string, unknown>) => ({
  type: "object",
  required,
  properties,
});
const validManifest: SpineManifest = {
  spineId: "spine-cadrage",
  steps: [
    { stepId: "WF-001", assetId: "AGENT-CADRAGE", output: sObj(["objectif", "perimetre"], { objectif: { type: "string" }, perimetre: { type: "array" } }), criteriaIds: ["objectif-present", "perimetre-non-vide"] },
    { stepId: "WF-002", assetId: "AGENT-CADRAGE", input: sObj(["perimetre"], { perimetre: { type: "array" } }), output: sObj(["backlog"], { backlog: { type: "array" } }), criteriaIds: ["backlog-non-vide"] },
    { stepId: "WF-003", assetId: "AGENT-CADRAGE", input: sObj(["backlog"], { backlog: { type: "array" } }), output: sObj(["plan"], { plan: { type: "string" } }), criteriaIds: ["plan-present"] },
  ],
};

const happyOutputs: Record<string, unknown> = {
  "WF-001": { objectif: "Rebuild the B2B portal", perimetre: ["auth"] },
  "WF-002": { backlog: ["US-1"] },
  "WF-003": { plan: "Sprint 1" },
};
const mockRunner: StepRunner = async ({ stepId }) => ({ output: happyOutputs[stepId] });

/** Minimal deep clone of a manifest, to mutate without contaminating other tests. */
function clone(m: SpineManifest): SpineManifest {
  return JSON.parse(JSON.stringify(m)) as SpineManifest;
}

// --- Tests ------------------------------------------------------------------

describe("loadSpine — valid manifest (ADR-0007)", () => {
  it("produces SpineSteps with provenance, contract, and resolved criteria", () => {
    const steps = loadSpine(validManifest, sidecar, freshRegistry(), resolveAgent);
    expect(steps).toHaveLength(3);
    expect(steps.map((s) => s.provenance.stepId)).toEqual(["WF-001", "WF-002", "WF-003"]);
    expect(steps.every((s) => s.provenance.catalogTag === "v3.25.0")).toBe(true);
    expect(steps.every((s) => s.provenance.assetId === "AGENT-CADRAGE")).toBe(true);
    expect(steps[0]!.criteria.map((c) => c.id)).toEqual(["objectif-present", "perimetre-non-vide"]);
    expect(steps[0]!.contract.input).toBeUndefined(); // seed
    expect(steps[1]!.contract.input).toBeDefined();
  });

  it("end-to-end: the loaded manifest runs in runSpine", async () => {
    const steps = loadSpine(validManifest, sidecar, freshRegistry(), resolveAgent);
    const res = await runSpine(steps, mockRunner);
    expect(res.status).toBe("completed");
    expect(res.traces).toHaveLength(3);
  });
});

describe("loadSpine — fail-closed cross-checks", () => {
  it("UNKNOWN_ASSET: assetId missing from the sidecar", () => {
    const m = clone(validManifest);
    m.steps[1]!.assetId = "AGENT-PHANTOM";
    try {
      loadSpine(m, sidecar, freshRegistry(), resolveAgent);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ManifestValidationError);
      expect((e as ManifestValidationError).issues.some((i) => i.code === "UNKNOWN_ASSET")).toBe(true);
    }
  });

  it("NOT_AN_AGENT: assetId points to a skill", () => {
    const m = clone(validManifest);
    m.steps[0]!.assetId = "skill-user-stories";
    expect(() => loadSpine(m, sidecar, freshRegistry(), resolveAgent)).toThrow(
      ManifestValidationError,
    );
  });

  it("UNKNOWN_CRITERION: criteriaId not registered", () => {
    const m = clone(validManifest);
    m.steps[2]!.criteriaIds = ["plan-present", "nonexistent"];
    try {
      loadSpine(m, sidecar, freshRegistry(), resolveAgent);
      expect.unreachable();
    } catch (e) {
      const issues = (e as ManifestValidationError).issues;
      expect(issues.some((i) => i.code === "UNKNOWN_CRITERION" && i.message.includes("nonexistent"))).toBe(true);
    }
  });

  it("DUPLICATE_STEP_ID: stepId repeated", () => {
    const m = clone(validManifest);
    m.steps[1]!.stepId = "WF-001";
    expect(() => loadSpine(m, sidecar, freshRegistry(), resolveAgent)).toThrow(
      ManifestValidationError,
    );
  });

  it("aggregates multiple problems into a single throw", () => {
    const m = clone(validManifest);
    m.steps[0]!.assetId = "AGENT-PHANTOM"; // UNKNOWN_ASSET
    m.steps[2]!.criteriaIds = ["nope"]; // UNKNOWN_CRITERION
    try {
      loadSpine(m, sidecar, freshRegistry(), resolveAgent);
      expect.unreachable();
    } catch (e) {
      expect((e as ManifestValidationError).issues.length).toBeGreaterThanOrEqual(2);
    }
  });
});
