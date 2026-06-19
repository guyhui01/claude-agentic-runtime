/**
 * Wiring for the WF-002 "SAFe Agile Delivery" spine run (§2.4-B.4) — assembles
 * the real manifest (`WF_002_DELIVERY_MANIFEST`) into `SpineStep[]` via `loadSpine`,
 * then runs it with `runSpine` wired to the `query()` runner (`createQueryRunner`).
 *
 * Strictly modeled on `run-wf-001.ts` (same injection contract, same guards):
 * the orchestrator does not change, this module only assembles manifest + registry
 * + agent resolver + runner.
 *
 * Injection:
 *   - `resolveAgent`: prod = `toAgentDefinition(asset, catalogRoot)` (real prose,
 *     ADR-0001 read-only); tests = injected stub.
 *   - `runnerDeps`  : passed to `createQueryRunner` (caps, env, injectable `query`
 *     → hermetic test with no network or billed call).
 *
 * ⚠️ Real LIVE run: only with the SDK's `query()` + a real sidecar + OAuth
 * subscription (never `ANTHROPIC_API_KEY`, a runner guard) — on explicit approval
 * + an observed run (NEXT_STEPS §2.4-B.4).
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

/** Call configuration error (insufficient parameters). */
export class Wf002ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Wf002ConfigError";
  }
}

export interface RunWf002Options {
  /** Pinned catalog sidecar (real in prod, interim in tests). */
  sidecar: Sidecar;
  /** ART context = the spine's initial input. */
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
}

/**
 * Assembles the WF-002 backbone into `SpineStep[]` (real manifest + criteria
 * registry + resolver). Fail-closed via `loadSpine` (sidecar/registry cross-checks).
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
 * Runs the WF-002 spine end to end: assembly then `runSpine` wired to the
 * `query()` runner. Returns the `SpineResult`, or throws on insufficient config /
 * an uncaught runner error (fail-closed).
 */
export async function runWf002(opts: RunWf002Options): Promise<SpineResult> {
  let resolveAgent: AgentResolver;
  if (opts.resolveAgent) {
    resolveAgent = opts.resolveAgent;
  } else {
    const root = opts.catalogRoot;
    if (root === undefined) {
      throw new Wf002ConfigError(
        "runWf002: provide `catalogRoot` (resolution via toAgentDefinition) or `resolveAgent`.",
      );
    }
    resolveAgent = (asset) => toAgentDefinition(asset, root);
  }

  const steps = assembleWf002Spine(opts.sidecar, resolveAgent);
  const runner = createQueryRunner(opts.runnerDeps);
  return runSpine(steps, runner, opts.initialInput ?? {}, opts.onStep);
}
