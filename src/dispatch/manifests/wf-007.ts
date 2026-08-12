/**
 * WF-007 "Client Engagement Onboarding D1-D5" parameter manifest.
 *
 * Derived from the card's `ENGAGEMENT CONTEXT` block
 * (`claude-agents/workflows/WF-007-onboarding-mission-j1.md`), pinned to catalog
 * v4.3.0 — the real-sidecar test hard-fails on tag drift, forcing a re-derive.
 * Nine card lines, ELEVEN specifications: `Client [Name / Sector / Size]` is the
 * one conjunction here (RULE 2), split so `PARAMS_MISSING` names the half that
 * is missing rather than a line the operator has half-answered.
 *
 * ALL ELEVEN ARE REQUIRED, with no `defaultValue` and no `sanctionedUnknown` —
 * the first manifest since WF-005 with neither. The card carries no
 * `Constraints` line, so the intake-guaranteed default of WF-001/002/004 has no
 * subject here.
 *
 * ⚠️ `D1 access [Badge, PC, VPN, tools, accounts — to validate]` is NOT a
 * sanctioned unknown, and this is a deliberate divergence from §1 of the
 * 2026-07-19 dry-run, which lists it as this card's honest unknown. The list of
 * accesses is stated ON the card; what the annotation defers is their
 * VALIDATION, not their value — the false-friend reading settled 2026-07-28,
 * alongside WF-004's "— estimate" (an estimate IS a value). Consequence worth
 * stating because it contradicts a document: WF-007 has no sanctioned unknown
 * at all.
 *
 * Checked against §2 of that dry-run (row P07) as a CHECKLIST before the tests
 * were written. It names five must-ask parameters — Engagement type, Duration,
 * D1 stakeholders, Location, Identified stakes — and this manifest reports two
 * of them missing. The three divergences are the documented class: §2 was
 * computed on the coverage-matrix SKETCH while the check runs on the qualified
 * FIXTURE, which states "medium duration", "sponsors identified" and "hybrid
 * on-site engagement". Two divergences run the other way (`Client (size)` and
 * `Sensitivities` are reported missing where §2 counts them covered); note that
 * §2 records only COUNTS per class, never which parameter sits in which, so
 * there is no attribution to disagree with — only a total.
 *
 * SLASH LISTS ARE CLOSED, COMMA LISTS ARE OPEN — the rule RULE 2 already
 * implies, written down here because a second verification pass caught this
 * manifest breaking it three times. A comma list is the card giving EXAMPLES
 * ("Badge, PC, VPN, tools, accounts", "Social context, restructuring,
 * post-incident, etc."), so a detector may add neighbours of the same kind. A
 * slash list is the card's own ENUMERATION, so a SYNONYM of a listed value is
 * fair (WF-004 reads `upskilling` for Training and `GDPR` for Compliance) while
 * a NEW MEMBER invents a value the card does not offer. That is the line the
 * three removals below crossed, and the distinction matters in both
 * directions — stripping the synonyms would break detectors that are right. Removed on that basis: `onboarding` from
 * `Engagement type` and from `Expected deliverables` — the word appears on this
 * card only in its TITLE and its filename, never as a value, so it promoted the
 * workflow's own name to an engagement type; and `operational` from
 * `Identified stakes`, which is a fifth category beside Business / Technical /
 * Organizational / Political rather than a synonym of any. Measured before
 * removing: both words occur in the nineteen briefs (`onboarding` twice in the
 * NO_MATCH legal brief, `operational` once) but neither produced a fill, so
 * this changes no verdict — it removes a latent false "filled" and restores the
 * criterion this same lot applied to WF-004's `business units`.
 *
 * ⚠️ ONE PHRASE OF THAT DOCUMENT PULLS TOWARD BREAKING AN INVARIANT. §3 reads
 * "self-briefs (P07) make the submitter the answer source", and this fixture's
 * `submittedBy` is "Consultant (self-brief)". Mapping it would fill
 * `engagement_type` from WHO submitted the brief — the exact dependency the
 * P19/P20 role probes falsified live (role ⊥ route). No spec here maps it, and
 * the policy-consistency suite asserts that for every manifest.
 */

import type { NeedBrief, ParamManifest } from "../types.js";

/** Engagement facts land in the constraint list as readily as in the prose. */
const engagement = (b: NeedBrief): string =>
  `${b.need} ${b.context} ${b.constraints.join("; ")}`;

export const WF007_MANIFEST: ParamManifest = {
  workflow: "WF-007",
  catalogTag: "v4.3.0",
  params: [
    // The three `client_*` detectors are IDENTICAL to their WF-004 siblings, and
    // that is a decision rather than a copy-paste. Both cards carry the same
    // line, verified byte for byte at the pinned tag: `Client [Name / Sector /
    // Size]`. There is therefore no card basis for any divergence, and the
    // policy-consistency table — which pairs specs by name — will show these
    // three with no vocabulary unique to either copy. Factoring them was decided
    // AGAINST on 2026-07-30: the answer to duplication here is detection, since
    // factoring `client_name` would have propagated WF-006's `Prospect`
    // introducer into WF-004 as a side effect of a refactor.
    {
      name: "client_name",
      card: "Client (name)",
      required: true,
      mapping: engagement,
      // Recognizes a SHAPE, the card giving no enumeration: a proper noun
      // introduced by with/for/at/from, or a name carrying a legal form. Same
      // accepted miss as WF-004 — an apposition ("Vantage Retail, a mid-cap,
      // signed…") reads as unnamed, which fails in the safe direction.
      pattern:
        /\b(?:with|for|at|from)\s+(?!the\b|a\b|an\b|our\b|their\b|its\b|this\b)[A-Z][a-z][\w&'-]*(?:\s+[A-Z][\w&'-]+){0,3}|\b[A-Z][\w&'-]+\s+(?:GmbH|SAS|SARL|SA|Ltd|Limited|Inc\.?|LLC|plc|AG|BV|NV)\b/,
    },
    {
      name: "client_sector",
      card: "Client (sector)",
      required: true,
      mapping: engagement,
      // Non-discriminating by construction and knowingly so: the WF-004 entry
      // records that its twin fills on eleven foreign briefs out of seventeen,
      // every brief naming a company in some sector. Tolerable only because this
      // check never claimed to validate the route.
      pattern:
        /\b(food[-\s]?(industry|processing|retail)?|agri\w*|bank\w*|insur\w*|retail\w*|industr\w*|manufactur\w*|health\w*|pharma\w*|logistic\w*|energy|utilit\w*|telecom\w*|public[- ]sector|e-?commerce|automotive|luxury|media)\b/i,
    },
    {
      name: "client_size",
      card: "Client (size)",
      required: true,
      mapping: engagement,
      // Size CLASSES and headcounts only; "mid-size" stays out as ordinary prose
      // (the neutral-probe brief says "a mid-size company") while "mid-cap" is a
      // stated class.
      pattern:
        /\b(mid[-\s]?cap|large[-\s]?cap|small[-\s]?cap|SME|SMB|ETI|start-?up|scale-?up|multinational|CAC ?40|\d+\s*(employees|staff|FTEs?|headcount))\b/i,
    },
    {
      name: "engagement_type",
      card: "Engagement type",
      required: true,
      // MAPPING IS LOAD-BEARING HERE, and excludes two fields on purpose.
      // `domain` is excluded because "Management & Consulting" is this fixture's
      // domain and `Consulting` is a VALUE of the card's enumeration — mapping it
      // would fill this line for every brief of the domain, a silent false
      // "filled". `expectedDeliverable` is excluded because P07's reads "D5
      // scoping deliverables", where "scoping" names a DELIVERABLE of this very
      // workflow and not the type of engagement bought. Measured on the shipped
      // WF-004 sibling, whose helper excludes both: its scope line does not fill
      // on this brief.
      mapping: engagement,
      // Card enumeration: Scoping / Build / AMS / Consulting / Training / Audit.
      // Every value except AMS is an ordinary English word, so each is narrowed
      // positively to its engagement form rather than blacklisted — the shape
      // WF-004 `engagement_scope` was rewritten into after the cross-vocabulary
      // probe. The negation guard is carried over from that same spec: a brief
      // saying "not an audit" must not be read as stating one.
      pattern:
        /(?<!\bnot )(?<!\bnot an )(?<!\bno )(?:\baudits?\b|\bAMS\b|\bapplication (maintenance|management) services?\b|\b(scoping|build|consulting|training) (engagement|mission|assignment|phase|contract)\b|\b(engagement|mission|assignment)\b[^.;]{0,20}\b(scoping|build|consulting|training) (phase|work|stream)\b|\btraining (plan|programme|program)\b)/i,
    },
    {
      name: "engagement_duration",
      card: "Engagement duration",
      required: true,
      mapping: engagement,
      // DELIBERATE DIVERGENCE FROM ITS WF-004 SIBLING, and it is grounded on the
      // cards rather than on taste. WF-004 asks `[e.g. 3 days / 2 weeks / 3
      // months]` — concrete quantities. This card asks `[Short < 3 months /
      // Medium 3-12 months / Long > 12 months]` — NAMED CLASSES. So this
      // detector accepts the class words, which its sibling has no reason to,
      // and the policy-consistency table will show that vocabulary as unique to
      // this copy. Read it as intended, not as drift.
      //
      // What does NOT diverge is the anchoring rule: a class word counts only
      // beside duration or engagement vocabulary, and a quantity is never
      // accepted bare. "Medium" alone qualifies a company size at least as often
      // as an engagement ("a medium-sized retailer"), and the bare quantity is
      // the policy already refused by WF-005 `Horizon`, removed from WF-004
      // `Engagement duration` by the cross-vocabulary probe, and refused a third
      // time by WF-006 `Response deadline`.
      //
      // ⚠️ NOTHING IN THE SUITE WOULD TURN RED IF THIS ANCHOR WERE DROPPED, and
      // that is why it is argued here rather than left to a test. Measured over
      // the nineteen briefs: "medium" occurs exactly once in the whole corpus
      // (this workflow's own fixture, "medium duration"), "short" and "long"
      // never, and the corpus states size as "mid-size"/"mid-cap". A bare class
      // word would therefore pass the neutral-prose probe, the cross-vocabulary
      // probe and this manifest's own fixture, while filling on ordinary prose.
      //
      // `phase` is NOT an anchor, diverging from what the WF-004 sibling
      // carried until this same lot: "phase-one deadline in six weeks" is a
      // delivery milestone, and this card asks for the duration CLASS of the
      // whole engagement in months. Measured here first — it was the only
      // illegitimate foreign cell this manifest produced — and the sibling was
      // corrected rather than copied.
      //
      // THE REVERSE BRANCH IS ANCHORED ON `duration` ALONE, and the first draft
      // was wrong here — caught by measuring this manifest before writing a
      // single test for it. Accepting the whole engagement vocabulary in reverse
      // order made the fixture fill on "engagement, sponsors identified, medium"
      // — the class word tied to an `engagement` sitting 24 characters earlier
      // in an unrelated clause, not to the word `duration` beside it. Proven
      // rather than suspected: the same detector filled identically on
      // "engagement, sponsors identified, medium-sized client", a brief stating
      // a SIZE and no duration at all. The card's own phrasing puts the label
      // first ("Engagement duration: medium"), so the reverse order is genuinely
      // needed — `duration` is the field noun that makes it unambiguous, and the
      // window is 16 rather than 24.
      pattern:
        /\b(short|medium|long)([-\s]term)?\b[^.;]{0,16}\b(engagement|mission|assignment|duration|contract|intervention)\b|\bduration\b[^.;]{0,16}\b(short|medium|long)([-\s]term)?\b|\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)[-\s](day|week|month|quarter|year)s?\b[^.;]{0,24}\b(engagement|mission|assignment|contract|intervention)\b|\b(engagement|mission|assignment|contract|intervention)\b[^.;]{0,24}\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)[-\s](day|week|month|quarter|year)s?\b/i,
    },
    {
      name: "stakeholders",
      card: "D1 stakeholders",
      required: true,
      // NAMED `stakeholders` AND NOT `d1_stakeholders`, deliberately. The policy
      // audit pairs specs by stripping a known owner prefix, so a `d1_` name
      // would never be placed beside its WF-004 sibling — the blind spot that
      // file documents in its own header ("it cannot find a divergence it cannot
      // pair"). The D1 qualifier lives on the card label, which is what the
      // operator reads in `PARAMS_MISSING`; `name` stays the internal key.
      //
      // `submittedBy` is NOT mapped, here least of all: this fixture is a
      // self-brief whose submitter IS a stakeholder, which makes it the most
      // tempting place in the catalog to break role ⊥ route.
      mapping: engagement,
      // Card enumeration: Sponsors / Direct manager / Team / CHRO. Two admission
      // regimes, the WF-006 `Decision-makers` policy: TITLES count bare, because
      // a C-level or a sponsor unambiguously answers "who is met on D1"; the
      // bare word `team` does NOT count at all. That last exclusion is the
      // WF-005 `LinkedIn` and WF-006 `competition` rule applied to the most
      // common noun in this corpus — nearly every brief mentions a team, so
      // counting it would leave this spec discriminating nothing.
      //
      // `operational teams?` was added after reading the policy table, which
      // showed it in the WF-004 sibling and absent here while THIS card is the
      // one listing `Team` among its values. The qualified form is exactly the
      // adjacency regime described above, so it costs nothing that the bare word
      // was refused for. Measured: no brief of the nineteen carries the phrase,
      // so this closes an asymmetry without moving a verdict — the `CAC ?40`
      // precedent. `business units` is deliberately NOT carried over: it sits in
      // no card at all, and copying it would propagate an addition rather than
      // align on a source.
      //
      // `sponsors?` carries the plural. Its WF-004 sibling did not, which was an
      // oversight rather than a policy — `\bsponsor\b` sat between
      // `operational teams?` and `business units?`, both of which carry it — and
      // that sibling is corrected in the same lot. This card writes the plural
      // itself: `[Sponsors / Direct manager / Team / CHRO]`.
      pattern:
        /\b(CIO|CDO|CTO|CEO|COO|CFO|CHRO|CISO)\b|\bsponsors?\b|\b(direct|line|reporting) managers?\b|\boperational teams?\b|\b(executive|steering|management) committee\b|\bcomex\b|\bboard\b/i,
    },
    {
      name: "engagement_location",
      card: "Engagement location",
      required: true,
      mapping: engagement,
      // THE WEAKEST NECESSITY CLAIM OF THE ELEVEN, measured rather than felt, and
      // recorded so the demotion candidate is designated in advance. Searching
      // the whole card for `location|on-site|remote|hybrid` returns exactly ONE
      // hit: this parameter block. No step names it as an input or an output —
      // the D1 logistics checklist of STEP-01 never mentions where the work
      // happens. A second, independent signal points the same way: the card's
      // quick-start block asks for five of the nine lines and omits this one.
      // It stays required because §2 classes it must-ask; if one specification
      // here is ever demoted to optional-with-default, it is this one.
      //
      // ⛔ `distributed team` WAS ADMITTED AND IS REMOVED (2026-08-01, found by
      // the WF-010 analytical hardening). This card enumerates exactly
      // `[On-site / Remote / Hybrid]`, so it was a NEW MEMBER on a closed
      // enumeration — the `onboarding` defect of this very manifest and the
      // `portage` defect of WF-009 — and worse, it borrowed the vocabulary of
      // ANOTHER card: `Distribution` is a value of WF-010 `Team involved`. The
      // identical token was removed from WF-009 `Location` on 2026-08-01 for
      // that written reason; this copy survived the same correction.
      //
      // NO GUARD COULD SEE IT, which is why it is documented rather than
      // quietly patched: the cross-vocabulary matrix RECORDS the cell it lit
      // (P10, "distributed team") as a legitimate crossing, and the policy
      // table pairs by name convention — `location` and `engagement_location`
      // do not share a stripped prefix, so the siblings were never put side by
      // side. Impact measured before the edit and confirmed by the diff: the
      // P10 cell drops, and P07, this manifest's own brief, still fills through
      // "hybrid on-site engagement" — no verdict moves.
      pattern:
        /\bon-?site\b|\bon (the )?premises\b|\bremote(ly)?\b|\bhybrid\b|\bwork from home\b/i,
    },
    {
      name: "d1_access",
      card: "D1 access",
      required: true,
      // Reads `constraints` through the shared helper, and that is where the
      // fact actually lands: the fixture states it as a constraint ("badge and
      // VPN access to validate before D1"), not in the prose. A detector reading
      // only need+context would report a gap the operator has already filled.
      mapping: engagement,
      // Card list: Badge, PC, VPN, tools, accounts — commas, so these are
      // EXAMPLES of one fact and not a conjunction (WF-001 `Constraints` and
      // WF-006 `Known risks` precedent). One specification.
      //
      // Bare `access` is refused: "access to the data" and "access to the
      // production logs" are ordinary prose in this corpus, so the word counts
      // only beside what is being accessed or granted.
      pattern:
        /\bbadges?\b|\bVPN\b|\bSSO\b|\blaptops?\b|\bworkstations?\b|\baccess (rights?|credentials?|badges?|requests?)\b|\b(account|credential|access)s? (creation|provisioning|setup|to validate)\b|\bonboarding kit\b/i,
    },
    {
      name: "identified_stakes",
      card: "Identified stakes",
      required: true,
      mapping: engagement,
      // DIVERGES from WF-004 `priority_stakes` and WF-010 `client_stakes`, and
      // the divergence is correct: that card asks WHICH business stakes are the
      // priority (Productivity / Compliance / ROI / Competitiveness / HR), WF-010
      // which project stake was hit (Budget overrun / Deadline / Quality /
      // Scope), and this one the NATURE of the stakes (Business / Technical /
      // Organizational / Political), where "Business" is a value rather than the
      // frame. Three questions under one English word, so a shared detector
      // would be wrong for all three.
      //
      // ⚠️ THIS COMMENT IS NOW THE CARRIER OF THAT DECISION. It previously read
      // "deliberately NOT PAIRED, and the different name is the statement" —
      // i.e. the record was the ABSENCE of a row in the policy table, since that
      // table pairs by name. The end-of-project audit (debt (b)) reversed it:
      // recording a decision as something invisible means nobody re-examines it,
      // which is the exact blind spot the table exists to close and which its own
      // header admits. The three are now aliased onto one role and DISPLAYED
      // side by side with disjoint vocabularies. Reading that row as a defect to
      // "harmonise" is the mistake — the card enumerations are disjoint, so the
      // detectors must be. Nothing about the pairing shares a detector.
      //
      // Every value is an adjective that qualifies almost anything, so none
      // counts bare — the stake vocabulary must sit beside it.
      pattern:
        /\b(business|technical|organi[sz]ational|political)\b[^.;]{0,24}\b(stakes?|challenges?|issues?|risks?|drivers?)\b|\b(stakes?|challenges?|issues?|risks?|drivers?)\b[^.;]{0,24}\b(business|technical|organi[sz]ational|political)\b/i,
    },
    {
      name: "sensitivities",
      card: "Sensitivities",
      required: true,
      mapping: engagement,
      // THE STRONGEST NECESSITY CLAIM OF THE ELEVEN, and the counterweight to
      // `engagement_location` above: it is a literal input line of STEP-03, a
      // BACKBONE step ("Engagement context and sensitivities (STEP-01)").
      //
      // An EXPLICIT declaration of absence counts as a value ("no particular
      // sensitivities"), silence does not — and that falls out of the card's own
      // word being required rather than from a dedicated branch. A first draft
      // carried `no (particular|known|specific) sensitivit\w*` as an extra
      // alternative; measured, it never fires, because `sensitivit\w*` already
      // matches the same sentence. Dead alternatives in a detector are worse
      // than none: they read as a guard that is being applied. That is the WF-006 `Competition`
      // treatment ("sole source" answers whether there is competition) and NOT
      // the WF-005 `Sources to prioritize` refusal — and the two cards are what
      // separate them. STEP-01 of WF-005 cannot run on "no sources": the
      // parameter names what the step must go and read. STEP-03 here runs
      // perfectly well on a declared absence of sensitivities; forcing the
      // operator to invent one, or leaving them in a return loop they cannot
      // exit, would be the defect.
      //
      // ⚠️ That policy is now DECLARED to the denial guard (2026-08-05) instead
      // of resting on the detector happening to match. The guard reads "no
      // particular sensitivities reported" as a denial governing the very word
      // the detector needs, and would close this line — which is why the flag
      // is the spec's own statement of its card's question (WHETHER, not WHICH)
      // rather than a list of exceptions kept in the guard.
      absenceIsAnswer: true,
      pattern:
        /\brestructuring\b|\bredundanc\w*\b|\blay-?offs?\b|\bsocial (context|climate|tension\w*|unrest)\b|\bworks council\b|\bunion\w*\b|\bstrike\b|\bpost-?incident\b|\bpolitically (tense|sensitive|charged)\b|\bmerger\b|\bacquisition\b|\bsensitivit\w*\b/i,
    },
    {
      name: "expected_deliverables",
      card: "Expected deliverables",
      required: true,
      mapping: (b) => b.expectedDeliverable,
      // Reads `expectedDeliverable` alone, the WF-004 treatment: intake
      // guarantees that field is affirmative and non-empty, never that it names
      // one of the card's four families, so this takes a real detector and not a
      // `defaultValue`.
      //
      // `one-?pager` was dropped after reading the policy table: the card says
      // "Client sheet" and never that word, and the synonym made the audit's
      // QUANTITY marker fire on the "one" inside it — a false positive of the
      // very class that marker's definition warns about ("a digit inside a
      // proper noun"). Removing it is both more faithful to the card and one
      // less spurious row in a table whose worth is that it is read.
      //
      // It shares NO vocabulary with its WF-004 sibling, and the cards are why:
      // WF-004 asks for `[Report / Roadmap / Executive-committee presentation /
      // Training]`, this one for `[Kickoff plan / D1 kit / Client sheet / D1
      // report]`. The policy table will show two disjoint vocabularies under one
      // name; that is the cards diverging, not the manifests.
      pattern:
        /\bkick-?off (plan|kit|deck|pack)\b|\bD-?1 kit\b|\bclient (sheet|fact ?sheet|profile)\b|\bD-?1 report\b|\bD-?5 scoping note\b/i,
    },
  ],
};
