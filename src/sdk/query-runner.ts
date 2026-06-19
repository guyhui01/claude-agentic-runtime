/**
 * `query()` → `StepRunner` adapter (§2.4-B.3, step 2). Wraps the Claude Agent
 * SDK's `query()` function behind the orchestrator's `StepRunner` interface
 * (§2.4-B.1), to enable a LIVE spine run without touching the core of `runSpine`
 * (which stays pure).
 *
 * Dependency injection: `query` is injectable (default = the real SDK `query`),
 * which makes the factory testable OFFLINE (fake `query` → AsyncIterable of
 * messages, zero network), like the rest of the repo.
 *
 * NON-negotiable fail-closed guards (see memory `feedback-budget-quota-abonnement`,
 * ADR-0001 read-only, ISO 19011 stance):
 *   1. ANTHROPIC_API_KEY set ⇒ refusal BEFORE any call (OAuth subscription only,
 *      never a metered key → no per-token billing).
 *   2. `permissionMode: "plan"` FORCED (read-only, not overridable).
 *   3. HARD per-step caps (low `maxBudgetUsd` + low `maxTurns`), never exceeded
 *      even if the agent asks for more.
 *   4. Any non-`success` result (budget/turns/error) ⇒ we throw (fail-closed).
 *
 * ENFORCED output format (§2.4-B.3): when the call carries an `outputSchema`
 * (= `contract.output`), the runner appends an instruction to the prompt asking
 * it to "answer ONLY with JSON conforming to this schema", then PARSES the
 * response into an object. A response not parsable into an object ⇒ we throw
 * (fail-closed): this is the brick that lets eval gates / handoffs (which expect
 * objects) apply to the live run. Without `outputSchema`, unchanged behavior (raw text output).
 */

import { query as sdkQuery } from "@anthropic-ai/claude-agent-sdk";
import type {
  Options,
  SDKMessage,
  SDKResultMessage,
} from "@anthropic-ai/claude-agent-sdk";
import type {
  StepRunner,
  StepRunCall,
  StepRunResult,
} from "../orchestrator/types.js";

/** Runner execution error (fail-closed guard or run failure). */
export class QueryRunnerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QueryRunnerError";
  }
}

/** HARD caps applied to EVERY step — never exceeded. */
export interface QueryRunnerCaps {
  /** Maximum budget per step, in USD. */
  maxBudgetUsd: number;
  /** Maximum number of turns (API round-trips) per step. */
  maxTurns: number;
}

/** Conservative defaults (solo POC, observed run). Overridable via `deps.caps`. */
export const DEFAULT_CAPS: QueryRunnerCaps = {
  maxBudgetUsd: 1.0,
  maxTurns: 8,
};

/** Format instruction appended to the prompt when an `outputSchema` is provided.
 *  NOTE: the returned string stays in French (asserted by query-runner.test.ts → R3 cat B). */
function formatInstruction(schema: object): string {
  return (
    "\n\n---\n" +
    "FORMAT DE SORTIE IMPOSÉ : réponds UNIQUEMENT par un objet JSON valide — " +
    "aucun texte, aucune explication, aucune balise hors du JSON — STRICTEMENT " +
    "conforme à ce JSON Schema :\n" +
    JSON.stringify(schema)
  );
}

/**
 * Parses a text response into a JSON object (fail-closed). Tolerates a bare JSON
 * object, a ```json … ``` fence, or noise around the object. Throws if nothing usable.
 */
export function parseJsonObject(text: string, stepId: string): object {
  const tryParse = (s: string): unknown => {
    try {
      return JSON.parse(s);
    } catch {
      return undefined;
    }
  };
  const trimmed = text.trim();
  let parsed: unknown = tryParse(trimmed);
  if (parsed === undefined) {
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) parsed = tryParse(fence[1]!.trim());
  }
  if (parsed === undefined) {
    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");
    if (first !== -1 && last > first) parsed = tryParse(trimmed.slice(first, last + 1));
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new QueryRunnerError(
      `step "${stepId}": response does not match the enforced format — JSON object expected, ` +
        `received content not parsable into an object.`,
    );
  }
  return parsed;
}

/**
 * Minimal signature of the injected `query()`: a step goes in (prompt + options),
 * a stream of messages comes out. Compatible with the real SDK `query`.
 */
export type QueryFn = (params: {
  prompt: string;
  options?: Options;
}) => AsyncIterable<SDKMessage>;

export interface QueryRunnerDeps {
  /** `query()` to use (default = the SDK's). Injected in tests. */
  query?: QueryFn;
  /** Environment read for the anti-key guard (default = `process.env`). */
  env?: Record<string, string | undefined>;
  /** Override of the hard caps (default = `DEFAULT_CAPS`). */
  caps?: Partial<QueryRunnerCaps>;
}

/**
 * Builds a `StepRunner` wrapping `query()`. The returned runner applies the 4
 * guards above to each step, then extracts the output from the `type:"result"`
 * message (success) or throws (fail-closed).
 */
export function createQueryRunner(deps: QueryRunnerDeps = {}): StepRunner {
  const query: QueryFn = deps.query ?? (sdkQuery as unknown as QueryFn);
  const env = deps.env ?? process.env;
  const caps: QueryRunnerCaps = { ...DEFAULT_CAPS, ...deps.caps };

  return async function queryRunner(
    call: StepRunCall,
  ): Promise<StepRunResult> {
    // Guard 1: never a metered API key — OAuth subscription only.
    if (env.ANTHROPIC_API_KEY) {
      throw new QueryRunnerError(
        `step "${call.stepId}": ANTHROPIC_API_KEY set — execution refused ` +
          `(OAuth subscription only, never a metered key; see budget rule).`,
      );
    }

    const { agent, input } = call;
    let promptText = typeof input === "string" ? input : JSON.stringify(input);
    // Enforced format: we instruct the agent to produce the JSON expected by the step.
    if (call.outputSchema !== undefined) {
      promptText += formatInstruction(call.outputSchema);
    }

    // HARD caps: we ALWAYS cap, even if the agent asks for more.
    const maxTurns = Math.min(agent.maxTurns ?? caps.maxTurns, caps.maxTurns);

    const options: Options = {
      systemPrompt: agent.prompt,
      maxTurns,
      maxBudgetUsd: caps.maxBudgetUsd,
      // Guard 2: read-only forced (ADR-0001), not overridable by the agent.
      permissionMode: "plan",
    };
    if (agent.tools) options.allowedTools = agent.tools;
    if (agent.disallowedTools) options.disallowedTools = agent.disallowedTools;
    if (agent.model) options.model = agent.model;
    // NATIVELY enforced format: the SDK constrains the output to the schema and
    // fills `structured_output` (with its own retries). Far more robust than
    // parsing text — especially for heavy outputs (code) where JSON hand-written
    // by the model breaks easily. The text parsing below stays a safety net if
    // the SDK does not provide `structured_output`.
    if (call.outputSchema !== undefined) {
      options.outputFormat = {
        type: "json_schema",
        schema: call.outputSchema as unknown as Record<string, unknown>,
      };
    }

    let result: SDKResultMessage | undefined;
    for await (const message of query({ prompt: promptText, options })) {
      if (message.type === "result") {
        result = message;
        break;
      }
    }

    // Guard 4: stream with no result, or an error result ⇒ fail-closed.
    if (!result) {
      // NOTE: message kept in French — asserted by query-runner.test.ts (R3 cat B).
      throw new QueryRunnerError(
        `étape "${call.stepId}" : flux terminé sans message de résultat`,
      );
    }
    if (result.subtype !== "success") {
      const details =
        result.errors.length > 0 ? `: ${result.errors.join(" ; ")}` : "";
      throw new QueryRunnerError(
        `step "${call.stepId}": run failed (${result.subtype})${details}`,
      );
    }

    // Success. Prefer the SDK's native structured output if present. Otherwise,
    // if a format is enforced, we PARSE the text into an object (fail-closed); failing
    // that, we return the raw text (historical behavior).
    let output: unknown;
    if (result.structured_output !== undefined) {
      output = result.structured_output;
    } else if (call.outputSchema !== undefined) {
      output = parseJsonObject(result.result, call.stepId);
    } else {
      output = result.result;
    }
    return { output };
  };
}
