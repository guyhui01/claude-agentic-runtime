import { describe, it, expect, vi } from "vitest";
import { fileURLToPath } from "node:url";
import { loadSidecar } from "../src/loader/load-sidecar.js";
import { toAgentDefinition } from "../src/sdk/to-agent-definition.js";
import { runSpine, SpineConfigError } from "../src/orchestrator/run-spine.js";
import type { SpineStep, StepRunner } from "../src/orchestrator/types.js";
import type { StepContract } from "../src/handoff/types.js";
import type { Criterion } from "../src/eval/types.js";

/**
 * Hermetic tests for the spine executor (§2.4-B.1).
 * The only side effect — running a step — goes through a MOCKED `StepRunner`
 * (canned outputs by stepId). No network, no real `query()` call.
 * The §2.4-A wiring is demonstrated: agents are built from the fixture catalog
 * via `toAgentDefinition` (local disk read = hermetic).
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

// --- Fixture helpers --------------------------------------------------------

function asRecord(o: unknown): Record<string, unknown> {
  return (o ?? {}) as Record<string, unknown>;
}
function nonEmptyArray(v: unknown): boolean {
  return Array.isArray(v) && v.length > 0;
}
const objectifPresent: Criterion = {
  id: "objectif-present",
  description: "A non-empty objective is defined",
  severity: "blocking",
  check: (o) => typeof asRecord(o)["objectif"] === "string",
};
const perimetreNonVide: Criterion = {
  id: "perimetre-non-vide",
  description: "The scope lists at least one item",
  severity: "blocking",
  check: (o) => nonEmptyArray(asRecord(o)["perimetre"]),
};
const backlogNonVide: Criterion = {
  id: "backlog-non-vide",
  description: "The backlog lists at least one story",
  severity: "blocking",
  check: (o) => nonEmptyArray(asRecord(o)["backlog"]),
};
const planPresent: Criterion = {
  id: "plan-present",
  description: "A non-empty plan is defined",
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

/** Mock runner: canonical outputs by stepId (throws on unknown stepId). */
function mockRunner(outputs: Record<string, unknown>): StepRunner {
  return async ({ stepId }) => {
    if (!(stepId in outputs)) throw new Error(`unexpected stepId: ${stepId}`);
    return { output: outputs[stepId] };
  };
}

// Contracts of the WF-001→002→003 spine.
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
  "WF-001": { objectif: "Rebuild the B2B portal", perimetre: ["auth", "catalogue"] },
  "WF-002": { backlog: ["US-1", "US-2"] },
  "WF-003": { plan: "Sprint 1: auth; Sprint 2: catalogue" },
};

// --- Tests ------------------------------------------------------------------

describe("runSpine — happy path WF-001→002→003", () => {
  it("runs the 3 steps, gates pass, valid handoffs", async () => {
    const res = await runSpine(happySpine(), mockRunner(happyOutputs));
    expect(res.status).toBe("completed");
    expect(res.traces).toHaveLength(3);
    expect(res.traces.every((t) => t.gate.verdict === "pass")).toBe(true);
    expect(res.finalOutput).toEqual(happyOutputs["WF-003"]);
  });

  it("propagates provenance (assetId + catalogTag) onto each trace", async () => {
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

describe("runSpine — fail-closed eval gate (brick 2)", () => {
  it("stops on a failed gate, keeping the evidence trace up to the faulty step", async () => {
    const outputs = { ...happyOutputs, "WF-002": { backlog: [] } }; // violates backlog-non-vide
    const res = await runSpine(happySpine(), mockRunner(outputs));
    expect(res.status).toBe("failed");
    expect(res.failure).toMatchObject({ stepId: "WF-002", kind: "eval-gate" });
    expect(res.traces).toHaveLength(2); // WF-001 ok + WF-002 faulty, traced
    const failedGate = res.traces[1]!.gate;
    expect(failedGate.verdict).toBe("fail");
    expect(failedGate.results.find((r) => r.id === "backlog-non-vide")!.passed).toBe(
      false,
    );
  });
});

describe("runSpine — fail-closed handoff (brick 1)", () => {
  it("stops when the output violates the contract, gate passed beforehand", async () => {
    // WF-001 only checks the objective (gate pass), but omits `perimetre`
    // promised by its output → the handoff's producer-output fails.
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
    expect(res.traces[0]!.gate.verdict).toBe("pass"); // the gate had indeed let it through
  });
});

describe("runSpine — static preflight (design-time)", () => {
  it("rejects incompatible contracts BEFORE any runner call", async () => {
    // WF-001 does not promise `perimetre` that WF-002 requires as input.
    const badC1 = { output: { type: "object", required: ["objectif"], properties: { objectif: { type: "string" } } } } as const;
    const steps = [
      buildStep("WF-001", badC1, [objectifPresent]),
      buildStep("WF-002", c2, [backlogNonVide]),
    ];
    const spy = vi.fn(mockRunner(happyOutputs));
    await expect(runSpine(steps, spy)).rejects.toThrow(SpineConfigError);
    expect(spy).not.toHaveBeenCalled();
  });

  it("rejects a provenance.stepId ≠ contract.stepId mismatch", async () => {
    const step = buildStep("WF-001", c1, [objectifPresent]);
    step.provenance.stepId = "WF-999";
    await expect(runSpine([step], mockRunner(happyOutputs))).rejects.toThrow(
      SpineConfigError,
    );
  });
});
