/**
 * Adaptateur catalogue → SDK (§2.4-A). Transforme un `Asset` validé du sidecar
 * + sa prose en `AgentDefinition` du Claude Agent SDK (@anthropic-ai/claude-agent-sdk).
 *
 * Lecture seule (ADR-0001) : on LIT la prose du catalogue, on n'écrit jamais.
 *
 * Surface le « data gap » : le sidecar actuel ne porte pas `tools` / `model` /
 * `mcpServers` / `skills` (décision de source repoussée, cf. NEXT_STEPS §2.1).
 * En attendant, défauts CONSERVATEURS read-only + paramètre `overrides` explicite.
 */

import { readFileSync } from "node:fs";
import { isAbsolute, join, normalize } from "node:path";
import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import type { Asset } from "../sidecar/types.js";

/** Outils par défaut : strictement lecture (ADR-0001), tant que le catalogue ne déclare rien. */
export const DEFAULT_READONLY_TOOLS: readonly string[] = ["Read", "Grep", "Glob"];

export interface AgentDefinitionOverrides {
  tools?: string[];
  disallowedTools?: string[];
  model?: string;
  maxTurns?: number;
}

/** Lit la prose d'un asset sous `catalogRoot` (garde anti-traversal, cohérent integrity.ts). */
function readProse(asset: Asset, catalogRoot: string): string {
  const normalized = normalize(asset.path);
  if (isAbsolute(normalized) || normalized.startsWith("..")) {
    throw new Error(`chemin d'asset non sûr (hors catalogue) : "${asset.path}"`);
  }
  return readFileSync(join(catalogRoot, normalized), "utf-8");
}

/**
 * Transforme un `Asset` de type "agent" en `AgentDefinition` SDK
 * (`prompt` = prose du `.md`, `description` = description du sidecar).
 * @throws si l'asset n'est pas un agent, si le chemin est non sûr, ou si la prose est illisible.
 */
export function toAgentDefinition(
  asset: Asset,
  catalogRoot: string,
  overrides: AgentDefinitionOverrides = {},
): AgentDefinition {
  if (asset.type !== "agent") {
    throw new Error(
      `toAgentDefinition attend un asset "agent", reçu "${asset.type}" (${asset.id})`,
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
