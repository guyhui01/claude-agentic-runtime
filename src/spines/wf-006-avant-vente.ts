/**
 * Real spine — deterministic backbone of WF-006 "Pre-sales / Commercial proposal" (§2.4-B.4).
 *
 * Sourced from the real workflow `claude-agents/workflows/WF-006-avant-vente-proposition-commerciale.md`
 * (v1.0). Backbone = the SEQUENTIAL chain of the 6 core agents (the VEILLE-STRATEGIQUE
 * fork STEP-03B and the JURIDIQUE-IA AI-Act/GDPR gateway STEP-06 are OPTIONAL, so
 * outside the backbone — mirrors the WF-003/004 rule for optional forks):
 *   STEP-01 (CONSULTANT-IA) → STEP-02 (BUSINESS-ANALYST) → STEP-03A (AI-ARCHITECT)
 *   → STEP-04 (CHEF-PROJET-IA) → STEP-05 (FINANCIAL-ANALYST) → STEP-07 (REDACTEUR-IA).
 *
 * Distinctive construct — a GO/NO-GO qualification GATEWAY on STEP-01: the blocking
 * criterion `presales-go` requires `verdict === "GO"`, so a `"NO-GO"` (or a
 * `"conditional GO"`, which a live run cannot auto-resolve) halts the whole workflow
 * at STEP-01 with a documented no-bid decision — fail-closed, the first OPENING
 * business decision gate in the runtime. It is the same value-equality gate FAMILY
 * as WF-003's `fa-decision-go` (financial "Go") and WF-008's tier gateway, on the
 * UNCHANGED linear fail-closed orchestrator (ADR-0007, deterministic ISO 19011
 * criteria, no LLM-as-judge — the agent emits the verdict, a rule enforces it).
 *
 * Numeric DoD counts (4 commercial scenarios, 10-15 pitch slides) are split into a
 * relaxed BLOCKING floor + an ADVISORY at the exact spec number; the JSON schema
 * communicates the ideal to the agent so its output aligns with both.
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
  minArrayLen,
  nonEmptyString,
  isNumber,
} from "./spine-helpers.js";

// --- Local predicates (traced DoD shapes) ------------------------------------

/** `true` if every listed key of `o` holds a non-empty string (BANT sheet). */
function allKeysNonEmptyString(o: unknown, keys: string[]): boolean {
  const r = asRecord(o);
  return keys.every((k) => nonEmptyString(r[k]));
}

/** `true` if every listed key of `o` holds an array (scope IN/OUT). */
function allKeysAreArrays(o: unknown, keys: string[]): boolean {
  const r = asRecord(o);
  return keys.every((k) => Array.isArray(r[k]));
}

// =============================================================================
// CRITERIA — traced to WF-006 (v1.0)
// =============================================================================

/**
 * STEP-01 — CONSULTANT-IA.
 * DoD: BANT qualification sheet · win-probability scoring (0-100%) · risk mapping ·
 * sponsor / decision path · reasoned GO / NO-GO / conditional-GO verdict.
 * condition_passage: GO validated before scoping → the GO/NO-GO GATEWAY.
 */
const STEP01_CRITERIA: Criterion[] = [
  {
    id: "presales-bant",
    description:
      "STEP-01: BANT qualification sheet with the four axes (budget/authority/need/timeline)",
    severity: "blocking",
    check: (o) =>
      allKeysNonEmptyString(asRecord(o)["bant"], ["budget", "authority", "need", "timeline"]),
  },
  {
    id: "presales-win-probability",
    description: "STEP-01: opportunity win probability present and in range 0-100",
    severity: "blocking",
    check: (o) => {
      const v = asRecord(o)["winProbability"];
      return isNumber(v) && v >= 0 && v <= 100;
    },
  },
  {
    id: "presales-go",
    description:
      "STEP-01: GO/NO-GO gateway — reasoned verdict must be « GO » to proceed (NO-GO / conditional GO = documented no-bid, halt)",
    severity: "blocking",
    check: (o) => asRecord(o)["verdict"] === "GO",
  },
  {
    id: "presales-risks",
    description: "STEP-01: commercial and technical risk mapping (non-empty)",
    severity: "advisory",
    check: (o) => nonEmptyArray(asRecord(o)["risks"]),
  },
  {
    id: "presales-sponsor",
    description: "STEP-01: sponsor and client decision path identified",
    severity: "advisory",
    check: (o) => nonEmptyString(asRecord(o)["sponsor"]),
  },
];

/**
 * STEP-02 — BUSINESS-ANALYST.
 * DoD: scoping note (IN/OUT scope) · priority use cases · MoSCoW functional
 * requirements · non-functional requirements · assumptions / uncertainty areas.
 */
const STEP02_CRITERIA: Criterion[] = [
  {
    id: "ba-scope-in-out",
    description: "STEP-02: scoping note with a bounded IN and OUT scope",
    severity: "blocking",
    check: (o) => allKeysAreArrays(asRecord(o)["scope"], ["in", "out"]),
  },
  {
    id: "ba-use-cases",
    description: "STEP-02: mapping of the priority use cases (non-empty)",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["useCases"]),
  },
  {
    id: "ba-requirements-moscow",
    description: "STEP-02: structured functional requirements (MoSCoW) — carried field",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["requirements"]),
  },
  {
    id: "ba-nfr",
    description: "STEP-02: non-functional requirements (performance/security/scalability)",
    severity: "advisory",
    check: (o) => Array.isArray(asRecord(o)["nfr"]),
  },
  {
    id: "ba-assumptions",
    description: "STEP-02: assumptions and uncertainty areas to clear",
    severity: "advisory",
    check: (o) => Array.isArray(asRecord(o)["assumptions"]),
  },
];

/**
 * STEP-03A — AI-ARCHITECT.
 * DoD: target architecture diagram · recommended stack (LLM/RAG/agents/MCP) · make
 * vs. buy trade-offs · monthly operating-cost estimate · architecture risks.
 */
const STEP03_CRITERIA: Criterion[] = [
  {
    id: "arch-diagram",
    description: "STEP-03A: target architecture diagram (Mermaid or structured text)",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["architectureDiagram"]),
  },
  {
    id: "arch-stack-llm",
    description: "STEP-03A: recommended stack making at least the `llm` explicit",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(asRecord(o)["stack"])["llm"]),
  },
  {
    id: "arch-make-vs-buy",
    description: "STEP-03A: make vs. buy trade-offs per component",
    severity: "advisory",
    check: (o) => Array.isArray(asRecord(o)["tradeoffs"]),
  },
  {
    id: "arch-op-cost",
    description: "STEP-03A: monthly operating-cost estimate (LLM tokens, infra)",
    severity: "advisory",
    check: (o) => isNumber(asRecord(o)["monthlyOpCost"]),
  },
  {
    id: "arch-risks",
    description: "STEP-03A: architecture risks and mitigation plan",
    severity: "advisory",
    check: (o) => Array.isArray(asRecord(o)["risks"]),
  },
];

/**
 * STEP-04 — CHEF-PROJET-IA.
 * DoD: detailed WBS · macro Gantt schedule + milestones · person-day estimate per
 * profile · resource workload plan · assumptions / dependencies.
 */
const STEP04_CRITERIA: Criterion[] = [
  {
    id: "pm-wbs",
    description: "STEP-04: detailed WBS per work package (non-empty)",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["wbs"]),
  },
  {
    id: "pm-schedule",
    description: "STEP-04: macro Gantt schedule with key milestones",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["schedule"]),
  },
  {
    id: "pm-person-days",
    description: "STEP-04: person-day estimate per package/profile (non-empty) — carried field",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["personDays"]),
  },
  {
    id: "pm-workload",
    description: "STEP-04: resource workload plan over the project duration",
    severity: "advisory",
    check: (o) => nonEmptyString(asRecord(o)["workloadPlan"]),
  },
  {
    id: "pm-assumptions",
    description: "STEP-04: assumptions, dependencies, calendar constraints",
    severity: "advisory",
    check: (o) => Array.isArray(asRecord(o)["assumptions"]),
  },
];

/**
 * STEP-05 — FINANCIAL-ANALYST.
 * DoD: detailed costing grid (person-days × day rate) · selling price + margin ·
 * commercial scenarios (fixed/T&M/outcome/hybrid) · prospect ROI · financial terms.
 */
const STEP05_CRITERIA: Criterion[] = [
  {
    id: "fin-costing-grid",
    description: "STEP-05: detailed costing grid (person-days × day rate per profile)",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["costingGrid"]),
  },
  {
    id: "fin-price",
    description: "STEP-05: proposed selling price (quantified)",
    severity: "blocking",
    check: (o) => isNumber(asRecord(o)["sellingPrice"]),
  },
  {
    id: "fin-scenarios",
    description: "STEP-05: commercial scenarios (fixed price / T&M / outcome / hybrid) — non-empty",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["commercialScenarios"]),
  },
  {
    id: "fin-scenarios-full",
    description: "STEP-05: the full range of commercial scenarios (ideal ≥ 3)",
    severity: "advisory",
    check: (o) => minArrayLen(asRecord(o)["commercialScenarios"], 3),
  },
  {
    id: "fin-prospect-roi",
    description: "STEP-05: estimated prospect ROI (business gain vs. engagement cost)",
    severity: "advisory",
    check: (o) => nonEmptyString(asRecord(o)["prospectRoi"]),
  },
];

/**
 * STEP-07 — REDACTEUR-IA.
 * DoD: 1-page executive summary · full commercial proposal (20-40 pages) · pitch
 * deck (10-15 slides) if oral · anticipated Q&A · appendices.
 */
const STEP07_CRITERIA: Criterion[] = [
  {
    id: "red-exec-summary",
    description: "STEP-07: 1-page executive summary (context/value/price/schedule)",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["execSummary"]),
  },
  {
    id: "red-proposal",
    description: "STEP-07: complete commercial proposal (20-40 pages) present",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["proposal"]),
  },
  {
    id: "red-anticipated-qa",
    description: "STEP-07: anticipated Q&A with prepared answers",
    severity: "advisory",
    check: (o) => Array.isArray(asRecord(o)["anticipatedQa"]),
  },
  {
    id: "red-pitch-deck",
    description: "STEP-07: pitch deck (ideal 10-15 slides) if an oral defense is planned",
    severity: "advisory",
    check: (o) => minArrayLen(asRecord(o)["pitchDeck"], 10),
  },
];

/** All criteria of the WF-006 spine (backbone order). */
export const WF_006_AVANT_VENTE_CRITERIA: Criterion[] = [
  ...STEP01_CRITERIA,
  ...STEP02_CRITERIA,
  ...STEP03_CRITERIA,
  ...STEP04_CRITERIA,
  ...STEP05_CRITERIA,
  ...STEP07_CRITERIA,
];

/** Builds a fresh registry populated with the WF-006 spine criteria. */
export function buildWf006AvantVenteRegistry(): CriterionRegistry {
  return new CriterionRegistry().registerAll(WF_006_AVANT_VENTE_CRITERIA);
}

// =============================================================================
// MANIFEST — WF-006 backbone (I/O contracts + criteria references by id)
// =============================================================================

/**
 * Contracts designed for a linear fail-closed handoff: each output promises the
 * field required by the immediate downstream input (WF-003/004 idiom — a single
 * carried field per hop): qualificationSheet → requirements → architectureDiagram →
 * personDays → sellingPrice. REDACTEUR (STEP-07) receives the immediate upstream
 * field and synthesizes all prior deliverables from its prose (WF-003 precedent).
 */
export const WF_006_AVANT_VENTE_MANIFEST: SpineManifest = {
  spineId: "WF-006-avant-vente-backbone",
  steps: [
    {
      stepId: "STEP-01",
      assetId: "AGENT-CONSULTANT-IA",
      // seed: pre-sales context = runSpine's initial input.
      output: objSchema(["bant", "winProbability", "verdict", "qualificationSheet"], {
        // Blocking presales-bant: the four axes must be non-empty strings.
        bant: objSchema(["budget", "authority", "need", "timeline"], {
          budget: str,
          authority: str,
          need: str,
          timeline: str,
        }),
        winProbability: {
          type: "number",
          description: "Win probability (0-100). 0 ≤ p ≤ 100 required.",
        },
        // Blocking presales-go: the GO/NO-GO gateway. Exact value « GO » required.
        verdict: {
          type: "string",
          description:
            "Reasoned verdict: « GO » | « NO-GO » | « conditional GO ». « GO » required to proceed; a NO-GO or conditional GO is a documented no-bid and halts the workflow.",
        },
        // Carried field for STEP-02.
        qualificationSheet: {
          type: "string",
          description: "Synthesized qualification sheet passed downstream to scoping.",
        },
        // Advisory nudges presales-risks / presales-sponsor.
        risks: { type: "array", description: "Commercial and technical risk mapping." },
        sponsor: { type: "string", description: "Sponsor and client decision path." },
      }),
      criteriaIds: STEP01_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-02",
      assetId: "AGENT-BUSINESS-ANALYST",
      input: objSchema(["qualificationSheet"], { qualificationSheet: str }),
      output: objSchema(["scope", "useCases", "requirements"], {
        // Blocking ba-scope-in-out: IN and OUT scope as arrays.
        scope: objSchema(["in", "out"], { in: arr, out: arr }),
        useCases: arrOf(undefined, { min: 1 }),
        // Blocking ba-requirements-moscow: carried field for STEP-03A.
        requirements: arrOf(
          objSchema([], {
            label: { type: "string", description: "Requirement." },
            priority: { type: "string", description: "MoSCoW: Must | Should | Could | Won't." },
          }),
          { min: 1 },
        ),
        // Advisory nudges ba-nfr / ba-assumptions.
        nfr: { type: "array", description: "Non-functional requirements." },
        assumptions: { type: "array", description: "Assumptions and uncertainty areas." },
      }),
      criteriaIds: STEP02_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-03A",
      assetId: "AGENT-AI-ARCHITECT",
      input: objSchema(["requirements"], { requirements: arr }),
      output: objSchema(["architectureDiagram", "stack"], {
        // Blocking arch-diagram: carried field for STEP-04.
        architectureDiagram: {
          type: "string",
          description: "Target architecture diagram (Mermaid or structured text).",
        },
        // Blocking arch-stack-llm: the `llm` must be made explicit.
        stack: objSchema(["llm"], {
          llm: { type: "string", description: "Selected LLM model." },
          rag: { type: "string", description: "RAG / retrieval approach." },
          agents: { type: "string", description: "Agent / MCP framework." },
        }),
        // Advisory nudges arch-make-vs-buy / arch-op-cost / arch-risks.
        tradeoffs: { type: "array", description: "Make vs. buy trade-offs per component." },
        monthlyOpCost: { type: "number", description: "Monthly operating-cost estimate." },
        risks: { type: "array", description: "Architecture risks and mitigation plan." },
      }),
      criteriaIds: STEP03_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-04",
      assetId: "AGENT-CHEF-PROJET-IA",
      input: objSchema(["architectureDiagram"], { architectureDiagram: str }),
      output: objSchema(["wbs", "schedule", "personDays"], {
        wbs: arrOf(undefined, { min: 1 }),
        schedule: { type: "string", description: "Macro Gantt schedule with key milestones." },
        // Blocking pm-person-days: carried field for STEP-05.
        personDays: arrOf(
          objSchema([], {
            profile: { type: "string", description: "PO | AI Architect | Dev | Data | MLOps." },
            days: { type: "number", description: "Person-days for the profile." },
          }),
          { min: 1 },
        ),
        // Advisory nudges pm-workload / pm-assumptions.
        workloadPlan: { type: "string", description: "Resource workload plan." },
        assumptions: { type: "array", description: "Assumptions, dependencies, constraints." },
      }),
      criteriaIds: STEP04_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-05",
      assetId: "AGENT-FINANCIAL-ANALYST",
      input: objSchema(["personDays"], { personDays: arr }),
      output: objSchema(["costingGrid", "sellingPrice", "commercialScenarios"], {
        costingGrid: arrOf(
          objSchema([], {
            profile: { type: "string", description: "Resource profile." },
            days: { type: "number", description: "Person-days." },
            dayRate: { type: "number", description: "Day rate for the profile." },
          }),
          { min: 1 },
        ),
        sellingPrice: { type: "number", description: "Proposed selling price (quantified)." },
        // Blocking fin-scenarios; the schema communicates the 4-scenario ideal (advisory).
        commercialScenarios: arrOf(
          objSchema([], {
            type: { type: "string", description: "fixed price | T&M | outcome | hybrid." },
            price: { type: "number", description: "Scenario price." },
          }),
          { min: 3 },
        ),
        // Advisory nudge fin-prospect-roi.
        prospectRoi: { type: "string", description: "Estimated prospect ROI." },
        margin: { type: "number", description: "Computed margin." },
      }),
      criteriaIds: STEP05_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-07",
      assetId: "AGENT-REDACTEUR-IA",
      input: objSchema(["sellingPrice"], { sellingPrice: num }),
      output: objSchema(["execSummary", "proposal"], {
        execSummary: {
          type: "string",
          description: "1-page executive summary (context/value/price/schedule).",
        },
        proposal: { type: "string", description: "Complete commercial proposal (20-40 pages)." },
        // Advisory nudges red-anticipated-qa / red-pitch-deck (10-15 slides).
        anticipatedQa: { type: "array", description: "Anticipated Q&A with prepared answers." },
        pitchDeck: arrOf(
          objSchema([], { title: { type: "string", description: "Slide title." } }),
          { min: 10, max: 15 },
        ),
      }),
      criteriaIds: STEP07_CRITERIA.map((c) => c.id),
    },
  ],
};
