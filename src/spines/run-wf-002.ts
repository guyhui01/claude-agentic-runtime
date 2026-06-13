/**
 * Câblage du run de la spine WF-002 « Delivery Agile SAFe » (§2.4-B.4) — assemble
 * le manifeste réel (`WF_002_DELIVERY_MANIFEST`) en `SpineStep[]` via `loadSpine`,
 * puis le déroule avec `runSpine` branché sur le runner `query()` (`createQueryRunner`).
 *
 * Strictement calqué sur `run-wf-001.ts` (même contrat d'injection, mêmes gardes) :
 * l'orchestrateur ne change pas, ce module ne fait qu'assembler manifeste + registre
 * + résolveur d'agent + runner.
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
import { runSpine, type StepProgressHook } from "../orchestrator/run-spine.js";
import { toAgentDefinition } from "../sdk/to-agent-definition.js";
import { createQueryRunner, type QueryRunnerDeps } from "../sdk/query-runner.js";
import {
  WF_002_DELIVERY_MANIFEST,
  buildWf002DeliveryRegistry,
} from "./wf-002-delivery.js";

/** Erreur de configuration de l'appel (paramètres insuffisants). */
export class Wf002ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Wf002ConfigError";
  }
}

export interface RunWf002Options {
  /** Sidecar du catalogue épinglé (réel en prod, intérimaire en test). */
  sidecar: Sidecar;
  /** Contexte ART = entrée initiale de la spine. */
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
  /** Hook d'observabilité par étape (progression d'un run live long). */
  onStep?: StepProgressHook;
}

/**
 * Assemble le backbone WF-002 en `SpineStep[]` (manifeste réel + registre de
 * critères + résolveur). Fail-closed via `loadSpine` (croisements sidecar/registre).
 */
export function assembleWf002Spine(
  sidecar: Sidecar,
  resolveAgent: AgentResolver,
): SpineStep[] {
  return loadSpine(
    WF_002_DELIVERY_MANIFEST,
    sidecar,
    buildWf002DeliveryRegistry(),
    resolveAgent,
  );
}

/**
 * Déroule la spine WF-002 de bout en bout : assemblage puis `runSpine` branché
 * sur le runner `query()`. Renvoie le `SpineResult`, ou lève pour une config
 * insuffisante / une erreur runner non rattrapée (fail-closed).
 */
export async function runWf002(opts: RunWf002Options): Promise<SpineResult> {
  let resolveAgent: AgentResolver;
  if (opts.resolveAgent) {
    resolveAgent = opts.resolveAgent;
  } else {
    const root = opts.catalogRoot;
    if (root === undefined) {
      throw new Wf002ConfigError(
        "runWf002 : fournir `catalogRoot` (résolution via toAgentDefinition) ou `resolveAgent`.",
      );
    }
    resolveAgent = (asset) => toAgentDefinition(asset, root);
  }

  const steps = assembleWf002Spine(opts.sidecar, resolveAgent);
  const runner = createQueryRunner(opts.runnerDeps);
  return runSpine(steps, runner, opts.initialInput ?? {}, opts.onStep);
}
