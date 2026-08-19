import { describe, it, expect } from "vitest";
import { loadSpine } from "../src/manifest/load-manifest.js";
import { runSpine } from "../src/orchestrator/run-spine.js";
import { runEvalGate } from "../src/eval/eval-gate.js";
import { CriterionRegistry } from "../src/eval/criteria-registry.js";
import type { Criterion } from "../src/eval/types.js";
import {
  WF_001_CADRAGE_MANIFEST,
  WF_001_CADRAGE_CRITERIA,
  buildWf001CadrageRegistry,
} from "../src/spines/wf-001-cadrage.js";
import {
  wf001InterimSidecar as sidecar,
  wf001ResolveAgent as resolveAgent,
  mockRunner,
} from "./fixtures/wf-001-spine.js";
import { wf001HappyOutputs, wf001HappyBacklog } from "./fixtures/wf-001-outputs.js";
import realTrace from "../docs/audit/live-runs/wf-001-live-result.json" with { type: "json" };

/**
 * WF-001 DISCRIMINATION AUDIT — the eval-gate counterpart of the dispatch probes
 * (denial-probe, cross-vocabulary). Prototype for the nine other spines.
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
 *  clauses (in/out, the four US fields, both count bounds, each of given/when/then).
 *  Positive pole is anchored NOT on a hand-built fixture but on the committed REAL
 *  agent output of the 2-juillet billed run — a source that knows nothing about the
 *  policies it confirms (the WF-005 circular-positive-control lesson).
 *
 *  AXIS 2 — LOAD-BEARING vs RUNTIME-REDUNDANT (the finding the naive battery hides).
 *  Runtime order in run-spine.ts is: runner → eval gate (criteria, on RAW output) →
 *  handoff (validateHandoff, which enforces the manifest's tightened output schema).
 *  So a criterion whose clause the schema ALSO enforces (count bounds, field types)
 *  is caught one step later at the handoff even if removed — it is redundant, not the
 *  sole gate. Measured by REMOVAL: drop the criterion, replay the whole spine on a
 *  bad output, observe whether it still fails and WHERE.
 *    · UNIQUE     → removal lets the bad output through (`completed`): the criterion
 *                   is the only gate. These are the emptiness-of-content checks JSON
 *                   Schema cannot express — the gate's real contribution over brick 1.
 *    · REDUNDANT  → removal still `failed`, at the handoff (schema) or via a sibling
 *                   criterion. Belt-and-suspenders, not a hole. Whether to keep the
 *                   redundancy is a design call (defense-in-depth vs DRY) for the PO.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FINDINGS RECORDED FOR A LATER LOT (not fixed here):
 *  F1 — `qa-gherkin-non-vide` is REDUNDANT-with-sibling: it can never fail alone;
 *       any empty/non-array gherkin also fails `qa-given-when-then`. Its schema
 *       clause (minItems:1) makes it doubly redundant.
 *  F2 — `po-backlog-8-15` and `po-epics-3-5` are REDUNDANT-with-schema: the manifest
 *       output already declares min/max, enforced at the handoff.
 *  F3 — MIXED criteria: `ba-perimetre-in-out` (`in` non-empty is UNIQUE, `out`-is-array
 *       is redundant-schema) and `po-us-champs-requis` (statement/dod non-empty are
 *       UNIQUE, estimation:number and priorite-presence are redundant-schema; note
 *       `priorite !== undefined` is even WEAKER than the schema's `priorite:string`,
 *       so it accepts null/0/"").
 *  F4 — DoD coverage gaps vs the card (WF-001 v1.2), all defensible: STEP-01 asks
 *       stakeholders "with roles" but only non-emptiness is gated; STEP-03 "backlog
 *       ordered by value/risk" is not gated; STEP-04 "for each selected US" per-US
 *       coverage is not gated.
 *  F5 — `ba-questions-ouvertes-presentes` (advisory) passes on an EMPTY array: it
 *       checks presence-as-array only, never content — near-vacuous by design.
 * ─────────────────────────────────────────────────────────────────────────────
 */

type Outputs = Record<string, unknown>;
const H = wf001HappyOutputs;
const goodUS = wf001HappyBacklog[0];

/** stepId of each criterion, derived from the manifest (no hand-kept map). */
const STEP_OF: Record<string, string> = Object.fromEntries(
  WF_001_CADRAGE_MANIFEST.steps.flatMap((s) => s.criteriaIds.map((id) => [id, s.stepId])),
);
const BLOCKING = WF_001_CADRAGE_CRITERIA.filter((c) => c.severity === "blocking");
const criterion = (id: string): Criterion =>
  WF_001_CADRAGE_CRITERIA.find((c) => c.id === id) ?? (() => { throw new Error(`no criterion ${id}`); })();

/** Full outputs map with one step replaced by a shallow patch of the happy step. */
function withStep(step: string, patch: Record<string, unknown>): Outputs {
  return { ...H, [step]: { ...(H[step] as object), ...patch } };
}
const brokenUS = (patch: Record<string, unknown>): Outputs =>
  withStep("STEP-03", { backlog: [{ ...goodUS, ...patch }, ...wf001HappyBacklog.slice(1)] });

/**
 * The audit table — one entry per BLOCKING criterion. `witnesses` falsifies each
 * independent clause (first witness = the representative used for the removal test);
 * `klass` is the load-bearing hypothesis the removal test then MEASURES and locks.
 */
interface Entry {
  id: string;
  klass: "unique" | "redundant";
  witnesses: Array<{ clause: string; bad: Outputs }>;
}
const AUDIT: Entry[] = [
  { id: "ba-besoins-non-vide", klass: "unique", witnesses: [{ clause: "besoins:[]", bad: withStep("STEP-01", { besoins: [] }) }] },
  { id: "ba-parties-prenantes-non-vide", klass: "unique", witnesses: [{ clause: "partiesPrenantes:[]", bad: withStep("STEP-01", { partiesPrenantes: [] }) }] },
  {
    id: "ba-perimetre-in-out", klass: "unique",
    witnesses: [
      { clause: "perimetre.in:[]", bad: withStep("STEP-01", { perimetre: { in: [], out: ["billing"] } }) },
      { clause: "perimetre.out:non-array", bad: withStep("STEP-01", { perimetre: { in: ["auth"], out: "billing" } }) },
    ],
  },
  {
    id: "po-backlog-8-15", klass: "redundant",
    witnesses: [
      { clause: "backlog:7 (below)", bad: withStep("STEP-03", { backlog: wf001HappyBacklog.slice(0, 7) }) },
      { clause: "backlog:16 (above)", bad: withStep("STEP-03", { backlog: Array.from({ length: 16 }, () => goodUS) }) },
    ],
  },
  {
    id: "po-us-champs-requis", klass: "unique",
    witnesses: [
      { clause: "us.statement:''", bad: brokenUS({ statement: "" }) },
      { clause: "us.dod:''", bad: brokenUS({ dod: "" }) },
      { clause: "us.priorite:undefined", bad: brokenUS({ priorite: undefined }) },
      { clause: "us.estimation:'3'", bad: brokenUS({ estimation: "3" }) },
    ],
  },
  {
    id: "po-epics-3-5", klass: "redundant",
    witnesses: [
      { clause: "epics:2 (below)", bad: withStep("STEP-03", { epics: ["A", "B"] }) },
      { clause: "epics:6 (above)", bad: withStep("STEP-03", { epics: ["A", "B", "C", "D", "E", "F"] }) },
    ],
  },
  { id: "qa-gherkin-non-vide", klass: "redundant", witnesses: [{ clause: "gherkin:[]", bad: withStep("STEP-04", { gherkin: [] }) }] },
  {
    id: "qa-given-when-then", klass: "unique",
    witnesses: [
      { clause: "gwt.given:''", bad: withStep("STEP-04", { gherkin: [{ given: "", when: "w", then: "t", type: "nominal" }] }) },
      { clause: "gwt.when:''", bad: withStep("STEP-04", { gherkin: [{ given: "g", when: "", then: "t", type: "nominal" }] }) },
      { clause: "gwt.then:''", bad: withStep("STEP-04", { gherkin: [{ given: "g", when: "w", then: "", type: "nominal" }] }) },
    ],
  },
  { id: "qa-plan-test-present", klass: "unique", witnesses: [{ clause: "planTest:''", bad: withStep("STEP-04", { planTest: "" }) }] },
];

// --- Removal machinery: rebuild the spine WITHOUT one criterion -------------
function runSpineWithout(dropId: string | null, outputs: Outputs) {
  const registry = dropId
    ? new CriterionRegistry().registerAll(WF_001_CADRAGE_CRITERIA.filter((c) => c.id !== dropId))
    : buildWf001CadrageRegistry();
  const manifest = dropId
    ? { ...WF_001_CADRAGE_MANIFEST, steps: WF_001_CADRAGE_MANIFEST.steps.map((s) => ({ ...s, criteriaIds: s.criteriaIds.filter((id) => id !== dropId) })) }
    : WF_001_CADRAGE_MANIFEST;
  const steps = loadSpine(manifest, sidecar, registry, resolveAgent);
  return runSpine(steps, mockRunner(outputs), {});
}

// ============================================================================
// AXIS 1 — no dead sub-clause; positive pole anchored on a real agent output
// ============================================================================
describe("WF-001 discrimination — positive pole (real agent output)", () => {
  it("the committed 2-juillet live trace passes every blocking criterion", () => {
    const traces = (realTrace as { status: string; traces: Array<{ stepId: string; output: unknown }> }).traces;
    expect(realTrace.status).toBe("completed"); // guards against a swapped/failed trace
    for (const tr of traces) {
      const crit = BLOCKING.filter((c) => STEP_OF[c.id] === tr.stepId);
      const report = runEvalGate(tr.stepId, crit, tr.output);
      expect(report.verdict, `${tr.stepId} on real output`).toBe("pass");
    }
  });
});

describe("WF-001 discrimination — no dead sub-clause (falsify each clause)", () => {
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
describe("WF-001 discrimination — load-bearing classification (removal)", () => {
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
      "# WF-001 eval-gate discrimination matrix",
      "",
      "Generated by `test/spine-wf-001-discrimination.test.ts`. Read the file header for method",
      "and the findings F1–F5. This is a MEASURED record, not a fix: it records which blocking",
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
    await expect(lines.join("\n")).toMatchFileSnapshot("./__snapshots__/spine-wf-001-discrimination.md");
  });
});

// ============================================================================
// COVERAGE GUARD — a new blocking criterion added without a witness fails here
// ============================================================================
describe("WF-001 discrimination — coverage guard", () => {
  it("every blocking criterion of the spine is exercised by the audit table", () => {
    const audited = new Set(AUDIT.map((e) => e.id));
    const blocking = new Set(BLOCKING.map((c) => c.id));
    expect([...blocking].filter((id) => !audited.has(id)), "unaudited blocking criteria").toEqual([]);
    expect([...audited].filter((id) => !blocking.has(id)), "audited ids that are not blocking criteria").toEqual([]);
  });
});
