/**
 * WF-000 dispatch types — intake → routing → delivery on top of the frozen
 * spines (docs/discovery/wf-000-dispatch-brief-contract.md).
 *
 * The router input is a VALIDATED need brief authored by the accountable
 * operator, never a raw stakeholder prompt (locked decision (a) of the
 * discovery). The contract carries no operator-specific assumption
 * ("closed profile, open contract").
 */

/** Validated need brief — contract §3. */
export interface NeedBrief {
  /**
   * The validated need, in the operator's words after stakeholder
   * qualification. Must state the client's CURRENT STATE (e.g. "RFP
   * received", "engagement signed") — the primary routing signal.
   */
  need: string;
  /** Business domain of the need. Free text in V0; checked at routing, not intake. */
  domain: string;
  /** What the stakeholder walks away with. */
  expectedDeliverable: string;
  /** Budget/deadline/regulatory/tooling constraints. Empty only if `context` says why. */
  constraints: string[];
  /** Client context filling the workflow identity-card parameters. Fictional in traces. */
  context: string;
  /** Role of the upstream stakeholder — a role, never a name (minimization). Advisory: routing must be invariant to it (role ⊥ route). */
  submittedBy?: string;
}

/** One completeness problem, with the failing field named (fail-closed reporting). */
export interface CompletenessIssue {
  field: string;
  code:
    | "SCHEMA"
    | "NEGATIVE_SENTINEL"
    | "TOO_SHORT"
    | "NO_STATE_MARKER"
    | "UNJUSTIFIED_EMPTY_CONSTRAINTS"
    | "NOT_A_ROLE";
  message: string;
}

/**
 * Outcome of the deterministic completeness check (contract §4). A rejection
 * is a VALID pipeline outcome (returned to the operator with the failing
 * fields named), not an internal error — hence a typed result, not a throw.
 */
export type CompletenessResult =
  | { status: "ok"; brief: NeedBrief }
  | { status: "REJECT_INCOMPLETE"; issues: CompletenessIssue[] };
