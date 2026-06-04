/**
 * Types des eval gates (brique 2) — garde-fou qualité comportemental sur la
 * sortie d'une étape, AU-DELÀ de la conformité de schéma (brique 1).
 * Références : ADR-0004 (« eval gates comportementaux », propagation fail-closed)
 * et ISO/IEC 25010 (qualité du runtime).
 *
 * Choix assumé (POC) : critères DÉTERMINISTES (règles), pas de LLM-as-judge.
 * Reproductible, testable hermétiquement, auditable (posture ISO 19011). Le
 * juge-LLM reste une extension ultérieure (même interface `Criterion`), à
 * n'introduire que si une règle déterministe ne suffit pas (YAGNI).
 */

/** Gravité d'un critère : `blocking` fait échouer la gate ; `advisory` informe sans bloquer. */
export type Severity = "blocking" | "advisory";

/** Verdict global d'une gate. */
export type Verdict = "pass" | "fail";

/** Un critère d'évaluation : une règle nommée et son prédicat sur la sortie. */
export interface Criterion {
  id: string;
  description: string;
  severity: Severity;
  /** Prédicat déterministe : `true` = satisfait. Une exception = critère échoué (défensif). */
  check: (output: unknown) => boolean;
}

/** Résultat unitaire d'un critère évalué (trace d'audit). */
export interface CriterionResult {
  id: string;
  description: string;
  severity: Severity;
  passed: boolean;
}

/**
 * Rapport d'une gate — preuve d'audit (ISO 19011) : verdict + détail par critère.
 * Produit aussi bien en `pass` qu'en `fail`, pour la traçabilité.
 */
export interface GateReport {
  stepId: string;
  verdict: Verdict;
  results: CriterionResult[];
}
