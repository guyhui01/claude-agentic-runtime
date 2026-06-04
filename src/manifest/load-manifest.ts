/**
 * Chargement d'un manifeste de spine (ADR-0007, §2.4-B.2) → `SpineStep[]` prêt
 * pour `runSpine`. C'est l'ASSEMBLEUR en amont de l'orchestrateur (qui, lui,
 * reste pur et inchangé).
 *
 * Croisements fail-closed (cœur d'ADR-0007 — garantit la cohérence SSOT) :
 *   1. unicité des `stepId` du manifeste ;
 *   2. chaque `assetId` existe dans le sidecar ET est de type "agent" ;
 *   3. chaque `criteriaId` se résout dans le registre ;
 *   4. l'agent se construit (résolveur injecté — adaptateur §2.4-A en prod).
 * Toutes les issues sont agrégées avant de lever (preuve d'audit complète).
 *
 * Pur : aucun accès disque/réseau ; la lecture du catalogue passe par le
 * résolveur d'agent injecté (mockable, ou `toAgentDefinition` câblé par l'appelant).
 */

import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import type { Sidecar, Asset } from "../sidecar/types.js";
import type { StepContract } from "../handoff/types.js";
import type { Criterion } from "../eval/types.js";
import type { CriterionRegistry } from "../eval/criteria-registry.js";
import type { SpineStep } from "../orchestrator/types.js";
import type { SpineManifest, ManifestStep } from "./types.js";

export interface ManifestIssue {
  /** stepId concerné, si l'issue est localisée à une étape. */
  stepId?: string;
  code: string;
  message: string;
}

/** Levée fail-closed agrégeant tous les problèmes de cohérence du manifeste. */
export class ManifestValidationError extends Error {
  readonly issues: ManifestIssue[];

  constructor(issues: ManifestIssue[]) {
    const summary = issues.map((i) => i.message).join(" ; ");
    super(`Manifeste invalide (${issues.length} problème(s)) : ${summary}`);
    this.name = "ManifestValidationError";
    this.issues = issues;
  }
}

/** Résout un asset agent en `AgentDefinition`. Injecté pour rester pur/testable. */
export type AgentResolver = (asset: Asset) => AgentDefinition;

/** Construit le `StepContract` d'une étape (input optionnel, exactOptionalPropertyTypes). */
function toContract(step: ManifestStep): StepContract {
  const contract: StepContract = { stepId: step.stepId, output: step.output };
  if (step.input !== undefined) contract.input = step.input;
  return contract;
}

/**
 * Charge `manifest` en `SpineStep[]`, en croisant le `sidecar` (assets) et le
 * `registry` (critères), agents résolus via `resolveAgent`. Fail-closed.
 * @throws {ManifestValidationError} si une seule incohérence est détectée.
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
    issues.push({ code: "EMPTY_SPINE", message: "le manifeste ne contient aucune étape" });
  }

  // 1. Unicité des stepId.
  const seen = new Set<string>();
  for (const step of manifest.steps) {
    if (seen.has(step.stepId)) {
      issues.push({
        stepId: step.stepId,
        code: "DUPLICATE_STEP_ID",
        message: `stepId dupliqué : "${step.stepId}"`,
      });
    }
    seen.add(step.stepId);
  }

  const steps: SpineStep[] = [];

  for (const step of manifest.steps) {
    const { stepId, assetId } = step;
    const asset = assetById.get(assetId);
    let agent: AgentDefinition | undefined;

    // 2. asset présent + de type agent.
    if (asset === undefined) {
      issues.push({
        stepId,
        code: "UNKNOWN_ASSET",
        message: `étape "${stepId}" : asset "${assetId}" absent du sidecar`,
      });
    } else if (asset.type !== "agent") {
      issues.push({
        stepId,
        code: "NOT_AN_AGENT",
        message: `étape "${stepId}" : asset "${assetId}" est de type "${asset.type}", "agent" attendu`,
      });
    } else {
      // 4. résolution de l'agent (peut lever : anti-traversal, prose illisible…).
      try {
        agent = resolveAgent(asset);
      } catch (e) {
        issues.push({
          stepId,
          code: "AGENT_RESOLUTION_FAILED",
          message: `étape "${stepId}" : résolution de l'agent "${assetId}" échouée : ${(e as Error).message}`,
        });
      }
    }

    // 3. critères résolus dans le registre.
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
        message: `étape "${stepId}" : critère(s) inconnu(s) : ${missing.join(", ")}`,
      });
    }

    // N'assemble l'étape que si elle est intègre (sinon on lèvera de toute façon).
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
