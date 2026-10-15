/**
 * BEHAVIORAL REGRESSION CORPUS — fixed inputs, expected outcomes, deterministic invariants.
 *
 * Why it exists: CI gates are structural (schemas, mappings, version drift). A change to a
 * workflow's prose in `claude-agents` can degrade what the agents produce and still pass green,
 * and the runtime tests only see the catalog at the PINNED tag. This corpus is the behavioral
 * check: each case is re-run LIVE (`regression-corpus-live.test.ts`) against `CATALOG_ROOT` —
 * point it at the catalog branch being changed — and its invariants are asserted.
 *
 * What it does NOT duplicate: the offline replay of the gates on recorded outputs already exists
 * for all ten spines (`spine-wf-00X-discrimination.test.ts`). That layer protects the GATES; this
 * one protects the BEHAVIOR the gates observe.
 *
 * Assertions are deterministic only — no LLM judge (ADR-0011, DEC-0009). They bear on the run's
 * shape (status, steps reached in order, where and why it halted, blocking verdicts), never on
 * textual equality of agent output. Advisory criteria are not asserted (non-blocking by design).
 *
 * Inputs are defined HERE, not imported from the live observation harnesses: a corpus input must
 * stay fixed even if a harness default is edited. Each case records the provenance of its input.
 */
import type { SpineResult, SpineFailure } from "../src/orchestrator/types.js";
import type { CriterionResult } from "../src/eval/types.js";
import type { Sidecar } from "../src/sidecar/types.js";
import type { QueryRunnerDeps } from "../src/sdk/query-runner.js";
import { runWf001 } from "../src/spines/run-wf-001.js";
import { runWf008 } from "../src/spines/run-wf-008.js";

/** Serialized run — the shape of the committed `docs/audit/live-runs/*-live-result.json`. */
export interface RecordedRun {
  status: "completed" | "failed";
  failure: Pick<SpineFailure, "stepId" | "kind"> | null;
  traces: { stepId: string; verdict: string; results: CriterionResult[] }[];
}

/** Expected outcome of a case — every field is checked by `checkInvariants`. */
export interface ExpectedOutcome {
  status: "completed" | "failed";
  /** stepIds of the traces, exact and in order (nothing ran beyond the last one). */
  stepsReached: string[];
  /** Required iff `status === "failed"`: the halting step, and the blocking criteria that MUST be among its failures. */
  haltedAt?: { stepId: string; kind: SpineFailure["kind"]; mustFail: string[] };
}

export interface RunContext {
  sidecar: Sidecar;
  catalogRoot: string;
  model?: string;
}

export interface RegressionCase {
  id: string;
  workflow: string;
  /** Where the fixed input comes from (a proven live run, or why it was built). */
  inputProvenance: string;
  expected: ExpectedOutcome;
  run: (ctx: RunContext) => Promise<SpineResult>;
}

/** SpineResult → RecordedRun (same mapping as the live observation harnesses). */
export function toRecordedRun(res: SpineResult): RecordedRun {
  return {
    status: res.status,
    failure: res.failure ? { stepId: res.failure.stepId, kind: res.failure.kind } : null,
    traces: res.traces.map((t) => ({
      stepId: t.provenance.stepId,
      verdict: t.gate.verdict,
      results: t.gate.results,
    })),
  };
}

/**
 * Checks a run against a case's expected outcome. Returns the violations (empty = conforms).
 * Every non-halting step must have at least one blocking result, all passed — a step with no
 * blocking result would otherwise satisfy "all blocking passed" vacuously. A `mustFail` id
 * absent from the halting step's results is a violation (a renamed criterion must not pass silently).
 */
export function checkInvariants(expected: ExpectedOutcome, run: RecordedRun): string[] {
  const v: string[] = [];
  if (run.status !== expected.status) v.push(`status: expected ${expected.status}, got ${run.status}`);

  const reached = run.traces.map((t) => t.stepId);
  if (reached.join(",") !== expected.stepsReached.join(",")) {
    v.push(`stepsReached: expected [${expected.stepsReached.join(", ")}], got [${reached.join(", ")}]`);
  }

  const halt = expected.haltedAt;
  if (expected.status === "completed" && run.failure !== null) {
    v.push(`failure: expected none, got ${run.failure.kind} at ${run.failure.stepId}`);
  }
  if (halt) {
    if (run.failure?.stepId !== halt.stepId || run.failure?.kind !== halt.kind) {
      const got = run.failure ? `${run.failure.kind} at ${run.failure.stepId}` : "none";
      v.push(`haltedAt: expected ${halt.kind} at ${halt.stepId}, got ${got}`);
    }
  }

  for (const t of run.traces) {
    const blocking = t.results.filter((r) => r.severity === "blocking");
    if (halt && t.stepId === halt.stepId) {
      for (const id of halt.mustFail) {
        const r = t.results.find((x) => x.id === id);
        if (!r) v.push(`${t.stepId}: mustFail criterion ${id} absent from the gate report`);
        else if (r.passed) v.push(`${t.stepId}: ${id} expected to fail, passed`);
      }
      continue;
    }
    if (blocking.length === 0) v.push(`${t.stepId}: no blocking result (vacuous pass)`);
    if (t.verdict !== "pass") v.push(`${t.stepId}: verdict expected pass, got ${t.verdict}`);
    for (const r of blocking) if (!r.passed) v.push(`${t.stepId}: blocking ${r.id} failed`);
  }
  return v;
}

/** Shared caps of the live observation harnesses (WF-001 1.0 / 6, WF-008 4.0 / 15). */
const WF001_CAPS: QueryRunnerDeps = { caps: { maxBudgetUsd: 1.0, maxTurns: 6 } };
const WF008_CAPS: QueryRunnerDeps = { caps: { maxBudgetUsd: 4.0, maxTurns: 15 } };

export const REGRESSION_CASES: RegressionCase[] = [
  {
    id: "wf-001-completed",
    workflow: "WF-001",
    inputProvenance:
      "Default seed of wf-001-run-live.test.ts, proven live on 2026-07-02 " +
      "(docs/audit/live-runs/wf-001-live-result.json: completed, 3/3 steps pass).",
    expected: { status: "completed", stepsReached: ["STEP-01", "STEP-03", "STEP-04"] },
    run: (ctx) =>
      runWf001({
        sidecar: ctx.sidecar,
        catalogRoot: ctx.catalogRoot,
        ...(ctx.model ? { model: ctx.model } : {}),
        initialInput: {
          brief:
            "Rebuild an insurer's B2B customer portal: self-care area, " +
            "policy tracking and claims filing, web and mobile.",
        },
        runnerDeps: WF001_CAPS,
      }),
  },
  {
    id: "wf-008-prohibited-practice-refusal",
    workflow: "WF-008",
    inputProvenance:
      "Built for this corpus (2026-10-15): a fictional social-scoring system, a prohibited " +
      "practice under AI Act Article 5(1)(c). The tier is fixed by law, not by the model's " +
      "judgment, so the governed refusal at STEP-01 must reproduce. (The 2026-07-11 halt at " +
      "STEP-06C was a model judgment — a later 'cleared' would be legitimate — so it is not a case.)",
    expected: {
      status: "failed",
      stepsReached: ["STEP-01"],
      haltedAt: { stepId: "STEP-01", kind: "eval-gate", mustFail: ["jur-tier-not-unacceptable"] },
    },
    run: (ctx) =>
      runWf008({
        sidecar: ctx.sidecar,
        catalogRoot: ctx.catalogRoot,
        ...(ctx.model ? { model: ctx.model } : {}),
        initialInput: {
          client: "Municipal authority of a mid-size EU city (fictional).",
          system:
            "AI Act / GDPR compliance audit of a citizen trustworthiness scoring system already " +
            "deployed by the city: it scores residents from their social behaviour (neighbour " +
            "complaints, social-media activity, unpaid fines, associations) and uses the score " +
            "to rank and restrict access to social housing and municipal services, including in " +
            "contexts unrelated to where the data was collected.",
          origin: "Preventive (regulatory pressure)",
          frameworks: "AI Act + GDPR",
          highStakes: true,
        },
        runnerDeps: WF008_CAPS,
      }),
  },
];
