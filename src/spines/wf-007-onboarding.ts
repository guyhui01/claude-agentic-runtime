/**
 * Real spine — deterministic backbone of WF-007 "Client Engagement Onboarding
 * D1-D5" (§2.4-B.4).
 *
 * Sourced from the real workflow `claude-agents/workflows/WF-007-onboarding-mission-j1.md`
 * (v1.0). Backbone = the SEQUENTIAL chain of the 4 core agents. The source BPMN has a
 * PARALLEL FORK (STEP-02 BUSINESS-ANALYST ∥ STEP-03 CHANGE-MANAGER) then a JOIN; it is
 * LINEARIZED here (STEP-02 → STEP-03) on the unchanged linear orchestrator — the WF-003
 * precedent for parallel forks. The AI-maturity gateway (STEP-04 CONSULTANT-IA) and the
 * NDA/JURIDIQUE-IA branch are OPTIONAL, so outside the backbone:
 *   STEP-01 (CHEF-PROJET-IA) → STEP-02 (BUSINESS-ANALYST) → STEP-03 (CHANGE-MANAGER)
 *   → STEP-05 (REDACTEUR-IA).
 *
 * ADR compliance identical to WF-001/002/003/004/005 (ADR-0007 runtime manifest,
 * deterministic eval criteria on the UNCHANGED linear fail-closed orchestrator). Like
 * WF-004/005, this workflow carries NO fail-closed structural construct: STEP-01 opens
 * the flow as an ordinary blocking eval gate, both gateways are OPTIONAL bypasses, so
 * the spine is a linear twin of WF-004. Same `Management & Consulting` domain as
 * WF-004/005/006 — it adds a backbone, not a new domain.
 *
 * Numeric DoD counts ("D1-D5 kickoff plan", the checklist/questions lists) are split:
 * a relaxed BLOCKING floor (a meaningful deliverable must exist) plus an ADVISORY
 * criterion at the exact spec number (the full ideal). **Live-run hardening (WF-005
 * lesson):** the output JSON schema is ajv-strict-validated at the handoff, so its
 * numeric bounds are pinned to the BLOCKING FLOOR (no `maxItems`, no `minItems` on
 * optional fields); the ideal is carried by the advisory criteria + field descriptions.
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
  asRecord,
  nonEmptyArray,
  minArrayLen,
  nonEmptyString,
} from "./spine-helpers.js";

// =============================================================================
// CRITERIA — traced to WF-007 (v1.0)
// =============================================================================

/**
 * STEP-01 — CHEF-PROJET-IA.
 * DoD: D1-D5 kickoff plan (activities per half-day) · stakeholder mapping (provisional
 * RACI) · D1 logistics checklist · questions to ask on D1 · kickoff risks.
 */
const STEP01_CRITERIA: Criterion[] = [
  {
    id: "cp-kickoff-plan",
    description: "STEP-01: D1-D5 kickoff plan (non-empty)",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["kickoffPlan"]),
  },
  {
    id: "cp-kickoff-plan-5day",
    description: "STEP-01: the full D1-D5 plan (ideal ≥ 5 half-day activities)",
    severity: "advisory",
    check: (o) => minArrayLen(asRecord(o)["kickoffPlan"], 5),
  },
  {
    id: "cp-raci",
    description: "STEP-01: stakeholder mapping / provisional RACI (non-empty)",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["raci"]),
  },
  {
    id: "cp-logistics",
    description: "STEP-01: D1 logistics checklist (access, tools, meetings)",
    severity: "advisory",
    check: (o) => nonEmptyArray(asRecord(o)["logisticsChecklist"]),
  },
  {
    id: "cp-d1-questions",
    description: "STEP-01: questions that must be asked on D1",
    severity: "advisory",
    check: (o) => nonEmptyArray(asRecord(o)["d1Questions"]),
  },
];

/**
 * STEP-02 — BUSINESS-ANALYST.
 * DoD: client context sheet (sector, stakes, culture, competitors) · org chart ·
 * simplified IS mapping · client business glossary · grey areas to clarify on D1.
 */
const STEP02_CRITERIA: Criterion[] = [
  {
    id: "ba-client-context",
    description: "STEP-02: client context sheet (sector/stakes/culture) present",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["clientContext"]),
  },
  {
    id: "ba-is-mapping",
    description: "STEP-02: simplified IS mapping (systems in place, non-empty)",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["isMapping"]),
  },
  {
    id: "ba-org-chart",
    description: "STEP-02: organizational chart (business + IT) present",
    severity: "advisory",
    check: (o) => nonEmptyString(asRecord(o)["orgChart"]),
  },
  {
    id: "ba-glossary",
    description: "STEP-02: client business glossary (key terms/acronyms)",
    severity: "advisory",
    check: (o) => nonEmptyArray(asRecord(o)["glossary"]),
  },
  {
    id: "ba-grey-areas",
    description: "STEP-02: grey areas to clarify on D1",
    severity: "advisory",
    check: (o) => nonEmptyArray(asRecord(o)["greyAreas"]),
  },
];

/**
 * STEP-03 — CHANGE-MANAGER.
 * DoD: map of allies/neutrals/resisters · D1-D30 engagement plan · recommended D1
 * posture · interpersonal points of attention · relational quick wins.
 */
const STEP03_CRITERIA: Criterion[] = [
  {
    id: "cm-stakeholder-map",
    description: "STEP-03: map of allies, neutrals, and potential resisters (non-empty)",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["stakeholderMap"]),
  },
  {
    id: "cm-engagement-plan",
    description: "STEP-03: D1-D30 engagement plan (who to see, when, why — non-empty)",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["engagementPlan"]),
  },
  {
    id: "cm-d1-posture",
    description: "STEP-03: recommended D1 posture (observer / actor / expert)",
    severity: "advisory",
    check: (o) => nonEmptyString(asRecord(o)["d1Posture"]),
  },
  {
    id: "cm-quick-wins",
    description: "STEP-03: identified relational quick wins",
    severity: "advisory",
    check: (o) => nonEmptyArray(asRecord(o)["quickWins"]),
  },
];

/**
 * STEP-05 — REDACTEUR-IA.
 * DoD: D1 kit (kickoff plan + client sheet + key questions) · D1 introduction email ·
 * D1 report template · D5 scoping note (the `resultat_final` "D5 scoping completed").
 */
const STEP05_CRITERIA: Criterion[] = [
  {
    id: "red-d1-kit",
    description: "STEP-05: D1 kit (kickoff plan + client sheet + key questions) present",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["d1Kit"]),
  },
  {
    id: "red-intro-email",
    description: "STEP-05: D1 introduction email present",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["introEmail"]),
  },
  {
    id: "red-report-template",
    description: "STEP-05: D1 report template present",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["d1ReportTemplate"]),
  },
  {
    id: "red-d5-scoping",
    description: "STEP-05: D5 scoping note (first-days review + adjustments) present",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["d5ScopingNote"]),
  },
];

/** All criteria of the WF-007 spine (backbone order). */
export const WF_007_ONBOARDING_CRITERIA: Criterion[] = [
  ...STEP01_CRITERIA,
  ...STEP02_CRITERIA,
  ...STEP03_CRITERIA,
  ...STEP05_CRITERIA,
];

/** Builds a fresh registry populated with the WF-007 spine criteria. */
export function buildWf007OnboardingRegistry(): CriterionRegistry {
  return new CriterionRegistry().registerAll(WF_007_ONBOARDING_CRITERIA);
}

// =============================================================================
// MANIFEST — WF-007 backbone (I/O contracts + criteria references by id)
// =============================================================================

/**
 * Contracts designed for a linear fail-closed handoff: each output promises the field
 * required by the immediate downstream input (WF-004 idiom — a single carried field
 * per hop): raci → clientContext → engagementPlan. REDACTEUR (STEP-05) receives the
 * engagement plan and synthesizes all prior deliverables from its prose (WF-004
 * precedent). Output-schema numeric bounds pinned to the BLOCKING FLOOR (WF-005 live-run
 * hardening): the schema is ajv-strict-validated at the handoff, so `minItems` = floor
 * only, no `maxItems`, no `minItems` on optional fields; the ideal counts stay advisory.
 */
export const WF_007_ONBOARDING_MANIFEST: SpineManifest = {
  spineId: "WF-007-onboarding-backbone",
  steps: [
    {
      stepId: "STEP-01",
      assetId: "AGENT-CHEF-PROJET-IA",
      // seed: engagement context = runSpine's initial input.
      output: objSchema(["kickoffPlan", "raci"], {
        // Blocking floor (non-empty); the D1-D5 ideal (≥ 5) is advisory + description.
        kickoffPlan: arrOf(
          objSchema([], {
            slot: { type: "string", description: "Half-day slot (e.g. D1-AM ... D5-PM)." },
            activity: { type: "string", description: "Planned activity for the slot." },
          }),
          { min: 1 },
        ),
        // Blocking cp-raci: carried field for STEP-02.
        raci: arrOf(
          objSchema([], {
            stakeholder: { type: "string", description: "Stakeholder name / role." },
            raci: { type: "string", description: "R | A | C | I." },
          }),
          { min: 1 },
        ),
        // Advisory nudges cp-logistics / cp-d1-questions / kickoff risks.
        logisticsChecklist: { type: "array", description: "D1 logistics: access, tools, meetings." },
        d1Questions: { type: "array", description: "Questions that must be asked on D1." },
        kickoffRisks: { type: "array", description: "Identified kickoff risks (political/technical/HR)." },
      }),
      criteriaIds: STEP01_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-02",
      assetId: "AGENT-BUSINESS-ANALYST",
      input: objSchema(["raci"], { raci: arr }),
      output: objSchema(["clientContext", "isMapping"], {
        // Blocking ba-client-context: carried field for STEP-03.
        clientContext: {
          type: "string",
          description: "Client context sheet: sector, stakes, culture, competitors.",
        },
        // Blocking ba-is-mapping (non-empty).
        isMapping: arrOf(undefined, { min: 1 }),
        // Advisory nudges ba-org-chart / ba-glossary / ba-grey-areas.
        orgChart: { type: "string", description: "Organizational chart (business + IT)." },
        glossary: { type: "array", description: "Client business glossary (key terms/acronyms)." },
        greyAreas: { type: "array", description: "Grey areas to clarify on D1." },
      }),
      criteriaIds: STEP02_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-03",
      assetId: "AGENT-CHANGE-MANAGER",
      input: objSchema(["clientContext"], { clientContext: { type: "string" } }),
      output: objSchema(["stakeholderMap", "engagementPlan"], {
        // Blocking cm-stakeholder-map.
        stakeholderMap: arrOf(
          objSchema([], {
            stakeholder: { type: "string", description: "Stakeholder name / role." },
            stance: { type: "string", description: "ally | neutral | resister." },
          }),
          { min: 1 },
        ),
        // Blocking cm-engagement-plan: carried field for STEP-05.
        engagementPlan: arrOf(undefined, { min: 1 }),
        // Advisory nudges cm-d1-posture / cm-quick-wins.
        d1Posture: { type: "string", description: "Recommended D1 posture (observer/actor/expert)." },
        quickWins: { type: "array", description: "Identified relational quick wins." },
      }),
      criteriaIds: STEP03_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-05",
      assetId: "AGENT-REDACTEUR-IA",
      input: objSchema(["engagementPlan"], { engagementPlan: arr }),
      output: objSchema(["d1Kit", "introEmail", "d1ReportTemplate", "d5ScopingNote"], {
        d1Kit: {
          type: "string",
          description: "D1 kit: kickoff plan + client sheet + key questions (Markdown).",
        },
        introEmail: { type: "string", description: "D1 introduction email (to the manager on D-1)." },
        d1ReportTemplate: { type: "string", description: "D1 report template (to complete that evening)." },
        d5ScopingNote: { type: "string", description: "D5 scoping note (first-days review + adjustments)." },
      }),
      criteriaIds: STEP05_CRITERIA.map((c) => c.id),
    },
  ],
};
