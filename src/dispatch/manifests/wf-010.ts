/**
 * WF-010 "Project Post-mortem / Lessons Learned" parameter manifest — the
 * TENTH and last of the set.
 *
 * Derived from the card's `POST-MORTEM CONTEXT` block (path read from the
 * sidecar, never guessed), pinned to catalog v4.3.0 — the real-sidecar test
 * hard-fails on tag drift, forcing a re-derive.
 *
 * Nine card lines become TWELVE specifications, through two conjunctions whose
 * slashes do NOT play the same role — this card's trap, and the WF-009 one
 * again in mirror image:
 *   - `Project / Incident : [Name + start/end dates]` puts its slash in the
 *     LABEL (a post-mortem covers a project OR an incident), and the
 *     conjunction is the `+` inside the values: a Name AND its dates. TWO
 *     specifications.
 *   - `Team involved : [Size / Distribution / Remote or on-site]` is a
 *     conjunction of the ordinary kind. THREE specifications.
 *   - `Available data : [KPIs, metrics, meeting minutes, logged incidents]`
 *     separates with COMMAS, so those are examples of one fact — the WF-001
 *     `Constraints`, WF-006 `Known risks` and WF-009 `Team context`
 *     precedent. ONE specification.
 *
 * NO SANCTIONED UNKNOWN: the block was scanned for the licence markers of the
 * three that exist in the catalog (`Not disclosed`, `to be defined`, `to
 * confirm in STEP-01`) and carries none. ONE optional, and it is neither
 * card-declared nor an operator-profile constant — see `expected_format`.
 *
 * THE INDEPENDENT CONTROL IS THE LIVE-HARNESS SEED, not a second brief of my
 * own — `test/wf-010-run-live.test.ts`, written for the SPINE and therefore by
 * a concern that knows nothing of this policy (WF-005 and WF-009 method).
 * Flattened to prose WITHOUT its field labels it fills 10 of the 12. The two it
 * leaves missing are the seed's own silence and not a detector defect: it
 * states no dates, and it has no HR field at all. ⛔ The expectation was NOT
 * tuned until the number improved — and the control earned its keep, because it
 * FALSIFIED the first draft of `project_incident_name` (below).
 *
 * §2 IS CONFRONTED AT THE CARD LINE (decision of 2026-07-31), never at the
 * spec: this card is nine lines and this manifest is twelve facts, so comparing
 * at the spec produces arithmetic instead of judgements. Aggregated, P10 and
 * P13 agree with §2 on `Team involved` (both), `Report audience` (both),
 * `HR sensitivities` (both) and `Project duration` (P13); this manifest asks in
 * addition `Project / Incident` (both, on its dates half), `Closeout type`
 * (P10, whose brief says the project "is closed" without saying how it ended)
 * and `Client stakes` (P13); and §2 asks in addition `Available data` (both)
 * and `Project duration` (P10) — the documented class where the qualified
 * fixture states what the matrix sketch did not.
 */

import type { NeedBrief, ParamManifest } from "../types.js";

/** Post-mortem facts land in the constraint list as readily as in the prose. */
const postMortem = (b: NeedBrief): string =>
  `${b.need} ${b.context} ${b.constraints.join("; ")}`;

export const WF010_MANIFEST: ParamManifest = {
  workflow: "WF-010",
  catalogTag: "v4.3.0",
  params: [
    {
      name: "project_incident_name",
      card: "Project / Incident (name)",
      required: true,
      mapping: postMortem,
      // ONLY THE CARD'S OWN TWO NOUNS, and the first draft is why that is
      // written down rather than assumed. It accepted any qualifier before
      // `project|programme|rollout|migration`, and measured over the corpus
      // before a line of test existed it produced TWO false fills: P03
      // "before rollout" — a preposition promoted to a designation — and P15
      // "…this is ongoing operations staffing, NOT A bounded project", filling
      // a project NAME from a sentence denying there is one. `programme`,
      // `rollout` and `migration` are gone: this card's line is labelled
      // `Project / Incident`, so they were new members of my own invention
      // (the WF-007 `onboarding` / WF-009 `portage` defect class).
      //
      // ⛔ A SECOND DRAFT REQUIRED THE DETERMINER `the`, and the independent
      // live seed falsified it: the seed designates "Synthetic AI delivery
      // project" with no determiner at all. That is what an independent source
      // is for — the anchor was a form assumption of mine, not a property of
      // how a project gets named. Replaced by the negation guard, which is
      // house policy rather than a fit to this corpus (WF-004
      // `engagement_scope` refuses a negated scope, WF-005 `Sources to
      // prioritize` refuses "no monitored sources yet").
      //
      // The incident branch requires a DESIGNATED system, which is also what
      // keeps this specification independent of `closeout_type` below: the bare
      // word `incident` answers WHAT KIND of closeout, and answers WHICH
      // incident only when it names one. Measured: exactly P10 "chatbot
      // project" and P13 "incident hit the fraud-scoring model", zero foreign
      // brief. A bare CLIENT name never fills it — that is `client_name` on
      // four other cards, and this line asks for the project.
      //
      // ⚠️ ACCEPTED MISS, measured against the card's own quick-start form and
      // written here rather than left to be discovered: a project NAMED without
      // the word "project" is not read — "Project / Incident: Atlas migration"
      // reports missing. Only this card's two nouns count, so the detector
      // recognises a syntactic FORM and not a name, exactly as WF-004
      // `client_name` documents for appositions. Widening it was measured and
      // refused: `migration` and `rollout` are what filled on P03's "before
      // rollout". Safe direction, and `PARAMS_MISSING` names the half to
      // restate. See the quick-start test, which records the behaviour.
      pattern:
        /(?<!\bnot )(?<!\bnot a )\b[a-z][a-z-]{2,}\s+project\b|\bincidents?\b[^.]{0,40}\b(the|a)\s+[a-z][a-z-]{2,}(-[a-z]+)?\s+(model|system|platform|service|chatbot|pipeline|application)\b/i,
    },
    {
      name: "project_incident_dates",
      card: "Project / Incident (start/end dates)",
      required: true,
      mapping: postMortem,
      // FILLS ON NOTHING IN THE CORPUS — own briefs included — and that is the
      // deliberate result rather than an oversight. STEP-01 takes "Project
      // data: initial vs actual schedule" as a literal input and its first
      // output is an "annotated project timeline": a post-mortem cannot state a
      // planned-versus-actual gap without the window, so this half of the
      // conjunction is asked even though both fixtures are silent on it. It is
      // the reason `PARAMS_MISSING` names halves: the operator is told the
      // DATES are missing, not the whole line whose name they already gave.
      //
      // RELATIVE DATES ARE REFUSED, and the trade was measured both ways:
      // accepting "last week / yesterday" buys P13's own fill and costs a false
      // one on P12, "contract SIGNED YESTERDAY", where the date belongs to a
      // contract signature in an engagement brief. Safe direction preferred, as
      // everywhere here — a false "missing" costs one question, a false
      // "filled" costs the timeline.
      //
      // A bare month name is refused for the same reason: P17 states "the
      // office move of the Lyon site in September", a date that belongs to a
      // facilities move. Anchored on project/incident/closure vocabulary, or
      // stated as a two-sided window, it fills on none of the twenty.
      pattern:
        /\bfrom\b[^.]{0,20}\bto\b[^.]{0,24}\b(20\d\d|january|february|march|april|may|june|july|august|september|october|november|december)\b|\bbetween\b[^.]{0,24}\band\b[^.]{0,24}\b20\d\d\b|\b(projects?|incidents?|closed|closure|ran|started|launched|kicked off|went live)\b[^.]{0,24}\b(in|on|since|until|from)\b[^.]{0,12}\b(20\d\d|january|february|march|april|may|june|july|august|september|october|november|december)\b|\b\d{4}-\d{2}-\d{2}\b/i,
    },
    {
      name: "closeout_type",
      card: "Closeout type",
      required: true,
      mapping: postMortem,
      // Card enumeration verbatim: Success / Partial failure / Incident / End
      // of SAFe PI. The bare word `incident` IS accepted here, which is the
      // opposite call to WF-006 `Request type` refusing a bare `competition`
      // although its card lists it — and the difference is where the ambiguity
      // sits. There, the token was another line's LABEL AND its value, so
      // counting it made two specifications answer each other. Here the guard
      // that keeps the two lines independent lives on the NAME above (a
      // designated system is required), so this line can read its own card
      // value plainly. P13's whole closeout type is an incident; refusing the
      // word would make the card unreadable on its own subject.
      //
      // ⚠️ RECORDED FOREIGN CELL, qualified rather than engineered away: this
      // fills on P02 through "compliance date at END OF PI-7" — a SAFe deadline
      // expressed against a program-increment boundary, not the closeout type
      // of a post-mortem. `End of SAFe PI` is a value of this card written
      // exactly as the card writes it, and a detector must not refuse its own
      // card's value (the rule settled 2026-07-31). The cell is therefore left
      // in the cross-vocabulary matrix with this explanation, in the class where
      // WF-001 `Sector` already sits: this check has never claimed to validate
      // the route.
      //
      // ⛔ AN INCIDENT THAT IS A DATA SOURCE IS NOT A CLOSEOUT TYPE, and this
      // guard was found by the card-value pass rather than by a fixture: the
      // card's own `Available data` line offers "logged incidents", so a brief
      // listing its evidence would have filled this line too — two
      // specifications of the SAME manifest answering each other, the defect
      // this manifest already guards between its name/closeout and
      // distribution/work-mode pairs. P13 keeps its fill through "incident hit
      // the fraud-scoring model", which is the event and not the log.
      pattern:
        /\b(success(ful)?|partial failures?|failed|failures?|outages?)\b|(?<!\blogged )\bincidents?\b(?! logs?\b)|\bend of (safe )?pi\b/i,
    },
    {
      name: "project_duration",
      card: "Project duration",
      required: true,
      mapping: postMortem,
      // SEVENTH APPEARANCE OF THE ANCHORLESS-QUANTITY FAMILY, and measured
      // before it was written for the second lot running: the bare quantity
      // adds P02, which states "PI of 10 weeks" and "2-week sprints" — a
      // cadence, not a project duration. Anchored on the card's own noun it
      // fills on P10 alone ("10-month project"), zero foreign brief.
      //
      // DELIBERATE DIVERGENCE FROM ITS WF-007 SIBLING, grounded on the cards.
      // WF-007 asks `[Short < 3 months / Medium 3-12 months / Long > 12
      // months]` and its detector therefore accepts the class WORDS. This card
      // names no classes at all — `[< 3 months / 3-12 months / > 12 months]` —
      // so `short`/`medium`/`long` would be new members here, and "a short
      // project" is read as missing. Safe direction, and the message names the
      // card label so the operator sees which word to add.
      //
      // The hyphenated and bracketed forms are the card's own values written as
      // the card writes them, and the second-pass check of 2026-07-31 earned
      // its keep here: `\b[<>]` NEVER MATCHES — a word boundary cannot sit
      // between a space and `<` — so "< 3 months" and "> 12 months", two of
      // this line's three card values, were unreadable in the very draft whose
      // comment claimed to read them. Same class as the WF-008 `Geography`
      // defect (an article the card does not write). Measured: dropping the
      // boundary changes no verdict on the twenty briefs, it only lets the card
      // be answered in its own words.
      pattern:
        /\b\d+[- ](month|week|year)s?\b[^.]{0,16}\b(projects?|programmes?|closure|post-?mortem)\b|\b(projects?|programmes?)\b[^.]{0,16}\b\d+[- ](month|week|year)s?\b|\b\d+\s?-\s?\d+\s+months?\b|[<>]\s?\d+\s+months?\b|\b(project )?duration\b[^.]{0,16}\b\d/i,
    },
    {
      name: "team_size",
      card: "Team involved (size)",
      required: true,
      mapping: postMortem,
      // ⚠️ PAIRS WITH WF-001 `team_size` IN THE POLICY TABLE — same internal
      // name on purpose, so the two readings of the same card fact are put side
      // by side — AND THE TABLE WILL SHOW THEM DISJOINT. Measured, in both
      // directions: WF-001 reads `squads?` / `N developers` and cannot read
      // "team of eight"; this one reads "team of eight" and "8 people".
      //
      // ✅ SETTLED BY THE END-OF-PROJECT AUDIT (debt (a)). The entry above
      // called the gap two-sided and symmetric. IT IS NEITHER, and the cards
      // are what break the tie — re-read at the pin, not inferred:
      //   · WF-001 `Team size : [Solo / 1 squad / Several SAFe teams]` is a
      //     CLOSED enumeration. "team of eight" is not one of its values, so
      //     reading it would invent a new member — the class corrected on
      //     WF-007 (`onboarding`) and WF-009 (`portage`). Left untouched, and
      //     the probe agrees: widening it buys a foreign cell on P09 and moves
      //     no verdict of its own.
      //   · THIS line, `Team involved : [Size / Distribution / Remote or
      //     on-site]`, enumerates nothing. `Size` is an open fact, so "3 squads"
      //     IS a size and refusing it was the real gap — one-sided, here.
      // So the agile-count branch below was ADDED, with a count required (bare
      // `squads` is what WF-001 reads, because "1 squad" is literally one of its
      // card values; on this line a bare squad states no size). Cost measured:
      // foreign cells 6 → 7, the single new one P02 ← "3 squads", a genuine
      // team-size statement about another card's team — the recorded-crossing
      // class below, not a false fill. Invisible to the corpus in both
      // directions (P10 states a distribution, P13 no team), so the gain is
      // asserted on the form the CARD teaches, in dispatch-validate-route.
      //
      // Fills on P09 ("platform team of eight"), a foreign brief, and on no own
      // brief: a genuine team-size statement about another card's team. That is
      // the recorded-crossing class, not a defect.
      pattern:
        /\bteams?\b[^,.]{0,12}\bof (\d+|three|four|five|six|seven|eight|nine|ten)\b|\b(\d+|three|four|five|six|seven|eight|nine|ten)[- ](person|people|engineers?|developers?)\b|\bteam size\b[^.]{0,12}\b\d|\b\d+\s+(squads?|scrum teams?|safe teams?)\b/i,
    },
    {
      name: "team_distribution",
      card: "Team involved (distribution)",
      required: true,
      mapping: postMortem,
      // THIS IS WHERE `distributed` BELONGS, and saying so cost a correction in
      // two other manifests. It was removed from WF-009 `Location` on
      // 2026-08-01 with that reason written down — `Distribution` is a value of
      // THIS card — and the same lot that wrote this manifest found the same
      // token still shipped in WF-007 `engagement_location`, whose card
      // enumerates exactly `[On-site / Remote / Hybrid]`. Both were the
      // borrowed-vocabulary defect; neither guard could see it, because the
      // cross-vocabulary matrix records such a cell as legitimate and the policy
      // table cannot pair `location` with `engagement_location`.
      //
      // Measured: fills on P10 ("distributed team") and on zero foreign brief.
      pattern:
        /\bdistribut\w*\b|\bmulti-?site\b|\btime ?zones?\b|\boffshore\b|\bnearshore\b|\bspread across\b|\bco-?located\b/i,
    },
    {
      name: "team_work_mode",
      card: "Team involved (remote or on-site)",
      required: true,
      mapping: postMortem,
      // ANCHORED ON THE TEAM WITHOUT CROSSING A COMMA, and every part of that
      // was measured. The bare card values fill on TWO foreign briefs and on no
      // own one: P07 "hybrid on-site engagement" (the engagement's location,
      // WF-007's own line) and P09 "platform team of eight, HYBRID Paris" (where
      // the role is hybrid, not the team). A window of `{0,24}` would still
      // have caught P09 across its comma — the eleven characters between "team"
      // and "hybrid" are exactly the accident the WF-007 lesson warns about — so the class separator is refused inside the window instead of
      // counting characters.
      //
      // Result: fills on NOTHING in the corpus, and that is the honest outcome
      // rather than a defect — neither fixture states how the team worked, and
      // §2 classes `Team involved` must-ask on both. The independent live seed
      // fills it through "hybrid team", which is the phrasing this detector
      // exists for.
      //
      // ⛔ It must never read `distributed`: that is the sibling above, and
      // reading it here would make the two halves of the same conjunction
      // answer each other.
      //
      // ⚠️ THE COST OF THAT GUARD IS PAID ON THE CARD'S OWN FORM, and it is
      // measured rather than suspected: "Team involved: 9 people, distributed,
      // hybrid" — the three halves listed as the card lists them — leaves THIS
      // one missing, because the comma guard refuses to cross the separator and
      // the label rule cannot serve a conjunction's halves (it matches the
      // spec's qualified `card` string, a structural exclusion settled
      // 2026-07-31). The other two halves fill. Recorded by the quick-start
      // test; dropping the guard re-admits P09 and is not the answer.
      pattern:
        /\bteams?\b[^,.]{0,20}\b(remote(ly)?|on-?site|hybrid)\b|\b(remote(ly)?|on-?site|hybrid)\b[^,.]{0,12}\bteams?\b|\bworks? from home\b/i,
    },
    {
      name: "client_stakes",
      card: "Client stakes",
      required: true,
      mapping: postMortem,
      // THE STAKE MUST BE MATERIALIZED, and this is the most decisive anchoring
      // measurement of the lot: the four card values taken bare fill on NINE of
      // the twenty briefs — P01, P06, P09, P11, P12, P14, P16, P17, P20 — and
      // on neither own brief for the right reason. `deadline` is the token
      // WF-006 `Response deadline` owns (P06, P12, P14 all state one) and
      // `scope` is what a scoping mission is called (P06, P11, P17). A
      // specification filled by nine foreign briefs and zero own ones
      // discriminates nothing.
      //
      // ⚠️ THREE OF THE FOUR CARD VALUES ARE THEREFORE REFUSED BARE — Deadline,
      // Quality, Scope — and that is named here rather than left silent (the
      // 2026-07-31 audit found exactly one refusal nobody had written down).
      // The card's own quick-start form still works: `paramFilled` accepts a
      // parameter the brief answers BY NAMING IT, so "Client stakes: Deadline"
      // fills through the label rule. What is refused is the loose word in
      // ordinary prose, which is a different thing.
      //
      // Measured anchored: P10 alone, through "shipping four MONTHS LATE".
      pattern:
        /\b(budget|cost|schedule)\s+overruns?\b|\bover budget\b|\boverran\b|\b(months?|weeks?|days?)\s+late\b|\bbehind schedule\b|\bmissed\s+(the\s+)?deadlines?\b|\bdeadlines?\s+(missed|slipp\w+|overrun)\b|\bscope (creep|drift|changes?)\b|\bout of scope\b|\bqualit\w+\s+(issues?|problems?|defects?|gaps?)\b/i,
    },
    {
      name: "available_data",
      card: "Available data",
      required: true,
      mapping: postMortem,
      // Commas on the card mean EXAMPLES of one fact, not a conjunction — the
      // WF-001 `Constraints`, WF-006 `Known risks` and WF-009 `Team context`
      // precedent. One specification.
      //
      // The cleanest detector of the twelve, measured: it fills on P10 ("KPIs
      // and meeting minutes available") and P13 ("incident logs and monitoring
      // data available") and on ZERO foreign brief. It is also the largest
      // divergence with §2, which classes this line must-ask on both — the
      // documented class where the qualified fixture states what the sketch did
      // not.
      pattern:
        /\bkpis?\b|\bmetrics?\b|\bmeeting minutes\b|\b(incident|monitoring|system|application)\s+(logs?|data)\b|\blogged incidents?\b|\bmonitoring data\b|\bdashboards?\b/i,
    },
    {
      name: "report_audience",
      card: "Report audience",
      required: true,
      mapping: postMortem,
      // The strongest necessity claim of the twelve, measured: it is a literal
      // input line of STEP-06 ("Report audience (team / steering committee /
      // client / public)"), the BACKBONE step that closes the workflow, and the
      // card's quick-start asks for it.
      //
      // ⛔ NOT NAMED `audience`, which would pair it with WF-005 in the policy
      // table. Their cards enumerate different KINDS of fact — WF-005 lists
      // publication channels (`Public LinkedIn / Client newsletter / Personal
      // network`), this one lists readers — so the pair would show a permanent
      // divergence that means nothing, and a table that cries wolf stops being
      // read. Consigned as an observation instead.
      //
      // THREE RECORDED FOREIGN CELLS, all genuine audience statements about
      // another card's deliverable — the least discriminating specification of
      // the twelve, and that is stated rather than hidden: P02 "the steering
      // committee expects clean executive progress reporting", P08 "board
      // presentation expected", and P05 "PUBLIC LinkedIn audience", which is
      // the subject of WF-005's own `audience` line. A
      // directional anchor (`for the <audience>`) was measured and REJECTED: it
      // keeps P10 but kills P13, whose own phrasing is "THE BOARD WANTS to
      // understand what happened" — the very same form as P02's.
      //
      // ⛔ `Client` is the ONE card value refused bare, and it has to be: every
      // brief of the corpus names a client. The label rule covers "Report
      // audience: Client", which is the form the card's quick-start teaches.
      //
      // `Public` IS read bare, and that is a correction of the first draft
      // rather than a liberty: it required "general public" / "made public",
      // which refused the card's own word. ⚠️ It does NOT cost nothing, and the
      // first version of this comment said it did — a scratch measurement of
      // mine had silently dropped the `context` of three briefs whose value
      // wraps to a second line (P01, P05, P19). The versioned instrument, which
      // reads the fixture objects rather than their source text, immediately
      // showed the P05 cell. The widening is kept anyway, because reading its
      // own card's value is what this detector owes (the rule settled
      // 2026-07-31), and the cell it lights is a real audience statement.
      pattern:
        /\binternal teams?\b|\bsteering[- ]committees?\b|\bexecutive committees?\b|\bexec committees?\b|\bcomex\b|\bboard\b|\bpublic\b/i,
    },
    {
      name: "expected_format",
      card: "Expected format",
      required: false,
      mapping: () => "",
      // THE ONE OPTIONAL OF THIS MANIFEST, and it is a THIRD kind of default —
      // neither card-declared like WF-009 `Nice-to-have skills`, nor an
      // operator-profile constant like WF-001 `Deliverables language`, but a
      // WORKFLOW INVARIANT: STEP-06 produces every format the line offers. Its
      // `output_attendu` lists the "Complete lessons-learned report (10-20
      // pages)", the "1-page executive summary" AND the steering-committee
      // presentation "IF REQUIRED" — the card itself defers that last choice to
      // the step. A parameter the run cannot lack is not a gap to send the
      // operator back for.
      //
      // The measurement is what settled it rather than the argument. As a
      // required specification with a detector, this line fills on ZERO own
      // brief and on exactly ONE foreign brief — P08's "board presentation
      // expected" — so its only cell in the whole corpus would be a false one.
      //
      // ⛔ AND IT IS NOT FIXED BY MAPPING `expectedDeliverable`: that field
      // names WHAT is produced ("Lessons-learned report and improvement plan"),
      // not the FORM it takes, and letting a deliverable's name answer a format
      // question is the kind of near-miss this manifest set exists to refuse.
      // Measured: the word "report" appears in ZERO of the twenty briefs'
      // mapped text, so nothing else was available either.
      //
      // ⚠️ `required: false` and `defaultValue` mask each other — flipping
      // either alone turns no test red (measured on WF-009, and the mechanism is
      // in `paramFilled`, which short-circuits on `defaultValue` before
      // `validateRoute` consults `required`). Both are kept because they say
      // different things to a reader, and no falsification is claimed for
      // either half alone.
      defaultValue: "(STEP-06 emits all three card formats; the presentation is decided at the step)",
    },
    {
      name: "sensitivities",
      card: "HR sensitivities",
      required: true,
      mapping: postMortem,
      // ⚠️ NAMED TO PAIR WITH WF-007 `sensitivities` IN THE POLICY TABLE, and
      // unlike the `audience` case above the pairing is earned at the cards:
      // `Social context` is literally a value of BOTH (`[Social context,
      // restructuring, post-incident, etc.]` there, `[Team tensions to manage /
      // Social context]` here). The human-readable qualifier is not lost — the
      // `card` label is what `PARAMS_MISSING` shows the operator, and it says
      // "HR sensitivities".
      //
      // The measurement confirms the pairing rather than merely permitting it:
      // this fills on P19 through "works council to be informed", and the
      // shipped cross-vocabulary matrix records WF-007 `Sensitivities` filling
      // on P19 for that same fact. The siblings agree on the same brief through
      // the same words.
      //
      // AN EXPLICIT DECLARATION OF ABSENCE COUNTS AS A VALUE ("no team
      // tensions"), silence does not — inherited from the WF-007 sibling, and
      // for its reason: STEP-03 runs perfectly well on a declared absence, so
      // forcing the operator to invent one would be the defect. Declared to the
      // denial guard (2026-08-05) through `absenceIsAnswer`, exactly as the
      // sibling does — the pairing the policy table already asserts must hold
      // for this flag too, or the two cards would answer the same question in
      // opposite directions while each stayed green on its own fixture.
      absenceIsAnswer: true,
      //
      // ⛔ `post-incident` is a value of the WF-007 card and is deliberately NOT
      // read here: on THIS card an incident is a `Closeout type`, and reading it
      // as an HR sensitivity would make two specifications of the same manifest
      // answer each other (the WF-006 `Request type` / `competition` rule).
      pattern:
        /\bsensitivit\w*\b|\btensions?\b|\bconflicts?\b|\bsocial (context|climate|unrest)\b|\bmorale\b|\bworks councils?\b|\bunion\w*\b|\bstrikes?\b|\brestructuring\b|\bredundanc\w*\b|\blay-?offs?\b/i,
    },
  ],
};
