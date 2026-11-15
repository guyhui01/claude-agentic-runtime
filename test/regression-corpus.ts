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
import { runWf008, assembleWf008Spine } from "../src/spines/run-wf-008.js";
import { runSpine } from "../src/orchestrator/run-spine.js";
import { toAgentDefinition } from "../src/sdk/to-agent-definition.js";
import wf008Step06cSeed from "./fixtures/regression-wf-008-step06c-seed.json" with { type: "json" };
import { runDispatch, type DispatchOutcome } from "../src/dispatch/run-dispatch.js";
import type { NeedBrief } from "../src/dispatch/types.js";
import { createQueryRunner } from "../src/sdk/query-runner.js";

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

/** One step's output, as the live corpus run records it. */
export interface StepOutput {
  stepId: string;
  output: unknown;
}

export interface RegressionCase {
  id: string;
  workflow: string;
  /** Where the fixed input comes from (a proven live run, or why it was built). */
  inputProvenance: string;
  /**
   * The expected outcome, or the admissible outcomes when more than one is legitimate (a model
   * judgment): the run conforms if it matches ANY of them.
   */
  expected: ExpectedOutcome | ExpectedOutcome[];
  /** First step run, when the case runs a tail of the spine (default: the spine's first step). */
  startsAt?: string;
  /** Deterministic checks on the agents' outputs, beyond the run's shape. */
  checkOutputs?: (outputs: StepOutput[]) => string[];
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

/**
 * Checks a run against admissible outcomes: conforms (empty) if it matches any of them; otherwise
 * returns every alternative's violations, prefixed with the alternative's index.
 */
export function checkAnyOf(expected: ExpectedOutcome[], run: RecordedRun): string[] {
  const all = expected.map((e) => checkInvariants(e, run));
  if (all.some((v) => v.length === 0)) return [];
  return all.flatMap((v, i) => v.map((x) => `[alt ${i}] ${x}`));
}

/** Checks a run against a case: its shape (one or several admissible outcomes), then its outputs. */
export function checkCase(c: RegressionCase, run: RecordedRun, outputs: StepOutput[]): string[] {
  const shape = Array.isArray(c.expected) ? checkAnyOf(c.expected, run) : checkInvariants(c.expected, run);
  return [...shape, ...(c.checkOutputs?.(outputs) ?? [])];
}

/**
 * WF-008 counter-review output check: the verdict is one of the two words the step defines, and
 * a returned audit carries at least one reservation. Whether a reservation cites a checkable
 * artifact is not tested: it would take an LLM judge (ADR-0011).
 */
export function checkCounterReviewOutput(outputs: StepOutput[]): string[] {
  const o = outputs.find((x) => x.stepId === "STEP-06C")?.output as
    | { verdict?: unknown; reservations?: unknown }
    | undefined;
  if (o === undefined) return ["STEP-06C: no output recorded"];
  if (o.verdict !== "cleared" && o.verdict !== "returned") {
    return [`STEP-06C: verdict expected "cleared" or "returned", got ${JSON.stringify(o.verdict)}`];
  }
  if (o.verdict === "returned" && !(Array.isArray(o.reservations) && o.reservations.length > 0)) {
    return ["STEP-06C: returned without any reservation"];
  }
  return [];
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
  {
    id: "wf-008-counter-review-full-input",
    workflow: "WF-008",
    inputProvenance:
      "Built for this corpus (2026-11-15), KO matrix K1: the counter-review fed every upstream " +
      "audit output, which the linear orchestrator never gives it (it passes STEP-06's output " +
      "only). The seed (test/fixtures/regression-wf-008-step06c-seed.json) merges the real " +
      "STEP-01 to STEP-06 outputs of the 2026-07-11 live run (docs/audit/live-runs/" +
      "wf-008-live-result.json) with the audit context of the WF-008 live harness default " +
      "(last changed 2026-07-11, the run's day; identity with that run's seed not proven). " +
      "STEP-06B, named by the card, is not part of the runtime spine. Those outputs were " +
      "produced before the runner isolation. Cleared and returned are both legitimate: a " +
      "returned verdict halts before STEP-07 (ratified 2026-11-14).",
    startsAt: "STEP-06C",
    expected: [
      {
        status: "failed",
        stepsReached: ["STEP-06C"],
        haltedAt: { stepId: "STEP-06C", kind: "eval-gate", mustFail: ["audit-verdict-cleared"] },
      },
      { status: "completed", stepsReached: ["STEP-06C", "STEP-07"] },
    ],
    checkOutputs: checkCounterReviewOutput,
    run: (ctx) => {
      const overrides = ctx.model ? { model: ctx.model } : {};
      const steps = assembleWf008Spine(ctx.sidecar, (asset) => toAgentDefinition(asset, ctx.catalogRoot, overrides));
      const from = steps.findIndex((s) => s.contract.stepId === "STEP-06C");
      if (from < 0) throw new Error("wf-008-counter-review-full-input: STEP-06C not in the WF-008 spine");
      return runSpine(steps.slice(from), createQueryRunner(WF008_CAPS), wf008Step06cSeed);
    },
  },
];

/**
 * DISPATCH CASES — the WF-000 router, a single routing decision rather than a spine, so they
 * carry their own shape and checker. The invariant bears on the decision only: the expected
 * workflow is either reached (`ROUTED`, or `PARAMS_MISSING` — the gap is the brief's, not the
 * router's, as in the live router harness) or named as the nearest miss of a `NO_MATCH`.
 */
export interface DispatchRegressionCase {
  id: string;
  /** Where the fixed brief comes from. */
  inputProvenance: string;
  brief: NeedBrief;
  /** The workflow the decision must reach or name. */
  expectedRoute: string;
  run: (ctx: RunContext) => Promise<DispatchOutcome>;
}

/**
 * Checks a routing decision against its expected workflow. Returns the violations (empty =
 * conforms). Any other status (`REJECT_INCOMPLETE`, `REJECT_ROUTER_OUTPUT`), another route, or a
 * `NO_MATCH` without the expected nearest miss is a violation.
 */
export function checkDispatchInvariants(expectedRoute: string, outcome: DispatchOutcome): string[] {
  switch (outcome.status) {
    case "ROUTED":
    case "PARAMS_MISSING":
      return outcome.route === expectedRoute
        ? []
        : [`route: expected ${expectedRoute}, got ${outcome.status} ${outcome.route}`];
    case "NO_MATCH":
      return outcome.nearestMiss === expectedRoute
        ? []
        : [`nearestMiss: expected ${expectedRoute}, got ${outcome.nearestMiss ?? "none"}`];
    default:
      return [`status: expected a decision on ${expectedRoute}, got ${outcome.status}`];
  }
}

/** Router call caps of the live router harness (`dispatch-run-live.test.ts`): $0.5 / 2 turns. */
const DISPATCH_CAPS: QueryRunnerDeps = { caps: { maxBudgetUsd: 0.5, maxTurns: 2 } };

const P11_BRIEF: NeedBrief = {
  need: "Prospect Kestrel Mutual asked what an AI scoping mission with us would cost; nothing is signed, this is a pre-signature commercial ask to answer.",
  domain: "Management & Consulting",
  expectedDeliverable: "Commercial proposal for a scoping mission",
  constraints: ["no RFP document, direct solicitation"],
  context: "Mutual insurer prospect, first contact through referral, scoping-mission scope only.",
  submittedBy: "Account Executive",
};

export const DISPATCH_REGRESSION_CASES: DispatchRegressionCase[] = [
  {
    id: "wf-000-p11-direct-solicitation",
    inputProvenance:
      "Oracle brief P11 (test/fixtures/dispatch-briefs.ts), copied verbatim on 2026-11-15. Live " +
      "on 2026-07-19 (docs/audit/live-runs/wf-000-router-live-result.json): NO_MATCH, nearest " +
      "miss WF-006 — the router sees only the sidecar arrow \"RFP received → …\" while the WF-006 " +
      "card also lists direct solicitation (KO matrix K3). Both readings are admitted until K3 is " +
      "settled in the catalog; a decision that loses WF-006 is the regression.",
    brief: P11_BRIEF,
    expectedRoute: "WF-006",
    run: (ctx) =>
      runDispatch(P11_BRIEF, {
        sidecar: ctx.sidecar,
        catalogRoot: ctx.catalogRoot,
        runner: createQueryRunner(DISPATCH_CAPS),
        ...(ctx.model ? { model: ctx.model } : {}),
      }),
  },
];
