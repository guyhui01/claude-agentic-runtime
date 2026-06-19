/**
 * Loading a spine manifest (ADR-0007, §2.4-B.2) → `SpineStep[]` ready for
 * `runSpine`. This is the ASSEMBLER upstream of the orchestrator (which stays
 * pure and unchanged).
 *
 * Fail-closed cross-checks (core of ADR-0007 — guarantees SSOT consistency):
 *   1. uniqueness of the manifest `stepId` values;
 *   2. each `assetId` exists in the sidecar AND is of type "agent";
 *   3. each `criteriaId` resolves in the registry;
 *   4. the agent builds (injected resolver — §2.4-A adapter in prod).
 * All issues are aggregated before throwing (complete audit evidence).
 *
 * Pure: no disk/network access; reading the catalog goes through the injected
 * agent resolver (mockable, or `toAgentDefinition` wired by the caller).
 */

import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import type { Sidecar, Asset } from "../sidecar/types.js";
import type { StepContract } from "../handoff/types.js";
import type { Criterion } from "../eval/types.js";
import type { CriterionRegistry } from "../eval/criteria-registry.js";
import type { SpineStep } from "../orchestrator/types.js";
import type { SpineManifest, ManifestStep } from "./types.js";

export interface ManifestIssue {
  /** the relevant stepId, if the issue is localized to a step. */
  stepId?: string;
  code: string;
  message: string;
}

/** Fail-closed error aggregating all manifest consistency problems. */
export class ManifestValidationError extends Error {
  readonly issues: ManifestIssue[];

  constructor(issues: ManifestIssue[]) {
    const summary = issues.map((i) => i.message).join(" ; ");
    super(`Invalid manifest (${issues.length} problem(s)): ${summary}`);
    this.name = "ManifestValidationError";
    this.issues = issues;
  }
}

/** Resolves an agent asset into an `AgentDefinition`. Injected to stay pure/testable. */
export type AgentResolver = (asset: Asset) => AgentDefinition;

/** Builds the `StepContract` of a step (optional input, exactOptionalPropertyTypes). */
function toContract(step: ManifestStep): StepContract {
  const contract: StepContract = { stepId: step.stepId, output: step.output };
  if (step.input !== undefined) contract.input = step.input;
  return contract;
}

/**
 * Loads `manifest` into `SpineStep[]`, cross-checking the `sidecar` (assets)
 * and the `registry` (criteria), agents resolved via `resolveAgent`. Fail-closed.
 * @throws {ManifestValidationError} if a single inconsistency is detected.
 */
export function loadSpine(
  manifest: SpineManifest,
  sidecar: Sidecar,
  registry: CriterionRegistry,
  resolveAgent: AgentResolver,
): SpineStep[] {
  const issues: ManifestIssue[] = [];
  const assetById = new Map(sidecar.assets.map((a) => [a.id, a]));

  if (manifest.steps.length === 0) {
    issues.push({ code: "EMPTY_SPINE", message: "the manifest contains no steps" });
  }

  // 1. stepId uniqueness.
  const seen = new Set<string>();
  for (const step of manifest.steps) {
    if (seen.has(step.stepId)) {
      issues.push({
        stepId: step.stepId,
        code: "DUPLICATE_STEP_ID",
        message: `duplicate stepId: "${step.stepId}"`,
      });
    }
    seen.add(step.stepId);
  }

  const steps: SpineStep[] = [];

  for (const step of manifest.steps) {
    const { stepId, assetId } = step;
    const asset = assetById.get(assetId);
    let agent: AgentDefinition | undefined;

    // 2. asset present + of type agent.
    if (asset === undefined) {
      issues.push({
        stepId,
        code: "UNKNOWN_ASSET",
        message: `step "${stepId}": asset "${assetId}" missing from the sidecar`,
      });
    } else if (asset.type !== "agent") {
      issues.push({
        stepId,
        code: "NOT_AN_AGENT",
        message: `step "${stepId}": asset "${assetId}" is of type "${asset.type}", "agent" expected`,
      });
    } else {
      // 4. agent resolution (may throw: anti-traversal, unreadable prose…).
      try {
        agent = resolveAgent(asset);
      } catch (e) {
        issues.push({
          stepId,
          code: "AGENT_RESOLUTION_FAILED",
          message: `step "${stepId}": resolution of agent "${assetId}" failed: ${(e as Error).message}`,
        });
      }
    }

    // 3. criteria resolved in the registry.
    const criteria: Criterion[] = [];
    const missing: string[] = [];
    for (const cid of step.criteriaIds) {
      const c = registry.get(cid);
      if (c === undefined) missing.push(cid);
      else criteria.push(c);
    }
    if (missing.length > 0) {
      issues.push({
        stepId,
        code: "UNKNOWN_CRITERION",
        message: `step "${stepId}": unknown criterion(s): ${missing.join(", ")}`,
      });
    }

    // Assemble the step only if it is sound (otherwise we'll throw anyway).
    if (asset !== undefined && asset.type === "agent" && agent !== undefined && missing.length === 0) {
      steps.push({
        provenance: { stepId, assetId, catalogTag: asset.source.catalogTag },
        agent,
        contract: toContract(step),
        criteria,
      });
    }
  }

  if (issues.length > 0) throw new ManifestValidationError(issues);
  return steps;
}
