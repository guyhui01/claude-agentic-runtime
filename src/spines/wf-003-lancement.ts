/**
 * Real spine — deterministic backbone of WF-003 "AI Application Launch" (§2.4-B.4).
 *
 * Sourced from the real workflow `claude-agents/workflows/WF-003-lancement-app-ia.md` (v1.2).
 * Backbone = the complete SEQUENTIAL chain of the 7 core agents (the DEV-TYPESCRIPT-IA
 * fork is OPTIONAL, so outside the backbone):
 *   STEP-00 (FINANCIAL-ANALYST) → STEP-01 (PROMPT-ENGINEER) → STEP-02 (AI-ARCHITECT)
 *   → STEP-03 (DEV-PYTHON-IA) → STEP-04 (QA-AGILE) → STEP-05 (DEVOPS-CLOUD)
 *   → STEP-06 (SECURITE-IA).
 *
 * ADR compliance identical to WF-001/002 (ADR-0007 runtime manifest, deterministic
 * ISO 19011 criteria). Several criteria trace a quantified `condition_passage`
 * from the workflow (financial Go · coverage > 80% · tests ≥ 90% · 0 Critical).
 *
 * `assetId` values expected as "agent" assets in the pinned catalog's sidecar.
 */

import type { SpineManifest } from "../manifest/types.js";
import type { Criterion } from "../eval/types.js";
import { CriterionRegistry } from "../eval/criteria-registry.js";
import {
  objSchema,
  arrOf,
  str,
  num,
  obj,
  asRecord,
  nonEmptyArray,
  arrayLenBetween,
  minArrayLen,
  nonEmptyString,
  isNumber,
  numberAtLeast,
} from "./spine-helpers.js";

// =============================================================================
// CRITERIA — traced to WF-003 (v1.2)
// =============================================================================

/**
 * STEP-00 — AGENT-FINANCIAL-ANALYST.
 * DoD: 1-page business case (ROI/payback) · 3-year TCO · Go/No-Go decision.
 * condition_passage: Go validated before development starts.
 */
const STEP00_CRITERIA: Criterion[] = [
  {
    id: "fa-business-case-present",
    description: "STEP-00: 1-page business case non-empty",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["businessCase"]),
  },
  {
    id: "fa-decision-go",
    description: "STEP-00: passing condition — financial decision = « Go »",
    severity: "blocking",
    check: (o) => asRecord(o)["decision"] === "Go",
  },
  {
    id: "fa-tco-3ans",
    description: "STEP-00: 3-year TCO quantified (number)",
    severity: "blocking",
    check: (o) => isNumber(asRecord(o)["tco3ans"]),
  },
  {
    id: "fa-analyse-sensibilite",
    description:
      "STEP-00: sensitivity analysis — ≥ 3 scenarios (optimistic/realistic/pessimistic)",
    severity: "advisory",
    check: (o) => minArrayLen(asRecord(o)["analyseSensibilite"], 3),
  },
];

/**
 * STEP-01 — AGENT-PROMPT-ENGINEER.
 * DoD: production-ready system prompt · test baseline (5 nominal + 3 boundary).
 */
const STEP01_CRITERIA: Criterion[] = [
  {
    id: "pe-system-prompt-present",
    description: "STEP-01: main system prompt (production-ready) non-empty",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["systemPrompt"]),
  },
  {
    id: "pe-baseline-min-8",
    description: "STEP-01: test baseline ≥ 8 cases (5 nominal + 3 boundary)",
    severity: "blocking",
    check: (o) => minArrayLen(asRecord(o)["baselineTest"], 8),
  },
  {
    id: "pe-strategie-tokens",
    description: "STEP-01: token cost estimate / optimization strategy present",
    severity: "advisory",
    check: (o) => nonEmptyString(asRecord(o)["strategieTokens"]),
  },
];

/**
 * STEP-02 — AGENT-AI-ARCHITECT.
 * DoD: C4 level 2 diagram · main ADRs · stack choice (LLM/VectorDB/API).
 * condition_passage: architecture validated before development.
 */
const STEP02_CRITERIA: Criterion[] = [
  {
    id: "ai-diagramme-c4",
    description: "STEP-02: architecture diagram (C4 Level 2) non-empty",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["diagrammeC4"]),
  },
  {
    id: "ai-adr-non-vide",
    description: "STEP-02: main ADRs documented (non-empty)",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["adrs"]),
  },
  {
    id: "ai-choix-stack-llm",
    description: "STEP-02: stack choice making at least the `llm` explicit",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(asRecord(o)["choixStack"])["llm"]),
  },
  {
    id: "ai-checklist-risques",
    description: "STEP-02: architectural risk checklist present",
    severity: "advisory",
    check: (o) => Array.isArray(asRecord(o)["checklistRisques"]),
  },
];

/**
 * STEP-03 — AGENT-DEV-PYTHON-IA.
 * DoD: structured code · unit tests (coverage > 80%) · README · .env.example.
 */
const STEP03_CRITERIA: Criterion[] = [
  {
    id: "dev-code-present",
    description: "STEP-03: source code produced (non-empty)",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["code"]),
  },
  {
    id: "dev-coverage-min-80",
    description: "STEP-03: unit tests with coverage ≥ 80%",
    severity: "blocking",
    check: (o) => numberAtLeast(asRecord(asRecord(o)["testsUnitaires"])["coverage"], 80),
  },
  {
    id: "dev-readme-present",
    description: "STEP-03: technical installation README present",
    severity: "advisory",
    check: (o) => nonEmptyString(asRecord(o)["readme"]),
  },
];

/**
 * STEP-04 — AGENT-QA-AGILE.
 * DoD: Gherkin BDD · LLM evals (golden dataset 20-50) · pass rate ≥ 90%.
 * condition_passage: tests passing ≥ 90% + 0 Critical bug on nominal cases.
 */
const STEP04_CRITERIA: Criterion[] = [
  {
    id: "qa-gherkin-non-vide",
    description: "STEP-04: Gherkin BDD scenarios (non-empty)",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["gherkin"]),
  },
  {
    id: "qa-taux-reussite-90",
    description: "STEP-04: passing condition — pass rate ≥ 90%",
    severity: "blocking",
    check: (o) => numberAtLeast(asRecord(o)["tauxReussite"], 90),
  },
  {
    id: "qa-evals-golden-20-50",
    description: "STEP-04: LLM evals — golden dataset of 20 to 50 cases",
    severity: "blocking",
    check: (o) => arrayLenBetween(asRecord(asRecord(o)["evalsLLM"])["goldenDataset"], 20, 50),
  },
  {
    id: "qa-plan-test-present",
    description: "STEP-04: functional test plan present",
    severity: "advisory",
    check: (o) => nonEmptyString(asRecord(o)["planTest"]),
  },
];

/**
 * STEP-05 — AGENT-DEVOPS-CLOUD.
 * DoD: Dockerfile · GitHub Actions pipeline · IaC · deploy/rollback runbook.
 */
const STEP05_CRITERIA: Criterion[] = [
  {
    id: "ops-pipeline-present",
    description: "STEP-05: CI/CD pipeline (GitHub Actions) non-empty",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["pipeline"]),
  },
  {
    id: "ops-dockerfile-present",
    description: "STEP-05: Dockerfile present",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["dockerfile"]),
  },
  {
    id: "ops-iac-present",
    description: "STEP-05: Infrastructure as Code present",
    severity: "advisory",
    check: (o) => nonEmptyString(asRecord(o)["iac"]),
  },
  {
    id: "ops-runbook-present",
    description: "STEP-05: deploy and rollback runbook present",
    severity: "advisory",
    check: (o) => nonEmptyString(asRecord(o)["runbook"]),
  },
];

/**
 * STEP-06 — AGENT-SECURITE-IA.
 * DoD: OWASP LLM Top 10 report (LLM01-LLM10) · prioritized remediation plan.
 * condition_passage: 0 Critical vulnerability, < 2 non-residual High.
 */
const STEP06_CRITERIA: Criterion[] = [
  {
    id: "sec-owasp-llm-10",
    description: "STEP-06: report covering the 10 OWASP LLM categories (LLM01-LLM10)",
    severity: "blocking",
    check: (o) => minArrayLen(asRecord(o)["rapportOwasp"], 10),
  },
  {
    id: "sec-zero-critical",
    description: "STEP-06: passing condition — 0 Critical vulnerability",
    severity: "blocking",
    check: (o) => asRecord(asRecord(o)["vulnerabilites"])["critical"] === 0,
  },
  {
    id: "sec-high-sous-2",
    description: "STEP-06: passing condition — < 2 High vulnerabilities",
    severity: "blocking",
    check: (o) => {
      const high = asRecord(asRecord(o)["vulnerabilites"])["high"];
      return isNumber(high) && high < 2;
    },
  },
  {
    id: "sec-plan-remediation",
    description: "STEP-06: prioritized remediation plan present",
    severity: "advisory",
    check: (o) => Array.isArray(asRecord(o)["planRemediation"]),
  },
];

/** All criteria of the WF-003 spine (backbone order). */
export const WF_003_LANCEMENT_CRITERIA: Criterion[] = [
  ...STEP00_CRITERIA,
  ...STEP01_CRITERIA,
  ...STEP02_CRITERIA,
  ...STEP03_CRITERIA,
  ...STEP04_CRITERIA,
  ...STEP05_CRITERIA,
  ...STEP06_CRITERIA,
];

/** Builds a fresh registry populated with the WF-003 spine criteria. */
export function buildWf003LancementRegistry(): CriterionRegistry {
  return new CriterionRegistry().registerAll(WF_003_LANCEMENT_CRITERIA);
}

// =============================================================================
// MANIFEST — WF-003 backbone (I/O contracts + criteria references by id)
// =============================================================================

/**
 * Contracts designed for a linear fail-closed handoff: each output promises the
 * field required by the immediate downstream input
 * (businessCase → systemPrompt → choixStack → code → tauxReussite → pipeline).
 */
export const WF_003_LANCEMENT_MANIFEST: SpineManifest = {
  spineId: "WF-003-lancement-backbone",
  steps: [
    {
      stepId: "STEP-00",
      assetId: "AGENT-FINANCIAL-ANALYST",
      // seed: project brief = runSpine's initial input. Tightened (WF-001 lesson).
      output: objSchema(["businessCase", "decision", "tco3ans"], {
        businessCase: { type: "string", description: "1-page business case (ROI/payback)." },
        // Blocking fa-decision-go: exact value « Go » communicated to the agent.
        decision: {
          type: "string",
          description: "Financial decision: « Go » or « No-Go ». « Go » required to pass.",
        },
        tco3ans: { type: "number", description: "3-year TCO (quantified amount)." },
        // Advisory nudge fa-analyse-sensibilite (≥ 3 scenarios) — no hard constraint.
        analyseSensibilite: {
          type: "array",
          description: "Sensitivity analysis: ≥ 3 scenarios (optimistic/realistic/pessimistic).",
        },
      }),
      criteriaIds: STEP00_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-01",
      assetId: "AGENT-PROMPT-ENGINEER",
      input: objSchema(["businessCase"], { businessCase: str }),
      output: objSchema(["systemPrompt", "baselineTest"], {
        systemPrompt: { type: "string", description: "Main system prompt (production-ready)." },
        // Blocking pe-baseline-min-8: ≥ 8 cases (5 nominal + 3 boundary).
        baselineTest: arrOf(
          objSchema([], {
            cas: { type: "string", description: "Test case description." },
            type: { type: "string", description: "nominal | boundary" },
          }),
          { min: 8 },
        ),
        // Advisory nudge pe-strategie-tokens.
        strategieTokens: { type: "string", description: "Token cost estimate / optimization strategy." },
      }),
      criteriaIds: STEP01_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-02",
      assetId: "AGENT-AI-ARCHITECT",
      input: objSchema(["systemPrompt"], { systemPrompt: str }),
      output: objSchema(["diagrammeC4", "adrs", "choixStack"], {
        diagrammeC4: { type: "string", description: "Architecture diagram (C4 Level 2)." },
        // Blocking ai-adr-non-vide: at least one ADR.
        adrs: arrOf(
          objSchema([], {
            id: { type: "string", description: "ADR identifier (e.g. ADR-001)." },
            titre: { type: "string", description: "Title of the architecture decision." },
          }),
          { min: 1 },
        ),
        // Blocking ai-choix-stack-llm: the `llm` must be made explicit.
        choixStack: objSchema(["llm"], {
          llm: { type: "string", description: "Selected LLM model." },
          vectorDb: { type: "string", description: "Selected vector database." },
          api: { type: "string", description: "Selected framework/API." },
        }),
        // Advisory nudge ai-checklist-risques.
        checklistRisques: { type: "array", description: "Architectural risk checklist." },
      }),
      criteriaIds: STEP02_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-03",
      assetId: "AGENT-DEV-PYTHON-IA",
      input: objSchema(["choixStack"], { choixStack: obj }),
      output: objSchema(["code", "testsUnitaires"], {
        code: { type: "string", description: "Source code produced." },
        // Blocking dev-coverage-min-80: coverage ≥ 80%.
        testsUnitaires: objSchema(["coverage"], {
          coverage: { type: "number", description: "Test coverage in %; ≥ 80 required." },
        }),
        // Advisory nudge dev-readme-present.
        readme: { type: "string", description: "Technical installation README." },
      }),
      criteriaIds: STEP03_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-04",
      assetId: "AGENT-QA-AGILE",
      input: objSchema(["code"], { code: str }),
      output: objSchema(["gherkin", "tauxReussite", "evalsLLM"], {
        // Blocking qa-gherkin-non-vide: at least one scenario.
        gherkin: arrOf(
          objSchema([], {
            given: { type: "string" },
            when: { type: "string" },
            then: { type: "string" },
            type: { type: "string", description: "nominal | error | boundary" },
          }),
          { min: 1 },
        ),
        // Blocking qa-taux-reussite-90: threshold ≥ 90% communicated.
        tauxReussite: { type: "number", description: "Test pass rate in %; ≥ 90 required." },
        // Blocking qa-evals-golden-20-50: golden dataset of 20 to 50 cases.
        evalsLLM: objSchema(["goldenDataset"], {
          goldenDataset: arrOf(undefined, { min: 20, max: 50 }),
          faithfulness: { type: "number", description: "Response faithfulness score (0–1)." },
        }),
        // Advisory nudge qa-plan-test-present.
        planTest: { type: "string", description: "Functional test plan." },
      }),
      criteriaIds: STEP04_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-05",
      assetId: "AGENT-DEVOPS-CLOUD",
      input: objSchema(["tauxReussite"], { tauxReussite: num }),
      output: objSchema(["pipeline", "dockerfile"], {
        pipeline: { type: "string", description: "CI/CD pipeline (GitHub Actions)." },
        dockerfile: { type: "string", description: "Application Dockerfile." },
        // Advisory nudges ops-iac-present / ops-runbook-present.
        iac: { type: "string", description: "Infrastructure as Code (Terraform, etc.)." },
        runbook: { type: "string", description: "Deploy and rollback runbook." },
      }),
      criteriaIds: STEP05_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-06",
      assetId: "AGENT-SECURITE-IA",
      input: objSchema(["pipeline"], { pipeline: str }),
      output: objSchema(["rapportOwasp", "vulnerabilites"], {
        // Blocking sec-owasp-llm-10: cover the 10 OWASP LLM categories.
        rapportOwasp: arrOf(
          objSchema([], {
            category: { type: "string", description: "OWASP LLM category (LLM01–LLM10)." },
            status: { type: "string", description: "Audit status for the category." },
          }),
          { min: 10 },
        ),
        // Blocking sec-zero-critical / sec-high-sous-2: 0 Critical, < 2 High.
        vulnerabilites: objSchema(["critical", "high"], {
          critical: { type: "number", description: "Number of Critical vulnerabilities; 0 required." },
          high: { type: "number", description: "Number of High vulnerabilities; < 2 required." },
          medium: { type: "number", description: "Number of Medium vulnerabilities." },
          low: { type: "number", description: "Number of Low vulnerabilities." },
        }),
        // Advisory nudge sec-plan-remediation.
        planRemediation: { type: "array", description: "Prioritized remediation plan." },
      }),
      criteriaIds: STEP06_CRITERIA.map((c) => c.id),
    },
  ],
};
