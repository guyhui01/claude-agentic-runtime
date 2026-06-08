/**
 * Spine réelle — backbone déterministe de WF-003 « Lancement Application IA » (§2.4-B.4).
 *
 * Sourcé du vrai workflow `claude-agents/workflows/WF-003-lancement-app-ia.md` (v1.2).
 * Backbone = chaîne SÉQUENTIELLE complète des 7 agents core (le fork DEV-TYPESCRIPT-IA
 * est OPTIONNEL, donc hors backbone) :
 *   STEP-00 (FINANCIAL-ANALYST) → STEP-01 (PROMPT-ENGINEER) → STEP-02 (AI-ARCHITECT)
 *   → STEP-03 (DEV-PYTHON-IA) → STEP-04 (QA-AGILE) → STEP-05 (DEVOPS-CLOUD)
 *   → STEP-06 (SECURITE-IA).
 *
 * Conformité ADR identique à WF-001/002 (ADR-0007 manifeste runtime, critères
 * déterministes ISO 19011). Plusieurs critères tracent une `condition_passage`
 * chiffrée du workflow (Go financier · coverage > 80 % · tests ≥ 90 % · 0 Critical).
 *
 * `assetId` attendus comme assets « agent » dans le sidecar du catalogue épinglé.
 */

import type { SpineManifest } from "../manifest/types.js";
import type { Criterion } from "../eval/types.js";
import { CriterionRegistry } from "../eval/criteria-registry.js";
import {
  objSchema,
  arr,
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
// CRITÈRES — tracés à WF-003 (v1.2)
// =============================================================================

/**
 * STEP-00 — AGENT-FINANCIAL-ANALYST.
 * DoD : business case 1-page (ROI/payback) · TCO 3 ans · décision Go/No-Go.
 * condition_passage : Go validé avant lancement du développement.
 */
const STEP00_CRITERIA: Criterion[] = [
  {
    id: "fa-business-case-present",
    description: "STEP-00 : business case 1-page non vide",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["businessCase"]),
  },
  {
    id: "fa-decision-go",
    description: "STEP-00 : condition de passage — décision financière = « Go »",
    severity: "blocking",
    check: (o) => asRecord(o)["decision"] === "Go",
  },
  {
    id: "fa-tco-3ans",
    description: "STEP-00 : TCO 3 ans chiffré (number)",
    severity: "blocking",
    check: (o) => isNumber(asRecord(o)["tco3ans"]),
  },
  {
    id: "fa-analyse-sensibilite",
    description:
      "STEP-00 : analyse de sensibilité — ≥ 3 scénarios (optimiste/réaliste/pessimiste)",
    severity: "advisory",
    check: (o) => minArrayLen(asRecord(o)["analyseSensibilite"], 3),
  },
];

/**
 * STEP-01 — AGENT-PROMPT-ENGINEER.
 * DoD : system prompt production-ready · baseline de test (5 nominaux + 3 limites).
 */
const STEP01_CRITERIA: Criterion[] = [
  {
    id: "pe-system-prompt-present",
    description: "STEP-01 : system prompt principal (production-ready) non vide",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["systemPrompt"]),
  },
  {
    id: "pe-baseline-min-8",
    description: "STEP-01 : baseline de test ≥ 8 cas (5 nominaux + 3 limites)",
    severity: "blocking",
    check: (o) => minArrayLen(asRecord(o)["baselineTest"], 8),
  },
  {
    id: "pe-strategie-tokens",
    description: "STEP-01 : estimation coût tokens / stratégie d'optimisation présente",
    severity: "advisory",
    check: (o) => nonEmptyString(asRecord(o)["strategieTokens"]),
  },
];

/**
 * STEP-02 — AGENT-AI-ARCHITECT.
 * DoD : diagramme C4 niveau 2 · ADR principaux · choix stack (LLM/VectorDB/API).
 * condition_passage : architecture validée avant développement.
 */
const STEP02_CRITERIA: Criterion[] = [
  {
    id: "ai-diagramme-c4",
    description: "STEP-02 : diagramme d'architecture (C4 Level 2) non vide",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["diagrammeC4"]),
  },
  {
    id: "ai-adr-non-vide",
    description: "STEP-02 : ADR principaux documentés (non vide)",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["adrs"]),
  },
  {
    id: "ai-choix-stack-llm",
    description: "STEP-02 : choix de stack explicitant au moins le `llm`",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(asRecord(o)["choixStack"])["llm"]),
  },
  {
    id: "ai-checklist-risques",
    description: "STEP-02 : checklist de risques architecturaux présente",
    severity: "advisory",
    check: (o) => Array.isArray(asRecord(o)["checklistRisques"]),
  },
];

/**
 * STEP-03 — AGENT-DEV-PYTHON-IA.
 * DoD : code structuré · tests unitaires (coverage > 80 %) · README · .env.example.
 */
const STEP03_CRITERIA: Criterion[] = [
  {
    id: "dev-code-present",
    description: "STEP-03 : code source produit (non vide)",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["code"]),
  },
  {
    id: "dev-coverage-min-80",
    description: "STEP-03 : tests unitaires avec coverage ≥ 80 %",
    severity: "blocking",
    check: (o) => numberAtLeast(asRecord(asRecord(o)["testsUnitaires"])["coverage"], 80),
  },
  {
    id: "dev-readme-present",
    description: "STEP-03 : README technique d'installation présent",
    severity: "advisory",
    check: (o) => nonEmptyString(asRecord(o)["readme"]),
  },
];

/**
 * STEP-04 — AGENT-QA-AGILE.
 * DoD : Gherkin BDD · evals LLM (golden dataset 20-50) · taux réussite ≥ 90 %.
 * condition_passage : tests passants ≥ 90 % + 0 bug Critical sur cas nominaux.
 */
const STEP04_CRITERIA: Criterion[] = [
  {
    id: "qa-gherkin-non-vide",
    description: "STEP-04 : scénarios Gherkin BDD (non vide)",
    severity: "blocking",
    check: (o) => nonEmptyArray(asRecord(o)["gherkin"]),
  },
  {
    id: "qa-taux-reussite-90",
    description: "STEP-04 : condition de passage — taux de réussite ≥ 90 %",
    severity: "blocking",
    check: (o) => numberAtLeast(asRecord(o)["tauxReussite"], 90),
  },
  {
    id: "qa-evals-golden-20-50",
    description: "STEP-04 : evals LLM — golden dataset de 20 à 50 cas",
    severity: "blocking",
    check: (o) => arrayLenBetween(asRecord(asRecord(o)["evalsLLM"])["goldenDataset"], 20, 50),
  },
  {
    id: "qa-plan-test-present",
    description: "STEP-04 : plan de tests fonctionnels présent",
    severity: "advisory",
    check: (o) => nonEmptyString(asRecord(o)["planTest"]),
  },
];

/**
 * STEP-05 — AGENT-DEVOPS-CLOUD.
 * DoD : Dockerfile · pipeline GitHub Actions · IaC · runbook déploiement/rollback.
 */
const STEP05_CRITERIA: Criterion[] = [
  {
    id: "ops-pipeline-present",
    description: "STEP-05 : pipeline CI/CD (GitHub Actions) non vide",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["pipeline"]),
  },
  {
    id: "ops-dockerfile-present",
    description: "STEP-05 : Dockerfile présent",
    severity: "blocking",
    check: (o) => nonEmptyString(asRecord(o)["dockerfile"]),
  },
  {
    id: "ops-iac-present",
    description: "STEP-05 : Infrastructure as Code présente",
    severity: "advisory",
    check: (o) => nonEmptyString(asRecord(o)["iac"]),
  },
  {
    id: "ops-runbook-present",
    description: "STEP-05 : runbook déploiement et rollback présent",
    severity: "advisory",
    check: (o) => nonEmptyString(asRecord(o)["runbook"]),
  },
];

/**
 * STEP-06 — AGENT-SECURITE-IA.
 * DoD : rapport OWASP LLM Top 10 (LLM01-LLM10) · plan de remédiation priorisé.
 * condition_passage : 0 vulnérabilité Critical, < 2 High non résiduelles.
 */
const STEP06_CRITERIA: Criterion[] = [
  {
    id: "sec-owasp-llm-10",
    description: "STEP-06 : rapport couvrant les 10 catégories OWASP LLM (LLM01-LLM10)",
    severity: "blocking",
    check: (o) => minArrayLen(asRecord(o)["rapportOwasp"], 10),
  },
  {
    id: "sec-zero-critical",
    description: "STEP-06 : condition de passage — 0 vulnérabilité Critical",
    severity: "blocking",
    check: (o) => asRecord(asRecord(o)["vulnerabilites"])["critical"] === 0,
  },
  {
    id: "sec-high-sous-2",
    description: "STEP-06 : condition de passage — < 2 vulnérabilités High",
    severity: "blocking",
    check: (o) => {
      const high = asRecord(asRecord(o)["vulnerabilites"])["high"];
      return isNumber(high) && high < 2;
    },
  },
  {
    id: "sec-plan-remediation",
    description: "STEP-06 : plan de remédiation priorisé présent",
    severity: "advisory",
    check: (o) => Array.isArray(asRecord(o)["planRemediation"]),
  },
];

/** Tous les critères de la spine WF-003 (ordre du backbone). */
export const WF_003_LANCEMENT_CRITERIA: Criterion[] = [
  ...STEP00_CRITERIA,
  ...STEP01_CRITERIA,
  ...STEP02_CRITERIA,
  ...STEP03_CRITERIA,
  ...STEP04_CRITERIA,
  ...STEP05_CRITERIA,
  ...STEP06_CRITERIA,
];

/** Construit un registre frais peuplé des critères de la spine WF-003. */
export function buildWf003LancementRegistry(): CriterionRegistry {
  return new CriterionRegistry().registerAll(WF_003_LANCEMENT_CRITERIA);
}

// =============================================================================
// MANIFESTE — backbone WF-003 (contrats I/O + références de critères par id)
// =============================================================================

/**
 * Contrats conçus pour un handoff linéaire fail-closed : chaque sortie promet le
 * champ requis par l'entrée immédiate aval
 * (businessCase → systemPrompt → choixStack → code → tauxReussite → pipeline).
 */
export const WF_003_LANCEMENT_MANIFEST: SpineManifest = {
  spineId: "WF-003-lancement-backbone",
  steps: [
    {
      stepId: "STEP-00",
      assetId: "AGENT-FINANCIAL-ANALYST",
      // amorce : brief projet = entrée initiale de runSpine
      output: objSchema(["businessCase", "decision", "tco3ans"], {
        businessCase: str,
        decision: str,
        tco3ans: num,
        analyseSensibilite: arr,
      }),
      criteriaIds: STEP00_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-01",
      assetId: "AGENT-PROMPT-ENGINEER",
      input: objSchema(["businessCase"], { businessCase: str }),
      output: objSchema(["systemPrompt", "baselineTest"], {
        systemPrompt: str,
        baselineTest: arr,
        strategieTokens: str,
      }),
      criteriaIds: STEP01_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-02",
      assetId: "AGENT-AI-ARCHITECT",
      input: objSchema(["systemPrompt"], { systemPrompt: str }),
      output: objSchema(["diagrammeC4", "adrs", "choixStack"], {
        diagrammeC4: str,
        adrs: arr,
        choixStack: obj,
      }),
      criteriaIds: STEP02_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-03",
      assetId: "AGENT-DEV-PYTHON-IA",
      input: objSchema(["choixStack"], { choixStack: obj }),
      output: objSchema(["code", "testsUnitaires"], {
        code: str,
        testsUnitaires: obj,
        readme: str,
      }),
      criteriaIds: STEP03_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-04",
      assetId: "AGENT-QA-AGILE",
      input: objSchema(["code"], { code: str }),
      output: objSchema(["gherkin", "tauxReussite", "evalsLLM"], {
        gherkin: arr,
        tauxReussite: num,
        evalsLLM: obj,
        planTest: str,
      }),
      criteriaIds: STEP04_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-05",
      assetId: "AGENT-DEVOPS-CLOUD",
      input: objSchema(["tauxReussite"], { tauxReussite: num }),
      output: objSchema(["pipeline", "dockerfile"], {
        pipeline: str,
        dockerfile: str,
        iac: str,
        runbook: str,
      }),
      criteriaIds: STEP05_CRITERIA.map((c) => c.id),
    },
    {
      stepId: "STEP-06",
      assetId: "AGENT-SECURITE-IA",
      input: objSchema(["pipeline"], { pipeline: str }),
      output: objSchema(["rapportOwasp", "vulnerabilites"], {
        rapportOwasp: arr,
        vulnerabilites: obj,
        planRemediation: arr,
      }),
      criteriaIds: STEP06_CRITERIA.map((c) => c.id),
    },
  ],
};
