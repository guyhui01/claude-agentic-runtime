/**
 * WF-008 spine-loading fixtures — SHARED interim sidecar + resolver + mock runner.
 *
 * Extracted from `spine-wf-008.test.ts` (verbatim, no behavior change) so the
 * hermetic spine test AND the discrimination audit (`spine-wf-008-discrimination.test.ts`)
 * load the spine from one source. In prod (§2.4-B.4) this sidecar comes from
 * `claude-agents` via the §2.3 generator; here it is the 8 backbone agents only
 * (7 core + the AUDIT-METHODO-IA counter-review gate).
 */

import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import type { AgentResolver } from "../../src/manifest/load-manifest.js";
import type { StepRunner } from "../../src/orchestrator/types.js";
import type { Sidecar } from "../../src/sidecar/types.js";

function agentAsset(id: string) {
  return {
    id,
    type: "agent" as const,
    path: `${id}.md`,
    title: id,
    description: `Agent ${id}.`,
    catalogVersion: "v4.1.0",
    source: { file: `${id}.md`, catalogTag: "v4.1.0" },
  };
}

/** The 8 WF-008 backbone agents (JURIDIQUE-IA → AI-ARCHITECT → SECURITE-IA → DATA-ENGINEER → CDO-DIRECTEUR-IA → CHANGE-MANAGER → AUDIT-METHODO-IA → REDACTEUR-IA). */
export const wf008InterimSidecar: Sidecar = {
  schemaVersion: "1.0.0",
  catalog: { name: "claude-agents", version: "v4.1.0" },
  generatedAt: "2026-07-10T14:00:00Z",
  assets: [
    agentAsset("AGENT-JURIDIQUE-IA"),
    agentAsset("AGENT-AI-ARCHITECT"),
    agentAsset("AGENT-SECURITE-IA"),
    agentAsset("AGENT-DATA-ENGINEER"),
    agentAsset("AGENT-CDO-DIRECTEUR-IA"),
    agentAsset("AGENT-CHANGE-MANAGER"),
    agentAsset("AGENT-AUDIT-METHODO-IA"),
    agentAsset("AGENT-REDACTEUR-IA"),
  ],
};

/** Mock resolver: the prose→AgentDefinition mapping is covered by sdk-adapter.test.ts. */
export const wf008ResolveAgent: AgentResolver = (asset): AgentDefinition => ({
  description: asset.description,
  prompt: `stub:${asset.id}`,
  tools: [],
});

/** Runner that returns pre-baked outputs keyed by stepId (zero network). */
export const mockRunner = (outputs: Record<string, unknown>): StepRunner =>
  async ({ stepId }) => ({ output: outputs[stepId] });
