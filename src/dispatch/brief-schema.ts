/**
 * Brief shape validation — ajv 2020 strict, same pattern as the loader and
 * handoff bricks (allErrors, one shared instance, fail-closed reporting).
 *
 * Shape only: substance rules (sentinels, state markers, constraint
 * justification) live in completeness-check.ts — two distinct layers so a
 * shape-valid brief still faces the substance gate.
 */

import { Ajv2020 } from "ajv/dist/2020.js";
import type { ValidateFunction } from "ajv";
import type { CompletenessIssue } from "./types.js";

/** JSON Schema (2020-12) of the validated need brief — contract §3. */
export const BRIEF_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["need", "domain", "expectedDeliverable", "constraints", "context"],
  properties: {
    need: { type: "string" },
    domain: { type: "string" },
    expectedDeliverable: { type: "string" },
    constraints: { type: "array", items: { type: "string" } },
    context: { type: "string" },
    submittedBy: { type: "string" },
  },
} as const;

const ajv = new Ajv2020({ allErrors: true, strict: true });
let compiled: ValidateFunction | undefined;

function getValidator(): ValidateFunction {
  compiled ??= ajv.compile(BRIEF_SCHEMA as unknown as Record<string, unknown>);
  return compiled;
}

/** Validates the raw shape; returns one issue per ajv error (empty = shape-valid). */
export function validateBriefShape(raw: unknown): CompletenessIssue[] {
  const validate = getValidator();
  if (validate(raw)) return [];
  return (validate.errors ?? []).map((e): CompletenessIssue => {
    const field =
      e.instancePath.replace(/^\//, "").split("/")[0] ||
      String((e.params as Record<string, unknown>)["missingProperty"] ?? "brief") ||
      "brief";
    return {
      field,
      code: "SCHEMA",
      message: `${field}${e.instancePath ? ` (${e.instancePath})` : ""} ${e.message ?? "invalid"}`.trim(),
    };
  });
}
