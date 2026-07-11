/**
 * End-to-end proof (offline): the WF-008 spine is READY for the live run with the
 * REAL SIDECAR produced by `claude-agents` (≥ v4.1.0 — the release that widened the
 * sidecar to WF-008's 8 agents, including AGENT-AUDIT-METHODO-IA).
 *
 * `loadSidecar` of the REAL `sidecar.json` → `toAgentDefinition` (real prose) →
 * `assembleWf008Spine` → `runSpine` (mocked runner, zero network). The
 * `createQueryRunner` wiring is covered by the WF-003 tests (same runner).
 *
 * CI-safe: clean skip if the catalog is absent (see `catalog-root.ts`).
 */
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { loadSidecar } from "../src/loader/load-sidecar.js";
import { toAgentDefinition } from "../src/sdk/to-agent-definition.js";
import { assembleWf008Spine } from "../src/spines/run-wf-008.js";
import { runSpine } from "../src/orchestrator/run-spine.js";
import type { StepRunner } from "../src/orchestrator/types.js";
import { CATALOG_ROOT, SIDECAR_PATH } from "./catalog-root.js";
import { wf008HappyOutputs } from "./fixtures/wf-008-outputs.js";

const HAVE_CATALOG = existsSync(SIDECAR_PATH);

const WF_008_BACKBONE = [
  "AGENT-JURIDIQUE-IA",
  "AGENT-AI-ARCHITECT",
  "AGENT-SECURITE-IA",
  "AGENT-DATA-ENGINEER",
  "AGENT-CDO-DIRECTEUR-IA",
  "AGENT-CHANGE-MANAGER",
  "AGENT-AUDIT-METHODO-IA",
  "AGENT-REDACTEUR-IA",
];

const mockRunner = (outputs: Record<string, unknown>): StepRunner =>
  async ({ stepId }) => ({ output: outputs[stepId] });

describe.skipIf(!HAVE_CATALOG)("WF-008 spine — REAL sidecar (ready for live run)", () => {
  it("the WF-008 backbone is resolvable from the real sidecar (inclusion)", () => {
    const sc = loadSidecar(SIDECAR_PATH, CATALOG_ROOT);
    expect(sc.catalog.name).toBe("claude-agents");
    const ids = new Set(sc.assets.map((a) => a.id));
    for (const id of WF_008_BACKBONE) {
      expect(ids).toContain(id);
    }
  });

  it("assembles + runs the spine with real prose → completed, 8 pass verdicts", async () => {
    const sc = loadSidecar(SIDECAR_PATH, CATALOG_ROOT);
    const steps = assembleWf008Spine(sc, (asset) => toAgentDefinition(asset, CATALOG_ROOT));

    expect(steps[0]!.agent.prompt.length).toBeGreaterThan(100);
    expect(steps.every((s) => s.agent.prompt.length > 100)).toBe(true);
    expect(steps[0]!.provenance.catalogTag).toBe(sc.catalog.version);

    const res = await runSpine(steps, mockRunner(wf008HappyOutputs), {
      client: "Insurer", system: "Claims-triage AI", origin: "Preventive audit",
    });
    expect(res.status).toBe("completed");
    expect(res.traces).toHaveLength(8);
    expect(res.traces.every((t) => t.gate.verdict === "pass")).toBe(true);
  });
});

describe.runIf(!HAVE_CATALOG)("WF-008 spine — real sidecar (skip)", () => {
  it("skipped: catalog not found (set CATALOG_ROOT or checkout sibling)", () => {
    expect(HAVE_CATALOG).toBe(false);
  });
});
