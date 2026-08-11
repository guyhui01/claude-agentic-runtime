/**
 * WF-003 "AI Application Launch" parameter manifest.
 *
 * Derived from the card's `TECHNICAL CONTEXT` block
 * (`claude-agents/workflows/WF-003-lancement-app-ia.md`), pinned to catalog
 * v4.3.0 — the real-sidecar test hard-fails on tag drift, forcing a re-derive.
 *
 * Easier to detect than WF-002: seven of the eight lines carry an explicit
 * enumeration, so the patterns are the card's own families rather than a
 * judgement about prose. Every parameter is required — this card offers no
 * sanctioned unknown and no operator-profile constant, so nothing here can
 * declare `defaultValue`.
 *
 * Checked against the 2026-07-19 dry-run oracle (§2, row P03) before its tests
 * were written; the two divergences are documented on the specs concerned.
 *
 * **Slash rule — read every bracketed list before writing its detector.** A `/`
 * list on these cards means "or" in some lines and "and" in others, and getting
 * it wrong inverts the semantics in one of two bad directions: an enumeration
 * read as a conjunction never passes, a conjunction read as an enumeration
 * passes on one fact out of three. Decide from the wording — alternatives drawn
 * from one category are an enumeration (`AWS / GCP / Azure`), distinct
 * attributes are a conjunction (`Name / Sector / Size`) — and split a
 * conjunction into one specification per fact, sharing a qualified card label.
 * There is no safe default; state the call in a comment on the line concerned.
 * Consequence: a manifest may hold MORE specifications than its card holds
 * lines. WF-003 has nine for eight lines.
 */

import type { NeedBrief, ParamManifest } from "../types.js";

/** Technical facts land in the constraint list as readily as in the prose. */
const technical = (b: NeedBrief): string =>
  `${b.need} ${b.context} ${b.constraints.join("; ")}`;

export const WF003_MANIFEST: ParamManifest = {
  workflow: "WF-003",
  catalogTag: "v4.3.0",
  params: [
    {
      name: "ai_app_type",
      card: "AI app type",
      required: true,
      mapping: technical,
      pattern:
        /\brag\b|\bretrieval[-\s]augmented\b|\bchatbot\b|\bautonomous agent\b|\bgeneration app\b|\bclassification\b/i,
    },
    {
      name: "cloud_provider",
      card: "Cloud provider",
      required: true,
      mapping: technical,
      // Reads as filled for P03, where dry-run §2 lists it must-ask. Not a table
      // error: §2 was computed against the coverage-matrix sketch, which names no
      // cloud at all, while the fixture's constraint list states "existing Azure
      // tenancy" — and Azure is in the card's own enumeration. Technical facts
      // land in `constraints` as readily as in the prose; hence the mapping.
      pattern: /\baws\b|\bamazon web services\b|\bgcp\b|\bgoogle cloud\b|\bazure\b|\bon[-\s]premises?\b|\bvercel\b/i,
    },
    {
      name: "target_llm",
      card: "Target LLM",
      required: true,
      mapping: technical,
      // DIVERGES from dry-run §2, which classes this as an operator-profile
      // default. That conflates two different models: the LLM this workflow's
      // CLIENT APPLICATION will run on — a sovereignty, on-premise and cost
      // decision the card lists "to fill in before starting" — and the model a
      // live run of the runtime is routed to. The card offers no sanctioned
      // unknown here, so it stays required.
      pattern:
        /\bclaude\b|\bsonnet\b|\bopus\b|\bhaiku\b|\bgpt-?\d|\bmistral\b|\bllama\b|\bgemini\b|\bon[-\s]premise model\b|\blocal model\b/i,
    },
    {
      name: "tech_stack",
      card: "Tech stack",
      required: true,
      mapping: technical,
      pattern:
        /\bpython\b|\bfastapi\b|\bnext\.?js\b|\bnode(\.js)?\b|\btypescript\b|\blangchain\b|\bllamaindex\b|\bn8n\b|\bdjango\b|\bflask\b|\bspring\b/i,
    },
    {
      name: "database",
      card: "Database",
      required: true,
      mapping: technical,
      pattern:
        /\bpostgres\w*\b|\bmysql\b|\bmongodb\b|\bpinecone\b|\bqdrant\b|\bweaviate\b|\bchroma\b|\belasticsearch\b|\bredis\b|\bsqlite\b|\bvector (db|database|store)\b/i,
    },
    // `GDPR constraints : [Personal data: YES/NO — Data location: EU/US]` is a
    // CONJUNCTION, not an enumeration: the card asks for two independent facts
    // on one line. It is split into one specification per fact so that
    // PARAMS_MISSING names the half that is actually absent — a single
    // conjunctive detector would answer "GDPR constraints" to an operator who
    // has already stated the location, and leave them nothing to act on.
    {
      name: "gdpr_personal_data",
      card: "GDPR constraints (personal data)",
      required: true,
      mapping: technical,
      // A negative answer is an answer: "no personal data is processed" states
      // the fact and satisfies the card line. Declared to the denial guard
      // (2026-08-05) rather than left implicit — the guard would otherwise read
      // that sentence as a refusal to answer and return the operator to a loop
      // they cannot exit, there being no other way to state the absence.
      absenceIsAnswer: true,
      pattern: /\bpersonal data\b|\bpii\b|\bpersonally identifiable\b|\bsensitive data\b/i,
    },
    {
      name: "gdpr_data_location",
      card: "GDPR constraints (data location)",
      required: true,
      mapping: technical,
      // Case-sensitive on the two abbreviations: a case-insensitive `\bUS\b`
      // matches the pronoun "us" and would fill this from ordinary prose.
      pattern:
        /\bEU\b|\bUS\b|\b[Dd]ata (location|residency)\b|\b[Ee]urope(an)?\b|\b[Uu]nited [Ss]tates\b|\b[Ss]overeign(ty)?\b/,
    },
    {
      name: "monthly_api_budget",
      card: "Monthly API budget",
      required: true,
      mapping: technical,
      // A monetary AMOUNT and the MONTHLY qualifier, in the same sentence.
      //
      // Both halves were paid for. The former third branch, `budget … digit`,
      // filled this line from the WF-001 brief's "pilot budget capped for Q3" —
      // the digit it matched being the **3 of "Q3"**, a quarter label read as a
      // sum (found by the cross-vocabulary probe, 2026-07-29). And a bare amount
      // is not this card's question either: the card asks for a MONTHLY API
      // budget, so "€45k total project budget" would answer something else. Same
      // policy as WF-004 `Engagement duration` and WF-005 `Horizon` — a quantity
      // counts only next to what qualifies it.
      pattern:
        /(monthly|per month|a month|\/\s?mo)[^.]{0,40}([€$£]\s?\d|\b\d+\s*(k\b|€|eur|usd|dollars?|euros?))|([€$£]\s?\d|\b\d+\s*(k\b|€|eur|usd|dollars?|euros?))[^.]{0,40}(monthly|per month|a month|\/\s?mo)/i,
    },
    {
      name: "target_sla",
      card: "Target SLA",
      required: true,
      mapping: technical,
      pattern: /\b\d+(\.\d+)?\s*%|<\s*\d+\s*(ms|s|sec|seconds?)\b|\bsla\b[^.]{0,30}\d|\blatency\b[^.]{0,30}\d/i,
    },
  ],
};
