/**
 * Preuve bout-en-bout (hors-ligne) : la spine WF-001 est PRÊTE pour le run live
 * avec le SIDECAR RÉEL produit par `claude-agents` (générateur §2.3, tag v3.26.0).
 *
 * Couvre la chaîne que le sidecar intérimaire de `spine-wf-001.test.ts` ne couvre
 * pas : `loadSidecar` du VRAI `sidecar.json` (schéma ajv + intégrité + accessibilité
 * RÉELLE des fichiers AGENT-*.md) → `toAgentDefinition` (prose RÉELLE) →
 * `assembleWf001Spine` → `runSpine`. Le seul élément absent est l'appel `query()`
 * facturé : ici un runner mocké (zéro réseau). Câbler `createQueryRunner` est, lui,
 * déjà couvert par `query-runner.test.ts`.
 *
 * CI-safe : le runtime ne dépend pas du catalogue (repos séparés, ADR-0002). Si le
 * catalogue n'est pas checkout en sibling (ni `CATALOG_ROOT` défini), le bloc est
 * SKIPPÉ proprement — la CI runtime reste verte. En local (catalogue présent), il
 * s'exécute et fait foi.
 */
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSidecar } from "../src/loader/load-sidecar.js";
import { toAgentDefinition } from "../src/sdk/to-agent-definition.js";
import { assembleWf001Spine } from "../src/spines/run-wf-001.js";
import { runSpine } from "../src/orchestrator/run-spine.js";
import type { StepRunner } from "../src/orchestrator/types.js";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const CATALOG_ROOT =
  process.env.CATALOG_ROOT ?? join(HERE, "..", "..", "claude-catalogue");
const SIDECAR_PATH = join(CATALOG_ROOT, "sidecar.json");
const HAVE_CATALOG = existsSync(SIDECAR_PATH);

// Sorties d'étape conformes au DoD (mêmes formes que spine-wf-001.test.ts).
const happyBacklog = Array.from({ length: 8 }, (_, i) => ({
  statement: `En tant que utilisateur je veux la fonctionnalité ${i + 1} afin de gagner du temps`,
  priorite: "must",
  estimation: 3,
  dod: "Testé et validé en recette",
}));
const happyOutputs: Record<string, unknown> = {
  "STEP-01": {
    besoins: ["Réduire le temps de traitement"],
    partiesPrenantes: [{ nom: "Métier", role: "sponsor" }],
    perimetre: { in: ["authentification"], out: ["facturation"] },
    questionsOuvertes: [],
  },
  "STEP-03": { backlog: happyBacklog, epics: ["Auth", "Recherche", "Reporting"] },
  "STEP-04": {
    gherkin: [
      { given: "un utilisateur connecté", when: "il recherche", then: "il voit les résultats", type: "nominal" },
      { given: "un terme invalide", when: "il recherche", then: "un message d'erreur s'affiche", type: "erreur" },
      { given: "0 résultat", when: "il recherche", then: "un état vide s'affiche", type: "limite" },
    ],
    planTest: "Sprint 1 : smoke tests + 3 scénarios prioritaires",
  },
};
const mockRunner = (outputs: Record<string, unknown>): StepRunner =>
  async ({ stepId }) => ({ output: outputs[stepId] });

describe.skipIf(!HAVE_CATALOG)("spine WF-001 — sidecar RÉEL (prêt pour run live)", () => {
  it("loadSidecar accepte le sidecar réel (schéma + intégrité, fichiers réels)", () => {
    const sc = loadSidecar(SIDECAR_PATH, CATALOG_ROOT);
    expect(sc.catalog.name).toBe("claude-agents");
    expect(sc.catalog.version).toMatch(/^v\d+\.\d+\.\d+$/);
    expect(sc.assets.map((a) => a.id).sort()).toEqual([
      "AGENT-BUSINESS-ANALYST",
      "AGENT-PO-SCRUM",
      "AGENT-QA-AGILE",
    ]);
  });

  it("assemble + déroule la spine avec prose réelle → completed, 3 verdicts pass", async () => {
    const sc = loadSidecar(SIDECAR_PATH, CATALOG_ROOT);
    const steps = assembleWf001Spine(sc, (asset) => toAgentDefinition(asset, CATALOG_ROOT));

    // La prose réelle a bien alimenté les prompts.
    expect(steps[0]!.agent.prompt).toContain("Business Analyst");
    expect(steps.every((s) => s.agent.prompt.length > 100)).toBe(true);
    // La provenance trace le tag réel du catalogue.
    expect(steps[0]!.provenance.catalogTag).toBe(sc.catalog.version);

    const res = await runSpine(steps, mockRunner(happyOutputs), { brief: "Refondre le portail B2B" });
    expect(res.status).toBe("completed");
    expect(res.traces).toHaveLength(3);
    expect(res.traces.every((t) => t.gate.verdict === "pass")).toBe(true);
  });
});

// Si le catalogue est absent, on documente le skip plutôt que de le taire en silence.
describe.runIf(!HAVE_CATALOG)("spine WF-001 — sidecar réel (skip)", () => {
  it("skippé : catalogue introuvable (définir CATALOG_ROOT ou checkout sibling)", () => {
    expect(HAVE_CATALOG).toBe(false);
  });
});
