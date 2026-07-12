/**
 * End-to-end proof (offline): the WF-009 spine is READY for the live run with the
 * REAL SIDECAR produced by `claude-agents` (generator §2.3, ≥ v4.1.0).
 *
 * `loadSidecar` of the REAL `sidecar.json` → `toAgentDefinition` (real prose) →
 * `assembleWf009Spine` → `runSpine` (mocked runner, zero network). The
 * `createQueryRunner` wiring is covered by `run-wf-009.test.ts`.
 *
 * CI-safe: clean skip if the catalog is absent (see `catalog-root.ts`).
 */
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { loadSidecar } from "../src/loader/load-sidecar.js";
import { toAgentDefinition } from "../src/sdk/to-agent-definition.js";
import { assembleWf009Spine } from "../src/spines/run-wf-009.js";
import { runSpine } from "../src/orchestrator/run-spine.js";
import type { StepRunner } from "../src/orchestrator/types.js";
import { CATALOG_ROOT, SIDECAR_PATH } from "./catalog-root.js";
import { wf009HappyOutputs } from "./fixtures/wf-009-outputs.js";

const HAVE_CATALOG = existsSync(SIDECAR_PATH);

// The four distinct core agents of the WF-009 backbone (RH-IA carries STEP-04/05/06).
const WF_009_BACKBONE = [
  "AGENT-BUSINESS-ANALYST",
  "AGENT-CONSULTANT-IA",
  "AGENT-REDACTEUR-IA",
  "AGENT-RH-IA",
];

const mockRunner = (outputs: Record<string, unknown>): StepRunner =>
  async ({ stepId }) => ({ output: outputs[stepId] });

describe.skipIf(!HAVE_CATALOG)("WF-009 spine — REAL sidecar (ready for live run)", () => {
  it("the WF-009 backbone is resolvable from the real sidecar (inclusion)", () => {
    const sc = loadSidecar(SIDECAR_PATH, CATALOG_ROOT);
    expect(sc.catalog.name).toBe("claude-agents");
    const ids = new Set(sc.assets.map((a) => a.id));
    for (const id of WF_009_BACKBONE) {
      expect(ids).toContain(id);
    }
  });

  it("assembles + runs the spine with real prose → completed, 6 pass verdicts", async () => {
    const sc = loadSidecar(SIDECAR_PATH, CATALOG_ROOT);
    const steps = assembleWf009Spine(sc, (asset) => toAgentDefinition(asset, CATALOG_ROOT));

    expect(steps.every((s) => s.agent.prompt.length > 100)).toBe(true);
    expect(steps[3]!.provenance.assetId).toBe("AGENT-RH-IA");
    expect(steps[0]!.provenance.catalogTag).toBe(sc.catalog.version);

    const res = await runSpine(steps, mockRunner(wf009HappyOutputs), { role: "Senior AI Engineer" });
    expect(res.status).toBe("completed");
    expect(res.traces).toHaveLength(6);
    expect(res.traces.every((t) => t.gate.verdict === "pass")).toBe(true);
  });
});

describe.runIf(!HAVE_CATALOG)("WF-009 spine — real sidecar (skip)", () => {
  it("skipped: catalog not found (set CATALOG_ROOT or checkout sibling)", () => {
    expect(HAVE_CATALOG).toBe(false);
  });
});
