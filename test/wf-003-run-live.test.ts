/**
 * RUN LIVE de la spine WF-003 « Lancement Application IA » (§2.4-B.4) — FACTURÉ,
 * OBSERVÉ, sur accord explicite. Calqué sur `wf-001-run-live.test.ts`.
 *
 * Gardé : ne s'exécute QUE si `LIVE_RUN=1` ET le catalogue est joignable. La suite
 * normale (`npm test`) le SKIP toujours → aucun appel facturé par défaut.
 *
 * Déroule la spine réelle avec le VRAI `query()` du SDK (caps durs +
 * `permissionMode:"plan"` read-only), sidecar réel + prose réelle. Issue attendue :
 * `completed` si les 7 agents produisent un JSON conforme aux DoD, sinon `failed`
 * fail-closed à la 1ʳᵉ gate non satisfaite. Auth : OAuth abonnement uniquement.
 *
 * Lancement : `LIVE_RUN=1 npx vitest run test/wf-003-run-live.test.ts`
 */
import { describe, it, expect } from "vitest";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSidecar } from "../src/loader/load-sidecar.js";
import { runWf003 } from "../src/spines/run-wf-003.js";
import { CATALOG_ROOT, SIDECAR_PATH } from "./catalog-root.js";
import { makeStepProgressHook } from "./live-progress.js";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const RESULT_FILE =
  process.env.LIVE_RESULT_FILE ??
  join(HERE, "..", "docs", "audit", "live-runs", "wf-003-live-result.json");
// Trace de PROGRESSION incrémentale (gitignorée) : écrite à chaque étape, donc
// exploitable même si le run est interrompu (timeout / limite de session). Permet
// de SONDER l'avancement EN DIRECT pendant un run d'arrière-plan.
const PROGRESS_FILE =
  process.env.LIVE_PROGRESS_FILE ??
  join(HERE, "..", "docs", "audit", "live-runs", "wf-003-live-progress.json");

const ENABLED = !!process.env.LIVE_RUN && existsSync(SIDECAR_PATH);

describe.skipIf(!ENABLED)("WF-003 — RUN LIVE (facturé, observé)", () => {
  it(
    "déroule la spine WF-003 en live (capé, read-only)",
    async () => {
      const sidecar = loadSidecar(SIDECAR_PATH, CATALOG_ROOT);

      const res = await runWf003({
        sidecar,
        catalogRoot: CATALOG_ROOT,
        initialInput: {
          app: "Lancement d'un chatbot RAG de support client pour un assureur : " +
            "réponses sourcées sur la base de connaissances contrats/sinistres, " +
            "du business case au déploiement sécurisé.",
        },
        runnerDeps: { caps: { maxBudgetUsd: 1.0, maxTurns: 6 } },
        onStep: makeStepProgressHook(PROGRESS_FILE),
      });

      console.log("\n===== RÉSULTAT RUN LIVE WF-003 =====");
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
