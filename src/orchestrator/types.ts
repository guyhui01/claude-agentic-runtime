/**
 * Types de l'orchestrateur de spine (§2.4-B.1) — déroule une suite d'étapes de
 * workflow (WF-001→002→003) en branchant, sur CHAQUE étape :
 *   - le runner (abstraction injectable de `query()` du Claude Agent SDK) ;
 *   - l'eval gate (brique 2) sur la sortie ;
 *   - les contrats de handoff (brique 1) entre étapes ;
 *   - la provenance (catalogTag / assetId — ISO 25012 crédibilité/actualité).
 *
 * L'orchestrateur est PUR : aucun accès disque ni réseau. Le seul effet de bord
 * (l'exécution d'une étape) passe par le `StepRunner` injecté ; en B.1 il est
 * mocké (hermétique), en B.3 il enveloppera `query()` (OAuth abonnement, caps).
 */

import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import type { StepContract, JsonSchema } from "../handoff/types.js";
import type { Criterion } from "../eval/types.js";
import type { GateReport } from "../eval/types.js";

/** Provenance d'une étape — preuve d'origine catalogue (ADR-0002, ISO 25012). */
export interface StepProvenance {
  /** id de l'étape dans la spine (= `contract.stepId`). */
  stepId: string;
  /** id de l'asset du catalogue exécuté (agent). */
  assetId: string;
  /** Tag épinglé du catalogue dont provient l'asset (`asset.source.catalogTag`). */
  catalogTag: string;
}

/** Appel d'exécution d'une étape passé au runner. */
export interface StepRunCall {
  stepId: string;
  /** Définition d'agent (issue de l'adaptateur §2.4-A) confiée au runner. */
  agent: AgentDefinition;
  /** Entrée de l'étape : sortie de l'étape amont, ou entrée initiale pour l'amorce. */
  input: unknown;
  /**
   * Schéma de sortie attendu (= `contract.output`). Fourni par l'orchestrateur pour
   * que le runner puisse IMPOSER le format à l'agent (instruction « JSON conforme »)
   * et parser sa réponse. Optionnel : un runner mocké peut l'ignorer.
   */
  outputSchema?: JsonSchema;
}

/** Résultat brut d'une étape, tel que rendu par le runner (avant gate/handoff). */
export interface StepRunResult {
  output: unknown;
}

/**
 * Point d'injection abstrayant `query()` du SDK. Faces visibles seulement :
 * une étape entre (agent + input), une sortie sort. Permet un mock hermétique
 * en B.1 et un vrai appel `query()` gardé (OAuth, caps) en B.3, sans toucher
 * au cœur de l'orchestrateur.
 */
export type StepRunner = (call: StepRunCall) => Promise<StepRunResult>;

/** Définition d'une étape de spine : tout ce dont l'orchestrateur a besoin. */
export interface SpineStep {
  provenance: StepProvenance;
  /** Agent à exécuter (construit en amont via `toAgentDefinition`, §2.4-A). */
  agent: AgentDefinition;
  /** Contrat I/O de l'étape (brique 1). `stepId` doit coïncider avec la provenance. */
  contract: StepContract;
  /** Critères d'eval gate appliqués à la sortie (brique 2). */
  criteria: Criterion[];
}

/** Trace d'audit d'une étape franchie : provenance + sortie + rapport de gate. */
export interface StepTrace {
  provenance: StepProvenance;
  output: unknown;
  gate: GateReport;
}

/** Cause d'un arrêt fail-closed de la spine. */
export interface SpineFailure {
  /** stepId de l'étape fautive. */
  stepId: string;
  /** "eval-gate" si la gate a bloqué, "handoff" si la validation I/O a bloqué. */
  kind: "eval-gate" | "handoff";
  /** Message agrégé de l'erreur sous-jacente (EvalGateError / HandoffValidationError). */
  message: string;
}

/**
 * Résultat de l'exécution de la spine. `traces` est TOUJOURS rempli jusqu'à
 * l'étape atteinte (preuve d'audit conservée même en échec — posture ISO 19011).
 */
export interface SpineResult {
  status: "completed" | "failed";
  traces: StepTrace[];
  /** Sortie de la dernière étape, présente uniquement si `status === "completed"`. */
  finalOutput?: unknown;
  /** Cause de l'arrêt, présente uniquement si `status === "failed"`. */
  failure?: SpineFailure;
}
