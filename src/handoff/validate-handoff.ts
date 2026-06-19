/**
 * Handoff contract validation (brick 1) — reuses the loader's ajv pattern
 * (brick 0): ajv2020, allErrors, aggregated issues, fail-closed.
 *
 * Two complementary levels (ADR-0004: "static validation + fail-closed"):
 *   - checkContractCompatibility(producer, consumer): STATIC (design-time).
 *       Is each `required` field of the downstream input promised by the upstream output?
 *       Does not throw: returns the list of gaps (empty = compatible).
 *   - validateHandoff(producer, consumer, payload): RUNTIME.
 *       Does the payload satisfy the promised output (upstream) AND the expected
 *       input (downstream)? Fail-closed: throws, aggregating ALL issues from both sides.
 *
 * Deliberate limitation (see ADR-0004, honesty note): the static check is
 * *shallow* — presence of top-level required fields only. It proves neither
 * semantic equivalence nor nested type compatibility. Promising infallibility
 * would be a false signal; runtime validation remains the guardrail.
 */

import { Ajv2020 } from "ajv/dist/2020.js";
import type { ValidateFunction } from "ajv";
import type {
  JsonSchema,
  StepContract,
  HandoffIssue,
  HandoffStage,
} from "./types.js";

/** Error aggregating all problems of a handoff (upstream + downstream). */
export class HandoffValidationError extends Error {
  readonly issues: HandoffIssue[];

  constructor(issues: HandoffIssue[]) {
    const summary = issues.map((i) => `[${i.stage}] ${i.message}`).join(" ; ");
    super(`Invalid handoff (${issues.length} problem(s)): ${summary}`);
    this.name = "HandoffValidationError";
    this.issues = issues;
  }
}

// One shared ajv instance; a validator compiled once per schema
// (cache by object identity — contracts are stable objects).
const ajv = new Ajv2020({ allErrors: true, strict: true });
const cache = new WeakMap<JsonSchema, ValidateFunction>();

function getValidator(schema: JsonSchema): ValidateFunction {
  let validate = cache.get(schema);
  if (validate === undefined) {
    validate = ajv.compile(schema);
    cache.set(schema, validate);
  }
  return validate;
}

/** Converts a step's ajv errors into typed handoff issues. */
function toIssues(
  validate: ValidateFunction,
  stage: HandoffStage,
  stepId: string,
): HandoffIssue[] {
  return (validate.errors ?? []).map((e): HandoffIssue => {
    const issue: HandoffIssue = {
      stage,
      code: e.keyword,
      message: `${stepId}${e.instancePath || ""} ${e.message ?? ""}`.trim(),
    };
    if (e.instancePath) issue.path = e.instancePath;
    return issue;
  });
}

/**
 * STATIC — checks that the output promised upstream covers the input required
 * downstream (presence of top-level `required` fields in the upstream output's
 * `properties`). A downstream step without `input` is compatible by construction.
 * @returns the list of required fields that are not promised (empty = compatible).
 */
export function checkContractCompatibility(
  producer: StepContract,
  consumer: StepContract,
): HandoffIssue[] {
  const input = consumer.input;
  if (input === undefined) return []; // seed downstream: nothing to guarantee

  const required = Array.isArray(input["required"])
    ? (input["required"] as string[])
    : [];
  const outProps = producer.output["properties"];
  const promised = new Set(
    outProps && typeof outProps === "object"
      ? Object.keys(outProps as Record<string, unknown>)
      : [],
  );

  const issues: HandoffIssue[] = [];
  for (const field of required) {
    if (!promised.has(field)) {
      issues.push({
        stage: "compat",
        code: "MISSING_PRODUCED_FIELD",
        message: `downstream "${consumer.stepId}" requires "${field}", not promised by the output of "${producer.stepId}"`,
        path: field,
      });
    }
  }
  return issues;
}

/**
 * RUNTIME — validates a real payload as it crosses upstream→downstream, fail-closed:
 *   1. payload conforms to `producer.output` (upstream keeps its promise);
 *   2. payload conforms to `consumer.input`  (downstream accepts what it receives).
 * Issues from both steps are aggregated before throwing.
 * @throws {HandoffValidationError} if either validation fails.
 */
export function validateHandoff(
  producer: StepContract,
  consumer: StepContract,
  payload: unknown,
): void {
  const issues: HandoffIssue[] = [];

  const outValidate = getValidator(producer.output);
  if (!outValidate(payload)) {
    issues.push(...toIssues(outValidate, "producer-output", producer.stepId));
  }

  if (consumer.input !== undefined) {
    const inValidate = getValidator(consumer.input);
    if (!inValidate(payload)) {
      issues.push(...toIssues(inValidate, "consumer-input", consumer.stepId));
    }
  }

  if (issues.length > 0) throw new HandoffValidationError(issues);
}
