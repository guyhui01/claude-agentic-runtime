/**
 * Câblage du run de la spine WF-001 (§2.4-B.3, étape 2) — assemble le manifeste
 * réel (`WF_001_CADRAGE_MANIFEST`) en `SpineStep[]` via `loadSpine`, puis le
 * déroule avec `runSpine` branché sur le runner `query()` (`createQueryRunner`).
 *
 * C'est le point d'entrée du run de bout en bout. Il reste PUR vis-à-vis de
 * l'orchestrateur (qui ne change pas) : ce module ne fait qu'assembler les
 * briques existantes (manifeste + registre + résolveur d'agent + runner).
 *
 * Injection :
 *   - `resolveAgent` : en prod = `toAgentDefinition(asset, catalogRoot)` (lit la
 *     prose du catalogue, ADR-0001 read-only) ; en test = stub injecté.
 *   - `runnerDeps`   : transmis tel quel à `createQueryRunner` (caps, env, et
 *     `query` injectable → test hermétique sans réseau ni appel facturé).
 *
 * ⚠️ Run LIVE réel : il ne s'exécute que si l'appelant fournit le `query()` du
 * SDK (défaut de `createQueryRunner`) AVEC un sidecar réel + l'auth OAuth
 * abonnement (jamais `ANTHROPIC_API_KEY`, garde portée par le runner) — à lancer
 * sur accord explicite + run observé (NEXT_STEPS §2.4-B.3).
 */

import type { Sidecar } from "../sidecar/types.js";
import type { SpineStep, SpineResult } from "../orchestrator/types.js";
import { loadSpine, type AgentResolver } from "../manifest/load-manifest.js";
import { runSpine } from "../orchestrator/run-spine.js";
import { toAgentDefinition } from "../sdk/to-agent-definition.js";
import { createQueryRunner, type QueryRunnerDeps } from "../sdk/query-runner.js";
import {
  WF_001_CADRAGE_MANIFEST,
  buildWf001CadrageRegistry,
} from "./wf-001-cadrage.js";

/** Erreur de configuration de l'appel (paramètres insuffisants). */
export class Wf001ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Wf001ConfigError";
  }
}

export interface RunWf001Options {
  /** Sidecar du catalogue épinglé (réel en prod, intérimaire en test). */
  sidecar: Sidecar;
  /** Brief client = entrée initiale de la spine. */
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
 * Assemble le backbone WF-001 en `SpineStep[]` (manifeste réel + registre de
 * critères + résolveur). Fail-closed via `loadSpine` (croisements sidecar/registre).
 */
export function assembleWf001Spine(
  sidecar: Sidecar,
  resolveAgent: AgentResolver,
): SpineStep[] {
  return loadSpine(
    WF_001_CADRAGE_MANIFEST,
    sidecar,
    buildWf001CadrageRegistry(),
    resolveAgent,
  );
}

/**
 * Déroule la spine WF-001 de bout en bout : assemblage puis `runSpine` branché
 * sur le runner `query()`. Renvoie le `SpineResult` (traces + verdicts), ou lève
 * pour une config insuffisante / une erreur runner non rattrapée (fail-closed).
 */
export async function runWf001(opts: RunWf001Options): Promise<SpineResult> {
  let resolveAgent: AgentResolver;
  if (opts.resolveAgent) {
    resolveAgent = opts.resolveAgent;
  } else {
    const root = opts.catalogRoot;
    if (root === undefined) {
      throw new Wf001ConfigError(
        "runWf001 : fournir `catalogRoot` (résolution via toAgentDefinition) ou `resolveAgent`.",
      );
    }
    resolveAgent = (asset) => toAgentDefinition(asset, root);
  }

  const steps = assembleWf001Spine(opts.sidecar, resolveAgent);
  const runner = createQueryRunner(opts.runnerDeps);
  return runSpine(steps, runner, opts.initialInput ?? {});
}
