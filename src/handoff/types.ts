/**
 * Handoff contract types (brick 1) — typed I/O between workflow steps.
 * Reference: ADR-0004 (static contract validation + fail-closed propagation).
 *
 * The Claude Agent SDK runs the steps but does NOT guarantee that step N's
 * output satisfies step N+1's expected input. This gap — inter-step I/O
 * consistency — is what this module fills. It is the runtime's non-commoditized
 * core value (see docs/NEXT_STEPS.md §2.1).
 */

/** JSON Schema (2020-12) object carried by a contract. Validated via ajv at runtime. */
export type JsonSchema = Record<string, unknown>;

/** I/O contract of a workflow step (see Sidecar.assets[].id for `stepId`). */
export interface StepContract {
  /** id of the producing or consuming step/asset. */
  stepId: string;
  /** Schema of what the step accepts as input. Absent = seed step (no incoming handoff). */
  input?: JsonSchema;
  /** Schema of what the step promises as output. */
  output: JsonSchema;
}

/**
 * Handoff validation stage:
 *  - `compat`          : static upstream↔downstream check (design-time);
 *  - `producer-output` : the runtime payload matches the output promised upstream;
 *  - `consumer-input`  : the runtime payload matches the input expected downstream.
 */
export type HandoffStage = "compat" | "producer-output" | "consumer-input";

export interface HandoffIssue {
  stage: HandoffStage;
  code: string;
  message: string;
  /** JSON path (runtime validation) or field name (static compat), if applicable. */
  path?: string;
}
