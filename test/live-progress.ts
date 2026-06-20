/**
 * Observability helper for the LIVE RUN harnesses (`wf-00X-run-live.test.ts`).
 *
 * Builds a per-step progress hook (see `runSpine`'s `StepProgressHook`) that:
 * (1) logs to the console `[+Ns] phase STEP-XX (assetId) [→ verdict]`; (2) writes
 * an INCREMENTAL trace to disk at each step — so it stays usable even if the run is
 * interrupted (timeout / session limit), and can be probed LIVE during a background
 * run. Factored to avoid duplicating this code across harnesses (DRY).
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
