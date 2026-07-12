/**
 * Real spine — deterministic backbone of WF-009 "IT/AI Recruitment" (§2.4-B.4).
 *
 * Sourced from the real workflow `claude-agents/workflows/WF-009-recrutement-it-ia.md`
 * (v1.0). Backbone = the SEQUENTIAL chain of the 4 core agents (the FINANCIAL-ANALYST
 * hire-vs-freelance TCO fork STEP-02B and the CHANGE-MANAGER onboarding branch are
 * OPTIONAL, so outside the backbone — mirrors the WF-003/004 rule for optional forks):
 *   STEP-01 (BUSINESS-ANALYST) → STEP-02A (CONSULTANT-IA) → STEP-03 (REDACTEUR-IA)
 *   → STEP-04 (RH-IA) → STEP-05 (RH-IA + CONSULTANT-IA) → STEP-06 (RH-IA + REDACTEUR-IA).
 *
 * Opens the FIFTH live-provable domain, HR & Talent (untouched by WF-001/002 Agile &
 * Product, WF-003 Dev & Engineering, WF-004/006 Management & Consulting, WF-008
 * Compliance & Governance). Structurally a LINEAR TWIN of WF-004: no fail-closed
 * STRUCTURAL construct in the orchestrator.
 *
 * ⚠️ The two BPMN gateways of the workflow — <shortlist validated?> after STEP-04 and
 * <candidate selected?> after STEP-05 — are LOOP-BACK gateways in the source (NO → back
 * to sourcing). The linear fail-closed orchestrator does not loop back, and reopening a
 * live-proven orchestrator to add a bounded resume loop is out of scope
 * (feedback-ne-pas-modifier-workflow-prouve-live). So both are modeled as ORDINARY
 * BLOCKING eval gates on the UNCHANGED orchestrator: an empty/insufficient shortlist
 * halts at STEP-04 (`rh-shortlist-validated`), and a missing selected candidate halts at
 * STEP-05 (`sel-candidate-selected`). This is the same halt semantics as every other
 * spine — NOT a new gate mechanism; a halt here reads "shortlist insufficient, broaden
 * sourcing", an operational iteration state, not a compliance defect.
 *
 * Numeric DoD counts from the workflow ("6-10 grid criteria", "10-15 interview
 * questions", "shortlist of 3-5", "2-3 references") are split: a relaxed BLOCKING floor
 * (a meaningful deliverable must exist) plus an ADVISORY criterion at the exact spec
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
  arr,
  asRecord,
  nonEmptyArray,
  arrayLenBetween,
  minArrayLen,
  nonEmptyString,
  affirmativeString,
  countAffirmativeField,
} from "./spine-helpers.js";

// --- Local predicates (traced DoD shapes) ------------------------------------

/** `true` if every listed key of `o` holds an array (MoSCoW axes). */
function allKeysAreArrays(o: unknown, keys: string[]): boolean {
  const r = asRecord(o);
  return keys.every((k) => Array.isArray(r[k]));
}

/** `true` if `o[outer][inner]` is a non-empty array (e.g. moscow.must). */
function nestedArrayNonEmpty(o: unknown, outer: string, inner: string): boolean {
  return nonEmptyArray(asRecord(asRecord(o)[outer])[inner]);
}

// =============================================================================
// CRITERIA — traced to WF-009 (v1.0)
// =============================================================================

/**
 * STEP-01 — BUSINESS-ANALYST.
 * DoD: structured need sheet · MoSCoW skills grid (must/should/could/wont) ·
 * culture-fit profile · work environment and conditions.
 */
const STEP01_CRITERIA: Criterion[] = [
  {
    id: "ba-need-sheet",
    description: "STEP-01: structured need sheet (context, mission, expected deliverables)",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["needSheet"]),
  },
  {
    id: "ba-moscow",
    description: "STEP-01: MoSCoW skills grid with the four axes (must/should/could/wont)",
    severity: "blocking",
    check: (o) => allKeysAreArrays(asRecord(o)["moscow"], ["must", "should", "could", "wont"]),
  },
  {
    id: "ba-must-nonempty",
    description: "STEP-01: at least one non-negotiable Must-have skill",
    severity: "blocking",
    check: (o) => nestedArrayNonEmpty(o, "moscow", "must"),
  },
  {
    id: "ba-culture-fit",
    description: "STEP-01: sought personality profile / culture fit present",
    severity: "advisory",
    check: (o) => nonEmptyString(asRecord(o)["cultureFit"]),
  },
  {
    id: "ba-work-env",
    description: "STEP-01: work environment and conditions (remote, tools, rituals) present",
    severity: "advisory",
    check: (o) => nonEmptyString(asRecord(o)["workEnv"]),
  },
];

/**
 * STEP-02A — CONSULTANT-IA.
 * DoD: technical assessment grid (6-10 criteria, 1-5) · 10-15 calibrated interview
 * questions · optional practical exercise · 2026 market-level benchmark.
 */
const STEP02A_CRITERIA: Criterion[] = [
  {
    id: "tech-grid-floor",
    description: "STEP-02A: technical assessment grid — ≥ 3 criteria (floor)",
    severity: "blocking",
    check: (o) => minArrayLen(asRecord(o)["assessmentGrid"], 3),
  },
  {
    id: "tech-grid-6-10",
    description: "STEP-02A: the full 6-10 criteria technical grid (ideal)",
    severity: "advisory",
    check: (o) => arrayLenBetween(asRecord(o)["assessmentGrid"], 6, 10),
  },
  {
    id: "tech-questions-floor",
    description: "STEP-02A: calibrated interview questions — ≥ 3 (floor)",
    severity: "blocking",
    check: (o) => minArrayLen(asRecord(o)["interviewQuestions"], 3),
  },
  {
    id: "tech-questions-10-15",
    description: "STEP-02A: the full 10-15 calibrated interview questions (ideal)",
    severity: "advisory",
    check: (o) => arrayLenBetween(asRecord(o)["interviewQuestions"], 10, 15),
  },
  {
    id: "tech-benchmark",
    description: "STEP-02A: 2026 market-level benchmark present",
    severity: "advisory",
    check: (o) => nonEmptyString(asRecord(o)["marketBenchmark"]),
  },
];

/**
 * STEP-03 — REDACTEUR-IA.
 * DoD: publishable job ad · recruitment-agency brief · LinkedIn InMail (subject +
 * body) · application-received reply email template.
 */
const STEP03_CRITERIA: Criterion[] = [
  {
    id: "red-job-ad",
    description: "STEP-03: publishable job ad (attractive, inclusive, complete)",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["jobAd"]),
  },
  {
    id: "red-agency-brief",
    description: "STEP-03: recruitment-agency brief present",
    severity: "advisory",
    check: (o) => nonEmptyString(asRecord(o)["agencyBrief"]),
  },
  {
    id: "red-linkedin-inmail",
    description: "STEP-03: LinkedIn InMail outreach message (subject + body) present",
    severity: "advisory",
    check: (o) => nonEmptyString(asRecord(o)["linkedinInMail"]),
  },
  {
    id: "red-reply-email",
    description: "STEP-03: application-received reply email template present",
    severity: "advisory",
    check: (o) => nonEmptyString(asRecord(o)["replyEmail"]),
  },
];

/**
 * STEP-04 — RH-IA.
 * DoD: CVs scored against the MoSCoW grid · fraud-detection report · shortlist of 3-5
 * candidates · candidate comparison table.
 * BPMN <shortlist validated?> loop-back gateway → modeled here as the blocking
 * `rh-shortlist-validated` floor (an insufficient shortlist halts, fail-closed).
 */
const STEP04_CRITERIA: Criterion[] = [
  {
    id: "rh-scored-cvs",
    description: "STEP-04: CVs scored against the MoSCoW grid (Must met / missing)",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["scoredCvs"]),
  },
  {
    id: "rh-fraud-report",
    description: "STEP-04: CV fraud / fake-profile detection report present",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["fraudReport"]),
  },
  {
    id: "rh-shortlist-validated",
    description:
      "STEP-04: <shortlist validated?> gateway — ≥ 3 REAL shortlisted candidates (rejects self-declared placeholders)",
    severity: "blocking",
    // Hardened after the first live run: an agent given no CVs honestly returned 3
    // placeholder entries ("… only to satisfy minItems:3"), which a bare
    // minArrayLen(3) waved through. A decision gateway must count REAL candidates.
    check: (o) => countAffirmativeField(asRecord(o)["shortlist"], "candidate") >= 3,
  },
  {
    id: "rh-shortlist-3-5",
    description: "STEP-04: the shortlist holds 3 to 5 candidates (ideal)",
    severity: "advisory",
    check: (o) => arrayLenBetween(asRecord(o)["shortlist"], 3, 5),
  },
  {
    id: "rh-comparison-table",
    description: "STEP-04: candidate comparison table (skills × criteria) present",
    severity: "advisory",
    check: (o) => nonEmptyArray(asRecord(o)["comparisonTable"]),
  },
];

/**
 * STEP-05 — RH-IA + CONSULTANT-IA.
 * DoD: HR interview report · technical grid filled per candidate · reference-check
 * result (2-3 minimum) · final recommendation (selected candidate + arguments).
 * BPMN <candidate selected?> loop-back gateway → modeled here as the blocking
 * `sel-candidate-selected` criterion (no selected candidate halts, fail-closed).
 */
const STEP05_CRITERIA: Criterion[] = [
  {
    id: "sel-hr-report",
    description: "STEP-05: HR interview report (culture fit, motivations, compensation)",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["hrInterviewReport"]),
  },
  {
    id: "sel-tech-grid",
    description: "STEP-05: technical assessment grid filled in per candidate (non-empty)",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["techGridPerCandidate"]),
  },
  {
    id: "sel-references",
    description: "STEP-05: reference-check result present (non-empty)",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["referenceChecks"]),
  },
  {
    id: "sel-references-2plus",
    description: "STEP-05: 2-3 reference checks (ideal ≥ 2)",
    severity: "advisory",
    check: (o) => minArrayLen(asRecord(o)["referenceChecks"], 2),
  },
  {
    id: "sel-candidate-selected",
    description:
      "STEP-05: <candidate selected?> gateway — a REAL candidate is named (rejects 'none'/negative sentinels)",
    severity: "blocking",
    // Hardened after the first live run: the agent returned selectedCandidate =
    // "None — no candidate can be selected", a non-empty string that nonEmptyString
    // accepted — the exact NO branch this gateway must halt on. affirmativeString
    // rejects the negative sentinel so the gate fails closed as intended.
    check: (o) => affirmativeString(asRecord(o)["selectedCandidate"]),
  },
  {
    id: "sel-recommendation",
    description: "STEP-05: final recommendation with arguments present",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["recommendation"]),
  },
];

/**
 * STEP-06 — RH-IA + REDACTEUR-IA.
 * DoD: offer letter / employment promise · considerate reply to unsuccessful
 * candidates · complete administrative file · D1 onboarding sheet (WF-007 handoff).
 */
const STEP06_CRITERIA: Criterion[] = [
  {
    id: "off-offer-letter",
    description: "STEP-06: offer letter / employment promise present",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["offerLetter"]),
  },
  {
    id: "off-admin-file",
    description: "STEP-06: complete administrative file (pre-hire declaration, contract, IT access)",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["adminFile"]),
  },
  {
    id: "off-unsuccessful-reply",
    description: "STEP-06: considerate reply email to unsuccessful candidates present",
    severity: "advisory",
    check: (o) => nonEmptyString(asRecord(o)["unsuccessfulReply"]),
  },
  {
    id: "off-onboarding-sheet",
    description: "STEP-06: D1 onboarding sheet (handoff to WF-007) present",
    severity: "advisory",
    check: (o) => nonEmptyString(asRecord(o)["onboardingSheet"]),
  },
];

/** All criteria of the WF-009 spine (backbone order). */
export const WF_009_RECRUTEMENT_CRITERIA: Criterion[] = [
  ...STEP01_CRITERIA,
  ...STEP02A_CRITERIA,
  ...STEP03_CRITERIA,
  ...STEP04_CRITERIA,
  ...STEP05_CRITERIA,
  ...STEP06_CRITERIA,
];

/** Builds a fresh registry populated with the WF-009 spine criteria. */
export function buildWf009RecrutementRegistry(): CriterionRegistry {
  return new CriterionRegistry().registerAll(WF_009_RECRUTEMENT_CRITERIA);
}

// =============================================================================
// MANIFEST — WF-009 backbone (I/O contracts + criteria references by id)
// =============================================================================

/**
 * Contracts designed for a linear fail-closed handoff: each output promises the field
 * required by the immediate downstream input (WF-003/004 idiom — a single carried
 * field per hop): moscow → assessmentGrid → jobAd → shortlist → selectedCandidate.
 * STEP-06 (offer) receives the immediate upstream field and synthesizes the prior
 * deliverables from its prose (WF-003/004 precedent).
 */
export const WF_009_RECRUTEMENT_MANIFEST: SpineManifest = {
  spineId: "WF-009-recrutement-backbone",
  steps: [
    {
      stepId: "STEP-01",
      assetId: "AGENT-BUSINESS-ANALYST",
      // seed: recruitment context = runSpine's initial input.
      output: objSchema(["needSheet", "moscow"], {
        needSheet: {
          type: "string",
          description: "Structured need sheet: context, mission, expected deliverables.",
        },
        // Blocking ba-moscow + ba-must-nonempty: the four axes are arrays, must is non-empty.
        moscow: objSchema(["must", "should", "could", "wont"], {
          must: arrOf(undefined, { min: 1 }),
          should: arr,
          could: arr,
          wont: arr,
        }),
        // Advisory nudges ba-culture-fit / ba-work-env.
        cultureFit: { type: "string", description: "Sought personality profile / culture fit." },
        workEnv: { type: "string", description: "Work environment and conditions (remote, tools, rituals)." },
      }),
      criteriaIds: STEP01_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-02A",
      assetId: "AGENT-CONSULTANT-IA",
      input: objSchema(["moscow"], { moscow: { type: "object" } }),
      output: objSchema(["assessmentGrid", "interviewQuestions"], {
        // Blocking floor ≥ 3; the schema communicates the 6-10 ideal (advisory).
        assessmentGrid: arrOf(
          objSchema([], {
            criterion: { type: "string", description: "Assessed technical criterion." },
            weight: { type: "string", description: "Relative weight / importance." },
            scale: { type: "string", description: "1-5 rating scale anchor." },
          }),
          { min: 6, max: 10 },
        ),
        // Blocking floor ≥ 3; the schema communicates the 10-15 ideal (advisory).
        interviewQuestions: arrOf(
          objSchema([], {
            question: { type: "string", description: "Calibrated tech interview question." },
            level: { type: "string", description: "junior | senior | lead" },
          }),
          { min: 10, max: 15 },
        ),
        // Advisory nudges: optional practical exercise + market benchmark.
        practicalExercise: { type: "string", description: "Optional practical exercise / mini technical case." },
        marketBenchmark: { type: "string", description: "2026 market-level benchmark." },
      }),
      criteriaIds: STEP02A_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-03",
      assetId: "AGENT-REDACTEUR-IA",
      input: objSchema(["assessmentGrid"], { assessmentGrid: arr }),
      output: objSchema(["jobAd"], {
        jobAd: { type: "string", description: "Publishable job ad (attractive, inclusive, complete)." },
        // Advisory nudges red-agency-brief / red-linkedin-inmail / red-reply-email.
        agencyBrief: { type: "string", description: "Recruitment-agency brief (if outsourced)." },
        linkedinInMail: { type: "string", description: "LinkedIn InMail outreach message (subject + body)." },
        replyEmail: { type: "string", description: "Application-received reply email template." },
      }),
      criteriaIds: STEP03_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-04",
      assetId: "AGENT-RH-IA",
      input: objSchema(["jobAd"], { jobAd: str }),
      output: objSchema(["scoredCvs", "fraudReport", "shortlist"], {
        scoredCvs: arrOf(
          objSchema([], {
            candidate: { type: "string", description: "Candidate identifier (anonymized)." },
            mustMet: { type: "string", description: "Must-have skills met / missing." },
            score: { type: "number", description: "ATS score against the MoSCoW grid." },
          }),
          { min: 1 },
        ),
        fraudReport: { type: "string", description: "CV fraud / fake-profile detection report." },
        // Blocking rh-shortlist-validated (gateway) floor ≥ 3; schema communicates the 3-5 ideal.
        shortlist: arrOf(
          objSchema([], {
            candidate: { type: "string", description: "Shortlisted candidate (anonymized)." },
            justification: { type: "string", description: "Why shortlisted." },
          }),
          { min: 3, max: 5 },
        ),
        // Advisory nudge rh-comparison-table.
        comparisonTable: { type: "array", description: "Candidate comparison table (skills × criteria)." },
      }),
      criteriaIds: STEP04_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-05",
      assetId: "AGENT-RH-IA",
      input: objSchema(["shortlist"], { shortlist: arr }),
      output: objSchema(
        ["hrInterviewReport", "techGridPerCandidate", "referenceChecks", "selectedCandidate", "recommendation"],
        {
          hrInterviewReport: { type: "string", description: "HR interview report (culture fit, motivations, compensation)." },
          techGridPerCandidate: arrOf(
            objSchema([], {
              candidate: { type: "string", description: "Assessed candidate (anonymized)." },
              rating: { type: "string", description: "Filled technical grid summary." },
            }),
            { min: 1 },
          ),
          // Blocking floor ≥ 1; schema communicates the 2-3 ideal (advisory).
          referenceChecks: arrOf(
            objSchema([], {
              candidate: { type: "string", description: "Candidate the reference concerns." },
              outcome: { type: "string", description: "Reference-check outcome." },
            }),
            { min: 2, max: 3 },
          ),
          // Blocking sel-candidate-selected (gateway): a named selected candidate.
          selectedCandidate: { type: "string", description: "The selected candidate (anonymized)." },
          recommendation: { type: "string", description: "Final recommendation with supporting arguments." },
        },
      ),
      criteriaIds: STEP05_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-06",
      assetId: "AGENT-RH-IA",
      input: objSchema(["selectedCandidate"], { selectedCandidate: str }),
      output: objSchema(["offerLetter", "adminFile"], {
        offerLetter: { type: "string", description: "Offer letter / employment promise." },
        adminFile: {
          type: "string",
          description: "Complete administrative file (pre-hire declaration, contract, IT access).",
        },
        // Advisory nudges off-unsuccessful-reply / off-onboarding-sheet.
        unsuccessfulReply: { type: "string", description: "Considerate reply email to unsuccessful candidates." },
        onboardingSheet: { type: "string", description: "D1 onboarding sheet (handoff to WF-007)." },
      }),
      criteriaIds: STEP06_CRITERIA.map((c) => c.id),
    },
  ],
};
