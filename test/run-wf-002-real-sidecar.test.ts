/**
 * Preuve bout-en-bout (hors-ligne) : la spine WF-002 est PRÊTE pour le run live
 * avec le SIDECAR RÉEL produit par `claude-agents` (générateur §2.3, ≥ v3.26.2).
 *
 * Couvre la chaîne que le sidecar intérimaire de `spine-wf-002.test.ts` ne couvre
 * pas : `loadSidecar` du VRAI `sidecar.json` (schéma + intégrité + accessibilité
 * réelle des AGENT-*.md) → `toAgentDefinition` (prose réelle) → `assembleWf002Spine`
 * → `runSpine`. Le seul élément absent est l'appel `query()` facturé : ici un runner
 * mocké (zéro réseau). Le câblage `createQueryRunner` est couvert par `run-wf-002.test.ts`.
 *
 * CI-safe : si le catalogue n'est pas en sibling (ni `CATALOG_ROOT` défini), le bloc
 * est SKIPPÉ proprement (cf. `catalog-root.ts`). En local (catalogue présent), il fait foi.
 */
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { loadSidecar } from "../src/loader/load-sidecar.js";
import { toAgentDefinition } from "../src/sdk/to-agent-definition.js";
import { assembleWf002Spine } from "../src/spines/run-wf-002.js";
import { runSpine } from "../src/orchestrator/run-spine.js";
import type { StepRunner } from "../src/orchestrator/types.js";
import { CATALOG_ROOT, SIDECAR_PATH } from "./catalog-root.js";
import { wf002HappyOutputs } from "./fixtures/wf-002-outputs.js";

const HAVE_CATALOG = existsSync(SIDECAR_PATH);

const WF_002_BACKBONE = [
  "AGENT-PRODUCT-MANAGER-SAFE",
  "AGENT-RELEASE-TRAIN-ENGINEER",
  "AGENT-PO-SAFE",
  "AGENT-SCRUM-MASTER",
  "AGENT-CHEF-PROJET-IA",
];

const mockRunner = (outputs: Record<string, unknown>): StepRunner =>
  async ({ stepId }) => ({ output: outputs[stepId] });

describe.skipIf(!HAVE_CATALOG)("spine WF-002 — sidecar RÉEL (prêt pour run live)", () => {
  it("le backbone WF-002 est résoluble depuis le sidecar réel (inclusion)", () => {
    const sc = loadSidecar(SIDECAR_PATH, CATALOG_ROOT);
    expect(sc.catalog.name).toBe("claude-agents");
    const ids = new Set(sc.assets.map((a) => a.id));
    for (const id of WF_002_BACKBONE) {
      expect(ids).toContain(id);
    }
  });

  it("assemble + déroule la spine avec prose réelle → completed, 5 verdicts pass", async () => {
    const sc = loadSidecar(SIDECAR_PATH, CATALOG_ROOT);
    const steps = assembleWf002Spine(sc, (asset) => toAgentDefinition(asset, CATALOG_ROOT));

    expect(steps[0]!.agent.prompt.toLowerCase()).toContain("safe");
    expect(steps.every((s) => s.agent.prompt.length > 100)).toBe(true);
    expect(steps[0]!.provenance.catalogTag).toBe(sc.catalog.version);

    const res = await runSpine(steps, mockRunner(wf002HappyOutputs), { art: "ART Digital Banking" });
    expect(res.status).toBe("completed");
    expect(res.traces).toHaveLength(5);
    expect(res.traces.every((t) => t.gate.verdict === "pass")).toBe(true);
  });
});

describe.runIf(!HAVE_CATALOG)("spine WF-002 — sidecar réel (skip)", () => {
  it("skippé : catalogue introuvable (définir CATALOG_ROOT ou checkout sibling)", () => {
    expect(HAVE_CATALOG).toBe(false);
  });
});
