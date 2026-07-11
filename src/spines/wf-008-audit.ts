/**
 * Real spine — deterministic backbone of WF-008 "AI Act / GDPR Compliance Audit".
 *
 * Sourced from the real workflow `claude-agents/workflows/WF-008-audit-conformite-ia-act-rgpd.md` (v1.0).
 * Backbone = the SEQUENTIAL chain of the 7 core agents, PLUS the counter-review
 * gate (STEP-06C, AUDIT-METHODO-IA). The workflow's PARALLEL fork (STEP-02/03/04)
 * is LINEARIZED here (same simplification as the WF-003 spine); the two "if
 * required" branches (STEP-04B DATA-SCIENTIST, STEP-06B FINANCIAL-ANALYST) stay
 * OUTSIDE the backbone (optional). The counter-review, by contrast, is IN the
 * backbone: it is the reason WF-008 was picked — the first spine to traverse an
 * independent methodology gate that can RETURN the deliverable for rework:
 *   STEP-01 (JURIDIQUE-IA) → STEP-02 (AI-ARCHITECT) → STEP-03 (SECURITE-IA)
 *   → STEP-04 (DATA-ENGINEER) → STEP-05 (CDO-DIRECTEUR-IA) → STEP-06 (CHANGE-MANAGER)
 *   → STEP-06C (AUDIT-METHODO-IA) → STEP-07 (REDACTEUR-IA).
 *
 * Two deterministic constructs new to this spine, both enforced by the existing
 * fail-closed eval gate (ADR-0007, no LLM-as-judge — the agent emits its verdict,
 * a rule enforces it):
 *   1. Counter-review clearance gate (STEP-06C): blocking `audit-verdict-cleared`
 *      requires verdict === "cleared". A "returned" verdict halts the spine BEFORE
 *      the final report (STEP-07) — the spec's "never cleared by default", modeled
 *      as a mid-spine return-for-rework gate.
 *   2. "Unacceptable" AI Act tier gateway (STEP-01): blocking
 *      `jur-tier-not-unacceptable` — an unacceptable system halts the backbone
 *      (recommend cessation), fail-closed.
 *
 * Several criteria trace a quantified `condition_passage`/DoD from the workflow
 * (tier qualified · OWASP LLM Top 10 covered · RACI ≥ 3 roles · cleared verdict).
 *
 * `assetId` values expected as "agent" assets in the pinned catalog's sidecar (≥ v4.1.0,
 * the release that widened the sidecar to WF-008's agents).
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
// CRITERIA — traced to WF-008 (v1.0)
// =============================================================================

/**
 * STEP-01 — AGENT-JURIDIQUE-IA.
 * DoD: AI Act tier qualification · AI Act/NIS2 obligations matrix · impacted GDPR articles.
 * condition_passage: AI Act tier validated before the technical audit.
 * GATEWAY: tier "Unacceptable" → immediate stop (recommend cessation), fail-closed.
 */
const STEP01_CRITERIA: Criterion[] = [
  {
    id: "jur-tier-qualified",
    description: "STEP-01: AI Act tier qualified (non-empty)",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["tier"]),
  },
  {
    id: "jur-tier-not-unacceptable",
    description:
      "STEP-01: gateway — AI Act tier ≠ « Unacceptable » (else stop, recommend cessation)",
    severity: "blocking",
    check: (o) => asRecord(o)["tier"] !== "Unacceptable",
  },
  {
    id: "jur-obligations-matrix",
    description: "STEP-01: AI Act / NIS2 / sectoral obligations matrix (non-empty)",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["obligationsMatrix"]),
  },
  {
    id: "jur-gdpr-articles",
    description: "STEP-01: impacted GDPR articles listed (non-empty)",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["gdprArticles"]),
  },
  {
    id: "jur-penalties",
    description: "STEP-01: summary of penalties incurred present",
    severity: "advisory",
    check: (o) => nonEmptyString(asRecord(o)["penalties"]),
  },
];

/**
 * STEP-02 — AGENT-AI-ARCHITECT.
 * DoD: transparency/explainability/monitoring/traceability audit · human oversight
 * (Art. 14, human-in-the-loop / kill switch) · architecture gaps vs. AI Act.
 */
const STEP02_CRITERIA: Criterion[] = [
  {
    id: "arch-report-present",
    description: "STEP-02: architecture compliance report (non-empty)",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["architectureReport"]),
  },
  {
    id: "arch-human-oversight",
    description: "STEP-02: human-oversight audit (Art. 14: human-in-the-loop / kill switch)",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["humanOversight"]),
  },
  {
    id: "arch-gaps-list",
    description: "STEP-02: architecture gaps vs. AI Act requirements present",
    severity: "advisory",
    check: (o) => Array.isArray(asRecord(o)["gaps"]),
  },
];

/**
 * STEP-03 — AGENT-SECURITE-IA.
 * DoD: STRIDE threat model adapted to AI · OWASP LLM Top 10 audit (LLM01-LLM10)
 * · technical controls plan (Art. 15 robustness).
 */
const STEP03_CRITERIA: Criterion[] = [
  {
    id: "sec-report-present",
    description: "STEP-03: AI security report (non-empty)",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["securityReport"]),
  },
  {
    id: "sec-owasp-llm-10",
    description: "STEP-03: audit covering the 10 OWASP LLM categories (LLM01-LLM10)",
    severity: "blocking",
    check: (o) => minArrayLen(asRecord(o)["owaspLlm"], 10),
  },
  {
    id: "sec-stride-present",
    description: "STEP-03: STRIDE threat model adapted to AI (non-empty)",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["stride"]),
  },
  {
    id: "sec-controls-plan",
    description: "STEP-03: technical controls plan present",
    severity: "advisory",
    check: (o) => Array.isArray(asRecord(o)["controlsPlan"]),
  },
];

/**
 * STEP-04 — AGENT-DATA-ENGINEER.
 * DoD: end-to-end data lineage · data quality/representativeness (Art. 10) · bias
 * audit by protected subgroup · GDPR data audit (legal basis, minimization, transfers).
 */
const STEP04_CRITERIA: Criterion[] = [
  {
    id: "data-report-present",
    description: "STEP-04: data audit report (non-empty)",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["dataReport"]),
  },
  {
    id: "data-lineage-present",
    description: "STEP-04: end-to-end data lineage mapping (non-empty)",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["lineage"]),
  },
  {
    id: "data-bias-audit",
    description: "STEP-04: bias audit by protected subgroup (non-empty)",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["biasAudit"]),
  },
  {
    id: "data-correction-plan",
    description: "STEP-04: data correction plan present",
    severity: "advisory",
    check: (o) => Array.isArray(asRecord(o)["correctionPlan"]),
  },
];

/**
 * STEP-05 — AGENT-CDO-DIRECTEUR-IA.
 * DoD: target AI governance framework (ISO 42001 aligned) · compliance RACI
 * (DPO, CISO, AI Officer, Business, IT) · AI Act lead appointment.
 */
const STEP05_CRITERIA: Criterion[] = [
  {
    id: "gov-framework-present",
    description: "STEP-05: target AI governance framework (ISO 42001 aligned, non-empty)",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["governanceFramework"]),
  },
  {
    id: "gov-raci-min-3",
    description: "STEP-05: compliance RACI covering ≥ 3 roles (DPO/CISO/AI Officer/Business/IT)",
    severity: "blocking",
    check: (o) => minArrayLen(asRecord(o)["raci"], 3),
  },
  {
    id: "gov-ai-act-lead",
    description: "STEP-05: AI Act lead appointment / articulation with the DPO present",
    severity: "advisory",
    check: (o) => nonEmptyString(asRecord(o)["aiActLead"]),
  },
];

/**
 * STEP-06 — AGENT-CHANGE-MANAGER.
 * DoD: AI compliance ADKAR plan per population · training program (AI Act leads,
 * Data teams, Business) · governance adoption KPIs.
 */
const STEP06_CRITERIA: Criterion[] = [
  {
    id: "chg-adkar-present",
    description: "STEP-06: AI compliance ADKAR plan (non-empty)",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["adkarPlan"]),
  },
  {
    id: "chg-training-program",
    description: "STEP-06: training program (≥ 1 population: leads / Data / Business)",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["trainingProgram"]),
  },
  {
    id: "chg-adoption-kpis",
    description: "STEP-06: governance adoption KPIs present",
    severity: "advisory",
    check: (o) => Array.isArray(asRecord(o)["adoptionKpis"]),
  },
];

/**
 * STEP-06C — AGENT-AUDIT-METHODO-IA — INDEPENDENT COUNTER-REVIEW GATE.
 * DoD: cognitive-bias log · ISTQB exit criteria applied to the audit deliverable
 * · verdict cleared / returned with reservations — never cleared by default.
 * condition_passage: audit cleared (or returned with documented reservations)
 * before the final report (STEP-07).
 * Scope: challenges the methodological RIGOR of the audit; does NOT re-qualify the
 * legal substance (AI Act / GDPR qualification remains STEP-01, JURIDIQUE-IA).
 */
const STEP06C_CRITERIA: Criterion[] = [
  {
    id: "audit-verdict-cleared",
    description:
      "STEP-06C: counter-review verdict = « cleared » (a « returned » verdict halts the spine before STEP-07)",
    severity: "blocking",
    check: (o) => asRecord(o)["verdict"] === "cleared",
  },
  {
    id: "audit-bias-log",
    description:
      "STEP-06C: cognitive-bias log documented (non-empty — an empty log is a rubber stamp, anti-theater)",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["biasLog"]),
  },
  {
    id: "audit-exit-criteria",
    description: "STEP-06C: ISTQB exit criteria applied to the audit deliverable (non-empty)",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["exitCriteria"]),
  },
  {
    id: "audit-reservations",
    description: "STEP-06C: documented reservations list present (if returned)",
    severity: "advisory",
    check: (o) => Array.isArray(asRecord(o)["reservations"]),
  },
];

/**
 * STEP-07 — AGENT-REDACTEUR-IA.
 * DoD: 2-page executive summary (verdict + top-5 risks + investment) · full audit
 * report · prioritized remediation plan (impact × effort × legal deadline).
 */
const STEP07_CRITERIA: Criterion[] = [
  {
    id: "red-exec-summary",
    description: "STEP-07: 2-page executive summary (non-empty)",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["execSummary"]),
  },
  {
    id: "red-audit-report",
    description: "STEP-07: full compliance audit report (non-empty)",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["auditReport"]),
  },
  {
    id: "red-remediation-plan",
    description: "STEP-07: prioritized remediation plan (non-empty)",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["remediationPlan"]),
  },
  {
    id: "red-roadmap",
    description: "STEP-07: compliance roadmap with quarterly milestones present",
    severity: "advisory",
    check: (o) => Array.isArray(asRecord(o)["roadmap"]),
  },
];

/** All criteria of the WF-008 spine (backbone order). */
export const WF_008_AUDIT_CRITERIA: Criterion[] = [
  ...STEP01_CRITERIA,
  ...STEP02_CRITERIA,
  ...STEP03_CRITERIA,
  ...STEP04_CRITERIA,
  ...STEP05_CRITERIA,
  ...STEP06_CRITERIA,
  ...STEP06C_CRITERIA,
  ...STEP07_CRITERIA,
];

/** Builds a fresh registry populated with the WF-008 spine criteria. */
export function buildWf008AuditRegistry(): CriterionRegistry {
  return new CriterionRegistry().registerAll(WF_008_AUDIT_CRITERIA);
}

// =============================================================================
// MANIFEST — WF-008 backbone (I/O contracts + criteria references by id)
// =============================================================================

/**
 * Contracts designed for a linear fail-closed handoff: each output promises the
 * field required by the immediate downstream input
 * (obligationsMatrix → architectureReport → securityReport → dataReport →
 * governanceFramework → adkarPlan → verdict). Each step's eval gate checks its OWN
 * output, so the single-upstream handoff (a deliberate linearization) does not
 * weaken any criterion — in particular the counter-review gate on STEP-06C.
 */
export const WF_008_AUDIT_MANIFEST: SpineManifest = {
  spineId: "WF-008-audit-backbone",
  steps: [
    {
      stepId: "STEP-01",
      assetId: "AGENT-JURIDIQUE-IA",
      // seed: compliance-audit context = runSpine's initial input.
      output: objSchema(["tier", "obligationsMatrix", "gdprArticles"], {
        // Blocking jur-tier-qualified + jur-tier-not-unacceptable: exact « Unacceptable »
        // gateway value communicated to the agent.
        tier: {
          type: "string",
          description:
            "AI Act tier: « Unacceptable » | « High-risk » | « Limited risk » | « Minimal ». « Unacceptable » halts the audit.",
        },
        obligationsMatrix: arrOf(undefined, { min: 1 }),
        gdprArticles: arrOf(undefined, { min: 1 }),
        // Advisory nudge jur-penalties.
        penalties: { type: "string", description: "Summary of the penalties incurred (up to 7% of worldwide turnover)." },
      }),
      criteriaIds: STEP01_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-02",
      assetId: "AGENT-AI-ARCHITECT",
      input: objSchema(["obligationsMatrix"], { obligationsMatrix: arr }),
      output: objSchema(["architectureReport", "humanOversight"], {
        architectureReport: {
          type: "string",
          description: "Architecture compliance report (transparency, explainability, monitoring, traceability).",
        },
        // Blocking arch-human-oversight: Art. 14 human oversight made explicit.
        humanOversight: {
          type: "string",
          description: "Human-oversight audit (Art. 14: human-in-the-loop, kill switch).",
        },
        // Advisory nudge arch-gaps-list.
        gaps: { type: "array", description: "Architecture gaps vs. AI Act requirements + technical recommendations." },
      }),
      criteriaIds: STEP02_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-03",
      assetId: "AGENT-SECURITE-IA",
      input: objSchema(["architectureReport"], { architectureReport: str }),
      output: objSchema(["securityReport", "owaspLlm", "stride"], {
        securityReport: { type: "string", description: "AI security report + technical controls." },
        // Blocking sec-owasp-llm-10: cover the 10 OWASP LLM categories.
        owaspLlm: arrOf(
          objSchema([], {
            category: { type: "string", description: "OWASP LLM category (LLM01–LLM10)." },
            status: { type: "string", description: "Audit status for the category." },
          }),
          { min: 10 },
        ),
        // Blocking sec-stride-present.
        stride: { type: "string", description: "STRIDE threat model adapted to AI." },
        // Advisory nudge sec-controls-plan.
        controlsPlan: { type: "array", description: "Technical controls plan (Art. 15 robustness, Art. 9 risk mgmt)." },
      }),
      criteriaIds: STEP03_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-04",
      assetId: "AGENT-DATA-ENGINEER",
      input: objSchema(["securityReport"], { securityReport: str }),
      output: objSchema(["dataReport", "lineage", "biasAudit"], {
        dataReport: { type: "string", description: "Data audit report (GDPR legal basis, minimization, transfers)." },
        // Blocking data-lineage-present.
        lineage: { type: "string", description: "End-to-end data lineage mapping." },
        // Blocking data-bias-audit.
        biasAudit: { type: "string", description: "Bias audit: statistical analysis by protected subgroup (Art. 10)." },
        // Advisory nudge data-correction-plan.
        correctionPlan: { type: "array", description: "Data correction plan and target data governance." },
      }),
      criteriaIds: STEP04_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-05",
      assetId: "AGENT-CDO-DIRECTEUR-IA",
      input: objSchema(["dataReport"], { dataReport: str }),
      output: objSchema(["governanceFramework", "raci"], {
        governanceFramework: {
          type: "string",
          description: "Target AI governance framework (ISO 42001 aligned): ethics committee, bodies, gate.",
        },
        // Blocking gov-raci-min-3: RACI covering ≥ 3 roles.
        raci: arrOf(
          objSchema([], {
            role: { type: "string", description: "Role (DPO / CISO / AI Officer / Business / IT)." },
            responsibility: { type: "string", description: "R/A/C/I on AI compliance." },
          }),
          { min: 3 },
        ),
        // Advisory nudge gov-ai-act-lead.
        aiActLead: { type: "string", description: "AI Act lead appointment + articulation with the DPO." },
      }),
      criteriaIds: STEP05_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-06",
      assetId: "AGENT-CHANGE-MANAGER",
      input: objSchema(["governanceFramework"], { governanceFramework: str }),
      output: objSchema(["adkarPlan", "trainingProgram"], {
        adkarPlan: { type: "string", description: "AI compliance ADKAR assessment per population." },
        // Blocking chg-training-program: at least one population covered.
        trainingProgram: arrOf(
          objSchema([], {
            population: { type: "string", description: "AI Act leads / Data teams / Business." },
            content: { type: "string", description: "Training content and objectives." },
          }),
          { min: 1 },
        ),
        // Advisory nudge chg-adoption-kpis.
        adoptionKpis: { type: "array", description: "Governance adoption KPIs with measurable milestones." },
      }),
      criteriaIds: STEP06_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-06C",
      assetId: "AGENT-AUDIT-METHODO-IA",
      input: objSchema(["adkarPlan"], { adkarPlan: str }),
      output: objSchema(["verdict", "biasLog", "exitCriteria"], {
        // Blocking audit-verdict-cleared: exact « cleared » value — the clearance gate.
        verdict: {
          type: "string",
          description:
            "Counter-review verdict: « cleared » (audit cleared for delivery) or « returned » (returned with reservations). Never cleared by default.",
        },
        // Blocking audit-bias-log: the bias review must be documented.
        biasLog: arrOf(
          objSchema([], {
            bias: { type: "string", description: "Cognitive bias (overconfidence, blind spot, minimized tier…)." },
            impact: { type: "string", description: "Impact on the audit + mitigation." },
          }),
          { min: 1 },
        ),
        // Blocking audit-exit-criteria: ISTQB exit criteria applied.
        exitCriteria: arrOf(
          objSchema([], {
            criterion: { type: "string", description: "ISTQB exit criterion (traceability, evidence, reproducibility)." },
            met: { type: "boolean", description: "Whether the criterion is met." },
          }),
          { min: 1 },
        ),
        // Advisory nudge audit-reservations.
        reservations: { type: "array", description: "Documented reservations (if the audit is returned)." },
      }),
      criteriaIds: STEP06C_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-07",
      assetId: "AGENT-REDACTEUR-IA",
      // Depends on the counter-review clearance: without a « cleared » verdict at
      // STEP-06C the spine halts and this step never runs.
      input: objSchema(["verdict"], { verdict: str }),
      output: objSchema(["execSummary", "auditReport", "remediationPlan"], {
        execSummary: {
          type: "string",
          description: "2-page executive summary (compliance verdict + top-5 risks + investment).",
        },
        auditReport: { type: "string", description: "Full compliance audit report, structured by framework." },
        // Blocking red-remediation-plan: at least one remediation item.
        remediationPlan: arrOf(
          objSchema([], {
            item: { type: "string", description: "Remediation action." },
            priority: { type: "string", description: "Priority (impact × effort × legal deadline)." },
          }),
          { min: 1 },
        ),
        // Advisory nudge red-roadmap.
        roadmap: { type: "array", description: "Compliance roadmap with quarterly milestones." },
      }),
      criteriaIds: STEP07_CRITERIA.map((c) => c.id),
    },
  ],
};
