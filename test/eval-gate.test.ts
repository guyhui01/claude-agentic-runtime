import { describe, it, expect } from "vitest";
import {
  runEvalGate,
  assertGatePassed,
  EvalGateError,
} from "../src/eval/eval-gate.js";
import type { Criterion } from "../src/eval/types.js";

/**
 * Hermetic fixture — DoD for the WF-001 scoping deliverable (example §2.2).
 * Deterministic Definition-of-Done (business-ownership) criteria.
 */
function asRecord(o: unknown): Record<string, unknown> {
  return (o ?? {}) as Record<string, unknown>;
}
function nonEmptyArray(v: unknown): boolean {
  return Array.isArray(v) && v.length > 0;
}

const cadrageDoD: Criterion[] = [
  {
    id: "objectif-present",
    description: "A non-empty objective is defined",
    severity: "blocking",
    check: (o) => {
      const v = asRecord(o)["objectif"];
      return typeof v === "string" && v.trim().length > 0;
    },
  },
  {
    id: "perimetre-non-vide",
    description: "The scope lists at least one item",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["perimetre"]),
  },
  {
    id: "parties-prenantes",
    description: "At least one stakeholder identified",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["partiesPrenantes"]),
  },
  {
    id: "criteres-succes-mesurables",
    description: "Success criteria are provided (recommended)",
    severity: "advisory",
    check: (o) => nonEmptyArray(asRecord(o)["criteresSucces"]),
  },
];

const livrableConforme = {
  objectif: "Rebuild the B2B portal",
  perimetre: ["auth", "catalogue"],
  partiesPrenantes: ["IT", "Business"],
  criteresSucces: ["NPS > 40"],
};

describe("runEvalGate — always produces evidence", () => {
  it("pass verdict when all blocking criteria are satisfied", () => {
    const report = runEvalGate("WF-001", cadrageDoD, livrableConforme);
    expect(report.verdict).toBe("pass");
    expect(report.results).toHaveLength(4);
    expect(report.results.every((r) => r.passed)).toBe(true);
  });

  it("an advisory failure does NOT fail the gate (pass verdict, trace kept)", () => {
    const sansCriteres = { ...livrableConforme, criteresSucces: [] };
    const report = runEvalGate("WF-001", cadrageDoD, sansCriteres);
    expect(report.verdict).toBe("pass");
    const advisory = report.results.find(
      (r) => r.id === "criteres-succes-mesurables",
    );
    expect(advisory!.passed).toBe(false);
  });

  it("fail verdict as soon as a blocking criterion fails", () => {
    const incomplet = { objectif: "X", perimetre: [], partiesPrenantes: ["IT"] };
    const report = runEvalGate("WF-001", cadrageDoD, incomplet);
    expect(report.verdict).toBe("fail");
    expect(
      report.results.find((r) => r.id === "perimetre-non-vide")!.passed,
    ).toBe(false);
  });

  it("defensive: a criterion whose check throws is counted as failed", () => {
    const explosif: Criterion[] = [
      {
        id: "boom",
        description: "throws an exception",
        severity: "blocking",
        check: () => {
          throw new Error("boom");
        },
      },
    ];
    const report = runEvalGate("WF-001", explosif, livrableConforme);
    expect(report.verdict).toBe("fail");
    expect(report.results[0]!.passed).toBe(false);
  });
});

describe("assertGatePassed — fail-closed enforcement", () => {
  it("does not throw on a pass verdict", () => {
    const report = runEvalGate("WF-001", cadrageDoD, livrableConforme);
    expect(() => assertGatePassed(report)).not.toThrow();
  });

  it("throws EvalGateError on a fail verdict, carrying the report", () => {
    const report = runEvalGate("WF-001", cadrageDoD, { objectif: "X" });
    expect(report.verdict).toBe("fail");
    expect(() => assertGatePassed(report)).toThrow(EvalGateError);
  });
});
