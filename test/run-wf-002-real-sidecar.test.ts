/**
 * End-to-end proof (offline): the WF-002 spine is READY for the live run with the
 * REAL SIDECAR produced by `claude-agents` (generator §2.3, ≥ v3.26.2).
 *
 * Covers the chain that the interim sidecar of `spine-wf-002.test.ts` does not:
 * `loadSidecar` of the REAL `sidecar.json` (schema + integrity + real accessibility
 * of the AGENT-*.md) → `toAgentDefinition` (real prose) → `assembleWf002Spine`
 * → `runSpine`. The only missing piece is the billed `query()` call: here a mocked
 * runner (zero network). The `createQueryRunner` wiring is covered by `run-wf-002.test.ts`.
 *
 * CI-safe: if the catalog is not a sibling (nor `CATALOG_ROOT` set), the block is
 * cleanly SKIPPED (see `catalog-root.ts`). Locally (catalog present), it is authoritative.
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

describe.skipIf(!HAVE_CATALOG)("WF-002 spine — REAL sidecar (ready for live run)", () => {
  it("the WF-002 backbone is resolvable from the real sidecar (inclusion)", () => {
    const sc = loadSidecar(SIDECAR_PATH, CATALOG_ROOT);
    expect(sc.catalog.name).toBe("claude-agents");
    const ids = new Set(sc.assets.map((a) => a.id));
    for (const id of WF_002_BACKBONE) {
      expect(ids).toContain(id);
    }
  });

  it("assembles + runs the spine with real prose → completed, 5 pass verdicts", async () => {
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

describe.runIf(!HAVE_CATALOG)("WF-002 spine — real sidecar (skip)", () => {
  it("skipped: catalog not found (set CATALOG_ROOT or checkout sibling)", () => {
    expect(HAVE_CATALOG).toBe(false);
  });
});
