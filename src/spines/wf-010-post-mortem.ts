/**
 * Real spine — deterministic backbone of WF-010 "Project Post-mortem / Lessons
 * Learned" (§2.4-B.4).
 *
 * Sourced from the real workflow `claude-agents/workflows/WF-010-post-mortem-projet.md`
 * (v1.0). Backbone = the SEQUENTIAL chain of the 4 core agents. The source BPMN has a
 * PARALLEL FORK (STEP-02 QA-AGILE ∥ STEP-03 CHANGE-MANAGER ∥ optional STEP-04) then a
 * JOIN; it is LINEARIZED here (STEP-02 → STEP-03) on the unchanged linear orchestrator
 * — the WF-003 precedent. All the "if required" branches are OPTIONAL, so outside the
 * backbone: STEP-04 (CONSULTANT-IA ROI), STEP-05 (SECURITE-IA incident), and — unlike
 * WF-008 where the counter-review gate is MANDATORY in the backbone — the AUDIT-METHODO-IA
 * counter-review here (STEP-05B) is OPTIONAL (only for high-stakes/disputed post-mortems),
 * so it stays outside the backbone too:
 *   STEP-01 (CHEF-PROJET-IA) → STEP-02 (QA-AGILE) → STEP-03 (CHANGE-MANAGER)
 *   → STEP-06 (REDACTEUR-IA).
 *
 * ADR compliance identical to WF-001..007 (ADR-0007 runtime manifest, deterministic
 * eval criteria on the UNCHANGED linear fail-closed orchestrator). Like WF-004/005/007,
 * NO fail-closed structural construct: STEP-01 opens as an ordinary blocking eval gate,
 * every gateway is an OPTIONAL bypass, so the spine is a linear twin of WF-004. Same
 * `Management & Consulting` domain as WF-004/005/006/007 — it adds a backbone, not a new
 * domain, and is the TENTH (last) workflow to receive a spine.
 *
 * Numeric DoD counts ("5 Whys on the 3 main problems", "5-10 improvement actions") are
 * split: a relaxed BLOCKING floor + an ADVISORY criterion at the exact spec number.
 * **Live-run hardening (WF-005 lesson):** the output JSON schema is ajv-strict-validated
 * at the handoff, so its numeric bounds are pinned to the BLOCKING FLOOR (no `maxItems`,
 * no `minItems` on optional fields); the ideal is carried by advisory criteria +
 * descriptions.
 *
 * `assetId` values expected as "agent" assets in the pinned catalog's sidecar.
 */

import type { SpineManifest } from "../manifest/types.js";
import type { Criterion } from "../eval/types.js";
import { CriterionRegistry } from "../eval/criteria-registry.js";
import {
  objSchema,
  arrOf,
  arr,
  str,
  asRecord,
  nonEmptyArray,
  minArrayLen,
  nonEmptyString,
} from "./spine-helpers.js";

// =============================================================================
// CRITERIA — traced to WF-010 (v1.0)
// =============================================================================

/**
 * STEP-01 — CHEF-PROJET-IA.
 * DoD: annotated project timeline · planned vs actual gaps · root-cause analysis
 * (5 Whys on the 3 main problems) · what worked well · prioritized improvement plan
 * (5-10 actions).
 */
const STEP01_CRITERIA: Criterion[] = [
  {
    id: "cp-timeline",
    description: "STEP-01: annotated project timeline (milestones, slippages) — non-empty",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["timeline"]),
  },
  {
    id: "cp-gaps",
    description: "STEP-01: planned vs actual gaps (schedule/budget/scope/quality) — non-empty",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["gaps"]),
  },
  {
    id: "cp-root-causes",
    description: "STEP-01: root-cause analysis (5 Whys) — non-empty",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["rootCauses"]),
  },
  {
    id: "cp-root-causes-3",
    description: "STEP-01: 5 Whys on the three main problems (ideal ≥ 3)",
    severity: "advisory",
    check: (o) => minArrayLen(asRecord(o)["rootCauses"], 3),
  },
  {
    id: "cp-improvement-plan",
    description: "STEP-01: prioritized improvement plan — non-empty",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["improvementPlan"]),
  },
  {
    id: "cp-improvement-plan-5",
    description: "STEP-01: the full improvement plan (ideal 5-10 concrete actions)",
    severity: "advisory",
    check: (o) => minArrayLen(asRecord(o)["improvementPlan"], 5),
  },
  {
    id: "cp-what-worked",
    description: "STEP-01: what worked well (to replicate)",
    severity: "advisory",
    check: (o) => nonEmptyArray(asRecord(o)["whatWorkedWell"]),
  },
];

/**
 * STEP-02 — QA-AGILE.
 * DoD: deliverables quality review · test-coverage analysis · top 5 critical bugs +
 * origin · technical-debt estimate · QA process recommendations.
 */
const STEP02_CRITERIA: Criterion[] = [
  {
    id: "qa-quality-review",
    description: "STEP-02: deliverables quality review (functional vs technical) present",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["qualityReview"]),
  },
  {
    id: "qa-test-coverage",
    description: "STEP-02: test-coverage analysis (unit/integration/E2E) present",
    severity: "advisory",
    check: (o) => nonEmptyString(asRecord(o)["testCoverage"]),
  },
  {
    id: "qa-top-bugs",
    description: "STEP-02: top critical bugs and their origin",
    severity: "advisory",
    check: (o) => nonEmptyArray(asRecord(o)["topBugs"]),
  },
  {
    id: "qa-tech-debt",
    description: "STEP-02: estimate of technical debt left behind",
    severity: "advisory",
    check: (o) => nonEmptyString(asRecord(o)["techDebt"]),
  },
  {
    id: "qa-recommendations",
    description: "STEP-02: QA process recommendations for the next project",
    severity: "advisory",
    check: (o) => nonEmptyArray(asRecord(o)["qaRecommendations"]),
  },
];

/**
 * STEP-03 — CHANGE-MANAGER.
 * DoD: team dynamics review · user adoption analysis · friction points · HR/org
 * recommendations · recognition of individual contributions.
 */
const STEP03_CRITERIA: Criterion[] = [
  {
    id: "cm-team-review",
    description: "STEP-03: team dynamics review (cohesion/communication/leadership) present",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["teamReview"]),
  },
  {
    id: "cm-hr-recommendations",
    description: "STEP-03: HR and organizational recommendations — non-empty",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["hrRecommendations"]),
  },
  {
    id: "cm-adoption",
    description: "STEP-03: user adoption analysis (rate, resistance, champions)",
    severity: "advisory",
    check: (o) => nonEmptyString(asRecord(o)["adoption"]),
  },
  {
    id: "cm-friction",
    description: "STEP-03: friction points between teams or with the client",
    severity: "advisory",
    check: (o) => nonEmptyArray(asRecord(o)["frictionPoints"]),
  },
];

/**
 * STEP-06 — REDACTEUR-IA.
 * DoD: complete lessons-learned report (10-20 pages) · 1-page executive summary ·
 * capitalization memo (top 5 best practices + top 5 pitfalls) · optional deck.
 */
const STEP06_CRITERIA: Criterion[] = [
  {
    id: "red-report",
    description: "STEP-06: complete lessons-learned report present",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["lessonsReport"]),
  },
  {
    id: "red-exec-summary",
    description: "STEP-06: 1-page executive summary present",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["execSummary"]),
  },
  {
    id: "red-capitalization",
    description: "STEP-06: capitalization memo (best practices + pitfalls) present",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["capitalizationMemo"]),
  },
  {
    id: "red-best-practices",
    description: "STEP-06: top best practices to replicate (ideal 5)",
    severity: "advisory",
    check: (o) => nonEmptyArray(asRecord(o)["bestPractices"]),
  },
  {
    id: "red-pitfalls",
    description: "STEP-06: top pitfalls to avoid (ideal 5)",
    severity: "advisory",
    check: (o) => nonEmptyArray(asRecord(o)["pitfalls"]),
  },
];

/** All criteria of the WF-010 spine (backbone order). */
export const WF_010_POST_MORTEM_CRITERIA: Criterion[] = [
  ...STEP01_CRITERIA,
  ...STEP02_CRITERIA,
  ...STEP03_CRITERIA,
  ...STEP06_CRITERIA,
];

/** Builds a fresh registry populated with the WF-010 spine criteria. */
export function buildWf010PostMortemRegistry(): CriterionRegistry {
  return new CriterionRegistry().registerAll(WF_010_POST_MORTEM_CRITERIA);
}

// =============================================================================
// MANIFEST — WF-010 backbone (I/O contracts + criteria references by id)
// =============================================================================

/**
 * Contracts designed for a linear fail-closed handoff: each output promises the field
 * required by the immediate downstream input (WF-004 idiom — a single carried field
 * per hop): improvementPlan → qualityReview → teamReview. REDACTEUR (STEP-06) receives
 * the team review and synthesizes all prior deliverables from its prose (WF-004
 * precedent). Output-schema numeric bounds pinned to the BLOCKING FLOOR (WF-005 live-run
 * hardening): `minItems` = floor only, no `maxItems`, no `minItems` on optional fields;
 * the ideal counts stay advisory.
 */
export const WF_010_POST_MORTEM_MANIFEST: SpineManifest = {
  spineId: "WF-010-post-mortem-backbone",
  steps: [
    {
      stepId: "STEP-01",
      assetId: "AGENT-CHEF-PROJET-IA",
      // seed: post-mortem context = runSpine's initial input.
      output: objSchema(["timeline", "gaps", "rootCauses", "improvementPlan"], {
        timeline: arrOf(
          objSchema([], {
            milestone: { type: "string", description: "Key milestone / event." },
            note: { type: "string", description: "Annotation: slippage, correction, etc." },
          }),
          { min: 1 },
        ),
        gaps: arrOf(undefined, { min: 1 }),
        // Blocking floor (non-empty); the "5 Whys × 3 problems" ideal is advisory.
        rootCauses: arrOf(
          objSchema([], {
            problem: { type: "string", description: "One of the main problems." },
            fiveWhys: { type: "array", description: "The 5 Whys chain for this problem." },
          }),
          { min: 1 },
        ),
        // Blocking floor (non-empty); the 5-10 ideal is advisory. Carried to STEP-02.
        improvementPlan: arrOf(
          objSchema([], {
            action: { type: "string", description: "Concrete improvement action." },
            priority: { type: "string", description: "Priority (High/Medium/Low)." },
          }),
          { min: 1 },
        ),
        // Advisory nudge cp-what-worked.
        whatWorkedWell: { type: "array", description: "What worked well, to replicate." },
      }),
      criteriaIds: STEP01_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-02",
      assetId: "AGENT-QA-AGILE",
      input: objSchema(["improvementPlan"], { improvementPlan: arr }),
      output: objSchema(["qualityReview"], {
        // Blocking qa-quality-review: carried field for STEP-03.
        qualityReview: {
          type: "string",
          description: "Deliverables quality review (functional vs technical).",
        },
        // Advisory nudges qa-test-coverage / qa-top-bugs / qa-tech-debt / qa-recommendations.
        testCoverage: { type: "string", description: "Test-coverage analysis (unit/integration/E2E)." },
        topBugs: { type: "array", description: "Top critical bugs and their origin." },
        techDebt: { type: "string", description: "Estimate of technical debt left behind." },
        qaRecommendations: { type: "array", description: "QA process recommendations for next project." },
      }),
      criteriaIds: STEP02_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-03",
      assetId: "AGENT-CHANGE-MANAGER",
      input: objSchema(["qualityReview"], { qualityReview: str }),
      output: objSchema(["teamReview", "hrRecommendations"], {
        // Blocking cm-team-review: carried field for STEP-06.
        teamReview: {
          type: "string",
          description: "Team dynamics review (cohesion, communication, leadership).",
        },
        // Blocking cm-hr-recommendations (non-empty).
        hrRecommendations: arrOf(undefined, { min: 1 }),
        // Advisory nudges cm-adoption / cm-friction.
        adoption: { type: "string", description: "User adoption analysis (rate, resistance, champions)." },
        frictionPoints: { type: "array", description: "Friction points between teams or with the client." },
      }),
      criteriaIds: STEP03_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-06",
      assetId: "AGENT-REDACTEUR-IA",
      input: objSchema(["teamReview"], { teamReview: str }),
      output: objSchema(["lessonsReport", "execSummary", "capitalizationMemo"], {
        lessonsReport: {
          type: "string",
          description: "Complete lessons-learned report (timeline, analysis, review, plan).",
        },
        execSummary: { type: "string", description: "1-page executive summary (facts + lessons + actions)." },
        capitalizationMemo: {
          type: "string",
          description: "Capitalization memo: best practices + pitfalls to avoid.",
        },
        // Advisory nudges red-best-practices / red-pitfalls (ideal top 5 each).
        bestPractices: { type: "array", description: "Top best practices to replicate (ideal 5)." },
        pitfalls: { type: "array", description: "Top pitfalls to avoid (ideal 5)." },
      }),
      criteriaIds: STEP06_CRITERIA.map((c) => c.id),
    },
  ],
};
