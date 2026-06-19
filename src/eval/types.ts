/**
 * Eval gate types (brick 2) — behavioral quality guardrail on a step's
 * output, BEYOND schema conformance (brick 1).
 * References: ADR-0004 ("behavioral eval gates", fail-closed propagation)
 * and ISO/IEC 25010 (runtime quality).
 *
 * Deliberate choice (POC): DETERMINISTIC criteria (rules), no LLM-as-judge.
 * Reproducible, hermetically testable, auditable (ISO 19011 stance). The
 * LLM judge stays a later extension (same `Criterion` interface), to be
 * introduced only if a deterministic rule is not enough (YAGNI).
 */

/** Criterion severity: `blocking` fails the gate; `advisory` informs without blocking. */
export type Severity = "blocking" | "advisory";

/** Overall verdict of a gate. */
export type Verdict = "pass" | "fail";

/** An evaluation criterion: a named rule and its predicate over the output. */
export interface Criterion {
  id: string;
  description: string;
  severity: Severity;
  /** Deterministic predicate: `true` = satisfied. An exception = failed criterion (defensive). */
  check: (output: unknown) => boolean;
}

/** Unit result of an evaluated criterion (audit trace). */
export interface CriterionResult {
  id: string;
  description: string;
  severity: Severity;
  passed: boolean;
}

/**
 * Gate report — audit evidence (ISO 19011): verdict + per-criterion detail.
 * Produced both on `pass` and on `fail`, for traceability.
 */
export interface GateReport {
  stepId: string;
  verdict: Verdict;
  results: CriterionResult[];
}
