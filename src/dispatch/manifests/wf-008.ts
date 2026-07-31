/**
 * WF-008 "AI Act / GDPR Compliance Audit" parameter manifest.
 *
 * Derived from the card's `COMPLIANCE AUDIT CONTEXT` block (path read from the
 * sidecar, never guessed), pinned to catalog v4.2.0 — the real-sidecar test
 * hard-fails on tag drift, forcing a re-derive.
 *
 * ELEVEN CARD LINES BECOME NINETEEN SPECIFICATIONS, the largest manifest of the
 * ten, because this card carries FOUR conjunctions where the tracker's RULE 2
 * list announced three. `AI system audited [Name / Use case / Prod or project
 * status]` has exactly the shape of `Client [Name / Sector / Size]` and is split
 * on the same grounds; the backlog entry naming only `Client`, `Data processed`
 * and `Volumes` was a dated diagnosis, and it was tested at the card rather than
 * trusted.
 *
 * SLASH LISTS ARE CLOSED, COMMA LISTS ARE OPEN (see wf-007.ts): a synonym of a
 * listed value is fair, a new member is not. Applied here against three
 * temptations that were dropped rather than added — `foundation model` and `RAG`
 * on `AI model` (an architecture is not a model class), `ISO 27001` and `DPIA`
 * on `Targeted frameworks` (a security standard and a deliverable are not
 * frameworks this card lists).
 *
 * `Suspected AI Act tier` is this card's sanctioned unknown, the third of the
 * three confirmed on 2026-07-28. SILENCE IS NOT THE UNKNOWN: `sanctionedUnknown`
 * accepts an explicit deferral ("tier to be confirmed"), never the absence of
 * any statement. A compliance-audit intake that does not ask for the suspected
 * tier is not doing its job, and this is deliberately stricter than the dry-run
 * table, which counts it covered.
 *
 * CONFRONTING §2 IS DONE AT THE CARD LINE, NOT AT THE SPECIFICATION. That table
 * only ever knew the eleven lines; comparing it to nineteen facts produces
 * differences that are arithmetic rather than judgement. Aggregated to lines, a
 * line being "missing" when any one of its facts is, the P08 row leaves six real
 * divergences: agreement on `Volumes` and `Compliance deadline`; this manifest
 * additionally asks `Client`, `AI system audited`, `Audit origin` and `Suspected
 * AI Act tier`; and §2 additionally asks `Geography` and `AI model`, the
 * documented class where the qualified fixture states what the sketch did not
 * ("EU only", "external LLM"). ⚠️ That aggregation is for comparing with §2
 * alone — it must never become how `PARAMS_MISSING` is rendered to the operator,
 * where naming the missing HALF is the entire point of the split.
 */

import type { NeedBrief, ParamManifest } from "../types.js";

/** Compliance facts land in the constraint list as readily as in the prose. */
const audit = (b: NeedBrief): string =>
  `${b.need} ${b.context} ${b.constraints.join("; ")}`;

export const WF008_MANIFEST: ParamManifest = {
  workflow: "WF-008",
  catalogTag: "v4.2.0",
  params: [
    // --- Client [Name / Sector / Size / Geographic footprint] ----------------
    {
      name: "client_name",
      card: "Client (name)",
      required: true,
      mapping: audit,
      // Identical to the WF-004/006/007 siblings, and `of` is deliberately NOT
      // added as an introducer even though this card's own primary fixture needs
      // it: P08 names the client in a genitive ("the triage chatbot OF Meridian
      // Health") that this shape detector misses. Measured before deciding —
      // adding `of` reads P08 and P17 correctly and also fires on P05's "of
      // GenAI", a technology read as a company. A false name is the unsafe
      // direction, the miss costs one line, and WF-004's apposition miss was
      // reviewed and left in place on the same grounds.
      pattern:
        /\b(?:with|for|at|from)\s+(?!the\b|a\b|an\b|our\b|their\b|its\b|this\b)[A-Z][a-z][\w&'-]*(?:\s+[A-Z][\w&'-]+){0,3}|\b[A-Z][\w&'-]+\s+(?:GmbH|SAS|SARL|SA|Ltd|Limited|Inc\.?|LLC|plc|AG|BV|NV)\b/,
    },
    {
      name: "client_sector",
      card: "Client (sector)",
      required: true,
      mapping: audit,
      // Non-discriminating by construction, as recorded on its siblings.
      pattern:
        /\b(food[-\s]?(industry|processing|retail)?|agri\w*|bank\w*|insur\w*|retail\w*|industr\w*|manufactur\w*|health\w*|pharma\w*|logistic\w*|energy|utilit\w*|telecom\w*|public[- ]sector|e-?commerce|automotive|luxury|media)\b/i,
    },
    {
      name: "client_size",
      card: "Client (size)",
      required: true,
      mapping: audit,
      pattern:
        /\b(mid[-\s]?cap|large[-\s]?cap|small[-\s]?cap|SME|SMB|ETI|start-?up|scale-?up|multinational|CAC ?40|\d+\s*(employees|staff|FTEs?|headcount))\b/i,
    },
    {
      name: "client_geographic_footprint",
      card: "Client (geographic footprint)",
      required: true,
      mapping: audit,
      // DEMOTION CANDIDATE, RE-EXAMINED 2026-08-01 AND KEPT REQUIRED — read the
      // correction below before acting on the label, because the argument that
      // first supported it was partly wrong.
      //
      // ⛔ THE CLAIM "no step consumes it" WAS TOO STRONG and is withdrawn.
      // STEP-01 carries exactly three inputs, and the second is "Geography of
      // operation and concerned populations" — a SINGLE input that is ambiguous
      // between this card line and the `Geography` line below: "of operation"
      // touches where the company operates, "concerned populations" the data
      // subjects. The accurate statement is that no input names the footprint
      // DISTINCTLY, not that none consumes it. What survives of the original
      // reasoning is the other signal, unchanged: searching the whole card for
      // `geographic|footprint` returns exactly one hit, this parameter block,
      // and §2 asks for it on NEITHER of the two briefs.
      //
      // It stays required for three reasons that outlived the correction.
      // Dropping a card fact silently is the one thing splitting conjunctions
      // exists to prevent. `defaultValue` is not honestly available: the type
      // means "can never be missing — an operator-profile constant or an
      // intake-guaranteed value", and a client's geographic footprint is
      // neither, so a default would ASSERT a value. And the return loop it
      // causes asks for something real — which national supervisory authorities
      // are in scope is part of what STEP-01 has to qualify, and the operator
      // answers it in one line, once per engagement.
      //
      // ⚠️ IT MUST NOT READ DATA-FLOW VOCABULARY, or it is not a separate fact at
      // all. `Geography` below owns "EU only / transfers outside EU / outside EU
      // with EU impact" — where the DATA goes. This one is where the COMPANY
      // operates, an identity fact sitting beside name, sector and size. A
      // company present in France alone can still transfer to the US.
      // Consequence, predicted before measuring: MISSING on BOTH briefs, since
      // P08 says "EU only" and P20 "EU processing" — both state data geography
      // and neither states a corporate footprint. That is the split working.
      // MEASURED DEFECT of the first draft, found before any test existed: the
      // branch also accepted a bare `in` after the footprint noun, and filled on
      // the NO_MATCH office-move brief through "office move of the Lyon site
      // in". A building is not a geographic footprint. The territory word is now
      // required, which is what the card's fact actually is.
      pattern:
        /\b(operat(es|ing|ions)|presence|present|subsidiar\w+|offices?|sites?|entities|footprint|headquarter\w*)\b[^.]{0,24}\b(\d+\s*countries|countries|markets|europe|emea|worldwide|globally|internationally)\b|\b\d+\s*countries\b|\bpan-?european\b/i,
    },
    // --- AI system audited [Name / Use case / Prod or project status] --------
    {
      name: "ai_system_name",
      card: "AI system audited (name)",
      required: true,
      mapping: audit,
      // The weakest DETECTOR of the manifest, declared as such: the card offers
      // no enumeration, so this recognises an explicit naming construction only.
      // Both fixtures describe their system ("the triage chatbot", "the triage
      // scoring model") without ever naming it, so both are reported missing —
      // which is the honest reading for an audit, where knowing WHICH system is
      // under review is the first question.
      //
      // A version-suffix branch (`Triadex v2`, `Model 3.1`) was written and then
      // dropped: it made the policy audit's QUANTITY marker fire on a digit
      // sitting inside a PROPER NOUN, which that marker's own definition
      // excludes, and it was needed by nothing — the naming construction below
      // reads "called Triadex" already. The same call as `one-?pager` on WF-007.
      pattern:
        /\b(?:named|called|dubbed)\s+[A-Z][\w-]*|\b(system|model|chatbot|assistant|engine|platform)\s+"[^"]+"/,
    },
    {
      name: "ai_system_use_case",
      card: "AI system audited (use case)",
      required: true,
      mapping: audit,
      // MEASURED DEFECT of the first draft: `diagnos\w+` filled on the WF-004
      // brief through "AI maturity diagnostic", which is a CONSULTING deliverable
      // and not what an audited system does. `diagnostic` now counts only beside
      // a system word; `diagnosis` stays bare, being medical by itself.
      pattern:
        /\b(triage|scoring|screening|classification|recommendation|ranking|moderation|underwriting|forecast\w*|summari[sz]ation|routing)\b|\bdiagnosis\b|\bdiagnostic\b[^.]{0,16}\b(model|system|tool|algorithm|aid|support)\b|\bfraud detection\b|\bcredit decision\w*\b|\bused (to|for)\b[^.]{0,24}\b(decide|score|classify|rank|recommend|detect|assess)\b/i,
    },
    {
      name: "ai_system_status",
      card: "AI system audited (status)",
      required: true,
      mapping: audit,
      // Card values: production, or project. A bare `production` is refused —
      // "production logs" and "production incident" are ordinary prose in this
      // corpus, and the word only answers the card beside a deployment statement.
      // MEASURED DEFECT of the first draft: a bare `pilot` filled on the WF-001
      // brief through "pilot budget capped for Q3" — a budget line, not a
      // deployment status. `pilot` and `poc` now count only beside a system word;
      // `prototype` stays bare, naming a system by itself.
      pattern:
        /\b(?:live |already )?in production\b|\bproduction[- ]deployed\b|\bdeployed (to|in) production\b|\bprototype\b|\b(pilot|poc|proof of concept)\b[^.]{0,20}\b(system|model|chatbot|deployment|phase|running|live)\b|\b(system|model|chatbot)\b[^.]{0,20}\b(pilot|poc)\b|\bpre-?production\b|\bproject (stage|phase)\b|\bnot yet (deployed|live)\b/i,
    },
    // --- Audit origin -------------------------------------------------------
    {
      name: "audit_origin",
      card: "Audit origin",
      required: true,
      mapping: audit,
      // Card enumeration: Preventive / CNIL or AI Office inspection / M&A due
      // diligence / Incident. P08's "legal flagged it" is none of the four, and
      // this manifest reports it missing where §2 counts it covered — a
      // deliberate divergence: who raised the question internally does not say
      // whether the audit answers a regulator, a deal, or an incident, and the
      // three lead to different audits.
      //
      // The reverse `audit … incident` order was added 2026-07-31, after
      // checking each card value against this detector: `Preventive` was read in
      // both word orders while `Incident` was read in only one, so "Audit
      // origin: Incident" and "the audit follows a production incident" were
      // both refused. An asymmetry inside one specification, with no basis on
      // the card. Measured before adding: the only brief carrying the word is
      // the post-mortem one, where no audit vocabulary sits beside it, so this
      // lights no foreign cell.
      pattern:
        /\b(preventive|proactive|pre-?emptive)\b[^.]{0,24}\b(audit|review|check|assessment)\b|\b(audit|review|assessment)\b[^.]{0,24}\b(preventive|proactive)\b|\b(CNIL|AI Office|supervisory authority|regulator|DPA)\b[^.]{0,24}\b(inspection|audit|request|enquiry|investigation|notice)\b|\bdue diligence\b|\bpost-?incident\b|\b(data )?breach\b|\bincident\b[^.]{0,24}\b(audit|review|triggered)\b|\b(audit|review|assessment)\b[^.]{0,24}\b(incident|breach)\b/i,
    },
    // --- Suspected AI Act tier ----------------------------------------------
    {
      name: "ai_act_tier",
      card: "Suspected AI Act tier",
      required: true,
      mapping: audit,
      // The third card-sanctioned unknown of the catalog. SILENCE IS NOT THE
      // UNKNOWN: the annotation "— to confirm in STEP-01" licenses an explicit
      // deferral, not the absence of any statement, so a brief saying nothing
      // about the tier is returned. Stricter than §2, and deliberately.
      pattern: /\b(unacceptable|high[-\s]risk|limited risk|minimal risk)\b|\bannex III\b/i,
      sanctionedUnknown:
        /\btier\b[^.]{0,32}\b(to be (confirmed|determined|assessed)|to confirm|unknown|tbd|not yet (qualified|assessed))\b|\b(to be (confirmed|determined)|to confirm|tbd)\b[^.]{0,32}\btier\b/i,
    },
    // --- Data processed [Personal / Sensitive / Art. 9] ---------------------
    {
      name: "data_personal",
      card: "Data processed (personal)",
      required: true,
      mapping: audit,
      // A "whether" question, so an explicit NEGATION is a value ("no personal
      // data"), the WF-006 `Competition` treatment rather than the WF-005
      // `Sources to prioritize` refusal.
      //
      // ⚠️ ONE-WAY IMPLICATION, stated rather than left to be discovered: Article
      // 9 vocabulary satisfies this line, because special-category data IS
      // personal data by definition. So this spec fills whenever `data_art9`
      // does, never the reverse. Forcing the operator to restate "personal: yes"
      // beside "health data" would be a redundant round trip.
      pattern:
        /\bpersonal data\b|\bpersonal information\b|\bPII\b|\bdata subjects?\b|\b(patient|customer|employee|claimant|candidate|citizen)s?\s+(data|records?|information)\b|\bhealth data\b|\bart(icle)?\.?\s*9\b|\bno personal data\b/i,
    },
    {
      name: "data_sensitive",
      card: "Data processed (sensitive)",
      required: true,
      mapping: audit,
      // ⚠️ THE PAIR MOST AT RISK OF BEING NON-INDEPENDENT in this manifest, and
      // it is named here rather than discovered later. GDPR's "special
      // categories" (Art. 9) IS the legal definition of sensitive data, so this
      // line and `data_art9` overlap by construction. They are kept apart on the
      // card's own wording — this one is the yes/no STATEMENT, the next one is
      // the CATEGORY named — and they do diverge: "sensitive data is involved"
      // fills this and not that, while a brief naming "biometric data" fills
      // both. If one of the two is ever merged away, it is this one.
      pattern:
        /\bsensitive (data|information|categor\w+)\b|\bspecial categor\w+\b|\bart(icle)?\.?\s*9\b|\bno sensitive data\b/i,
    },
    {
      name: "data_art9",
      card: "Data processed (Art. 9 categories)",
      required: true,
      mapping: audit,
      // Requires a NAMED category, which is what distinguishes it from the
      // sensitivity statement above.
      pattern:
        /\b(health|medical|biometric|genetic|racial|ethnic|religious|philosophical|trade[- ]union|sex life|sexual orientation)\s+data\b|\bpolitical opinions?\b|\bhealth records?\b/i,
    },
    // --- Volumes [# individuals / training data] ----------------------------
    {
      name: "volume_individuals",
      card: "Volumes (individuals concerned)",
      required: true,
      mapping: audit,
      // Quantity family, fifth appearance of the same policy: the number is
      // never accepted bare, it must sit against what it counts.
      pattern:
        /\b\d[\d,. ]*\s*(k|m|million|thousand)?\s*(individuals|persons|people|patients|customers|users|data subjects|employees|claimants|records)\b|\b(individuals|persons|people|patients|customers|users|data subjects|records)\b[^.]{0,20}\b\d[\d,. ]*\s*(k|m|million|thousand)?\b/i,
    },
    {
      name: "volume_training_data",
      card: "Volumes (training data)",
      required: true,
      mapping: audit,
      pattern:
        /\b\d[\d,. ]*\s*(GB|TB|MB|rows|samples|examples|images|documents|tokens)\b|\btraining (data|set|corpus)\b[^.]{0,24}\b\d[\d,. ]*\b|\b\d[\d,. ]*\b[^.]{0,20}\btraining (data|examples|samples)\b/i,
    },
    // --- Geography ----------------------------------------------------------
    {
      name: "geography",
      card: "Geography",
      required: true,
      mapping: audit,
      // Where the DATA goes — distinct from the client's corporate footprint
      // above, and the only one of the two any step consumes.
      //
      // `the` is optional since 2026-07-31: the article was required, so the
      // card's OWN third value — "Outside EU with EU impact" — was refused by
      // the detector derived from it. Same class as WF-005 `Horizon` rejecting
      // the word order of its own card line, and found the same way, by testing
      // each card value against the detector that claims to read it.
      pattern:
        /\bEU[- ]only\b|\bEU\b[^.]{0,20}\b(only|processing|processed|hosted|hosting|residency|based|region)\b|\b(transfers?|transferred|transferring)\b[^.]{0,24}\b(outside|third countr\w+|US|non-?EU|abroad)\b|\bdata residency\b|\bcross[- ]border transfers?\b|\boutside (?:the )?EU\b|\bextraterritorial\b/i,
    },
    // --- AI model -----------------------------------------------------------
    {
      name: "ai_model",
      card: "AI model",
      required: true,
      mapping: audit,
      // Card enumeration: External LLM / Proprietary model / Fine-tuned model /
      // GenAI / Classic ML. Only synonyms of those five are accepted —
      // `foundation model` and `RAG` were considered and dropped, an
      // architecture not being a model class the card offers.
      pattern:
        /\bexternal LLM\b|\bthird[- ]party (LLM|model)\b|\bproprietary (model|LLM|algorithm)\b|\bin[- ]house model\b|\bfine[-\s]?tuned\b|\bGenAI\b|\bgenerative AI\b|\bclassic(al)?[-\s]ML\b|\btraditional ML\b/i,
    },
    // --- Targeted frameworks ------------------------------------------------
    {
      name: "targeted_frameworks",
      card: "Targeted frameworks",
      required: true,
      mapping: audit,
      // The card's `+` signs make this a CUMULATIVE ladder rather than a set of
      // alternatives, so it stays one specification: "AI Act only", then "+
      // GDPR", then "+ NIS2"… `ISO 27001` and `DPIA` were considered and
      // dropped — a security standard and a deliverable are not frameworks this
      // card lists.
      pattern: /\bAI Act\b|\bGDPR\b|\bRGPD\b|\bNIS ?2\b|\bISO ?42001\b|\bHDS\b|\bDORA\b/i,
    },
    // --- Compliance deadline ------------------------------------------------
    {
      name: "compliance_deadline",
      card: "Compliance deadline",
      required: true,
      mapping: audit,
      // Card enumeration: Urgent / 3-6 months / 12 months. Quantity family
      // again, and `urgent` is anchored for the same reason a class word is:
      // "an urgent need" is ordinary prose, while "urgent compliance deadline"
      // answers the card. Accepting either bare was measured on WF-007 to be
      // invisible to every probe, so it is argued here rather than left to a
      // test.
      // MEASURED DEFECT of the first draft, and the FIFTH appearance of the same
      // policy in this repository: the anchor list contained a bare `deadline`,
      // so the detector filled on the pre-sales brief's "deadline in three weeks"
      // (an RFP response) and on the WF-004 brief's "deadline in six weeks" (the
      // phase milestone removed from WF-004 `engagement_duration` in this very
      // lot). `deadline` and `timeline` say that time exists; only compliance
      // vocabulary says WHAT must be compliant by when.
      pattern:
        /\b(urgent|immediate|asap)\b[^.]{0,24}\b(compliance|remediat\w+|conformity|to comply|AI Act|GDPR)\b|\b(compliance|remediat\w+|conformity|to comply|AI Act|GDPR)\b[^.]{0,24}\b(urgent|immediate|asap)\b|\b(\d+|one|two|three|six|nine|twelve)[-\s](week|month|year)s?\b[^.]{0,24}\b(compliance|remediat\w+|to comply|conformity)\b|\b(compliance|remediat\w+|to comply|conformity)\b[^.]{0,24}\b(\d+|one|two|three|six|nine|twelve)[-\s](week|month|year)s?\b/i,
    },
    // --- Expected deliverables ----------------------------------------------
    {
      name: "expected_deliverables",
      card: "Expected deliverables",
      required: true,
      mapping: (b) => b.expectedDeliverable,
      pattern:
        /\baudit reports?\b|\bcompliance reports?\b|\bremediation (plan|roadmap|actions?)\b|\b(executive|board|exec)[-\s]?(board)?\s*(presentation|deck|readout)\b|\bCNIL filing\b|\bregulator(y)? filing\b/i,
    },
  ],
};
