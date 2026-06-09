/**
 * RUN LIVE de la spine WF-001 (§2.4-B.3) — FACTURÉ, OBSERVÉ, sur accord explicite.
 *
 * Gardé : ne s'exécute QUE si `LIVE_RUN=1` ET le catalogue est joignable. La suite
 * normale (`npm test`) le SKIP toujours → aucun appel facturé par défaut.
 *
 * Déroule la spine réelle avec le VRAI `query()` du SDK (via `createQueryRunner`,
 * caps durs + `permissionMode:"plan"` read-only), sidecar réel (`claude-agents`
 * v3.26.0) + prose réelle (`toAgentDefinition`). Issue attendue : `completed` si
 * les 3 agents produisent un JSON conforme aux DoD, sinon `failed` fail-closed à
 * la 1ʳᵉ gate non satisfaite (résultat valide, tracé). Auth : OAuth abonnement
 * uniquement (jamais ANTHROPIC_API_KEY — garde du runner).
 *
 * Lancement : `LIVE_RUN=1 npx vitest run test/wf-001-run-live.test.ts`
 */
import { describe, it, expect } from "vitest";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSidecar } from "../src/loader/load-sidecar.js";
import { runWf001 } from "../src/spines/run-wf-001.js";

/** Fichier de capture du résultat (observabilité, indépendant du reporter vitest). */
const RESULT_FILE = process.env.LIVE_RESULT_FILE ?? "/tmp/wf-001-live-result.json";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const CATALOG_ROOT =
  process.env.CATALOG_ROOT ?? join(HERE, "..", "..", "claude-catalogue");
const SIDECAR = join(CATALOG_ROOT, "sidecar.json");
const ENABLED = !!process.env.LIVE_RUN && existsSync(SIDECAR);

describe.skipIf(!ENABLED)("WF-001 — RUN LIVE (facturé, observé)", () => {
  it(
    "déroule la spine WF-001 en live (capé, read-only)",
    async () => {
      const sidecar = loadSidecar(SIDECAR, CATALOG_ROOT);
      const res = await runWf001({
        sidecar,
        catalogRoot: CATALOG_ROOT,
        initialInput: {
          brief:
            "Refondre le portail client B2B d'un assureur : espace self-care, " +
            "suivi des contrats et déclaration de sinistres, web et mobile.",
        },
        runnerDeps: { caps: { maxBudgetUsd: 1.0, maxTurns: 6 } },
      });

      console.log("\n===== RÉSULTAT RUN LIVE WF-001 =====");
      console.log("status :", res.status);
      if (res.failure) console.log("failure:", JSON.stringify(res.failure));
      for (const t of res.traces) {
        console.log(
          `- ${t.provenance.stepId} (${t.provenance.assetId}) → verdict=${t.gate.verdict}`,
        );
        console.log(
          "    " +
            t.gate.results
              .map((r) => `${r.id}:${r.passed ? "ok" : "KO"}`)
              .join("  "),
        );
      }
      console.log("====================================\n");

      // Capture garantie sur disque (statut + verdicts + sorties tracées).
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
