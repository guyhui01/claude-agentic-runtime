/**
 * Câblage du run de la spine WF-003 « Lancement Application IA » (§2.4-B.4) —
 * assemble le manifeste réel (`WF_003_LANCEMENT_MANIFEST`) en `SpineStep[]` via
 * `loadSpine`, puis le déroule avec `runSpine` branché sur le runner `query()`.
 *
 * Strictement calqué sur `run-wf-001.ts` / `run-wf-002.ts` (même contrat
 * d'injection, mêmes gardes) : l'orchestrateur ne change pas, ce module assemble
 * manifeste + registre + résolveur d'agent + runner.
 *
 * Injection :
 *   - `resolveAgent` : prod = `toAgentDefinition(asset, catalogRoot)` (prose réelle,
 *     ADR-0001 read-only) ; test = stub injecté.
 *   - `runnerDeps`   : transmis à `createQueryRunner` (caps, env, `query` injectable
 *     → test hermétique sans réseau ni appel facturé).
 *
 * ⚠️ Run LIVE réel : uniquement avec le `query()` du SDK + sidecar réel + OAuth
 * abonnement (jamais `ANTHROPIC_API_KEY`, garde du runner) — sur accord explicite
 * + run observé (NEXT_STEPS §2.4-B.4).
 */

import type { Sidecar } from "../sidecar/types.js";
import type { SpineStep, SpineResult } from "../orchestrator/types.js";
import { loadSpine, type AgentResolver } from "../manifest/load-manifest.js";
import { runSpine } from "../orchestrator/run-spine.js";
import { toAgentDefinition } from "../sdk/to-agent-definition.js";
import { createQueryRunner, type QueryRunnerDeps } from "../sdk/query-runner.js";
import {
  WF_003_LANCEMENT_MANIFEST,
  buildWf003LancementRegistry,
} from "./wf-003-lancement.js";

/** Erreur de configuration de l'appel (paramètres insuffisants). */
export class Wf003ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Wf003ConfigError";
  }
}

export interface RunWf003Options {
  /** Sidecar du catalogue épinglé (réel en prod, intérimaire en test). */
  sidecar: Sidecar;
  /** Brief projet = entrée initiale de la spine. */
  initialInput?: unknown;
  /**
   * Racine du catalogue pour lire la prose des agents (`toAgentDefinition`).
   * Requis sauf si `resolveAgent` est fourni.
   */
  catalogRoot?: string;
  /** Résolveur d'agent injecté (test) ; à défaut, dérivé de `catalogRoot`. */
  resolveAgent?: AgentResolver;
  /** Dépendances du runner `query()` (caps/env/query injectable). */
  runnerDeps?: QueryRunnerDeps;
}

/**
 * Assemble le backbone WF-003 en `SpineStep[]` (manifeste réel + registre de
 * critères + résolveur). Fail-closed via `loadSpine` (croisements sidecar/registre).
 */
export function assembleWf003Spine(
  sidecar: Sidecar,
  resolveAgent: AgentResolver,
): SpineStep[] {
  return loadSpine(
    WF_003_LANCEMENT_MANIFEST,
    sidecar,
    buildWf003LancementRegistry(),
    resolveAgent,
  );
}

/**
 * Déroule la spine WF-003 de bout en bout : assemblage puis `runSpine` branché
 * sur le runner `query()`. Renvoie le `SpineResult`, ou lève pour une config
 * insuffisante / une erreur runner non rattrapée (fail-closed).
 */
export async function runWf003(opts: RunWf003Options): Promise<SpineResult> {
  let resolveAgent: AgentResolver;
  if (opts.resolveAgent) {
    resolveAgent = opts.resolveAgent;
  } else {
    const root = opts.catalogRoot;
    if (root === undefined) {
      throw new Wf003ConfigError(
        "runWf003 : fournir `catalogRoot` (résolution via toAgentDefinition) ou `resolveAgent`.",
      );
    }
    resolveAgent = (asset) => toAgentDefinition(asset, root);
  }

  const steps = assembleWf003Spine(opts.sidecar, resolveAgent);
  const runner = createQueryRunner(opts.runnerDeps);
  return runSpine(steps, runner, opts.initialInput ?? {});
}
