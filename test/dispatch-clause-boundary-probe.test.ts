/**
 * CLAUSE-BOUNDARY PROBE — does an adjacency window pair two facts that a `;`
 * has separated?
 *
 * THE SCOPE DEFINITION, WRITTEN BEFORE THE GUARD, and the thing any change here
 * must be verified against — never against a count that looks plausible:
 *
 *   A `;` ends a clause. Two tokens on OPPOSITE sides of one are two separate
 *   statements, so a detector that pairs across it reports a fact the sentence
 *   never states. The failure direction is UNSAFE: a false fill yields
 *   `paramsChecked: true` on a brief that does not answer the card line.
 *
 * WHY THE CORPUS IS DERIVED AND NOT WRITTEN. Hand-written probe sentences carry
 * whatever vocabulary the author happened to think of, which measures the author
 * (`feedback-controle-positif-circulaire`). A first pass here did exactly that:
 * eight invented sentences found the defect on ONE spec and missed the rest.
 * This corpus is instead derived from the corpus that already exists — take
 * every match a detector really makes on a real brief, inject a `;` at the
 * middle space OF THAT MATCH, and re-run the same pattern. A window that still
 * fills has crossed a clause boundary. Nothing is invented; the sentences are
 * the repo's own, minus one space.
 *
 * ⚠️ WHAT THIS DOES NOT MEASURE — two bounds, and the second is the one that is
 * easy to misread from the table alone:
 *
 * (a) POPULATION. Only specs that ALREADY fill on some brief are exercised,
 *     because the injection needs a real match to mutate. A spec filling on no
 *     brief is invisible here. Every count is a FLOOR, never a total
 *     (`feedback-aucun-nombre-sans-sa-population`).
 *
 * (b) IT MEASURES A PROPERTY, NOT A FREQUENCY. The injection lands at the middle
 *     space of the match, which often falls INSIDE a noun phrase — `three-month;
 *     engagement`, `EU; only`. No real writer produces those. So a row proves
 *     "this window would cross a `;` if one were there", NOT "a realistic brief
 *     triggers this false positive". The realistic case is proven separately and
 *     by hand — e.g. WF-009 `role_level` on "the budget is senior-approved; we
 *     still need to hire a developer", where the sentence never states the level
 *     of the role sought. Do not read this table as a defect count.
 *
 * Both readings support the same remedy, which is why the distinction is written
 * rather than smoothed over: tightening costs nothing (measured: ZERO of the 269
 * real matches crosses a `;` today) and closes the property in one policy-wide
 * move, instead of leaving nine specs diverging from the other seventy-eight
 * (`feedback-coherence-inter-artefacts-invisible-aux-tests`).
 *
 * ⚠️ OPEN FINDING, recorded because a green falsification is a result and not a
 * pass. Excluding the COMMA as well (`[^.;,]`) on WF-009 `role_level` survives
 * the whole suite: nothing measures whether a comma must stay traversable for
 * that spec. The `;`-but-not-`,` line is therefore ARGUED, not measured — a
 * comma separates examples (the WF-001 `constraints` and WF-006 `Known risks`
 * precedents), a semicolon separates clauses. No guard is added for it here: on
 * this corpus no `role_level` match contains a comma, so a test would assert
 * against an empty case and prove only its own non-vacuity. Whoever tightens
 * further must first produce the brief that makes the difference visible.
 *
 * Frozen as a SNAPSHOT rather than a red assertion: a permanent red masks real
 * regressions. Read the diff, never regenerate it reflexively.
 */
import { describe, it, expect } from "vitest";
import { DEFAULT_MANIFESTS } from "../src/dispatch/run-dispatch.js";
import { DISPATCH_FIXTURES } from "./fixtures/dispatch-briefs.js";

interface Row {
  workflow: string;
  spec: string;
  fixture: string;
  matched: string;
  crosses: boolean;
}

function probe(): { rows: Row[]; considered: number } {
  const rows: Row[] = [];
  let considered = 0;
  for (const [workflow, manifest] of Object.entries(DEFAULT_MANIFESTS)) {
    for (const fx of DISPATCH_FIXTURES) {
      if (!fx.brief) continue;
      for (const spec of manifest.params) {
        const pattern = spec.pattern;
        if (!pattern) continue;
        const text = spec.mapping(fx.brief);
        if (typeof text !== "string" || text.length === 0) continue;
        const fresh = () => new RegExp(pattern.source, pattern.flags.replace("g", ""));
        const hit = fresh().exec(text);
        if (!hit) continue;
        const matched = hit[0];
        const spaces = [...matched.matchAll(/ /g)].map((m) => m.index!);
        if (spaces.length === 0) continue;
        const at = spaces[Math.floor(spaces.length / 2)]!;
        const mutated = matched.slice(0, at) + ";" + matched.slice(at);
        considered++;
        const after = fresh().exec(text.replace(matched, mutated));
        const crosses = !!after && after[0].includes(";");
        if (crosses) {
          rows.push({ workflow, spec: spec.name, fixture: fx.id, matched: after[0], crosses });
        }
      }
    }
  }
  rows.sort(
    (a, b) =>
      a.workflow.localeCompare(b.workflow) ||
      a.spec.localeCompare(b.spec) ||
      a.fixture.localeCompare(b.fixture),
  );
  return { rows, considered };
}

describe("clause-boundary probe — windows that pair across a `;`", () => {
  it("records which adjacency windows cross a clause boundary", async () => {
    const { rows, considered } = probe();
    const specs = new Set(rows.map((r) => `${r.workflow}.${r.spec}`));

    const out: string[] = [];
    out.push("# Clause-boundary probe — adjacency windows that pair across a `;`");
    out.push("");
    out.push(
      "Generated by `test/dispatch-clause-boundary-probe.test.ts`. The scope definition it must",
    );
    out.push("be verified against lives in that file's header and was written BEFORE any change.");
    out.push("");
    out.push(
      "Method: every match a detector really makes on a real brief has a `;` injected at the",
    );
    out.push(
      "middle space of that match; the same pattern is re-run. A row below means the window",
    );
    out.push("still filled, i.e. it paired two facts the `;` had separated.");
    out.push("");
    out.push(
      "⚠️ Population: only specs that ALREADY fill on some brief can be probed, so these counts",
    );
    out.push("are a FLOOR, not a total. A spec filling on no brief is invisible here.");
    out.push("");
    out.push(
      "⚠️ This table is NOT a defect count. The injection lands at the middle space of the match,",
    );
    out.push(
      "often inside a noun phrase (`three-month; engagement`), which no real writer produces. A row",
    );
    out.push(
      "proves the window WOULD cross a `;`, not that a realistic brief triggers it. The realistic",
    );
    out.push(
      "case is proven by hand in the test header. Both readings call for the same fix, and",
    );
    out.push("tightening changes no verdict: zero of the real matches crosses a `;` today.");
    out.push("");
    out.push(`- matches with an injectable space: **${considered}**`);
    out.push(`- windows still filling across the injected \`;\`: **${rows.length}**`);
    out.push(`- distinct specs affected: **${specs.size}**`);
    out.push("");
    out.push("| Workflow | Spec | Brief | Matched across the `;` |");
    out.push("|---|---|---|---|");
    for (const r of rows) {
      out.push(
        `| ${r.workflow} | \`${r.spec}\` | ${r.fixture} | \`${r.matched.replace(/\|/g, "\\|")}\` |`,
      );
    }
    out.push("");

    await expect(out.join("\n")).toMatchFileSnapshot("./__snapshots__/clause-boundary.md");
  });

  /**
   * The REALISTIC case, hard-asserted because the snapshot above cannot carry it:
   * the snapshot measures a structural property on injected semicolons, while
   * these two sentences are ones a person would actually write. Both name a
   * level word and a role word on OPPOSITE sides of a `;`, and neither states
   * the level of the role sought — the unsafe direction.
   *
   * The third case is the control that makes this discriminate rather than
   * merely strict: the legitimate sentence must still fill. A guard that closed
   * both would be a regression wearing the costume of a fix.
   */
  it("refuses a level and a role separated by a `;`, and still fills the legitimate one", async () => {
    const { WF009_MANIFEST } = await import("../src/dispatch/manifests/wf-009.js");
    const spec = WF009_MANIFEST.params.find((p) => p.name === "role_level");
    expect(spec?.pattern, "role_level must carry a detector").toBeDefined();
    const re = spec!.pattern!;

    expect(re.test("the budget is senior-approved; we still need to hire a developer")).toBe(false);
    expect(re.test("our lead investor signed; the position is a data analyst")).toBe(false);
    expect(re.test("we are hiring a senior MLOps engineer")).toBe(true);
  });
});
