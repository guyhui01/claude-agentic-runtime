/**
 * Catalog → SDK adapter (§2.4-A). Turns a validated sidecar `Asset` + its prose
 * into a Claude Agent SDK `AgentDefinition` (@anthropic-ai/claude-agent-sdk).
 *
 * Read-only (ADR-0001): we READ the catalog prose, we never write.
 *
 * Surfaces the "data gap": the current sidecar does not carry `tools` / `model` /
 * `mcpServers` / `skills` (sourcing decision deferred, see NEXT_STEPS §2.1).
 * In the meantime, CONSERVATIVE read-only defaults + an explicit `overrides` parameter.
 */

import { readFileSync } from "node:fs";
import { isAbsolute, join, normalize } from "node:path";
import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import type { Asset } from "../sidecar/types.js";

/** Default tools: strictly read-only (ADR-0001), as long as the catalog declares nothing. */
export const DEFAULT_READONLY_TOOLS: readonly string[] = ["Read", "Grep", "Glob"];

export interface AgentDefinitionOverrides {
  tools?: string[];
  disallowedTools?: string[];
  model?: string;
  maxTurns?: number;
}

/** Reads an asset's prose under `catalogRoot` (anti-traversal guard, consistent with integrity.ts). */
function readProse(asset: Asset, catalogRoot: string): string {
  const normalized = normalize(asset.path);
  if (isAbsolute(normalized) || normalized.startsWith("..")) {
    throw new Error(`unsafe asset path (outside the catalog): "${asset.path}"`);
  }
  return readFileSync(join(catalogRoot, normalized), "utf-8");
}

/**
 * Turns an "agent"-type `Asset` into an SDK `AgentDefinition`
 * (`prompt` = prose of the `.md`, `description` = sidecar description).
 * @throws if the asset is not an agent, if the path is unsafe, or if the prose is unreadable.
 */
export function toAgentDefinition(
  asset: Asset,
  catalogRoot: string,
  overrides: AgentDefinitionOverrides = {},
): AgentDefinition {
  if (asset.type !== "agent") {
    throw new Error(
      `toAgentDefinition expects an "agent" asset, received "${asset.type}" (${asset.id})`,
    );
  }

  const def: AgentDefinition = {
    description: asset.description,
    prompt: readProse(asset, catalogRoot),
    tools: overrides.tools ?? [...DEFAULT_READONLY_TOOLS],
  };
  if (overrides.disallowedTools) def.disallowedTools = overrides.disallowedTools;
  if (overrides.model) def.model = overrides.model;
  if (overrides.maxTurns !== undefined) def.maxTurns = overrides.maxTurns;
  return def;
}
