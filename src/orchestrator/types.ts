/**
 * Spine orchestrator types (§2.4-B.1) — runs a sequence of workflow steps
 * (WF-001→002→003), wiring on EACH step:
 *   - the runner (injectable abstraction of the Claude Agent SDK's `query()`);
 *   - the eval gate (brick 2) on the output;
 *   - the handoff contracts (brick 1) between steps;
 *   - provenance (catalogTag / assetId — ISO 25012 credibility/currentness).
 *
 * The orchestrator is PURE: no disk or network access. The only side effect
 * (running a step) goes through the injected `StepRunner`; in B.1 it is mocked
 * (hermetic), in B.3 it will wrap `query()` (OAuth subscription, caps).
 */

import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import type { StepContract, JsonSchema } from "../handoff/types.js";
import type { Criterion } from "../eval/types.js";
import type { GateReport } from "../eval/types.js";

/** Step provenance — proof of catalog origin (ADR-0002, ISO 25012). */
export interface StepProvenance {
  /** id of the step in the spine (= `contract.stepId`). */
  stepId: string;
  /** id of the executed catalog asset (agent). */
  assetId: string;
  /** Pinned catalog tag the asset comes from (`asset.source.catalogTag`). */
  catalogTag: string;
}

/** Step execution call passed to the runner. */
export interface StepRunCall {
  stepId: string;
  /** Agent definition (from the §2.4-A adapter) handed to the runner. */
  agent: AgentDefinition;
  /** Step input: the upstream step's output, or the initial input for the seed step. */
  input: unknown;
  /**
   * Expected output schema (= `contract.output`). Provided by the orchestrator so
   * the runner can ENFORCE the format on the agent (a "conforming JSON" instruction)
   * and parse its response. Optional: a mocked runner may ignore it.
   */
  outputSchema?: JsonSchema;
}

/** Raw result of a step, as returned by the runner (before gate/handoff). */
export interface StepRunResult {
  output: unknown;
}

/**
 * Injection point abstracting the SDK's `query()`. Only visible surface:
 * a step goes in (agent + input), an output comes out. Enables a hermetic mock
 * in B.1 and a real guarded `query()` call (OAuth, caps) in B.3, without touching
 * the orchestrator's core.
 */
export type StepRunner = (call: StepRunCall) => Promise<StepRunResult>;

/** Definition of a spine step: everything the orchestrator needs. */
export interface SpineStep {
  provenance: StepProvenance;
  /** Agent to run (built upstream via `toAgentDefinition`, §2.4-A). */
  agent: AgentDefinition;
  /** Step I/O contract (brick 1). `stepId` must match the provenance. */
  contract: StepContract;
  /** Eval gate criteria applied to the output (brick 2). */
  criteria: Criterion[];
}

/** Audit trace of a crossed step: provenance + output + gate report. */
export interface StepTrace {
  provenance: StepProvenance;
  output: unknown;
  gate: GateReport;
}

/** Cause of a fail-closed stop of the spine. */
export interface SpineFailure {
  /** stepId of the offending step. */
  stepId: string;
  /** "eval-gate" if the gate blocked, "handoff" if the I/O validation blocked. */
  kind: "eval-gate" | "handoff";
  /** Aggregated message of the underlying error (EvalGateError / HandoffValidationError). */
  message: string;
}

/**
 * Result of the spine execution. `traces` is ALWAYS filled up to the reached
 * step (audit evidence kept even on failure — ISO 19011 stance).
 */
export interface SpineResult {
  status: "completed" | "failed";
  traces: StepTrace[];
  /** Output of the last step, present only if `status === "completed"`. */
  finalOutput?: unknown;
  /** Cause of the stop, present only if `status === "failed"`. */
  failure?: SpineFailure;
}
