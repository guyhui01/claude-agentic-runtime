/**
 * Helper d'observabilité pour les harnais de RUN LIVE (`wf-00X-run-live.test.ts`).
 *
 * Fabrique un hook de progression par étape (cf. `StepProgressHook` de `runSpine`)
 * qui : (1) logge en console `[+Ns] phase STEP-XX (assetId) [→ verdict]` ; (2) écrit
 * une trace INCRÉMENTALE sur disque à chaque étape — donc exploitable même si le run
 * est interrompu (timeout / limite de session), et sondable EN DIRECT pendant un run
 * d'arrière-plan. Factorisé pour ne pas dupliquer ce code entre harnais (DRY).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type {
  StepProgressEvent,
  StepProgressHook,
} from "../src/orchestrator/run-spine.js";

export function makeStepProgressHook(progressFile: string): StepProgressHook {
  const t0 = Date.now();
  const progress: Array<Record<string, unknown>> = [];
  mkdirSync(dirname(progressFile), { recursive: true });
  return (e: StepProgressEvent) => {
    const at = `+${((Date.now() - t0) / 1000).toFixed(0)}s`;
    console.log(
      `[${at}] ${e.phase} ${e.stepId} (${e.assetId})` +
        (e.verdict ? ` → verdict=${e.verdict}` : ""),
    );
    progress.push({ at, ...e });
    writeFileSync(progressFile, JSON.stringify(progress, null, 2), "utf-8");
  };
}
