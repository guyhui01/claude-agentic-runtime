/**
 * Helpers partagés des spines réelles (§2.4-B.3/B.4) — fabriques de schémas
 * JSON (contrats de handoff) et prédicats de lecture défensive (critères d'eval
 * gate). Factorisés depuis `wf-001-cadrage.ts` pour éviter la duplication entre
 * spines (DRY, coût de maintenance).
 *
 * Les schémas sont en JSON Schema 2020-12, compatibles ajv strict (loader §0).
 * Les prédicats lisent une sortie `unknown` sans jamais lever (un critère qui
 * échoue renvoie `false`, il ne casse pas la gate — cf. eval-gate.ts).
 */

import type { JsonSchema } from "../handoff/types.js";

// --- Fabriques de schéma -----------------------------------------------------

/** Schéma objet `{ type:"object", required, properties }`. */
export function objSchema(
  required: string[],
  properties: Record<string, JsonSchema>,
): JsonSchema {
  return { type: "object", required, properties };
}

export const arr: JsonSchema = { type: "array" };
export const str: JsonSchema = { type: "string" };
export const num: JsonSchema = { type: "number" };
export const obj: JsonSchema = { type: "object" };

/**
 * Tableau borné d'items typés : `{ type:"array", minItems?, maxItems?, items? }`.
 * Quand le schéma est injecté au prompt (run live), `items` + bornes COMMUNIQUENT
 * le contrat exact à l'agent — alignant sa sortie sur les critères d'eval gate.
 */
export function arrOf(
  items?: JsonSchema,
  bounds: { min?: number; max?: number } = {},
): JsonSchema {
  const s: JsonSchema = { type: "array" };
  if (items !== undefined) s.items = items;
  if (bounds.min !== undefined) s.minItems = bounds.min;
  if (bounds.max !== undefined) s.maxItems = bounds.max;
  return s;
}

// --- Prédicats de lecture défensive ------------------------------------------

export function asRecord(o: unknown): Record<string, unknown> {
  return (o ?? {}) as Record<string, unknown>;
}

export function nonEmptyArray(v: unknown): v is unknown[] {
  return Array.isArray(v) && v.length > 0;
}

export function arrayLenBetween(v: unknown, min: number, max: number): boolean {
  return Array.isArray(v) && v.length >= min && v.length <= max;
}

export function minArrayLen(v: unknown, min: number): boolean {
  return Array.isArray(v) && v.length >= min;
}

export function nonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export function numberAtLeast(v: unknown, min: number): boolean {
  return isNumber(v) && v >= min;
}
