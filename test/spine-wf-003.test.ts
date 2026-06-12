import { describe, it, expect } from "vitest";
import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import { loadSpine, ManifestValidationError, type AgentResolver } from "../src/manifest/load-manifest.js";
import { runSpine } from "../src/orchestrator/run-spine.js";
import type { StepRunner } from "../src/orchestrator/types.js";
import type { Sidecar } from "../src/sidecar/types.js";
import {
  WF_003_LANCEMENT_MANIFEST,
  WF_003_LANCEMENT_CRITERIA,
  buildWf003LancementRegistry,
} from "../src/spines/wf-003-lancement.js";

/** Tests hermétiques de la spine RÉELLE WF-003 (Lancement App IA), runner mocké. */

function agentAsset(id: string) {
  return {
    id,
    type: "agent" as const,
    path: `${id}.md`,
    title: id,
    description: `Agent ${id}.`,
    catalogVersion: "v3.25.0",
    source: { file: `${id}.md`, catalogTag: "v3.25.0" },
  };
}
const sidecar: Sidecar = {
  schemaVersion: "1.0.0",
  catalog: { name: "claude-agents", version: "v3.25.0" },
  generatedAt: "2026-06-03T14:00:00Z",
  assets: [
    agentAsset("AGENT-FINANCIAL-ANALYST"),
    agentAsset("AGENT-PROMPT-ENGINEER"),
    agentAsset("AGENT-AI-ARCHITECT"),
    agentAsset("AGENT-DEV-PYTHON-IA"),
    agentAsset("AGENT-QA-AGILE"),
    agentAsset("AGENT-DEVOPS-CLOUD"),
    agentAsset("AGENT-SECURITE-IA"),
  ],
};
const resolveAgent: AgentResolver = (asset): AgentDefinition => ({
  description: asset.description,
  prompt: `stub:${asset.id}`,
  tools: [],
});

const goldenDataset = Array.from({ length: 25 }, (_, i) => ({ id: i, expected: "ok" }));
const owasp = Array.from({ length: 10 }, (_, i) => ({ category: `LLM${String(i + 1).padStart(2, "0")}`, status: "pass" }));
const happyOutputs: Record<string, unknown> = {
  "STEP-00": {
    businessCase: "ROI 2.3x, payback 14 mois",
    decision: "Go",
    tco3ans: 180000,
    analyseSensibilite: ["optimiste", "réaliste", "pessimiste"],
  },
  "STEP-01": {
    systemPrompt: "Tu es l'assistant RAG du portail.",
    baselineTest: Array.from({ length: 8 }, (_, i) => ({ cas: `cas-${i}`, type: i < 5 ? "nominal" : "limite" })),
    strategieTokens: "Cache prompt + few-shot 3 exemples",
  },
  "STEP-02": {
    diagrammeC4: "C4 L2 : API ↔ VectorDB ↔ LLM",
    adrs: [{ id: "ADR-001", titre: "Choix Qdrant" }],
    choixStack: { llm: "claude-opus-4-8", vectorDb: "Qdrant", api: "FastAPI" },
    checklistRisques: ["latence", "coût tokens"],
  },
  "STEP-03": {
    code: "from fastapi import FastAPI\napp = FastAPI()",
    testsUnitaires: { coverage: 85 },
    readme: "## Installation\npip install -r requirements.txt",
  },
  "STEP-04": {
    gherkin: [{ given: "g", when: "w", then: "t", type: "nominal" }],
    tauxReussite: 94,
    evalsLLM: { goldenDataset, faithfulness: 0.91 },
    planTest: "Plan de tests fonctionnels manuel + automatisé",
  },
  "STEP-05": {
    pipeline: "name: CI\non: [push]\njobs: ...",
    dockerfile: "FROM python:3.12-slim",
    iac: "resource \"aws_ecs_service\" ...",
    runbook: "Déploiement bleu-vert + rollback automatique",
  },
  "STEP-06": {
    rapportOwasp: owasp,
    vulnerabilites: { critical: 0, high: 1, medium: 3, low: 5 },
    planRemediation: [{ vuln: "LLM01", action: "input validation" }],
  },
};
const mockRunner = (outputs: Record<string, unknown>): StepRunner =>
  async ({ stepId }) => ({ output: outputs[stepId] });

describe("spine WF-003 — chargement et exécution (runner mocké)", () => {
  it("assemble le backbone des 7 étapes STEP-00→06 avec provenance et critères", () => {
    const steps = loadSpine(WF_003_LANCEMENT_MANIFEST, sidecar, buildWf003LancementRegistry(), resolveAgent);
    expect(steps.map((s) => s.provenance.stepId)).toEqual([
      "STEP-00", "STEP-01", "STEP-02", "STEP-03", "STEP-04", "STEP-05", "STEP-06",
    ]);
    expect(steps[0]!.contract.input).toBeUndefined(); // amorce
    expect(steps[6]!.criteria.map((c) => c.id)).toContain("sec-zero-critical");
  });

  it("registre : tous les critères du manifeste se résolvent (pas d'orphelin)", () => {
    const registry = buildWf003LancementRegistry();
    const allIds = WF_003_LANCEMENT_MANIFEST.steps.flatMap((s) => s.criteriaIds);
    expect(() => registry.resolve(allIds)).not.toThrow();
    expect(allIds.length).toBe(WF_003_LANCEMENT_CRITERIA.length);
  });

  it("fail-closed : agent absent du sidecar → ManifestValidationError", () => {
    const incomplete: Sidecar = { ...sidecar, assets: sidecar.assets.slice(0, 6) }; // SECURITE-IA retiré
    expect(() => loadSpine(WF_003_LANCEMENT_MANIFEST, incomplete, buildWf003LancementRegistry(), resolveAgent)).toThrow(
      ManifestValidationError,
    );
  });

  it("sorties conformes au DoD → spine completed, 7 traces, verdicts pass", async () => {
    const steps = loadSpine(WF_003_LANCEMENT_MANIFEST, sidecar, buildWf003LancementRegistry(), resolveAgent);
    const res = await runSpine(steps, mockRunner(happyOutputs), { app: "Chatbot RAG support" });
    expect(res.status).toBe("completed");
    expect(res.traces).toHaveLength(7);
    expect(res.traces.every((t) => t.gate.verdict === "pass")).toBe(true);
  });

  it("Go financier non validé (STEP-00 No-Go) → failed dès STEP-00", async () => {
    const steps = loadSpine(WF_003_LANCEMENT_MANIFEST, sidecar, buildWf003LancementRegistry(), resolveAgent);
    const broken = { ...happyOutputs, "STEP-00": { ...(happyOutputs["STEP-00"] as object), decision: "No-Go" } };
    const res = await runSpine(steps, mockRunner(broken), {});
    expect(res.status).toBe("failed");
    expect(res.failure?.stepId).toBe("STEP-00");
    expect(res.failure?.kind).toBe("eval-gate");
    expect(res.traces).toHaveLength(1);
  });

  it("audit sécurité bloquant (1 Critical) → failed à STEP-06", async () => {
    const steps = loadSpine(WF_003_LANCEMENT_MANIFEST, sidecar, buildWf003LancementRegistry(), resolveAgent);
    const broken = {
      ...happyOutputs,
      "STEP-06": { ...(happyOutputs["STEP-06"] as object), vulnerabilites: { critical: 1, high: 0 } },
    };
    const res = await runSpine(steps, mockRunner(broken), {});
    expect(res.status).toBe("failed");
    expect(res.failure?.stepId).toBe("STEP-06");
    expect(res.traces).toHaveLength(7);
  });
});
