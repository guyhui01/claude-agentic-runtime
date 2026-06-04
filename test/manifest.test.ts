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
 * Tests hermétiques du chargement de manifeste (ADR-0007, §2.4-B.2).
 * Croise un manifeste runtime avec le sidecar fixture + un registre de critères,
 * agents résolus via `toAgentDefinition` (lecture disque locale = hermétique).
 */

const catalogRoot = fileURLToPath(
  new URL("./fixtures/catalog/", import.meta.url),
);
const sidecar = loadSidecar(
  fileURLToPath(new URL("./fixtures/catalog/sidecar.json", import.meta.url)),
);
const resolveAgent: AgentResolver = (asset) =>
  toAgentDefinition(asset, catalogRoot);

// --- Registre de critères ---------------------------------------------------

function asRecord(o: unknown): Record<string, unknown> {
  return (o ?? {}) as Record<string, unknown>;
}
function nonEmptyArray(v: unknown): boolean {
  return Array.isArray(v) && v.length > 0;
}
const CRITERIA: Criterion[] = [
  { id: "objectif-present", description: "objectif non vide", severity: "blocking", check: (o) => typeof asRecord(o)["objectif"] === "string" },
  { id: "perimetre-non-vide", description: "périmètre non vide", severity: "blocking", check: (o) => nonEmptyArray(asRecord(o)["perimetre"]) },
  { id: "backlog-non-vide", description: "backlog non vide", severity: "blocking", check: (o) => nonEmptyArray(asRecord(o)["backlog"]) },
  { id: "plan-present", description: "plan non vide", severity: "blocking", check: (o) => typeof asRecord(o)["plan"] === "string" },
];
function freshRegistry(): CriterionRegistry {
  return new CriterionRegistry().registerAll(CRITERIA);
}

// --- Manifeste valide (spine WF-001→002→003, agent fixture réutilisé) -------

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
  "WF-001": { objectif: "Refondre le portail B2B", perimetre: ["auth"] },
  "WF-002": { backlog: ["US-1"] },
  "WF-003": { plan: "Sprint 1" },
};
const mockRunner: StepRunner = async ({ stepId }) => ({ output: happyOutputs[stepId] });

/** Clone profond minimal d'un manifeste pour muter sans contaminer les autres tests. */
function clone(m: SpineManifest): SpineManifest {
  return JSON.parse(JSON.stringify(m)) as SpineManifest;
}

// --- Tests ------------------------------------------------------------------

describe("loadSpine — manifeste valide (ADR-0007)", () => {
  it("produit des SpineStep avec provenance, contrat et critères résolus", () => {
    const steps = loadSpine(validManifest, sidecar, freshRegistry(), resolveAgent);
    expect(steps).toHaveLength(3);
    expect(steps.map((s) => s.provenance.stepId)).toEqual(["WF-001", "WF-002", "WF-003"]);
    expect(steps.every((s) => s.provenance.catalogTag === "v3.25.0")).toBe(true);
    expect(steps.every((s) => s.provenance.assetId === "AGENT-CADRAGE")).toBe(true);
    expect(steps[0]!.criteria.map((c) => c.id)).toEqual(["objectif-present", "perimetre-non-vide"]);
    expect(steps[0]!.contract.input).toBeUndefined(); // amorce
    expect(steps[1]!.contract.input).toBeDefined();
  });

  it("bout-en-bout : le manifeste chargé s'exécute dans runSpine", async () => {
    const steps = loadSpine(validManifest, sidecar, freshRegistry(), resolveAgent);
    const res = await runSpine(steps, mockRunner);
    expect(res.status).toBe("completed");
    expect(res.traces).toHaveLength(3);
  });
});

describe("loadSpine — croisements fail-closed", () => {
  it("UNKNOWN_ASSET : assetId absent du sidecar", () => {
    const m = clone(validManifest);
    m.steps[1]!.assetId = "AGENT-FANTOME";
    try {
      loadSpine(m, sidecar, freshRegistry(), resolveAgent);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ManifestValidationError);
      expect((e as ManifestValidationError).issues.some((i) => i.code === "UNKNOWN_ASSET")).toBe(true);
    }
  });

  it("NOT_AN_AGENT : assetId pointe un skill", () => {
    const m = clone(validManifest);
    m.steps[0]!.assetId = "skill-user-stories";
    expect(() => loadSpine(m, sidecar, freshRegistry(), resolveAgent)).toThrow(
      ManifestValidationError,
    );
  });

  it("UNKNOWN_CRITERION : criteriaId non enregistré", () => {
    const m = clone(validManifest);
    m.steps[2]!.criteriaIds = ["plan-present", "inexistant"];
    try {
      loadSpine(m, sidecar, freshRegistry(), resolveAgent);
      expect.unreachable();
    } catch (e) {
      const issues = (e as ManifestValidationError).issues;
      expect(issues.some((i) => i.code === "UNKNOWN_CRITERION" && i.message.includes("inexistant"))).toBe(true);
    }
  });

  it("DUPLICATE_STEP_ID : stepId répété", () => {
    const m = clone(validManifest);
    m.steps[1]!.stepId = "WF-001";
    expect(() => loadSpine(m, sidecar, freshRegistry(), resolveAgent)).toThrow(
      ManifestValidationError,
    );
  });

  it("agrège plusieurs problèmes en une seule levée", () => {
    const m = clone(validManifest);
    m.steps[0]!.assetId = "AGENT-FANTOME"; // UNKNOWN_ASSET
    m.steps[2]!.criteriaIds = ["nope"]; // UNKNOWN_CRITERION
    try {
      loadSpine(m, sidecar, freshRegistry(), resolveAgent);
      expect.unreachable();
    } catch (e) {
      expect((e as ManifestValidationError).issues.length).toBeGreaterThanOrEqual(2);
    }
  });
});
