/**
 * WF-009 "IT / AI Recruitment" parameter manifest.
 *
 * Derived from the card's `RECRUITMENT CONTEXT` block (path read from the
 * sidecar, never guessed), pinned to catalog v4.2.0 — the real-sidecar test
 * hard-fails on tag drift, forcing a re-derive.
 *
 * Ten card lines become ELEVEN specifications. This card carries no
 * `Expected deliverables` line, so nothing here maps `expectedDeliverable` —
 * the first manifest of the ten with no reader of that field.
 *
 * ⚠️ TWO SLASHES THAT DO NOT MEAN THE SAME THING, which is this card's trap.
 * `Role sought [Title / Level (junior, senior, lead, director)]` is a
 * CONJUNCTION and is split. `Salary / day rate` puts its slash in the LABEL —
 * an alternative NAME depending on the contract type — and its value,
 * `[Range or "to be defined"]`, carries no slash at all. Reading the second as a
 * conjunction would invent a twelfth specification for a fact stated once.
 *
 * `Nice-to-have skills [Desired but non-blocking skills]` is the ONLY
 * card-declared optional in the whole catalog, verified line by line across the
 * ten cards on 2026-08-01. The tracker's "two card-declared optionals" is
 * imprecise and is annotated where it is written: `Deliverables language`
 * (WF-001/002) declares nothing on its card — `[French / English / Bilingual]` —
 * and is optional because it is an OPERATOR-PROFILE constant. Two different
 * justifications, one of each, not two of a kind.
 *
 * `Salary / day rate [Range or "to be defined"]` is a sanctioned unknown, and
 * SILENCE IS NOT THE UNKNOWN — the WF-008 `AI Act tier` rule. P09's "budget is
 * approved" says a budget EXISTS, not what the range is, so it is reported
 * missing where §2 counts the line covered.
 *
 * ONE HOME BRIEF ONLY, and that is a stated weakness of this lot: WF-006 and
 * WF-008 each had two, and it was the second that PROVED two overlapping specs
 * distinct. The replacement is the independent positive control below, and it is
 * a stronger source than a second brief written by the same hand that wrote the
 * detectors — see `test/dispatch-validate-route.test.ts`, "the WF-009 live seed".
 *
 * §2 IS CONFRONTED AT THE CARD LINE (decision of 2026-07-31): aggregated, P09
 * leaves `Contract type` and `Must-have skills` in agreement; this manifest also
 * asks `Salary / day rate`, `Assessment methods` and `Anti-fraud required`; and
 * §2 also asks `Urgency`, `Location` and `Team context` — the documented class
 * where the qualified fixture states what the sketch did not — plus
 * `Nice-to-have skills`, which the card declares non-blocking.
 */

import type { NeedBrief, ParamManifest } from "../types.js";

/** Recruitment facts land in the constraint list as readily as in the prose. */
const recruitment = (b: NeedBrief): string =>
  `${b.need} ${b.context} ${b.constraints.join("; ")}`;

export const WF009_MANIFEST: ParamManifest = {
  workflow: "WF-009",
  catalogTag: "v4.2.0",
  params: [
    {
      name: "role_title",
      card: "Role sought (title)",
      required: true,
      mapping: recruitment,
      // ANCHORED ON RECRUITMENT VOCABULARY, and the anchor was paid for: the
      // bare title list fills on the WF-004 brief through "CDO sponsor" — the
      // CLIENT's own chief data officer sponsoring an engagement, not a post
      // being recruited. A job title names a person as readily as a vacancy, so
      // it counts only where someone is being sought. Same call as `role_level`
      // just below, and measured the same way, before any test existed.
      pattern:
        /\b(hiring|recruit\w*|seeking|looking for|vacancy|opening|role|position|candidate|job description|headcount)\b[^.]{0,32}\b(engineers?|developers?|architects?|data scientists?|analysts?|SRE|devops|product owner|scrum master|tech lead|CTO|CDO)\b|\b(engineers?|developers?|architects?|data scientists?|analysts?|SRE|devops|product owner|scrum master|tech lead|CTO|CDO)\b[^.]{0,32}\b(hiring|recruit\w*|vacancy|opening|position|candidate|job description)\b/i,
    },
    {
      name: "role_level",
      card: "Role sought (level)",
      required: true,
      mapping: recruitment,
      // ANCHORED ON ROLE VOCABULARY, and measured before this file existed: the
      // bare level words fill on the WF-004 brief through "upskilling of their
      // STAFF" — the workforce, not the Staff Engineer grade. Anchored, the
      // detector fills on P09 alone and on zero foreign brief. The card's own
      // four values are junior / senior / lead / director; `principal` and
      // `staff` are the same grade ladder under other names.
      //
      // ⛔ `head of` WAS ADMITTED AND IS REMOVED, and this comment used to argue
      // both sides at once — it said in so many words that it "is not the same
      // ladder" while the pattern accepted it. Two reasons, the second measured:
      // the card offers four levels and this was a fifth, a new member on a
      // closed enumeration (the WF-007 `onboarding` defect class); and it is the
      // token most likely to smuggle the SUBMITTER's role into a card parameter
      // — its only four occurrences in the whole corpus are `submittedBy` values
      // ("Head of Sales", "Head of Engineering", "Head of Data Science", "Head
      // of HR"), the field deliberately mapped nowhere because routing must be
      // invariant to who submits.
      pattern:
        /\b(junior|senior|lead|principal|staff|director)\b[^.]{0,28}\b(engineers?|developers?|architects?|scientists?|analysts?|managers?|role|profile|position|hire|candidate)\b|\b(engineers?|developers?|architects?|scientists?|analysts?|role|profile|position|hire|candidate)\b[^.]{0,28}\b(junior|senior|lead|principal|staff|director)\b/i,
    },
    {
      name: "contract_type",
      card: "Contract type",
      required: true,
      mapping: recruitment,
      // Card values taken BARE, deliberately and on measurement rather than on
      // habit: across the nineteen briefs this fires on zero of them, own and
      // foreign alike, so there is nothing to disambiguate. Anchoring it would
      // cost what over-tightening cost WF-008 `Geography` — refusing the card's
      // own word for no gain. `CDI`/`CDD`/`contractor` are the market
      // synonyms of the card's five. ⛔ `portage` was admitted and is REMOVED:
      // "portage salarial" is a distinct French arrangement the card does not
      // list — a new member on a closed enumeration — and it is the OPERATOR's
      // own employment situation, which has no business inside a recruitment
      // card's values. Measured: no brief of the nineteen contains it.
      pattern:
        /\b(permanent|fixed[- ]term|freelance|internship|apprenticeship|CDI|CDD|contractor)\b/i,
    },
    {
      name: "urgency",
      card: "Urgency",
      required: true,
      mapping: recruitment,
      // Card values: Immediate / 1 month / 3 months. SIXTH appearance of the
      // anchorless-quantity policy, and the first where it was measured BEFORE
      // being written: the bare quantity fills on the WF-002 brief ("PI of 10
      // weeks", "2-week sprints"), which states a cadence and not a hiring
      // deadline. Anchored on the hiring verbs it fills on P09 alone — "start
      // within the quarter" — and on zero foreign brief.
      pattern:
        /\b(immediate(ly)?|asap|urgent)\b[^.]{0,24}\b(hire|hiring|start|onboard|fill|recruit\w*)\b|\b(hire|hiring|start|onboard|fill|recruit\w*)\b[^.]{0,24}\b(immediate(ly)?|asap|urgent)\b|\b(start|hire|onboard|join|fill)\w*\b[^.]{0,20}\b(within|in|by)\b[^.]{0,12}\b(\d+\s*(week|month)s?|one month|three months|the quarter|the month)\b/i,
    },
    {
      name: "location",
      card: "Location",
      required: true,
      mapping: recruitment,
      // A bare CITY NAME is not detected, and that is an accepted miss rather
      // than an oversight: city names are proper nouns with no closed list, and
      // the failure direction is safe. "Location: Paris" is read by the
      // label-declaration rule, which is where the card's own form lands.
      //
      // ⛔ `distributed` was admitted and is REMOVED. It describes a TEAM's
      // dispersion rather than a role's location, it is what made this line fill
      // on the post-mortem brief ("distributed team"), and `Distribution` is a
      // value of the WF-010 card — borrowing another card's vocabulary. The
      // foreign matrix drops from 2 cells to 1.
      pattern: /\b(remote(ly)?|hybrid|on-?site)\b|\bbased in [A-Z]/,
    },
    {
      name: "must_have_skills",
      card: "Must-have skills",
      required: true,
      mapping: recruitment,
      // A REQUIREMENT MARKER IS REQUIRED, and the reason is independence rather
      // than strictness. This card carries BOTH `Must-have skills` and
      // `Nice-to-have skills`, and a list of technologies says which is which
      // only when something marks it. Measured: a naive technology detector
      // fills on P09 through "Kubernetes and MLflow stack" — which is the
      // TEAM's stack, the subject of `Team context` two lines below, so the two
      // specifications would answer each other. With the marker, P09 reports
      // this missing, which is also what §2 says.
      pattern:
        /\b(must[- ]have|must have|non[- ]negotiable|required|requirement|mandatory|expertise in|proficien\w+ in|strong experience)\b[^.]{0,32}\b(skills?|experience|stack|technolog\w+|python|java|kubernetes|mlflow|engineer\w*)\b|\b(skills?|experience|technolog\w+)\b[^.]{0,24}\b(must[- ]have|non[- ]negotiable|mandatory|required)\b/i,
    },
    {
      name: "nice_to_have_skills",
      card: "Nice-to-have skills",
      required: false,
      mapping: () => "",
      // THE ONLY CARD-DECLARED OPTIONAL IN THE CATALOG, verified line by line
      // across the ten cards on 2026-08-01: the card writes "[Desired but
      // non-blocking skills]", and non-blocking is what `required: false` means.
      // It diverges from §2, which classes it must-ask on P09 — the card wins
      // over the table when the card speaks.
      //
      // ⚠️ `required: false` AND `defaultValue` SAY THE SAME THING TO THE CHECK,
      // and falsification proved it: flipping this to `required: true` turns no
      // test red, because `paramFilled` short-circuits on `defaultValue` before
      // `validateRoute` ever consults `required`. The redundancy predates this
      // manifest — WF-001 and WF-002 `deliverables_language` carry the same
      // pair — and it is KEPT rather than trimmed, unlike the dead regex
      // branches removed elsewhere in this repository, because the two fields
      // say different things to a READER: `required: false` records that the
      // CARD declares the line non-blocking, `defaultValue` records what stands
      // in for it.
      //
      // ⛔ AND NO FALSIFICATION CAN GUARD EITHER HALF ALONE — measured, not
      // assumed: flipping `required` leaves the line filled, removing
      // `defaultValue` leaves it filled, and only removing BOTH reports it
      // missing. The two mask each other. The property "this line is never a
      // gap" is therefore doubly guaranteed and singly untestable, which is
      // stated here rather than dressed up as a falsified guard.
      defaultValue: "(card-declared non-blocking — its absence is not a gap)",
    },
    {
      name: "salary_day_rate",
      card: "Salary / day rate",
      required: true,
      mapping: recruitment,
      // The slash is in the LABEL, not in the values: this line is named twice
      // because a permanent hire has a salary and a freelance a day rate. It is
      // ONE fact and one specification.
      //
      // SILENCE IS NOT THE SANCTIONED UNKNOWN, the WF-008 `AI Act tier` rule:
      // the card licenses an explicit "to be defined", not the absence of any
      // statement. P09's "budget is approved" says a budget EXISTS and not what
      // the range is, so this is reported missing where §2 counts the line
      // covered — deliberately.
      pattern:
        /[€$£]\s?\d[\d,. ]*\s*[kK]?\b|\b\d+\s*[kK]\s*(€|EUR|\$|USD)\b|\b(salary|day rate|package|compensation)\b[^.]{0,24}\b\d/i,
      sanctionedUnknown:
        /\b(salary|day rate|package|compensation|budget)\b[^.]{0,32}\bto be (defined|determined|discussed|confirmed)\b|\bto be (defined|determined|discussed)\b[^.]{0,24}\b(salary|day rate|package|compensation)\b/i,
    },
    {
      name: "team_context",
      card: "Team context",
      required: true,
      mapping: recruitment,
      // Commas on the card (`Team size, tech stack, culture`) mean EXAMPLES of
      // one fact, not a conjunction — the WF-001 `Constraints` and WF-006
      // `Known risks` precedent. One specification.
      //
      // ANCHORED, and measured before this file existed: the bare words fill on
      // FIVE foreign briefs (`squad`, `squads`, `team`, `team`, `squad`), which
      // would leave this specification discriminating nothing — the WF-007
      // `Team` lesson. A team SIZE or a NAMED stack is what answers the card;
      // anchored, it fills on P09 alone.
      pattern:
        /\bteams?\b[^.]{0,20}\b(of \d+|of (three|four|five|six|seven|eight|nine|ten)|size)\b|\b(\d+|three|four|five|six|seven|eight|nine|ten)[- ](person|people|engineers?|developers?)\s+teams?\b|\b(tech(nology)?|technical) stack\b|\b(python|typescript|java|kubernetes|mlflow|docker|terraform|spark|kafka)\b[^.]{0,20}\bstack\b|\bteam culture\b/i,
    },
    {
      name: "assessment_methods",
      card: "Assessment methods",
      required: true,
      mapping: recruitment,
      // Card values taken bare, on measurement: zero fills across the nineteen
      // briefs, own and foreign, so there is nothing to disambiguate here
      // either. ⛔ `pair programming` and `assessment centre` were admitted and
      // are REMOVED — distinct methods this card does not list, absent from every
      // brief, so removing them changes no verdict.
      pattern:
        /\b(tech(nical)? interview|code test|coding test|practical case|take[- ]home|reference checks?)\b/i,
    },
    {
      name: "anti_fraud_required",
      card: "Anti-fraud required",
      required: true,
      mapping: recruitment,
      // The card ends this line with "yes/no", so it asks WHETHER — and an
      // explicit negation is a value, the WF-006 `Competition` treatment rather
      // than the WF-005 `Sources to prioritize` refusal. "No background check
      // required" answers the card; silence does not.
      //
      // Declared to the denial guard (2026-08-05). This spec is the clearest of
      // the five: its detector carries an explicit `no (background|reference)
      // checks?` alternative, so the guard was cancelling a branch the spec had
      // deliberately written — the denial token sits INSIDE the very match it
      // was meant to license. Measured before the fix, not inferred.
      absenceIsAnswer: true,
      pattern:
        /\bverify\b[^.]{0,32}\b(diplomas?|degrees?|linkedin|references?)\b|\b(background|reference|diploma|identity) checks?\b|\banti[- ]fraud\b|\bno (background|reference) checks?\b/i,
    },
  ],
};
