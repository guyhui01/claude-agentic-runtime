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
import { wf009CandidatePool } from "./fixtures/wf-009-outputs.js";
import { affirmativeString, countAffirmativeField } from "../src/spines/spine-helpers.js";

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
          // Sourced candidate pool (SYNTHETIC / FICTIONAL — RGPD: never a real CV in a
          // public, versioned trace). Carried unchanged through STEP-01→03 to reach the RH
          // sourcing step (STEP-04), which scores it into a real shortlist. See the
          // passthrough + RGPD note in src/spines/wf-009-recrutement.ts.
          candidatePool: wf009CandidatePool,
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

      // Substance guard (the hollow-pass lesson baked into the test): a `completed` run
      // must carry REAL content, not merely pass verdicts. Every invariant below is
      // ALREADY gate-guaranteed for a completed run, so a legitimate run cannot fail them
      // (no false negative that would waste the billed run) — they lock the intent and
      // would catch a future gate regression that let a hollow completed slip through.
      if (res.status === "completed") {
        expect(res.traces).toHaveLength(6);
        expect(res.traces.every((t) => t.gate.verdict === "pass")).toBe(true);
        const step04 = res.traces[3]!.output as Record<string, unknown>;
        const step05 = res.traces[4]!.output as Record<string, unknown>;
        // A shortlist of ≥ 3 REAL candidates (not sentinels) and a REAL selected candidate.
        expect(countAffirmativeField(step04["shortlist"], "candidate")).toBeGreaterThanOrEqual(3);
        expect(affirmativeString(step05["selectedCandidate"])).toBe(true);

        // Observability for the content inspection: did the injected pool actually flow
        // through and get scored (vs the agent inventing candidates)?
        const poolIds = wf009CandidatePool.map((c) => c.candidateId);
        console.log("pool provided     :", poolIds.join(", "));
        console.log("STEP-04 shortlist :", JSON.stringify(step04["shortlist"]));
        console.log("STEP-05 selected  :", JSON.stringify(step05["selectedCandidate"]));
      }
    },
    1_800_000,
  );
});
