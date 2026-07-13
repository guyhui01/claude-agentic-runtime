/**
 * LIVE RUN of the WF-010 "Project Post-mortem / Lessons Learned" spine — BILLED,
 * OBSERVED, on explicit approval. Modeled on `wf-007-run-live.test.ts`.
 *
 * Guarded: runs ONLY if `LIVE_RUN=1` AND the catalog is reachable. The normal suite
 * (`npm test`) always SKIPS it → no billed call by default.
 *
 * Runs the real spine with the SDK's REAL `query()` (hard caps +
 * `permissionMode:"plan"` read-only), real sidecar (≥ v4.1.0) + real prose.
 * Expected outcome: `completed` if the 4 agents produce DoD-conformant JSON,
 * otherwise `failed` fail-closed at the first unsatisfied eval gate. Auth:
 * subscription OAuth only.
 *
 * Model: the catalog's `modele_recommande` is `claude-sonnet-5`, but the live PROOF
 * is routed to a top-tier model DESIGNATED BY THE USER (agent/workflow tasks →
 * performant model; a weaker model degrades trace hygiene — WF-005 lesson). Route it
 * with `LIVE_MODEL=<full model id>`.
 *
 * Launch: `LIVE_RUN=1 LIVE_MODEL=<performant-model-id> npx vitest run test/wf-010-run-live.test.ts`
 */
import { describe, it, expect } from "vitest";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSidecar } from "../src/loader/load-sidecar.js";
import { runWf010 } from "../src/spines/run-wf-010.js";
import { CATALOG_ROOT, SIDECAR_PATH } from "./catalog-root.js";
import { makeStepProgressHook } from "./live-progress.js";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const RESULT_FILE =
  process.env.LIVE_RESULT_FILE ??
  join(HERE, "..", "docs", "audit", "live-runs", "wf-010-live-result.json");
// Incremental PROGRESS trace (gitignored): written at each step, so usable even if
// the run is interrupted (timeout / session limit). Lets you PROBE progress LIVE
// during a background run.
const PROGRESS_FILE =
  process.env.LIVE_PROGRESS_FILE ??
  join(HERE, "..", "docs", "audit", "live-runs", "wf-010-live-progress.json");

const ENABLED = !!process.env.LIVE_RUN && existsSync(SIDECAR_PATH);

describe.skipIf(!ENABLED)("WF-010 — LIVE RUN (billed, observed)", () => {
  it(
    "runs the WF-010 spine live (capped, read-only)",
    async () => {
      const sidecar = loadSidecar(SIDECAR_PATH, CATALOG_ROOT);

      const res = await runWf010({
        sidecar,
        catalogRoot: CATALOG_ROOT,
        ...(process.env.LIVE_MODEL ? { model: process.env.LIVE_MODEL } : {}),
        initialInput: {
          project: "Synthetic AI delivery project (mid-cap, 6 months, hybrid team).",
          closeout: "Partial failure (shipped 2 weeks late, 8% over budget, 3 P1 bugs at go-live)",
          duration: "3-12 months",
          team: "8 people, distributed, 2 late joiners",
          stakes: "Deadline + quality; steering-committee audience",
          data: "Synthetic KPIs, meeting minutes, logged incidents (fictional)",
          audience: "Steering committee",
          format: "Detailed report + 1-page summary",
          instructions:
            "This is an OFFLINE analysis exercise on a SYNTHETIC, FICTIONAL project: work ONLY from " +
            "the context above and your own knowledge — do NOT browse or fetch live sources, and do not " +
            "refuse for lack of real data. Use fictional names only. Produce a plausible lessons-learned " +
            "analysis. Follow the provided JSON output schema exactly at each step.",
        },
        runnerDeps: { caps: { maxBudgetUsd: 4.0, maxTurns: 15 } },
        onStep: makeStepProgressHook(PROGRESS_FILE),
      });

      console.log("\n===== WF-010 LIVE RUN RESULT =====");
      console.log("status :", res.status);
      if (res.failure) console.log("failure:", JSON.stringify(res.failure));
      for (const t of res.traces) {
        console.log(`- ${t.provenance.stepId} (${t.provenance.assetId}) → verdict=${t.gate.verdict}`);
        console.log("    " + t.gate.results.map((r) => `${r.id}:${r.passed ? "ok" : "FAIL"}`).join("  "));
      }
      console.log("====================================\n");

      mkdirSync(dirname(RESULT_FILE), { recursive: true });
      writeFileSync(
        RESULT_FILE,
        JSON.stringify(
          {
            status: res.status,
            failure: res.failure ?? null,
            traces: res.traces.map((t) => ({
              stepId: t.provenance.stepId,
              assetId: t.provenance.assetId,
              catalogTag: t.provenance.catalogTag,
              verdict: t.gate.verdict,
              results: t.gate.results,
              output: t.output,
            })),
          },
          null,
          2,
        ),
        "utf-8",
      );

      expect(["completed", "failed"]).toContain(res.status);
    },
    1_800_000,
  );
});
