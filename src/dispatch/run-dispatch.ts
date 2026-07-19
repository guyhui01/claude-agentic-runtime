/**
 * V0 dispatch pipeline (plan §2): validated brief → deterministic completeness
 * check → LLM route proposal → deterministic validation → execution plan —
 * then STOP. The human go/no-go and the spine launch stay separate human
 * commands (the billed gate is never crossed by this module).
 *
 * Bounded retry (plan §2): ONE re-ask when the router's answer is shape-
 * invalid (MALFORMED_OUTPUT only), then fail-closed. An invented workflow id
 * is NOT retried — it is a router-quality signal the live harness must see.
 */

import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import { createQueryRunner } from "../sdk/query-runner.js";
import type { StepRunner } from "../orchestrator/types.js";
import type { Sidecar } from "../sidecar/types.js";
import { checkCompleteness } from "./completeness-check.js";
import { buildRouterPrompt } from "./router-prompt.js";
import { validateRoute, ROUTER_OUTPUT_SCHEMA } from "./validate-route.js";
import { WF001_MANIFEST } from "./manifests/wf-001.js";
import { buildPlan, type ExecutionPlan } from "./plan.js";
import type {
  CompletenessIssue,
  ParamManifest,
  RouteIssue,
} from "./types.js";

/** V0 manifest registry — WF-001 only (plan §6: the other nine are V1). */
export const DEFAULT_MANIFESTS: Readonly<Record<string, ParamManifest>> = {
  "WF-001": WF001_MANIFEST,
};

/** Final outcome of one dispatch pass — every variant is shown to the operator. */
export type DispatchOutcome =
  | { status: "REJECT_INCOMPLETE"; issues: CompletenessIssue[] }
  | { status: "REJECT_ROUTER_OUTPUT"; issues: RouteIssue[] }
  | { status: "NO_MATCH"; rationale: string; nearestMiss?: string }
  | { status: "PARAMS_MISSING"; route: string; missingParams: string[] }
  | {
      status: "ROUTED";
      route: string;
      rationale: string;
      paramsChecked: boolean;
      /** For the human go/no-go — duration/model verbatim from the card. */
      plan: ExecutionPlan;
    };

export interface RunDispatchOptions {
  sidecar: Sidecar;
  /** Catalog checkout root — the plan reads the routed card there (read-only). */
  catalogRoot: string;
  /** Runner for the single router call (default: the guarded SDK query runner). */
  runner?: StepRunner;
  /** Model for the router call (live routing decision — not the catalog's `modele_recommande`). */
  model?: string;
  manifests?: Readonly<Record<string, ParamManifest>>;
  /** Plan builder, injectable for hermetic tests (default: read the real card). */
  planBuilder?: typeof buildPlan;
}

function routerAgent(sidecar: Sidecar, model?: string): AgentDefinition {
  const def: AgentDefinition = {
    description: "WF-000 dispatch router — proposes at most one workflow for a validated brief",
    prompt: buildRouterPrompt(sidecar),
    tools: [], // a single completion: the router needs no tool
  };
  if (model !== undefined) def.model = model;
  return def;
}

function onlyMalformed(issues: RouteIssue[]): boolean {
  return issues.every((i) => i.code === "MALFORMED_OUTPUT");
}

/** Runs one dispatch pass. Never launches a spine — the go/no-go is human. */
export async function runDispatch(
  rawBrief: unknown,
  opts: RunDispatchOptions,
): Promise<DispatchOutcome> {
  const completeness = checkCompleteness(rawBrief);
  if (completeness.status === "REJECT_INCOMPLETE") return completeness;
  const { brief } = completeness;

  const runner = opts.runner ?? createQueryRunner();
  const manifests = opts.manifests ?? DEFAULT_MANIFESTS;
  const planBuilder = opts.planBuilder ?? buildPlan;
  const agent = routerAgent(opts.sidecar, opts.model);

  const propose = async (): Promise<unknown> =>
    (
      await runner({
        stepId: "ROUTER",
        agent,
        input: brief,
        outputSchema: ROUTER_OUTPUT_SCHEMA as unknown as Record<string, unknown>,
      })
    ).output;

  let decision = validateRoute(await propose(), brief, opts.sidecar, manifests);
  if (decision.status === "REJECT_ROUTER_OUTPUT" && onlyMalformed(decision.issues)) {
    // Bounded retry: one re-ask on a shape-invalid answer, then fail-closed.
    decision = validateRoute(await propose(), brief, opts.sidecar, manifests);
  }

  if (decision.status !== "ROUTED") return decision;

  const asset = opts.sidecar.assets.find(
    (a) => a.id === decision.route && a.type === "workflow",
  );
  // validateRoute guarantees the asset exists; the check keeps the read fail-closed.
  if (asset === undefined) {
    return {
      status: "REJECT_ROUTER_OUTPUT",
      issues: [
        { code: "UNKNOWN_WORKFLOW", message: `routed "${decision.route}" vanished from the sidecar` },
      ],
    };
  }

  return { ...decision, plan: planBuilder(asset, opts.catalogRoot) };
}
