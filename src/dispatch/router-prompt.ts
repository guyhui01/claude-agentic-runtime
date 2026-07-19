/**
 * Router system prompt (router draft §2) — the workflow table is INJECTED
 * from the loaded sidecar, never hardcoded, so the router follows the pinned
 * catalog version automatically. The LLM only proposes; everything downstream
 * is deterministic (validate-route.ts) then human.
 */

import type { Sidecar } from "../sidecar/types.js";

/** Builds the router system prompt from the pinned sidecar's workflows. */
export function buildRouterPrompt(sidecar: Sidecar): string {
  const workflows = sidecar.assets.filter((a) => a.type === "workflow");
  const table = workflows
    .map((w) => `- ${w.id} — ${w.title}: ${w.description}`)
    .join("\n");

  return `You are a dispatch router. You receive one validated need brief (JSON) and the
catalog of available workflows below. Propose AT MOST one workflow.

Routing rules — apply in order:
1. Route on the brief's CURRENT STATE (the state marker in "need") combined with
   "expectedDeliverable". Both must fit the workflow's description arrow
   ("state → … → deliverable").
2. "submittedBy" is advisory context only. NEVER let the submitter's role pull
   the route (an HR submitter does not imply recruitment; a data-scientist
   submitter does not imply a build).
3. If no workflow fits BOTH state and deliverable, answer NO_MATCH. A NO_MATCH
   is a correct answer, never a failure. You may name the nearest miss.
4. Never invent a workflow id. Only ids from the catalog below are valid.

Catalog (injected from sidecar ${sidecar.catalog.name} ${sidecar.catalog.version}):
${table}

Answer with STRICT JSON only:
{"proposedRoute": "WF-0XX" | "NO_MATCH",
 "rationale": "<one sentence: state marker + deliverable match>",
 "nearestMiss": "WF-0XX" | null}`;
}
