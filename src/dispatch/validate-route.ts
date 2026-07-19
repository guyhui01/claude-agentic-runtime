/**
 * Deterministic validation of the router LLM's proposal (router draft §3) —
 * the LLM proposes, THIS code disposes, the human decides. Fail-closed at
 * every step; no LLM ever evaluates the proposal (ADR-0007).
 *
 * Order: strict shape (ajv) → id exists in the sidecar as a workflow →
 * `dependsOn` all resolvable → manifest-driven param check. NO_MATCH and
 * PARAMS_MISSING come out as valid decisions; only an output the pipeline
 * cannot trust (malformed, invented id, broken dependency) is rejected.
 */

import { Ajv2020 } from "ajv/dist/2020.js";
import type { ValidateFunction } from "ajv";
import { affirmativeString } from "../spines/spine-helpers.js";
import type { Sidecar } from "../sidecar/types.js";
import type {
  NeedBrief,
  ParamManifest,
  RouteDecision,
  RouteIssue,
  RouterOutput,
} from "./types.js";

/** Strict JSON Schema of the router's answer (router draft §2). */
export const ROUTER_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["proposedRoute", "rationale", "nearestMiss"],
  properties: {
    proposedRoute: { type: "string" },
    rationale: { type: "string" },
    nearestMiss: { type: ["string", "null"] },
  },
} as const;

const ajv = new Ajv2020({ allErrors: true, strict: true });
let compiled: ValidateFunction | undefined;

function getValidator(): ValidateFunction {
  compiled ??= ajv.compile(ROUTER_OUTPUT_SCHEMA as unknown as Record<string, unknown>);
  return compiled;
}

/** Parses the raw router answer; issues (empty = shape-valid) aggregate all ajv errors. */
export function parseRouterOutput(raw: unknown): {
  output?: RouterOutput;
  issues: RouteIssue[];
} {
  const validate = getValidator();
  if (validate(raw)) return { output: raw as RouterOutput, issues: [] };
  const issues = (validate.errors ?? []).map(
    (e): RouteIssue => ({
      code: "MALFORMED_OUTPUT",
      message: `router output${e.instancePath ? ` ${e.instancePath}` : ""} ${e.message ?? "invalid"}`.trim(),
    }),
  );
  return { issues };
}

/** One workflow param against the brief — `true` when deterministically filled. */
function paramFilled(
  brief: NeedBrief,
  spec: ParamManifest["params"][number],
): boolean {
  if (spec.defaultValue !== undefined) return true;
  const text = spec.mapping(brief);
  if (spec.sanctionedUnknown?.test(text)) return true;
  if (spec.pattern !== undefined) return spec.pattern.test(text);
  return affirmativeString(text);
}

/**
 * Full deterministic validation of a router proposal against the sidecar and
 * the available param manifests (V0: WF-001 only).
 */
export function validateRoute(
  raw: unknown,
  brief: NeedBrief,
  sidecar: Sidecar,
  manifests: Readonly<Record<string, ParamManifest>>,
): RouteDecision {
  const { output, issues } = parseRouterOutput(raw);
  if (output === undefined) return { status: "REJECT_ROUTER_OUTPUT", issues };

  if (output.proposedRoute === "NO_MATCH") {
    const decision: RouteDecision = {
      status: "NO_MATCH",
      rationale: output.rationale,
    };
    if (output.nearestMiss !== null) decision.nearestMiss = output.nearestMiss;
    return decision;
  }

  const asset = sidecar.assets.find(
    (a) => a.id === output.proposedRoute && a.type === "workflow",
  );
  if (asset === undefined) {
    return {
      status: "REJECT_ROUTER_OUTPUT",
      issues: [
        {
          code: "UNKNOWN_WORKFLOW",
          message: `proposed route "${output.proposedRoute}" is not a workflow of the pinned sidecar (invented id — fail-closed)`,
        },
      ],
    };
  }

  const knownIds = new Set(sidecar.assets.map((a) => a.id));
  const broken = (asset.dependsOn ?? []).filter((id) => !knownIds.has(id));
  if (broken.length > 0) {
    return {
      status: "REJECT_ROUTER_OUTPUT",
      issues: broken.map(
        (id): RouteIssue => ({
          code: "UNRESOLVABLE_DEPENDENCY",
          message: `"${asset.id}" depends on "${id}", absent from the sidecar`,
        }),
      ),
    };
  }

  const manifest = manifests[asset.id];
  if (manifest === undefined) {
    // No manifest yet (V1 scope) — route stands, but say so honestly.
    return {
      status: "ROUTED",
      route: asset.id,
      rationale: output.rationale,
      paramsChecked: false,
    };
  }

  const missing = manifest.params
    .filter((p) => p.required && !paramFilled(brief, p))
    .map((p) => p.name);
  if (missing.length > 0) {
    return { status: "PARAMS_MISSING", route: asset.id, missingParams: missing };
  }

  return {
    status: "ROUTED",
    route: asset.id,
    rationale: output.rationale,
    paramsChecked: true,
  };
}
