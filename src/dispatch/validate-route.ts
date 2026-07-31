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
import { affirmativeString } from "../spines/spine-helpers.js";
import type { ValidateFunction } from "ajv";
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

/**
 * One workflow param against the brief — `true` when deterministically filled.
 *
 * Fail-closed on the detector itself: a spec with no `pattern` and no
 * `defaultValue` is reported MISSING, never accepted on "the mapped text is
 * non-empty". Most card params map onto the same shared brief fields, so an
 * emptiness test would pass a whole card on one sentence of context — a false
 * "filled", the unsafe direction. A spec that genuinely cannot be missing
 * declares it with `defaultValue`.
 *
 * Exported for `scripts/measure-manifest.ts`. That instrument reports which
 * specs a brief fills, so it must read THIS verdict rather than re-implement
 * it — a measurement that reproduces the rule it describes drifts from it
 * silently, and would then describe a check that is not the one running.
 */
/**
 * `true` when the brief ANSWERS this parameter by naming it — the `Label: value`
 * form the catalog's own quick-start blocks teach the operator to write
 * ("- Engagement type: [to fill in]", "- Audit origin: [Preventive / Inspection
 * / Due diligence]").
 *
 * WHY THIS EXISTS. Card values are ordinary English — Scoping, Build, Training,
 * Support, Team, Neutral, Demo — so every detector narrows them to a qualified
 * form ("a scoping engagement"), which is right for PROSE and wrong for the form
 * the card teaches. Measured across the eight manifests: 22 card values were
 * refused when written the way the card writes them, and the mismatch is between
 * the catalog and this runtime, not inside either. Patching 22 regular
 * expressions would encode the same rule twenty-two times; this reads the label
 * the specification already carries.
 *
 * TWO GUARDS, both load-bearing:
 *   - CONJUNCTIONS ARE EXCLUDED BY CONSTRUCTION. The label matched is the spec's
 *     own `card`, qualifier included, so a brief writing the LINE label —
 *     "Client: Acme" — answers none of `Client (name)`, `(sector)`, `(size)`.
 *     It says which company, not which sector or size, and filling all three
 *     halves from one fact is the hollow pass splitting exists to prevent.
 *   - THE VALUE MUST BE AFFIRMATIVE. `affirmativeString` rejects the in-band
 *     refusals ("TBD", "to be defined", "unknown", "n/a"), so declaring a label
 *     with nothing behind it is not an answer. A card-sanctioned unknown still
 *     passes, because `sanctionedUnknown` is tested before this.
 */
function labelDeclared(text: string, card: string): boolean {
  // No conjunction guard is written here, and that is deliberate: the label
  // matched is the specification's OWN `card` string, qualifier included
  // (`Client (name)`), so a brief writing the LINE label — "Client: Acme" —
  // matches none of the three halves. The exclusion is structural rather than
  // conditional. A guard was drafted (`if (/\(.*\)$/.test(card)) return false`)
  // and removed once falsification showed it changed nothing: dropping it turned
  // no test red, because the case it claimed to stop cannot arise. A dead
  // alternative reads as a guard being applied — the WF-007 `Sensitivities`
  // lesson. ⚠️ If this ever matches on a BASE label instead, the guard has to
  // come back, and the test below is what will say so.
  const label = card.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const declared = new RegExp(`\\b${label}\\s*[:\u2014-]\\s*([^.;\\n]+)`, "i").exec(text);
  return declared !== null && affirmativeString(declared[1]);
}

export function paramFilled(
  brief: NeedBrief,
  spec: ParamManifest["params"][number],
): boolean {
  if (spec.defaultValue !== undefined) return true;
  const text = spec.mapping(brief);
  if (spec.sanctionedUnknown?.test(text)) return true;
  if (spec.pattern?.test(text) === true) return true;
  return labelDeclared(text, spec.card);
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

  // Surface the CARD label, not the internal key: PARAMS_MISSING is read by the
  // operator who has to amend the brief, and the card labels are business
  // vocabulary by construction (copied verbatim from the catalog card). `name`
  // stays the internal identifier and is never shown here.
  const missing = manifest.params
    .filter((p) => p.required && !paramFilled(brief, p))
    .map((p) => p.card);
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
