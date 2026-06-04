/**
 * Types des contrats de handoff (brique 1) — I/O typé entre étapes de workflow.
 * Référence : ADR-0004 (validation statique des contrats + propagation fail-closed).
 *
 * Le Claude Agent SDK exécute les étapes mais ne garantit PAS que la sortie de
 * l'étape N satisfait l'entrée attendue de l'étape N+1. C'est ce vide — la
 * cohérence I/O inter-étapes — que ce module comble. C'est le cœur de valeur
 * non commoditisé du runtime (cf. docs/NEXT_STEPS.md §2.1).
 */

/** Objet JSON Schema (2020-12) porté par un contrat. Validé via ajv au runtime. */
export type JsonSchema = Record<string, unknown>;

/** Contrat I/O d'une étape de workflow (cf. Sidecar.assets[].id pour `stepId`). */
export interface StepContract {
  /** id de l'étape/asset producteur ou consommateur. */
  stepId: string;
  /** Schéma de ce que l'étape accepte en entrée. Absent = étape d'amorce (pas de handoff entrant). */
  input?: JsonSchema;
  /** Schéma de ce que l'étape promet en sortie. */
  output: JsonSchema;
}

/**
 * Étape de validation d'un handoff :
 *  - `compat`          : vérification statique amont↔aval (design-time) ;
 *  - `producer-output` : le payload runtime respecte la sortie promise par l'amont ;
 *  - `consumer-input`  : le payload runtime respecte l'entrée attendue par l'aval.
 */
export type HandoffStage = "compat" | "producer-output" | "consumer-input";

export interface HandoffIssue {
  stage: HandoffStage;
  code: string;
  message: string;
  /** Chemin JSON (validation runtime) ou nom de champ (compat statique), si applicable. */
  path?: string;
}
