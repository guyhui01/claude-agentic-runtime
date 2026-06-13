/**
 * RUN LIVE de la spine WF-002 « Delivery Agile SAFe » (§2.4-B.4) — FACTURÉ, OBSERVÉ,
 * sur accord explicite. Calqué sur `wf-001-run-live.test.ts`.
 *
 * Gardé : ne s'exécute QUE si `LIVE_RUN=1` ET le catalogue est joignable. La suite
 * normale (`npm test`) le SKIP toujours → aucun appel facturé par défaut.
 *
 * Déroule la spine réelle avec le VRAI `query()` du SDK (via `createQueryRunner`,
 * caps durs + `permissionMode:"plan"` read-only), sidecar réel + prose réelle.
 * Issue attendue : `completed` si les 5 agents produisent un JSON conforme aux DoD,
 * sinon `failed` fail-closed à la 1ʳᵉ gate non satisfaite (résultat valide, tracé).
 * Auth : OAuth abonnement uniquement (jamais ANTHROPIC_API_KEY — garde du runner).
 *
 * Lancement : `LIVE_RUN=1 npx vitest run test/wf-002-run-live.test.ts`
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
// Trace de progression incrémentale (gitignorée), sondable en direct (cf. WF-003).
const PROGRESS_FILE =
  process.env.LIVE_PROGRESS_FILE ??
  join(HERE, "..", "docs", "audit", "live-runs", "wf-002-live-progress.json");

const ENABLED = !!process.env.LIVE_RUN && existsSync(SIDECAR_PATH);

describe.skipIf(!ENABLED)("WF-002 — RUN LIVE (facturé, observé)", () => {
  it(
    "déroule la spine WF-002 en live (capé, read-only)",
    async () => {
      const sidecar = loadSidecar(SIDECAR_PATH, CATALOG_ROOT);
      const res = await runWf002({
        sidecar,
        catalogRoot: CATALOG_ROOT,
        initialInput: {
          art: "ART « Digital Banking » d'une banque de détail : refonte du portail " +
            "client (self-care, paiements, réclamations), PI Planning du prochain " +
            "Program Increment, équipes web et mobile.",
        },
        runnerDeps: { caps: { maxBudgetUsd: 1.0, maxTurns: 6 } },
        onStep: makeStepProgressHook(PROGRESS_FILE),
      });

      console.log("\n===== RÉSULTAT RUN LIVE WF-002 =====");
      console.log("status :", res.status);
      if (res.failure) console.log("failure:", JSON.stringify(res.failure));
      for (const t of res.traces) {
        console.log(`- ${t.provenance.stepId} (${t.provenance.assetId}) → verdict=${t.gate.verdict}`);
        console.log("    " + t.gate.results.map((r) => `${r.id}:${r.passed ? "ok" : "KO"}`).join("  "));
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
