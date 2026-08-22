import { describe, it, expect } from "vitest";
import { loadSpine } from "../src/manifest/load-manifest.js";
import { runSpine } from "../src/orchestrator/run-spine.js";
import { runEvalGate } from "../src/eval/eval-gate.js";
import { CriterionRegistry } from "../src/eval/criteria-registry.js";
import type { Criterion } from "../src/eval/types.js";
import {
  WF_006_AVANT_VENTE_MANIFEST,
  WF_006_AVANT_VENTE_CRITERIA,
  buildWf006AvantVenteRegistry,
} from "../src/spines/wf-006-avant-vente.js";
import {
  wf006InterimSidecar as sidecar,
  wf006ResolveAgent as resolveAgent,
  mockRunner,
} from "./fixtures/wf-006-spine.js";
import { wf006HappyOutputs } from "./fixtures/wf-006-outputs.js";
import realTrace from "../docs/audit/live-runs/wf-006-live-result.json" with { type: "json" };

/**
 * WF-006 DISCRIMINATION AUDIT — sixth spine of the eval-gate battery, following WF-001
 * to WF-005. Same two axes; the schema/criterion split is RE-MEASURED, never assumed —
 * and it moves again: WF-001 = 6/9 redundant, WF-002 = 6/10 (4 unique), WF-003 = 6/18
 * (12 unique), WF-004 = 9/15 (6 unique), WF-005 = 4/7 (3 unique), WF-006 (16 blocking)
 * is measured at 8 UNIQUE / 8 REDUNDANT below.
 *
 * ⛔ THIS FILE FIXES NOTHING, by design (denial-probe precedent). It MEASURES and
 * GUARDS; every finding below is recorded for a later, separate lot. Widening a
 * criterion in the same motion as building the instrument is the move that failed
 * twice on 2026-08-02 on the dispatch side.
 *
 * It measures TWO axes a naive "every check goes green" battery hides:
 *
 *  AXIS 1 — NO DEAD SUB-CLAUSE. A criterion that cannot fail is a `/.+/`. Each blocking
 *  criterion is falsified on EACH of its independent clauses. Positive pole anchored NOT
 *  on a hand-built fixture but on the committed REAL agent output of the WF-006 billed run.
 *
 *  AXIS 2 — LOAD-BEARING vs RUNTIME-REDUNDANT. Runtime order (run-spine.ts): runner →
 *  eval gate (criteria, RAW output) → handoff (validateHandoff, ajv2020 strict, on
 *  `producer.output` at EVERY step). A criterion whose clause the schema ALSO enforces
 *  (array min, all-keys-present objects, field types) is caught one step later at the
 *  handoff even if removed — REDUNDANT. WF-006's UNIQUE contributions the schema cannot
 *  express: the GO/NO-GO GATEWAY (`presales-go`, a value-equality gate — removing it lets
 *  a "NO-GO" run to completion, a real no-bid hole), the per-KEY non-emptiness of the BANT
 *  sheet (`presales-bant`, schema types the keys `string` but cannot demand non-empty), a
 *  numeric RANGE (`presales-win-probability` 0–100), and the plain non-empty strings.
 *  Measured by REMOVAL.
 *    · UNIQUE     → removal lets the bad output through (`completed`): the sole gate.
 *    · REDUNDANT  → removal still `failed`, at the handoff (schema) or via a sibling.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FINDINGS RECORDED FOR A LATER LOT (not fixed here) — measured against card v1.0 at
 * the pinned tag v4.4.0:
 *  F1 — content-blindness. The `nonEmptyArray` / `Array.isArray` checks verify presence,
 *       not content (`red-proposal` accepts any non-empty string, not a 20-40 page
 *       proposal); `presales-bant`/`presales-win-probability`/`presales-go` are the genuine
 *       content/gateway checks. Same family as WF-003/004/005 F1.
 *  F2 — REDUNDANT-with-schema (8 criteria): `ba-scope-in-out`, `ba-use-cases`,
 *       `ba-requirements-moscow`, `pm-wbs`, `pm-person-days`, `fin-costing-grid`,
 *       `fin-price`, `fin-scenarios` — the output schema declares the all-keys-present
 *       objects, the array `min` or the field types they check, enforced at the handoff.
 *  F3 — ✅ FIXED 2026-08-22 (the WF-004-style "relaxed floor defeated by the schema" that
 *       recurred here). `commercialScenarios` schema `min` lowered 3 → 1 (the `fin-scenarios`
 *       floor), and `pitchDeck` lowered `min 10/max 15` → `min 1` (no max) — the 3-scenario and
 *       10-15-slide ideals stay advisory (`fin-scenarios-full`, `red-pitch-deck`), matching the
 *       WF-005/007/010 pattern. A modest-but-valid run now passes the handoff; the floor criteria
 *       remain REDUNDANT with the floor-level schema min (F2).
 *  F4 — DoD coverage gaps (card output_attendu lines with no blocking criterion): STEP-01
 *       risk mapping + sponsor path (advisory); STEP-02 NFR + assumptions (advisory);
 *       STEP-03A make-vs-buy + op-cost + risks (advisory); STEP-04 workload + assumptions
 *       (advisory); STEP-05 prospect ROI (advisory); STEP-07 anticipated Q&A + appendices.
 *       Each defensible today; triage à la carte with the WF-001–005 findings.
 * ─────────────────────────────────────────────────────────────────────────────
 */

type Outputs = Record<string, unknown>;
const H = wf006HappyOutputs;

/** stepId of each criterion, derived from the manifest (no hand-kept map). */
const STEP_OF: Record<string, string> = Object.fromEntries(
  WF_006_AVANT_VENTE_MANIFEST.steps.flatMap((s) => s.criteriaIds.map((id) => [id, s.stepId])),
);
const BLOCKING = WF_006_AVANT_VENTE_CRITERIA.filter((c) => c.severity === "blocking");
const criterion = (id: string): Criterion =>
  WF_006_AVANT_VENTE_CRITERIA.find((c) => c.id === id) ?? (() => { throw new Error(`no criterion ${id}`); })();

/** Full outputs map with one step replaced by a shallow patch of the happy step. */
function withStep(step: string, patch: Record<string, unknown>): Outputs {
  return { ...H, [step]: { ...(H[step] as object), ...patch } };
}

// full valid BANT objects with a single hollow key — schema-blind (schema types keys string).
const bantEmptyBudget = { budget: "", authority: "a", need: "n", timeline: "t" };
const bantEmptyNeed = { budget: "b", authority: "a", need: "", timeline: "t" };
const scopeNoOut = { in: ["x"] }; // missing `out` — schema-caught.

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
    id: "presales-bant", klass: "unique",
    witnesses: [
      { clause: "bant.budget:'' (schema types it string, not non-empty)", bad: withStep("STEP-01", { bant: bantEmptyBudget }) },
      { clause: "bant.need:''", bad: withStep("STEP-01", { bant: bantEmptyNeed }) },
    ],
  },
  {
    id: "presales-win-probability", klass: "unique",
    witnesses: [
      { clause: "winProbability:-1 (below 0)", bad: withStep("STEP-01", { winProbability: -1 }) },
      { clause: "winProbability:101 (above 100)", bad: withStep("STEP-01", { winProbability: 101 }) },
      { clause: "winProbability:'65' (non-number)", bad: withStep("STEP-01", { winProbability: "65" }) },
    ],
  },
  {
    id: "presales-go", klass: "unique",
    witnesses: [
      { clause: "verdictCode:'NO-GO' (gateway halts)", bad: withStep("STEP-01", { verdictCode: "NO-GO" }) },
      { clause: "verdictCode:'CONDITIONAL' (documented no-bid)", bad: withStep("STEP-01", { verdictCode: "CONDITIONAL" }) },
    ],
  },
  // STEP-02 — BUSINESS-ANALYST
  { id: "ba-scope-in-out", klass: "redundant", witnesses: [{ clause: "scope missing `out`", bad: withStep("STEP-02", { scope: scopeNoOut }) }] },
  { id: "ba-use-cases", klass: "redundant", witnesses: [{ clause: "useCases:[] (below min 1)", bad: withStep("STEP-02", { useCases: [] }) }] },
  { id: "ba-requirements-moscow", klass: "redundant", witnesses: [{ clause: "requirements:[] (below min 1)", bad: withStep("STEP-02", { requirements: [] }) }] },
  // STEP-03A — AI-ARCHITECT
  { id: "arch-diagram", klass: "unique", witnesses: [{ clause: "architectureDiagram:''", bad: withStep("STEP-03A", { architectureDiagram: "" }) }] },
  { id: "arch-stack-llm", klass: "unique", witnesses: [{ clause: "stack.llm:''", bad: withStep("STEP-03A", { stack: { llm: "" } }) }] },
  // STEP-04 — CHEF-PROJET-IA
  { id: "pm-wbs", klass: "redundant", witnesses: [{ clause: "wbs:[] (below min 1)", bad: withStep("STEP-04", { wbs: [] }) }] },
  { id: "pm-schedule", klass: "unique", witnesses: [{ clause: "schedule:''", bad: withStep("STEP-04", { schedule: "" }) }] },
  { id: "pm-person-days", klass: "redundant", witnesses: [{ clause: "personDays:[] (below min 1)", bad: withStep("STEP-04", { personDays: [] }) }] },
  // STEP-05 — FINANCIAL-ANALYST
  { id: "fin-costing-grid", klass: "redundant", witnesses: [{ clause: "costingGrid:[] (below min 1)", bad: withStep("STEP-05", { costingGrid: [] }) }] },
  { id: "fin-price", klass: "redundant", witnesses: [{ clause: "sellingPrice:'250k' (non-number)", bad: withStep("STEP-05", { sellingPrice: "250k" }) }] },
  { id: "fin-scenarios", klass: "redundant", witnesses: [{ clause: "commercialScenarios:[] (below schema min 1)", bad: withStep("STEP-05", { commercialScenarios: [] }) }] },
  // STEP-07 — REDACTEUR-IA
  { id: "red-exec-summary", klass: "unique", witnesses: [{ clause: "execSummary:''", bad: withStep("STEP-07", { execSummary: "" }) }] },
  { id: "red-proposal", klass: "unique", witnesses: [{ clause: "proposal:''", bad: withStep("STEP-07", { proposal: "" }) }] },
];

// --- Removal machinery: rebuild the spine WITHOUT one criterion -------------
function runSpineWithout(dropId: string | null, outputs: Outputs) {
  const registry = dropId
    ? new CriterionRegistry().registerAll(WF_006_AVANT_VENTE_CRITERIA.filter((c) => c.id !== dropId))
    : buildWf006AvantVenteRegistry();
  const manifest = dropId
    ? { ...WF_006_AVANT_VENTE_MANIFEST, steps: WF_006_AVANT_VENTE_MANIFEST.steps.map((s) => ({ ...s, criteriaIds: s.criteriaIds.filter((id) => id !== dropId) })) }
    : WF_006_AVANT_VENTE_MANIFEST;
  const steps = loadSpine(manifest, sidecar, registry, resolveAgent);
  return runSpine(steps, mockRunner(outputs), {});
}

// ============================================================================
// AXIS 1 — no dead sub-clause; positive pole anchored on a real agent output
// ============================================================================
describe("WF-006 discrimination — positive pole (real agent output)", () => {
  it("the committed WF-006 live trace passes every blocking criterion", () => {
    const traces = (realTrace as { status: string; traces: Array<{ stepId: string; output: unknown }> }).traces;
    expect(realTrace.status).toBe("completed"); // guards against a swapped/failed trace
    for (const tr of traces) {
      const crit = BLOCKING.filter((c) => STEP_OF[c.id] === tr.stepId);
      const report = runEvalGate(tr.stepId, crit, tr.output);
      expect(report.verdict, `${tr.stepId} on real output`).toBe("pass");
    }
  });
});

describe("WF-006 discrimination — no dead sub-clause (falsify each clause)", () => {
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
describe("WF-006 discrimination — load-bearing classification (removal)", () => {
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
      "# WF-006 eval-gate discrimination matrix",
      "",
      "Generated by `test/spine-wf-006-discrimination.test.ts`. Read the file header for method",
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
    await expect(lines.join("\n")).toMatchFileSnapshot("./__snapshots__/spine-wf-006-discrimination.md");
  });
});

// ============================================================================
// COVERAGE GUARD — a new blocking criterion added without a witness fails here
// ============================================================================
describe("WF-006 discrimination — coverage guard", () => {
  it("every blocking criterion of the spine is exercised by the audit table", () => {
    const audited = new Set(AUDIT.map((e) => e.id));
    const blocking = new Set(BLOCKING.map((c) => c.id));
    expect([...blocking].filter((id) => !audited.has(id)), "unaudited blocking criteria").toEqual([]);
    expect([...audited].filter((id) => !blocking.has(id)), "audited ids that are not blocking criteria").toEqual([]);
  });
});
