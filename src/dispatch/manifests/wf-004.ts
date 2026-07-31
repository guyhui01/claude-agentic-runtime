/**
 * WF-004 "AI Consulting Engagement" parameter manifest.
 *
 * Derived from the card's `ENGAGEMENT CONTEXT` block
 * (`claude-agents/workflows/WF-004-mission-conseil-ia.md`), pinned to catalog
 * v4.2.0 — the real-sidecar test hard-fails on tag drift, forcing a re-derive.
 *
 * The hardest card so far, and not for its length: WF-002 and WF-003 describe
 * technical objects whose vocabulary is unmistakable (an ART, a vector store),
 * while this one describes a COMMERCIAL SITUATION in words any brief may use —
 * a client, a duration, stakeholders, stakes. The temptation is therefore the
 * false "filled", and two detectors were deliberately tightened against it:
 *   - `engagement_scope` no longer accepts a bare "support" ("decision support",
 *     "support the team" are ordinary prose, not the card's Support engagement);
 *   - `client_ai_maturity` no longer accepts a bare "advanced" (an "advanced RAG
 *     pipeline" says nothing about where the CLIENT stands).
 * Neither tightening is needed to make the P04 fixture pass — both close a gap
 * the neutral-prose probe cannot see, because the words are plausible domain
 * vocabulary rather than absent vocabulary.
 *
 * Checked against the 2026-07-19 dry-run oracle (§2, row P04) before its tests
 * were written. The oracle names three must-ask parameters (Engagement
 * duration, Stakeholders, Priority stakes) and this manifest reports none of
 * them missing on the fixture — the documented divergence class: §2 was
 * computed against the coverage-matrix SKETCH, which states neither the sponsor
 * role nor the engagement window, while the qualified fixture states both.
 *
 * No card-sanctioned unknown here, and no card-declared optional: the only
 * `defaultValue` is `Constraints`, guaranteed by the intake check (WF-001/002
 * precedent). The "— estimate" on `Client AI maturity` is NOT a sanctioned
 * unknown: an estimate IS a value (settled 2026-07-28).
 *
 * Slash rule (RULE 2): `Client [Name / Sector / Size]` is a CONJUNCTION — three
 * independent facts on one line — so it is split into three specifications
 * sharing a qualified card label, and `PARAMS_MISSING` names the half missing
 * rather than the whole line. Eight card lines, ten specifications.
 */

import type { NeedBrief, ParamManifest } from "../types.js";

/** Commercial facts land in the constraint list as readily as in the prose. */
const engagement = (b: NeedBrief): string =>
  `${b.need} ${b.context} ${b.constraints.join("; ")}`;

export const WF004_MANIFEST: ParamManifest = {
  workflow: "WF-004",
  catalogTag: "v4.2.0",
  params: [
    {
      name: "client_name",
      card: "Client (name)",
      required: true,
      mapping: engagement,
      // The weakest detector of the manifest, and declared as such: the card
      // gives no enumeration to key on, so this recognizes a SHAPE — a proper
      // noun introduced by with/for/at, or a name carrying a legal form. Same
      // fragility class as the WF-002 `ART name` word-order defect: a brief
      // opening on "Marlowe Foods, a mid-cap, signed…" is read as unnamed. The
      // failure direction is the safe one (a false "missing" costs the operator
      // one line), and articles plus all-caps acronyms are excluded so that
      // "for an AI audit" cannot pass as a client name.
      //
      // `from` was added 2026-07-30 by the policy-consistency table, which put
      // this detector beside its WF-006 sibling and showed the introducer
      // present in one copy only. It is a GENERIC introducer with no card
      // basis for the asymmetry — unlike WF-006's `Prospect`, which that card's
      // own field label licenses and which stays there. Measured: it makes this
      // line fill on three foreign briefs that say "from <Name>", inside the
      // class the cross-vocabulary matrix already records (every brief names a
      // company).
      pattern:
        /\b(?:with|for|at|from)\s+(?!the\b|a\b|an\b|our\b|their\b|its\b|this\b)[A-Z][a-z][\w&'-]*(?:\s+[A-Z][\w&'-]+){0,3}|\b[A-Z][\w&'-]+\s+(?:GmbH|SAS|SARL|SA|Ltd|Limited|Inc\.?|LLC|plc|AG|BV|NV)\b/,
    },
    {
      name: "client_sector",
      card: "Client (sector)",
      required: true,
      mapping: engagement,
      // The card names no sector families, so these are the catalog's own (the
      // WF-001 `Sector` list) widened to the ones this engagement type meets.
      pattern:
        /\b(food[-\s]?(industry|processing|retail)?|agri\w*|bank\w*|insur\w*|retail\w*|industr\w*|manufactur\w*|health\w*|pharma\w*|logistic\w*|energy|utilit\w*|telecom\w*|public[- ]sector|e-?commerce|automotive|luxury|media)\b/i,
    },
    {
      name: "client_size",
      card: "Client (size)",
      required: true,
      mapping: engagement,
      // Size CLASSES and headcounts only. "mid-size" is deliberately absent:
      // it is ordinary prose (the neutral-probe brief says "a mid-size
      // company"), whereas "mid-cap" is a stated size class.
      //
      // `CAC ?40` was added 2026-07-30 by the policy-consistency table, which
      // showed it present in the WF-006 sibling and absent here — an asymmetry
      // introduced in the WF-006 lot with no basis on either card, since a
      // CAC 40 client is a size statement in any engagement. Measured: no
      // coverage-matrix brief contains the token, so this closes an
      // inconsistency without changing a single verdict.
      pattern:
        /\b(mid[-\s]?cap|large[-\s]?cap|small[-\s]?cap|SME|SMB|ETI|start-?up|scale-?up|multinational|CAC ?40|\d+\s*(employees|staff|FTEs?|headcount))\b/i,
    },
    {
      name: "engagement_scope",
      card: "Engagement scope",
      required: true,
      mapping: engagement,
      // Card enumeration: Audit / Strategy / Training / Support / Full. TIGHTENED
      // on Support: the bare word is ordinary prose ("decision support", "we
      // support the team") and would fill this line from any brief. Only the
      // engagement forms of it are accepted.
      //
      // Two further tightenings, both found by the cross-vocabulary probe
      // (2026-07-29) and neither visible to the neutral-prose probe, because the
      // words were present rather than absent:
      //   - a NEGATION guard. This filled on a legal-drafting brief whose only
      //     occurrence of the word is "*not* an audit of an AI system". A check
      //     that reads a denial as a statement inverts its own semantics — same
      //     class as the WF-005 `Sources to prioritize` defect.
      //   - `training` no longer counts bare. It filled on "research-grade
      //     training infrastructure", which is MODEL training, not the card's
      //     training engagement. Narrowed positively, the form already used by
      //     `expected_deliverables` below rather than a lookahead blacklist.
      pattern:
        /(?<!\bnot )(?<!\bnot an )(?<!\bno )(?:\baudits?\b|\bstrateg(y|ic roadmap|ic advisory)\b|\btraining (plan|programme|program|engagement|mission)\b|\btraining of (their|the|its) (staff|teams?|managers?|people)\b|\bupskilling\b|\bongoing support\b|\brun\s*(&|and)\s*support\b|\bsupport (engagement|phase|mission)\b|\bfull (engagement|programme|program)\b)/i,
    },
    {
      name: "engagement_duration",
      card: "Engagement duration",
      required: true,
      mapping: engagement,
      // A quantity AND a unit AND what the quantity measures, in the same
      // sentence. A bare "timeline" or "deadline" states that time exists, not
      // how long the engagement runs — and a bare quantity states a duration
      // without saying whose.
      //
      // The anchoring was paid for: the bare quantity+unit detector filled on a
      // SPRINT length ("2-week sprints"), a RESPONSE DEADLINE ("due in three
      // weeks") and a PROJECT length ("10-month project") — three foreign briefs,
      // none of them an engagement duration (cross-vocabulary probe, 2026-07-29).
      // It is the same policy as WF-005 `Horizon`, which refused the bare
      // quantity for this exact reason; leaving the two manifests to disagree was
      // the real finding.
      //
      // `phase` was REMOVED 2026-07-31, and its removal completes a fix this
      // repository already believed it had made. The WF-006 test "does not read
      // a delivery milestone of a SIGNED engagement as a response deadline"
      // states in its own comment that the cross-vocabulary probe "removed this
      // from WF-004 engagement_duration" — it removed the BARE quantity, while
      // `phase` kept the same string filling here: P12 states no engagement
      // duration at all (need: "Contract signed yesterday", context: "advisory
      // engagement signed"), and its only quantity is the constraint
      // "phase-one deadline in six weeks", a delivery milestone. One card asked
      // whether that string is a response deadline and answered no; this one
      // read it as a duration and answered yes. Found by measuring WF-007,
      // which reads the same fact, and it is the fourth appearance of the same
      // policy — the sibling test asserting P12 "genuinely states an engagement
      // window" carried a premise falsified by the fixture, and is corrected in
      // the same lot.
      //
      // `programme`/`program` are deliberately NOT anchors: a "chatbot program"
      // names the CLIENT's initiative at least as often as the engagement. With
      // them included, the pre-sales brief missed only because its gap measured
      // 25 characters against a 24-character window — luck, not design.
      pattern:
        /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)[-\s](day|week|month|quarter|year)s?\b[^.]{0,24}\b(engagement|mission|assignment|contract|intervention)\b|\b(engagement|mission|assignment|contract|intervention)\b[^.]{0,24}\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)[-\s](day|week|month|quarter|year)s?\b/i,
    },
    {
      name: "stakeholders",
      card: "Stakeholders",
      required: true,
      // `submittedBy` is deliberately NOT mapped here. Filling a card parameter
      // from the submitter's role would make the check's verdict depend on WHO
      // submits the brief — the exact invariance the P19/P20 role probes proved
      // live (role ⊥ route). The engagement's stakeholders are stated in the
      // brief or they are missing.
      mapping: engagement,
      // `sponsors?` carries the plural since 2026-07-31. It did not, while its
      // immediate neighbours in the same alternation (`operational teams?`,
      // `business units?`) did — an oversight rather than a policy, since no
      // card distinguishes the singular from the plural and the WF-007 card
      // writes `[Sponsors / …]` in the plural itself. Found while measuring the
      // WF-007 manifest, which reads the same fact: this detector was reported
      // as NOT filling on a brief saying "sponsors identified". Neither existing
      // guard could see it — the cross-vocabulary probe records only the cells
      // that ARE lit, and the policy table only pairs siblings that exist.
      // Measured impact: exactly one brief of the nineteen carries the plural,
      // so this lights one new cell (P07) and changes no other verdict.
      pattern:
        /\b(CIO|CDO|CTO|CEO|COO|CFO|CHRO|CISO)\b|\b(executive|steering|management) committee\b|\bcomex\b|\bboard\b|\bexecutive (sponsor|readout)\b|\bsponsors?\b|\boperational teams?\b|\bbusiness units?\b/i,
    },
    {
      name: "client_ai_maturity",
      card: "Client AI maturity",
      required: true,
      mapping: engagement,
      // Card enumeration: Beginner / Experimenter / Advanced — estimate. The
      // "estimate" is NOT a sanctioned unknown: an estimate is a value, so this
      // stays required with a real detector. TIGHTENED on Advanced: the bare
      // adjective qualifies technology far more often than an organisation
      // ("an advanced RAG pipeline"), so it only counts next to the maturity
      // vocabulary. `maturity` alone never suffices — WF-004's own scope line
      // says "AI maturity audit", which is what is being BOUGHT, not where the
      // client stands.
      pattern:
        /\b(beginner|novice|experimenter|experimenting)\b|\badvanced\b[^.]{0,20}\b(maturity|ai adoption)\b|\b(maturity|ai adoption)\b[^.]{0,20}\badvanced\b/i,
    },
    {
      name: "priority_stakes",
      card: "Priority stakes",
      required: true,
      mapping: engagement,
      // Card enumeration: Productivity / Compliance / ROI / Competitiveness / HR.
      // The widest detector here, and knowingly so: compliance vocabulary is
      // common to many briefs, so this spec discriminates less than its
      // neighbours. It is not narrowed further because the card asks for a
      // stake, and a brief stating GDPR HAS stated a compliance stake — see the
      // cross-vocabulary test, which records that it fills on a WF-001 brief.
      pattern:
        /\bproductivity\b|\bcost savings?\b|\befficienc\w*\b|\bcompliance\b|\bGDPR\b|\bAI Act\b|\bregulator\w*\b|\bROI\b|\breturn on investment\b|\bcompetitiv\w+\b|\bmarket share\b|\bHR\b|\bupskilling\b|\bskills? gap\b|\battrition\b|\btalent\b/i,
    },
    {
      name: "constraints",
      card: "Constraints",
      required: true,
      mapping: (b) =>
        b.constraints.length > 0
          ? b.constraints.join("; ")
          : "unconstrained (justified in context)",
      // Satisfied upstream, so it can never be missing: intake already rejects
      // an unjustified empty `constraints`. Same treatment as WF-001/002.
      defaultValue: "(guaranteed by the intake completeness check)",
    },
    {
      name: "expected_deliverables",
      card: "Expected deliverables",
      required: true,
      mapping: (b) => b.expectedDeliverable,
      // Deliberately a `pattern` and not a `defaultValue`, unlike `constraints`
      // above: intake guarantees `expectedDeliverable` is affirmative and
      // non-empty, NOT that it names one of the card's four families. A
      // `defaultValue` here would pass the line on any sentence — the hollow
      // pass the fail-closed detector policy exists to prevent.
      pattern:
        /\breports?\b|\broadmaps?\b|\btraining (plan|programme|program|curriculum|materials?)\b|\b(executive[-\s]committee|comex|steering[-\s]committee|board)\s+(presentation|deck|readout)\b/i,
    },
  ],
};
