/**
 * LIVE RUN of the WF-001 spine (§2.4-B.3) — BILLED, OBSERVED, on explicit approval.
 *
 * Guarded: runs ONLY if `LIVE_RUN=1` AND the catalog is reachable. The normal suite
 * (`npm test`) always SKIPS it → no billed call by default.
 *
 * Runs the real spine with the SDK's REAL `query()` (via `createQueryRunner`,
 * hard caps + `permissionMode:"plan"` read-only), real sidecar (`claude-agents`
 * v3.26.0) + real prose (`toAgentDefinition`). Expected outcome: `completed` if the
 * 3 agents produce DoD-conformant JSON, otherwise `failed` fail-closed at the first
 * unsatisfied gate (valid, traced result). Auth: subscription OAuth only (never
 * ANTHROPIC_API_KEY — runner guard).
 *
 * Launch: `LIVE_RUN=1 npx vitest run test/wf-001-run-live.test.ts`
 */
import { describe, it, expect } from "vitest";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSidecar } from "../src/loader/load-sidecar.js";
import { runWf001 } from "../src/spines/run-wf-001.js";
import { CATALOG_ROOT, SIDECAR_PATH } from "./catalog-root.js";

const HERE = fileURLToPath(new URL(".", import.meta.url));
/**
 * Result capture file (observability, independent of the vitest reporter).
 * ISO v1 audit remediation (P3): PERSISTENT trace in the repo (`docs/audit/live-runs/`),
 * no more ephemeral `/tmp`. The raw `.json` is gitignored; the anonymized trace is
 * committed by decision after review (see `docs/audit/live-runs/README.md`).
 */
const RESULT_FILE =
  process.env.LIVE_RESULT_FILE ??
  join(HERE, "..", "docs", "audit", "live-runs", "wf-001-live-result.json");

const ENABLED = !!process.env.LIVE_RUN && existsSync(SIDECAR_PATH);

describe.skipIf(!ENABLED)("WF-001 — LIVE RUN (billed, observed)", () => {
  it(
    "runs the WF-001 spine live (capped, read-only)",
    async () => {
      const sidecar = loadSidecar(SIDECAR_PATH, CATALOG_ROOT);
      const res = await runWf001({
        sidecar,
        catalogRoot: CATALOG_ROOT,
        initialInput: {
          brief:
            "Rebuild an insurer's B2B customer portal: self-care area, " +
            "policy tracking and claims filing, web and mobile.",
        },
        runnerDeps: { caps: { maxBudgetUsd: 1.0, maxTurns: 6 } },
      });

      console.log("\n===== WF-001 LIVE RUN RESULT =====");
      console.log("status :", res.status);
      if (res.failure) console.log("failure:", JSON.stringify(res.failure));
      for (const t of res.traces) {
        console.log(
          `- ${t.provenance.stepId} (${t.provenance.assetId}) → verdict=${t.gate.verdict}`,
        );
        console.log(
          "    " +
            t.gate.results
              .map((r) => `${r.id}:${r.passed ? "ok" : "FAIL"}`)
              .join("  "),
        );
      }
      console.log("====================================\n");

      // Guaranteed on-disk capture (status + verdicts + traced outputs).
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
    600_000,
  );
});
