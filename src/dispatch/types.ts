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

// --- Routing (contract §5, router draft §2-§4) -------------------------------

/** Strict JSON the router LLM must return (router draft §2). */
export interface RouterOutput {
  /** A workflow id from the injected catalog table, or "NO_MATCH". */
  proposedRoute: string;
  /** Advisory for the human gate — displayed, never parsed for decisions (ADR-0007). */
  rationale: string;
  /** Optional nearest miss named on NO_MATCH. Advisory only. */
  nearestMiss: string | null;
}

/** One problem with the router's output (fail-closed reporting). */
export interface RouteIssue {
  code: "MALFORMED_OUTPUT" | "UNKNOWN_WORKFLOW" | "UNRESOLVABLE_DEPENDENCY";
  message: string;
}

/**
 * Outcome of the deterministic route validation. NO_MATCH and PARAMS_MISSING
 * are valid, successful outcomes (returned-for-rework applied to intake) —
 * only REJECT_ROUTER_OUTPUT marks a proposal the pipeline refuses to trust.
 */
export type RouteDecision =
  | { status: "REJECT_ROUTER_OUTPUT"; issues: RouteIssue[] }
  | { status: "NO_MATCH"; rationale: string; nearestMiss?: string }
  | { status: "PARAMS_MISSING"; route: string; missingParams: string[] }
  | {
      status: "ROUTED";
      route: string;
      rationale: string;
      /**
       * `true` when a param manifest existed and was satisfied. `false` when no
       * manifest covers the route yet (V0 ships WF-001 only) — surfaced honestly
       * to the human go/no-go, never silently equated with a checked route.
       */
      paramsChecked: boolean;
    };

/** One identity-card parameter of a workflow (dry-run findings 2-3). */
export interface ParamSpec {
  name: string;
  /** Label of the parameter on the catalog card (provenance). */
  card: string;
  required: boolean;
  /** Deterministic accessor: the brief text this parameter is filled from. */
  mapping: (brief: NeedBrief) => string;
  /** Deterministic fill detector on the mapped text. Absent = affirmative substance suffices. */
  pattern?: RegExp;
  /** Card-sanctioned honest unknown ("Not disclosed", "to be defined") — accepted as filled. */
  sanctionedUnknown?: RegExp;
  /** Operator-profile default: the parameter is never missing. */
  defaultValue?: string;
}

/** Versioned per-workflow parameter manifest, pinned to the catalog tag. */
export interface ParamManifest {
  workflow: string;
  /** Must match the sidecar's pinned tag — drift is a hard failure (real-sidecar test). */
  catalogTag: string;
  params: ParamSpec[];
}
