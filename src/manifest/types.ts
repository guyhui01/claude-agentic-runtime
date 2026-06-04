/**
 * Manifeste de spine (ADR-0007, §2.4-B.2) — propriété du RUNTIME.
 *
 * Décrit *comment exécuter* une spine (ordre des étapes, contrat I/O, critères),
 * par opposition au sidecar qui décrit *ce qui existe* (ADR-0003, inchangé).
 *
 * Séparation des natures (le fait décisif d'ADR-0007) :
 *   - le **contrat** est de la DONNÉE (JSON Schema) → porté inline ici ;
 *   - les **critères** sont du CODE → référencés par `id`, résolus via le
 *     `CriterionRegistry`.
 *
 * Le `loadSpine` croise `assetId` avec le sidecar (l'asset existe et est un
 * agent) pour garantir la cohérence SSOT, fail-closed.
 */

import type { JsonSchema } from "../handoff/types.js";

/** Une étape du manifeste : pointe un asset du catalogue + son contrat + ses critères. */
export interface ManifestStep {
  /** id logique de l'étape dans la spine (devient `provenance.stepId` et `contract.stepId`). */
  stepId: string;
  /** id d'un asset agent du sidecar à exécuter (croisé fail-closed au chargement). */
  assetId: string;
  /** Schéma d'entrée (absent = étape d'amorce). */
  input?: JsonSchema;
  /** Schéma de sortie promis par l'étape. */
  output: JsonSchema;
  /** `id` de critères d'eval gate, résolus via le registre. */
  criteriaIds: string[];
}

/** Manifeste complet d'une spine ordonnée. */
export interface SpineManifest {
  spineId: string;
  steps: ManifestStep[];
}
