/**
 * LIVE RUN of the WF-002 "Agile SAFe Delivery" spine (§2.4-B.4) — BILLED, OBSERVED,
 * on explicit approval. Modeled on `wf-001-run-live.test.ts`.
 *
 * Guarded: runs ONLY if `LIVE_RUN=1` AND the catalog is reachable. The normal suite
 * (`npm test`) always SKIPS it → no billed call by default.
 *
 * Runs the real spine with the SDK's REAL `query()` (via `createQueryRunner`,
 * hard caps + `permissionMode:"plan"` read-only), real sidecar + real prose.
 * Expected outcome: `completed` if the 5 agents produce DoD-conformant JSON,
 * otherwise `failed` fail-closed at the first unsatisfied gate (valid, traced result).
 * Auth: subscription OAuth only (never ANTHROPIC_API_KEY — runner guard).
 *
 * Launch: `LIVE_RUN=1 npx vitest run test/wf-002-run-live.test.ts`
 * Optional model routing: `LIVE_MODEL=fable` (SDK alias or full model id) routes
 * every step agent to that model — e.g. a separate-quota model for cheap re-runs.
 */
import { describe, it, expect } from "vitest";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSidecar } from "../src/loader/load-sidecar.js";
import { runWf002 } from "../src/spines/run-wf-002.js";
import { CATALOG_ROOT, SIDECAR_PATH } from "./catalog-root.js";
import { makeStepProgressHook } from "./live-progress.js";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const RESULT_FILE =
  process.env.LIVE_RESULT_FILE ??
  join(HERE, "..", "docs", "audit", "live-runs", "wf-002-live-result.json");
// Incremental progress trace (gitignored), probeable live (see WF-003).
const PROGRESS_FILE =
  process.env.LIVE_PROGRESS_FILE ??
  join(HERE, "..", "docs", "audit", "live-runs", "wf-002-live-progress.json");

const ENABLED = !!process.env.LIVE_RUN && existsSync(SIDECAR_PATH);

describe.skipIf(!ENABLED)("WF-002 — LIVE RUN (billed, observed)", () => {
  it(
    "runs the WF-002 spine live (capped, read-only)",
    async () => {
      const sidecar = loadSidecar(SIDECAR_PATH, CATALOG_ROOT);
      const res = await runWf002({
        sidecar,
        catalogRoot: CATALOG_ROOT,
        ...(process.env.LIVE_MODEL ? { model: process.env.LIVE_MODEL } : {}),
        initialInput: {
          art: "Digital Banking ART at a retail bank: customer portal redesign " +
            "(self-care, payments, complaints), PI Planning for the next " +
            "Program Increment, web and mobile teams.",
        },
        runnerDeps: { caps: { maxBudgetUsd: 1.0, maxTurns: 6 } },
        onStep: makeStepProgressHook(PROGRESS_FILE),
      });

      console.log("\n===== WF-002 LIVE RUN RESULT =====");
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
