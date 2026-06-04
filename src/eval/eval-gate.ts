/**
 * Eval gate (brique 2) — exécute des critères déterministes sur la sortie d'une
 * étape et en produit un rapport d'audit.
 *
 * Séparation explicite (cohérent ADR-0004 : « l'automatisation vérifie, l'humain
 * décide ») :
 *   - runEvalGate()      : ÉVALUE — ne lève jamais, retourne toujours la preuve ;
 *   - assertGatePassed() : APPLIQUE — fail-closed, lève si le verdict est "fail".
 *
 * Verdict : "fail" dès qu'UN critère `blocking` n'est pas satisfait. Les critères
 * `advisory` non satisfaits sont rapportés mais ne changent pas le verdict.
 */

import type {
  Criterion,
  CriterionResult,
  GateReport,
  Verdict,
} from "./types.js";

/** Erreur fail-closed portant le rapport complet (preuve des critères échoués). */
export class EvalGateError extends Error {
  readonly report: GateReport;

  constructor(report: GateReport) {
    const failed = report.results.filter(
      (r) => !r.passed && r.severity === "blocking",
    );
    const summary = failed.map((r) => r.id).join(", ");
    super(
      `Eval gate "${report.stepId}" échouée (${failed.length} critère(s) bloquant(s) : ${summary})`,
    );
    this.name = "EvalGateError";
    this.report = report;
  }
}

/** Évalue un critère en isolant toute exception (défensif : une exception = échec). */
function evaluate(criterion: Criterion, output: unknown): CriterionResult {
  let passed: boolean;
  try {
    passed = criterion.check(output) === true;
  } catch {
    passed = false;
  }
  return {
    id: criterion.id,
    description: criterion.description,
    severity: criterion.severity,
    passed,
  };
}

/**
 * ÉVALUE la sortie d'une étape contre une liste de critères. Ne lève jamais :
 * retourne toujours le rapport (preuve d'audit), verdict inclus.
 */
export function runEvalGate(
  stepId: string,
  criteria: Criterion[],
  output: unknown,
): GateReport {
  const results = criteria.map((c) => evaluate(c, output));
  const verdict: Verdict = results.some(
    (r) => r.severity === "blocking" && !r.passed,
  )
    ? "fail"
    : "pass";
  return { stepId, verdict, results };
}

/**
 * APPLIQUE la gate (fail-closed) : lève si le verdict est "fail".
 * @throws {EvalGateError} si au moins un critère bloquant a échoué.
 */
export function assertGatePassed(report: GateReport): void {
  if (report.verdict === "fail") throw new EvalGateError(report);
}
