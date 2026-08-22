import { describe, it, expect } from "vitest";
import { loadSpine } from "../src/manifest/load-manifest.js";
import { runSpine } from "../src/orchestrator/run-spine.js";
import { runEvalGate } from "../src/eval/eval-gate.js";
import { CriterionRegistry } from "../src/eval/criteria-registry.js";
import type { Criterion } from "../src/eval/types.js";
import {
  WF_009_RECRUTEMENT_MANIFEST,
  WF_009_RECRUTEMENT_CRITERIA,
  buildWf009RecrutementRegistry,
} from "../src/spines/wf-009-recrutement.js";
import {
  wf009InterimSidecar as sidecar,
  wf009ResolveAgent as resolveAgent,
  mockRunner,
} from "./fixtures/wf-009-spine.js";
import { wf009HappyOutputs } from "./fixtures/wf-009-outputs.js";
import completedTrace from "../docs/audit/live-runs/wf-009-live-result.json" with { type: "json" };
import haltTrace from "../docs/audit/live-runs/wf-009-live-result-gate-halt.json" with { type: "json" };

/**
 * WF-009 DISCRIMINATION AUDIT — ninth spine of the eval-gate battery, following WF-001 to
 * WF-008. Same two axes; the schema/criterion split is RE-MEASURED, never assumed — and it
 * moves again: WF-001 = 6/9 redundant, WF-002 = 6/10 (4 unique), WF-003 = 6/18 (12 unique),
 * WF-004 = 9/15 (6 unique), WF-005 = 4/7 (3 unique), WF-006 = 8/16 (8 unique), WF-007 = 5/10
 * (5 unique), WF-008 = 8/22 (14 unique), WF-009 (16 blocking) is measured at 9 UNIQUE / 7
 * REDUNDANT below.
 *
 * ⛔ THIS FILE FIXES NOTHING, by design (denial-probe precedent). It MEASURES and GUARDS;
 * every finding below is recorded for a later, separate lot.
 *
 * WF-009 carries TWO HARDENED decision gates the schema cannot express, both measured UNIQUE
 * (removal opens a real hole) — and each was hardened AFTER the first live run caught a hollow
 * pass:
 *   · `rh-shortlist-validated` (STEP-04): `countAffirmativeField(shortlist,"candidate") >= 3`
 *     — a bare `minItems:3` waved through 3 self-declared PLACEHOLDER entries; the criterion
 *     counts REAL candidates, so 3 "none"/"n/a" placeholders (which pass the schema's min 3)
 *     fail the gate.
 *   · `sel-candidate-selected` (STEP-05): `affirmativeString(selectedCandidate)` — a
 *     `nonEmptyString` accepted the honest in-band refusal "None — no candidate can be
 *     selected"; the gate rejects the negative sentinel and halts fail-closed.
 *
 * POLES — WF-009 has BOTH a completed and a gate-halt live trace, so the poles are anchored
 * on real data at BOTH ends (the two traces together prove the gate DISCRIMINATES):
 *   · POSITIVE: the committed `wf-009-live-result.json` (status "completed") — every blocking
 *     criterion passes on the real per-step outputs.
 *   · NEGATIVE: the committed `wf-009-live-result-gate-halt.json` (status "failed" at STEP-04
 *     on `rh-shortlist-validated`) — the gate FAILS on the real halted STEP-04 output (a REAL
 *     negative pole, stronger than a hand-built one), while STEP-04's other blocking pass.
 *
 * AXIS 1 — no dead sub-clause (each blocking criterion falsified on its clause).
 * AXIS 2 — load-bearing vs runtime-redundant, measured by REMOVAL (runner → eval gate → ajv
 * strict handoff on `producer.output`): a criterion whose clause the schema ALSO enforces
 * (array `min`, required keys) is REDUNDANT; the UNIQUE ones are the non-empty strings and
 * the two hardened value-affirmation gates.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FINDINGS RECORDED FOR A LATER LOT (not fixed here) — measured against card v1.0 at
 * the pinned tag v4.4.0:
 *  F1 — content-blindness (the many `nonEmptyString`/`nonEmptyArray` checks verify presence,
 *       not that the content matches the DoD). The two gates are NOT content-blind (they are
 *       exactly the hardening against a hollow pass). Same family as WF-003–008 F1.
 *  F2 — REDUNDANT-with-schema (7 criteria): `ba-moscow`, `ba-must-nonempty`, `tech-grid-floor`,
 *       `tech-questions-floor`, `rh-scored-cvs`, `sel-tech-grid`, `sel-references`.
 *  F3 — the WF-004/006-style "relaxed floor defeated by the schema" RECURS on STEP-02A: the
 *       schema pins `assessmentGrid` to `min 6` and `interviewQuestions` to `min 10` (= the
 *       advisory ideals), so the blocking floors (`tech-grid-floor` ≥ 3, `tech-questions-floor`
 *       ≥ 3) can never fire — anything below the floor is already below the schema min. WF-009
 *       v1.0 did NOT apply the WF-005/007 hardening on STEP-02A (it did drop `maxItems`
 *       nowhere — shortlist/refs keep max). Recorded, not acted on.
 *  F4 — DoD coverage gaps (card lines with no blocking criterion): STEP-01 culture fit / work
 *       env; STEP-02A benchmark / exercise; STEP-03 agency brief / InMail / reply email;
 *       STEP-04 comparison table; STEP-05 references count (2-3 ideal is advisory); STEP-06
 *       unsuccessful reply / onboarding sheet. Each defensible today; triage à la carte.
 * ─────────────────────────────────────────────────────────────────────────────
 */

type Outputs = Record<string, unknown>;
const H = wf009HappyOutputs;

/** stepId of each criterion, derived from the manifest (no hand-kept map). */
const STEP_OF: Record<string, string> = Object.fromEntries(
  WF_009_RECRUTEMENT_MANIFEST.steps.flatMap((s) => s.criteriaIds.map((id) => [id, s.stepId])),
);
const BLOCKING = WF_009_RECRUTEMENT_CRITERIA.filter((c) => c.severity === "blocking");
const criterion = (id: string): Criterion =>
  WF_009_RECRUTEMENT_CRITERIA.find((c) => c.id === id) ?? (() => { throw new Error(`no criterion ${id}`); })();

/** Full outputs map with one step replaced by a shallow patch of the happy step. */
function withStep(step: string, patch: Record<string, unknown>): Outputs {
  return { ...H, [step]: { ...(H[step] as object), ...patch } };
}

const gridTwo = (H["STEP-02A"] as { assessmentGrid: unknown[] }).assessmentGrid.slice(0, 2); // below schema min 6
const questionsTwo = (H["STEP-02A"] as { interviewQuestions: unknown[] }).interviewQuestions.slice(0, 2); // below schema min 10
const moscowNoWont = { must: ["Python"], should: [], could: [] }; // missing `wont` — schema-caught
const moscowEmptyMust = { must: [], should: [], could: [], wont: [] }; // must below min 1 — schema-caught
// 3 shortlist rows that PASS the schema (min 3, candidate is a string) but are all negative
// sentinels — `countAffirmativeField` reads 0 real candidates → the hardened gate fails.
const sentinelShortlist = [
  { candidate: "none", justification: "no real candidate sourced" },
  { candidate: "n/a", justification: "no real candidate sourced" },
  { candidate: "none", justification: "no real candidate sourced" },
];
const twoRealOneSentinel = [
  { candidate: "CAND-01", justification: "real" },
  { candidate: "CAND-02", justification: "real" },
  { candidate: "none", justification: "placeholder" },
]; // count 2 < 3

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
  // STEP-01 — BUSINESS-ANALYST
  { id: "ba-need-sheet", klass: "unique", witnesses: [{ clause: "needSheet:''", bad: withStep("STEP-01", { needSheet: "" }) }] },
  { id: "ba-moscow", klass: "redundant", witnesses: [{ clause: "moscow missing `wont`", bad: withStep("STEP-01", { moscow: moscowNoWont }) }] },
  { id: "ba-must-nonempty", klass: "redundant", witnesses: [{ clause: "moscow.must:[] (below min 1)", bad: withStep("STEP-01", { moscow: moscowEmptyMust }) }] },
  // STEP-02A — CONSULTANT-IA
  { id: "tech-grid-floor", klass: "redundant", witnesses: [{ clause: "assessmentGrid:2 (below floor 3 AND schema min 6)", bad: withStep("STEP-02A", { assessmentGrid: gridTwo }) }] },
  { id: "tech-questions-floor", klass: "redundant", witnesses: [{ clause: "interviewQuestions:2 (below floor 3 AND schema min 10)", bad: withStep("STEP-02A", { interviewQuestions: questionsTwo }) }] },
  // STEP-03 — REDACTEUR-IA
  { id: "red-job-ad", klass: "unique", witnesses: [{ clause: "jobAd:''", bad: withStep("STEP-03", { jobAd: "" }) }] },
  // STEP-04 — RH-IA (+ the hardened shortlist gateway)
  { id: "rh-scored-cvs", klass: "redundant", witnesses: [{ clause: "scoredCvs:[] (below min 1)", bad: withStep("STEP-04", { scoredCvs: [] }) }] },
  { id: "rh-fraud-report", klass: "unique", witnesses: [{ clause: "fraudReport:''", bad: withStep("STEP-04", { fraudReport: "" }) }] },
  {
    id: "rh-shortlist-validated", klass: "unique",
    witnesses: [
      { clause: "3 placeholder rows (schema min 3 passes, 0 REAL candidates)", bad: withStep("STEP-04", { shortlist: sentinelShortlist }) },
      { clause: "2 real + 1 placeholder (count 2 < 3)", bad: withStep("STEP-04", { shortlist: twoRealOneSentinel }) },
    ],
  },
  // STEP-05 — RH-IA + CONSULTANT-IA (+ the hardened selection gateway)
  { id: "sel-hr-report", klass: "unique", witnesses: [{ clause: "hrInterviewReport:''", bad: withStep("STEP-05", { hrInterviewReport: "" }) }] },
  { id: "sel-tech-grid", klass: "redundant", witnesses: [{ clause: "techGridPerCandidate:[] (below min 1)", bad: withStep("STEP-05", { techGridPerCandidate: [] }) }] },
  { id: "sel-references", klass: "redundant", witnesses: [{ clause: "referenceChecks:[] (below schema min 2)", bad: withStep("STEP-05", { referenceChecks: [] }) }] },
  {
    id: "sel-candidate-selected", klass: "unique",
    witnesses: [
      { clause: "selectedCandidate:'None — no candidate can be selected' (negative sentinel)", bad: withStep("STEP-05", { selectedCandidate: "None — no candidate can be selected" }) },
      { clause: "selectedCandidate:''", bad: withStep("STEP-05", { selectedCandidate: "" }) },
    ],
  },
  { id: "sel-recommendation", klass: "unique", witnesses: [{ clause: "recommendation:''", bad: withStep("STEP-05", { recommendation: "" }) }] },
  // STEP-06 — RH-IA + REDACTEUR-IA
  { id: "off-offer-letter", klass: "unique", witnesses: [{ clause: "offerLetter:''", bad: withStep("STEP-06", { offerLetter: "" }) }] },
  { id: "off-admin-file", klass: "unique", witnesses: [{ clause: "adminFile:''", bad: withStep("STEP-06", { adminFile: "" }) }] },
];

// --- Removal machinery: rebuild the spine WITHOUT one criterion -------------
function runSpineWithout(dropId: string | null, outputs: Outputs) {
  const registry = dropId
    ? new CriterionRegistry().registerAll(WF_009_RECRUTEMENT_CRITERIA.filter((c) => c.id !== dropId))
    : buildWf009RecrutementRegistry();
  const manifest = dropId
    ? { ...WF_009_RECRUTEMENT_MANIFEST, steps: WF_009_RECRUTEMENT_MANIFEST.steps.map((s) => ({ ...s, criteriaIds: s.criteriaIds.filter((id) => id !== dropId) })) }
    : WF_009_RECRUTEMENT_MANIFEST;
  const steps = loadSpine(manifest, sidecar, registry, resolveAgent);
  return runSpine(steps, mockRunner(outputs), {});
}

// ============================================================================
// AXIS 1 — no dead sub-clause; poles anchored on BOTH real traces
// ============================================================================
describe("WF-009 discrimination — real-trace poles (completed + gate-halt)", () => {
  it("POSITIVE pole: the completed live trace passes every blocking criterion", () => {
    const ct = completedTrace as { status: string; traces: Array<{ stepId: string; output: unknown }> };
    expect(ct.status).toBe("completed");
    for (const tr of ct.traces) {
      const crit = BLOCKING.filter((c) => STEP_OF[c.id] === tr.stepId);
      expect(runEvalGate(tr.stepId, crit, tr.output).verdict, `${tr.stepId} on real output`).toBe("pass");
    }
  });

  it("NEGATIVE pole: the gate-halt trace fails at STEP-04 on the hardened shortlist gate, its siblings pass", () => {
    const ht = haltTrace as { status: string; failure?: { stepId?: string; message?: string }; traces: Array<{ stepId: string; output: unknown }> };
    expect(ht.status).toBe("failed");
    expect(ht.failure?.stepId).toBe("STEP-04");
    expect(ht.failure?.message).toContain("rh-shortlist-validated");
    const s04 = ht.traces.find((t) => t.stepId === "STEP-04")!;
    expect(runEvalGate("STEP-04", [criterion("rh-shortlist-validated")], s04.output).verdict).toBe("fail");
    const others = BLOCKING.filter((c) => STEP_OF[c.id] === "STEP-04" && c.id !== "rh-shortlist-validated");
    expect(runEvalGate("STEP-04", others, s04.output).verdict).toBe("pass");
  });
});

describe("WF-009 discrimination — no dead sub-clause (falsify each clause)", () => {
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
describe("WF-009 discrimination — load-bearing classification (removal)", () => {
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
      "# WF-009 eval-gate discrimination matrix",
      "",
      "Generated by `test/spine-wf-009-discrimination.test.ts`. Read the file header for method",
      "and the findings F1–F4. This is a MEASURED record, not a fix: it records which blocking",
      "criteria are the sole runtime gate (UNIQUE) and which merely double the manifest output",
      "schema enforced at the handoff, or a sibling criterion (REDUNDANT).",
      "",
      "Runtime order (run-spine.ts): runner → **eval gate (criteria)** → **handoff (schema)**.",
      "A criterion is REDUNDANT when, removed, the same bad output is still caught — one step",
      "later. The two HARDENED gates (`rh-shortlist-validated`, `sel-candidate-selected`) are",
      "UNIQUE: they count REAL candidates / reject negative sentinels the schema cannot express.",
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
    await expect(lines.join("\n")).toMatchFileSnapshot("./__snapshots__/spine-wf-009-discrimination.md");
  });
});

// ============================================================================
// COVERAGE GUARD — a new blocking criterion added without a witness fails here
// ============================================================================
describe("WF-009 discrimination — coverage guard", () => {
  it("every blocking criterion of the spine is exercised by the audit table", () => {
    const audited = new Set(AUDIT.map((e) => e.id));
    const blocking = new Set(BLOCKING.map((c) => c.id));
    expect([...blocking].filter((id) => !audited.has(id)), "unaudited blocking criteria").toEqual([]);
    expect([...audited].filter((id) => !blocking.has(id)), "audited ids that are not blocking criteria").toEqual([]);
  });
});
