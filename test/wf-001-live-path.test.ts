/**
 * Preuve hors-ligne du CHEMIN LIVE complet de WF-001 (§2.4-B.3) : `runWf001`
 * branché sur le VRAI `createQueryRunner`, avec `query()` simulé. Démontre que
 * l'injection de format de sortie rend la spine ABOUTISSABLE :
 *   - un `query()` qui renvoie le JSON conforme par étape → spine `completed` ;
 *   - un `query()` qui renvoie de la prose → fail-closed (parse JSON impossible).
 *
 * Hermétique : sidecar intérimaire + résolveur d'agent stub + `query` injecté.
 * Zéro réseau, zéro appel facturé. Le câblage réel `createQueryRunner` (gardes
 * OAuth/caps/plan) est traversé tel quel — seul `query()` est mocké.
 */
import { describe, it, expect } from "vitest";
import type {
  AgentDefinition,
  Options,
  SDKMessage,
} from "@anthropic-ai/claude-agent-sdk";
import { runWf001 } from "../src/spines/run-wf-001.js";
import { QueryRunnerError, type QueryFn } from "../src/sdk/query-runner.js";
import type { AgentResolver } from "../src/manifest/load-manifest.js";
import type { Sidecar } from "../src/sidecar/types.js";

// --- Sidecar intérimaire + résolveur stub (hermétique, indépendant du catalogue) ---
function agentAsset(id: string, title: string) {
  return {
    id,
    type: "agent" as const,
    path: `${id}.md`,
    title,
    description: `Agent ${title}.`,
    catalogVersion: "v3.26.0",
    source: { file: `${id}.md`, catalogTag: "v3.26.0" },
  };
}
const sidecar: Sidecar = {
  schemaVersion: "1.0.0",
  catalog: { name: "claude-agents", version: "v3.26.0" },
  generatedAt: "2026-06-09T00:00:00Z",
  assets: [
    agentAsset("AGENT-BUSINESS-ANALYST", "Business Analyst"),
    agentAsset("AGENT-PO-SCRUM", "Product Owner Scrum"),
    agentAsset("AGENT-QA-AGILE", "QA Agile"),
  ],
};
const resolveAgent: AgentResolver = (asset): AgentDefinition => ({
  description: asset.description,
  prompt: `stub:${asset.id}`,
  tools: [],
});

// --- Sorties conformes au DoD par étape ---
const happyBacklog = Array.from({ length: 8 }, (_, i) => ({
  statement: `En tant que utilisateur je veux la fonctionnalité ${i + 1} afin de gagner du temps`,
  priorite: "must",
  estimation: 3,
  dod: "Testé et validé en recette",
}));
const stepOutputs: Record<string, unknown> = {
  "STEP-01": {
    besoins: ["Réduire le temps de traitement"],
    partiesPrenantes: [{ nom: "Métier", role: "sponsor" }],
    perimetre: { in: ["authentification"], out: ["facturation"] },
    questionsOuvertes: [],
  },
  "STEP-03": { backlog: happyBacklog, epics: ["Auth", "Recherche", "Reporting"] },
  "STEP-04": {
    gherkin: [
      { given: "connecté", when: "recherche", then: "résultats", type: "nominal" },
      { given: "terme invalide", when: "recherche", then: "erreur", type: "erreur" },
      { given: "0 résultat", when: "recherche", then: "état vide", type: "limite" },
    ],
    planTest: "Sprint 1 : smoke + 3 scénarios",
  },
};

/**
 * Faux `query()` : route par le schéma de sortie injecté dans le prompt
 * (`gherkin` → STEP-04, `backlog` → STEP-03, sinon STEP-01) et renvoie soit le
 * JSON conforme, soit de la prose selon `mode`.
 */
function routedQuery(mode: "json" | "prose"): QueryFn {
  return async function* (params: { prompt: string; options?: Options }) {
    const p = params.prompt;
    const stepId = p.includes('"gherkin"')
      ? "STEP-04"
      : p.includes('"backlog"')
        ? "STEP-03"
        : "STEP-01";
    const result =
      mode === "prose"
        ? "Voici une analyse rédigée en prose, sans aucun JSON."
        : JSON.stringify(stepOutputs[stepId]);
    yield {
      type: "result",
      subtype: "success",
      is_error: false,
      result,
      num_turns: 1,
      errors: [],
    } as unknown as SDKMessage;
  };
}

describe("WF-001 — chemin live (query mocké, createQueryRunner réel)", () => {
  it("query renvoie le JSON conforme par étape → spine completed, 3 verdicts pass", async () => {
    const res = await runWf001({
      sidecar,
      resolveAgent,
      runnerDeps: { query: routedQuery("json"), env: {} },
      initialInput: { brief: "Refondre le portail B2B" },
    });
    expect(res.status).toBe("completed");
    expect(res.traces).toHaveLength(3);
    expect(res.traces.every((t) => t.gate.verdict === "pass")).toBe(true);
    // La sortie a bien été PARSÉE en objet par le runner (pas une string).
    expect(typeof res.traces[0]!.output).toBe("object");
  });

  it("query renvoie de la prose → fail-closed (QueryRunnerError, parse JSON impossible)", async () => {
    await expect(
      runWf001({
        sidecar,
        resolveAgent,
        runnerDeps: { query: routedQuery("prose"), env: {} },
        initialInput: { brief: "x" },
      }),
    ).rejects.toBeInstanceOf(QueryRunnerError);
  });
});
