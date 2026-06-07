/**
 * Spine réelle — backbone déterministe de WF-001 « Cadrage Produit IA » (§2.4-B.3).
 *
 * Premier manifeste de spine sourcé d'un VRAI workflow du catalogue `claude-agents`
 * (`workflows/WF-001-cadrage-produit-ia.md`, v1.2), par opposition aux fixtures
 * génériques de `test/manifest.test.ts`. C'est l'intrant « manifeste réel + vrais
 * critères » exigé par NEXT_STEPS §2.4-B.3 avant le branchement de `query()`.
 *
 * Périmètre = la COLONNE VERTÉBRALE séquentielle de WF-001, c.-à-d. ses étapes
 * non conditionnelles :
 *   STEP-01 (BUSINESS-ANALYST) → STEP-03 (PO-SCRUM) → STEP-04 (QA-AGILE).
 * STEP-02 (UX-DESIGNER) et STEP-05/06 (CHANGE-MANAGER / PRODUCT-MANAGER-SAFE) sont
 * des branches conditionnelles (`condition_activation` dans le workflow) : hors
 * backbone, elles seront modélisées comme variantes ultérieurement (YAGNI ici).
 *
 * Conformité ADR :
 *   - ADR-0007 : le manifeste (contrats = donnée, critères = code référencés par id)
 *     est propriété du RUNTIME ; il croise le sidecar (descriptif, ADR-0003) au
 *     chargement via `loadSpine`.
 *   - Critères DÉTERMINISTES (pas de LLM-as-judge) : reproductibles et auditables
 *     (ISO 19011). Chacun trace un point de `output_attendu` / `condition_passage`
 *     d'une fiche d'étape de WF-001.
 *
 * Les `assetId` (`AGENT-BUSINESS-ANALYST`, `AGENT-PO-SCRUM`, `AGENT-QA-AGILE`)
 * doivent exister comme assets « agent » dans le sidecar du catalogue épinglé.
 * Au run live (§2.4-B.3) ce sidecar provient de `claude-agents` (générateur §2.3) ;
 * en attendant, `test/spine-wf-001.test.ts` fournit un sidecar intérimaire.
 */

import type { SpineManifest } from "../manifest/types.js";
import type { JsonSchema } from "../handoff/types.js";
import type { Criterion } from "../eval/types.js";
import { CriterionRegistry } from "../eval/criteria-registry.js";

// --- Helpers de schéma (JSON Schema 2020-12, compatibles ajv strict) ---------

/** Fabrique un schéma objet `{ type, required, properties }`. */
function objSchema(
  required: string[],
  properties: Record<string, JsonSchema>,
): JsonSchema {
  return { type: "object", required, properties };
}
const arr: JsonSchema = { type: "array" };
const str: JsonSchema = { type: "string" };

// --- Helpers de prédicat (lecture défensive de la sortie `unknown`) ----------

function asRecord(o: unknown): Record<string, unknown> {
  return (o ?? {}) as Record<string, unknown>;
}
function nonEmptyArray(v: unknown): v is unknown[] {
  return Array.isArray(v) && v.length > 0;
}
function arrayLenBetween(v: unknown, min: number, max: number): boolean {
  return Array.isArray(v) && v.length >= min && v.length <= max;
}
function nonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

// =============================================================================
// CRITÈRES — un par exigence de DoD, tracés à WF-001 (v1.2)
// =============================================================================

/**
 * STEP-01 — AGENT-BUSINESS-ANALYST.
 * DoD (output_attendu) : carte des besoins · parties prenantes avec rôles ·
 * périmètre in/out · (AS-IS si applicable) · questions ouvertes.
 */
const STEP01_CRITERIA: Criterion[] = [
  {
    id: "ba-besoins-non-vide",
    description: "STEP-01 : carte des besoins (job-to-be-done) non vide",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["besoins"]),
  },
  {
    id: "ba-parties-prenantes-non-vide",
    description: "STEP-01 : liste des parties prenantes non vide",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["partiesPrenantes"]),
  },
  {
    id: "ba-perimetre-in-out",
    description:
      "STEP-01 : périmètre fonctionnel explicite — `in` non vide ET `out` présent (in/out scope)",
    severity: "blocking",
    check: (o) => {
      const p = asRecord(asRecord(o)["perimetre"]);
      return nonEmptyArray(p["in"]) && Array.isArray(p["out"]);
    },
  },
  {
    id: "ba-questions-ouvertes-presentes",
    description:
      "STEP-01 : questions ouvertes listées (tableau présent, même vide si brief limpide)",
    severity: "advisory",
    check: (o) => Array.isArray(asRecord(o)["questionsOuvertes"]),
  },
];

/**
 * STEP-03 — AGENT-PO-SCRUM.
 * DoD (output_attendu) : 8 à 15 User Stories · chaque US avec priorité + estimation
 * (story points) + DoD · backlog ordonné · épics de regroupement (3-5 max).
 */
const STEP03_CRITERIA: Criterion[] = [
  {
    id: "po-backlog-8-15",
    description: "STEP-03 : backlog de 8 à 15 User Stories",
    severity: "blocking",
    check: (o) => arrayLenBetween(asRecord(o)["backlog"], 8, 15),
  },
  {
    id: "po-us-champs-requis",
    description:
      "STEP-03 : chaque US porte statement + priorite + estimation (number) + dod",
    severity: "blocking",
    check: (o) => {
      const backlog = asRecord(o)["backlog"];
      if (!nonEmptyArray(backlog)) return false;
      return backlog.every((us) => {
        const u = asRecord(us);
        return (
          nonEmptyString(u["statement"]) &&
          u["priorite"] !== undefined &&
          typeof u["estimation"] === "number" &&
          nonEmptyString(u["dod"])
        );
      });
    },
  },
  {
    id: "po-epics-3-5",
    description: "STEP-03 : 3 à 5 épics de regroupement",
    severity: "blocking",
    check: (o) => arrayLenBetween(asRecord(o)["epics"], 3, 5),
  },
  {
    id: "po-us-format-invest",
    description:
      "STEP-03 : chaque US suit le gabarit « En tant que … je veux … afin de … »",
    severity: "advisory",
    check: (o) => {
      const backlog = asRecord(o)["backlog"];
      if (!Array.isArray(backlog)) return false;
      const gabarit = /en tant que .+ je veux .+ afin de /i;
      return backlog.every((us) => gabarit.test(String(asRecord(us)["statement"] ?? "")));
    },
  },
];

/**
 * STEP-04 — AGENT-QA-AGILE.
 * DoD (output_attendu) : critères d'acceptation Gherkin (Given/When/Then) par US
 * sélectionnée · cas nominaux + erreur + limites · plan de test sprint 1.
 */
const STEP04_CRITERIA: Criterion[] = [
  {
    id: "qa-gherkin-non-vide",
    description: "STEP-04 : au moins un scénario Gherkin produit",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["gherkin"]),
  },
  {
    id: "qa-given-when-then",
    description:
      "STEP-04 : chaque scénario porte given + when + then (non vides)",
    severity: "blocking",
    check: (o) => {
      const scenarios = asRecord(o)["gherkin"];
      if (!nonEmptyArray(scenarios)) return false;
      return scenarios.every((sc) => {
        const s = asRecord(sc);
        return (
          nonEmptyString(s["given"]) &&
          nonEmptyString(s["when"]) &&
          nonEmptyString(s["then"])
        );
      });
    },
  },
  {
    id: "qa-plan-test-present",
    description: "STEP-04 : plan de test sprint 1 non vide",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["planTest"]),
  },
  {
    id: "qa-cas-erreur-et-limite",
    description:
      "STEP-04 : couverture au-delà du nominal — au moins un cas `erreur` et un cas `limite`",
    severity: "advisory",
    check: (o) => {
      const scenarios = asRecord(o)["gherkin"];
      if (!Array.isArray(scenarios)) return false;
      const types = new Set(scenarios.map((sc) => asRecord(sc)["type"]));
      return types.has("erreur") && types.has("limite");
    },
  },
];

/** Tous les critères de la spine WF-001 (ordre des étapes). */
export const WF_001_CADRAGE_CRITERIA: Criterion[] = [
  ...STEP01_CRITERIA,
  ...STEP03_CRITERIA,
  ...STEP04_CRITERIA,
];

/** Construit un registre frais peuplé des critères de la spine WF-001. */
export function buildWf001CadrageRegistry(): CriterionRegistry {
  return new CriterionRegistry().registerAll(WF_001_CADRAGE_CRITERIA);
}

// =============================================================================
// MANIFESTE — backbone WF-001 (contrats I/O + références de critères par id)
// =============================================================================

/**
 * Manifeste de la spine de cadrage. Les contrats sont conçus pour que la sortie
 * d'une étape satisfasse à la fois sa propre promesse ET l'entrée de l'aval
 * (handoff fail-closed) : `besoins`+`perimetre` portés par STEP-01 alimentent
 * STEP-03 ; `backlog` porté par STEP-03 alimente STEP-04.
 */
export const WF_001_CADRAGE_MANIFEST: SpineManifest = {
  spineId: "WF-001-cadrage-backbone",
  steps: [
    {
      stepId: "STEP-01",
      assetId: "AGENT-BUSINESS-ANALYST",
      // amorce : pas d'`input` (brief client = entrée initiale de runSpine)
      output: objSchema(
        ["besoins", "partiesPrenantes", "perimetre"],
        {
          besoins: arr,
          partiesPrenantes: arr,
          perimetre: objSchema(["in", "out"], { in: arr, out: arr }),
          questionsOuvertes: arr,
        },
      ),
      criteriaIds: STEP01_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-03",
      assetId: "AGENT-PO-SCRUM",
      input: objSchema(["besoins", "perimetre"], { besoins: arr, perimetre: { type: "object" } }),
      output: objSchema(["backlog", "epics"], { backlog: arr, epics: arr }),
      criteriaIds: STEP03_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-04",
      assetId: "AGENT-QA-AGILE",
      input: objSchema(["backlog"], { backlog: arr }),
      output: objSchema(["gherkin", "planTest"], { gherkin: arr, planTest: str }),
      criteriaIds: STEP04_CRITERIA.map((c) => c.id),
    },
  ],
};
