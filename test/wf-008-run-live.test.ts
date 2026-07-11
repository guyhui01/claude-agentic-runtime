/**
 * LIVE RUN of the WF-008 "AI Act / GDPR Compliance Audit" spine — BILLED,
 * OBSERVED, on explicit approval. Modeled on `wf-003-run-live.test.ts`.
 *
 * Guarded: runs ONLY if `LIVE_RUN=1` AND the catalog is reachable. The normal suite
 * (`npm test`) always SKIPS it → no billed call by default.
 *
 * Runs the real spine with the SDK's REAL `query()` (hard caps +
 * `permissionMode:"plan"` read-only), real sidecar (≥ v4.1.0) + real prose.
 * Expected outcome: `completed` if the 8 agents produce DoD-conformant JSON —
 * including a « cleared » verdict from AGENT-AUDIT-METHODO-IA (the counter-review
 * gate) and a non-« Unacceptable » tier from AGENT-JURIDIQUE-IA — otherwise
 * `failed` fail-closed at the first unsatisfied gate. Auth: subscription OAuth only.
 *
 * The seeded context targets a HIGH-RISK (audited, not unacceptable) system so the
 * run traverses the whole backbone, including the counter-review clearance gate —
 * the capability this workflow was picked to exercise.
 *
 * Launch: `LIVE_RUN=1 npx vitest run test/wf-008-run-live.test.ts`
 * Optional model routing: `LIVE_MODEL=fable` (SDK alias or full model id) routes
 * every step agent to that model — e.g. a separate-quota model for cheap re-runs.
 */
import { describe, it, expect } from "vitest";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSidecar } from "../src/loader/load-sidecar.js";
import { runWf008 } from "../src/spines/run-wf-008.js";
import { CATALOG_ROOT, SIDECAR_PATH } from "./catalog-root.js";
import { makeStepProgressHook } from "./live-progress.js";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const RESULT_FILE =
  process.env.LIVE_RESULT_FILE ??
  join(HERE, "..", "docs", "audit", "live-runs", "wf-008-live-result.json");
// Incremental PROGRESS trace (gitignored): written at each step, so usable even if
// the run is interrupted (timeout / session limit). Lets you PROBE progress LIVE
// during a background run.
const PROGRESS_FILE =
  process.env.LIVE_PROGRESS_FILE ??
  join(HERE, "..", "docs", "audit", "live-runs", "wf-008-live-progress.json");

const ENABLED = !!process.env.LIVE_RUN && existsSync(SIDECAR_PATH);

describe.skipIf(!ENABLED)("WF-008 — LIVE RUN (billed, observed)", () => {
  it(
    "runs the WF-008 spine live (capped, read-only)",
    async () => {
      const sidecar = loadSidecar(SIDECAR_PATH, CATALOG_ROOT);

      const res = await runWf008({
        sidecar,
        catalogRoot: CATALOG_ROOT,
        ...(process.env.LIVE_MODEL ? { model: process.env.LIVE_MODEL } : {}),
        initialInput: {
          client: "European insurer (mid-cap, EU-only footprint).",
          system:
            "AI Act / GDPR compliance audit of a claims-triage AI system in production: " +
            "an LLM-based classifier that routes and prioritizes insurance claims from the " +
            "policies/claims knowledge base. High-risk tier (Annex III), personal data, " +
            "preventive audit ahead of a possible CNIL review — from obligations mapping " +
            "through an independent methodology counter-review to the final audit report.",
          origin: "Preventive (regulatory pressure)",
          frameworks: "AI Act + GDPR + NIS2 + ISO 42001",
          highStakes: true,
        },
        runnerDeps: { caps: { maxBudgetUsd: 4.0, maxTurns: 15 } },
        onStep: makeStepProgressHook(PROGRESS_FILE),
      });

      console.log("\n===== WF-008 LIVE RUN RESULT =====");
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
