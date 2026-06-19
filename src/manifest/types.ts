/**
 * Spine manifest (ADR-0007, §2.4-B.2) — owned by the RUNTIME.
 *
 * Describes *how to run* a spine (step order, I/O contract, criteria), as
 * opposed to the sidecar which describes *what exists* (ADR-0003, unchanged).
 *
 * Separation of natures (the decisive fact of ADR-0007):
 *   - the **contract** is DATA (JSON Schema) → carried inline here;
 *   - the **criteria** are CODE → referenced by `id`, resolved via the
 *     `CriterionRegistry`.
 *
 * `loadSpine` cross-checks `assetId` against the sidecar (the asset exists and
 * is an agent) to guarantee SSOT consistency, fail-closed.
 */

import type { JsonSchema } from "../handoff/types.js";

/** A manifest step: points to a catalog asset + its contract + its criteria. */
export interface ManifestStep {
  /** logical id of the step in the spine (becomes `provenance.stepId` and `contract.stepId`). */
  stepId: string;
  /** id of an agent asset in the sidecar to run (cross-checked fail-closed at load time). */
  assetId: string;
  /** Input schema (absent = seed step). */
  input?: JsonSchema;
  /** Output schema promised by the step. */
  output: JsonSchema;
  /** Eval gate criteria `id` values, resolved via the registry. */
  criteriaIds: string[];
}

/** Complete manifest of an ordered spine. */
export interface SpineManifest {
  spineId: string;
  steps: ManifestStep[];
}
