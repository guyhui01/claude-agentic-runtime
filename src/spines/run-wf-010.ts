/**
 * Wiring for the WF-010 "Project Post-mortem / Lessons Learned" spine run (§2.4-B.4) —
 * assembles the real manifest (`WF_010_POST_MORTEM_MANIFEST`) into `SpineStep[]` via
 * `loadSpine`, then runs it with `runSpine` wired to the `query()` runner.
 *
 * Strictly modeled on `run-wf-007.ts` (same injection contract, same guards): the
 * orchestrator does not change, this module assembles manifest + registry + agent
 * resolver + runner.
 *
 * Injection:
 *   - `resolveAgent`: prod = `toAgentDefinition(asset, catalogRoot)` (real prose,
 *     ADR-0001 read-only); tests = injected stub.
 *   - `runnerDeps`  : passed to `createQueryRunner` (caps, env, injectable `query`
 *     → hermetic test with no network or billed call).
 *
 * ⚠️ Real LIVE run: only with the SDK's `query()` + a real sidecar + OAuth
 * subscription (never `ANTHROPIC_API_KEY`, a runner guard) — on explicit approval
 * + an observed run. The catalog's `modele_recommande` is `claude-sonnet-5`, but the
 * live PROOF is routed to a top-tier model DESIGNATED BY THE USER (agent/workflow
 * tasks → performant model; a weaker model degrades trace hygiene — WF-005 lesson);
 * route it via `model`.
 */

import type { Sidecar } from "../sidecar/types.js";
import type { SpineStep, SpineResult } from "../orchestrator/types.js";
import { loadSpine, type AgentResolver } from "../manifest/load-manifest.js";
import { runSpine, type StepProgressHook } from "../orchestrator/run-spine.js";
import { toAgentDefinition } from "../sdk/to-agent-definition.js";
import { createQueryRunner, type QueryRunnerDeps } from "../sdk/query-runner.js";
import {
  WF_010_POST_MORTEM_MANIFEST,
  buildWf010PostMortemRegistry,
} from "./wf-010-post-mortem.js";

/** Call configuration error (insufficient parameters). */
export class Wf010ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Wf010ConfigError";
  }
}

export interface RunWf010Options {
  /** Pinned catalog sidecar (real in prod, interim in tests). */
  sidecar: Sidecar;
  /** Post-mortem context = the spine's initial input. */
  initialInput?: unknown;
  /**
   * Catalog root used to read the agents' prose (`toAgentDefinition`).
   * Required unless `resolveAgent` is provided.
   */
  catalogRoot?: string;
  /** Injected agent resolver (tests); otherwise derived from `catalogRoot`. */
  resolveAgent?: AgentResolver;
  /** `query()` runner dependencies (caps/env/injectable query). */
  runnerDeps?: QueryRunnerDeps;
  /** Per-step observability hook (progress of a long live run). */
  onStep?: StepProgressHook;
  /**
   * Model override applied to EVERY step agent (SDK alias or a full model id).
   * Only used when the resolver is derived from `catalogRoot`; an injected
   * `resolveAgent` owns its definitions entirely. Rationale: route live runs to the
   * user-designated performant model.
   */
  model?: string;
}

/**
 * Assembles the WF-010 backbone into `SpineStep[]` (real manifest + criteria
 * registry + resolver). Fail-closed via `loadSpine` (sidecar/registry cross-checks).
 */
export function assembleWf010Spine(
  sidecar: Sidecar,
  resolveAgent: AgentResolver,
): SpineStep[] {
  return loadSpine(
    WF_010_POST_MORTEM_MANIFEST,
    sidecar,
    buildWf010PostMortemRegistry(),
    resolveAgent,
  );
}

/**
 * Runs the WF-010 spine end to end: assembly then `runSpine` wired to the
 * `query()` runner. Returns the `SpineResult`, or throws on insufficient config /
 * an uncaught runner error (fail-closed).
 */
export async function runWf010(opts: RunWf010Options): Promise<SpineResult> {
  let resolveAgent: AgentResolver;
  if (opts.resolveAgent) {
    resolveAgent = opts.resolveAgent;
  } else {
    const root = opts.catalogRoot;
    if (root === undefined) {
      throw new Wf010ConfigError(
        "runWf010: provide `catalogRoot` (resolution via toAgentDefinition) or `resolveAgent`.",
      );
    }
    const overrides = opts.model === undefined ? {} : { model: opts.model };
    resolveAgent = (asset) => toAgentDefinition(asset, root, overrides);
  }

  const steps = assembleWf010Spine(opts.sidecar, resolveAgent);
  const runner = createQueryRunner(opts.runnerDeps);
  return runSpine(steps, runner, opts.initialInput ?? {}, opts.onStep);
}
