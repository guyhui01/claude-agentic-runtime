/**
 * Execution plan for the human go/no-go — duration and recommended model read
 * from the workflow card's identity YAML (`duree_estimee`, `modele_recommande`),
 * fail-closed if the card does not carry them (a plan with invented numbers
 * would be theater). Read-only on the catalog (ADR-0001), same anti-traversal
 * guard as the prose reader.
 */

import { readFileSync } from "node:fs";
import { isAbsolute, join, normalize } from "node:path";
import type { Asset } from "../sidecar/types.js";

export interface ExecutionPlan {
  workflow: string;
  title: string;
  /** Verbatim `duree_estimee` from the card (e.g. "45-90 min"). */
  durationEstimate: string;
  /** Verbatim `modele_recommande` from the card (a catalog artifact — the live routing decision stays the operator's). */
  recommendedModel: string;
}

/** Extracts the two plan fields from a card's YAML identity block (pure). */
export function extractPlanFields(cardText: string): {
  durationEstimate?: string;
  recommendedModel?: string;
} {
  const duration = /^duree_estimee:\s*"([^"]+)"/m.exec(cardText)?.[1];
  const model = /^modele_recommande:\s*"([^"]+)"/m.exec(cardText)?.[1];
  const fields: { durationEstimate?: string; recommendedModel?: string } = {};
  if (duration !== undefined) fields.durationEstimate = duration;
  if (model !== undefined) fields.recommendedModel = model;
  return fields;
}

/**
 * Builds the plan for a routed workflow from its real catalog card.
 * @throws if the path is unsafe, the card is unreadable, or a plan field is absent.
 */
export function buildPlan(asset: Asset, catalogRoot: string): ExecutionPlan {
  const normalized = normalize(asset.path);
  if (isAbsolute(normalized) || normalized.startsWith("..")) {
    throw new Error(`unsafe asset path (outside the catalog): "${asset.path}"`);
  }
  const card = readFileSync(join(catalogRoot, normalized), "utf-8");
  const { durationEstimate, recommendedModel } = extractPlanFields(card);
  if (durationEstimate === undefined || recommendedModel === undefined) {
    throw new Error(
      `workflow card "${asset.id}" carries no ${durationEstimate === undefined ? "duree_estimee" : "modele_recommande"} — cannot build an honest execution plan (fail-closed)`,
    );
  }
  return {
    workflow: asset.id,
    title: asset.title,
    durationEstimate,
    recommendedModel,
  };
}
