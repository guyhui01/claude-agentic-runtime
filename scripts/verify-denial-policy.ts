/**
 * VERIFICATION PASS on the denial policy — the pass that broke two of its own
 * decisions before either reached `src/`.
 *
 * ⛔ It does not implement the guard: it PROTOTYPES the rule inside the
 * instrument, so a policy can be attacked while changing it is still free. Each
 * section attacks a claim the policy makes WITHOUT having measured it — a
 * second pass that merely replays green probes is worth nothing.
 *
 * ⚠️ IT IS ALSO THE RECORD OF ITS OWN BLIND SPOT, which is why it is versioned
 * rather than deleted with the lot. V1 reported ZERO verdicts moved and the
 * suite then turned five tests red, because every section here reads
 * `DISPATCH_FIXTURES` — and the suite ALSO builds AMENDED briefs that live only
 * inside the test file. The nineteen fixtures are not the repository's corpus.
 * Anything measured here is measured on a subset, and a green is silent about
 * the rest.
 *
 *  V1  Does the rule move any verdict on the REAL corpus? The table was written
 *      from 24 hand-made sentences; the requirement is "zero verdict moved on
 *      the briefs", and that had never been run.
 *  V2  D6 claims the guard belongs at `pattern` only, on the evidence that no
 *      probe sentence fills through `labelDeclared`. But no probe sentence uses
 *      the `Label: value` form at all, so the claim rests on a corpus that
 *      cannot express its own counter-example.
 *  V3  D1 discards the comma on "no line diverges between S2 and S3" — read by
 *      eye off a listing, never computed.
 *  V4  D2 prices the postposed class at 3-for-1 using four sentences I wrote to
 *      show that cost. If the real corpus carries no postposed participle, both
 *      pans of that scale are empty and the ratio decides nothing.
 *  V5  Every mapping joins `need` and `context` with a BARE SPACE, so a field
 *      boundary is not a clause boundary unless the text happens to end in
 *      punctuation. A denial ending one field would then govern a value opening
 *      the next.
 *  V6  The denial vocabulary is inherited from the probe. What ordinary English
 *      negation does it miss? A missed form is a false FILL that survives the
 *      guard — the unsafe direction, silently.
 */

import { DEFAULT_MANIFESTS } from "../src/dispatch/run-dispatch.js";
import { paramFilled } from "../src/dispatch/validate-route.js";
import { DISPATCH_FIXTURES } from "../test/fixtures/dispatch-briefs.js";
import type { NeedBrief, ParamSpec } from "../src/dispatch/types.js";

const DENIAL_TOKEN =
  /\b(no|not|never|without|neither|nor|none|rather than|ruled out|declined|rejected|paused)\b/gi;

/**
 * ⚠️ THESE TWO MUST STAY LABELLED FOR WHAT THEY ARE. `SHIPPED` mirrors the rule
 * in `validate-route.ts`; `FIRST_DESIGN` is the variant this pass was built to
 * attack — no comma boundary, and `yet` counted as a coordinating conjunction.
 * Both of those were wrong, and the second was invisible until a denial written
 * as "has YET to be put in production" had its token cut in half by the split.
 * A prototype that silently drifts from the shipped rule describes a check that
 * is not the one running — the reason `paramFilled` is exported rather than
 * re-implemented in `measure-manifest.ts`.
 */
const SHIPPED = /[.,;—|\n]|\s+(?:and|but|or|nor|so)\s+/g;
const FIRST_DESIGN = /[.;—|\n]|\s+(?:and|but|or|nor|yet|so)\s+/g;
const S2 = SHIPPED;
const S3 = FIRST_DESIGN;

interface Clause {
  start: number;
  end: number;
  text: string;
}

function clauses(text: string, sep: RegExp): Clause[] {
  const re = new RegExp(sep.source, "g");
  const out: Clause[] = [];
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

function global(re: RegExp): RegExp {
  return new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
}

/** D2 + D5: a denial governs when it sits in a clause the match occupies, at or before its end. */
function governed(text: string, start: number, end: number, sep: RegExp): boolean {
  const owners = clauses(text, sep).filter((c) => start < c.end && end > c.start);
  for (const owner of owners) {
    for (const t of owner.text.matchAll(DENIAL_TOKEN)) {
      if (owner.start + (t.index ?? 0) < end) return true;
    }
  }
  return false;
}

/** Which accessor produced today's fill — the guard only applies to `pattern` (D6). */
function via(s: ParamSpec, b: NeedBrief): "default" | "sanctioned" | "pattern" | "label" | "none" {
  if (s.defaultValue !== undefined) return "default";
  const text = s.mapping(b);
  if (s.sanctionedUnknown !== undefined && new RegExp(s.sanctionedUnknown.source, s.sanctionedUnknown.flags.replace(/[gy]/g, "")).test(text)) return "sanctioned";
  if (s.pattern !== undefined && new RegExp(s.pattern.source, s.pattern.flags.replace(/[gy]/g, "")).test(text)) return "pattern";
  return paramFilled(b, s) ? "label" : "none";
}

/** D4: FILL when AT LEAST ONE occurrence of the pattern is ungoverned. */
function guarded(b: NeedBrief, s: ParamSpec, sep: RegExp = S2): boolean {
  if (!paramFilled(b, s)) return false;
  if (via(s, b) !== "pattern" || s.pattern === undefined) return true;
  const text = s.mapping(b);
  for (const m of text.matchAll(global(s.pattern))) {
    if (m.index === undefined) continue;
    if (!governed(text, m.index, m.index + m[0].length, sep)) return true;
  }
  return false;
}

const briefs = DISPATCH_FIXTURES.flatMap((f) =>
  f.brief === undefined ? [] : [{ id: f.id, expected: f.expected, brief: f.brief }],
);
const specs = Object.entries(DEFAULT_MANIFESTS).flatMap(([wf, m]) =>
  m.params.map((p) => ({ wf, spec: p })),
);

const line = (t: string): void => console.log(`\n${"=".repeat(78)}\n${t}\n${"=".repeat(78)}`);

// ─────────────────────────────────────────────────────────────── V0
//
// ⚠️ V1 BELOW PROTOTYPES the rule and is therefore only as true as the prototype.
// V0 measures the SHIPPED code against itself: `absenceIsAnswer` routes a spec
// down the ungated path, so a clone carrying it reproduces the pre-guard
// `paramFilled` exactly. This is the non-regression claim, and it must be read
// instead of V1 whenever the two disagree.
line("V0 — SHIPPED GUARD vs PRE-GUARD, on every brief × every spec");
let shippedMoved = 0;
let shippedCells = 0;
for (const { id, expected, brief } of briefs) {
  for (const { wf, spec } of specs) {
    const pre = paramFilled(brief, { ...spec, absenceIsAnswer: true });
    const post = paramFilled(brief, spec);
    if (pre) shippedCells++;
    if (pre === post) continue;
    shippedMoved++;
    console.log(
      `  ${id} (${wf === expected ? "OWN" : "foreign"} ${wf}) ${spec.name}: ${pre ? "FILL" : "missing"} → ${post ? "FILL" : "MISSING"}`,
    );
  }
}
console.log(
  `  ${shippedMoved} verdict(s) moved by the SHIPPED guard over ${shippedCells} previously-filled cells.`,
);

// ─────────────────────────────────────────────────────────────── V1
line("V1 — VERDICTS MOVED ON THE REAL CORPUS (prototype — see V0 for the shipped rule)");
let cells = 0;
let moved = 0;
const movedRows: string[] = [];
for (const { id, expected, brief } of briefs) {
  for (const { wf, spec } of specs) {
    const before = paramFilled(brief, spec);
    if (!before) continue;
    cells++;
    if (guarded(brief, spec)) continue;
    moved++;
    const text = spec.mapping(brief);
    const hit = spec.pattern === undefined ? null : new RegExp(spec.pattern.source, spec.pattern.flags.replace(/[gy]/g, "")).exec(text);
    const own = wf === expected ? "OWN" : "foreign";
    movedRows.push(
      `  ${id} (${own} ${wf}) ${spec.name}${spec.required ? "" : " [opt]"} — matched "${hit?.[0] ?? "?"}"`,
    );
  }
}
console.log(`${cells} filled cells today across ${briefs.length} briefs × ${specs.length} specs.`);
console.log(`${moved} would flip to MISSING under the proposed rule.`);
for (const r of movedRows) console.log(r);
if (moved > 0) {
  console.log("\n  ⚠ Each row above is a verdict the policy MOVES. A row on an OWN brief");
  console.log("    is the serious one: it can turn a ROUTED into PARAMS_MISSING.");
}

// ─────────────────────────────────────────────────────────────── V2
line("V2 — IS `labelDeclared` VULNERABLE? (D6 says the guard belongs at `pattern` only)");
// ⚠️ FIRST ATTEMPT MEASURED NOTHING. Its four sentences all filled through
// `pattern`, because a sentence carrying the card's own vocabulary is exactly
// what the pattern is built to catch — the label route was never exercised. A
// probe of the label rule must use a spec whose pattern CANNOT fire on the
// value: the `(name)` halves, whose detector reads a syntactic form and not a
// word list. Same defect class as the WF-006 case where a control left the
// surrounding context intact and the line filled through another branch.
const LABEL_PROBES: Array<[string, string, string]> = [
  ["WF-004", "client_name", "Client: Northwind, ruled out last week."],
  ["WF-004", "client_name", "Client: no name has been given."],
  ["WF-006", "prospect_name", "Prospect: Kestrel Mutual, not a client and never will be."],
  ["WF-008", "ai_system_name", "AI system audited: none has been designated."],
];
for (const [wf, name, sentence] of LABEL_PROBES) {
  const s = DEFAULT_MANIFESTS[wf]?.params.find((p) => p.name === name);
  if (s === undefined) {
    console.log(`  ${wf}/${name} — SPEC NOT FOUND`);
    continue;
  }
  const b: NeedBrief = {
    need: sentence,
    domain: "Management & Consulting",
    expectedDeliverable: "As stated",
    constraints: [],
    context: sentence,
    submittedBy: "Operator",
  };
  console.log(`  ${wf} ${name}: ${paramFilled(b, s) ? "FILL" : "refused"} via ${via(s, b)} — ${sentence}`);
}
console.log("\n  A FILL via `label` here is a denial passing through the route D6 leaves unguarded.");

// ─────────────────────────────────────────────────────────────── V3
line("V3 — SHIPPED vs FIRST_DESIGN CLAUSE SPLIT, on the fixture briefs");
let diff = 0;
for (const { id, brief } of briefs) {
  for (const { wf, spec } of specs) {
    const a = guarded(brief, spec, S2);
    const b2 = guarded(brief, spec, S3);
    if (a !== b2) {
      diff++;
      console.log(`  ${id} ${wf}/${spec.name}: S2=${a ? "FILL" : "missing"} S3=${b2 ? "FILL" : "missing"}`);
    }
  }
}
console.log(`  ${diff} divergence(s) between S2 and S3 over ${briefs.length * specs.length} cells.`);

// ─────────────────────────────────────────────────────────────── V4
line("V4 — DO THE REAL BRIEFS CARRY POSTPOSED DENIAL PARTICIPLES? (D2's other pan)");
const POSTPOSED = /\b(ruled out|rejected|declined|paused|excluded|dropped|abandoned|turned down|shelved)\b/gi;
let carriers = 0;
for (const { id, brief } of briefs) {
  const text = `${brief.need} ${brief.context} ${brief.constraints.join("; ")} ${brief.expectedDeliverable}`;
  const hits = [...text.matchAll(POSTPOSED)].map((m) => m[0].toLowerCase());
  if (hits.length === 0) continue;
  carriers++;
  console.log(`  ${id}: ${[...new Set(hits)].join(", ")}`);
}
console.log(`  ${carriers} of ${briefs.length} briefs carry any postposed denial participle.`);

// ─────────────────────────────────────────────────────────────── V5
line("V5 — IS THE FIELD BOUNDARY A CLAUSE BOUNDARY? (mappings join with a bare space)");
let unpunctuated = 0;
for (const { id, brief } of briefs) {
  const needEnds = /[.;:!?]\s*$/.test(brief.need);
  const ctxEnds = /[.;:!?]\s*$/.test(brief.context);
  if (needEnds && ctxEnds) continue;
  unpunctuated++;
  console.log(
    `  ${id}: need ends "${brief.need.slice(-28)}" [${needEnds ? "punctuated" : "BARE"}] · context ends [${ctxEnds ? "punctuated" : "BARE"}]`,
  );
}
console.log(
  `  ${unpunctuated} of ${briefs.length} briefs splice at least one field boundary INSIDE a clause.`,
);

// ─────────────────────────────────────────────────────────────── V6
line("V6 — WHAT ORDINARY NEGATION DOES THE TOKEN LIST MISS?");
const CANDIDATES = [
  "the client isn't advanced in AI maturity",
  "the client doesn't have a cloud provider yet",
  "there is no longer a senior role open",
  "we lack any selection criteria on price",
  "the model has yet to be put in production",
  "the audit is absent of any partial failure",
  "the team failed to define a permanent contract",
  "far from a partial failure, this is routine",
];
for (const c of CANDIDATES) {
  const hits = [...c.matchAll(DENIAL_TOKEN)].map((m) => m[0].toLowerCase());
  console.log(`  ${hits.length === 0 ? "MISSED  " : `caught(${hits.join(",")})`} — ${c}`);
}
console.log("\n  A MISSED line is a denial the guard will not see: an unsafe false FILL that survives.");

// ─────────────────────────────────────────────────────────────── V7
line("V7 — PRICE OF THE WIDER VOCABULARY (the decision V6 forces)");
/**
 * The probe list is not a policy: the twelve denial sentences were written with
 * the very tokens it contains, so it scores well on a corpus built around it.
 * This is the widened class, and the only question that decides it is what it
 * costs on the real briefs — a token like `lack` or `absent` can appear in
 * perfectly affirmative prose.
 */
const WIDE_DENIAL =
  /\b(no|not|never|without|neither|nor|none|rather than|ruled out|declined|rejected|paused|no longer|lacks?|lacking|absent|unable to|fails? to|failed to|far from|yet to be|\w+n't)\b/gi;

function governedWide(text: string, start: number, end: number): boolean {
  const owners = clauses(text, S2).filter((c) => start < c.end && end > c.start);
  for (const owner of owners) {
    for (const t of owner.text.matchAll(WIDE_DENIAL)) {
      if (owner.start + (t.index ?? 0) < end) return true;
    }
  }
  return false;
}

function guardedWide(b: NeedBrief, s: ParamSpec): boolean {
  if (!paramFilled(b, s)) return false;
  if (via(s, b) !== "pattern" || s.pattern === undefined) return true;
  const text = s.mapping(b);
  for (const m of text.matchAll(global(s.pattern))) {
    if (m.index === undefined) continue;
    if (!governedWide(text, m.index, m.index + m[0].length)) return true;
  }
  return false;
}

let movedWide = 0;
for (const { id, expected, brief } of briefs) {
  for (const { wf, spec } of specs) {
    if (!paramFilled(brief, spec)) continue;
    if (guardedWide(brief, spec)) continue;
    movedWide++;
    const text = spec.mapping(brief);
    const hit = spec.pattern === undefined ? null : new RegExp(spec.pattern.source, spec.pattern.flags.replace(/[gy]/g, "")).exec(text);
    const owner = clauses(text, S2).find((c) => hit !== null && hit.index < c.end && hit.index >= c.start);
    console.log(
      `  ${id} (${wf === expected ? "OWN" : "foreign"} ${wf}) ${spec.name} — matched "${hit?.[0] ?? "?"}"\n      clause: "${owner?.text.trim() ?? "?"}"`,
    );
  }
}
console.log(`  ${movedWide} verdict(s) moved with the WIDE list, versus ${moved} with the probe list.`);
for (const c of CANDIDATES) {
  const hits = [...c.matchAll(WIDE_DENIAL)].map((m) => m[0].toLowerCase());
  console.log(`  ${hits.length === 0 ? "STILL MISSED" : `caught(${hits.join(",")})`.padEnd(12)} — ${c}`);
}

// ─────────────────────────────────────────────────────────────── V8
line("V8 — SHIPPED vs FIRST_DESIGN on the probe sentences (V3 covered only the briefs)");
const SENTENCES: Array<[string, string, string]> = [
  ["WF-003", "cloud_provider", "No cloud provider has been chosen; AWS was ruled out."],
  ["WF-004", "client_ai_maturity", "The client has no AI maturity assessment; beginner is a guess."],
  ["WF-005", "audience", "There is no LinkedIn audience to address yet."],
  ["WF-006", "selection_criteria", "No selection criteria on price or expertise were shared."],
  ["WF-007", "identified_stakes", "No business stakes have been identified so far."],
  ["WF-008", "ai_system_status", "The system is not in production and no pilot is planned."],
  ["WF-009", "role_level", "No senior role has been opened for this team."],
  ["WF-009", "role_level", "The role is not yet defined; senior hires are paused."],
  ["WF-009", "contract_type", "No permanent contract is offered for this mission."],
  ["WF-010", "closeout_type", "This is not a partial failure and not an incident."],
  ["WF-003", "cloud_provider", "GDPR applies, no exceptions; the stack runs on AWS."],
  ["WF-004", "client_ai_maturity", "No budget was agreed, but the client is advanced in AI maturity."],
  ["WF-006", "selection_criteria", "No RFP was issued; the selection criteria are price and expertise."],
  ["WF-007", "identified_stakes", "No timeline yet; the business stakes are identified and documented."],
  ["WF-008", "ai_system_status", "No incident so far; the scoring model is in production."],
  ["WF-009", "role_level", "No agency is involved; we are hiring a senior engineer directly."],
  ["WF-010", "closeout_type", "No blame culture here — this is a partial failure to review."],
];
let sDiff = 0;
for (const [wf, name, sentence] of SENTENCES) {
  const s = DEFAULT_MANIFESTS[wf]?.params.find((p) => p.name === name);
  if (s === undefined) continue;
  const b: NeedBrief = {
    need: sentence,
    domain: "Management & Consulting",
    expectedDeliverable: "As stated",
    constraints: [],
    context: sentence,
    submittedBy: "Operator",
  };
  const a = guarded(b, s, S2);
  const c = guarded(b, s, S3);
  if (a !== c) {
    sDiff++;
    console.log(`  DIVERGES ${wf}/${name}: S2=${a ? "FILL" : "missing"} S3=${c ? "FILL" : "missing"} — ${sentence}`);
  }
}
console.log(`  ${sDiff} divergence(s) between S2 and S3 over ${SENTENCES.length} probe sentences.`);

// ─────────────────────────────────────────────────────────────── V9
line("V9 — WHAT THE CLAUSE RULE CLOSES ON THE TWELVE (the claim was 8 of 10)");
let closed = 0;
let stillFilling = 0;
for (const [wf, name, sentence] of SENTENCES.slice(0, 10)) {
  const s = DEFAULT_MANIFESTS[wf]?.params.find((p) => p.name === name);
  if (s === undefined) continue;
  const b: NeedBrief = {
    need: sentence,
    domain: "Management & Consulting",
    expectedDeliverable: "As stated",
    constraints: [],
    context: sentence,
    submittedBy: "Operator",
  };
  const before = paramFilled(b, s);
  const after = guarded(b, s);
  if (!before) continue;
  if (after) {
    stillFilling++;
    console.log(`  STILL FILLS — ${wf}/${name}: ${sentence}`);
  } else closed++;
}
console.log(`  closed: ${closed} · still filling: ${stillFilling}`);
