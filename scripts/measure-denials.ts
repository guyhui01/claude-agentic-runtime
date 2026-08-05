/**
 * MEASURE the denial class — the instrument the denial guard was designed on.
 *
 * ⛔ IT DECIDES NOTHING AND FIXES NOTHING, and it is versioned for the reason
 * `measure-manifest.ts` is: an instrument's failure mode is not a false green
 * but NOT EXISTING at the next session. Its two predecessors lived in a
 * scratchpad and died with it. Run it before touching the denial rule, the
 * clause boundaries or the token list — it prints WHY a sentence fills, which
 * no snapshot does.
 *
 * Its only job is to replace four suppositions with measurements, before any
 * policy table is written:
 *   1. WHICH substring actually fires on each of the twenty probe sentences,
 *      and through WHICH route (sanctionedUnknown / pattern / labelDeclared) —
 *      the shipped snapshot records the verdict, never the cause.
 *   2. Whether that substring sits inside ONE clause or CROSSES a boundary,
 *      under each candidate delimiter set. A match that crosses is decisive:
 *      no clause-scoped rule can be defined against it without saying which
 *      clause owns it.
 *   3. Which denial tokens share the matched clause, and whether they sit
 *      BEFORE or AFTER the match — the written scope definition says the denial
 *      "precedes the value", while its own worked example treats a POSTPOSED
 *      "ruled out" as governing. The corpus is what settles which reading the
 *      guard must implement.
 *   4. What the MAPPED text is. The probe feeds one sentence, but each spec
 *      reads through its own `mapping`, so the text the detector sees is not
 *      necessarily the sentence — clause splitting must run on what is read.
 *
 * The twenty sentences are copied from `test/dispatch-denial-probe.test.ts`,
 * which is their home. Divergence is caught by the resolvability check below.
 *
 * Usage: npm run measure:denials
 */

import { DEFAULT_MANIFESTS } from "../src/dispatch/run-dispatch.js";
import { paramFilled } from "../src/dispatch/validate-route.js";
import type { NeedBrief, ParamSpec } from "../src/dispatch/types.js";

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
  // ⚠️ THE FOUR LINES BELOW ARE WHAT MAKES THE WIDENED VOCABULARY A GUARDED
  // POLICY RATHER THAN A DECLARED ONE. Without them, removing `lacks?`,
  // `absent`, `yet to be` or `\w+n't` from the token list turns NO test red:
  // the over-reach control would keep filling, which is what it is built to do.
  // A rule nothing can falsify reads as protection being applied.
  ["WF-004", "client_ai_maturity", "The client isn't advanced in AI maturity."],
  ["WF-006", "selection_criteria", "We lack any selection criteria on price or expertise."],
  ["WF-008", "ai_system_status", "The scoring model has yet to be put in production."],
  ["WF-007", "identified_stakes", "The engagement is absent any identified business stakes."],
  // The LABEL route, which the first design left unguarded on the strength of a
  // corpus that contained no `Label: value` form at all. Its counterpart in the
  // over-reach control is the same label answered with a name and a caveat.
  ["WF-004", "client_name", "Client: no name has been given."],
];

const OVER_REACH: Array<[string, string, string]> = [
  ["WF-003", "cloud_provider", "GDPR applies, no exceptions; the stack runs on AWS."],
  ["WF-004", "client_ai_maturity", "No budget was agreed, but the client is advanced in AI maturity."],
  ["WF-005", "audience", "No press release is planned; the audience is our LinkedIn following."],
  ["WF-006", "selection_criteria", "No RFP was issued; the selection criteria are price and expertise."],
  ["WF-007", "identified_stakes", "No timeline yet; the business stakes are identified and documented."],
  ["WF-008", "ai_system_status", "No incident so far; the scoring model is in production."],
  ["WF-009", "role_level", "No agency is involved; we are hiring a senior engineer directly."],
  ["WF-010", "closeout_type", "No blame culture here — this is a partial failure to review."],
  ["WF-008", "ai_system_status", "The scoring model is in production despite a lack of monitoring."],
  ["WF-010", "closeout_type", "The review covers a partial failure, absent any HR angle."],
  ["WF-004", "client_ai_maturity", "Far from a rumour, the client is advanced in AI maturity."],
  ["WF-004", "client_name", "Client: Northwind, ruled out last week."],
  // ⚠️ THE `absenceIsAnswer` CLASS, which the suite could not see. Three specs
  // declared it because tests turned red; TWO MORE were found only by the
  // pre-push hardening pass, and both had been refusing a legitimate answer:
  //   · WF-006 `Competition` — its fixture says "a sole source situation",
  //     which carries no denial token and cleared the guard by accident of
  //     vocabulary, so the same fact written as a negation was refused;
  //   · WF-009 `Anti-fraud required` — its detector carries an explicit
  //     `no (background|reference) checks?` branch, and the guard was
  //     cancelling the very alternative the spec had written.
  // Both lines below fill BECAUSE of the opt-out: remove the flag and they close.
  ["WF-006", "competition", "There is no competition on this deal."],
  ["WF-009", "anti_fraud_required", "No background check is required for this hire."],
];

/**
 * CORPUS 3 — COST OF THE POSTPOSED-DENIAL CLASS. Not in the shipped probe:
 * written here to price the ONE option the twenty sentences leave open.
 *
 * "AWS was ruled out" (WF-003, corpus 1) puts its denial AFTER the value, so a
 * forward-only rule cannot close it; admitting participles (`ruled out`,
 * `rejected`, `declined`, `paused`) as clause-wide denials would. These
 * sentences are the bill for that: a legitimate value sharing its clause with a
 * participle that denies something ELSE — a subordinate clause (`after`,
 * `although`) is NOT a coordinating conjunction, so no split separates them.
 * Refusing these is the SAFE direction, but it is a cost, and a policy whose
 * cost is unmeasured is the degraded mode this repo keeps refusing.
 */
const POSTPOSED_COST: Array<[string, string, string]> = [
  ["WF-003", "cloud_provider", "We standardised on AWS after Azure was ruled out."],
  ["WF-008", "ai_system_status", "The scoring model is in production although the pilot was paused."],
  ["WF-009", "role_level", "We are hiring a senior engineer now that the agency route was rejected."],
  ["WF-006", "selection_criteria", "The selection criteria are price and expertise, other bidders having been declined."],
];

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
  if (s === undefined) throw new Error(`no spec ${wf}/${name} — the measurement outlived its subject`);
  return s;
}

/** `exec` on a `g`-flagged regex carries `lastIndex` between calls; strip it. */
function once(re: RegExp): RegExp {
  return new RegExp(re.source, re.flags.replace(/[gy]/g, ""));
}

/**
 * The denial vocabulary of the shipped probe, verbatim. Widening it is a policy
 * decision for the table, not for the measurement — this instrument must not
 * quietly enlarge the class it is measuring.
 */
const DENIAL_TOKEN =
  /\b(no|not|never|without|neither|nor|none|rather than|ruled out|declined|rejected|paused)\b/gi;

interface Split {
  label: string;
  re: RegExp;
}

/**
 * Three candidate clause definitions. S2 is the one the written scope
 * definition states; S1 is the conservative fallback it warns produces false
 * MISSING; S3 tests whether the comma is load-bearing.
 */
const SPLITS: Split[] = [
  { label: "S1 sentence   [ . ; | newline ]", re: /[.;|\n]/g },
  {
    label: "S2 as written [ . ; — | newline + and/but/or/nor/yet/so ]",
    re: /[.;—|\n]|\s+(?:and|but|or|nor|yet|so)\s+/g,
  },
  {
    label: "S3 S2 + comma [ S2 + , ]",
    re: /[.;—|\n,]|\s+(?:and|but|or|nor|yet|so)\s+/g,
  },
];

interface Clause {
  start: number;
  end: number;
  text: string;
}

function clauses(text: string, split: Split): Clause[] {
  const out: Clause[] = [];
  const re = new RegExp(split.re.source, split.re.flags.includes("g") ? split.re.flags : `${split.re.flags}g`);
  let cursor = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push({ start: cursor, end: m.index, text: text.slice(cursor, m.index) });
    cursor = m.index + m[0].length;
    if (m[0].length === 0) re.lastIndex++;
  }
  out.push({ start: cursor, end: text.length, text: text.slice(cursor) });
  return out.filter((c) => c.text.trim().length > 0);
}

/** How the fill happened — read through the same accessors the check uses. */
function route(s: ParamSpec, b: NeedBrief): { via: string; match?: RegExpExecArray } {
  if (s.defaultValue !== undefined) return { via: `defaultValue(${s.defaultValue})` };
  const text = s.mapping(b);
  const unknown = s.sanctionedUnknown === undefined ? null : once(s.sanctionedUnknown).exec(text);
  if (unknown !== null) return { via: "sanctionedUnknown", match: unknown };
  const hit = s.pattern === undefined ? null : once(s.pattern).exec(text);
  if (hit !== null) return { via: "pattern", match: hit };
  return { via: paramFilled(b, s) ? "labelDeclared" : "NO FILL" };
}

function report(title: string, corpus: Array<[string, string, string]>, mustFill: boolean): void {
  console.log(`\n${"=".repeat(78)}\n${title}\n${"=".repeat(78)}`);
  for (const [wf, name, sentence] of corpus) {
    const s = spec(wf, name);
    const b = brief(sentence);
    const text = s.mapping(b);
    const filled = paramFilled(b, s);
    const { via, match } = route(s, b);
    const verdict = filled === mustFill ? "as expected" : filled ? "**FILL — the defect**" : "**refused**";

    console.log(`\n── ${wf} ${name} — today: ${filled ? "FILL" : "refused"} (${verdict})`);
    console.log(`   sentence : ${sentence}`);
    if (text !== sentence) console.log(`   MAPPED   : ${text}`);
    console.log(`   route    : ${via}`);
    if (match === undefined) {
      if (via === "labelDeclared") {
        console.log("   ⚠ filled through the LABEL rule, not a pattern — no matched region to scope a guard on.");
      }
      if (via === "NO FILL" && s.pattern !== undefined) {
        console.log(`   pattern  : ${s.pattern.source}`);
      }
      continue;
    }
    const start = match.index;
    const end = match.index + match[0].length;
    console.log(`   MATCH    : "${match[0]}"  @[${start},${end})`);

    for (const split of SPLITS) {
      const cs = clauses(text, split);
      const owners = cs.filter((c) => start < c.end && end > c.start);
      if (owners.length > 1) {
        console.log(
          `   ${split.label}\n      ⚠ MATCH CROSSES ${owners.length} CLAUSES: ${owners.map((c) => `"${c.text.trim()}"`).join(" ⁄ ")}`,
        );
        continue;
      }
      const owner = owners[0];
      if (owner === undefined) {
        console.log(`   ${split.label}\n      ⚠ match owned by no clause (delimiter swallowed it)`);
        continue;
      }
      const tokens = [...owner.text.matchAll(DENIAL_TOKEN)].map((t) => {
        const abs = owner.start + (t.index ?? 0);
        return `${t[0].toLowerCase()}@${abs < start ? "BEFORE" : abs >= end ? "AFTER" : "inside"}`;
      });
      console.log(
        `   ${split.label}\n      clause: "${owner.text.trim()}"\n      denial in clause: ${tokens.length === 0 ? "none" : tokens.join(", ")}`,
      );
    }
  }
}

report("CORPUS 1 — DENIALS (every line must end up refused)", DENIALS, false);
report("CORPUS 2 — OVER-REACH CONTROL (every line must keep filling)", OVER_REACH, true);
report("CORPUS 3 — COST OF ADMITTING POSTPOSED DENIALS (must keep filling)", POSTPOSED_COST, true);

// ─────────────────────────────────────────────────────────────────────────────
// BEFORE / AFTER — the only honest way to say "N denials closed".
//
// ⚠️ "15 of 17 closed" is NOT readable from the snapshot: it says how many fill
// TODAY, and five of the seventeen lines were added WITH the guard, so they were
// never measured without it. The pre-guard verdict is reproduced exactly rather
// than approximated: `absenceIsAnswer` routes a spec down the ungated path, so a
// clone carrying it IS the old `paramFilled`. That doubles as a check that the
// opt-out really reproduces the previous behaviour instead of merely resembling
// it — if the two ever diverge, this table is where it shows.
console.log(`\n${"=".repeat(78)}\nBEFORE / AFTER — what the guard actually moved\n${"=".repeat(78)}`);
for (const [label, corpus, wanted] of [
  ["denials (want: closed)", DENIALS, false],
  ["over-reach (want: still filling)", OVER_REACH, true],
] as const) {
  let before = 0;
  let after = 0;
  let regressed = 0;
  for (const [wf, name, text] of corpus) {
    const s = spec(wf, name);
    const b = brief(text);
    const pre = paramFilled(b, { ...s, absenceIsAnswer: true });
    const post = paramFilled(b, s);
    if (pre) before++;
    if (post) after++;
    if (pre !== post && post === wanted) regressed++;
    if (pre === post && post !== wanted) {
      console.log(`  UNMOVED (${post ? "fills" : "refused"}) — ${wf}/${name}: ${text}`);
    }
  }
  console.log(`  ${label}: filled BEFORE ${before}/${corpus.length} → AFTER ${after}/${corpus.length}`);
}

console.log(`\n${"=".repeat(78)}\nSUMMARY\n${"=".repeat(78)}`);
for (const [label, corpus] of [
  ["denials filling today", DENIALS],
  ["over-reach filling today", OVER_REACH],
] as const) {
  const n = corpus.filter(([wf, name, t]) => paramFilled(brief(t), spec(wf, name))).length;
  console.log(`${label}: ${n} / ${corpus.length}`);
}
const viaCount = new Map<string, number>();
for (const [wf, name, t] of [...DENIALS, ...OVER_REACH]) {
  const v = route(spec(wf, name), brief(t)).via.replace(/\(.*\)/, "");
  viaCount.set(v, (viaCount.get(v) ?? 0) + 1);
}
console.log(`fill routes across the twenty: ${[...viaCount].map(([k, v]) => `${k}=${v}`).join(", ")}`);
