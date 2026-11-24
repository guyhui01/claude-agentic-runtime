/**
 * Served-model recorder for live harnesses. Wraps a `query()` (default: the SDK's) and passes
 * every message through unchanged, noting the model ids keyed in each result message's
 * `modelUsage`. Those ids are what the SDK reports it ran, so a trace can name the model it was
 * produced by instead of the model that was asked for: an alias, an env var or a default proves
 * nothing about the model served.
 */
import { query as sdkQuery } from "@anthropic-ai/claude-agent-sdk";
import type { QueryFn } from "../src/sdk/query-runner.js";

export interface ServedModelRecorder {
  /** Drop-in `query()` for `QueryRunnerDeps.query`. */
  query: QueryFn;
  /** Model ids seen so far, sorted, deduplicated. Empty if no result carried `modelUsage`. */
  servedModels: () => string[];
}

export function recordServedModels(base: QueryFn = sdkQuery as unknown as QueryFn): ServedModelRecorder {
  const seen = new Set<string>();
  const query: QueryFn = (params) =>
    (async function* () {
      for await (const message of base(params)) {
        if (message.type === "result") {
          const usage = (message as { modelUsage?: Record<string, unknown> }).modelUsage;
          for (const id of Object.keys(usage ?? {})) seen.add(id);
        }
        yield message;
      }
    })();
  return { query, servedModels: () => [...seen].sort() };
}

/** The model a live run asked for, as recorded next to the served ones. */
export function requestedModel(): string {
  return process.env.LIVE_MODEL ?? "default";
}
