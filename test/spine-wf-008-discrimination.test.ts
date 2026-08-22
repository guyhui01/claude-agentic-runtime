import { describe, it, expect } from "vitest";
import { loadSpine } from "../src/manifest/load-manifest.js";
import { runSpine } from "../src/orchestrator/run-spine.js";
import { runEvalGate } from "../src/eval/eval-gate.js";
import { CriterionRegistry } from "../src/eval/criteria-registry.js";
import type { Criterion } from "../src/eval/types.js";
import {
  WF_008_AUDIT_MANIFEST,
  WF_008_AUDIT_CRITERIA,
  buildWf008AuditRegistry,
} from "../src/spines/wf-008-audit.js";
import {
  wf008InterimSidecar as sidecar,
  wf008ResolveAgent as resolveAgent,
  mockRunner,
} from "./fixtures/wf-008-spine.js";
import { wf008HappyOutputs } from "./fixtures/wf-008-outputs.js";
import realTrace from "../docs/audit/live-runs/wf-008-live-result.json" with { type: "json" };

/**
 * WF-008 DISCRIMINATION AUDIT — eighth spine of the eval-gate battery (the LARGEST,
 * 22 blocking criteria), following WF-001 to WF-007. Same two axes; the schema/criterion
 * split is RE-MEASURED, never assumed — and it moves again: WF-001 = 6/9 redundant,
 * WF-002 = 6/10 (4 unique), WF-003 = 6/18 (12 unique), WF-004 = 9/15 (6 unique),
 * WF-005 = 4/7 (3 unique), WF-006 = 8/16 (8 unique), WF-007 = 5/10 (5 unique), WF-008
 * (22 blocking) is measured at 14 UNIQUE / 8 REDUNDANT below.
 *
 * ⛔ THIS FILE FIXES NOTHING, by design (denial-probe precedent). It MEASURES and
 * GUARDS; every finding below is recorded for a later, separate lot.
 *
 * TWO structural constructs make WF-008 the richest spine of the battery, and both are
 * measured here as UNIQUE value-equality gates (removing either opens a real hole):
 *   · `jur-tier-not-unacceptable` (STEP-01): tier !== "Unacceptable" — removal lets an
 *     UNACCEPTABLE AI system run the full audit to a cleared verdict.
 *   · `audit-verdict-cleared` (STEP-06C): verdict === "cleared" — removal lets a
 *     "returned" (non-cleared) counter-review proceed to the final report (STEP-07).
 *
 * POSITIVE/NEGATIVE POLE — the committed WF-008 live trace is a fail-closed HALT (status
 * "failed" at STEP-06C on a real "returned" verdict), NOT a completed run. So the pole is
 * adapted (not copied): the 16 blocking criteria of STEP-01..06 pass on the real outputs
 * (positive pole), AND `audit-verdict-cleared` FAILS on the real STEP-06C output (a REAL
 * negative pole for the gateway — stronger anti-circularity than a hand-built one), while
 * the other STEP-06C blocking criteria pass on that same output. STEP-07 never ran live,
 * so its positive pole is the DoD-happy fixture (below).
 *
 * AXIS 1 — no dead sub-clause: each blocking criterion is falsified on its clause.
 * AXIS 2 — load-bearing vs runtime-redundant, measured by REMOVAL: runner → eval gate
 * (criteria, RAW output) → handoff (ajv2020 strict, `producer.output` at EVERY step). A
 * criterion whose clause the schema ALSO enforces (array `min`) is REDUNDANT; the UNIQUE
 * ones are the non-empty strings and the two value-equality gates the schema cannot express.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FINDINGS RECORDED FOR A LATER LOT (not fixed here) — measured against card v1.0 at
 * the pinned tag v4.3.0:
 *  F1 — content-blindness. `sec-owasp-llm-10` counts 10 entries without verifying they are
 *       the distinct LLM01–LLM10 categories; the many `nonEmptyString` checks verify
 *       presence, not that the report content matches the DoD. Same family as WF-003–007 F1.
 *  F2 — REDUNDANT-with-schema (8 criteria): `jur-obligations-matrix`, `jur-gdpr-articles`,
 *       `sec-owasp-llm-10`, `gov-raci-min-3`, `chg-training-program`, `audit-bias-log`,
 *       `audit-exit-criteria`, `red-remediation-plan` — the output schema declares the
 *       array `min` they check, enforced at the handoff.
 *  F3 — no WF-004/006-style "relaxed floor defeated by the schema" here: the two counted
 *       criteria (`sec-owasp-llm-10` min 10, `gov-raci-min-3` min 3) are DoD hard counts,
 *       not relaxed floors, and the schema min equals the criterion — coherent.
 *  F4 — DoD coverage gaps (card output_attendu lines with no blocking criterion): STEP-01
 *       penalties (advisory); STEP-02 gaps; STEP-03 controls plan; STEP-04 correction plan;
 *       STEP-05 AI Act lead; STEP-06 adoption KPIs; STEP-06C reservations; STEP-07 roadmap.
 *       Each defensible today; triage à la carte with the WF-001–007 findings.
 * ─────────────────────────────────────────────────────────────────────────────
 */

type Outputs = Record<string, unknown>;
const H = wf008HappyOutputs;

/** stepId of each criterion, derived from the manifest (no hand-kept map). */
const STEP_OF: Record<string, string> = Object.fromEntries(
  WF_008_AUDIT_MANIFEST.steps.flatMap((s) => s.criteriaIds.map((id) => [id, s.stepId])),
);
const BLOCKING = WF_008_AUDIT_CRITERIA.filter((c) => c.severity === "blocking");
const criterion = (id: string): Criterion =>
  WF_008_AUDIT_CRITERIA.find((c) => c.id === id) ?? (() => { throw new Error(`no criterion ${id}`); })();

/** Full outputs map with one step replaced by a shallow patch of the happy step. */
function withStep(step: string, patch: Record<string, unknown>): Outputs {
  return { ...H, [step]: { ...(H[step] as object), ...patch } };
}

const owaspNine = (H["STEP-03"] as { owaspLlm: unknown[] }).owaspLlm.slice(0, 9); // below schema min 10
const raciTwo = (H["STEP-05"] as { raci: unknown[] }).raci.slice(0, 2); // below schema min 3

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
  // STEP-01 — JURIDIQUE-IA (+ the Unacceptable-tier gateway)
  { id: "jur-tier-qualified", klass: "unique", witnesses: [{ clause: "tier:''", bad: withStep("STEP-01", { tier: "" }) }] },
  { id: "jur-tier-not-unacceptable", klass: "unique", witnesses: [{ clause: "tier:'Unacceptable' (gateway halts)", bad: withStep("STEP-01", { tier: "Unacceptable" }) }] },
  { id: "jur-obligations-matrix", klass: "redundant", witnesses: [{ clause: "obligationsMatrix:[] (below min 1)", bad: withStep("STEP-01", { obligationsMatrix: [] }) }] },
  { id: "jur-gdpr-articles", klass: "redundant", witnesses: [{ clause: "gdprArticles:[] (below min 1)", bad: withStep("STEP-01", { gdprArticles: [] }) }] },
  // STEP-02 — AI-ARCHITECT
  { id: "arch-report-present", klass: "unique", witnesses: [{ clause: "architectureReport:''", bad: withStep("STEP-02", { architectureReport: "" }) }] },
  { id: "arch-human-oversight", klass: "unique", witnesses: [{ clause: "humanOversight:''", bad: withStep("STEP-02", { humanOversight: "" }) }] },
  // STEP-03 — SECURITE-IA
  { id: "sec-report-present", klass: "unique", witnesses: [{ clause: "securityReport:''", bad: withStep("STEP-03", { securityReport: "" }) }] },
  { id: "sec-owasp-llm-10", klass: "redundant", witnesses: [{ clause: "owaspLlm:9 (below min 10)", bad: withStep("STEP-03", { owaspLlm: owaspNine }) }] },
  { id: "sec-stride-present", klass: "unique", witnesses: [{ clause: "stride:''", bad: withStep("STEP-03", { stride: "" }) }] },
  // STEP-04 — DATA-ENGINEER
  { id: "data-report-present", klass: "unique", witnesses: [{ clause: "dataReport:''", bad: withStep("STEP-04", { dataReport: "" }) }] },
  { id: "data-lineage-present", klass: "unique", witnesses: [{ clause: "lineage:''", bad: withStep("STEP-04", { lineage: "" }) }] },
  { id: "data-bias-audit", klass: "unique", witnesses: [{ clause: "biasAudit:''", bad: withStep("STEP-04", { biasAudit: "" }) }] },
  // STEP-05 — CDO-DIRECTEUR-IA
  { id: "gov-framework-present", klass: "unique", witnesses: [{ clause: "governanceFramework:''", bad: withStep("STEP-05", { governanceFramework: "" }) }] },
  { id: "gov-raci-min-3", klass: "redundant", witnesses: [{ clause: "raci:2 (below min 3)", bad: withStep("STEP-05", { raci: raciTwo }) }] },
  // STEP-06 — CHANGE-MANAGER
  { id: "chg-adkar-present", klass: "unique", witnesses: [{ clause: "adkarPlan:''", bad: withStep("STEP-06", { adkarPlan: "" }) }] },
  { id: "chg-training-program", klass: "redundant", witnesses: [{ clause: "trainingProgram:[] (below min 1)", bad: withStep("STEP-06", { trainingProgram: [] }) }] },
  // STEP-06C — AUDIT-METHODO-IA (+ the clearance gateway)
  { id: "audit-verdict-cleared", klass: "unique", witnesses: [{ clause: "verdict:'returned' (clearance gate halts)", bad: withStep("STEP-06C", { verdict: "returned" }) }] },
  { id: "audit-bias-log", klass: "redundant", witnesses: [{ clause: "biasLog:[] (below min 1)", bad: withStep("STEP-06C", { biasLog: [] }) }] },
  { id: "audit-exit-criteria", klass: "redundant", witnesses: [{ clause: "exitCriteria:[] (below min 1)", bad: withStep("STEP-06C", { exitCriteria: [] }) }] },
  // STEP-07 — REDACTEUR-IA
  { id: "red-exec-summary", klass: "unique", witnesses: [{ clause: "execSummary:''", bad: withStep("STEP-07", { execSummary: "" }) }] },
  { id: "red-audit-report", klass: "unique", witnesses: [{ clause: "auditReport:''", bad: withStep("STEP-07", { auditReport: "" }) }] },
  { id: "red-remediation-plan", klass: "redundant", witnesses: [{ clause: "remediationPlan:[] (below min 1)", bad: withStep("STEP-07", { remediationPlan: [] }) }] },
];

// --- Removal machinery: rebuild the spine WITHOUT one criterion -------------
function runSpineWithout(dropId: string | null, outputs: Outputs) {
  const registry = dropId
    ? new CriterionRegistry().registerAll(WF_008_AUDIT_CRITERIA.filter((c) => c.id !== dropId))
    : buildWf008AuditRegistry();
  const manifest = dropId
    ? { ...WF_008_AUDIT_MANIFEST, steps: WF_008_AUDIT_MANIFEST.steps.map((s) => ({ ...s, criteriaIds: s.criteriaIds.filter((id) => id !== dropId) })) }
    : WF_008_AUDIT_MANIFEST;
  const steps = loadSpine(manifest, sidecar, registry, resolveAgent);
  return runSpine(steps, mockRunner(outputs), {});
}

// ============================================================================
// AXIS 1 — no dead sub-clause; poles anchored on the real (failed) agent trace
// ============================================================================
describe("WF-008 discrimination — real-trace poles (a fail-closed halt)", () => {
  const traces = (realTrace as { status: string; failure?: { stepId?: string; message?: string }; traces: Array<{ stepId: string; output: unknown }> }).traces;

  it("the real trace is a fail-closed HALT at the STEP-06C clearance gate", () => {
    expect(realTrace.status).toBe("failed");
    expect((realTrace as { failure?: { stepId?: string } }).failure?.stepId).toBe("STEP-06C");
    expect((realTrace as { failure?: { message?: string } }).failure?.message).toContain("audit-verdict-cleared");
  });

  it("every step that PASSED live satisfies its blocking criteria (positive pole)", () => {
    for (const tr of traces) {
      if (tr.stepId === "STEP-06C") continue; // the halt step — handled by the negative pole below
      const crit = BLOCKING.filter((c) => STEP_OF[c.id] === tr.stepId);
      const report = runEvalGate(tr.stepId, crit, tr.output);
      expect(report.verdict, `${tr.stepId} on real output`).toBe("pass");
    }
  });

  it("STEP-06C: the clearance gate FAILS on the real 'returned' verdict (real negative pole), its other blocking criteria pass", () => {
    const s06c = traces.find((t) => t.stepId === "STEP-06C")!;
    expect(runEvalGate("STEP-06C", [criterion("audit-verdict-cleared")], s06c.output).verdict).toBe("fail");
    const others = BLOCKING.filter((c) => STEP_OF[c.id] === "STEP-06C" && c.id !== "audit-verdict-cleared");
    expect(runEvalGate("STEP-06C", others, s06c.output).verdict).toBe("pass");
  });
});

describe("WF-008 discrimination — no dead sub-clause (falsify each clause)", () => {
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
describe("WF-008 discrimination — load-bearing classification (removal)", () => {
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
      "# WF-008 eval-gate discrimination matrix",
      "",
      "Generated by `test/spine-wf-008-discrimination.test.ts`. Read the file header for method",
      "and the findings F1–F4. This is a MEASURED record, not a fix: it records which blocking",
      "criteria are the sole runtime gate (UNIQUE) and which merely double the manifest output",
      "schema enforced at the handoff, or a sibling criterion (REDUNDANT).",
      "",
      "Runtime order (run-spine.ts): runner → **eval gate (criteria)** → **handoff (schema)**.",
      "A criterion is REDUNDANT when, removed, the same bad output is still caught — one step",
      "later, with a different failure `kind`. The two value-equality GATES (`jur-tier-not-",
      "unacceptable`, `audit-verdict-cleared`) are UNIQUE: removal opens a real compliance hole.",
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
    await expect(lines.join("\n")).toMatchFileSnapshot("./__snapshots__/spine-wf-008-discrimination.md");
  });
});

// ============================================================================
// COVERAGE GUARD — a new blocking criterion added without a witness fails here
// ============================================================================
describe("WF-008 discrimination — coverage guard", () => {
  it("every blocking criterion of the spine is exercised by the audit table", () => {
    const audited = new Set(AUDIT.map((e) => e.id));
    const blocking = new Set(BLOCKING.map((c) => c.id));
    expect([...blocking].filter((id) => !audited.has(id)), "unaudited blocking criteria").toEqual([]);
    expect([...audited].filter((id) => !blocking.has(id)), "audited ids that are not blocking criteria").toEqual([]);
  });
});
