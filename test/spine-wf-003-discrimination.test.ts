import { describe, it, expect } from "vitest";
import { loadSpine } from "../src/manifest/load-manifest.js";
import { runSpine } from "../src/orchestrator/run-spine.js";
import { runEvalGate } from "../src/eval/eval-gate.js";
import { CriterionRegistry } from "../src/eval/criteria-registry.js";
import type { Criterion } from "../src/eval/types.js";
import {
  WF_003_LANCEMENT_MANIFEST,
  WF_003_LANCEMENT_CRITERIA,
  buildWf003LancementRegistry,
} from "../src/spines/wf-003-lancement.js";
import {
  wf003InterimSidecar as sidecar,
  wf003ResolveAgent as resolveAgent,
  mockRunner,
} from "./fixtures/wf-003-spine.js";
import { wf003HappyOutputs } from "./fixtures/wf-003-outputs.js";
import realTrace from "../docs/audit/live-runs/wf-003-live-result.json" with { type: "json" };

/**
 * WF-003 DISCRIMINATION AUDIT — third spine of the eval-gate battery, following the
 * WF-001 prototype and WF-002 (`spine-wf-00{1,2}-discrimination.test.ts`). Same two
 * axes; the schema/criterion split is RE-MEASURED here, never assumed from a prior
 * spine — and it MOVES again: WF-001 = 6/9 redundant, WF-002 = 6/10 (4 unique), and
 * WF-003 (18 blocking) is measured at 12 UNIQUE / 6 REDUNDANT below.
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
 *  clauses (emptiness, threshold below/at bound, non-number). Positive pole anchored
 *  NOT on a hand-built fixture but on the committed REAL agent output of the WF-003
 *  billed run — a source that knows nothing about the policies it confirms (the
 *  WF-005 circular-positive-control lesson).
 *
 *  AXIS 2 — LOAD-BEARING vs RUNTIME-REDUNDANT (the finding the naive battery hides).
 *  Runtime order in run-spine.ts is: runner → eval gate (criteria, on RAW output) →
 *  handoff (validateHandoff, which validates `producer.output` at EVERY step, terminal
 *  included, with ajv2020 strict). So a criterion whose clause the schema ALSO enforces
 *  (array min/max, field types, required-key presence) is caught one step later at the
 *  handoff even if removed — REDUNDANT, not the sole gate. The checks JSON Schema CANNOT
 *  express — non-emptiness of a string, an exact value (« Go », critical === 0), a numeric
 *  threshold (coverage ≥ 80, taux ≥ 90, high < 2) — are UNIQUE. Measured by REMOVAL: drop
 *  the criterion, replay the whole spine on a bad output, observe whether it still fails.
 *    · UNIQUE     → removal lets the bad output through (`completed`): the sole gate.
 *    · REDUNDANT  → removal still `failed`, at the handoff (schema) or via a sibling.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FINDINGS RECORDED FOR A LATER LOT (not fixed here) — measured against card v1.2 at
 * the pinned tag v4.4.0:
 *  F1 — content-blind checks. `sec-owasp-llm-10` is `minArrayLen(...,10)`: it counts 10
 *       entries but does NOT verify they are the 10 distinct OWASP categories LLM01–LLM10
 *       (10 duplicates pass). Advisory `ai-checklist-risques` and `sec-plan-remediation`
 *       are `Array.isArray(...)` — they pass on `[]`. Same shape as WF-002 F1 / WF-001 F3.
 *  F2 — REDUNDANT-with-schema (6 criteria): `fa-tco-3ans`, `pe-baseline-min-8`,
 *       `ai-adr-non-vide`, `qa-gherkin-non-vide`, `qa-evals-golden-20-50`,
 *       `sec-owasp-llm-10`. The manifest output already declares the type / array bounds
 *       they check, enforced at the handoff. Defense-in-depth vs DRY is a PO call.
 *  F3 — DoD boundary / semantics divergences from the card:
 *       (a) `dev-coverage-min-80` tests `≥ 80`; the card DoD says "coverage > 80%" (STRICT)
 *           — `coverage = 80` passes the criterion but not the card.
 *       (b) `sec-high-sous-2` counts ALL High; the card says "< 2 NON-RESIDUAL High" —
 *           stricter than the DoD (fail-safe direction), recorded not aligned.
 *       (c) STEP-04 condition_passage is "≥ 90% + 0 Critical bug on nominal cases"; only
 *           the ≥ 90% half is gated (`qa-taux-reussite-90`), the "0 Critical bug" half is not.
 *  F4 — DoD coverage gaps (card output_attendu lines with no criterion): STEP-01 few-shot/
 *       RAG prompts; STEP-02 integration plan + stack beyond `llm` (VectorDB/API/Frontend);
 *       STEP-03 `.env.example`; STEP-04 Gherkin nominal/boundary/error typing (only
 *       non-emptiness gated); STEP-05 docker-compose + monitoring; STEP-06 go-live checklist.
 *       Each defensible today (no current verdict is wrong); triage à la carte with WF-001
 *       F4/F5 and WF-002 F1–F3.
 * ─────────────────────────────────────────────────────────────────────────────
 */

type Outputs = Record<string, unknown>;
const H = wf003HappyOutputs;

/** stepId of each criterion, derived from the manifest (no hand-kept map). */
const STEP_OF: Record<string, string> = Object.fromEntries(
  WF_003_LANCEMENT_MANIFEST.steps.flatMap((s) => s.criteriaIds.map((id) => [id, s.stepId])),
);
const BLOCKING = WF_003_LANCEMENT_CRITERIA.filter((c) => c.severity === "blocking");
const criterion = (id: string): Criterion =>
  WF_003_LANCEMENT_CRITERIA.find((c) => c.id === id) ?? (() => { throw new Error(`no criterion ${id}`); })();

/** Full outputs map with one step replaced by a shallow patch of the happy step. */
function withStep(step: string, patch: Record<string, unknown>): Outputs {
  return { ...H, [step]: { ...(H[step] as object), ...patch } };
}

const goldenBelow = Array.from({ length: 19 }, (_, i) => ({ id: i, expected: "ok" }));
const goldenAbove = Array.from({ length: 51 }, (_, i) => ({ id: i, expected: "ok" }));
const baselineBelow = Array.from({ length: 7 }, (_, i) => ({ cas: `c-${i}`, type: "nominal" }));
const owaspBelow = Array.from({ length: 9 }, (_, i) => ({ category: `LLM${i + 1}`, status: "pass" }));

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
  // STEP-00 — FINANCIAL-ANALYST
  { id: "fa-business-case-present", klass: "unique", witnesses: [{ clause: "businessCase:''", bad: withStep("STEP-00", { businessCase: "" }) }] },
  { id: "fa-decision-go", klass: "unique", witnesses: [{ clause: "decision:'No-Go'", bad: withStep("STEP-00", { decision: "No-Go" }) }] },
  {
    id: "fa-tco-3ans", klass: "redundant",
    witnesses: [{ clause: "tco3ans:'180k' (non-number)", bad: withStep("STEP-00", { tco3ans: "180k" }) }],
  },
  // STEP-01 — PROMPT-ENGINEER
  { id: "pe-system-prompt-present", klass: "unique", witnesses: [{ clause: "systemPrompt:''", bad: withStep("STEP-01", { systemPrompt: "" }) }] },
  {
    id: "pe-baseline-min-8", klass: "redundant",
    witnesses: [{ clause: "baselineTest:7 (below min 8)", bad: withStep("STEP-01", { baselineTest: baselineBelow }) }],
  },
  // STEP-02 — AI-ARCHITECT
  { id: "ai-diagramme-c4", klass: "unique", witnesses: [{ clause: "diagrammeC4:''", bad: withStep("STEP-02", { diagrammeC4: "" }) }] },
  { id: "ai-adr-non-vide", klass: "redundant", witnesses: [{ clause: "adrs:[] (below min 1)", bad: withStep("STEP-02", { adrs: [] }) }] },
  { id: "ai-choix-stack-llm", klass: "unique", witnesses: [{ clause: "choixStack.llm:''", bad: withStep("STEP-02", { choixStack: { llm: "" } }) }] },
  // STEP-03 — DEV-PYTHON-IA
  { id: "dev-code-present", klass: "unique", witnesses: [{ clause: "code:''", bad: withStep("STEP-03", { code: "" }) }] },
  {
    id: "dev-coverage-min-80", klass: "unique",
    witnesses: [
      { clause: "coverage:79 (below 80)", bad: withStep("STEP-03", { testsUnitaires: { coverage: 79 } }) },
      { clause: "coverage:'85' (non-number)", bad: withStep("STEP-03", { testsUnitaires: { coverage: "85" } }) },
    ],
  },
  // STEP-04 — QA-AGILE
  { id: "qa-gherkin-non-vide", klass: "redundant", witnesses: [{ clause: "gherkin:[] (below min 1)", bad: withStep("STEP-04", { gherkin: [] }) }] },
  {
    id: "qa-taux-reussite-90", klass: "unique",
    witnesses: [
      { clause: "tauxReussite:89 (below 90)", bad: withStep("STEP-04", { tauxReussite: 89 }) },
      { clause: "tauxReussite:'94' (non-number)", bad: withStep("STEP-04", { tauxReussite: "94" }) },
    ],
  },
  {
    id: "qa-evals-golden-20-50", klass: "redundant",
    witnesses: [
      { clause: "goldenDataset:19 (below 20)", bad: withStep("STEP-04", { evalsLLM: { goldenDataset: goldenBelow } }) },
      { clause: "goldenDataset:51 (above 50)", bad: withStep("STEP-04", { evalsLLM: { goldenDataset: goldenAbove } }) },
    ],
  },
  // STEP-05 — DEVOPS-CLOUD
  { id: "ops-pipeline-present", klass: "unique", witnesses: [{ clause: "pipeline:''", bad: withStep("STEP-05", { pipeline: "" }) }] },
  { id: "ops-dockerfile-present", klass: "unique", witnesses: [{ clause: "dockerfile:''", bad: withStep("STEP-05", { dockerfile: "" }) }] },
  // STEP-06 — SECURITE-IA
  { id: "sec-owasp-llm-10", klass: "redundant", witnesses: [{ clause: "rapportOwasp:9 (below min 10)", bad: withStep("STEP-06", { rapportOwasp: owaspBelow }) }] },
  { id: "sec-zero-critical", klass: "unique", witnesses: [{ clause: "critical:1 (≠ 0)", bad: withStep("STEP-06", { vulnerabilites: { critical: 1, high: 1 } }) }] },
  {
    id: "sec-high-sous-2", klass: "unique",
    witnesses: [
      { clause: "high:2 (not < 2)", bad: withStep("STEP-06", { vulnerabilites: { critical: 0, high: 2 } }) },
      { clause: "high:'1' (non-number)", bad: withStep("STEP-06", { vulnerabilites: { critical: 0, high: "1" } }) },
    ],
  },
];

// --- Removal machinery: rebuild the spine WITHOUT one criterion -------------
function runSpineWithout(dropId: string | null, outputs: Outputs) {
  const registry = dropId
    ? new CriterionRegistry().registerAll(WF_003_LANCEMENT_CRITERIA.filter((c) => c.id !== dropId))
    : buildWf003LancementRegistry();
  const manifest = dropId
    ? { ...WF_003_LANCEMENT_MANIFEST, steps: WF_003_LANCEMENT_MANIFEST.steps.map((s) => ({ ...s, criteriaIds: s.criteriaIds.filter((id) => id !== dropId) })) }
    : WF_003_LANCEMENT_MANIFEST;
  const steps = loadSpine(manifest, sidecar, registry, resolveAgent);
  return runSpine(steps, mockRunner(outputs), {});
}

// ============================================================================
// AXIS 1 — no dead sub-clause; positive pole anchored on a real agent output
// ============================================================================
describe("WF-003 discrimination — positive pole (real agent output)", () => {
  it("the committed WF-003 live trace passes every blocking criterion", () => {
    const traces = (realTrace as { status: string; traces: Array<{ stepId: string; output: unknown }> }).traces;
    expect(realTrace.status).toBe("completed"); // guards against a swapped/failed trace
    for (const tr of traces) {
      const crit = BLOCKING.filter((c) => STEP_OF[c.id] === tr.stepId);
      const report = runEvalGate(tr.stepId, crit, tr.output);
      expect(report.verdict, `${tr.stepId} on real output`).toBe("pass");
    }
  });
});

describe("WF-003 discrimination — no dead sub-clause (falsify each clause)", () => {
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
describe("WF-003 discrimination — load-bearing classification (removal)", () => {
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
      "# WF-003 eval-gate discrimination matrix",
      "",
      "Generated by `test/spine-wf-003-discrimination.test.ts`. Read the file header for method",
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
    await expect(lines.join("\n")).toMatchFileSnapshot("./__snapshots__/spine-wf-003-discrimination.md");
  });
});

// ============================================================================
// COVERAGE GUARD — a new blocking criterion added without a witness fails here
// ============================================================================
describe("WF-003 discrimination — coverage guard", () => {
  it("every blocking criterion of the spine is exercised by the audit table", () => {
    const audited = new Set(AUDIT.map((e) => e.id));
    const blocking = new Set(BLOCKING.map((c) => c.id));
    expect([...blocking].filter((id) => !audited.has(id)), "unaudited blocking criteria").toEqual([]);
    expect([...audited].filter((id) => !blocking.has(id)), "audited ids that are not blocking criteria").toEqual([]);
  });
});
