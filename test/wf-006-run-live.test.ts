/**
 * LIVE RUN of the WF-006 "Pre-sales / Commercial proposal" spine — BILLED, OBSERVED,
 * on explicit approval. Modeled on `wf-004-run-live.test.ts`.
 *
 * Guarded: runs ONLY if `LIVE_RUN=1` AND the catalog is reachable. The normal suite
 * (`npm test`) always SKIPS it → no billed call by default.
 *
 * Runs the real spine with the SDK's REAL `query()` (hard caps +
 * `permissionMode:"plan"` read-only), real sidecar (≥ v4.1.0) + real prose.
 * Expected outcome (Option A framing): the seeded opportunity is deliberately a
 * strong, qualified deal, so STEP-01's GO/NO-GO gateway should return `verdict:"GO"`
 * and the full pre-sales backbone should run to `completed` (the commercial proposal
 * is produced) — otherwise `failed` fail-closed at the first unsatisfied eval gate
 * (a NO-GO at STEP-01 would be a documented no-bid, but the NO-GO halt is already
 * proven deterministically offline in the hermetic tests). Auth: subscription OAuth only.
 *
 * Recommended model for this high-stakes commercial workflow: `claude-opus-4-8` (the
 * catalog's `modele_recommande`). Route it with `LIVE_MODEL=claude-opus-4-8`.
 *
 * Launch: `LIVE_RUN=1 LIVE_MODEL=claude-opus-4-8 npx vitest run test/wf-006-run-live.test.ts`
 */
import { describe, it, expect } from "vitest";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSidecar } from "../src/loader/load-sidecar.js";
import { runWf006 } from "../src/spines/run-wf-006.js";
import { CATALOG_ROOT, SIDECAR_PATH } from "./catalog-root.js";
import { makeStepProgressHook } from "./live-progress.js";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const RESULT_FILE =
  process.env.LIVE_RESULT_FILE ??
  join(HERE, "..", "docs", "audit", "live-runs", "wf-006-live-result.json");
// Incremental PROGRESS trace (gitignored): written at each step, so usable even if
// the run is interrupted (timeout / session limit). Lets you PROBE progress LIVE
// during a background run.
const PROGRESS_FILE =
  process.env.LIVE_PROGRESS_FILE ??
  join(HERE, "..", "docs", "audit", "live-runs", "wf-006-live-progress.json");

const ENABLED = !!process.env.LIVE_RUN && existsSync(SIDECAR_PATH);

describe.skipIf(!ENABLED)("WF-006 — LIVE RUN (billed, observed)", () => {
  it(
    "runs the WF-006 spine live (capped, read-only)",
    async () => {
      const sidecar = loadSidecar(SIDECAR_PATH, CATALOG_ROOT);

      const res = await runWf006({
        sidecar,
        catalogRoot: CATALOG_ROOT,
        ...(process.env.LIVE_MODEL ? { model: process.env.LIVE_MODEL } : {}),
        // Option A: a strong, qualified opportunity so the GO/NO-GO gateway returns GO
        // and the whole backbone produces the commercial proposal.
        initialInput: {
          prospect:
            "CAC40 insurer (EU, ~15,000 employees), advanced AI maturity, board-sponsored AI program.",
          requestType: "Formal RFP",
          scope:
            "Build of a claims-triage AI system (LLM classifier + RAG over the policy/claims base + " +
            "human-in-the-loop review), from scoping through architecture, schedule, person-day costing, " +
            "pricing and a complete commercial proposal.",
          budget: "€250k envelope confirmed by the CFO (disclosed)",
          deadline: "2026-09-15 (award in 8 weeks)",
          decisionMakers: "CDO (economic buyer), CIO (technical validator), procurement",
          selectionCriteria: "Expertise + AI-Act readiness + references + price",
          constraints: "EU data residency, GDPR, AI Act high-risk tier",
          competition: "Two incumbent SSII competing",
        },
        runnerDeps: { caps: { maxBudgetUsd: 4.0, maxTurns: 15 } },
        onStep: makeStepProgressHook(PROGRESS_FILE),
      });

      console.log("\n===== WF-006 LIVE RUN RESULT =====");
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
