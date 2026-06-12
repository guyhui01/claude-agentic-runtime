/**
 * Spine réelle — backbone déterministe de WF-002 « Delivery Agile SAFe » (§2.4-B.4).
 *
 * Sourcé du vrai workflow `claude-agents/workflows/WF-002-delivery-safe.md` (v1.1).
 * Backbone = colonne vertébrale SÉQUENTIELLE, hors étapes parallèles/conditionnelles :
 *   STEP-01 (PRODUCT-MANAGER-SAFE) → STEP-02 (RELEASE-TRAIN-ENGINEER)
 *   → STEP-03 (PO-SAFE) → STEP-04 (SCRUM-MASTER) → STEP-06 (CHEF-PROJET-IA).
 * Exclus du backbone : STEP-05 (QA-AGILE, « parallèle possible avec STEP-04 ») et
 * STEP-07 (CHANGE-MANAGER, branche conditionnelle « changement majeur ? »).
 *
 * Conformité ADR identique à WF-001 (ADR-0007 manifeste runtime, critères
 * déterministes ISO 19011). Chaque critère trace un `output_attendu` /
 * `condition_passage` d'une fiche d'étape de WF-002.
 *
 * `assetId` attendus comme assets « agent » dans le sidecar du catalogue épinglé.
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
// CRITÈRES — tracés à WF-002 (v1.1)
// =============================================================================

/**
 * STEP-01 — AGENT-PRODUCT-MANAGER-SAFE.
 * DoD : vision board PI · top 10 features priorisées WSJF · Lean Business Case.
 */
const STEP01_CRITERIA: Criterion[] = [
  {
    id: "pm-vision-board-present",
    description: "STEP-01 : vision board PI non vide",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["visionBoard"]),
  },
  {
    id: "pm-features-wsjf-1-10",
    description: "STEP-01 : 1 à 10 features priorisées, chacune avec score WSJF (number)",
    severity: "blocking",
    check: (o) => {
      const f = asRecord(o)["featuresWsjf"];
      if (!arrayLenBetween(f, 1, 10)) return false;
      return (f as unknown[]).every((x) => isNumber(asRecord(x)["wsjf"]));
    },
  },
  {
    id: "pm-lean-business-case",
    description: "STEP-01 : Lean Business Case présent pour les features majeures",
    severity: "advisory",
    check: (o) => nonEmptyString(asRecord(o)["leanBusinessCase"]),
  },
];

/**
 * STEP-02 — AGENT-RELEASE-TRAIN-ENGINEER.
 * DoD : Program Board (dépendances) · ROAM risks · vote de confiance (> 3.5/5).
 */
const STEP02_CRITERIA: Criterion[] = [
  {
    id: "rte-program-board-non-vide",
    description: "STEP-02 : Program Board avec dépendances non vide",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["programBoard"]),
  },
  {
    id: "rte-vote-confiance-seuil",
    description: "STEP-02 : condition de passage — vote de confiance > 3.5/5",
    severity: "blocking",
    check: (o) => numberAtLeast(asRecord(o)["voteConfiance"], 3.5),
  },
  {
    id: "rte-roam-risks-present",
    description: "STEP-02 : ROAM risks documentés (tableau présent)",
    severity: "advisory",
    check: (o) => Array.isArray(asRecord(o)["roamRisks"]),
  },
];

/**
 * STEP-03 — AGENT-PO-SAFE.
 * DoD : 3-5 PI Objectives SMART · backlog sprint 1 de 5-10 US · WSJF par feature.
 */
const STEP03_CRITERIA: Criterion[] = [
  {
    id: "posafe-pi-objectives-3-5",
    description: "STEP-03 : 3 à 5 PI Objectives (SMART)",
    severity: "blocking",
    check: (o) => arrayLenBetween(asRecord(o)["piObjectives"], 3, 5),
  },
  {
    id: "posafe-backlog-sprint-5-10",
    description: "STEP-03 : backlog sprint 1 de 5 à 10 User Stories",
    severity: "blocking",
    check: (o) => arrayLenBetween(asRecord(o)["backlogSprint"], 5, 10),
  },
  {
    id: "posafe-wsjf-par-feature",
    description: "STEP-03 : chaque US du backlog porte un score WSJF (number)",
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
 * DoD : Sprint Goal unique · sprint plan validé (forecast US + story points) ·
 * impediments listés.
 */
const STEP04_CRITERIA: Criterion[] = [
  {
    id: "sm-sprint-goal-unique",
    description: "STEP-04 : Sprint Goal unique non vide",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["sprintGoal"]),
  },
  {
    id: "sm-sprint-plan-forecast",
    description:
      "STEP-04 : sprint plan avec forecast — `usEngagees` non vide ET `storyPoints` (number)",
    severity: "blocking",
    check: (o) => {
      const p = asRecord(asRecord(o)["sprintPlan"]);
      return nonEmptyArray(p["usEngagees"]) && isNumber(p["storyPoints"]);
    },
  },
  {
    id: "sm-impediments-listes",
    description: "STEP-04 : impediments sprint 1 listés (tableau présent)",
    severity: "advisory",
    check: (o) => Array.isArray(asRecord(o)["impediments"]),
  },
];

/**
 * STEP-06 — AGENT-CHEF-PROJET-IA.
 * DoD : dashboard PI (objectifs/capacité/avancement/risques) · note CODIR 1 page ·
 * EVM (CPI/SPI).
 */
const STEP06_CRITERIA: Criterion[] = [
  {
    id: "cp-note-codir-presente",
    description: "STEP-06 : note CODIR (1 page) non vide",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["noteCodir"]),
  },
  {
    id: "cp-dashboard-avancement-risques",
    description: "STEP-06 : dashboard PI portant au moins `avancement` ET `risques`",
    severity: "blocking",
    check: (o) => {
      const d = asRecord(asRecord(o)["dashboard"]);
      return d["avancement"] !== undefined && d["risques"] !== undefined;
    },
  },
  {
    id: "cp-evm-cpi-spi",
    description: "STEP-06 : EVM sprint avec CPI et SPI (numbers)",
    severity: "advisory",
    check: (o) => {
      const e = asRecord(asRecord(o)["evm"]);
      return isNumber(e["cpi"]) && isNumber(e["spi"]);
    },
  },
];

/** Tous les critères de la spine WF-002 (ordre du backbone). */
export const WF_002_DELIVERY_CRITERIA: Criterion[] = [
  ...STEP01_CRITERIA,
  ...STEP02_CRITERIA,
  ...STEP03_CRITERIA,
  ...STEP04_CRITERIA,
  ...STEP06_CRITERIA,
];

/** Construit un registre frais peuplé des critères de la spine WF-002. */
export function buildWf002DeliveryRegistry(): CriterionRegistry {
  return new CriterionRegistry().registerAll(WF_002_DELIVERY_CRITERIA);
}

// =============================================================================
// MANIFESTE — backbone WF-002 (contrats I/O + références de critères par id)
// =============================================================================

/**
 * Contrats conçus pour un handoff linéaire fail-closed : la sortie de chaque
 * étape promet le champ requis par l'entrée de l'aval immédiat
 * (featuresWsjf → programBoard → backlogSprint → sprintPlan).
 */
export const WF_002_DELIVERY_MANIFEST: SpineManifest = {
  spineId: "WF-002-delivery-backbone",
  steps: [
    {
      stepId: "STEP-01",
      assetId: "AGENT-PRODUCT-MANAGER-SAFE",
      // amorce : contexte ART = entrée initiale de runSpine.
      // Resserré (cf. leçon WF-001) : le schéma injecté COMMUNIQUE le contrat
      // que la gate vérifie — 1–10 features, chacune avec un WSJF (number).
      output: objSchema(["visionBoard", "featuresWsjf"], {
        visionBoard: { type: "string", description: "Vision board PI (synthèse 1 page)." },
        featuresWsjf: arrOf(
          objSchema(["wsjf"], {
            feature: { type: "string", description: "Intitulé de la feature." },
            wsjf: { type: "number", description: "Score WSJF (Weighted Shortest Job First)." },
          }),
          { min: 1, max: 10 },
        ),
        // Nudge advisory pm-lean-business-case (pas de contrainte dure).
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
        // Seuil bloquant rte-vote-confiance-seuil communiqué en description.
        voteConfiance: {
          type: "number",
          description: "Vote de confiance ART sur 5 ; doit être > 3.5 pour passer.",
        },
        // Nudge advisory rte-roam-risks-present.
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
            // Nudge advisory posafe-wsjf-par-feature (non requis).
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
        // Forecast bloquant : usEngagees (non vide) + storyPoints (number).
        sprintPlan: objSchema(["usEngagees", "storyPoints"], {
          usEngagees: arrOf({ type: "string", description: "US engagée au sprint 1." }, { min: 1 }),
          storyPoints: { type: "number", description: "Story points engagés (forecast)." },
        }),
        // Nudge advisory sm-impediments-listes.
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
        // Bloquant cp-dashboard-avancement-risques : avancement ET risques présents.
        dashboard: objSchema(["avancement", "risques"], {
          avancement: { type: "string", description: "Avancement du PI (ex. « 32% »)." },
          risques: { type: "array", description: "Risques suivis." },
        }),
        // Nudge advisory cp-evm-cpi-spi (cpi/spi non requis pour ne pas bloquer).
        evm: objSchema([], {
          cpi: { type: "number", description: "Cost Performance Index." },
          spi: { type: "number", description: "Schedule Performance Index." },
        }),
      }),
      criteriaIds: STEP06_CRITERIA.map((c) => c.id),
    },
  ],
};
