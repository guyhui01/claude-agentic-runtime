/**
 * Deterministic completeness check (brief contract §4) — fail-closed, runs
 * BEFORE any LLM call. A brief that fails is returned to the operator with
 * every failing field named (allErrors spirit: aggregate, don't stop at the
 * first problem).
 *
 * Sentinel policy note (identity-card dry run, finding 3): THIS gate rejects
 * negative sentinels in the operator-authored fields — the later per-param
 * check accepts card-sanctioned honest unknowns ("Not disclosed", "to be
 * defined"). Do not merge the two gates.
 *
 * Bounds are pinned to the BLOCKING FLOOR, not the advisory ideal (WF-005
 * lesson): the floor rejects an unqualified brief, never a modest-but-valid one.
 */

import { affirmativeString } from "../spines/spine-helpers.js";
import { validateBriefShape } from "./brief-schema.js";
import type {
  CompletenessIssue,
  CompletenessResult,
  NeedBrief,
} from "./types.js";

/** Blocking floor on `need` word count — indicative qualification minimum (contract §4.2). */
export const NEED_MIN_WORDS = 15;

/**
 * State markers a qualified `need` must carry — the "where does the client
 * stand" signal routing discriminates on. Derived from the arrow-shaped
 * sidecar descriptions of catalog v4.2.0 (each entry mirrors one or more
 * workflow preconditions); versioned here, extended when the catalog grows.
 * The check is presence-only: ANY marker qualifies — matching a marker does
 * NOT route (routing is the router's job, downstream).
 */
export const STATE_MARKER_PATTERNS: readonly RegExp[] = [
  /\b(client )?brief (was )?received\b|\bproduct idea\b|\b(management|leadership) approved\b/i, // WF-001
  /\bPI[- ]?\d+\b|\bPI planning\b|\bsprint\b|\bdelivery cadence\b|\bagile release train\b|\bART\b/i, // WF-002
  /\bvalidated (idea|prototype)\b|\bprototype validated\b|\bwants? it (built|developed)\b/i, // WF-003
  /\b(engagement|contract) (is )?signed\b|\bsigned with\b/i, // WF-004 / WF-007
  /\bweekly\b|\bmonthly (digest|synthesis)\b|\bmarket (signal|moves)\b|\bintelligence\b/i, // WF-005
  /\bRFP\b|\brequest for proposal\b|\bprospect\b|\bpre-?signature\b/i, // WF-006
  /\bstart(ing|s)? (on )?(monday|next week|D1)\b|\bonboarding\b|\bkickoff\b/i, // WF-007
  /\bin production\b|\bcompliance audit\b|\bAI Act\b|\bGDPR\b/i, // WF-008
  /\bhiring\b|\brecruit(ment|ing)?\b|\bjob description\b|\bposition to fill\b|\bneeds? a (senior |junior )?\w+ (engineer|developer|designer|scientist)\b/i, // WF-009
  /\bpost-?mortem\b|\blessons learned\b|\bincident\b|\bproject (closed|shipped|ended|delivered)\b|\bmonths? late\b/i, // WF-010
];

/** Deterministic escape hatch for an empty `constraints` array (contract §4.3). */
const UNCONSTRAINED_PATTERN =
  /\bunconstrained\b|\bno (specific |particular )?constraints?\b/i;

/** A role, never a name/address: no emails, no line breaks, affirmative substance. */
const ROLE_FORBIDDEN = /[@\n\r]/;

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function hasStateMarker(need: string): boolean {
  return STATE_MARKER_PATTERNS.some((p) => p.test(need));
}

/**
 * Runs the full deterministic completeness check on a raw (untrusted) brief.
 * Shape first (ajv); substance rules only on a shape-valid brief, so every
 * substance issue names a field that actually exists.
 */
export function checkCompleteness(raw: unknown): CompletenessResult {
  const shapeIssues = validateBriefShape(raw);
  if (shapeIssues.length > 0) {
    return { status: "REJECT_INCOMPLETE", issues: shapeIssues };
  }

  const brief = raw as NeedBrief;
  const issues: CompletenessIssue[] = [];

  for (const field of ["need", "context", "expectedDeliverable"] as const) {
    if (!affirmativeString(brief[field])) {
      issues.push({
        field,
        code: "NEGATIVE_SENTINEL",
        message: `"${field}" must be an affirmative statement, not empty or a negative sentinel (none/n-a/TBD/…)`,
      });
    }
  }

  if (countWords(brief.need) < NEED_MIN_WORDS) {
    issues.push({
      field: "need",
      code: "TOO_SHORT",
      message: `"need" carries ${countWords(brief.need)} word(s); the qualification floor is ${NEED_MIN_WORDS}`,
    });
  }

  if (!hasStateMarker(brief.need)) {
    issues.push({
      field: "need",
      code: "NO_STATE_MARKER",
      message:
        '"need" states no recognizable client state (e.g. "RFP received", "engagement signed") — qualify where the client stands before routing',
    });
  }

  if (brief.constraints.length === 0 && !UNCONSTRAINED_PATTERN.test(brief.context)) {
    issues.push({
      field: "constraints",
      code: "UNJUSTIFIED_EMPTY_CONSTRAINTS",
      message:
        'empty "constraints" is allowed only when "context" explicitly states the engagement is unconstrained',
    });
  }

  if (brief.submittedBy !== undefined) {
    if (!affirmativeString(brief.submittedBy) || ROLE_FORBIDDEN.test(brief.submittedBy)) {
      issues.push({
        field: "submittedBy",
        code: "NOT_A_ROLE",
        message: '"submittedBy" must be a plain role label (no email address, no name lines)',
      });
    }
  }

  if (issues.length > 0) return { status: "REJECT_INCOMPLETE", issues };
  return { status: "ok", brief };
}
