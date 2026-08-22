import { describe, it, expect } from "vitest";
import { loadSpine } from "../src/manifest/load-manifest.js";
import { runSpine } from "../src/orchestrator/run-spine.js";
import { runEvalGate } from "../src/eval/eval-gate.js";
import { CriterionRegistry } from "../src/eval/criteria-registry.js";
import type { Criterion } from "../src/eval/types.js";
import {
  WF_004_CONSEIL_MANIFEST,
  WF_004_CONSEIL_CRITERIA,
  buildWf004ConseilRegistry,
} from "../src/spines/wf-004-conseil.js";
import {
  wf004InterimSidecar as sidecar,
  wf004ResolveAgent as resolveAgent,
  mockRunner,
} from "./fixtures/wf-004-spine.js";
import { wf004HappyOutputs } from "./fixtures/wf-004-outputs.js";
import realTrace from "../docs/audit/live-runs/wf-004-live-result.json" with { type: "json" };

/**
 * WF-004 DISCRIMINATION AUDIT — fourth spine of the eval-gate battery, following the
 * WF-001 prototype, WF-002 and WF-003. Same two axes; the schema/criterion split is
 * RE-MEASURED here, never assumed — and it moves again: WF-001 = 6/9 redundant,
 * WF-002 = 6/10 (4 unique), WF-003 = 6/18 redundant (12 unique), WF-004 (15 blocking)
 * is measured at 6 UNIQUE / 9 REDUNDANT below.
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
 *  clauses (emptiness, range below/above, non-number). Positive pole anchored NOT on
 *  a hand-built fixture but on the committed REAL agent output of the WF-004 billed
 *  run — a source that knows nothing about the policies it confirms (WF-005 lesson).
 *
 *  AXIS 2 — LOAD-BEARING vs RUNTIME-REDUNDANT (the finding the naive battery hides).
 *  Runtime order in run-spine.ts is: runner → eval gate (criteria, on RAW output) →
 *  handoff (validateHandoff, which validates `producer.output` at EVERY step, terminal
 *  included, with ajv2020 strict). A criterion whose clause the schema ALSO enforces
 *  (array min/max, all-keys-present objects, field types) is caught one step later at
 *  the handoff even if removed — REDUNDANT. The checks JSON Schema CANNOT express — a
 *  non-empty string, a numeric RANGE (maturity 1–10) — are UNIQUE. Measured by REMOVAL.
 *    · UNIQUE     → removal lets the bad output through (`completed`): the sole gate.
 *    · REDUNDANT  → removal still `failed`, at the handoff (schema) or via a sibling.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FINDINGS RECORDED FOR A LATER LOT (not fixed here) — measured against card v1.1 at
 * the pinned tag v4.4.0:
 *  F1 — content-blind checks. The `Array.isArray(...)` advisories (`cm-adoption-kpis`,
 *       `form-quick-wins`) pass on `[]`; the `nonEmptyArray` / `nonEmptyString` blocking
 *       checks verify presence, not that the content matches the DoD. Same shape as WF-003
 *       F1 / WF-002 F1.
 *  F2 — REDUNDANT-with-schema (9 criteria): `consultant-swot`, `consultant-usecases-floor`,
 *       `fa-business-cases`, `fa-prioritization`, `cdo-roadmap-horizons`, `cdo-okrs`,
 *       `cm-adkar`, `form-catalog`, `red-comex-deck`. The output schema declares the
 *       all-keys-present objects and the array bounds they check, enforced at the handoff.
 *  F3 — ✅ FIXED 2026-08-22. The "relaxed BLOCKING floor + ADVISORY at the exact spec" design
 *       was DEFEATED by the schema pinning `{ min: <ideal> }` (useCases 5, adkar 3, catalog 4,
 *       comexDeck 10), so the handoff hard-enforced the ideal and the relaxed floor could never
 *       fire. Now the schema `min` = the FLOOR (useCases 3, adkar/catalog/comexDeck 1) with NO
 *       `maxItems`, matching the WF-005/007/010 pattern: a modest-but-valid run passes the
 *       handoff and the ideal stays advisory (`consultant-usecases-top5`, `cm-adkar-populations`,
 *       `form-4-levels`, `red-deck-10-15`). The floor criteria remain REDUNDANT with the
 *       floor-level schema min (F2) — the correct, harmless kind of redundancy.
 *  F4 — DoD coverage gaps (card output_attendu lines with no criterion): STEP-01 maturity
 *       "per dimension" and the sector benchmark (conditional); STEP-03 target data
 *       architecture (conditional); STEP-04 AI champions network; STEP-07 technical
 *       appendices (conditional). Each defensible today; triage à la carte with the WF-001–
 *       003 findings.
 * ─────────────────────────────────────────────────────────────────────────────
 */

type Outputs = Record<string, unknown>;
const H = wf004HappyOutputs;

/** stepId of each criterion, derived from the manifest (no hand-kept map). */
const STEP_OF: Record<string, string> = Object.fromEntries(
  WF_004_CONSEIL_MANIFEST.steps.flatMap((s) => s.criteriaIds.map((id) => [id, s.stepId])),
);
const BLOCKING = WF_004_CONSEIL_CRITERIA.filter((c) => c.severity === "blocking");
const criterion = (id: string): Criterion =>
  WF_004_CONSEIL_CRITERIA.find((c) => c.id === id) ?? (() => { throw new Error(`no criterion ${id}`); })();

/** Full outputs map with one step replaced by a shallow patch of the happy step. */
function withStep(step: string, patch: Record<string, unknown>): Outputs {
  return { ...H, [step]: { ...(H[step] as object), ...patch } };
}

const swotNoRisks = { strengths: ["s"], weaknesses: ["w"], opportunities: ["o"] }; // missing `risks`
const useCasesTwo = (H["STEP-01"] as { useCases: unknown[] }).useCases.slice(0, 2);
const roadmapNoLater = { now: ["n"], next: ["x"] }; // missing `later`

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
  // STEP-01 — CONSULTANT-IA
  {
    id: "consultant-maturity-score", klass: "unique",
    witnesses: [
      { clause: "maturityScore:0 (below 1)", bad: withStep("STEP-01", { maturityScore: 0 }) },
      { clause: "maturityScore:11 (above 10)", bad: withStep("STEP-01", { maturityScore: 11 }) },
      { clause: "maturityScore:'6' (non-number)", bad: withStep("STEP-01", { maturityScore: "6" }) },
    ],
  },
  { id: "consultant-swot", klass: "redundant", witnesses: [{ clause: "swot missing `risks`", bad: withStep("STEP-01", { swot: swotNoRisks }) }] },
  { id: "consultant-usecases-floor", klass: "redundant", witnesses: [{ clause: "useCases:2 (below floor 3 AND schema min 3)", bad: withStep("STEP-01", { useCases: useCasesTwo }) }] },
  // STEP-02 — FINANCIAL-ANALYST
  { id: "fa-business-cases", klass: "redundant", witnesses: [{ clause: "businessCases:[] (below min 1)", bad: withStep("STEP-02", { businessCases: [] }) }] },
  { id: "fa-roi-summary", klass: "unique", witnesses: [{ clause: "roiSummary:''", bad: withStep("STEP-02", { roiSummary: "" }) }] },
  { id: "fa-prioritization", klass: "redundant", witnesses: [{ clause: "prioritization:[] (below min 1)", bad: withStep("STEP-02", { prioritization: [] }) }] },
  // STEP-03 — CDO-DIRECTEUR-IA
  { id: "cdo-roadmap-horizons", klass: "redundant", witnesses: [{ clause: "roadmap missing `later`", bad: withStep("STEP-03", { roadmap: roadmapNoLater }) }] },
  { id: "cdo-okrs", klass: "redundant", witnesses: [{ clause: "okrs:[] (below min 1)", bad: withStep("STEP-03", { okrs: [] }) }] },
  { id: "cdo-governance", klass: "unique", witnesses: [{ clause: "governance:''", bad: withStep("STEP-03", { governance: "" }) }] },
  // STEP-04 — CHANGE-MANAGER
  { id: "cm-adkar", klass: "redundant", witnesses: [{ clause: "adkarPlan:[] (below schema min 1)", bad: withStep("STEP-04", { adkarPlan: [] }) }] },
  { id: "cm-comms-plan", klass: "unique", witnesses: [{ clause: "commsPlan:''", bad: withStep("STEP-04", { commsPlan: "" }) }] },
  // STEP-05 — FORMATEUR-IA
  { id: "form-catalog", klass: "redundant", witnesses: [{ clause: "trainingCatalog:[] (below schema min 1)", bad: withStep("STEP-05", { trainingCatalog: [] }) }] },
  // STEP-07 — REDACTEUR-IA
  { id: "red-exec-summary", klass: "unique", witnesses: [{ clause: "execSummary:''", bad: withStep("STEP-07", { execSummary: "" }) }] },
  { id: "red-full-report", klass: "unique", witnesses: [{ clause: "fullReport:''", bad: withStep("STEP-07", { fullReport: "" }) }] },
  { id: "red-comex-deck", klass: "redundant", witnesses: [{ clause: "comexDeck:[] (below min 1)", bad: withStep("STEP-07", { comexDeck: [] }) }] },
];

// --- Removal machinery: rebuild the spine WITHOUT one criterion -------------
function runSpineWithout(dropId: string | null, outputs: Outputs) {
  const registry = dropId
    ? new CriterionRegistry().registerAll(WF_004_CONSEIL_CRITERIA.filter((c) => c.id !== dropId))
    : buildWf004ConseilRegistry();
  const manifest = dropId
    ? { ...WF_004_CONSEIL_MANIFEST, steps: WF_004_CONSEIL_MANIFEST.steps.map((s) => ({ ...s, criteriaIds: s.criteriaIds.filter((id) => id !== dropId) })) }
    : WF_004_CONSEIL_MANIFEST;
  const steps = loadSpine(manifest, sidecar, registry, resolveAgent);
  return runSpine(steps, mockRunner(outputs), {});
}

// ============================================================================
// AXIS 1 — no dead sub-clause; positive pole anchored on a real agent output
// ============================================================================
describe("WF-004 discrimination — positive pole (real agent output)", () => {
  it("the committed WF-004 live trace passes every blocking criterion", () => {
    const traces = (realTrace as { status: string; traces: Array<{ stepId: string; output: unknown }> }).traces;
    expect(realTrace.status).toBe("completed"); // guards against a swapped/failed trace
    for (const tr of traces) {
      const crit = BLOCKING.filter((c) => STEP_OF[c.id] === tr.stepId);
      const report = runEvalGate(tr.stepId, crit, tr.output);
      expect(report.verdict, `${tr.stepId} on real output`).toBe("pass");
    }
  });
});

describe("WF-004 discrimination — no dead sub-clause (falsify each clause)", () => {
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
describe("WF-004 discrimination — load-bearing classification (removal)", () => {
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
      "# WF-004 eval-gate discrimination matrix",
      "",
      "Generated by `test/spine-wf-004-discrimination.test.ts`. Read the file header for method",
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
    await expect(lines.join("\n")).toMatchFileSnapshot("./__snapshots__/spine-wf-004-discrimination.md");
  });
});

// ============================================================================
// COVERAGE GUARD — a new blocking criterion added without a witness fails here
// ============================================================================
describe("WF-004 discrimination — coverage guard", () => {
  it("every blocking criterion of the spine is exercised by the audit table", () => {
    const audited = new Set(AUDIT.map((e) => e.id));
    const blocking = new Set(BLOCKING.map((c) => c.id));
    expect([...blocking].filter((id) => !audited.has(id)), "unaudited blocking criteria").toEqual([]);
    expect([...audited].filter((id) => !blocking.has(id)), "audited ids that are not blocking criteria").toEqual([]);
  });
});
