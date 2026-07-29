/**
 * WF-005 "Strategic Intelligence & Growth" parameter manifest.
 *
 * Derived from the card's `INTELLIGENCE CONTEXT` block
 * (`claude-agents/workflows/WF-005-veille-growth.md`), pinned to catalog v4.2.0 —
 * the real-sidecar test hard-fails on tag drift, forcing a re-derive.
 *
 * Seven card lines, seven specifications: RULE 2 finds no conjunction here. The
 * one trap is typographic — in `[AI/LLM / AI consulting / …]` the slash of
 * `AI/LLM` is INTERNAL to an item, not a separator. `Sources to prioritize` is
 * plural but states a single fact (which sources), so it is not split either.
 *
 * All seven are `required`, with no `defaultValue` and no `sanctionedUnknown`:
 * the card declares none of them non-blocking, and each feeds a BACKBONE step's
 * input (STEP-01: Intelligence scope, Sources, Horizon · STEP-02: Audience ·
 * STEP-03: Target format, Tone). Two divergences were settled at the card rather
 * than assumed, and both are recorded because they argue the other way:
 *   - Dry-run §2 row P05 reads `F=3 / D=4 / M=0` — four parameters covered by
 *     "operator-profile defaults". It does not name its four cells, so the
 *     divergence cannot be reconciled one by one. It is not followed: the P05
 *     brief carries a CLIENT (Cobalt Partners), and defaulting audience, tone or
 *     sources to the operator's own profile would assert the CLIENT's, inverting
 *     the parameter's meaning.
 *   - The card's own `Quick-start command` block asks for only THREE parameters
 *     (Target format / Scope / Audience). That is the strongest textual support
 *     §2's `D=4` has, and it is still not followed: STEP-01 and STEP-03 list
 *     `Focus horizon` and `Tone` as explicit inputs, and a quick-start prompt is
 *     a convenience, not the card's contract.
 *
 * `Opportunity focus` carries the weakest NECESSITY claim of the seven (as
 * distinct from `Horizon`, the weakest DETECTOR). Its exact-match consumer —
 * "Engagement-opportunity scoring" — is marked `[optional]` in the card's own
 * deliverables checklist, and STEP-02's input line ("Growth objectives:
 * awareness / engagement / engagement leads") is a DIFFERENT enumeration from
 * the card's `[CAC40 / Training / Partnerships / Positioning]`. It stays
 * required on the strength of STEP-01's non-optional output, "Weak-signal radar
 * (emerging opportunities)". If one spec here is ever demoted to
 * optional-with-default, it is this one and no other.
 *
 * Detectors were measured against the 19 coverage-matrix briefs before these
 * tests were written, and TWO defects of the first draft were found that way:
 * the `Horizon` detector rejected the card's own word order, and the
 * `priority_sources` detector filled on a NEGATION. Both are locked by tests.
 */

import type { NeedBrief, ParamManifest } from "../types.js";

/**
 * Intelligence facts land in the constraint list as readily as in the prose.
 * Uniform across all seven specs: `expectedDeliverable` is deliberately NOT
 * mapped, not even for `Target format` (which it would plausibly carry) —
 * intake guarantees that field is non-empty, so widening a detector onto it
 * widens in the false-"filled" direction for a gain no brief here needs.
 */
const intelligence = (b: NeedBrief): string =>
  `${b.need} ${b.context} ${b.constraints.join("; ")}`;

export const WF005_MANIFEST: ParamManifest = {
  workflow: "WF-005",
  catalogTag: "v4.2.0",
  params: [
    {
      name: "target_format",
      card: "Target format",
      required: true,
      mapping: intelligence,
      // Card enumeration: Weekly flash / Monthly synthesis / LinkedIn post /
      // Strategic note. FORM words only: a bare "note" or "post" is ordinary
      // prose. `LinkedIn` is allowed here because it is qualified by "post" —
      // see `priority_sources` for why the bare token is refused there.
      pattern:
        /\bweekly (flash|digest|synthesis|round-?up)\b|\bmonthly (synthesis|digest|round-?up)\b|\bLinkedIn posts?\b|\bstrategic note\b|\binternal note\b/i,
    },
    {
      name: "intelligence_scope",
      card: "Intelligence scope",
      required: true,
      mapping: intelligence,
      // Card enumeration: AI/LLM / AI consulting / Job market / Regulatory /
      // Tech stack. The widest detector of this manifest, and the line drawn is
      // ownership: a token whose PRIMARY owner is another card (`AI Act`,
      // `regulator*` — WF-008's core vocabulary) only counts inside a watch
      // framing, which is what stops it filling on the P06/P08/P20 briefs.
      // Tokens with no single owner (`GenAI`, `LLM`) stay bare and DO fill on
      // three foreign briefs; measured, recorded in the cross-vocabulary test,
      // and not narrowed — this check runs only after the router has already
      // proposed WF-005, so it never claimed to validate the route.
      // A bare `\bAI\b` is excluded: it appears in nearly every catalog brief.
      pattern:
        /\bgen(erative )?ai\b|\bLLMs?\b|\bAI market\b|\bmarket moves\b|\bAI consulting\b|\b(job|hiring|talent) market\b|\btech(nology)? stack watch\b|\btooling landscape\b|\b(regulator\w*|AI Act)\b[^.]{0,30}\b(watch|monitoring|tracking|developments|landscape|news)\b|\b(watch|monitor\w*|track\w*|intelligence)\b[^.]{0,30}\b(regulator\w*|AI Act)\b/i,
    },
    {
      name: "audience",
      card: "Audience",
      required: true,
      mapping: intelligence,
      // Card enumeration: Public LinkedIn / Client newsletter / Personal network
      // / Internal use. Audience-side phrasing only — `LinkedIn` counts when it
      // names who reads, not when it names a format or a source.
      pattern:
        /\bpublic LinkedIn\b|\bLinkedIn audience\b|\bclient newsletter\b|\bnewsletter\b|\bpersonal network\b|\binternal use\b|\btarget audience\b/i,
    },
    {
      name: "tone",
      card: "Tone",
      required: true,
      mapping: intelligence,
      // Card enumeration: Technical expert / Plain-language / Thought leader /
      // Neutral. The enumerated values, never the bare word `tone` — which
      // states that a tone exists, not which one.
      pattern:
        /\btechnical expert\b|\bexpert tone\b|\bplain[-\s]language\b|\bthought[-\s]leader(ship)?\b|\bneutral tone\b/i,
    },
    {
      name: "horizon",
      card: "Horizon",
      required: true,
      mapping: intelligence,
      // The weakest detector here, and deliberately the strictest. The card
      // offers two vocabularies — quantitative in the context block
      // (3 months / 12 months / 3 years) and qualitative in STEP-01's input
      // ("Focus horizon: [short / medium / long term]") — and BOTH word orders
      // occur, which the first draft got wrong: it rejected the card's own
      // "Focus horizon: medium term".
      //
      // The horizon WORD is required next to the value, in the same sentence.
      // Accepting a bare quantity was measured and fills on P04 ("three-month
      // engagement window") and P10 ("10-month project") — a duration and a
      // project length, not an intelligence horizon. The known cost is that the
      // operator's natural phrasing IS the bare quantity (the live harness seed
      // says `horizon: "3 months"`, with the label carried by the field name,
      // which flat prose does not have), so this line is often returned once.
      // That is the safe direction, and `PARAMS_MISSING` names the card label,
      // so the message designates the word to add.
      pattern:
        /\b(\d+|three|six|twelve|eighteen|twenty-four)[-\s](month|year)s?\b[^.]{0,24}\b(horizon|outlook|view|forward look)\b|\b(horizon|outlook|forward view)\b[^.]{0,24}\b(\d+|three|six|twelve|eighteen)[-\s](month|year)s?\b|\b(short|medium|long)[-\s]term\b[^.]{0,16}\b(horizon|outlook|view|focus)\b|\b(horizon|outlook|forward view)\b[^.]{0,24}\b(short|medium|long)[-\s]term\b/i,
    },
    {
      name: "priority_sources",
      card: "Sources to prioritize",
      required: true,
      mapping: intelligence,
      // Card enumeration: ArXiv / GitHub / LinkedIn / RFP / Trade press. The
      // bare `LinkedIn` is REFUSED although the card lists it: the token also
      // appears in the format and audience enumerations, so counting it would
      // make three specs non-independent and fill this line from the P05
      // brief's audience statement. Under-detecting "I watch LinkedIn" is the
      // safe direction.
      //
      // The negation guards are not decoration: the first draft accepted "no
      // monitored sources yet" as filled — a false "filled" on a statement of
      // absence. The card-step phrasing "Sources available this week" was
      // dropped for the same reason (it is the card's field label, not a
      // brief's wording, and it inverted on "No sources available").
      pattern:
        /\barxiv\b|\bgithub\b|\bhugging ?face\b|\btrade press\b|\bpress review\b|\b(RFP|tender) (feeds?|portals?|watch)\b|(?<!\bno )\bsources? to (prioriti[sz]e|monitor|watch)\b|(?<!\bno )\bmonitored sources?\b/i,
    },
    {
      name: "opportunity_focus",
      card: "Opportunity focus",
      required: true,
      mapping: intelligence,
      // Card enumeration: CAC40 engagements / Training / Partnerships /
      // Positioning. Fills on none of the 19 coverage-matrix briefs, including
      // P05 — the growth objective is simply not something a first-draft brief
      // states. Confirmed satisfiable on independent text: the live harness
      // seed says "Positioning and freelance AI-consulting engagements".
      pattern:
        /\bCAC ?40\b|\blarge[-\s]accounts?\b|\benterprise (accounts|engagements)\b|\btraining (offer|catalogue|catalog|revenue)\b|\bpartnerships?\b|\bpositioning\b|\bbusiness development\b|\blead generation\b|\bengagement leads?\b/i,
    },
  ],
};
