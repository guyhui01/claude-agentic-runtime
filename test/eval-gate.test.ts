import { describe, it, expect } from "vitest";
import {
  runEvalGate,
  assertGatePassed,
  EvalGateError,
} from "../src/eval/eval-gate.js";
import type { Criterion } from "../src/eval/types.js";

/**
 * Fixture hermétique — DoD du livrable de cadrage WF-001 (exemple §2.2).
 * Critères déterministes de type Definition of Done MOA.
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
    description: "Un objectif non vide est défini",
    severity: "blocking",
    check: (o) => {
      const v = asRecord(o)["objectif"];
      return typeof v === "string" && v.trim().length > 0;
    },
  },
  {
    id: "perimetre-non-vide",
    description: "Le périmètre liste au moins un élément",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["perimetre"]),
  },
  {
    id: "parties-prenantes",
    description: "Au moins une partie prenante identifiée",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["partiesPrenantes"]),
  },
  {
    id: "criteres-succes-mesurables",
    description: "Des critères de succès sont fournis (recommandé)",
    severity: "advisory",
    check: (o) => nonEmptyArray(asRecord(o)["criteresSucces"]),
  },
];

const livrableConforme = {
  objectif: "Refondre le portail B2B",
  perimetre: ["auth", "catalogue"],
  partiesPrenantes: ["DSI", "Métier"],
  criteresSucces: ["NPS > 40"],
};

describe("runEvalGate — produit toujours une preuve", () => {
  it("verdict pass quand tous les critères bloquants sont satisfaits", () => {
    const report = runEvalGate("WF-001", cadrageDoD, livrableConforme);
    expect(report.verdict).toBe("pass");
    expect(report.results).toHaveLength(4);
    expect(report.results.every((r) => r.passed)).toBe(true);
  });

  it("un échec advisory ne fait PAS échouer la gate (verdict pass, trace conservée)", () => {
    const sansCriteres = { ...livrableConforme, criteresSucces: [] };
    const report = runEvalGate("WF-001", cadrageDoD, sansCriteres);
    expect(report.verdict).toBe("pass");
    const advisory = report.results.find(
      (r) => r.id === "criteres-succes-mesurables",
    );
    expect(advisory!.passed).toBe(false);
  });

  it("verdict fail dès qu'un critère bloquant échoue", () => {
    const incomplet = { objectif: "X", perimetre: [], partiesPrenantes: ["DSI"] };
    const report = runEvalGate("WF-001", cadrageDoD, incomplet);
    expect(report.verdict).toBe("fail");
    expect(
      report.results.find((r) => r.id === "perimetre-non-vide")!.passed,
    ).toBe(false);
  });

  it("défensif : un critère dont le check lève est compté comme échoué", () => {
    const explosif: Criterion[] = [
      {
        id: "boom",
        description: "lève une exception",
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

describe("assertGatePassed — application fail-closed", () => {
  it("ne lève pas sur un verdict pass", () => {
    const report = runEvalGate("WF-001", cadrageDoD, livrableConforme);
    expect(() => assertGatePassed(report)).not.toThrow();
  });

  it("lève EvalGateError sur un verdict fail, en portant le rapport", () => {
    const report = runEvalGate("WF-001", cadrageDoD, { objectif: "X" });
    expect(report.verdict).toBe("fail");
    expect(() => assertGatePassed(report)).toThrow(EvalGateError);
  });
});
