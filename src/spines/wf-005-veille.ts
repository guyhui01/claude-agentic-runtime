/**
 * Real spine — deterministic backbone of WF-005 "Strategic Intelligence & Growth"
 * (§2.4-B.4).
 *
 * Sourced from the real workflow `claude-agents/workflows/WF-005-veille-growth.md`
 * (v1.1). Backbone = the SEQUENTIAL chain of the 3 core agents (the FINANCIAL-ANALYST
 * opportunity-scoring branch STEP-01B and the JURIDIQUE-IA compliance gateway STEP-04
 * are OPTIONAL bypasses, so outside the backbone — mirrors the WF-003/004 rule for
 * optional forks):
 *   STEP-01 (VEILLE-STRATEGIQUE) → STEP-02 (GROWTH-IA) → STEP-03 (REDACTEUR-IA).
 *
 * ADR compliance identical to WF-001/002/003/004 (ADR-0007 runtime manifest,
 * deterministic eval criteria on the UNCHANGED linear fail-closed orchestrator).
 * Like WF-004, this workflow carries NO fail-closed structural construct: STEP-01's
 * `condition_passage` ("signals qualified and ranked before writing") is modeled as
 * an ordinary blocking eval gate, and both gateways are OPTIONAL bypasses, so the
 * spine is a linear twin of WF-003/004. Same `Management & Consulting` domain as
 * WF-004/006 — it adds a backbone, not a new domain. It is the runtime's lightest
 * chain (3 agents) and the workflow's `modele_recommande` is `claude-sonnet-5`.
 *
 * Numeric DoD counts from the workflow ("Top 5 highlights", "1-3 topics",
 * "1-3 LinkedIn posts") are split: a relaxed BLOCKING floor (a meaningful deliverable
 * must exist) plus an ADVISORY criterion at the exact spec number (the full ideal).
 * The JSON schema still communicates the ideal count to the agent so its output
 * aligns with both.
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
} from "./spine-helpers.js";

// --- Local predicates (traced DoD shapes) ------------------------------------

/**
 * `true` if `v` is a non-empty array whose EVERY item carries a non-empty string
 * at each of `keys`. Used for the "ranked highlights" (each rated by impact) and
 * the "actionable content plan" (each topic has a format + angle) DoD shapes — a
 * list of hollow items must not pass a gate that promises qualified entries.
 */
function everyItemHasStrings(v: unknown, keys: string[]): boolean {
  return (
    nonEmptyArray(v) &&
    v.every((item) => keys.every((k) => nonEmptyString(asRecord(item)[k])))
  );
}

// =============================================================================
// CRITERIA — traced to WF-005 (v1.1)
// =============================================================================

/**
 * STEP-01 — VEILLE-STRATEGIQUE.
 * DoD: Top 5 highlights ranked by impact (High/Medium/Low) · weak-signal radar ·
 * 1-2 tools/technologies to watch · qualified engagement opportunities.
 * condition_passage: "signals qualified AND ranked before writing" → enforced as the
 * blocking presence of ranked highlights (a broken/unranked radar halts before STEP-02).
 */
const STEP01_CRITERIA: Criterion[] = [
  {
    id: "veille-highlights-floor",
    description: "STEP-01: qualified highlights — ≥ 3 (floor)",
    severity: "blocking",
    check: (o) => minArrayLen(asRecord(o)["highlights"], 3),
  },
  {
    id: "veille-highlights-ranked",
    description:
      "STEP-01: every highlight is ranked (title + impact rating) — condition_passage",
    severity: "blocking",
    check: (o) => everyItemHasStrings(asRecord(o)["highlights"], ["title", "impact"]),
  },
  {
    id: "veille-highlights-top5",
    description: "STEP-01: the full « Top 5 » highlights (ideal ≥ 5)",
    severity: "advisory",
    check: (o) => minArrayLen(asRecord(o)["highlights"], 5),
  },
  {
    id: "veille-weak-signals",
    description: "STEP-01: weak-signal radar — emerging opportunities (non-empty)",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["weakSignals"]),
  },
  {
    id: "veille-tools",
    description: "STEP-01: 1-2 tools or technologies to monitor / test",
    severity: "advisory",
    check: (o) => nonEmptyArray(asRecord(o)["toolsToWatch"]),
  },
];

/**
 * STEP-02 — GROWTH-IA.
 * DoD: selection of topics to cover this week (1-3 max) · recommended format per
 * topic · editorial angle and hook per topic · hashtags/mentions · publication timing.
 */
const STEP02_CRITERIA: Criterion[] = [
  {
    id: "growth-topics-floor",
    description: "STEP-02: selected topics to cover (non-empty)",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["topics"]),
  },
  {
    id: "growth-topics-actionable",
    description:
      "STEP-02: every topic is actionable (format + editorial angle) — carried to writing",
    severity: "blocking",
    check: (o) => everyItemHasStrings(asRecord(o)["topics"], ["format", "angle"]),
  },
  {
    id: "growth-topics-1-3",
    description: "STEP-02: the weekly focus of 1-3 topics (ideal range)",
    severity: "advisory",
    check: (o) => arrayLenBetween(asRecord(o)["topics"], 1, 3),
  },
  {
    id: "growth-hashtags",
    description: "STEP-02: hashtags and mentions to use (LinkedIn SEO)",
    severity: "advisory",
    check: (o) => nonEmptyArray(asRecord(o)["hashtags"]),
  },
  {
    id: "growth-timing",
    description: "STEP-02: best publication timing (day / time) present",
    severity: "advisory",
    check: (o) => nonEmptyString(asRecord(o)["timing"]),
  },
];

/**
 * STEP-03 — REDACTEUR-IA.
 * DoD: intelligence synthesis in the requested format (Markdown) · 1-3 LinkedIn posts
 * ready to copy-paste · internal note if applicable · quote of the week.
 */
const STEP03_CRITERIA: Criterion[] = [
  {
    id: "red-synthesis",
    description: "STEP-03: intelligence synthesis in the requested format (Markdown) present",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["synthesis"]),
  },
  {
    id: "red-linkedin-floor",
    description: "STEP-03: LinkedIn post(s) ready to publish — ≥ 1 (floor)",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["linkedinPosts"]),
  },
  {
    id: "red-linkedin-1-3",
    description: "STEP-03: the 1-3 LinkedIn posts (ideal range)",
    severity: "advisory",
    check: (o) => arrayLenBetween(asRecord(o)["linkedinPosts"], 1, 3),
  },
  {
    id: "red-quote",
    description: "STEP-03: quote of the week for engagement present",
    severity: "advisory",
    check: (o) => nonEmptyString(asRecord(o)["quoteOfTheWeek"]),
  },
];

/** All criteria of the WF-005 spine (backbone order). */
export const WF_005_VEILLE_CRITERIA: Criterion[] = [
  ...STEP01_CRITERIA,
  ...STEP02_CRITERIA,
  ...STEP03_CRITERIA,
];

/** Builds a fresh registry populated with the WF-005 spine criteria. */
export function buildWf005VeilleRegistry(): CriterionRegistry {
  return new CriterionRegistry().registerAll(WF_005_VEILLE_CRITERIA);
}

// =============================================================================
// MANIFEST — WF-005 backbone (I/O contracts + criteria references by id)
// =============================================================================

/**
 * Contracts designed for a linear fail-closed handoff: each output promises the
 * field required by the immediate downstream input (WF-003/004 idiom — a single
 * carried field per hop): highlights → topics. REDACTEUR (STEP-03) receives the
 * content plan (`topics`) and synthesizes the qualified signals from its prose
 * (WF-004 precedent, where each step received only the immediate upstream field).
 */
export const WF_005_VEILLE_MANIFEST: SpineManifest = {
  spineId: "WF-005-veille-backbone",
  steps: [
    {
      stepId: "STEP-01",
      assetId: "AGENT-VEILLE-STRATEGIQUE",
      // seed: intelligence context = runSpine's initial input.
      output: objSchema(["highlights", "weakSignals"], {
        // Schema minItems = the BLOCKING floor (≥ 3), NOT the advisory « Top 5 »
        // ideal: the output schema is ajv-strict-validated at handoff, so pinning
        // it to the ideal would hard-fail a modest-but-valid run (≤ 4 highlights)
        // that the eval gate legitimately passes. The ideal is carried by the
        // advisory criterion + this description. Each highlight ranked
        // (title + impact) → veille-highlights-ranked (blocking).
        highlights: arrOf(
          objSchema(["title", "impact"], {
            title: { type: "string", description: "Highlight headline (short title)." },
            source: { type: "string", description: "Source link / reference." },
            impact: { type: "string", description: "Impact rating: High | Medium | Low." },
          }),
          { min: 3 }, // floor; aim for the Top 5 (advisory veille-highlights-top5).
        ),
        // Blocking veille-weak-signals (floor: non-empty).
        weakSignals: arrOf(undefined, { min: 1 }),
        // Advisory veille-tools (1-2 tools): NO minItems — an empty/omitted array
        // must not hard-fail this optional field at the strict handoff.
        toolsToWatch: { type: "array", description: "1-2 tools or technologies to monitor / test." },
      }),
      criteriaIds: STEP01_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-02",
      assetId: "AGENT-GROWTH-IA",
      input: objSchema(["highlights"], { highlights: arr }),
      output: objSchema(["topics"], {
        // Blocking floor (non-empty) + actionable (format + angle). NO maxItems on
        // the ajv-strict output schema: the "1-3 max" is the ideal, carried by the
        // advisory growth-topics-1-3 + this description — a 4th topic must not
        // hard-fail a run the eval gate passes.
        topics: arrOf(
          objSchema(["format", "angle"], {
            topic: { type: "string", description: "Topic to cover this week (weekly focus of 1-3)." },
            format: { type: "string", description: "LinkedIn post | article | newsletter." },
            angle: { type: "string", description: "Editorial angle and hook." },
          }),
          { min: 1 },
        ),
        // Advisory nudges growth-hashtags / growth-timing.
        hashtags: { type: "array", description: "Hashtags and mentions (LinkedIn SEO)." },
        timing: { type: "string", description: "Best publication timing (day / time)." },
      }),
      criteriaIds: STEP02_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-03",
      assetId: "AGENT-REDACTEUR-IA",
      input: objSchema(["topics"], { topics: arr }),
      output: objSchema(["synthesis", "linkedinPosts"], {
        synthesis: {
          type: "string",
          description: "Intelligence synthesis in the requested format (Markdown).",
        },
        // Blocking red-linkedin-floor (≥ 1). NO maxItems on the ajv-strict output
        // schema: the "1-3" is the ideal (advisory red-linkedin-1-3 + description),
        // so a 4th post must not hard-fail an otherwise-passing run.
        linkedinPosts: arrOf(str, { min: 1 }),
        // Advisory nudge red-quote.
        quoteOfTheWeek: { type: "string", description: "Quote of the week for engagement." },
        // Optional internal note (executive-committee / newsletter use).
        internalNote: { type: "string", description: "Internal note if applicable." },
      }),
      criteriaIds: STEP03_CRITERIA.map((c) => c.id),
    },
  ],
};
