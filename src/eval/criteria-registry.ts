/**
 * Registre de critères d'eval gate (ADR-0007, §2.4-B.2).
 *
 * Les critères restent du CODE (`Criterion.check` = prédicat déterministe), non
 * sérialisable en sidecar. Le manifeste de spine ne porte donc que des **`id`** ;
 * c'est ce registre qui résout un `id` vers le `Criterion` réel. Fail-closed :
 * un `id` inconnu est une rupture (un critère attendu manque) → on lève.
 */

import type { Criterion } from "./types.js";

/** Levée quand un ou plusieurs `id` de critères ne sont pas enregistrés. */
export class UnknownCriterionError extends Error {
  readonly ids: string[];

  constructor(ids: string[]) {
    super(`Critère(s) inconnu(s) du registre : ${ids.join(", ")}`);
    this.name = "UnknownCriterionError";
    this.ids = ids;
  }
}

/** Registre id → Criterion. L'enregistrement refuse les doublons (fail-closed). */
export class CriterionRegistry {
  private readonly byId = new Map<string, Criterion>();

  /** Enregistre un critère. @throws si l'`id` est déjà pris (collision = ambiguïté). */
  register(criterion: Criterion): this {
    if (this.byId.has(criterion.id)) {
      throw new Error(`critère déjà enregistré : "${criterion.id}"`);
    }
    this.byId.set(criterion.id, criterion);
    return this;
  }

  /** Enregistre une liste de critères (court-circuite sur le premier doublon). */
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
   * Résout une liste d'`id` vers les `Criterion`, dans l'ordre demandé.
   * Fail-closed : agrège TOUS les `id` manquants avant de lever.
   * @throws {UnknownCriterionError}
   */
  resolve(ids: readonly string[]): Criterion[] {
    const missing = ids.filter((id) => !this.byId.has(id));
    if (missing.length > 0) throw new UnknownCriterionError(missing);
    return ids.map((id) => this.byId.get(id)!);
  }
}
