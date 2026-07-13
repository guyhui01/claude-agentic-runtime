/**
 * LIVE RUN of the WF-005 "Strategic Intelligence & Growth" spine — BILLED, OBSERVED,
 * on explicit approval. Modeled on `wf-004-run-live.test.ts`.
 *
 * Guarded: runs ONLY if `LIVE_RUN=1` AND the catalog is reachable. The normal suite
 * (`npm test`) always SKIPS it → no billed call by default.
 *
 * Runs the real spine with the SDK's REAL `query()` (hard caps +
 * `permissionMode:"plan"` read-only), real sidecar (≥ v4.1.0) + real prose.
 * Expected outcome: `completed` if the 3 agents produce DoD-conformant JSON,
 * otherwise `failed` fail-closed at the first unsatisfied eval gate. Auth:
 * subscription OAuth only.
 *
 * Recommended model for this light weekly-cadence workflow: `claude-sonnet-5` (the
 * catalog's `modele_recommande`). Route it with `LIVE_MODEL=claude-sonnet-5` (full id).
 *
 * Launch: `LIVE_RUN=1 LIVE_MODEL=claude-sonnet-5 npx vitest run test/wf-005-run-live.test.ts`
 */
import { describe, it, expect } from "vitest";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSidecar } from "../src/loader/load-sidecar.js";
import { runWf005 } from "../src/spines/run-wf-005.js";
import { CATALOG_ROOT, SIDECAR_PATH } from "./catalog-root.js";
import { makeStepProgressHook } from "./live-progress.js";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const RESULT_FILE =
  process.env.LIVE_RESULT_FILE ??
  join(HERE, "..", "docs", "audit", "live-runs", "wf-005-live-result.json");
// Incremental PROGRESS trace (gitignored): written at each step, so usable even if
// the run is interrupted (timeout / session limit). Lets you PROBE progress LIVE
// during a background run.
const PROGRESS_FILE =
  process.env.LIVE_PROGRESS_FILE ??
  join(HERE, "..", "docs", "audit", "live-runs", "wf-005-live-progress.json");

const ENABLED = !!process.env.LIVE_RUN && existsSync(SIDECAR_PATH);

describe.skipIf(!ENABLED)("WF-005 — LIVE RUN (billed, observed)", () => {
  it(
    "runs the WF-005 spine live (capped, read-only)",
    async () => {
      const sidecar = loadSidecar(SIDECAR_PATH, CATALOG_ROOT);

      const res = await runWf005({
        sidecar,
        catalogRoot: CATALOG_ROOT,
        ...(process.env.LIVE_MODEL ? { model: process.env.LIVE_MODEL } : {}),
        initialInput: {
          format: "Weekly flash + 2-3 LinkedIn posts",
          scope:
            "Generative AI / LLM and AI agents: model releases, agentic runtimes, " +
            "evaluation frameworks, and the AI-consulting job market.",
          audience: "Public LinkedIn (AI product leaders and practitioners)",
          tone: "Thought leader, plain-language expert",
          horizon: "3 months",
          sources:
            "ArXiv, GitHub trending, vendor engineering blogs, trade press (synthetic weekly digest).",
          opportunityFocus: "Positioning and freelance AI-consulting engagements",
          // Blinding the run against avoidable KOs (read-only, capped, no browsing):
          instructions:
            "This is an OFFLINE synthesis exercise: work ONLY from your own knowledge — " +
            "do NOT attempt to browse or fetch live sources, and do not refuse for lack of " +
            "real-time access. Produce a plausible synthetic weekly digest. Targets: at least " +
            "5 highlights, EACH with a short `title` and an `impact` rating (High/Medium/Low); " +
            "2-3 topics, EACH with a `format` and an editorial `angle`; a Markdown `synthesis`; " +
            "and 2-3 ready-to-publish LinkedIn posts. Follow the provided JSON output schema exactly.",
        },
        runnerDeps: { caps: { maxBudgetUsd: 4.0, maxTurns: 15 } },
        onStep: makeStepProgressHook(PROGRESS_FILE),
      });

      console.log("\n===== WF-005 LIVE RUN RESULT =====");
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
