import { describe, it, expect } from "vitest";
import { paramFilled } from "../src/dispatch/validate-route.js";
import { DEFAULT_MANIFESTS } from "../src/dispatch/run-dispatch.js";
import { DISPATCH_FIXTURES } from "./fixtures/dispatch-briefs.js";
import type { NeedBrief, ParamSpec } from "../src/dispatch/types.js";

/**
 * DENIAL PROBE — a frozen record of a MEASURED, UNFIXED defect class.
 *
 * `paramFilled` has no general notion that a DENIAL IS NOT AN ANSWER. A sentence
 * denying its own subject while naming a card value nearby fills the spec: "No
 * cloud provider has been chosen; AWS was ruled out" answers WF-003 `Cloud
 * provider`. The failure direction is the UNSAFE one — a false fill returns
 * `paramsChecked: true` on a brief that denies the fact.
 *
 * ⛔ THIS FILE FIXES NOTHING, AND THAT IS DELIBERATE. It is the instrumentation
 * that must exist BEFORE the guard, on the repository's own "unit zero"
 * precedent: the tool before the lot that uses it. The guard is a judgement about
 * what a matched region contains, and the judgement that designs it must be
 * checked against a written target rather than formed in the same motion — which
 * is exactly what failed on 2026-08-02, twice, within minutes.
 *
 * ⚠️ NOT written as a red test. A standing red hides real regressions, so the
 * three corpora feed a SNAPSHOT that records today's behaviour verbatim. When the
 * guard lands, the diff shows the ten fills closing and the over-reach corpus
 * staying open — which is the whole point of measuring first.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DEFINITION OF SCOPE — WRITTEN BEFORE ANY DETECTOR, AND THE GUARD MUST BE
 * VERIFIED AGAINST THIS TEXT, NEVER AGAINST A COUNT THAT LOOKS PLAUSIBLE.
 *
 *   A denial GOVERNS a card value when a denial token and that value sit in the
 *   same CLAUSE — delimited by `.`, `;`, `—` or a coordinating conjunction — and
 *   the denial precedes the value.
 *
 * Two consequences follow, and both are load-bearing:
 *   · "No cloud provider has been chosen; AWS was ruled out" — `no` governs
 *     `cloud provider`; `ruled out` governs `AWS`. Both clauses deny. REFUSE.
 *   · "GDPR applies, no exceptions; the stack runs on AWS" — `no` governs
 *     `exceptions`, in a clause that does not contain the value. The value sits
 *     in a later clause with no denial. FILL.
 *
 * The clause boundary is what makes the rule decidable without parsing meaning.
 * A rule scoped to the SENTENCE would refuse the second case and produce false
 * MISSING — the safe direction, but a real cost, which is what corpus 3 measures.
 *
 * ⛔ `affirmativeString` / `NEGATIVE_SENTINEL` (spine-helpers) CANNOT be reused
 * here, and assuming otherwise was an error made while proposing this work:
 * that regex is anchored at `^` and classifies a WHOLE FIELD VALUE ("N/A",
 * "None — no candidate"). Prose denial is a different artifact and needs its own
 * vocabulary. What IS reusable is the repository's adjacency discipline
 * (`[^.]{0,N}`), applied to the matched region rather than to the sentence.
 * ─────────────────────────────────────────────────────────────────────────────
 */

function brief(text: string): NeedBrief {
  return {
    need: text,
    domain: "Management & Consulting",
    expectedDeliverable: "As stated",
    constraints: [],
    context: text,
    submittedBy: "Operator",
  };
}

function spec(wf: string, name: string): ParamSpec {
  const s = DEFAULT_MANIFESTS[wf]?.params.find((p) => p.name === name);
  if (s === undefined) throw new Error(`no spec ${wf}/${name} — the probe outlived its subject`);
  return s;
}

/**
 * CORPUS 1 — DENIALS. Each sentence denies its own subject while naming a card
 * value nearby. Every one MUST be refused once the guard exists; today ten of
 * twelve fill.
 */
const DENIALS: Array<[string, string, string]> = [
  ["WF-003", "cloud_provider", "No cloud provider has been chosen; AWS was ruled out."],
  ["WF-004", "client_ai_maturity", "The client has no AI maturity assessment; beginner is a guess."],
  ["WF-005", "audience", "There is no LinkedIn audience to address yet."],
  ["WF-005", "tone", "No tone has been agreed; a neutral register was rejected."],
  ["WF-006", "selection_criteria", "No selection criteria on price or expertise were shared."],
  ["WF-007", "identified_stakes", "No business stakes have been identified so far."],
  ["WF-008", "ai_system_status", "The system is not in production and no pilot is planned."],
  ["WF-009", "role_level", "No senior role has been opened for this team."],
  ["WF-009", "role_level", "The role is not yet defined; senior hires are paused."],
  ["WF-009", "role_title", "No data engineer role is open at the moment."],
  ["WF-009", "contract_type", "No permanent contract is offered for this mission."],
  ["WF-010", "closeout_type", "This is not a partial failure and not an incident."],
];

/**
 * CORPUS 3 — OVER-REACH. A denial token is PRESENT but governs something other
 * than the card value, which sits in a clause of its own. Every one MUST keep
 * filling. This is the control the first proposal of this work lacked, and
 * without it the guard is unboundable: naming a risk without naming the
 * measurement that retires it is how a degraded solution gets proposed.
 *
 * ⚠️ ONE LINE IS ALREADY REFUSED, AND IT IS NOT THE GUARD WORKING. A control
 * corpus whose lines are refused for unrelated reasons is false comfort, so the
 * reason is recorded here rather than left to be re-diagnosed. WF-005 `audience`
 * refuses "the audience is our LinkedIn following" while ACCEPTING "there is no
 * LinkedIn audience to address yet" — the two verdicts are inverted, and the
 * cause is word ORDER, not denial: the detector wants its value adjacent to the
 * audience noun, and three words of separation defeat it. Found by this control
 * on its first read, which is what a control is for. ⛔ Deliberately NOT fixed
 * here: it is a detector question for the cold unit, and widening it in the same
 * breath as building the instrument is the exact motion that failed twice on
 * 2026-08-02. It means the over-reach corpus currently measures 7 lines, not 8 —
 * that line cannot detect an over-broad guard until it is repaired.
 */
const OVER_REACH: Array<[string, string, string]> = [
  ["WF-003", "cloud_provider", "GDPR applies, no exceptions; the stack runs on AWS."],
  ["WF-004", "client_ai_maturity", "No budget was agreed, but the client is advanced in AI maturity."],
  ["WF-005", "audience", "No press release is planned; the audience is our LinkedIn following."],
  ["WF-006", "selection_criteria", "No RFP was issued; the selection criteria are price and expertise."],
  ["WF-007", "identified_stakes", "No timeline yet; the business stakes are identified and documented."],
  ["WF-008", "ai_system_status", "No incident so far; the scoring model is in production."],
  ["WF-009", "role_level", "No agency is involved; we are hiring a senior engineer directly."],
  ["WF-010", "closeout_type", "No blame culture here — this is a partial failure to review."],
];

function render(): string {
  const out: string[] = [
    "# Denial probe — a frozen record of an UNFIXED defect class",
    "",
    "Generated by `test/dispatch-denial-probe.test.ts`. It fixes nothing: it records what",
    "`paramFilled` does today with denials, so the guard can later be written against a",
    "measured target instead of being designed and judged in one motion.",
    "",
    "The scope definition this must be verified against lives in the test file's header and",
    "was written BEFORE any detector. Read it before touching a pattern.",
    "",
    "## 1. Denials — a sentence denying its own subject",
    "",
    "`FILL` is the defect (unsafe direction: `paramsChecked: true` on a denied fact).",
    "Every line must read `refused` once the guard exists.",
    "",
    "| Manifest | Spec | Today | Sentence |",
    "|---|---|---|---|",
  ];
  let fills = 0;
  for (const [wf, name, text] of DENIALS) {
    const filled = paramFilled(brief(text), spec(wf, name));
    if (filled) fills++;
    out.push(`| ${wf} | \`${name}\` | ${filled ? "**FILL**" : "refused"} | ${text} |`);
  }
  out.push("", `**${fills} of ${DENIALS.length} denials fill today.**`, "");

  out.push(
    "## 2. Over-reach control — a denial token that governs something else",
    "",
    "The value sits in its own clause. Every line must stay `FILL` after the guard: a rule",
    "scoped to the sentence rather than the clause would close these too, which is the cost",
    "that makes an over-broad guard unacceptable rather than merely conservative.",
    "",
    "⚠️ A line already reading `refused` is NOT the guard working — WF-005 `audience` refuses",
    "this sentence over word ORDER (it wants its value adjacent to the audience noun) while",
    "accepting the denial in section 1, so its two verdicts are inverted. Until that detector",
    "is repaired the control measures one line fewer than it lists. See the test file header.",
    "",
    "| Manifest | Spec | Today | Sentence |",
    "|---|---|---|---|",
  );
  let kept = 0;
  for (const [wf, name, text] of OVER_REACH) {
    const filled = paramFilled(brief(text), spec(wf, name));
    if (filled) kept++;
    out.push(`| ${wf} | \`${name}\` | ${filled ? "FILL" : "**refused**"} | ${text} |`);
  }
  out.push("", `**${kept} of ${OVER_REACH.length} over-reach sentences fill today.**`, "");

  out.push(
    "## 3. Corpus denial tokens — why no current verdict is wrong",
    "",
    "The nineteen routed briefs are what every other probe reads. The class is LATENT, not",
    "active, and this is the measurement that says so — the corpus simply cannot express the",
    "defect, which is why nothing caught it.",
    "",
    "| Brief | Route | Denial tokens present |",
    "|---|---|---|",
  );
  const DENIAL_TOKEN =
    /\b(no|not|never|without|neither|nor|none|rather than|ruled out|declined|rejected|paused)\b/gi;
  let briefsWith = 0;
  for (const f of DISPATCH_FIXTURES) {
    if (f.brief === undefined) continue;
    const text = [f.brief.need, f.brief.context, f.brief.expectedDeliverable, ...f.brief.constraints].join(" | ");
    const hits = [...text.matchAll(DENIAL_TOKEN)].map((m) => m[0].toLowerCase());
    if (hits.length === 0) continue;
    briefsWith++;
    out.push(`| ${f.id} | ${f.expected} | ${[...new Set(hits)].join(", ")} |`);
  }
  out.push("", `**${briefsWith} of ${DISPATCH_FIXTURES.length} briefs carry any denial token at all.**`, "");
  return out.join("\n");
}

describe("denial probe — instrumentation for an unfixed class, not a verdict", () => {
  it("records what paramFilled does with denials today", () => {
    // ⛔ A REGISTRY-SIZE ASSERTION WAS WRITTEN HERE AND REMOVED, falsification
    // having shown it dead. The sibling probes carry one because they ITERATE
    // `DEFAULT_MANIFESTS` and a shrunken registry renders them an empty table;
    // this file looks specs up by name instead, so the failure it claimed to stop
    // cannot arise. Measured rather than reasoned: misregistering WF-003 under a
    // wrong key turns the resolvability test below red while a `length >= 10`
    // assertion stays green, the registry still holding ten entries. A guard that
    // cannot catch the failure it names reads as protection being applied.
    expect(render()).toMatchFileSnapshot("./__snapshots__/denial-probe.md");
  });

  it("keeps every probed spec resolvable, so the corpora cannot rot silently", () => {
    // A renamed spec must fail LOUDLY here rather than quietly dropping a row —
    // the failure mode of a corpus is that it stops covering what it claims to.
    for (const [wf, name] of [...DENIALS, ...OVER_REACH]) {
      expect(() => spec(wf, name), `${wf}/${name}`).not.toThrow();
    }
  });
});
