/**
 * MEASURE a param manifest against the 19 fixture briefs — before writing a
 * single test for it.
 *
 * THIS IS AN INSTRUMENT, NOT A GUARD, and the distinction is the point. It
 * asserts nothing and can never turn a suite red; its failure mode is not a
 * false green but NOT BEING RUN. It earns its place because running it first
 * has found, three times, a defect that no later test would have looked for —
 * each time on a detector whose own fixture was about to make it green:
 *   - WF-005 `Focus horizon` refused the word order used by its own card
 *     ("Focus horizon: medium term", the horizon word BEFORE the value);
 *   - WF-005 `Sources to prioritize` filled on "no monitored sources yet", a
 *     statement of absence read as a value;
 *   - WF-006 `Response deadline` filled on P12's "phase-one deadline in six
 *     weeks", a delivery milestone inside an ALREADY SIGNED engagement — the
 *     bare-quantity policy diverging for the third time.
 * A test written after the fact encodes whatever the detector already does. The
 * measurement is what happens while it can still be wrong.
 *
 * TWO READINGS, and the second is the one usually skipped:
 *   1. OWN briefs — which specs the workflow's own fixtures fill. Blanks here
 *      are expected on some specs (that is what PARAMS_MISSING is for); what
 *      matters is whether the blanks are the ones the card predicts.
 *   2. FOREIGN briefs — every fill is printed WITH THE EXACT SUBSTRING that
 *      fired. Without the substring a foreign fill gets qualified by
 *      supposition ("probably the GDPR mention"), which is how "budget capped
 *      for Q3" was read as a budget figure when the detector had matched the
 *      3 of "Q3". The cross-vocabulary probe records the same cells as a
 *      snapshot; it does not tell you WHY a cell is lit. This does.
 *
 * WHAT IT DOES NOT MEASURE: the corpus is the 19 fixture briefs, all written in
 * this repo, so a detector tuned to their phrasing looks perfect here. It says
 * nothing about real stakeholder prose.
 *
 * Usage: npm run measure -- WF-006
 */

import { DEFAULT_MANIFESTS } from "../src/dispatch/run-dispatch.js";
import { paramFilled } from "../src/dispatch/validate-route.js";
import type { NeedBrief, ParamSpec } from "../src/dispatch/types.js";
import { DISPATCH_FIXTURES } from "../test/fixtures/dispatch-briefs.js";

const target = process.argv[2]?.toUpperCase();

if (target === undefined) {
  console.error("usage: npm run measure -- WF-006");
  console.error(`registered: ${Object.keys(DEFAULT_MANIFESTS).sort().join(", ")}`);
  process.exit(2);
}

const manifest = DEFAULT_MANIFESTS[target];
if (manifest === undefined) {
  console.error(`"${target}" has no manifest in DEFAULT_MANIFESTS.`);
  console.error(
    "If you have just written the file, register it in src/dispatch/run-dispatch.ts —" +
      " an unregistered manifest is inert (the route reports paramsChecked:false).",
  );
  console.error(`registered: ${Object.keys(DEFAULT_MANIFESTS).sort().join(", ")}`);
  process.exit(2);
}

/**
 * The substring that made a spec fill — read from the SAME accessors the check
 * uses, and reported as "?" when the verdict and the explanation disagree
 * rather than being quietly smoothed over.
 */
function evidence(spec: ParamSpec, brief: NeedBrief): string {
  if (spec.defaultValue !== undefined) return `(defaultValue: ${spec.defaultValue})`;
  const text = spec.mapping(brief);
  const unknown = spec.sanctionedUnknown?.exec(text);
  if (unknown !== null && unknown !== undefined) return `(sanctioned unknown) "${unknown[0]}"`;
  const hit = spec.pattern?.exec(text);
  if (hit !== null && hit !== undefined) return `"${hit[0]}"`;
  return "?? filled, but neither detector produced a match — READ THIS";
}

const briefs = DISPATCH_FIXTURES.flatMap((f) =>
  f.brief === undefined ? [] : [{ id: f.id, expected: f.expected, brief: f.brief }],
);
const own = briefs.filter((b) => b.expected === target);
const foreign = briefs.filter((b) => b.expected !== target);

console.log(`# ${target} — ${manifest.params.length} spec(s), catalog ${manifest.catalogTag}`);
console.log(
  `# corpus: ${briefs.length} qualified briefs — ${own.length} own (${own.map((b) => b.id).join(", ") || "none"}), ${foreign.length} foreign`,
);

console.log(`\n## 1. Own briefs — what the workflow's own fixtures fill\n`);
if (own.length === 0) {
  console.log(
    "No fixture routes to this workflow. Section 1 is empty by construction, and",
    "\nthat is itself worth knowing: this manifest has no positive measurement here.",
  );
} else {
  for (const { id, brief } of own) {
    console.log(`### ${id}`);
    for (const spec of manifest.params) {
      const filled = paramFilled(brief, spec);
      const flag = filled ? "FILLED " : "MISSING";
      const why = filled ? ` ← ${evidence(spec, brief)}` : "";
      const req = spec.required ? "" : " [optional]";
      console.log(`  ${flag} ${spec.name}${req} — ${spec.card}${why}`);
    }
    const missing = manifest.params.filter((s) => !paramFilled(brief, s));
    console.log(
      `  → ${missing.length === 0 ? "ROUTED, paramsChecked:true" : `PARAMS_MISSING ${JSON.stringify(missing.map((s) => s.card))}`}\n`,
    );
  }
}

console.log(`## 2. Foreign briefs — every fill, with the substring that fired\n`);
console.log(
  "A lit cell is not mechanically a defect: a sector or a GDPR constraint legitimately\n" +
    "crosses cards. It IS one when the substring below turns out to be a word the spec\n" +
    "never meant to claim. Qualify each one by its match, never by its plausibility.\n",
);

// `defaultValue` specs are EXCLUDED here, which is what the shipped
// cross-vocabulary snapshot means by "measurable specs". They fill by
// declaration, so they light every brief and discriminate nothing; counting
// them inflates the total by one full column each and buries the cells that
// carry information. Calibrating this instrument against that snapshot is what
// exposed the difference: 51 vs 17 on WF-001 and 55 vs 38 on WF-004 resolved
// exactly to two and one default columns of 17.
const measurable = manifest.params.filter((s) => s.defaultValue === undefined);
const declared = manifest.params.length - measurable.length;
if (declared > 0) {
  console.log(
    `(${declared} spec(s) excluded: they declare a defaultValue, so they fill everywhere by construction.)\n`,
  );
}
let cells = 0;
for (const spec of measurable) {
  const hits = foreign.filter(({ brief }) => paramFilled(brief, spec));
  cells += hits.length;
  if (hits.length === 0) {
    console.log(`### ${spec.name} — 0 foreign fill`);
    continue;
  }
  console.log(`### ${spec.name} — ${hits.length} foreign fill(s)`);
  for (const { id, expected, brief } of hits) {
    console.log(`  ${id} (${expected}) ← ${evidence(spec, brief)}`);
  }
}
console.log(
  `\n${cells} foreign cell(s) over ${measurable.length} measurable spec(s) × ${foreign.length} briefs.`,
);
