import { describe, it, expect } from "vitest";
import { loadSpine } from "../src/manifest/load-manifest.js";
import { runSpine } from "../src/orchestrator/run-spine.js";
import { runEvalGate } from "../src/eval/eval-gate.js";
import { CriterionRegistry } from "../src/eval/criteria-registry.js";
import type { Criterion } from "../src/eval/types.js";
import {
  WF_002_DELIVERY_MANIFEST,
  WF_002_DELIVERY_CRITERIA,
  buildWf002DeliveryRegistry,
} from "../src/spines/wf-002-delivery.js";
import {
  wf002InterimSidecar as sidecar,
  wf002ResolveAgent as resolveAgent,
  mockRunner,
} from "./fixtures/wf-002-spine.js";
import { wf002HappyOutputs } from "./fixtures/wf-002-outputs.js";
import realTrace from "../docs/audit/live-runs/wf-002-live-result.json" with { type: "json" };

/**
 * WF-002 DISCRIMINATION AUDIT — second spine of the eval-gate battery, following
 * the WF-001 prototype (`spine-wf-001-discrimination.test.ts`). Same two axes; the
 * schema/criterion split is RE-MEASURED here, never assumed from WF-001.
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
 *  clauses (emptiness, each count bound, each conjunct). Positive pole is anchored
 *  NOT on a hand-built fixture but on the committed REAL agent output of the WF-002
 *  billed run — a source that knows nothing about the policies it confirms (the
 *  WF-005 circular-positive-control lesson).
 *
 *  AXIS 2 — LOAD-BEARING vs RUNTIME-REDUNDANT (the finding the naive battery hides).
 *  Runtime order in run-spine.ts is: runner → eval gate (criteria, on RAW output) →
 *  handoff (validateHandoff, which validates `producer.output` at EVERY step, terminal
 *  included via `terminalSink`, with ajv2020 strict — verified at source 2026-08-20).
 *  So a criterion whose clause the schema ALSO enforces (count bounds, field types,
 *  required-key presence) is caught one step later at the handoff even if removed — it
 *  is redundant, not the sole gate. Measured by REMOVAL: drop the criterion, replay the
 *  whole spine on a bad output, observe whether it still fails and WHERE.
 *    · UNIQUE     → removal lets the bad output through (`completed`): the criterion
 *                   is the only gate. These are the emptiness/threshold checks JSON
 *                   Schema cannot express — the gate's real contribution over brick 1.
 *    · REDUNDANT  → removal still `failed`, at the handoff (schema) or via a sibling.
 *                   Belt-and-suspenders, not a hole. Whether to keep the redundancy is
 *                   a design call (defense-in-depth vs DRY) for the PO.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FINDINGS RECORDED FOR A LATER LOT (not fixed here):
 *  F1 — `cp-dashboard-avancement-risques` is content-blind: it tests `!== undefined`,
 *       so `avancement: ""` (empty string) and `risques: []` pass BOTH the criterion
 *       AND the schema (`type:string` / `type:array` accept the empty value). Exact
 *       shape of the WF-001 F3 `priorite` hole closed by ADR-0010 — RECORDED here,
 *       not widened. A later lot may tighten to nonEmptyString / nonEmptyArray.
 *  F2 — REDUNDANT-with-schema (5 criteria): `pm-features-wsjf-1-10`,
 *       `rte-program-board-non-vide`, `posafe-pi-objectives-3-5`,
 *       `posafe-backlog-sprint-5-10`, `sm-sprint-plan-forecast`. The manifest output
 *       already declares the bounds / types they check, enforced at the handoff.
 *  F3 — Advisory near-vacuous (out of the hard table): `rte-roam-risks-present` and
 *       `sm-impediments-listes` are `Array.isArray(...)` — they pass on `[]` (the
 *       hermetic happy fixture even sets `impediments: []`); `posafe-wsjf-par-feature`
 *       passes on an empty backlog. Advisory by design, presence-not-content.
 * ─────────────────────────────────────────────────────────────────────────────
 */

type Outputs = Record<string, unknown>;
const H = wf002HappyOutputs;
const happyFeatures = (H["STEP-01"] as { featuresWsjf: unknown[] }).featuresWsjf;
const happyBacklog = (H["STEP-03"] as { backlogSprint: unknown[] }).backlogSprint;
const goodUS = happyBacklog[0];

/** stepId of each criterion, derived from the manifest (no hand-kept map). */
const STEP_OF: Record<string, string> = Object.fromEntries(
  WF_002_DELIVERY_MANIFEST.steps.flatMap((s) => s.criteriaIds.map((id) => [id, s.stepId])),
);
const BLOCKING = WF_002_DELIVERY_CRITERIA.filter((c) => c.severity === "blocking");
const criterion = (id: string): Criterion =>
  WF_002_DELIVERY_CRITERIA.find((c) => c.id === id) ?? (() => { throw new Error(`no criterion ${id}`); })();

/** Full outputs map with one step replaced by a shallow patch of the happy step. */
function withStep(step: string, patch: Record<string, unknown>): Outputs {
  return { ...H, [step]: { ...(H[step] as object), ...patch } };
}

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
  // STEP-01
  { id: "pm-vision-board-present", klass: "unique", witnesses: [{ clause: "visionBoard:''", bad: withStep("STEP-01", { visionBoard: "" }) }] },
  {
    id: "pm-features-wsjf-1-10", klass: "redundant",
    witnesses: [
      { clause: "featuresWsjf:[] (below min 1)", bad: withStep("STEP-01", { featuresWsjf: [] }) },
      { clause: "featuresWsjf:11 (above max)", bad: withStep("STEP-01", { featuresWsjf: Array.from({ length: 11 }, () => ({ feature: "F", wsjf: 1 })) }) },
      { clause: "item without wsjf:number", bad: withStep("STEP-01", { featuresWsjf: [{ feature: "F" }] }) },
    ],
  },
  // STEP-02
  { id: "rte-program-board-non-vide", klass: "redundant", witnesses: [{ clause: "programBoard:[]", bad: withStep("STEP-02", { programBoard: [] }) }] },
  {
    id: "rte-vote-confiance-seuil", klass: "unique",
    witnesses: [
      { clause: "voteConfiance:3.4 (number, below 3.5)", bad: withStep("STEP-02", { voteConfiance: 3.4 }) },
      { clause: "voteConfiance:'4' (non-number)", bad: withStep("STEP-02", { voteConfiance: "4" }) },
    ],
  },
  // STEP-03
  {
    id: "posafe-pi-objectives-3-5", klass: "redundant",
    witnesses: [
      { clause: "piObjectives:2 (below)", bad: withStep("STEP-03", { piObjectives: ["O1", "O2"] }) },
      { clause: "piObjectives:6 (above)", bad: withStep("STEP-03", { piObjectives: ["O1", "O2", "O3", "O4", "O5", "O6"] }) },
    ],
  },
  {
    id: "posafe-backlog-sprint-5-10", klass: "redundant",
    witnesses: [
      { clause: "backlogSprint:4 (below)", bad: withStep("STEP-03", { backlogSprint: happyBacklog.slice(0, 4) }) },
      { clause: "backlogSprint:11 (above)", bad: withStep("STEP-03", { backlogSprint: Array.from({ length: 11 }, () => goodUS) }) },
    ],
  },
  // STEP-04
  { id: "sm-sprint-goal-unique", klass: "unique", witnesses: [{ clause: "sprintGoal:''", bad: withStep("STEP-04", { sprintGoal: "" }) }] },
  {
    id: "sm-sprint-plan-forecast", klass: "redundant",
    witnesses: [
      { clause: "sprintPlan.usEngagees:[]", bad: withStep("STEP-04", { sprintPlan: { usEngagees: [], storyPoints: 21 } }) },
      { clause: "sprintPlan.storyPoints:'21' (non-number)", bad: withStep("STEP-04", { sprintPlan: { usEngagees: ["US1"], storyPoints: "21" } }) },
    ],
  },
  // STEP-06
  { id: "cp-note-codir-presente", klass: "unique", witnesses: [{ clause: "noteCodir:''", bad: withStep("STEP-06", { noteCodir: "" }) }] },
  {
    id: "cp-dashboard-avancement-risques", klass: "redundant",
    witnesses: [
      { clause: "dashboard.avancement:undefined", bad: withStep("STEP-06", { dashboard: { risques: ["r"] } }) },
      { clause: "dashboard.risques:undefined", bad: withStep("STEP-06", { dashboard: { avancement: "32%" } }) },
    ],
  },
];

// --- Removal machinery: rebuild the spine WITHOUT one criterion -------------
function runSpineWithout(dropId: string | null, outputs: Outputs) {
  const registry = dropId
    ? new CriterionRegistry().registerAll(WF_002_DELIVERY_CRITERIA.filter((c) => c.id !== dropId))
    : buildWf002DeliveryRegistry();
  const manifest = dropId
    ? { ...WF_002_DELIVERY_MANIFEST, steps: WF_002_DELIVERY_MANIFEST.steps.map((s) => ({ ...s, criteriaIds: s.criteriaIds.filter((id) => id !== dropId) })) }
    : WF_002_DELIVERY_MANIFEST;
  const steps = loadSpine(manifest, sidecar, registry, resolveAgent);
  return runSpine(steps, mockRunner(outputs), {});
}

// ============================================================================
// AXIS 1 — no dead sub-clause; positive pole anchored on a real agent output
// ============================================================================
describe("WF-002 discrimination — positive pole (real agent output)", () => {
  it("the committed WF-002 live trace passes every blocking criterion", () => {
    const traces = (realTrace as { status: string; traces: Array<{ stepId: string; output: unknown }> }).traces;
    expect(realTrace.status).toBe("completed"); // guards against a swapped/failed trace
    for (const tr of traces) {
      const crit = BLOCKING.filter((c) => STEP_OF[c.id] === tr.stepId);
      const report = runEvalGate(tr.stepId, crit, tr.output);
      expect(report.verdict, `${tr.stepId} on real output`).toBe("pass");
    }
  });
});

describe("WF-002 discrimination — no dead sub-clause (falsify each clause)", () => {
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
describe("WF-002 discrimination — load-bearing classification (removal)", () => {
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
      "# WF-002 eval-gate discrimination matrix",
      "",
      "Generated by `test/spine-wf-002-discrimination.test.ts`. Read the file header for method",
      "and the findings F1–F3. This is a MEASURED record, not a fix: it records which blocking",
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
    await expect(lines.join("\n")).toMatchFileSnapshot("./__snapshots__/spine-wf-002-discrimination.md");
  });
});

// ============================================================================
// COVERAGE GUARD — a new blocking criterion added without a witness fails here
// ============================================================================
describe("WF-002 discrimination — coverage guard", () => {
  it("every blocking criterion of the spine is exercised by the audit table", () => {
    const audited = new Set(AUDIT.map((e) => e.id));
    const blocking = new Set(BLOCKING.map((c) => c.id));
    expect([...blocking].filter((id) => !audited.has(id)), "unaudited blocking criteria").toEqual([]);
    expect([...audited].filter((id) => !blocking.has(id)), "audited ids that are not blocking criteria").toEqual([]);
  });
});
