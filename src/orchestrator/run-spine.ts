/**
 * Exécuteur de la spine (§2.4-B.1) — déroule une suite d'étapes en branchant
 * runner injecté + eval gate (brique 2) + contrats de handoff (brique 1) +
 * provenance, fail-closed.
 *
 * Garanties (cohérentes ADR-0004 « propagation gardée » + ISO 19011) :
 *   - PRÉ-VOL STATIQUE : la compatibilité des contrats adjacents est vérifiée
 *     AVANT tout appel runner ; un mismatch design-time échoue sans rien exécuter.
 *   - PAR ÉTAPE, dans l'ordre : exécution → eval gate (fail-closed) → handoff
 *     vers l'aval (fail-closed). La sortie d'une étape n'est propagée qu'une fois
 *     ces deux gardes franchies.
 *   - PREUVE PRÉSERVÉE : `traces` est rempli jusqu'à l'étape atteinte, y compris
 *     l'étape fautive si elle a produit un rapport de gate avant de bloquer.
 *   - PUR : aucun accès disque ni réseau ; le seul effet passe par le runner.
 */

import {
  checkContractCompatibility,
  validateHandoff,
  HandoffValidationError,
} from "../handoff/validate-handoff.js";
import type { StepContract } from "../handoff/types.js";
import { runEvalGate, assertGatePassed, EvalGateError } from "../eval/eval-gate.js";
import type {
  SpineStep,
  SpineResult,
  StepTrace,
  StepRunner,
} from "./types.js";

/** Erreur de cohérence de la spine elle-même (config invalide, pré-vol). */
export class SpineConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpineConfigError";
  }
}

/**
 * Consumer sentinelle pour valider la sortie de l'étape terminale : sans `input`,
 * `validateHandoff` ne vérifie que le respect de la sortie promise (producer-output).
 */
function terminalSink(producer: StepContract): StepContract {
  return { stepId: `${producer.stepId}::sink`, output: {} };
}

/**
 * Déroule la spine `steps` avec le `runner` injecté, en partant de `initialInput`.
 * Ne lève pas pour un échec de garde attendu (eval gate / handoff) : renvoie un
 * `SpineResult { status: "failed", failure, traces }`. Lève uniquement pour une
 * erreur de configuration (`SpineConfigError`) ou une faute inattendue du runner.
 */
export async function runSpine(
  steps: SpineStep[],
  runner: StepRunner,
  initialInput: unknown = {},
): Promise<SpineResult> {
  if (steps.length === 0) {
    throw new SpineConfigError("spine vide : au moins une étape est requise");
  }

  // Cohérence interne : provenance.stepId === contract.stepId pour chaque étape.
  for (const s of steps) {
    if (s.provenance.stepId !== s.contract.stepId) {
      throw new SpineConfigError(
        `incohérence d'étape : provenance "${s.provenance.stepId}" ≠ contrat "${s.contract.stepId}"`,
      );
    }
  }

  // Pré-vol STATIQUE (design-time) : contrats adjacents compatibles, AVANT exécution.
  for (let i = 0; i < steps.length - 1; i++) {
    const issues = checkContractCompatibility(
      steps[i]!.contract,
      steps[i + 1]!.contract,
    );
    if (issues.length > 0) {
      const summary = issues.map((x) => x.message).join(" ; ");
      throw new SpineConfigError(
        `contrats incompatibles "${steps[i]!.contract.stepId}"→"${steps[i + 1]!.contract.stepId}" : ${summary}`,
      );
    }
  }

  const traces: StepTrace[] = [];
  let input: unknown = initialInput;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!;
    const { stepId } = step.contract;

    // 1. Exécution de l'étape via le runner injecté.
    const { output } = await runner({
      stepId,
      agent: step.agent,
      input,
    });

    // 2. Eval gate (brique 2) — la preuve (GateReport) est produite même en succès.
    const gate = runEvalGate(stepId, step.criteria, output);
    traces.push({ provenance: step.provenance, output, gate });
    try {
      assertGatePassed(gate);
    } catch (e) {
      if (e instanceof EvalGateError) {
        return {
          status: "failed",
          traces,
          failure: { stepId, kind: "eval-gate", message: e.message },
        };
      }
      throw e;
    }

    // 3. Handoff (brique 1) — vers l'aval, ou validation producer-output terminale.
    const next = steps[i + 1];
    const consumer = next ? next.contract : terminalSink(step.contract);
    try {
      validateHandoff(step.contract, consumer, output);
    } catch (e) {
      if (e instanceof HandoffValidationError) {
        return {
          status: "failed",
          traces,
          failure: { stepId, kind: "handoff", message: e.message },
        };
      }
      throw e;
    }

    input = output;
  }

  return {
    status: "completed",
    traces,
    finalOutput: traces[traces.length - 1]!.output,
  };
}
