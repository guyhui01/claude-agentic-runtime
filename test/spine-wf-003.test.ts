import { describe, it, expect } from "vitest";
import { loadSpine, ManifestValidationError } from "../src/manifest/load-manifest.js";
import { runSpine } from "../src/orchestrator/run-spine.js";
import type { Sidecar } from "../src/sidecar/types.js";
import {
  WF_003_LANCEMENT_MANIFEST,
  WF_003_LANCEMENT_CRITERIA,
  buildWf003LancementRegistry,
} from "../src/spines/wf-003-lancement.js";
import {
  wf003InterimSidecar as sidecar,
  wf003ResolveAgent as resolveAgent,
  mockRunner,
} from "./fixtures/wf-003-spine.js";

/** Hermetic tests for the REAL WF-003 spine (AI App Launch), mocked runner. */

const goldenDataset = Array.from({ length: 25 }, (_, i) => ({ id: i, expected: "ok" }));
const owasp = Array.from({ length: 10 }, (_, i) => ({ category: `LLM${String(i + 1).padStart(2, "0")}`, status: "pass" }));
const happyOutputs: Record<string, unknown> = {
  "STEP-00": {
    businessCase: "ROI 2.3x, payback 14 months",
    decision: "Go",
    tco3ans: 180000,
    analyseSensibilite: ["optimistic", "realistic", "pessimistic"],
  },
  "STEP-01": {
    systemPrompt: "You are the portal's RAG assistant.",
    baselineTest: Array.from({ length: 8 }, (_, i) => ({ cas: `cas-${i}`, type: i < 5 ? "nominal" : "boundary" })),
    strategieTokens: "Prompt cache + 3-shot few-shot",
  },
  "STEP-02": {
    diagrammeC4: "C4 L2: API ↔ VectorDB ↔ LLM",
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
    gherkin: [
      { given: "valid query", when: "asked", then: "grounded answer", type: "nominal" },
      { given: "empty query", when: "asked", then: "safe refusal", type: "boundary" },
      { given: "malformed query", when: "asked", then: "handled error", type: "error" },
    ],
    tauxReussite: 94,
    evalsLLM: { goldenDataset, faithfulness: 0.91 },
    planTest: "Functional test plan, manual + automated",
  },
  "STEP-05": {
    pipeline: "name: CI\non: [push]\njobs: ...",
    dockerfile: "FROM python:3.12-slim",
    iac: "resource \"aws_ecs_service\" ...",
    runbook: "Blue-green deployment + automatic rollback",
  },
  "STEP-06": {
    rapportOwasp: owasp,
    vulnerabilites: { critical: 0, high: 1, medium: 3, low: 5 },
    planRemediation: [{ vuln: "LLM01", action: "input validation" }],
  },
};

describe("WF-003 spine — loading and execution (mocked runner)", () => {
  it("assembles the 7-step backbone STEP-00→06 with provenance and criteria", () => {
    const steps = loadSpine(WF_003_LANCEMENT_MANIFEST, sidecar, buildWf003LancementRegistry(), resolveAgent);
    expect(steps.map((s) => s.provenance.stepId)).toEqual([
      "STEP-00", "STEP-01", "STEP-02", "STEP-03", "STEP-04", "STEP-05", "STEP-06",
    ]);
    expect(steps[0]!.contract.input).toBeUndefined(); // seed
    expect(steps[6]!.criteria.map((c) => c.id)).toContain("sec-zero-critical");
  });

  it("registry: every manifest criterion resolves (no dangling id)", () => {
    const registry = buildWf003LancementRegistry();
    const allIds = WF_003_LANCEMENT_MANIFEST.steps.flatMap((s) => s.criteriaIds);
    expect(() => registry.resolve(allIds)).not.toThrow();
    expect(allIds.length).toBe(WF_003_LANCEMENT_CRITERIA.length);
  });

  it("fail-closed: agent missing from the sidecar → ManifestValidationError", () => {
    const incomplete: Sidecar = { ...sidecar, assets: sidecar.assets.slice(0, 6) }; // SECURITE-IA removed
    expect(() => loadSpine(WF_003_LANCEMENT_MANIFEST, incomplete, buildWf003LancementRegistry(), resolveAgent)).toThrow(
      ManifestValidationError,
    );
  });

  it("DoD-conformant outputs → spine completed, 7 traces, pass verdicts", async () => {
    const steps = loadSpine(WF_003_LANCEMENT_MANIFEST, sidecar, buildWf003LancementRegistry(), resolveAgent);
    const res = await runSpine(steps, mockRunner(happyOutputs), { app: "RAG support chatbot" });
    expect(res.status).toBe("completed");
    expect(res.traces).toHaveLength(7);
    expect(res.traces.every((t) => t.gate.verdict === "pass")).toBe(true);
  });

  it("financial Go not granted (STEP-00 No-Go) → failed at STEP-00", async () => {
    const steps = loadSpine(WF_003_LANCEMENT_MANIFEST, sidecar, buildWf003LancementRegistry(), resolveAgent);
    const broken = { ...happyOutputs, "STEP-00": { ...(happyOutputs["STEP-00"] as object), decision: "No-Go" } };
    const res = await runSpine(steps, mockRunner(broken), {});
    expect(res.status).toBe("failed");
    expect(res.failure?.stepId).toBe("STEP-00");
    expect(res.failure?.kind).toBe("eval-gate");
    expect(res.traces).toHaveLength(1);
  });

  it("blocking security audit (1 Critical) → failed at STEP-06", async () => {
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
