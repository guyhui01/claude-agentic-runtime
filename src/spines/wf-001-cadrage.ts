/**
 * Real spine — deterministic backbone of WF-001 "AI Product Scoping" (§2.4-B.3).
 *
 * First spine manifest sourced from a REAL workflow of the `claude-agents` catalog
 * (`workflows/WF-001-cadrage-produit-ia.md`, v1.2), as opposed to the generic
 * fixtures of `test/manifest.test.ts`. This is the "real manifest + real criteria"
 * input required by NEXT_STEPS §2.4-B.3 before wiring in `query()`.
 *
 * Scope = the sequential BACKBONE of WF-001, i.e. its non-conditional steps:
 *   STEP-01 (BUSINESS-ANALYST) → STEP-03 (PO-SCRUM) → STEP-04 (QA-AGILE).
 * STEP-02 (UX-DESIGNER) and STEP-05/06 (CHANGE-MANAGER / PRODUCT-MANAGER-SAFE) are
 * conditional branches (`condition_activation` in the workflow): outside the
 * backbone, they will be modeled as variants later (YAGNI here).
 *
 * ADR compliance:
 *   - ADR-0007: the manifest (contracts = data, criteria = code referenced by id)
 *     is owned by the RUNTIME; it cross-checks the sidecar (descriptive, ADR-0003)
 *     at load time via `loadSpine`.
 *   - DETERMINISTIC criteria (no LLM-as-judge): reproducible and auditable
 *     (ISO 19011). Each one traces a point of `output_attendu` / `condition_passage`
 *     from a WF-001 step sheet.
 *
 * The `assetId` values (`AGENT-BUSINESS-ANALYST`, `AGENT-PO-SCRUM`, `AGENT-QA-AGILE`)
 * must exist as "agent" assets in the pinned catalog's sidecar. At run live
 * (§2.4-B.3) this sidecar comes from `claude-agents` (generator §2.3); in the
 * meantime, `test/spine-wf-001.test.ts` provides an interim sidecar.
 */

import type { SpineManifest } from "../manifest/types.js";
import type { Criterion } from "../eval/types.js";
import { CriterionRegistry } from "../eval/criteria-registry.js";
import {
  objSchema,
  arr,
  arrOf,
  str,
  num,
  asRecord,
  nonEmptyArray,
  arrayLenBetween,
  nonEmptyString,
} from "./spine-helpers.js";

// =============================================================================
// CRITERIA — one per DoD requirement, traced to WF-001 (v1.2)
// =============================================================================

/**
 * STEP-01 — AGENT-BUSINESS-ANALYST.
 * DoD (output_attendu): needs map · stakeholders with roles · in/out scope ·
 * (AS-IS if applicable) · open questions.
 */
const STEP01_CRITERIA: Criterion[] = [
  {
    id: "ba-besoins-non-vide",
    description: "STEP-01: needs map (job-to-be-done) non-empty",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["besoins"]),
  },
  {
    id: "ba-parties-prenantes-non-vide",
    description: "STEP-01: stakeholder list non-empty",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["partiesPrenantes"]),
  },
  {
    id: "ba-perimetre-in-out",
    description:
      "STEP-01: explicit functional scope — `in` non-empty AND `out` present (in/out scope)",
    severity: "blocking",
    check: (o) => {
      const p = asRecord(asRecord(o)["perimetre"]);
      return nonEmptyArray(p["in"]) && Array.isArray(p["out"]);
    },
  },
  {
    id: "ba-questions-ouvertes-presentes",
    description:
      "STEP-01: open questions listed (array present, even if empty when the brief is clear)",
    severity: "advisory",
    check: (o) => Array.isArray(asRecord(o)["questionsOuvertes"]),
  },
];

/**
 * STEP-03 — AGENT-PO-SCRUM.
 * DoD (output_attendu): 8 to 15 User Stories · each US with priority + estimate
 * (story points) + DoD · ordered backlog · grouping epics (3-5 max).
 */
const STEP03_CRITERIA: Criterion[] = [
  {
    id: "po-backlog-8-15",
    description: "STEP-03: backlog of 8 to 15 User Stories",
    severity: "blocking",
    check: (o) => arrayLenBetween(asRecord(o)["backlog"], 8, 15),
  },
  {
    id: "po-us-champs-requis",
    description:
      "STEP-03: each US carries statement + priorite + estimation (number) + dod",
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
    description: "STEP-03: 3 to 5 grouping epics",
    severity: "blocking",
    check: (o) => arrayLenBetween(asRecord(o)["epics"], 3, 5),
  },
  {
    id: "po-us-format-invest",
    description:
      "STEP-03: each US follows the « As a … I want … so that … » template",
    severity: "advisory",
    check: (o) => {
      const backlog = asRecord(o)["backlog"];
      if (!Array.isArray(backlog)) return false;
      // INVEST template check (English): "As <role> I want <action> so that <benefit>".
      // Determiner-agnostic: the role may read "a"/"an"/"the" or none at all
      // (e.g. "As the Head of B2B, I want …") — only the three narrative anchors
      // (as … / i want … / so that …) are enforced, not the article.
      const template = /\bas\b .+\bi want\b.+\bso that\b/i;
      return backlog.every((us) => template.test(String(asRecord(us)["statement"] ?? "")));
    },
  },
];

/**
 * STEP-04 — AGENT-QA-AGILE.
 * DoD (output_attendu): Gherkin acceptance criteria (Given/When/Then) per selected
 * US · nominal + error + boundary cases · sprint 1 test plan.
 */
const STEP04_CRITERIA: Criterion[] = [
  {
    id: "qa-gherkin-non-vide",
    description: "STEP-04: at least one Gherkin scenario produced",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["gherkin"]),
  },
  {
    id: "qa-given-when-then",
    description:
      "STEP-04: each scenario carries given + when + then (non-empty)",
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
    description: "STEP-04: sprint 1 test plan non-empty",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["planTest"]),
  },
  {
    id: "qa-cas-erreur-et-limite",
    description:
      "STEP-04: coverage beyond the nominal — at least one `error` case and one `boundary` case",
    severity: "advisory",
    check: (o) => {
      const scenarios = asRecord(o)["gherkin"];
      if (!Array.isArray(scenarios)) return false;
      const types = new Set(scenarios.map((sc) => asRecord(sc)["type"]));
      return types.has("error") && types.has("boundary");
    },
  },
];

/** All criteria of the WF-001 spine (step order). */
export const WF_001_CADRAGE_CRITERIA: Criterion[] = [
  ...STEP01_CRITERIA,
  ...STEP03_CRITERIA,
  ...STEP04_CRITERIA,
];

/** Builds a fresh registry populated with the WF-001 spine criteria. */
export function buildWf001CadrageRegistry(): CriterionRegistry {
  return new CriterionRegistry().registerAll(WF_001_CADRAGE_CRITERIA);
}

// =============================================================================
// MANIFEST — WF-001 backbone (I/O contracts + criteria references by id)
// =============================================================================

/**
 * Manifest of the scoping spine. The contracts are designed so that a step's
 * output satisfies both its own promise AND the downstream input (fail-closed
 * handoff): `besoins`+`perimetre` carried by STEP-01 feed STEP-03; `backlog`
 * carried by STEP-03 feeds STEP-04.
 */
export const WF_001_CADRAGE_MANIFEST: SpineManifest = {
  spineId: "WF-001-cadrage-backbone",
  steps: [
    {
      stepId: "STEP-01",
      assetId: "AGENT-BUSINESS-ANALYST",
      // seed: no `input` (client brief = runSpine's initial input)
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
      // TIGHTENED output schema to COMMUNICATE the contract to the agent (run live):
      // exact US shape (statement/priorite/estimation/dod) + DoD bounds
      // (8–15 US, 3–5 epics). Without it, a real agent diverges (cf. live run
      // 2026-06-09: 24 US / 9 epics, field `userStory` ≠ `statement`).
      output: objSchema(["backlog", "epics"], {
        backlog: arrOf(
          objSchema(["statement", "priorite", "estimation", "dod"], {
            // Description = advisory nudge `po-us-format-invest` (INVEST template),
            // communicated to the agent via format injection, without a hard constraint.
            statement: {
              type: "string",
              description:
                "User Story in the INVEST template: « As a <role> I want <action> so that <benefit> ».",
            },
            priorite: str,
            estimation: num,
            dod: str,
          }),
          { min: 8, max: 15 },
        ),
        epics: arrOf(undefined, { min: 3, max: 5 }),
      }),
      criteriaIds: STEP03_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-04",
      assetId: "AGENT-QA-AGILE",
      input: objSchema(["backlog"], { backlog: arr }),
      // Tightened to align the agent's output with the criteria: each scenario
      // carries given/when/then (exact keys expected by the gate).
      output: objSchema(["gherkin", "planTest"], {
        // Array description = advisory nudge `qa-cas-erreur-et-limite`: cover,
        // beyond the nominal, at least one error case and one boundary case.
        gherkin: {
          type: "array",
          minItems: 1,
          description:
            "Beyond the nominal, cover AT LEAST one `type:\"error\"` scenario and one `type:\"boundary\"`.",
          items: objSchema(["given", "when", "then"], {
            given: str,
            when: str,
            then: str,
            type: {
              type: "string",
              description: "nominal | error | boundary",
            },
          }),
        },
        planTest: str,
      }),
      criteriaIds: STEP04_CRITERIA.map((c) => c.id),
    },
  ],
};
