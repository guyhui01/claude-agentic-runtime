/**
 * WF-006 "Pre-sales / Commercial proposal" parameter manifest.
 *
 * Derived from the card's `PRE-SALES CONTEXT` block
 * (`claude-agents/workflows/WF-006-avant-vente-proposition-commerciale.md`),
 * pinned to catalog v4.2.0 — the real-sidecar test hard-fails on tag drift.
 *
 * ELEVEN card lines, FOURTEEN specifications. `Prospect [Name / Sector / Size /
 * AI maturity]` is a RULE 2 conjunction, and the split is not an interpretation:
 * STEP-01's own input line reads "Prospect context: sector, size, AI maturity,
 * history". The ten other lines are "or" enumerations. `Known risks
 * [Aggressive competition, floor price, hidden requirements]` uses COMMAS, not
 * slashes — illustrative examples of one fact, the same shape as WF-001's
 * `Constraints` line, so it stays a single spec.
 *
 * All fourteen are `required`, with no `defaultValue`. One `sanctionedUnknown`:
 * `Indicative budget [Estimated range / Not disclosed]`, which is the FIRST
 * real use of that field in the codebase — it was wired in `validate-route.ts`
 * when the policy was settled and no manifest had exercised it until now.
 *
 * Three judgements worth the reader's time, all settled at the card:
 *
 *   - `Constraints` deliberately takes NO `defaultValue`, unlike WF-001/002/004.
 *     Their card line is generic (milestone, budget, GDPR, imposed stack), so
 *     intake's "constraints non-empty or justified" invariant genuinely
 *     satisfies it. This card's line is specifically about HOSTING (On-premise /
 *     Sovereign cloud / SecNumCloud / HDS). The upstream invariant guarantees
 *     *a* constraint, never an infrastructure one — hence the name
 *     `infra_constraints`, so a later reader cannot confuse the two.
 *
 *   - `Competition [Firms competing / Sole source]` accepts a NEGATION as a
 *     filled value. This is the exact inverse of the WF-005 `Sources to
 *     prioritize` guard, where "no monitored sources yet" was a false "filled".
 *     Here the absence of competitors IS the fact the card asks for, so "sole
 *     source" fills. It is a VALUE, not a sanctioned unknown.
 *
 *   - `Request type` refuses the bare token `competition`, although the card
 *     lists it as an enumeration value. The same word is the label of a
 *     DIFFERENT line of this same card (`Competition`), so counting it bare
 *     would make two specs non-independent — the WF-005 `LinkedIn` policy.
 *     Only the process forms ("competitive tender/bid") count here.
 *
 * `Selection criteria` carries the weakest NECESSITY claim of the fourteen, and
 * it is recorded rather than smoothed: a grep for "criteri" over the whole card
 * returns exactly one hit — this parameter block itself. No step names it as an
 * input or an output. It stays required because dry-run §2 classes it must-ask
 * on BOTH of this workflow's briefs (P06 and P11); if one spec here is ever
 * demoted to optional-with-default, it is this one. `Competition` is the second
 * weakest: its only exact-match consumer, STEP-03B, is optional and outside the
 * backbone.
 *
 * `submittedBy` is mapped by NO spec here, and the reason is doctrinal rather
 * than stylistic — see `decision_makers`, where the temptation is maximal.
 */

import type { NeedBrief, ParamManifest } from "../types.js";

/** Commercial facts land in the constraint list as readily as in the prose. */
const presales = (b: NeedBrief): string =>
  `${b.need} ${b.context} ${b.constraints.join("; ")}`;

/**
 * `Proposal format` is the one spec whose fact can sit in `expectedDeliverable`
 * ("oral presentation expected") as easily as in the prose, so it reads both.
 * Precedent: WF-001 `level_of_detail` and WF-004 `expected_deliverables` map
 * that field for deliverable-shaped lines. The caveat those carry applies here
 * too — intake guarantees the field is affirmative and non-empty, NEVER that it
 * names one of the card's four formats, so this stays a real enumeration
 * detector and could not be a `defaultValue`.
 */
const presalesWithDeliverable = (b: NeedBrief): string =>
  `${presales(b)} ${b.expectedDeliverable}`;

export const WF006_MANIFEST: ParamManifest = {
  workflow: "WF-006",
  catalogTag: "v4.2.0",
  params: [
    {
      name: "prospect_name",
      card: "Prospect (name)",
      required: true,
      mapping: presales,
      // Same SHAPE detector as WF-004 `client_name` (the card gives no
      // enumeration to key on), with one addition the card itself licenses:
      // `Prospect` as an introducer, because that is this field's own label.
      // That closes, for this manifest only, the apposition weakness WF-004
      // documented and locked as accepted — P11 opens on "Prospect Kestrel
      // Mutual", which the with/for/at shape reads as unnamed. WF-004 is NOT
      // amended: its behaviour is reviewed, test-locked and shipped.
      pattern:
        /\b(?:with|for|at|from)\s+(?!the\b|a\b|an\b|our\b|their\b|its\b|this\b)[A-Z][a-z][\w&'-]*(?:\s+[A-Z][\w&'-]+){0,3}|\b[Pp]rospect\s+(?!the\b|a\b|an\b)[A-Z][a-z][\w&'-]*(?:\s+[A-Z][\w&'-]+){0,3}|\b[A-Z][\w&'-]+\s+(?:GmbH|SAS|SARL|SA|Ltd|Limited|Inc\.?|LLC|plc|AG|BV|NV)\b/,
    },
    {
      name: "prospect_sector",
      card: "Prospect (sector)",
      required: true,
      mapping: presales,
      // Duplicated from WF-004 `client_sector` rather than factored out, and
      // that is a decision, not an oversight: WF-004's list is "the catalog's
      // own, widened to the ones THIS engagement type meets", and `client_size`
      // below carries an exclusion owed to the neutral probe. A regex shared on
      // the strength of two samples encodes a coincidence. WF-007 carries the
      // same conjunction and is the point to reconsider — if by then the three
      // texts have converged to the identical alternation.
      pattern:
        /\b(food[-\s]?(industry|processing|retail)?|agri\w*|bank\w*|insur\w*|retail\w*|industr\w*|manufactur\w*|health\w*|pharma\w*|logistic\w*|energy|utilit\w*|telecom\w*|public[- ]sector|e-?commerce|automotive|luxury|media|mutual insurer)\b/i,
    },
    {
      name: "prospect_size",
      card: "Prospect (size)",
      required: true,
      mapping: presales,
      // Size CLASSES and headcounts only. `mid-size` stays deliberately absent
      // for the reason WF-004 recorded: it is ordinary prose, and the
      // neutral-probe brief says "a mid-size company".
      pattern:
        /\b(mid[-\s]?cap|large[-\s]?cap|small[-\s]?cap|SME|SMB|ETI|start-?up|scale-?up|multinational|CAC ?40|\d+\s*(employees|staff|FTEs?|headcount))\b/i,
    },
    {
      name: "prospect_ai_maturity",
      card: "Prospect (AI maturity)",
      required: true,
      mapping: presales,
      // Same tightening as WF-004 `client_ai_maturity`: the bare adjective
      // qualifies a technology far more often than an organisation ("an
      // advanced RAG pipeline"), so it only counts next to maturity vocabulary.
      pattern:
        /\b(beginner|novice|experimenter|experimenting)\b|\b(advanced|mature)\b[^.]{0,20}\b(maturity|ai adoption|ai practice)\b|\b(maturity|ai adoption|ai practice)\b[^.]{0,20}\b(advanced|mature|beginner|low|high)\b|\bno prior (AI|machine[-\s]learning)\b|\bfirst AI (project|initiative)\b|\b(several|multiple) models in production\b/i,
    },
    {
      name: "request_type",
      card: "Request type",
      required: true,
      mapping: presales,
      // Card enumeration: Formal RFP / Direct solicitation / Referral /
      // Competition. TWO tightenings:
      //   - the bare token `competition` is refused, because it is the label of
      //     another line of this same card (see the header note). Only
      //     "competitive tender/bid/process" counts.
      //   - a negation guard on the RFP branch. P11's own constraint reads "no
      //     RFP document, direct solicitation": without the guard this line
      //     would fill on a DENIAL that an RFP exists. It fills anyway through
      //     "direct solicitation", so the guard changes no verdict here — it is
      //     the policy WF-004 `engagement_scope` had to be taught the hard way.
      pattern:
        /(?<!\bno )(?<!\bwithout )\b(formal |public |open )?(RFP|RFI|RFQ|tender|call for tenders?)\b|\bdirect solicitation\b|\bsolicited (us )?directly\b|\breferral\b|\breferred (to us|by)\b|\bcompetitive (tender|bid|process|situation)\b|\bunsolicited (request|approach|enquiry|inquiry)\b/i,
    },
    {
      name: "requested_scope",
      card: "Requested scope",
      required: true,
      mapping: presales,
      // Card enumeration: Scoping / PoC / Build / AMS / Consulting engagement /
      // Full. A bare `pilot` is excluded although it is PoC-adjacent: it names
      // the client's own initiative at least as often as the engagement shape,
      // the same reasoning that kept `programme` out of WF-004's duration
      // anchor. P06 says "chatbot program scope" and correctly does NOT fill
      // this line: that names the SUBJECT of the request, not its scope class.
      pattern:
        /\bscoping[-\s](mission|engagement|phase|study|assignment|exercise)\b|\b(PoC|proof of concept)\b|\bbuild (phase|project|engagement)\b|\bend[-\s]to[-\s]end (build|delivery|implementation)\b|\bAMS\b|\bapplication (maintenance|management) services?\b|\bconsulting (engagement|mission|assignment)\b|\bfull (scope|engagement|programme|program)\b/i,
    },
    {
      name: "indicative_budget",
      card: "Indicative budget",
      required: true,
      mapping: presales,
      // Card enumeration: Estimated range / Not disclosed. A budget WORD alone
      // never suffices — an AMOUNT must sit next to it. Two measured hazards
      // drove that:
      //   - the neutral-probe brief's constraint is literally "the budget is
      //     fixed", so any bare `budget` token turns the discrimination probe
      //     red;
      //   - a digit is not an amount. WF-003 `Monthly API budget` filled on
      //     "pilot budget capped for Q3" — the 3 of a QUARTER label read as a
      //     figure (cross-vocabulary probe, 2026-07-29). Hence a currency
      //     symbol, a currency word, or a k/K/M magnitude suffix, never `\d`.
      // P11 asks "what an AI scoping mission with us WOULD COST": a request for
      // a price is not a stated budget, and it correctly does not fill.
      pattern:
        /\b(budget|envelope|price range|ceiling|spend|willing to spend|funding)\b[^.]{0,32}(?:[€$£]\s?\d|\d[\d ,.]*\s?(?:k€|k\b|K\b|M\b|m€|euros?|dollars?|pounds?|EUR|USD|GBP|thousand|million))|(?:[€$£]\s?\d|\d[\d ,.]*\s?(?:k€|k\b|K\b|M\b|m€|euros?|dollars?|EUR|USD|GBP|thousand|million))[^.]{0,32}\b(budget|envelope|price range|ceiling|spend|funding)\b/i,
      // The card's own honest unknown. It must be ACCEPTED, not rejected: the
      // field-class policy of the dry-run distinguishes a card-sanctioned
      // "Not disclosed" from the negative sentinels intake refuses.
      sanctionedUnknown:
        /\bbudget\b[^.]{0,32}\b(not disclosed|undisclosed|not shared|not communicated|not stated|confidential)\b|\b(not disclosed|undisclosed|not shared|confidential)\b[^.]{0,24}\bbudget\b/i,
    },
    {
      name: "response_deadline",
      card: "Response deadline",
      required: true,
      mapping: presales,
      // The card annotates this line "RFP deadline — ISO 8601". The ISO form is
      // ACCEPTED but not REQUIRED, a deliberate divergence from the card's
      // wording: enforcing it would reject this workflow's own P06 fixture
      // ("the response is due in three weeks"). A format hint is a data-entry
      // preference, not the card's contract.
      //
      // A bare `timeline` is refused — the neutral-probe brief says "a
      // timeline", and stating that time exists is not stating a deadline.
      //
      // WHAT is due must be named next to the deadline word. A first draft also
      // accepted `deadline` + a bare quantity, and it was MEASURED against the
      // nineteen coverage-matrix briefs before any test existed: it filled on
      // P12's "phase-one deadline in six weeks" — a delivery milestone inside an
      // ALREADY SIGNED engagement, which is the opposite of a bid response. That
      // is the anchorless-quantity detector WF-005 `Horizon` refused and the
      // cross-vocabulary probe had to tighten out of WF-004
      // `engagement_duration`; leaving this manifest to disagree with them would
      // have been the same policy applied in two directions.
      //
      // The cost is a false "missing" on "the deadline is in three weeks" with
      // no mention of what is due. That is the safe direction, and
      // `PARAMS_MISSING` names "Response deadline", which designates the word
      // to add.
      pattern:
        /\b(response|submission|reply|bid|RFP|proposal)\b[^.]{0,32}\b(due|deadline|closes?|closing|expected by)\b|\b(due|deadline|closes?|closing date|submission date)\b[^.]{0,32}\b(response|submission|reply|bid|RFP)\b|\b\d{4}-\d{2}-\d{2}\b/i,
    },
    {
      name: "competition",
      card: "Competition",
      required: true,
      mapping: presales,
      // Card enumeration: Firms competing / Sole source. A negation IS a value
      // here (see the header note) — "sole source" fills the line. That is the
      // inverse of the WF-005 sources guard, and the difference is what the
      // card asks: WF-005 asks WHICH sources, this asks WHETHER there is
      // competition.
      pattern:
        /\bsole[-\s]source(d|ing)?\b|\bno (other )?(competitors?|competing (firms?|bidders?)|bidders?|competition)\b|\bwithout competition\b|\bexclusive (negotiation|discussion)s?\b|\bcompeting (firms?|bidders?|vendors?|consultancies)\b|\bcompetitors? (identified|named|known|shortlisted)\b|\bagainst\s+(\d+|two|three|four|five|several)\s+(other\s+)?(firms?|bidders?|vendors?|consultancies)\b|\b(\d+|two|three|four|five|several)\s+(other\s+)?(firms?|bidders?|vendors?|consultancies)\b[^.]{0,24}\b(compet\w+|bidding|shortlist\w*|in the running)\b/i,
    },
    {
      name: "decision_makers",
      card: "Decision-makers",
      required: true,
      mapping: presales,
      // `submittedBy` is deliberately NOT mapped, and this is the spec where
      // that matters most: the card's enumeration (CIO / CDO / Business /
      // Procurement) IS role vocabulary, so filling it from the submitter's
      // role is one keystroke away. It would make the verdict depend on WHO
      // submits the brief — the invariance the P19/P20 role probes proved live
      // (role ⊥ route). P11 makes the trap concrete: its submitter is an
      // "Account Executive", which is the SELLER, not the prospect's decider.
      //
      // Two admission regimes, and the split is the point. TITLES count bare
      // (a C-level or a named sponsor unambiguously answers "who decides").
      // FUNCTIONS do not: `procurement` names a department in "the procurement
      // portal" as readily as a decision owner, so it counts only next to
      // decision vocabulary. That is stricter than the shipped precedent —
      // WF-004 `stakeholders` admits bare `sponsor` and bare `board` with no
      // adjacency guard at all — and it is what lets P06's "procurement-led
      // process" fill while a bare mention would not.
      //
      // Dry-run §2 classes this must-ask on P06; this manifest reads it FILLED.
      // The divergence is the requalification §2's own annotation describes:
      // the P06 sketch does not carry "procurement-led", the qualified fixture
      // does. Two questions, two inputs. It is the ONLY cell where the two
      // disagree across both WF-006 briefs.
      pattern:
        /\b(CIO|CDO|CTO|CEO|COO|CFO|CISO|CHRO)\b|\bexecutive sponsor\b|\bsteering committee\b|\bcomex\b|\bbuying (committee|centre|center)\b|\b(procurement|purchasing|business|IT|finance|legal|technical)[-\s](led|driven|owned)\b|\b(procurement|purchasing|business unit|IT department|finance department)\b[^.]{0,28}\b(decides|decision|sign[-\s]?off|signs off|approval|approves|owns|evaluat\w+)\b|\bdecision[-\s]makers?\b[^.]{0,28}\b(identified|named|are|is|include)\b|\bdecision path\b/i,
    },
    {
      name: "selection_criteria",
      card: "Selection criteria",
      required: true,
      mapping: presales,
      // Card enumeration: Price / Expertise / Reference / Deadline / CSR. Every
      // one of those words is ordinary pre-sales prose on its own — a proposal
      // brief mentions price and expertise by construction — so the criterion
      // FRAMING is required, never the bare token. Weakest necessity claim of
      // the manifest (see the header note); the strictness here is what keeps a
      // spec with no textual consumer from becoming a free pass.
      pattern:
        /\b(selection|award|evaluation|scoring)\s+(criteri(a|on)|grid|matrix|framework)\b|\bcriteri(a|on)\b[^.]{0,32}\b(price|cost|expertise|references?|deadline|CSR|ESG|RSE)\b|\b(price|cost|expertise|references?|deadline|CSR|ESG)\b[^.]{0,32}\b(weighted|weighting|criteri(a|on)|scored on|graded on)\b|\b(selected|awarded|evaluated|judged)\s+on\b/i,
    },
    {
      name: "infra_constraints",
      card: "Constraints",
      required: true,
      mapping: presales,
      // Card enumeration: On-premise / Sovereign cloud / SecNumCloud / HDS —
      // HOSTING, which is why this takes no `defaultValue` (header note). P06's
      // "banking regulatory context" deliberately does NOT fill it: a
      // regulatory context is not a hosting constraint, and reading it as one
      // would answer STEP-03A's infra question with something it cannot use.
      pattern:
        /\bon[-\s]?prem(ise|ises|)\b|\bsovereign cloud\b|\bcloud de confiance\b|\bSecNumCloud\b|\bHDS\b|\bhealth[-\s]data host\w*\b|\bair[-\s]?gapped\b|\bprivate cloud\b|\bdata residency\b|\bEU[-\s]?(hosted|hosting|region|only)\b|\bhosted in (the )?(EU|France|Europe)\b|\bno (public )?cloud\b/i,
    },
    {
      name: "proposal_format",
      card: "Proposal format",
      required: true,
      mapping: presalesWithDeliverable,
      // Card enumeration: PDF / Oral presentation / Demo / Written Q&A. Two
      // tokens are refused although they look like matches:
      //   - a bare `written`. This spec reads `expectedDeliverable`, and the
      //     neutral-probe brief's is "A written document the stakeholder can
      //     act on" — the bare adjective would turn the discrimination probe
      //     red. Only `written Q&A` counts.
      //   - a bare `proposal`. P11's expectedDeliverable is "Commercial
      //     proposal for a scoping mission", which names the DELIVERABLE, not
      //     the format it is delivered in.
      pattern:
        /\bPDF\b|\boral (presentation|defence|defense|pitch|session)\b|\bpitch deck\b|\bslide deck\b|\bpresentation to the (committee|board|jury|panel|comex)\b|\b(live |on-site )?demo(nstration)?\b[^.]{0,24}\b(expected|required|requested|session|planned)\b|\bwritten Q&A\b|\bQ&A (document|responses?|round)\b/i,
    },
    {
      name: "known_risks",
      card: "Known risks",
      required: true,
      mapping: presales,
      // Card examples (comma-separated, hence one spec): aggressive
      // competition, floor price, hidden requirements. Either a named
      // pre-sales risk, or an explicit risk framing. A bare `risk` is not
      // enough — every brief carries risk implicitly, and the card asks which
      // ones are KNOWN.
      pattern:
        /\b(aggressive competition|floor price|price war|price pressure|hidden requirements|undisclosed requirements|incumbent (supplier|vendor|provider)|unrealistic deadline|scope creep|thin margin)\b|\b(known|identified|anticipated|main|principal)\s+risks?\b|\brisks?\b[^.]{0,24}\b(identified|known|mapped|flagged|anticipated)\b/i,
    },
  ],
};
