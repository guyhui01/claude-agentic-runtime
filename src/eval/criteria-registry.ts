/**
 * Eval gate criteria registry (ADR-0007, §2.4-B.2).
 *
 * Criteria stay CODE (`Criterion.check` = deterministic predicate), not
 * serializable into the sidecar. The spine manifest therefore carries only
 * **`id`** values; this registry resolves an `id` to the real `Criterion`.
 * Fail-closed: an unknown `id` is a breakage (an expected criterion is
 * missing) → we throw.
 */

import type { Criterion } from "./types.js";

/** Thrown when one or more criterion `id` values are not registered. */
export class UnknownCriterionError extends Error {
  readonly ids: string[];

  constructor(ids: string[]) {
    super(`Criterion(s) unknown to the registry: ${ids.join(", ")}`);
    this.name = "UnknownCriterionError";
    this.ids = ids;
  }
}

/** id → Criterion registry. Registration rejects duplicates (fail-closed). */
export class CriterionRegistry {
  private readonly byId = new Map<string, Criterion>();

  /** Registers a criterion. @throws if the `id` is already taken (collision = ambiguity). */
  register(criterion: Criterion): this {
    if (this.byId.has(criterion.id)) {
      throw new Error(`criterion already registered: "${criterion.id}"`);
    }
    this.byId.set(criterion.id, criterion);
    return this;
  }

  /** Registers a list of criteria (short-circuits on the first duplicate). */
  registerAll(criteria: readonly Criterion[]): this {
    for (const c of criteria) this.register(c);
    return this;
  }

  has(id: string): boolean {
    return this.byId.has(id);
  }

  get(id: string): Criterion | undefined {
    return this.byId.get(id);
  }

  /**
   * Resolves a list of `id` values to `Criterion` objects, in the requested order.
   * Fail-closed: aggregates ALL missing `id` values before throwing.
   * @throws {UnknownCriterionError}
   */
  resolve(ids: readonly string[]): Criterion[] {
    const missing = ids.filter((id) => !this.byId.has(id));
    if (missing.length > 0) throw new UnknownCriterionError(missing);
    return ids.map((id) => this.byId.get(id)!);
  }
}
