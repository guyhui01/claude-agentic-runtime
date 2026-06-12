/**
 * Sorties d'étape WF-003 conformes au DoD ET au schéma RESSERRÉ (donc au handoff
 * producer-output). Fixture PARTAGÉE entre le test hermétique (`run-wf-003.test.ts`)
 * et le test « sidecar réel » (`run-wf-003-real-sidecar.test.ts`) — DRY, source unique.
 */

const goldenDataset = Array.from({ length: 25 }, (_, i) => ({ id: i, expected: "ok" }));
const owasp = Array.from({ length: 10 }, (_, i) => ({
  category: `LLM${String(i + 1).padStart(2, "0")}`,
  status: "pass",
}));
const baselineTest = Array.from({ length: 8 }, (_, i) => ({
  cas: `cas-${i}`,
  type: i < 5 ? "nominal" : "limite",
}));

/** Sorties « plein pot » : satisfont tous les critères (blocking ET advisory). */
export const wf003HappyOutputs: Record<string, unknown> = {
  "STEP-00": {
    businessCase: "ROI 2.3x, payback 14 mois.",
    decision: "Go",
    tco3ans: 180000,
    analyseSensibilite: ["optimiste", "réaliste", "pessimiste"],
  },
  "STEP-01": {
    systemPrompt: "Tu es l'assistant RAG du portail client.",
    baselineTest,
    strategieTokens: "Cache prompt + few-shot 3 exemples.",
  },
  "STEP-02": {
    diagrammeC4: "C4 L2 : API ↔ VectorDB ↔ LLM.",
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
    planTest: "Plan de tests fonctionnels manuel + automatisé.",
  },
  "STEP-05": {
    pipeline: "name: CI\non: [push]\njobs: ...",
    dockerfile: "FROM python:3.12-slim",
    iac: 'resource "aws_ecs_service" ...',
    runbook: "Déploiement bleu-vert + rollback automatique.",
  },
  "STEP-06": {
    rapportOwasp: owasp,
    vulnerabilites: { critical: 0, high: 1, medium: 3, low: 5 },
    planRemediation: [{ vuln: "LLM01", action: "input validation" }],
  },
};
