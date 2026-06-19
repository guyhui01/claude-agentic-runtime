/**
 * Sidecar loader (brick 0) — read + fail-closed validation (ADR-0004).
 *
 * Ordered short-circuit pipeline:
 *   1. read + parse the JSON            -> stage "parse"
 *   2. validate with ajv against schema -> stage "schema"  (5 ISO 25012 characteristics)
 *   3. checkIntegrity()                 -> stage "integrity" (the other 2 + uniqueness)
 *   4. returns a typed Sidecar, otherwise throws SidecarValidationError.
 *
 * We do not run the integrity stage if the schema stage fails: the object is
 * not structurally reliable, so we stop cleanly rather than risk a crash.
 */

import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Ajv2020 } from "ajv/dist/2020.js";
import type { ValidateFunction } from "ajv";
import { checkIntegrity } from "../sidecar/integrity.js";
import type { Sidecar } from "../sidecar/types.js";

export type LoadStage = "parse" | "schema" | "integrity";

export interface LoadIssue {
  stage: LoadStage;
  code: string;
  message: string;
  /** Offending JSON path (schema) or asset id (integrity), if applicable. */
  path?: string;
}

/** Error aggregating ALL detected problems (ajv allErrors + integrity). */
export class SidecarValidationError extends Error {
  readonly issues: LoadIssue[];

  constructor(issues: LoadIssue[]) {
    const summary = issues.map((i) => `[${i.stage}] ${i.message}`).join(" ; ");
    super(`Invalid sidecar (${issues.length} problem(s)): ${summary}`);
    this.name = "SidecarValidationError";
    this.issues = issues;
  }
}

const schemaPath = fileURLToPath(
  new URL("../../schema/sidecar.schema.json", import.meta.url),
);

let cachedValidate: ValidateFunction | undefined;

/** Compiles the schema only once (ajv cached at module level). */
function getValidator(): ValidateFunction {
  if (cachedValidate !== undefined) return cachedValidate;
  const schema = JSON.parse(readFileSync(schemaPath, "utf-8")) as object;
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const validate = ajv.compile(schema);
  cachedValidate = validate;
  return validate;
}

/**
 * Loads and validates a sidecar. `catalogRoot` (where the assets' relative
 * paths are resolved) defaults to the folder containing the sidecar.
 * @throws {SidecarValidationError} if parse, schema or integrity fails.
 */
export function loadSidecar(
  sidecarPath: string,
  catalogRoot: string = dirname(sidecarPath),
): Sidecar {
  // 1. Read + parse.
  let raw: string;
  try {
    raw = readFileSync(sidecarPath, "utf-8");
  } catch (err) {
    throw new SidecarValidationError([
      {
        stage: "parse",
        code: "READ_ERROR",
        message: `cannot read file: ${(err as Error).message}`,
      },
    ]);
  }

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    throw new SidecarValidationError([
      {
        stage: "parse",
        code: "INVALID_JSON",
        message: `malformed JSON: ${(err as Error).message}`,
      },
    ]);
  }

  // 2. Validate against the schema (short-circuit if invalid).
  const validate = getValidator();
  if (!validate(data)) {
    const issues = (validate.errors ?? []).map((e): LoadIssue => {
      const issue: LoadIssue = {
        stage: "schema",
        code: e.keyword,
        message: `${e.instancePath || "(root)"} ${e.message ?? ""}`.trim(),
      };
      if (e.instancePath) issue.path = e.instancePath;
      return issue;
    });
    throw new SidecarValidationError(issues);
  }
  const sidecar = data as Sidecar;

  // 3. Integrity (referential accuracy, accessibility, uniqueness).
  const integrityIssues = checkIntegrity(sidecar, catalogRoot).map(
    (i): LoadIssue => ({
      stage: "integrity",
      code: i.code,
      message: i.message,
      path: i.assetId,
    }),
  );
  if (integrityIssues.length > 0) {
    throw new SidecarValidationError(integrityIssues);
  }

  // 4. Valid, typed sidecar.
  return sidecar;
}
