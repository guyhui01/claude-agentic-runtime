/**
 * Shared helpers for the real spines (§2.4-B.3/B.4) — JSON schema factories
 * (handoff contracts) and defensive-read predicates (eval gate criteria).
 * Factored out of `wf-001-cadrage.ts` to avoid duplication across spines
 * (DRY, maintenance cost).
 *
 * The schemas are JSON Schema 2020-12, compatible with strict ajv (loader §0).
 * The predicates read an `unknown` output without ever throwing (a failing
 * criterion returns `false`, it does not break the gate — see eval-gate.ts).
 */

import type { JsonSchema } from "../handoff/types.js";

// --- Schema factories --------------------------------------------------------

/** Object schema `{ type:"object", required, properties }`. */
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
 * Bounded array of typed items: `{ type:"array", minItems?, maxItems?, items? }`.
 * When the schema is injected into the prompt (run live), `items` + bounds
 * COMMUNICATE the exact contract to the agent — aligning its output with the
 * eval gate criteria.
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

// --- Defensive-read predicates -----------------------------------------------

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

/**
 * Negative sentinels an agent honestly emits when it CANNOT fulfill a field
 * ("None — no candidate can be selected", "N/A", "CANNOT BE ISSUED",
 * "Not applicable — placeholder"). Anchored at the start with a word boundary so a
 * real value ("Nanette", "Noah", "candidate-1") is never mistaken for a refusal.
 */
const NEGATIVE_SENTINEL =
  /^\s*(n\/?a|none|no (candidate|selection|eligible|match|one|shortlist)|not (applicable|available|selected|provided)|unavailable|cannot|can't|tbd|to be (determined|defined|confirmed)|pending|placeholder|unknown|null|undefined)\b/i;

/**
 * `true` if `v` is a non-empty string that is NOT a negative sentinel. A DECISION
 * gate (e.g. "a candidate is selected") must reject "none"/"n/a"/"cannot…" — checking
 * presence alone (`nonEmptyString`) is fooled by an honest in-band refusal.
 */
export function affirmativeString(v: unknown): boolean {
  return nonEmptyString(v) && !NEGATIVE_SENTINEL.test(v.trim());
}

/** Count of array items whose `key` field is an affirmative (non-sentinel) string. */
export function countAffirmativeField(v: unknown, key: string): number {
  if (!Array.isArray(v)) return 0;
  return v.filter((e) => affirmativeString(asRecord(e)[key])).length;
}
