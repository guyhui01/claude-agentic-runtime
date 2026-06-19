/**
 * Spine executor (§2.4-B.1) — runs a sequence of steps, wiring the injected
 * runner + eval gate (brick 2) + handoff contracts (brick 1) + provenance,
 * fail-closed.
 *
 * Guarantees (consistent with ADR-0004 "guarded propagation" + ISO 19011):
 *   - STATIC PRE-FLIGHT: the compatibility of adjacent contracts is checked
 *     BEFORE any runner call; a design-time mismatch fails without running anything.
 *   - PER STEP, in order: execution → eval gate (fail-closed) → handoff to the
 *     downstream step (fail-closed). A step's output is propagated only once both
 *     of these guards are cleared.
 *   - EVIDENCE PRESERVED: `traces` is filled up to the reached step, including
 *     the offending step if it produced a gate report before blocking.
 *   - PURE: no disk or network access; the only effect goes through the runner.
 */

import {
  checkContractCompatibility,
  validateHandoff,
  HandoffValidationError,
} from "../handoff/validate-handoff.js";
import type { StepContract } from "../handoff/types.js";
import { runEvalGate, assertGatePassed, EvalGateError } from "../eval/eval-gate.js";
import type { GateReport } from "../eval/types.js";
import type {
  SpineStep,
  SpineResult,
  StepTrace,
  StepRunner,
} from "./types.js";

/** Consistency error of the spine itself (invalid config, pre-flight). */
export class SpineConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpineConfigError";
  }
}

/**
 * Progress event emitted by `runSpine` as each step is crossed (pure
 * OBSERVABILITY, no effect on the flow): `start` before the runner call,
 * `done` once the gate is evaluated (with its `verdict`, even if the step blocks).
 * Lets a caller (e.g. a live-run harness) trace progress LIVE — useful for a
 * long run where the final result only arrives at the very end.
 */
export interface StepProgressEvent {
  phase: "start" | "done";
  /** 0-based index of the step in the spine. */
  index: number;
  /** Total number of steps. */
  total: number;
  stepId: string;
  assetId: string;
  /** Gate verdict — present only in the `done` phase. */
  verdict?: GateReport["verdict"];
}

/** Per-step observability hook (synchronous, must not throw). */
export type StepProgressHook = (event: StepProgressEvent) => void;

/**
 * Sentinel consumer to validate the terminal step's output: without `input`,
 * `validateHandoff` only checks compliance with the promised output (producer-output).
 */
function terminalSink(producer: StepContract): StepContract {
  return { stepId: `${producer.stepId}::sink`, output: {} };
}

/**
 * Runs the spine `steps` with the injected `runner`, starting from `initialInput`.
 * Does not throw on an expected guard failure (eval gate / handoff): returns a
 * `SpineResult { status: "failed", failure, traces }`. Throws only on a
 * configuration error (`SpineConfigError`) or an unexpected runner fault.
 */
export async function runSpine(
  steps: SpineStep[],
  runner: StepRunner,
  initialInput: unknown = {},
  onStep?: StepProgressHook,
): Promise<SpineResult> {
  if (steps.length === 0) {
    throw new SpineConfigError("empty spine: at least one step is required");
  }

  // Internal consistency: provenance.stepId === contract.stepId for each step.
  for (const s of steps) {
    if (s.provenance.stepId !== s.contract.stepId) {
      throw new SpineConfigError(
        `step inconsistency: provenance "${s.provenance.stepId}" ≠ contract "${s.contract.stepId}"`,
      );
    }
  }

  // STATIC pre-flight (design-time): adjacent contracts compatible, BEFORE execution.
  for (let i = 0; i < steps.length - 1; i++) {
    const issues = checkContractCompatibility(
      steps[i]!.contract,
      steps[i + 1]!.contract,
    );
    if (issues.length > 0) {
      const summary = issues.map((x) => x.message).join(" ; ");
      throw new SpineConfigError(
        `incompatible contracts "${steps[i]!.contract.stepId}"→"${steps[i + 1]!.contract.stepId}": ${summary}`,
      );
    }
  }

  const traces: StepTrace[] = [];
  let input: unknown = initialInput;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!;
    const { stepId } = step.contract;
    const { assetId } = step.provenance;

    onStep?.({ phase: "start", index: i, total: steps.length, stepId, assetId });

    // 1. Run the step via the injected runner. We pass the contract's output
    //    schema: the runner may use it to enforce the JSON format on the agent
    //    (live); a mocked runner is free to ignore it.
    const { output } = await runner({
      stepId,
      agent: step.agent,
      input,
      outputSchema: step.contract.output,
    });

    // 2. Eval gate (brick 2) — the evidence (GateReport) is produced even on success.
    const gate = runEvalGate(stepId, step.criteria, output);
    traces.push({ provenance: step.provenance, output, gate });
    onStep?.({ phase: "done", index: i, total: steps.length, stepId, assetId, verdict: gate.verdict });
    try {
      assertGatePassed(gate);
    } catch (e) {
      if (e instanceof EvalGateError) {
        return {
          status: "failed",
          traces,
          failure: { stepId, kind: "eval-gate", message: e.message },
        };
      }
      throw e;
    }

    // 3. Handoff (brick 1) — to the downstream step, or terminal producer-output validation.
    const next = steps[i + 1];
    const consumer = next ? next.contract : terminalSink(step.contract);
    try {
      validateHandoff(step.contract, consumer, output);
    } catch (e) {
      if (e instanceof HandoffValidationError) {
        return {
          status: "failed",
          traces,
          failure: { stepId, kind: "handoff", message: e.message },
        };
      }
      throw e;
    }

    input = output;
  }

  return {
    status: "completed",
    traces,
    finalOutput: traces[traces.length - 1]!.output,
  };
}
