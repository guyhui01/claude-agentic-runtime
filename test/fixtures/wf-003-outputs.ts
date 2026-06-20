/**
 * WF-003 step outputs compliant with the DoD AND the TIGHTENED schema (hence with
 * the producer-output handoff). Fixture SHARED between the hermetic test
 * (`run-wf-003.test.ts`) and the "real sidecar" test
 * (`run-wf-003-real-sidecar.test.ts`) — DRY, single source.
 */

const goldenDataset = Array.from({ length: 25 }, (_, i) => ({ id: i, expected: "ok" }));
const owasp = Array.from({ length: 10 }, (_, i) => ({
  category: `LLM${String(i + 1).padStart(2, "0")}`,
  status: "pass",
}));
const baselineTest = Array.from({ length: 8 }, (_, i) => ({
  cas: `case-${i}`,
  type: i < 5 ? "nominal" : "boundary",
}));

/** "Full" outputs: satisfy all criteria (blocking AND advisory). */
export const wf003HappyOutputs: Record<string, unknown> = {
  "STEP-00": {
    businessCase: "2.3x ROI, 14-month payback.",
    decision: "Go",
    tco3ans: 180000,
    analyseSensibilite: ["optimistic", "realistic", "pessimistic"],
  },
  "STEP-01": {
    systemPrompt: "You are the customer portal's RAG assistant.",
    baselineTest,
    strategieTokens: "Prompt cache + 3-example few-shot.",
  },
  "STEP-02": {
    diagrammeC4: "C4 L2: API ↔ VectorDB ↔ LLM.",
    adrs: [{ id: "ADR-001", titre: "Qdrant choice" }],
    choixStack: { llm: "claude-opus-4-8", vectorDb: "Qdrant", api: "FastAPI" },
    checklistRisques: ["latency", "token cost"],
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
    planTest: "Manual + automated functional test plan.",
  },
  "STEP-05": {
    pipeline: "name: CI\non: [push]\njobs: ...",
    dockerfile: "FROM python:3.12-slim",
    iac: 'resource "aws_ecs_service" ...',
    runbook: "Blue-green deployment + automatic rollback.",
  },
  "STEP-06": {
    rapportOwasp: owasp,
    vulnerabilites: { critical: 0, high: 1, medium: 3, low: 5 },
    planRemediation: [{ vuln: "LLM01", action: "input validation" }],
  },
};
