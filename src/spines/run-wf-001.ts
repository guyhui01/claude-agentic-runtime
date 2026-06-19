/**
 * Wiring for the WF-001 spine run (§2.4-B.3, step 2) — assembles the real
 * manifest (`WF_001_CADRAGE_MANIFEST`) into `SpineStep[]` via `loadSpine`, then
 * runs it with `runSpine` wired to the `query()` runner (`createQueryRunner`).
 *
 * This is the end-to-end run entry point. It stays PURE with respect to the
 * orchestrator (which does not change): this module only assembles the existing
 * bricks (manifest + registry + agent resolver + runner).
 *
 * Injection:
 *   - `resolveAgent`: in prod = `toAgentDefinition(asset, catalogRoot)` (reads the
 *     catalog prose, ADR-0001 read-only); in tests = injected stub.
 *   - `runnerDeps`  : passed as-is to `createQueryRunner` (caps, env, and an
 *     injectable `query` → hermetic test with no network or billed call).
 *
 * ⚠️ Real LIVE run: it only executes if the caller provides the SDK's `query()`
 * (the `createQueryRunner` default) WITH a real sidecar + OAuth subscription auth
 * (never `ANTHROPIC_API_KEY`, a guard enforced by the runner) — to be launched on
 * explicit approval + an observed run (NEXT_STEPS §2.4-B.3).
 */

import type { Sidecar } from "../sidecar/types.js";
import type { SpineStep, SpineResult } from "../orchestrator/types.js";
import { loadSpine, type AgentResolver } from "../manifest/load-manifest.js";
import { runSpine, type StepProgressHook } from "../orchestrator/run-spine.js";
import { toAgentDefinition } from "../sdk/to-agent-definition.js";
import { createQueryRunner, type QueryRunnerDeps } from "../sdk/query-runner.js";
import {
  WF_001_CADRAGE_MANIFEST,
  buildWf001CadrageRegistry,
} from "./wf-001-cadrage.js";

/** Call configuration error (insufficient parameters). */
export class Wf001ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Wf001ConfigError";
  }
}

export interface RunWf001Options {
  /** Pinned catalog sidecar (real in prod, interim in tests). */
  sidecar: Sidecar;
  /** Client brief = the spine's initial input. */
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
 * Assembles the WF-001 backbone into `SpineStep[]` (real manifest + criteria
 * registry + resolver). Fail-closed via `loadSpine` (sidecar/registry cross-checks).
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
 * Runs the WF-001 spine end to end: assembly then `runSpine` wired to the
 * `query()` runner. Returns the `SpineResult` (traces + verdicts), or throws on
 * insufficient config / an uncaught runner error (fail-closed).
 */
export async function runWf001(opts: RunWf001Options): Promise<SpineResult> {
  let resolveAgent: AgentResolver;
  if (opts.resolveAgent) {
    resolveAgent = opts.resolveAgent;
  } else {
    const root = opts.catalogRoot;
    if (root === undefined) {
      throw new Wf001ConfigError(
        "runWf001: provide `catalogRoot` (resolution via toAgentDefinition) or `resolveAgent`.",
      );
    }
    resolveAgent = (asset) => toAgentDefinition(asset, root);
  }

  const steps = assembleWf001Spine(opts.sidecar, resolveAgent);
  const runner = createQueryRunner(opts.runnerDeps);
  return runSpine(steps, runner, opts.initialInput ?? {}, opts.onStep);
}
