import { describe, it, expect } from "vitest";
import { loadSpine } from "../src/manifest/load-manifest.js";
import { runSpine } from "../src/orchestrator/run-spine.js";
import { runEvalGate } from "../src/eval/eval-gate.js";
import { CriterionRegistry } from "../src/eval/criteria-registry.js";
import type { Criterion } from "../src/eval/types.js";
import {
  WF_005_VEILLE_MANIFEST,
  WF_005_VEILLE_CRITERIA,
  buildWf005VeilleRegistry,
} from "../src/spines/wf-005-veille.js";
import {
  wf005InterimSidecar as sidecar,
  wf005ResolveAgent as resolveAgent,
  mockRunner,
} from "./fixtures/wf-005-spine.js";
import { wf005HappyOutputs } from "./fixtures/wf-005-outputs.js";
import realTrace from "../docs/audit/live-runs/wf-005-live-result.json" with { type: "json" };

/**
 * WF-005 DISCRIMINATION AUDIT — fifth spine of the eval-gate battery, following WF-001
 * to WF-004. Same two axes; the schema/criterion split is RE-MEASURED, never assumed —
 * and it moves again: WF-001 = 6/9 redundant, WF-002 = 6/10 (4 unique), WF-003 = 6/18
 * redundant (12 unique), WF-004 = 9/15 redundant (6 unique), WF-005 (7 blocking) is
 * measured at 3 UNIQUE / 4 REDUNDANT below.
 *
 * ⛔ THIS FILE FIXES NOTHING, by design (denial-probe precedent). It MEASURES and
 * GUARDS; every finding below is recorded for a later, separate lot. Widening a
 * criterion in the same motion as building the instrument is the move that failed
 * twice on 2026-08-02 on the dispatch side.
 *
 * It measures TWO axes a naive "every check goes green" battery hides:
 *
 *  AXIS 1 — NO DEAD SUB-CLAUSE (the literal mandate). A criterion that cannot fail
 *  is a `/.+/`. Each blocking criterion is falsified on EACH of its independent
 *  clauses. Positive pole anchored NOT on a hand-built fixture but on the committed
 *  REAL agent output of the WF-005 billed run (WF-005 circular-positive-control lesson).
 *
 *  AXIS 2 — LOAD-BEARING vs RUNTIME-REDUNDANT (the finding the naive battery hides).
 *  Runtime order in run-spine.ts is: runner → eval gate (criteria, on RAW output) →
 *  handoff (validateHandoff, ajv2020 strict, on `producer.output` at EVERY step). A
 *  criterion whose clause the schema ALSO enforces (array min, required keys) is caught
 *  one step later at the handoff even if removed — REDUNDANT. The UNIQUE contribution of
 *  WF-005 is the two PER-ITEM content checks (`everyItemHasStrings`): the schema types the
 *  item fields as `string` but cannot demand they be NON-EMPTY, so a list of hollow items
 *  ({title:"",impact:""}) passes the schema and only the criterion catches it. Plus the
 *  usual non-empty-string check (`red-synthesis`). Measured by REMOVAL.
 *    · UNIQUE     → removal lets the bad output through (`completed`): the sole gate.
 *    · REDUNDANT  → removal still `failed`, at the handoff (schema) or via a sibling.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FINDINGS RECORDED FOR A LATER LOT (not fixed here) — measured against card v1.1 at
 * the pinned tag v4.4.0:
 *  F1 — partial content-blindness. The per-item checks verify NON-EMPTINESS, not domain:
 *       `veille-highlights-ranked` accepts any non-empty `impact` string ("banana"), not
 *       just High/Medium/Low; the `nonEmptyArray` floors and `Array.isArray` advisories
 *       verify presence, not content. Same shape family as WF-003/004 F1.
 *  F2 — REDUNDANT-with-schema (4 criteria): `veille-highlights-floor`,
 *       `veille-weak-signals`, `growth-topics-floor`, `red-linkedin-floor` — the output
 *       schema declares the array `min` they check, enforced at the handoff.
 *  F3 — POSITIVE CONTRAST with WF-004 F3, not a defect. This spine's author FIXED the
 *       WF-004 problem: the schema pins `min` to the relaxed FLOOR (highlights min 3,
 *       weakSignals/topics/linkedinPosts min 1), NOT to the advisory ideal, and drops
 *       `maxItems` entirely — so a modest-but-valid run (≤ 4 highlights, a 4th topic/post)
 *       is NOT hard-failed at the strict handoff, and the ideal (Top 5, 1-3 range) stays
 *       advisory-only as intended. The floor criteria remain redundant with the floor-level
 *       schema min (F2), which is the correct, harmless kind of redundancy.
 *  F4 — DoD coverage gaps (card lines with no blocking criterion): STEP-01 "qualified
 *       engagement opportunities" and the 1-2 tools (advisory); STEP-02 hashtags/timing
 *       (advisory); STEP-03 internal note (optional) and quote of the week (advisory).
 *       Each defensible today; triage à la carte with the WF-001–004 findings.
 * ─────────────────────────────────────────────────────────────────────────────
 */

type Outputs = Record<string, unknown>;
const H = wf005HappyOutputs;

/** stepId of each criterion, derived from the manifest (no hand-kept map). */
const STEP_OF: Record<string, string> = Object.fromEntries(
  WF_005_VEILLE_MANIFEST.steps.flatMap((s) => s.criteriaIds.map((id) => [id, s.stepId])),
);
const BLOCKING = WF_005_VEILLE_CRITERIA.filter((c) => c.severity === "blocking");
const criterion = (id: string): Criterion =>
  WF_005_VEILLE_CRITERIA.find((c) => c.id === id) ?? (() => { throw new Error(`no criterion ${id}`); })();

/** Full outputs map with one step replaced by a shallow patch of the happy step. */
function withStep(step: string, patch: Record<string, unknown>): Outputs {
  return { ...H, [step]: { ...(H[step] as object), ...patch } };
}

type Rec = Record<string, unknown>;
const HL = (H["STEP-01"] as { highlights: Rec[] }).highlights;
const TP = (H["STEP-02"] as { topics: Rec[] }).topics;
// 3 valid highlights (satisfy floor + schema min 3) but one hollow field — schema-blind.
const hlEmptyTitle = [{ ...HL[0], title: "" }, HL[1], HL[2]];
const hlEmptyImpact = [{ ...HL[0], impact: "" }, HL[1], HL[2]];
const hlTwo = HL.slice(0, 2); // below floor 3 AND schema min 3 — schema-caught.
const tpEmptyFormat = [{ ...TP[0], format: "" }];
const tpEmptyAngle = [{ ...TP[0], angle: "" }];

/**
 * The audit table — one entry per BLOCKING criterion. `witnesses` falsifies each
 * independent clause (first witness = the representative used for the removal test,
 * chosen SCHEMA-BLIND for a UNIQUE hypothesis, SCHEMA-CAUGHT for a REDUNDANT one);
 * `klass` is the load-bearing hypothesis the removal test then MEASURES and locks.
 */
interface Entry {
  id: string;
  klass: "unique" | "redundant";
  witnesses: Array<{ clause: string; bad: Outputs }>;
}
const AUDIT: Entry[] = [
  // STEP-01 — VEILLE-STRATEGIQUE
  { id: "veille-highlights-floor", klass: "redundant", witnesses: [{ clause: "highlights:2 (below floor 3 AND schema min 3)", bad: withStep("STEP-01", { highlights: hlTwo }) }] },
  {
    id: "veille-highlights-ranked", klass: "unique",
    witnesses: [
      { clause: "a highlight with title:'' (schema types it string, not non-empty)", bad: withStep("STEP-01", { highlights: hlEmptyTitle }) },
      { clause: "a highlight with impact:''", bad: withStep("STEP-01", { highlights: hlEmptyImpact }) },
    ],
  },
  { id: "veille-weak-signals", klass: "redundant", witnesses: [{ clause: "weakSignals:[] (below min 1)", bad: withStep("STEP-01", { weakSignals: [] }) }] },
  // STEP-02 — GROWTH-IA
  { id: "growth-topics-floor", klass: "redundant", witnesses: [{ clause: "topics:[] (below min 1)", bad: withStep("STEP-02", { topics: [] }) }] },
  {
    id: "growth-topics-actionable", klass: "unique",
    witnesses: [
      { clause: "a topic with format:'' (schema types it string, not non-empty)", bad: withStep("STEP-02", { topics: tpEmptyFormat }) },
      { clause: "a topic with angle:''", bad: withStep("STEP-02", { topics: tpEmptyAngle }) },
    ],
  },
  // STEP-03 — REDACTEUR-IA
  { id: "red-synthesis", klass: "unique", witnesses: [{ clause: "synthesis:''", bad: withStep("STEP-03", { synthesis: "" }) }] },
  { id: "red-linkedin-floor", klass: "redundant", witnesses: [{ clause: "linkedinPosts:[] (below min 1)", bad: withStep("STEP-03", { linkedinPosts: [] }) }] },
];

// --- Removal machinery: rebuild the spine WITHOUT one criterion -------------
function runSpineWithout(dropId: string | null, outputs: Outputs) {
  const registry = dropId
    ? new CriterionRegistry().registerAll(WF_005_VEILLE_CRITERIA.filter((c) => c.id !== dropId))
    : buildWf005VeilleRegistry();
  const manifest = dropId
    ? { ...WF_005_VEILLE_MANIFEST, steps: WF_005_VEILLE_MANIFEST.steps.map((s) => ({ ...s, criteriaIds: s.criteriaIds.filter((id) => id !== dropId) })) }
    : WF_005_VEILLE_MANIFEST;
  const steps = loadSpine(manifest, sidecar, registry, resolveAgent);
  return runSpine(steps, mockRunner(outputs), {});
}

// ============================================================================
// AXIS 1 — no dead sub-clause; positive pole anchored on a real agent output
// ============================================================================
describe("WF-005 discrimination — positive pole (real agent output)", () => {
  it("the committed WF-005 live trace passes every blocking criterion", () => {
    const traces = (realTrace as { status: string; traces: Array<{ stepId: string; output: unknown }> }).traces;
    expect(realTrace.status).toBe("completed"); // guards against a swapped/failed trace
    for (const tr of traces) {
      const crit = BLOCKING.filter((c) => STEP_OF[c.id] === tr.stepId);
      const report = runEvalGate(tr.stepId, crit, tr.output);
      expect(report.verdict, `${tr.stepId} on real output`).toBe("pass");
    }
  });
});

describe("WF-005 discrimination — no dead sub-clause (falsify each clause)", () => {
  it("every blocking criterion is satisfied by the DoD-happy output (nothing stuck-false)", () => {
    for (const c of BLOCKING) {
      expect(c.check(H[STEP_OF[c.id]!]), c.id).toBe(true);
    }
  });

  const witnesses = AUDIT.flatMap((e) => e.witnesses.map((w) => ({ id: e.id, clause: w.clause, bad: w.bad })));
  it.each(witnesses)("$id reddens on clause $clause", ({ id, clause, bad }) => {
    const step = STEP_OF[id]!;
    const report = runEvalGate(step, [criterion(id)], bad[step]);
    expect(report.results[0]!.passed, `${id} / ${clause} should FAIL`).toBe(false);
  });
});

// ============================================================================
// AXIS 2 — load-bearing vs runtime-redundant, measured by removal
// ============================================================================
describe("WF-005 discrimination — load-bearing classification (removal)", () => {
  it("UNIQUE criteria: removing one lets the bad output through — a real hole", async () => {
    for (const e of AUDIT.filter((x) => x.klass === "unique")) {
      const res = await runSpineWithout(e.id, e.witnesses[0]!.bad);
      expect(res.status, `${e.id}: removal must open a hole (completed)`).toBe("completed");
    }
  });

  it("REDUNDANT criteria: removing one still fails — schema or a sibling catches it", async () => {
    for (const e of AUDIT.filter((x) => x.klass === "redundant")) {
      const res = await runSpineWithout(e.id, e.witnesses[0]!.bad);
      expect(res.status, `${e.id}: removal must still fail`).toBe("failed");
    }
  });

  it("renders the discrimination matrix", async () => {
    const lines: string[] = [
      "# WF-005 eval-gate discrimination matrix",
      "",
      "Generated by `test/spine-wf-005-discrimination.test.ts`. Read the file header for method",
      "and the findings F1–F4. This is a MEASURED record, not a fix: it records which blocking",
      "criteria are the sole runtime gate (UNIQUE) and which merely double the manifest output",
      "schema enforced at the handoff, or a sibling criterion (REDUNDANT).",
      "",
      "Runtime order (run-spine.ts): runner → **eval gate (criteria)** → **handoff (schema)**.",
      "A criterion is REDUNDANT when, removed, the same bad output is still caught — one step",
      "later, with a different failure `kind`.",
      "",
      "## Load-bearing classification (measured by removal)",
      "",
      "| Blocking criterion | Class | Removed → | Caught by |",
      "|---|---|---|---|",
    ];
    for (const e of AUDIT) {
      const res = await runSpineWithout(e.id, e.witnesses[0]!.bad);
      const caughtBy =
        res.status === "completed" ? "— (nothing: real hole)"
          : res.failure?.kind === "handoff" ? "handoff (output schema)"
            : `eval-gate (sibling)`;
      lines.push(`| \`${e.id}\` | ${e.klass.toUpperCase()} | ${res.status} | ${caughtBy} |`);
    }
    lines.push(
      "",
      "## Sub-clause falsification (Axis 1 — no `/.+/`)",
      "",
      "Each clause below, mutated alone on the DoD-happy output, reddens its criterion.",
      "",
      "| Criterion | Clause | Reddens |",
      "|---|---|---|",
    );
    for (const e of AUDIT) {
      for (const w of e.witnesses) {
        const step = STEP_OF[e.id]!;
        const passed = runEvalGate(step, [criterion(e.id)], w.bad[step]).results[0]!.passed;
        lines.push(`| \`${e.id}\` | ${w.clause} | ${passed ? "no ⚠️" : "yes"} |`);
      }
    }
    const uniq = AUDIT.filter((e) => e.klass === "unique").length;
    lines.push(
      "",
      `**${uniq} of ${AUDIT.length} blocking criteria are UNIQUE (sole gate); ${AUDIT.length - uniq} are REDUNDANT.**`,
      "",
    );
    await expect(lines.join("\n")).toMatchFileSnapshot("./__snapshots__/spine-wf-005-discrimination.md");
  });
});

// ============================================================================
// COVERAGE GUARD — a new blocking criterion added without a witness fails here
// ============================================================================
describe("WF-005 discrimination — coverage guard", () => {
  it("every blocking criterion of the spine is exercised by the audit table", () => {
    const audited = new Set(AUDIT.map((e) => e.id));
    const blocking = new Set(BLOCKING.map((c) => c.id));
    expect([...blocking].filter((id) => !audited.has(id)), "unaudited blocking criteria").toEqual([]);
    expect([...audited].filter((id) => !blocking.has(id)), "audited ids that are not blocking criteria").toEqual([]);
  });
});
