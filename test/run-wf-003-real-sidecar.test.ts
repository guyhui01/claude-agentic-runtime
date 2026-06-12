/**
 * Preuve bout-en-bout (hors-ligne) : la spine WF-003 est PRÊTE pour le run live
 * avec le SIDECAR RÉEL produit par `claude-agents` (générateur §2.3, ≥ v3.26.2).
 *
 * `loadSidecar` du VRAI `sidecar.json` → `toAgentDefinition` (prose réelle) →
 * `assembleWf003Spine` → `runSpine` (runner mocké, zéro réseau). Le câblage
 * `createQueryRunner` est couvert par `run-wf-003.test.ts`.
 *
 * CI-safe : skip propre si le catalogue est absent (cf. `catalog-root.ts`).
 */
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { loadSidecar } from "../src/loader/load-sidecar.js";
import { toAgentDefinition } from "../src/sdk/to-agent-definition.js";
import { assembleWf003Spine } from "../src/spines/run-wf-003.js";
import { runSpine } from "../src/orchestrator/run-spine.js";
import type { StepRunner } from "../src/orchestrator/types.js";
import { CATALOG_ROOT, SIDECAR_PATH } from "./catalog-root.js";
import { wf003HappyOutputs } from "./fixtures/wf-003-outputs.js";

const HAVE_CATALOG = existsSync(SIDECAR_PATH);

const WF_003_BACKBONE = [
  "AGENT-FINANCIAL-ANALYST",
  "AGENT-PROMPT-ENGINEER",
  "AGENT-AI-ARCHITECT",
  "AGENT-DEV-PYTHON-IA",
  "AGENT-QA-AGILE",
  "AGENT-DEVOPS-CLOUD",
  "AGENT-SECURITE-IA",
];

const mockRunner = (outputs: Record<string, unknown>): StepRunner =>
  async ({ stepId }) => ({ output: outputs[stepId] });

describe.skipIf(!HAVE_CATALOG)("spine WF-003 — sidecar RÉEL (prêt pour run live)", () => {
  it("le backbone WF-003 est résoluble depuis le sidecar réel (inclusion)", () => {
    const sc = loadSidecar(SIDECAR_PATH, CATALOG_ROOT);
    expect(sc.catalog.name).toBe("claude-agents");
    const ids = new Set(sc.assets.map((a) => a.id));
    for (const id of WF_003_BACKBONE) {
      expect(ids).toContain(id);
    }
  });

  it("assemble + déroule la spine avec prose réelle → completed, 7 verdicts pass", async () => {
    const sc = loadSidecar(SIDECAR_PATH, CATALOG_ROOT);
    const steps = assembleWf003Spine(sc, (asset) => toAgentDefinition(asset, CATALOG_ROOT));

    expect(steps[0]!.agent.prompt.toLowerCase()).toContain("financ");
    expect(steps.every((s) => s.agent.prompt.length > 100)).toBe(true);
    expect(steps[0]!.provenance.catalogTag).toBe(sc.catalog.version);

    const res = await runSpine(steps, mockRunner(wf003HappyOutputs), { app: "Chatbot RAG support" });
    expect(res.status).toBe("completed");
    expect(res.traces).toHaveLength(7);
    expect(res.traces.every((t) => t.gate.verdict === "pass")).toBe(true);
  });
});

describe.runIf(!HAVE_CATALOG)("spine WF-003 — sidecar réel (skip)", () => {
  it("skippé : catalogue introuvable (définir CATALOG_ROOT ou checkout sibling)", () => {
    expect(HAVE_CATALOG).toBe(false);
  });
});
