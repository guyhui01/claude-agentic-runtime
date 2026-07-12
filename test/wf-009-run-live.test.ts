/**
 * LIVE RUN of the WF-009 "IT/AI Recruitment" spine — BILLED, OBSERVED, on explicit
 * approval. Modeled on `wf-004-run-live.test.ts`.
 *
 * Guarded: runs ONLY if `LIVE_RUN=1` AND the catalog is reachable. The normal suite
 * (`npm test`) always SKIPS it → no billed call by default.
 *
 * Runs the real spine with the SDK's REAL `query()` (hard caps +
 * `permissionMode:"plan"` read-only), real sidecar (≥ v4.1.0) + real prose.
 * Expected outcome: `completed` if the 4 agents produce DoD-conformant JSON,
 * otherwise `failed` fail-closed at the first unsatisfied eval gate (including the two
 * gateway criteria `rh-shortlist-validated` / `sel-candidate-selected`). Auth:
 * subscription OAuth only.
 *
 * Recommended model for this operational workflow: `claude-sonnet-5` (the catalog's
 * `modele_recommande`). Route it with `LIVE_MODEL=claude-sonnet-5`.
 *
 * Launch: `LIVE_RUN=1 LIVE_MODEL=claude-sonnet-5 npx vitest run test/wf-009-run-live.test.ts`
 */
import { describe, it, expect } from "vitest";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSidecar } from "../src/loader/load-sidecar.js";
import { runWf009 } from "../src/spines/run-wf-009.js";
import { CATALOG_ROOT, SIDECAR_PATH } from "./catalog-root.js";
import { makeStepProgressHook } from "./live-progress.js";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const RESULT_FILE =
  process.env.LIVE_RESULT_FILE ??
  join(HERE, "..", "docs", "audit", "live-runs", "wf-009-live-result.json");
// Incremental PROGRESS trace (gitignored): written at each step, so usable even if
// the run is interrupted (timeout / session limit). Lets you PROBE progress LIVE
// during a background run.
const PROGRESS_FILE =
  process.env.LIVE_PROGRESS_FILE ??
  join(HERE, "..", "docs", "audit", "live-runs", "wf-009-live-progress.json");

const ENABLED = !!process.env.LIVE_RUN && existsSync(SIDECAR_PATH);

describe.skipIf(!ENABLED)("WF-009 — LIVE RUN (billed, observed)", () => {
  it(
    "runs the WF-009 spine live (capped, read-only)",
    async () => {
      const sidecar = loadSidecar(SIDECAR_PATH, CATALOG_ROOT);

      const res = await runWf009({
        sidecar,
        catalogRoot: CATALOG_ROOT,
        ...(process.env.LIVE_MODEL ? { model: process.env.LIVE_MODEL } : {}),
        initialInput: {
          role: "Senior AI/LLM Engineer (platform team)",
          contract: "Permanent",
          urgency: "3 months",
          location: "Paris / hybrid (2 days on-site)",
          mustHave: "Python, production LLM/RAG experience, evaluation, MLOps basics",
          niceToHave: "TypeScript, Kubernetes, prior startup experience",
          budget: "€70-85k or €650-750/day freelance equivalent",
          teamContext: "5-person platform team, Python/TypeScript stack, weekly demos",
          assessment: "Tech interview + practical RAG case + reference checks",
          antiFraud: "Verify diplomas, LinkedIn, references — yes",
        },
        runnerDeps: { caps: { maxBudgetUsd: 4.0, maxTurns: 15 } },
        onStep: makeStepProgressHook(PROGRESS_FILE),
      });

      console.log("\n===== WF-009 LIVE RUN RESULT =====");
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
