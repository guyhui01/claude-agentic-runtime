/**
 * Eval gate (brick 2) — runs deterministic criteria over a step's output
 * and produces an audit report.
 *
 * Explicit separation (consistent with ADR-0004: "automation verifies, the
 * human decides"):
 *   - runEvalGate()      : EVALUATES — never throws, always returns the evidence;
 *   - assertGatePassed() : ENFORCES — fail-closed, throws if the verdict is "fail".
 *
 * Verdict: "fail" as soon as ONE `blocking` criterion is not satisfied. Unsatisfied
 * `advisory` criteria are reported but do not change the verdict.
 */

import type {
  Criterion,
  CriterionResult,
  GateReport,
  Verdict,
} from "./types.js";

/** Fail-closed error carrying the full report (evidence of failed criteria). */
export class EvalGateError extends Error {
  readonly report: GateReport;

  constructor(report: GateReport) {
    const failed = report.results.filter(
      (r) => !r.passed && r.severity === "blocking",
    );
    const summary = failed.map((r) => r.id).join(", ");
    super(
      `Eval gate "${report.stepId}" failed (${failed.length} blocking criterion(s): ${summary})`,
    );
    this.name = "EvalGateError";
    this.report = report;
  }
}

/** Evaluates a criterion, isolating any exception (defensive: an exception = failure). */
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
 * EVALUATES a step's output against a list of criteria. Never throws:
 * always returns the report (audit evidence), verdict included.
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
 * ENFORCES the gate (fail-closed): throws if the verdict is "fail".
 * @throws {EvalGateError} if at least one blocking criterion failed.
 */
export function assertGatePassed(report: GateReport): void {
  if (report.verdict === "fail") throw new EvalGateError(report);
}
