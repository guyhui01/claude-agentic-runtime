/**
 * Served-model recorder for live harnesses. Wraps a `query()` (default: the SDK's) and passes
 * every message through unchanged, noting two things the SDK reports, so a trace can name the
 * model it was produced by instead of the model that was asked for (an alias, an env var or a
 * default proves nothing about the model served):
 *   - `mainLoopModels`: the `model` of each `assistant` message — the model that wrote the answer;
 *   - `servedModels`: the ids keyed in each result's `modelUsage` — EVERY model call the query made,
 *     internal ones included (sdk.d.ts: "main loop, Task subagents, sidechains, and internal
 *     calls"). Measured 2026-11-24: a router call pinned to `claude-opus-5-5` also lists
 *     `claude-haiku-5-5` there, while every assistant message came from Opus. Compare runs on
 *     `mainLoopModels`; `servedModels` is what was billed.
 */
import { query as sdkQuery } from "@anthropic-ai/claude-agent-sdk";
import type { QueryFn } from "../src/sdk/query-runner.js";

export interface ServedModelRecorder {
  /** Drop-in `query()` for `QueryRunnerDeps.query`. */
  query: QueryFn;
  /** Models of the `assistant` messages seen so far, sorted, deduplicated. */
  mainLoopModels: () => string[];
  /** Model ids keyed in `modelUsage` so far (all calls, internal ones included), sorted, deduplicated. */
  servedModels: () => string[];
}

export function recordServedModels(base: QueryFn = sdkQuery as unknown as QueryFn): ServedModelRecorder {
  const seen = new Set<string>();
  const mainLoop = new Set<string>();
  const query: QueryFn = (params) =>
    (async function* () {
      for await (const message of base(params)) {
        if (message.type === "assistant") {
          const model = (message as { message?: { model?: unknown } }).message?.model;
          if (typeof model === "string") mainLoop.add(model);
        }
        if (message.type === "result") {
          const usage = (message as { modelUsage?: Record<string, unknown> }).modelUsage;
          for (const id of Object.keys(usage ?? {})) seen.add(id);
        }
        yield message;
      }
    })();
  return { query, mainLoopModels: () => [...mainLoop].sort(), servedModels: () => [...seen].sort() };
}

/** The model a live run asked for, as recorded next to the served ones. */
export function requestedModel(): string {
  return process.env.LIVE_MODEL ?? "default";
}
