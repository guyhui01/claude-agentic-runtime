import { describe, it, expect } from "vitest";
import { DEFAULT_MANIFESTS } from "../src/dispatch/run-dispatch.js";
import type { NeedBrief, ParamSpec } from "../src/dispatch/types.js";

/**
 * POLICY-CONSISTENCY AUDIT across every registered manifest, frozen as a
 * reviewed snapshot (offline, zero LLM, zero quota).
 *
 * WHAT IT MEASURES THAT NOTHING ELSE CAN. Every other guard here judges ONE
 * manifest against ITS OWN fixture, so a question of policy settled in opposite
 * directions across two manifests is invisible: both are green, and each is
 * locally right. That defect has already occurred twice and was attempted a
 * third time — "a bare quantity is not a value", refused by WF-005 `Horizon`,
 * admitted by WF-004 `Engagement duration` (found by the cross-vocabulary
 * probe), re-attempted by WF-006 `Response deadline` (found by measuring the
 * detectors before its tests existed). The cross-vocabulary probe finds these
 * only by luck: it needs a foreign brief that happens to expose the divergence.
 * This one reads the manifests themselves and puts the siblings side by side.
 *
 * BUILT AT SIX MANIFESTS, NOT AT TEN, and for the reason the cross-vocabulary
 * probe was built at five: waiting for the tenth would let four more manifests
 * be written under a policy that may already have drifted. At the end this
 * would be a machine for FINDING divergences, which means retrofits across ten
 * files; here it is a machine for PREVENTING them, since the remaining
 * manifests are written against a visible table.
 *
 * IT IS NOT AN ASSERTION OF CORRECTNESS, and must not become one — the same
 * discipline as the cross-vocabulary matrix. Cards genuinely differ, so a
 * divergence is not mechanically a defect. What is refused is an UNNOTICED one:
 * the value is in reading the diff when the table moves. One fact IS a hard
 * assertion below, because it is an invariant rather than a judgement.
 *
 * WHAT IT DOES NOT MEASURE — write this down, or the green reads wider than it
 * is:
 *   - It compares specs grouped by a NAME convention. Two manifests carrying
 *     the same fact under names that do not share a stripped prefix are never
 *     put side by side, so the sibling table sees only the roles someone
 *     happened to name consistently. It cannot find a divergence it cannot
 *     pair.
 *   - `adjacency-window` detects `{0,N}` only. A quantity anchored by an
 *     immediately following unit noun (`\d+\s*(employees|staff)`) is anchored
 *     without carrying that marker, so a row showing quantity vocabulary and no
 *     window is a prompt to READ the spec, never a verdict on it.
 *   - It reads regex SOURCES, not behaviour. Two detectors accepting the same
 *     language while written differently will read as divergent, and the
 *     converse — the same text meaning different things against different
 *     mappings — is invisible here. The cross-vocabulary probe is what measures
 *     behaviour; these two are complementary and neither subsumes the other.
 */

/**
 * Which brief fields a spec's `mapping` reads, determined by CALLING it with a
 * distinct sentinel per field rather than by inspecting a closure. That makes
 * "submittedBy is mapped nowhere" a measured fact instead of a claim repeated
 * in six comments.
 */
const SENTINEL_BRIEF: NeedBrief = {
  need: "SENTINELNEED",
  domain: "SENTINELDOMAIN",
  expectedDeliverable: "SENTINELDELIVERABLE",
  constraints: ["SENTINELCONSTRAINTS"],
  context: "SENTINELCONTEXT",
  submittedBy: "SENTINELSUBMITTEDBY",
};

const FIELDS = [
  ["need", "SENTINELNEED"],
  ["context", "SENTINELCONTEXT"],
  ["constraints", "SENTINELCONSTRAINTS"],
  ["expectedDeliverable", "SENTINELDELIVERABLE"],
  ["domain", "SENTINELDOMAIN"],
  ["submittedBy", "SENTINELSUBMITTEDBY"],
] as const;

function fieldsRead(spec: ParamSpec): string[] {
  const text = spec.mapping(SENTINEL_BRIEF);
  return FIELDS.filter(([, sentinel]) => text.includes(sentinel)).map(([name]) => name);
}

/**
 * Quantity vocabulary — the family that has diverged three times, so the marker
 * that finds it must not be the weakest thing in this file.
 *
 * DEFINITION, fixed before the detector: a spec belongs to this family when it
 * accepts a NUMBER as the value — the `\d+` quantifier or a spelled number
 * word. A `\d{4}` date literal does not count (the date IS the value, a
 * different family), nor does a digit inside a proper noun ("GPT-4").
 *
 * Two wrong versions preceded this one, in opposite directions, and both are
 * recorded because the second is the more instructive:
 *   - keying on three literal spellings of the alternation reported THREE
 *     specs against a ground truth of twelve — 25% sensitive on the very family
 *     this audit exists for, a table that looks authoritative while nine of its
 *     twelve members are invisible;
 *   - widening to a bare `\d` then reported FIFTEEN, pulling in a date literal
 *     and a model name. A marker that fires on everything is as useless as one
 *     that fires on nothing, and it would have been the harder error to notice.
 * The definition above is what the implementation is checked against, rather
 * than against whichever count looked plausible.
 */
const QUANTITY = /\\d\+|\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/;

function markers(spec: ParamSpec): string[] {
  const src = spec.pattern?.source ?? "";
  const out: string[] = [];
  if (spec.defaultValue !== undefined) out.push("default");
  if (spec.sanctionedUnknown !== undefined) out.push("sanctioned-unknown");
  if (spec.pattern === undefined) out.push("NO DETECTOR");
  if (src.includes("(?<!")) out.push("negation-guard");
  if (QUANTITY.test(src)) out.push("quantity-vocabulary");
  if (/\{0,\d+\}/.test(src)) out.push("adjacency-window");
  return out;
}

/**
 * The semantic role a spec plays, so the same fact carried by several cards can
 * be compared. Owner prefixes are stripped because a client and a prospect are
 * the same fact under two card vocabularies.
 */
function role(name: string): string {
  return name.replace(/^(client|prospect|infra)_/, "");
}

/**
 * The literal VOCABULARY a detector accepts, for a set difference between
 * siblings.
 *
 * A first version split the source on `|` and diffed the raw branches. It was
 * abandoned after reading its own first output: splitting inside a group
 * (`(?:with|for|at)`, `\b(beginner|novice|…)`) tears one alternation into
 * fragments, so it reported `bank\w*` as unique to WF-001 and `beginner` as
 * unique to WF-006 when both appear in every sibling. A table that raises false
 * divergences gets ignored, which is worse than no table.
 *
 * Extracting the literal word runs instead is stable under grouping, and it is
 * also the question worth asking: not "how is the regex written" but "which
 * vocabulary does it accept".
 */
function vocabulary(spec: ParamSpec): Set<string> {
  // Character classes are stripped FIRST, before any word is read. In a regex
  // source `\b` is two characters, so extracting words from the raw text glues
  // the `b` onto the literal that follows it — the second output of this table
  // reported `badvanced` as unique to WF-004 and `advanced` as unique to
  // WF-006, which is one word listed as two divergences.
  const src = (spec.pattern?.source ?? "").replace(/\\[bBwWsSdD]/g, " ");
  return new Set(
    (src.match(/[A-Za-z][A-Za-z0-9]*(?:[ &'-][A-Za-z0-9]+)*/g) ?? [])
      .map((w) => w.toLowerCase().trim())
      .filter((w) => w.length > 2),
  );
}

function renderTable(): string {
  const ids = Object.keys(DEFAULT_MANIFESTS).sort();
  const lines: string[] = [
    "# Manifest policy consistency — snapshot, read the diff",
    "",
    "Generated by `test/dispatch-policy-consistency.test.ts`. It compares the manifests",
    "to EACH OTHER, which no other guard does: every other check judges one manifest",
    "against its own fixture, so a policy settled in opposite directions across two of",
    "them is invisible — both are green and each is locally right.",
    "",
    "**A divergence is not automatically a defect** — the cards genuinely differ, and a",
    "detector may legitimately be wider where its card gives no enumeration. It IS a",
    "defect when the same fact is treated differently for no reason found on the cards.",
    "Read, decide, and record the decision on the spec — never silently regenerate.",
    "",
    "## 0. How many specs carry each family",
    "",
    "These counts exist because a marker that had 25% sensitivity went unnoticed while",
    "its rows were on the page: three rows among thirty look exactly like three rows.",
    "A count line moves visibly in a diff, which is the only thing being claimed here —",
    "it gives VISIBILITY, never proof. ⛔ Do not assert these numbers in a test: an",
    "expectation derived from the same predicate would only prove the marker equals",
    "itself. Read them against the manifests when they move.",
    "",
    "| Family | Specs |",
    "|---|---|",
  ];

  const allSpecs = ids.flatMap((id) => DEFAULT_MANIFESTS[id]?.params ?? []);
  const families = new Map<string, number>();
  for (const s of allSpecs) {
    for (const m of markers(s)) families.set(m, (families.get(m) ?? 0) + 1);
  }
  lines.push(`| (all specs, ${ids.length} manifests) | ${allSpecs.length} |`);
  for (const [family, count] of [...families.entries()].sort()) {
    lines.push(`| \`${family}\` | ${count} |`);
  }

  lines.push(
    "",
    "## 1. Brief fields each spec reads",
    "",
    "| Manifest | Fields read | Specs deviating from the manifest's own norm |",
    "|---|---|---|",
  );

  for (const id of ids) {
    const specs = DEFAULT_MANIFESTS[id]?.params ?? [];
    const counts = new Map<string, number>();
    for (const s of specs) {
      const key = fieldsRead(s).join("+");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const norm = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
    const deviants = specs
      .filter((s) => fieldsRead(s).join("+") !== norm)
      .map((s) => `\`${s.name}\` → ${fieldsRead(s).join("+") || "(nothing)"}`);
    lines.push(`| ${id} | ${norm} | ${deviants.join(" · ") || "—"} |`);
  }

  lines.push("", "## 2. Policy markers per spec", "");
  lines.push("| Manifest | Spec | Markers |", "|---|---|---|");
  for (const id of ids) {
    for (const s of DEFAULT_MANIFESTS[id]?.params ?? []) {
      const m = markers(s);
      if (m.length > 0) lines.push(`| ${id} | \`${s.name}\` | ${m.join(" · ")} |`);
    }
  }

  lines.push("", "## 3. Sibling specs — the same role carried by several cards", "");
  const byRole = new Map<string, Array<{ id: string; spec: ParamSpec }>>();
  for (const id of ids) {
    for (const s of DEFAULT_MANIFESTS[id]?.params ?? []) {
      const r = role(s.name);
      byRole.set(r, [...(byRole.get(r) ?? []), { id, spec: s }]);
    }
  }
  for (const [r, members] of [...byRole.entries()].sort()) {
    if (members.length < 2) continue;
    lines.push(`### role \`${r}\` — ${members.map((m) => m.id).join(", ")}`, "");
    lines.push("| Manifest | Card label | Vocabulary unique to this copy |", "|---|---|---|");
    for (const { id, spec } of members) {
      const mine = vocabulary(spec);
      const others = new Set<string>();
      for (const other of members) {
        if (other.id === id) continue;
        for (const b of vocabulary(other.spec)) others.add(b);
      }
      const only = [...mine].filter((b) => !others.has(b)).sort();
      lines.push(`| ${id} | ${spec.card} | ${only.map((b) => `\`${b}\``).join(" ") || "—"} |`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

describe("policy consistency across manifests — a frozen table, not a verdict", () => {
  it("matches the reviewed snapshot of cross-manifest policy", () => {
    // Guard the guard: a shrunken registry would render an empty table that
    // reads as "no divergence".
    expect(Object.keys(DEFAULT_MANIFESTS).length).toBeGreaterThanOrEqual(6);
    expect(renderTable()).toMatchFileSnapshot("./__snapshots__/policy-consistency.md");
  });

  it("maps `submittedBy` in no manifest — the role-invariance the live probes proved", () => {
    // A hard assertion rather than a table row, because this one is an
    // invariant and not a judgement: filling a card parameter from the
    // submitter's role would make the verdict depend on WHO submits the brief,
    // which the P19/P20 role probes falsified live (role ⊥ route).
    for (const [id, manifest] of Object.entries(DEFAULT_MANIFESTS)) {
      for (const spec of manifest.params) {
        expect(`${id}.${spec.name}: ${fieldsRead(spec).join("+")}`).not.toContain("submittedBy");
      }
    }
  });

  // NOT ASSERTED HERE, deliberately: "every required spec has a detector or a
  // declared default". It was drafted, then removed — it rebuilds machinery
  // weighed and cut on 2026-07-28 as redundant, which `next_steps.md` names in
  // so many words. The claim was re-falsified rather than taken on trust before
  // removing the assertion: deleting the `pattern` of a required spec turns
  // FIVE existing tests red, the manifest's own happy-path ("routes the amended
  // brief with paramsChecked=true") among them. A second guard over the same
  // property would only make the suite look denser.
});
