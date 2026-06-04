import { describe, it, expect, vi } from "vitest";
import { fileURLToPath } from "node:url";
import { loadSidecar } from "../src/loader/load-sidecar.js";
import { toAgentDefinition } from "../src/sdk/to-agent-definition.js";
import { runSpine, SpineConfigError } from "../src/orchestrator/run-spine.js";
import type { SpineStep, StepRunner } from "../src/orchestrator/types.js";
import type { StepContract } from "../src/handoff/types.js";
import type { Criterion } from "../src/eval/types.js";

/**
 * Tests hermétiques de l'exécuteur de spine (§2.4-B.1).
 * Le seul effet de bord — l'exécution d'une étape — passe par un `StepRunner`
 * MOCKÉ (canned outputs par stepId). Aucun réseau, aucun appel `query()` réel.
 * Le câblage §2.4-A est démontré : les agents sont construits depuis le
 * catalogue fixture via `toAgentDefinition` (lecture disque locale = hermétique).
 */

const catalogRoot = fileURLToPath(
  new URL("./fixtures/catalog/", import.meta.url),
);
const fixtureSidecar = fileURLToPath(
  new URL("./fixtures/catalog/sidecar.json", import.meta.url),
);

const sidecar = loadSidecar(fixtureSidecar);
const agentAsset = sidecar.assets.find((a) => a.type === "agent")!;
const agentDef = toAgentDefinition(agentAsset, catalogRoot);
const TAG = agentAsset.source.catalogTag; // "v3.25.0"

// --- Helpers de fixture -----------------------------------------------------

function asRecord(o: unknown): Record<string, unknown> {
  return (o ?? {}) as Record<string, unknown>;
}
function nonEmptyArray(v: unknown): boolean {
  return Array.isArray(v) && v.length > 0;
}
const objectifPresent: Criterion = {
  id: "objectif-present",
  description: "Un objectif non vide est défini",
  severity: "blocking",
  check: (o) => typeof asRecord(o)["objectif"] === "string",
};
const perimetreNonVide: Criterion = {
  id: "perimetre-non-vide",
  description: "Le périmètre liste au moins un élément",
  severity: "blocking",
  check: (o) => nonEmptyArray(asRecord(o)["perimetre"]),
};
const backlogNonVide: Criterion = {
  id: "backlog-non-vide",
  description: "Le backlog liste au moins une story",
  severity: "blocking",
  check: (o) => nonEmptyArray(asRecord(o)["backlog"]),
};
const planPresent: Criterion = {
  id: "plan-present",
  description: "Un plan non vide est défini",
  severity: "blocking",
  check: (o) => typeof asRecord(o)["plan"] === "string",
};

function buildStep(
  stepId: string,
  contract: Omit<StepContract, "stepId">,
  criteria: Criterion[],
): SpineStep {
  return {
    provenance: { stepId, assetId: agentAsset.id, catalogTag: TAG },
    agent: agentDef,
    contract: { stepId, ...contract },
    criteria,
  };
}

/** Runner mock : sorties canoniques par stepId (lève si stepId inconnu). */
function mockRunner(outputs: Record<string, unknown>): StepRunner {
  return async ({ stepId }) => {
    if (!(stepId in outputs)) throw new Error(`stepId inattendu : ${stepId}`);
    return { output: outputs[stepId] };
  };
}

// Contrats de la spine WF-001→002→003.
const c1 = { output: { type: "object", required: ["objectif", "perimetre"], properties: { objectif: { type: "string" }, perimetre: { type: "array" } } } } as const;
const c2 = { input: { type: "object", required: ["perimetre"], properties: { perimetre: { type: "array" } } }, output: { type: "object", required: ["backlog"], properties: { backlog: { type: "array" } } } } as const;
const c3 = { input: { type: "object", required: ["backlog"], properties: { backlog: { type: "array" } } }, output: { type: "object", required: ["plan"], properties: { plan: { type: "string" } } } } as const;

function happySpine(): SpineStep[] {
  return [
    buildStep("WF-001", c1, [objectifPresent, perimetreNonVide]),
    buildStep("WF-002", c2, [backlogNonVide]),
    buildStep("WF-003", c3, [planPresent]),
  ];
}
const happyOutputs = {
  "WF-001": { objectif: "Refondre le portail B2B", perimetre: ["auth", "catalogue"] },
  "WF-002": { backlog: ["US-1", "US-2"] },
  "WF-003": { plan: "Sprint 1 : auth ; Sprint 2 : catalogue" },
};

// --- Tests ------------------------------------------------------------------

describe("runSpine — happy path WF-001→002→003", () => {
  it("déroule les 3 étapes, gates pass, handoffs valides", async () => {
    const res = await runSpine(happySpine(), mockRunner(happyOutputs));
    expect(res.status).toBe("completed");
    expect(res.traces).toHaveLength(3);
    expect(res.traces.every((t) => t.gate.verdict === "pass")).toBe(true);
    expect(res.finalOutput).toEqual(happyOutputs["WF-003"]);
  });

  it("propage la provenance (assetId + catalogTag) sur chaque trace", async () => {
    const res = await runSpine(happySpine(), mockRunner(happyOutputs));
    expect(res.traces.map((t) => t.provenance.stepId)).toEqual([
      "WF-001",
      "WF-002",
      "WF-003",
    ]);
    expect(res.traces.every((t) => t.provenance.catalogTag === TAG)).toBe(true);
    expect(res.traces.every((t) => t.provenance.assetId === agentAsset.id)).toBe(
      true,
    );
  });
});

describe("runSpine — fail-closed eval gate (brique 2)", () => {
  it("stoppe sur une gate échouée, en conservant la trace-preuve jusqu'à l'étape fautive", async () => {
    const outputs = { ...happyOutputs, "WF-002": { backlog: [] } }; // viole backlog-non-vide
    const res = await runSpine(happySpine(), mockRunner(outputs));
    expect(res.status).toBe("failed");
    expect(res.failure).toMatchObject({ stepId: "WF-002", kind: "eval-gate" });
    expect(res.traces).toHaveLength(2); // WF-001 ok + WF-002 fautive tracée
    const failedGate = res.traces[1]!.gate;
    expect(failedGate.verdict).toBe("fail");
    expect(failedGate.results.find((r) => r.id === "backlog-non-vide")!.passed).toBe(
      false,
    );
  });
});

describe("runSpine — fail-closed handoff (brique 1)", () => {
  it("stoppe quand la sortie viole le contrat, gate franchie auparavant", async () => {
    // WF-001 ne vérifie QUE l'objectif (gate pass), mais omet `perimetre`
    // promis par sa sortie → producer-output du handoff échoue.
    const steps = [
      buildStep("WF-001", c1, [objectifPresent]),
      buildStep("WF-002", c2, [backlogNonVide]),
      buildStep("WF-003", c3, [planPresent]),
    ];
    const outputs = { ...happyOutputs, "WF-001": { objectif: "X" } };
    const res = await runSpine(steps, mockRunner(outputs));
    expect(res.status).toBe("failed");
    expect(res.failure).toMatchObject({ stepId: "WF-001", kind: "handoff" });
    expect(res.traces).toHaveLength(1);
    expect(res.traces[0]!.gate.verdict).toBe("pass"); // la gate avait bien laissé passer
  });
});

describe("runSpine — pré-vol statique (design-time)", () => {
  it("rejette des contrats incompatibles AVANT tout appel runner", async () => {
    // WF-001 ne promet pas `perimetre` que WF-002 exige en entrée.
    const badC1 = { output: { type: "object", required: ["objectif"], properties: { objectif: { type: "string" } } } } as const;
    const steps = [
      buildStep("WF-001", badC1, [objectifPresent]),
      buildStep("WF-002", c2, [backlogNonVide]),
    ];
    const spy = vi.fn(mockRunner(happyOutputs));
    await expect(runSpine(steps, spy)).rejects.toThrow(SpineConfigError);
    expect(spy).not.toHaveBeenCalled();
  });

  it("rejette une incohérence provenance.stepId ≠ contract.stepId", async () => {
    const step = buildStep("WF-001", c1, [objectifPresent]);
    step.provenance.stepId = "WF-999";
    await expect(runSpine([step], mockRunner(happyOutputs))).rejects.toThrow(
      SpineConfigError,
    );
  });
});
