import { describe, it, expect } from "vitest";
import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import { loadSpine, ManifestValidationError, type AgentResolver } from "../src/manifest/load-manifest.js";
import { runSpine } from "../src/orchestrator/run-spine.js";
import type { StepRunner } from "../src/orchestrator/types.js";
import type { Sidecar } from "../src/sidecar/types.js";
import {
  WF_001_CADRAGE_MANIFEST,
  WF_001_CADRAGE_CRITERIA,
  buildWf001CadrageRegistry,
} from "../src/spines/wf-001-cadrage.js";

/**
 * Tests hermétiques de la spine RÉELLE WF-001 (§2.4-B.3, prép hors-ligne).
 * Valident que le manifeste sourcé du vrai workflow s'assemble et que les vraies
 * gates (DoD) bloquent/laissent passer comme attendu — runner mocké, zéro réseau.
 */

// --- Sidecar intérimaire : les 3 agents du backbone WF-001 ------------------
// (En prod §2.4-B.3, ce sidecar provient de claude-agents via le générateur §2.3.)
function agentAsset(id: string, title: string) {
  return {
    id,
    type: "agent" as const,
    path: `${id}.md`,
    title,
    description: `Agent ${title}.`,
    catalogVersion: "v3.25.0",
    source: { file: `${id}.md`, catalogTag: "v3.25.0" },
  };
}
const sidecar: Sidecar = {
  schemaVersion: "1.0.0",
  catalog: { name: "claude-agents", version: "v3.25.0" },
  generatedAt: "2026-06-03T14:00:00Z",
  assets: [
    agentAsset("AGENT-BUSINESS-ANALYST", "Business Analyst"),
    agentAsset("AGENT-PO-SCRUM", "Product Owner Scrum"),
    agentAsset("AGENT-QA-AGILE", "QA Agile"),
  ],
};

// Resolver mock : le mapping prose→AgentDefinition est couvert par sdk-adapter.test.ts.
const resolveAgent: AgentResolver = (asset): AgentDefinition => ({
  description: asset.description,
  prompt: `stub-prompt:${asset.id}`,
  tools: [],
});

// --- Sorties d'étape conformes au DoD ---------------------------------------
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
  "STEP-03": {
    backlog: happyBacklog,
    epics: ["Auth", "Recherche", "Reporting"],
  },
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

// --- Tests ------------------------------------------------------------------

describe("spine WF-001 — chargement du manifeste réel", () => {
  it("assemble 3 étapes STEP-01→03→04 avec provenance, critères et contrats", () => {
    const steps = loadSpine(WF_001_CADRAGE_MANIFEST, sidecar, buildWf001CadrageRegistry(), resolveAgent);
    expect(steps.map((s) => s.provenance.stepId)).toEqual(["STEP-01", "STEP-03", "STEP-04"]);
    expect(steps.map((s) => s.provenance.assetId)).toEqual([
      "AGENT-BUSINESS-ANALYST",
      "AGENT-PO-SCRUM",
      "AGENT-QA-AGILE",
    ]);
    expect(steps[0]!.contract.input).toBeUndefined(); // amorce
    expect(steps[1]!.contract.input).toBeDefined();
    expect(steps[0]!.criteria.map((c) => c.id)).toContain("ba-perimetre-in-out");
  });

  it("registre : tous les critères du manifeste se résolvent (pas d'id orphelin)", () => {
    const registry = buildWf001CadrageRegistry();
    const allIds = WF_001_CADRAGE_MANIFEST.steps.flatMap((s) => s.criteriaIds);
    expect(() => registry.resolve(allIds)).not.toThrow();
    expect(allIds.length).toBe(WF_001_CADRAGE_CRITERIA.length);
  });

  it("fail-closed : un agent absent du sidecar lève ManifestValidationError", () => {
    const incomplete: Sidecar = { ...sidecar, assets: sidecar.assets.slice(0, 2) }; // QA-AGILE retiré
    expect(() => loadSpine(WF_001_CADRAGE_MANIFEST, incomplete, buildWf001CadrageRegistry(), resolveAgent)).toThrow(
      ManifestValidationError,
    );
  });
});

describe("spine WF-001 — exécution bout-en-bout (runner mocké)", () => {
  it("sorties conformes au DoD → spine completed, 3 traces, verdicts pass", async () => {
    const steps = loadSpine(WF_001_CADRAGE_MANIFEST, sidecar, buildWf001CadrageRegistry(), resolveAgent);
    const res = await runSpine(steps, mockRunner(happyOutputs), { brief: "Refondre le portail B2B" });
    expect(res.status).toBe("completed");
    expect(res.traces).toHaveLength(3);
    expect(res.traces.every((t) => t.gate.verdict === "pass")).toBe(true);
  });

  it("STEP-03 sous le seuil DoD (5 US) → failed à l'eval gate de STEP-03", async () => {
    const steps = loadSpine(WF_001_CADRAGE_MANIFEST, sidecar, buildWf001CadrageRegistry(), resolveAgent);
    const broken = {
      ...happyOutputs,
      "STEP-03": { backlog: happyBacklog.slice(0, 5), epics: ["A", "B", "C"] },
    };
    const res = await runSpine(steps, mockRunner(broken), {});
    expect(res.status).toBe("failed");
    expect(res.failure?.stepId).toBe("STEP-03");
    expect(res.failure?.kind).toBe("eval-gate");
    expect(res.traces).toHaveLength(2); // STEP-01 franchi, STEP-03 fautif tracé
  });

  it("critère advisory non satisfait (pas de cas erreur/limite) → spine completed quand même", async () => {
    const steps = loadSpine(WF_001_CADRAGE_MANIFEST, sidecar, buildWf001CadrageRegistry(), resolveAgent);
    const advisoryOnly = {
      ...happyOutputs,
      "STEP-04": {
        gherkin: [{ given: "g", when: "w", then: "t", type: "nominal" }],
        planTest: "Sprint 1",
      },
    };
    const res = await runSpine(steps, mockRunner(advisoryOnly), {});
    expect(res.status).toBe("completed"); // advisory ne bloque pas
    const qaTrace = res.traces[2]!;
    expect(qaTrace.gate.verdict).toBe("pass");
    expect(qaTrace.gate.results.find((r) => r.id === "qa-cas-erreur-et-limite")?.passed).toBe(false);
  });
});
