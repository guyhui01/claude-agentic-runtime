/**
 * Wiring for the WF-008 "AI Act / GDPR Compliance Audit" spine run —
 * assembles the real manifest (`WF_008_AUDIT_MANIFEST`) into `SpineStep[]` via
 * `loadSpine`, then runs it with `runSpine` wired to the `query()` runner.
 *
 * Strictly modeled on `run-wf-003.ts` (same injection contract, same guards):
 * the orchestrator does not change, this module assembles manifest + registry +
 * agent resolver + runner. WF-008 adds no new orchestration primitive — its
 * counter-review clearance gate and its « Unacceptable » tier gateway are both
 * deterministic eval-gate criteria (see `wf-008-audit.ts`), enforced by the
 * existing fail-closed spine.
 *
 * Injection:
 *   - `resolveAgent`: prod = `toAgentDefinition(asset, catalogRoot)` (real prose,
 *     ADR-0001 read-only); tests = injected stub.
 *   - `runnerDeps`  : passed to `createQueryRunner` (caps, env, injectable `query`
 *     → hermetic test with no network or billed call).
 *
 * ⚠️ Real LIVE run: only with the SDK's `query()` + a real sidecar (≥ v4.1.0, the
 * release that carries WF-008's 8 agents) + OAuth subscription (never
 * `ANTHROPIC_API_KEY`, a runner guard) — on explicit approval + an observed run.
 */

import type { Sidecar } from "../sidecar/types.js";
import type { SpineStep, SpineResult } from "../orchestrator/types.js";
import { loadSpine, type AgentResolver } from "../manifest/load-manifest.js";
import { runSpine, type StepProgressHook } from "../orchestrator/run-spine.js";
import { toAgentDefinition } from "../sdk/to-agent-definition.js";
import { createQueryRunner, type QueryRunnerDeps } from "../sdk/query-runner.js";
import {
  WF_008_AUDIT_MANIFEST,
  buildWf008AuditRegistry,
} from "./wf-008-audit.js";

/** Call configuration error (insufficient parameters). */
export class Wf008ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Wf008ConfigError";
  }
}

export interface RunWf008Options {
  /** Pinned catalog sidecar (real in prod, interim in tests). ≥ v4.1.0 required live. */
  sidecar: Sidecar;
  /** Compliance-audit context = the spine's initial input. */
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
   * Model override applied to EVERY step agent (SDK alias like "fable"/"opus",
   * or a full model id). Only used when the resolver is derived from
   * `catalogRoot`; an injected `resolveAgent` owns its definitions entirely.
   * Rationale: route live runs to a model with a separate usage quota.
   */
  model?: string;
}

/**
 * Assembles the WF-008 backbone into `SpineStep[]` (real manifest + criteria
 * registry + resolver). Fail-closed via `loadSpine` (sidecar/registry cross-checks).
 */
export function assembleWf008Spine(
  sidecar: Sidecar,
  resolveAgent: AgentResolver,
): SpineStep[] {
  return loadSpine(
    WF_008_AUDIT_MANIFEST,
    sidecar,
    buildWf008AuditRegistry(),
    resolveAgent,
  );
}

/**
 * Runs the WF-008 spine end to end: assembly then `runSpine` wired to the
 * `query()` runner. Returns the `SpineResult`, or throws on insufficient config /
 * an uncaught runner error (fail-closed).
 */
export async function runWf008(opts: RunWf008Options): Promise<SpineResult> {
  let resolveAgent: AgentResolver;
  if (opts.resolveAgent) {
    resolveAgent = opts.resolveAgent;
  } else {
    const root = opts.catalogRoot;
    if (root === undefined) {
      throw new Wf008ConfigError(
        "runWf008: provide `catalogRoot` (resolution via toAgentDefinition) or `resolveAgent`.",
      );
    }
    const overrides = opts.model === undefined ? {} : { model: opts.model };
    resolveAgent = (asset) => toAgentDefinition(asset, root, overrides);
  }

  const steps = assembleWf008Spine(opts.sidecar, resolveAgent);
  const runner = createQueryRunner(opts.runnerDeps);
  return runSpine(steps, runner, opts.initialInput ?? {}, opts.onStep);
}
