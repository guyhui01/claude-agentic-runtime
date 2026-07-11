/**
 * Real spine — deterministic backbone of WF-004 "AI Consulting Engagement" (§2.4-B.4).
 *
 * Sourced from the real workflow `claude-agents/workflows/WF-004-mission-conseil-ia.md` (v1.1).
 * Backbone = the SEQUENTIAL chain of the 6 core agents (the VEILLE-STRATEGIQUE fork
 * STEP-02B and the JURIDIQUE-IA GDPR/AI-Act gateway STEP-06 are OPTIONAL, so outside
 * the backbone — mirrors the WF-003 rule for optional forks):
 *   STEP-01 (CONSULTANT-IA) → STEP-02 (FINANCIAL-ANALYST) → STEP-03 (CDO-DIRECTEUR-IA)
 *   → STEP-04 (CHANGE-MANAGER) → STEP-05 (FORMATEUR-IA) → STEP-07 (REDACTEUR-IA).
 *
 * ADR compliance identical to WF-001/002/003 (ADR-0007 runtime manifest, deterministic
 * ISO 19011 eval criteria on the UNCHANGED linear fail-closed orchestrator). Unlike
 * WF-008, this workflow carries NO fail-closed structural construct: STEP-01's
 * `condition_passage` ("diagnostic validated before the roadmap") is modeled as an
 * ordinary blocking eval gate, and the GDPR/AI-Act gateway is an OPTIONAL bypass, so
 * the spine is a linear twin of WF-003.
 *
 * Numeric DoD counts from the workflow ("Top 5 use cases", "4 training levels", the
 * three ADKAR populations, "10-15 slides") are split: a relaxed BLOCKING floor (a
 * meaningful deliverable must exist) plus an ADVISORY criterion at the exact spec
 * number (the full ideal). The JSON schema still communicates the ideal count to the
 * agent so its output aligns with both.
 *
 * `assetId` values expected as "agent" assets in the pinned catalog's sidecar.
 */

import type { SpineManifest } from "../manifest/types.js";
import type { Criterion } from "../eval/types.js";
import { CriterionRegistry } from "../eval/criteria-registry.js";
import {
  objSchema,
  arrOf,
  str,
  num,
  obj,
  arr,
  asRecord,
  nonEmptyArray,
  arrayLenBetween,
  minArrayLen,
  nonEmptyString,
  isNumber,
} from "./spine-helpers.js";

// --- Local predicates (traced DoD shapes) ------------------------------------

/** `true` if every listed key of `o` holds an array (SWOT / roadmap horizons). */
function allKeysAreArrays(o: unknown, keys: string[]): boolean {
  const r = asRecord(o);
  return keys.every((k) => Array.isArray(r[k]));
}

// =============================================================================
// CRITERIA — traced to WF-004 (v1.1)
// =============================================================================

/**
 * STEP-01 — CONSULTANT-IA.
 * DoD: overall AI maturity score (1-10) + per-dimension · AI SWOT · Top 5 use cases
 * (value/effort) · 3-5 key recommendations.
 * condition_passage: diagnostic validated before the roadmap → enforced as the
 * blocking completeness of this gate (a broken diagnostic halts before STEP-03).
 */
const STEP01_CRITERIA: Criterion[] = [
  {
    id: "consultant-maturity-score",
    description: "STEP-01: overall AI maturity score present and in range 1-10",
    severity: "blocking",
    check: (o) => {
      const v = asRecord(o)["maturityScore"];
      return isNumber(v) && v >= 1 && v <= 10;
    },
  },
  {
    id: "consultant-swot",
    description:
      "STEP-01: AI SWOT with the four axes (strengths/weaknesses/opportunities/risks)",
    severity: "blocking",
    check: (o) =>
      allKeysAreArrays(asRecord(o)["swot"], [
        "strengths",
        "weaknesses",
        "opportunities",
        "risks",
      ]),
  },
  {
    id: "consultant-usecases-floor",
    description: "STEP-01: prioritized AI use cases — ≥ 3 (floor)",
    severity: "blocking",
    check: (o) => minArrayLen(asRecord(o)["useCases"], 3),
  },
  {
    id: "consultant-usecases-top5",
    description: "STEP-01: the full « Top 5 » AI use cases (ideal ≥ 5)",
    severity: "advisory",
    check: (o) => minArrayLen(asRecord(o)["useCases"], 5),
  },
  {
    id: "consultant-recommendations",
    description: "STEP-01: 3-5 key priority recommendations",
    severity: "advisory",
    check: (o) => minArrayLen(asRecord(o)["recommendations"], 3),
  },
];

/**
 * STEP-02 — FINANCIAL-ANALYST.
 * DoD: business case per use case · financial prioritization · overall ROI summary ·
 * 3 financial scenarios (optimistic/realistic/conservative).
 */
const STEP02_CRITERIA: Criterion[] = [
  {
    id: "fa-business-cases",
    description: "STEP-02: business case per use case (non-empty)",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["businessCases"]),
  },
  {
    id: "fa-roi-summary",
    description: "STEP-02: overall transformation ROI summary present",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["roiSummary"]),
  },
  {
    id: "fa-prioritization",
    description: "STEP-02: financial prioritization of the recommendations (carried field)",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["prioritization"]),
  },
  {
    id: "fa-scenarios",
    description: "STEP-02: ≥ 3 financial scenarios (optimistic/realistic/conservative)",
    severity: "advisory",
    check: (o) => minArrayLen(asRecord(o)["scenarios"], 3),
  },
];

/**
 * STEP-03 — CDO-DIRECTEUR-IA.
 * DoD: 12-24 month roadmap (Now/Next/Later) · AI OKRs per period · governance
 * framework · talent plan.
 */
const STEP03_CRITERIA: Criterion[] = [
  {
    id: "cdo-roadmap-horizons",
    description: "STEP-03: 12-24 month roadmap with the three horizons (now/next/later)",
    severity: "blocking",
    check: (o) => allKeysAreArrays(asRecord(o)["roadmap"], ["now", "next", "later"]),
  },
  {
    id: "cdo-okrs",
    description: "STEP-03: AI OKRs per period (non-empty)",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["okrs"]),
  },
  {
    id: "cdo-governance",
    description: "STEP-03: AI governance framework (roles, bodies, processes)",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["governance"]),
  },
  {
    id: "cdo-talent",
    description: "STEP-03: talent recruitment / upskilling plan",
    severity: "advisory",
    check: (o) => nonEmptyString(asRecord(o)["talentPlan"]),
  },
];

/**
 * STEP-04 — CHANGE-MANAGER.
 * DoD: ADKAR assessment per population (executive committee/managers/operational) ·
 * 12-month communication plan · resistance strategy · adoption KPIs.
 */
const STEP04_CRITERIA: Criterion[] = [
  {
    id: "cm-adkar",
    description: "STEP-04: ADKAR assessment per population (non-empty)",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["adkarPlan"]),
  },
  {
    id: "cm-adkar-populations",
    description:
      "STEP-04: the three ADKAR populations covered (executive committee/managers/operational)",
    severity: "advisory",
    check: (o) => minArrayLen(asRecord(o)["adkarPlan"], 3),
  },
  {
    id: "cm-comms-plan",
    description: "STEP-04: 12-month communication plan present",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["commsPlan"]),
  },
  {
    id: "cm-resistance",
    description: "STEP-04: resistance management strategy present",
    severity: "advisory",
    check: (o) => nonEmptyString(asRecord(o)["resistanceStrategy"]),
  },
  {
    id: "cm-adoption-kpis",
    description: "STEP-04: adoption KPIs with measurable milestones present",
    severity: "advisory",
    check: (o) => Array.isArray(asRecord(o)["adoptionKpis"]),
  },
];

/**
 * STEP-05 — FORMATEUR-IA.
 * DoD: training catalog (tracks per profile, 4 levels) · recommended format ·
 * training quick wins (2-4 weeks) · acquired-skills evaluation plan.
 */
const STEP05_CRITERIA: Criterion[] = [
  {
    id: "form-catalog",
    description: "STEP-05: training catalog — tracks per profile (non-empty)",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["trainingCatalog"]),
  },
  {
    id: "form-4-levels",
    description: "STEP-05: the four training levels covered (ideal ≥ 4)",
    severity: "advisory",
    check: (o) => minArrayLen(asRecord(o)["trainingCatalog"], 4),
  },
  {
    id: "form-quick-wins",
    description: "STEP-05: training quick wins (2-4 weeks) present",
    severity: "advisory",
    check: (o) => Array.isArray(asRecord(o)["quickWins"]),
  },
  {
    id: "form-eval-plan",
    description: "STEP-05: acquired-skills evaluation plan present",
    severity: "advisory",
    check: (o) => nonEmptyString(asRecord(o)["evalPlan"]),
  },
];

/**
 * STEP-07 — REDACTEUR-IA.
 * DoD: executive summary (1 page) · full consulting report (15-30 pages) ·
 * executive-committee presentation (10-15 slides).
 */
const STEP07_CRITERIA: Criterion[] = [
  {
    id: "red-exec-summary",
    description: "STEP-07: executive summary (1 page) present",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["execSummary"]),
  },
  {
    id: "red-full-report",
    description: "STEP-07: full consulting report (15-30 pages) present",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["fullReport"]),
  },
  {
    id: "red-comex-deck",
    description: "STEP-07: executive-committee presentation deck (non-empty)",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["comexDeck"]),
  },
  {
    id: "red-deck-10-15",
    description: "STEP-07: the deck holds 10 to 15 slides",
    severity: "advisory",
    check: (o) => arrayLenBetween(asRecord(o)["comexDeck"], 10, 15),
  },
];

/** All criteria of the WF-004 spine (backbone order). */
export const WF_004_CONSEIL_CRITERIA: Criterion[] = [
  ...STEP01_CRITERIA,
  ...STEP02_CRITERIA,
  ...STEP03_CRITERIA,
  ...STEP04_CRITERIA,
  ...STEP05_CRITERIA,
  ...STEP07_CRITERIA,
];

/** Builds a fresh registry populated with the WF-004 spine criteria. */
export function buildWf004ConseilRegistry(): CriterionRegistry {
  return new CriterionRegistry().registerAll(WF_004_CONSEIL_CRITERIA);
}

// =============================================================================
// MANIFEST — WF-004 backbone (I/O contracts + criteria references by id)
// =============================================================================

/**
 * Contracts designed for a linear fail-closed handoff: each output promises the
 * field required by the immediate downstream input (WF-003 idiom — a single
 * carried field per hop): useCases → prioritization → roadmap → adkarPlan →
 * trainingCatalog. REDACTEUR (STEP-07) receives the immediate upstream field and
 * synthesizes all prior deliverables from its prose (WF-003 precedent, where
 * SECURITE-IA received only `pipeline`).
 */
export const WF_004_CONSEIL_MANIFEST: SpineManifest = {
  spineId: "WF-004-conseil-backbone",
  steps: [
    {
      stepId: "STEP-01",
      assetId: "AGENT-CONSULTANT-IA",
      // seed: engagement context = runSpine's initial input.
      output: objSchema(["maturityScore", "swot", "useCases"], {
        maturityScore: {
          type: "number",
          description: "Overall AI maturity score (1-10). 1 ≤ score ≤ 10 required.",
        },
        // Blocking consultant-swot: the four axes must be arrays.
        swot: objSchema(["strengths", "weaknesses", "opportunities", "risks"], {
          strengths: arr,
          weaknesses: arr,
          opportunities: arr,
          risks: arr,
        }),
        // Blocking floor ≥ 3; the schema communicates the « Top 5 » ideal (advisory).
        useCases: arrOf(
          objSchema([], {
            name: { type: "string", description: "AI use case." },
            value: { type: "string", description: "Business value (e.g. High/Medium/Low)." },
            effort: { type: "string", description: "Implementation effort." },
          }),
          { min: 5 },
        ),
        // Advisory nudge consultant-recommendations (3-5 actions).
        recommendations: arrOf(undefined, { min: 3 }),
      }),
      criteriaIds: STEP01_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-02",
      assetId: "AGENT-FINANCIAL-ANALYST",
      input: objSchema(["useCases"], { useCases: arr }),
      output: objSchema(["businessCases", "roiSummary", "prioritization"], {
        businessCases: arrOf(
          objSchema([], {
            useCase: { type: "string", description: "Use case addressed." },
            investment: { type: "number", description: "Investment amount." },
            gain: { type: "number", description: "Expected gain." },
            roi: { type: "string", description: "ROI (e.g. 2.3x)." },
            payback: { type: "string", description: "Payback horizon." },
          }),
          { min: 1 },
        ),
        roiSummary: { type: "string", description: "Overall transformation ROI summary table." },
        // Blocking fa-prioritization: carried field for STEP-03.
        prioritization: arrOf(undefined, { min: 1 }),
        // Advisory nudge fa-scenarios (≥ 3 scenarios).
        scenarios: arrOf(undefined, { min: 3 }),
      }),
      criteriaIds: STEP02_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-03",
      assetId: "AGENT-CDO-DIRECTEUR-IA",
      input: objSchema(["prioritization"], { prioritization: arr }),
      output: objSchema(["roadmap", "okrs", "governance"], {
        // Blocking cdo-roadmap-horizons: the three horizons must be arrays.
        roadmap: objSchema(["now", "next", "later"], {
          now: arr,
          next: arr,
          later: arr,
        }),
        okrs: arrOf(undefined, { min: 1 }),
        governance: { type: "string", description: "AI governance framework (roles, bodies, processes)." },
        // Advisory nudge cdo-talent.
        talentPlan: { type: "string", description: "Talent recruitment / upskilling plan." },
      }),
      criteriaIds: STEP03_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-04",
      assetId: "AGENT-CHANGE-MANAGER",
      input: objSchema(["roadmap"], { roadmap: obj }),
      output: objSchema(["adkarPlan", "commsPlan"], {
        // Blocking cm-adkar; the schema communicates the 3-population ideal (advisory).
        adkarPlan: arrOf(
          objSchema([], {
            population: { type: "string", description: "executive committee | managers | operational" },
            awareness: { type: "string" },
            desire: { type: "string" },
            knowledge: { type: "string" },
            ability: { type: "string" },
            reinforcement: { type: "string" },
          }),
          { min: 3 },
        ),
        commsPlan: { type: "string", description: "12-month communication plan." },
        // Advisory nudges cm-resistance / cm-adoption-kpis.
        resistanceStrategy: { type: "string", description: "Resistance management strategy." },
        adoptionKpis: { type: "array", description: "Adoption KPIs with measurable milestones." },
      }),
      criteriaIds: STEP04_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-05",
      assetId: "AGENT-FORMATEUR-IA",
      input: objSchema(["adkarPlan"], { adkarPlan: arr }),
      output: objSchema(["trainingCatalog"], {
        // Blocking form-catalog; the schema communicates the 4-level ideal (advisory).
        trainingCatalog: arrOf(
          objSchema([], {
            profile: { type: "string", description: "executive committee | managers | users | tech" },
            level: { type: "string", description: "Training level (1 of 4)." },
            format: { type: "string", description: "in-person | e-learning | workshop" },
          }),
          { min: 4 },
        ),
        // Advisory nudges form-quick-wins / form-eval-plan.
        quickWins: { type: "array", description: "Training quick wins (2-4 weeks)." },
        evalPlan: { type: "string", description: "Acquired-skills evaluation plan." },
      }),
      criteriaIds: STEP05_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-07",
      assetId: "AGENT-REDACTEUR-IA",
      input: objSchema(["trainingCatalog"], { trainingCatalog: arr }),
      output: objSchema(["execSummary", "fullReport", "comexDeck"], {
        execSummary: { type: "string", description: "Executive summary (1 page): context/stakes/recommendations/ROI." },
        fullReport: { type: "string", description: "Full consulting report (15-30 pages)." },
        // Blocking red-comex-deck; the schema communicates the 10-15 slide range (advisory).
        comexDeck: arrOf(
          objSchema([], {
            title: { type: "string", description: "Slide title." },
          }),
          { min: 10, max: 15 },
        ),
      }),
      criteriaIds: STEP07_CRITERIA.map((c) => c.id),
    },
  ],
};
