import { describe, it, expect } from "vitest";
import { loadSpine } from "../src/manifest/load-manifest.js";
import { runSpine } from "../src/orchestrator/run-spine.js";
import { runEvalGate } from "../src/eval/eval-gate.js";
import { CriterionRegistry } from "../src/eval/criteria-registry.js";
import type { Criterion } from "../src/eval/types.js";
import {
  WF_010_POST_MORTEM_MANIFEST,
  WF_010_POST_MORTEM_CRITERIA,
  buildWf010PostMortemRegistry,
} from "../src/spines/wf-010-post-mortem.js";
import {
  wf010InterimSidecar as sidecar,
  wf010ResolveAgent as resolveAgent,
  mockRunner,
} from "./fixtures/wf-010-spine.js";
import { wf010HappyOutputs } from "./fixtures/wf-010-outputs.js";
import realTrace from "../docs/audit/live-runs/wf-010-live-result.json" with { type: "json" };

/**
 * WF-010 DISCRIMINATION AUDIT — TENTH and LAST spine of the eval-gate battery, completing
 * ÉTAPE ①. Same two axes; the schema/criterion split is RE-MEASURED, never assumed — the
 * full series: WF-001 = 6/9 redundant, WF-002 = 6/10 (4 unique), WF-003 = 6/18 (12 unique),
 * WF-004 = 9/15 (6 unique), WF-005 = 4/7 (3 unique), WF-006 = 8/16 (8 unique), WF-007 = 5/10
 * (5 unique), WF-008 = 8/22 (14 unique), WF-009 = 7/16 (9 unique), WF-010 (10 blocking) is
 * measured at 5 UNIQUE / 5 REDUNDANT below.
 *
 * ⛔ THIS FILE FIXES NOTHING, by design (denial-probe precedent). It MEASURES and GUARDS;
 * every finding below is recorded for a later, separate lot.
 *
 * WF-010 is a plain linear spine (no gateway, no hardened gate): the UNIQUE contribution is
 * the non-empty STRING checks the schema types as `string` but cannot demand non-empty
 * (`qa-quality-review`, `cm-team-review`, and the three STEP-06 deliverables); the five
 * array floors are REDUNDANT with the schema `min 1`.
 *
 * POSITIVE POLE — the committed `wf-010-live-result.json` is a completed run whose 4 backbone
 * traces (STEP-01/02/03/06) cover all 10 blocking criteria: every one passes on the real
 * per-step outputs (anti-circularity — a source that knows nothing about the policies).
 *
 * AXIS 1 — no dead sub-clause (each blocking criterion falsified on its clause).
 * AXIS 2 — load-bearing vs runtime-redundant, measured by REMOVAL (runner → eval gate → ajv
 * strict handoff on `producer.output`): a criterion whose clause the schema ALSO enforces
 * (array `min 1`) is REDUNDANT; the non-empty strings are UNIQUE.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FINDINGS RECORDED FOR A LATER LOT (not fixed here) — measured against card v1.0 at
 * the pinned tag v4.4.0:
 *  F1 — content-blindness (the `nonEmptyString`/`nonEmptyArray` checks verify presence, not
 *       that the report content matches the DoD — `red-report` accepts any non-empty string,
 *       not a 10-20 page lessons-learned report). Same family as WF-003–009 F1.
 *  F2 — REDUNDANT-with-schema (5 criteria): `cp-timeline`, `cp-gaps`, `cp-root-causes`,
 *       `cp-improvement-plan`, `cm-hr-recommendations` — the output schema declares the array
 *       `min 1` they check, enforced at the handoff.
 *  F3 — POSITIVE (no defect). This spine applies the WF-005 live-run hardening: the schema
 *       `minItems` is pinned to the relaxed FLOOR (all min 1), NO `maxItems`, no `minItems`
 *       on optional fields, so the ideal counts (5 Whys × 3, 5-10 actions, top 5) stay
 *       advisory-only. It does NOT repeat the WF-004/006/009 F3 defect.
 *  F4 — DoD coverage gaps (card lines with no blocking criterion): STEP-01 what worked well;
 *       STEP-02 test coverage / top bugs / tech debt / QA recommendations; STEP-03 adoption /
 *       friction; STEP-06 best practices / pitfalls. Each defensible today; triage à la carte
 *       with the WF-001–009 findings — ÉTAPE ① now complete, the à-la-carte lot is eligible.
 * ─────────────────────────────────────────────────────────────────────────────
 */

type Outputs = Record<string, unknown>;
const H = wf010HappyOutputs;

/** stepId of each criterion, derived from the manifest (no hand-kept map). */
const STEP_OF: Record<string, string> = Object.fromEntries(
  WF_010_POST_MORTEM_MANIFEST.steps.flatMap((s) => s.criteriaIds.map((id) => [id, s.stepId])),
);
const BLOCKING = WF_010_POST_MORTEM_CRITERIA.filter((c) => c.severity === "blocking");
const criterion = (id: string): Criterion =>
  WF_010_POST_MORTEM_CRITERIA.find((c) => c.id === id) ?? (() => { throw new Error(`no criterion ${id}`); })();

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
  // STEP-01 — CHEF-PROJET-IA
  { id: "cp-timeline", klass: "redundant", witnesses: [{ clause: "timeline:[] (below min 1)", bad: withStep("STEP-01", { timeline: [] }) }] },
  { id: "cp-gaps", klass: "redundant", witnesses: [{ clause: "gaps:[] (below min 1)", bad: withStep("STEP-01", { gaps: [] }) }] },
  { id: "cp-root-causes", klass: "redundant", witnesses: [{ clause: "rootCauses:[] (below min 1)", bad: withStep("STEP-01", { rootCauses: [] }) }] },
  { id: "cp-improvement-plan", klass: "redundant", witnesses: [{ clause: "improvementPlan:[] (below min 1)", bad: withStep("STEP-01", { improvementPlan: [] }) }] },
  // STEP-02 — QA-AGILE
  { id: "qa-quality-review", klass: "unique", witnesses: [{ clause: "qualityReview:''", bad: withStep("STEP-02", { qualityReview: "" }) }] },
  // STEP-03 — CHANGE-MANAGER
  { id: "cm-team-review", klass: "unique", witnesses: [{ clause: "teamReview:''", bad: withStep("STEP-03", { teamReview: "" }) }] },
  { id: "cm-hr-recommendations", klass: "redundant", witnesses: [{ clause: "hrRecommendations:[] (below min 1)", bad: withStep("STEP-03", { hrRecommendations: [] }) }] },
  // STEP-06 — REDACTEUR-IA
  { id: "red-report", klass: "unique", witnesses: [{ clause: "lessonsReport:''", bad: withStep("STEP-06", { lessonsReport: "" }) }] },
  { id: "red-exec-summary", klass: "unique", witnesses: [{ clause: "execSummary:''", bad: withStep("STEP-06", { execSummary: "" }) }] },
  { id: "red-capitalization", klass: "unique", witnesses: [{ clause: "capitalizationMemo:''", bad: withStep("STEP-06", { capitalizationMemo: "" }) }] },
];

// --- Removal machinery: rebuild the spine WITHOUT one criterion -------------
function runSpineWithout(dropId: string | null, outputs: Outputs) {
  const registry = dropId
    ? new CriterionRegistry().registerAll(WF_010_POST_MORTEM_CRITERIA.filter((c) => c.id !== dropId))
    : buildWf010PostMortemRegistry();
  const manifest = dropId
    ? { ...WF_010_POST_MORTEM_MANIFEST, steps: WF_010_POST_MORTEM_MANIFEST.steps.map((s) => ({ ...s, criteriaIds: s.criteriaIds.filter((id) => id !== dropId) })) }
    : WF_010_POST_MORTEM_MANIFEST;
  const steps = loadSpine(manifest, sidecar, registry, resolveAgent);
  return runSpine(steps, mockRunner(outputs), {});
}

// ============================================================================
// AXIS 1 — no dead sub-clause; positive pole anchored on a real agent output
// ============================================================================
describe("WF-010 discrimination — positive pole (real agent output)", () => {
  it("the committed WF-010 live trace passes every blocking criterion", () => {
    const traces = (realTrace as { status: string; traces: Array<{ stepId: string; output: unknown }> }).traces;
    expect(realTrace.status).toBe("completed"); // guards against a swapped/failed trace
    for (const tr of traces) {
      const crit = BLOCKING.filter((c) => STEP_OF[c.id] === tr.stepId);
      const report = runEvalGate(tr.stepId, crit, tr.output);
      expect(report.verdict, `${tr.stepId} on real output`).toBe("pass");
    }
  });
});

describe("WF-010 discrimination — no dead sub-clause (falsify each clause)", () => {
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
describe("WF-010 discrimination — load-bearing classification (removal)", () => {
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
      "# WF-010 eval-gate discrimination matrix",
      "",
      "Generated by `test/spine-wf-010-discrimination.test.ts`. Read the file header for method",
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
    await expect(lines.join("\n")).toMatchFileSnapshot("./__snapshots__/spine-wf-010-discrimination.md");
  });
});

// ============================================================================
// COVERAGE GUARD — a new blocking criterion added without a witness fails here
// ============================================================================
describe("WF-010 discrimination — coverage guard", () => {
  it("every blocking criterion of the spine is exercised by the audit table", () => {
    const audited = new Set(AUDIT.map((e) => e.id));
    const blocking = new Set(BLOCKING.map((c) => c.id));
    expect([...blocking].filter((id) => !audited.has(id)), "unaudited blocking criteria").toEqual([]);
    expect([...audited].filter((id) => !blocking.has(id)), "audited ids that are not blocking criteria").toEqual([]);
  });
});
