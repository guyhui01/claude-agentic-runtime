/**
 * Real spine — deterministic backbone of WF-002 "SAFe Agile Delivery" (§2.4-B.4).
 *
 * Sourced from the real workflow `claude-agents/workflows/WF-002-delivery-safe.md` (v1.1).
 * Backbone = the SEQUENTIAL spine, excluding parallel/conditional steps:
 *   STEP-01 (PRODUCT-MANAGER-SAFE) → STEP-02 (RELEASE-TRAIN-ENGINEER)
 *   → STEP-03 (PO-SAFE) → STEP-04 (SCRUM-MASTER) → STEP-06 (CHEF-PROJET-IA).
 * Excluded from the backbone: STEP-05 (QA-AGILE, "possibly parallel with STEP-04") and
 * STEP-07 (CHANGE-MANAGER, conditional branch "major change?").
 *
 * ADR compliance identical to WF-001 (ADR-0007 runtime manifest, deterministic
 * ISO 19011 criteria). Each criterion traces an `output_attendu` /
 * `condition_passage` from a WF-002 step sheet.
 *
 * `assetId` values expected as "agent" assets in the pinned catalog's sidecar.
 */

import type { SpineManifest } from "../manifest/types.js";
import type { Criterion } from "../eval/types.js";
import { CriterionRegistry } from "../eval/criteria-registry.js";
import {
  objSchema,
  arr,
  arrOf,
  obj,
  asRecord,
  nonEmptyArray,
  arrayLenBetween,
  nonEmptyString,
  isNumber,
  numberAtLeast,
} from "./spine-helpers.js";

// =============================================================================
// CRITERIA — traced to WF-002 (v1.1)
// =============================================================================

/**
 * STEP-01 — AGENT-PRODUCT-MANAGER-SAFE.
 * DoD: PI vision board · top 10 WSJF-prioritized features · Lean Business Case.
 */
const STEP01_CRITERIA: Criterion[] = [
  {
    id: "pm-vision-board-present",
    description: "STEP-01: PI vision board non-empty",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["visionBoard"]),
  },
  {
    id: "pm-features-wsjf-1-10",
    description: "STEP-01: 1 to 10 prioritized features, each with a WSJF score (number)",
    severity: "blocking",
    check: (o) => {
      const f = asRecord(o)["featuresWsjf"];
      if (!arrayLenBetween(f, 1, 10)) return false;
      return (f as unknown[]).every((x) => isNumber(asRecord(x)["wsjf"]));
    },
  },
  {
    id: "pm-lean-business-case",
    description: "STEP-01: Lean Business Case present for the major features",
    severity: "advisory",
    check: (o) => nonEmptyString(asRecord(o)["leanBusinessCase"]),
  },
];

/**
 * STEP-02 — AGENT-RELEASE-TRAIN-ENGINEER.
 * DoD: Program Board (dependencies) · ROAM risks · confidence vote (> 3.5/5).
 */
const STEP02_CRITERIA: Criterion[] = [
  {
    id: "rte-program-board-non-vide",
    description: "STEP-02: Program Board with dependencies non-empty",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["programBoard"]),
  },
  {
    id: "rte-vote-confiance-seuil",
    description: "STEP-02: passing condition — confidence vote > 3.5/5",
    severity: "blocking",
    check: (o) => numberAtLeast(asRecord(o)["voteConfiance"], 3.5),
  },
  {
    id: "rte-roam-risks-present",
    description: "STEP-02: ROAM risks documented (array present)",
    severity: "advisory",
    check: (o) => Array.isArray(asRecord(o)["roamRisks"]),
  },
];

/**
 * STEP-03 — AGENT-PO-SAFE.
 * DoD: 3-5 SMART PI Objectives · sprint 1 backlog of 5-10 US · WSJF per feature.
 */
const STEP03_CRITERIA: Criterion[] = [
  {
    id: "posafe-pi-objectives-3-5",
    description: "STEP-03: 3 to 5 PI Objectives (SMART)",
    severity: "blocking",
    check: (o) => arrayLenBetween(asRecord(o)["piObjectives"], 3, 5),
  },
  {
    id: "posafe-backlog-sprint-5-10",
    description: "STEP-03: sprint 1 backlog of 5 to 10 User Stories",
    severity: "blocking",
    check: (o) => arrayLenBetween(asRecord(o)["backlogSprint"], 5, 10),
  },
  {
    id: "posafe-wsjf-par-feature",
    description: "STEP-03: each backlog US carries a WSJF score (number)",
    severity: "advisory",
    check: (o) => {
      const b = asRecord(o)["backlogSprint"];
      if (!Array.isArray(b)) return false;
      return b.every((us) => isNumber(asRecord(us)["wsjf"]));
    },
  },
];

/**
 * STEP-04 — AGENT-SCRUM-MASTER.
 * DoD: single Sprint Goal · validated sprint plan (US forecast + story points) ·
 * impediments listed.
 */
const STEP04_CRITERIA: Criterion[] = [
  {
    id: "sm-sprint-goal-unique",
    description: "STEP-04: single Sprint Goal non-empty",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["sprintGoal"]),
  },
  {
    id: "sm-sprint-plan-forecast",
    description:
      "STEP-04: sprint plan with forecast — `usEngagees` non-empty AND `storyPoints` (number)",
    severity: "blocking",
    check: (o) => {
      const p = asRecord(asRecord(o)["sprintPlan"]);
      return nonEmptyArray(p["usEngagees"]) && isNumber(p["storyPoints"]);
    },
  },
  {
    id: "sm-impediments-listes",
    description: "STEP-04: sprint 1 impediments listed (array present)",
    severity: "advisory",
    check: (o) => Array.isArray(asRecord(o)["impediments"]),
  },
];

/**
 * STEP-06 — AGENT-CHEF-PROJET-IA.
 * DoD: PI dashboard (objectives/capacity/progress/risks) · 1-page CODIR note ·
 * EVM (CPI/SPI).
 */
const STEP06_CRITERIA: Criterion[] = [
  {
    id: "cp-note-codir-presente",
    description: "STEP-06: CODIR note (1 page) non-empty",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["noteCodir"]),
  },
  {
    id: "cp-dashboard-avancement-risques",
    description: "STEP-06: PI dashboard carrying at least `avancement` AND `risques`",
    severity: "blocking",
    check: (o) => {
      const d = asRecord(asRecord(o)["dashboard"]);
      return d["avancement"] !== undefined && d["risques"] !== undefined;
    },
  },
  {
    id: "cp-evm-cpi-spi",
    description: "STEP-06: sprint EVM with CPI and SPI (numbers)",
    severity: "advisory",
    check: (o) => {
      const e = asRecord(asRecord(o)["evm"]);
      return isNumber(e["cpi"]) && isNumber(e["spi"]);
    },
  },
];

/** All criteria of the WF-002 spine (backbone order). */
export const WF_002_DELIVERY_CRITERIA: Criterion[] = [
  ...STEP01_CRITERIA,
  ...STEP02_CRITERIA,
  ...STEP03_CRITERIA,
  ...STEP04_CRITERIA,
  ...STEP06_CRITERIA,
];

/** Builds a fresh registry populated with the WF-002 spine criteria. */
export function buildWf002DeliveryRegistry(): CriterionRegistry {
  return new CriterionRegistry().registerAll(WF_002_DELIVERY_CRITERIA);
}

// =============================================================================
// MANIFEST — WF-002 backbone (I/O contracts + criteria references by id)
// =============================================================================

/**
 * Contracts designed for a linear fail-closed handoff: each step's output
 * promises the field required by the immediate downstream input
 * (featuresWsjf → programBoard → backlogSprint → sprintPlan).
 */
export const WF_002_DELIVERY_MANIFEST: SpineManifest = {
  spineId: "WF-002-delivery-backbone",
  steps: [
    {
      stepId: "STEP-01",
      assetId: "AGENT-PRODUCT-MANAGER-SAFE",
      // seed: ART context = runSpine's initial input.
      // Tightened (cf. WF-001 lesson): the injected schema COMMUNICATES the contract
      // the gate verifies — 1–10 features, each with a WSJF (number).
      output: objSchema(["visionBoard", "featuresWsjf"], {
        visionBoard: { type: "string", description: "Vision board PI (synthèse 1 page)." },
        featuresWsjf: arrOf(
          objSchema(["wsjf"], {
            feature: { type: "string", description: "Intitulé de la feature." },
            wsjf: { type: "number", description: "Score WSJF (Weighted Shortest Job First)." },
          }),
          { min: 1, max: 10 },
        ),
        // Advisory nudge pm-lean-business-case (no hard constraint).
        leanBusinessCase: { type: "string", description: "Lean Business Case des features majeures." },
      }),
      criteriaIds: STEP01_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-02",
      assetId: "AGENT-RELEASE-TRAIN-ENGINEER",
      input: objSchema(["featuresWsjf"], { featuresWsjf: arr }),
      output: objSchema(["programBoard", "voteConfiance"], {
        programBoard: arrOf(
          objSchema([], {
            from: { type: "string", description: "Équipe/feature source de la dépendance." },
            to: { type: "string", description: "Équipe/feature cible." },
            dep: { type: "string", description: "Nature de la dépendance." },
          }),
          { min: 1 },
        ),
        // Blocking threshold rte-vote-confiance-seuil communicated in the description.
        voteConfiance: {
          type: "number",
          description: "Vote de confiance ART sur 5 ; doit être > 3.5 pour passer.",
        },
        // Advisory nudge rte-roam-risks-present.
        roamRisks: { type: "array", description: "Risques ROAM (Resolved/Owned/Accepted/Mitigated)." },
      }),
      criteriaIds: STEP02_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-03",
      assetId: "AGENT-PO-SAFE",
      input: objSchema(["programBoard"], { programBoard: arr }),
      output: objSchema(["piObjectives", "backlogSprint"], {
        piObjectives: arrOf(
          { type: "string", description: "PI Objective SMART." },
          { min: 3, max: 5 },
        ),
        backlogSprint: arrOf(
          objSchema([], {
            statement: { type: "string", description: "User Story du sprint 1." },
            // Advisory nudge posafe-wsjf-par-feature (not required).
            wsjf: { type: "number", description: "Score WSJF de la US." },
          }),
          { min: 5, max: 10 },
        ),
      }),
      criteriaIds: STEP03_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-04",
      assetId: "AGENT-SCRUM-MASTER",
      input: objSchema(["backlogSprint"], { backlogSprint: arr }),
      output: objSchema(["sprintGoal", "sprintPlan"], {
        sprintGoal: { type: "string", description: "Sprint Goal unique." },
        // Blocking forecast: usEngagees (non-empty) + storyPoints (number).
        sprintPlan: objSchema(["usEngagees", "storyPoints"], {
          usEngagees: arrOf({ type: "string", description: "US engagée au sprint 1." }, { min: 1 }),
          storyPoints: { type: "number", description: "Story points engagés (forecast)." },
        }),
        // Advisory nudge sm-impediments-listes.
        impediments: { type: "array", description: "Impediments du sprint 1." },
      }),
      criteriaIds: STEP04_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-06",
      assetId: "AGENT-CHEF-PROJET-IA",
      input: objSchema(["sprintPlan"], { sprintPlan: obj }),
      output: objSchema(["noteCodir", "dashboard"], {
        noteCodir: { type: "string", description: "Note CODIR (1 page)." },
        // Blocking cp-dashboard-avancement-risques: avancement AND risques present.
        dashboard: objSchema(["avancement", "risques"], {
          avancement: { type: "string", description: "Avancement du PI (ex. « 32% »)." },
          risques: { type: "array", description: "Risques suivis." },
        }),
        // Advisory nudge cp-evm-cpi-spi (cpi/spi not required so as not to block).
        evm: objSchema([], {
          cpi: { type: "number", description: "Cost Performance Index." },
          spi: { type: "number", description: "Schedule Performance Index." },
        }),
      }),
      criteriaIds: STEP06_CRITERIA.map((c) => c.id),
    },
  ],
};
