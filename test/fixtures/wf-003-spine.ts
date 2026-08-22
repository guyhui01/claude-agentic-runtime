/**
 * WF-003 spine-loading fixtures — SHARED interim sidecar + resolver + mock runner.
 *
 * Extracted from `spine-wf-003.test.ts` (verbatim, no behavior change) so the
 * hermetic spine test AND the discrimination audit (`spine-wf-003-discrimination.test.ts`)
 * load the spine from one source. In prod (§2.4-B.4) this sidecar comes from
 * `claude-agents` via the §2.3 generator; here it is the 7 backbone agents only.
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
    catalogVersion: "v3.25.0",
    source: { file: `${id}.md`, catalogTag: "v3.25.0" },
  };
}

/** The 7 WF-003 backbone agents (FINANCIAL-ANALYST → PROMPT-ENGINEER → AI-ARCHITECT → DEV-PYTHON-IA → QA-AGILE → DEVOPS-CLOUD → SECURITE-IA). */
export const wf003InterimSidecar: Sidecar = {
  schemaVersion: "1.0.0",
  catalog: { name: "claude-agents", version: "v3.25.0" },
  generatedAt: "2026-06-03T14:00:00Z",
  assets: [
    agentAsset("AGENT-FINANCIAL-ANALYST"),
    agentAsset("AGENT-PROMPT-ENGINEER"),
    agentAsset("AGENT-AI-ARCHITECT"),
    agentAsset("AGENT-DEV-PYTHON-IA"),
    agentAsset("AGENT-QA-AGILE"),
    agentAsset("AGENT-DEVOPS-CLOUD"),
    agentAsset("AGENT-SECURITE-IA"),
  ],
};

/** Mock resolver: the prose→AgentDefinition mapping is covered by sdk-adapter.test.ts. */
export const wf003ResolveAgent: AgentResolver = (asset): AgentDefinition => ({
  description: asset.description,
  prompt: `stub:${asset.id}`,
  tools: [],
});

/** Runner that returns pre-baked outputs keyed by stepId (zero network). */
export const mockRunner = (outputs: Record<string, unknown>): StepRunner =>
  async ({ stepId }) => ({ output: outputs[stepId] });
