/**
 * WF-004 spine-loading fixtures — SHARED interim sidecar + resolver + mock runner.
 *
 * Extracted from `spine-wf-004.test.ts` (verbatim, no behavior change) so the
 * hermetic spine test AND the discrimination audit (`spine-wf-004-discrimination.test.ts`)
 * load the spine from one source. In prod (§2.4-B.4) this sidecar comes from
 * `claude-agents` via the §2.3 generator; here it is the 6 backbone agents only.
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

/** The 6 WF-004 backbone agents (CONSULTANT-IA → FINANCIAL-ANALYST → CDO-DIRECTEUR-IA → CHANGE-MANAGER → FORMATEUR-IA → REDACTEUR-IA). */
export const wf004InterimSidecar: Sidecar = {
  schemaVersion: "1.0.0",
  catalog: { name: "claude-agents", version: "v4.1.0" },
  generatedAt: "2026-07-11T00:00:00Z",
  assets: [
    agentAsset("AGENT-CONSULTANT-IA"),
    agentAsset("AGENT-FINANCIAL-ANALYST"),
    agentAsset("AGENT-CDO-DIRECTEUR-IA"),
    agentAsset("AGENT-CHANGE-MANAGER"),
    agentAsset("AGENT-FORMATEUR-IA"),
    agentAsset("AGENT-REDACTEUR-IA"),
  ],
};

/** Mock resolver: the prose→AgentDefinition mapping is covered by sdk-adapter.test.ts. */
export const wf004ResolveAgent: AgentResolver = (asset): AgentDefinition => ({
  description: asset.description,
  prompt: `stub:${asset.id}`,
  tools: [],
});

/** Runner that returns pre-baked outputs keyed by stepId (zero network). */
export const mockRunner = (outputs: Record<string, unknown>): StepRunner =>
  async ({ stepId }) => ({ output: outputs[stepId] });
