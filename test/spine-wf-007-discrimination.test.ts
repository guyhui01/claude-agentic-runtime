import { describe, it, expect } from "vitest";
import { loadSpine } from "../src/manifest/load-manifest.js";
import { runSpine } from "../src/orchestrator/run-spine.js";
import { runEvalGate } from "../src/eval/eval-gate.js";
import { CriterionRegistry } from "../src/eval/criteria-registry.js";
import type { Criterion } from "../src/eval/types.js";
import {
  WF_007_ONBOARDING_MANIFEST,
  WF_007_ONBOARDING_CRITERIA,
  buildWf007OnboardingRegistry,
} from "../src/spines/wf-007-onboarding.js";
import {
  wf007InterimSidecar as sidecar,
  wf007ResolveAgent as resolveAgent,
  mockRunner,
} from "./fixtures/wf-007-spine.js";
import { wf007HappyOutputs } from "./fixtures/wf-007-outputs.js";
import realTrace from "../docs/audit/live-runs/wf-007-live-result.json" with { type: "json" };

/**
 * WF-007 DISCRIMINATION AUDIT — seventh spine of the eval-gate battery, following
 * WF-001 to WF-006. Same two axes; the schema/criterion split is RE-MEASURED, never
 * assumed — and it moves again: WF-001 = 6/9 redundant, WF-002 = 6/10 (4 unique),
 * WF-003 = 6/18 (12 unique), WF-004 = 9/15 (6 unique), WF-005 = 4/7 (3 unique),
 * WF-006 = 8/16 (8 unique), WF-007 (10 blocking) is measured at 5 UNIQUE / 5 REDUNDANT.
 *
 * ⛔ THIS FILE FIXES NOTHING, by design (denial-probe precedent). It MEASURES and
 * GUARDS; every finding below is recorded for a later, separate lot. Widening a
 * criterion in the same motion as building the instrument is the move that failed
 * twice on 2026-08-02 on the dispatch side.
 *
 * It measures TWO axes a naive "every check goes green" battery hides:
 *
 *  AXIS 1 — NO DEAD SUB-CLAUSE. A criterion that cannot fail is a `/.+/`. Each blocking
 *  criterion is falsified on its clause. Positive pole anchored NOT on a hand-built
 *  fixture but on the committed REAL agent output of the WF-007 billed run.
 *
 *  AXIS 2 — LOAD-BEARING vs RUNTIME-REDUNDANT. Runtime order (run-spine.ts): runner →
 *  eval gate (criteria, RAW output) → handoff (validateHandoff, ajv2020 strict, on
 *  `producer.output` at EVERY step). A criterion whose clause the schema ALSO enforces
 *  (array `min`) is caught one step later at the handoff even if removed — REDUNDANT. The
 *  UNIQUE contribution here is the non-empty STRING checks the schema types as `string`
 *  but cannot demand non-empty: `ba-client-context` and the four STEP-05 deliverables.
 *  Measured by REMOVAL.
 *    · UNIQUE     → removal lets the bad output through (`completed`): the sole gate.
 *    · REDUNDANT  → removal still `failed`, at the handoff (schema) or via a sibling.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FINDINGS RECORDED FOR A LATER LOT (not fixed here) — measured against card v1.0 at
 * the pinned tag v4.3.0:
 *  F1 — content-blindness. The `nonEmptyArray` / `nonEmptyString` blocking checks verify
 *       presence, not that the content matches the DoD (e.g. `red-d1-kit` accepts any
 *       non-empty string, not a real kit with plan + sheet + questions). Same family as
 *       WF-003–006 F1.
 *  F2 — REDUNDANT-with-schema (5 criteria): `cp-kickoff-plan`, `cp-raci`, `ba-is-mapping`,
 *       `cm-stakeholder-map`, `cm-engagement-plan` — the output schema declares the array
 *       `min` they check, enforced at the handoff.
 *  F3 — POSITIVE (no defect). This spine applies the WF-005 live-run hardening: the schema
 *       `minItems` is pinned to the relaxed FLOOR (kickoffPlan/raci/isMapping/etc. min 1),
 *       with NO `maxItems` and no `minItems` on optional fields, so the ideal counts stay
 *       advisory-only and a modest-but-valid run is not hard-failed. It does NOT repeat the
 *       WF-004/006 F3 defect.
 *  F4 — DoD coverage gaps (card output_attendu lines with no blocking criterion): STEP-01
 *       logistics checklist, D1 questions, kickoff risks (advisory); STEP-02 org chart,
 *       glossary, grey areas (advisory); STEP-03 D1 posture, quick wins (advisory). Each
 *       defensible today; triage à la carte with the WF-001–006 findings.
 * ─────────────────────────────────────────────────────────────────────────────
 */

type Outputs = Record<string, unknown>;
const H = wf007HappyOutputs;

/** stepId of each criterion, derived from the manifest (no hand-kept map). */
const STEP_OF: Record<string, string> = Object.fromEntries(
  WF_007_ONBOARDING_MANIFEST.steps.flatMap((s) => s.criteriaIds.map((id) => [id, s.stepId])),
);
const BLOCKING = WF_007_ONBOARDING_CRITERIA.filter((c) => c.severity === "blocking");
const criterion = (id: string): Criterion =>
  WF_007_ONBOARDING_CRITERIA.find((c) => c.id === id) ?? (() => { throw new Error(`no criterion ${id}`); })();

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
  { id: "cp-kickoff-plan", klass: "redundant", witnesses: [{ clause: "kickoffPlan:[] (below min 1)", bad: withStep("STEP-01", { kickoffPlan: [] }) }] },
  { id: "cp-raci", klass: "redundant", witnesses: [{ clause: "raci:[] (below min 1)", bad: withStep("STEP-01", { raci: [] }) }] },
  // STEP-02 — BUSINESS-ANALYST
  { id: "ba-client-context", klass: "unique", witnesses: [{ clause: "clientContext:''", bad: withStep("STEP-02", { clientContext: "" }) }] },
  { id: "ba-is-mapping", klass: "redundant", witnesses: [{ clause: "isMapping:[] (below min 1)", bad: withStep("STEP-02", { isMapping: [] }) }] },
  // STEP-03 — CHANGE-MANAGER
  { id: "cm-stakeholder-map", klass: "redundant", witnesses: [{ clause: "stakeholderMap:[] (below min 1)", bad: withStep("STEP-03", { stakeholderMap: [] }) }] },
  { id: "cm-engagement-plan", klass: "redundant", witnesses: [{ clause: "engagementPlan:[] (below min 1)", bad: withStep("STEP-03", { engagementPlan: [] }) }] },
  // STEP-05 — REDACTEUR-IA
  { id: "red-d1-kit", klass: "unique", witnesses: [{ clause: "d1Kit:''", bad: withStep("STEP-05", { d1Kit: "" }) }] },
  { id: "red-intro-email", klass: "unique", witnesses: [{ clause: "introEmail:''", bad: withStep("STEP-05", { introEmail: "" }) }] },
  { id: "red-report-template", klass: "unique", witnesses: [{ clause: "d1ReportTemplate:''", bad: withStep("STEP-05", { d1ReportTemplate: "" }) }] },
  { id: "red-d5-scoping", klass: "unique", witnesses: [{ clause: "d5ScopingNote:''", bad: withStep("STEP-05", { d5ScopingNote: "" }) }] },
];

// --- Removal machinery: rebuild the spine WITHOUT one criterion -------------
function runSpineWithout(dropId: string | null, outputs: Outputs) {
  const registry = dropId
    ? new CriterionRegistry().registerAll(WF_007_ONBOARDING_CRITERIA.filter((c) => c.id !== dropId))
    : buildWf007OnboardingRegistry();
  const manifest = dropId
    ? { ...WF_007_ONBOARDING_MANIFEST, steps: WF_007_ONBOARDING_MANIFEST.steps.map((s) => ({ ...s, criteriaIds: s.criteriaIds.filter((id) => id !== dropId) })) }
    : WF_007_ONBOARDING_MANIFEST;
  const steps = loadSpine(manifest, sidecar, registry, resolveAgent);
  return runSpine(steps, mockRunner(outputs), {});
}

// ============================================================================
// AXIS 1 — no dead sub-clause; positive pole anchored on a real agent output
// ============================================================================
describe("WF-007 discrimination — positive pole (real agent output)", () => {
  it("the committed WF-007 live trace passes every blocking criterion", () => {
    const traces = (realTrace as { status: string; traces: Array<{ stepId: string; output: unknown }> }).traces;
    expect(realTrace.status).toBe("completed"); // guards against a swapped/failed trace
    for (const tr of traces) {
      const crit = BLOCKING.filter((c) => STEP_OF[c.id] === tr.stepId);
      const report = runEvalGate(tr.stepId, crit, tr.output);
      expect(report.verdict, `${tr.stepId} on real output`).toBe("pass");
    }
  });
});

describe("WF-007 discrimination — no dead sub-clause (falsify each clause)", () => {
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
describe("WF-007 discrimination — load-bearing classification (removal)", () => {
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
      "# WF-007 eval-gate discrimination matrix",
      "",
      "Generated by `test/spine-wf-007-discrimination.test.ts`. Read the file header for method",
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
    await expect(lines.join("\n")).toMatchFileSnapshot("./__snapshots__/spine-wf-007-discrimination.md");
  });
});

// ============================================================================
// COVERAGE GUARD — a new blocking criterion added without a witness fails here
// ============================================================================
describe("WF-007 discrimination — coverage guard", () => {
  it("every blocking criterion of the spine is exercised by the audit table", () => {
    const audited = new Set(AUDIT.map((e) => e.id));
    const blocking = new Set(BLOCKING.map((c) => c.id));
    expect([...blocking].filter((id) => !audited.has(id)), "unaudited blocking criteria").toEqual([]);
    expect([...audited].filter((id) => !blocking.has(id)), "audited ids that are not blocking criteria").toEqual([]);
  });
});
