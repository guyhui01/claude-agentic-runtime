/**
 * End-to-end proof (offline): the WF-001 spine is READY for the live run with the
 * REAL SIDECAR produced by `claude-agents` (generator §2.3, tag v3.26.0).
 *
 * Covers the chain that the interim sidecar of `spine-wf-001.test.ts` does not:
 * `loadSidecar` of the REAL `sidecar.json` (ajv schema + integrity + REAL file
 * accessibility of the AGENT-*.md) → `toAgentDefinition` (REAL prose) →
 * `assembleWf001Spine` → `runSpine`. The only missing piece is the billed `query()`
 * call: here a mocked runner (zero network). Wiring `createQueryRunner` is itself
 * already covered by `query-runner.test.ts`.
 *
 * CI-safe: the runtime does not depend on the catalog (separate repos, ADR-0002). If
 * the catalog is not checked out as a sibling (nor `CATALOG_ROOT` set), the block is
 * cleanly SKIPPED — the runtime CI stays green. Locally (catalog present), it runs
 * and is authoritative.
 */
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { loadSidecar } from "../src/loader/load-sidecar.js";
import { toAgentDefinition } from "../src/sdk/to-agent-definition.js";
import { assembleWf001Spine } from "../src/spines/run-wf-001.js";
import { runSpine } from "../src/orchestrator/run-spine.js";
import type { StepRunner } from "../src/orchestrator/types.js";
import { CATALOG_ROOT, SIDECAR_PATH } from "./catalog-root.js";

const HAVE_CATALOG = existsSync(SIDECAR_PATH);

// DoD-conformant step outputs (same shapes as spine-wf-001.test.ts).
const happyBacklog = Array.from({ length: 8 }, (_, i) => ({
  statement: `As a user I want feature ${i + 1} so that I save time`,
  priorite: "must",
  estimation: 3,
  dod: "Tested and validated in UAT",
}));
const happyOutputs: Record<string, unknown> = {
  "STEP-01": {
    besoins: ["Reduce processing time"],
    partiesPrenantes: [{ nom: "Business", role: "sponsor" }],
    perimetre: { in: ["authentication"], out: ["billing"] },
    questionsOuvertes: [],
  },
  "STEP-03": { backlog: happyBacklog, epics: ["Auth", "Search", "Reporting"] },
  "STEP-04": {
    gherkin: [
      { given: "a logged-in user", when: "they search", then: "they see the results", type: "nominal" },
      { given: "an invalid term", when: "they search", then: "an error message is shown", type: "error" },
      { given: "0 results", when: "they search", then: "an empty state is shown", type: "boundary" },
    ],
    planTest: "Sprint 1: smoke tests + 3 priority scenarios",
  },
};
const mockRunner = (outputs: Record<string, unknown>): StepRunner =>
  async ({ stepId }) => ({ output: outputs[stepId] });

describe.skipIf(!HAVE_CATALOG)("WF-001 spine — REAL sidecar (ready for live run)", () => {
  it("loadSidecar accepts the real sidecar (schema + integrity, real files)", () => {
    const sc = loadSidecar(SIDECAR_PATH, CATALOG_ROOT);
    expect(sc.catalog.name).toBe("claude-agents");
    expect(sc.catalog.version).toMatch(/^v\d+\.\d+\.\d+$/);
    // The WF-001 backbone must be RESOLVABLE from the real sidecar: we check the
    // INCLUSION of the 3 ids, not the exact inventory. The catalog's full inventory
    // (14 assets) is the property of the `claude-agents` generator + its `--check`
    // in CI; the runtime only depends on what it consumes (ADR-0002/0003), so a newly
    // indexed agent must not break this WF-001 test.
    const ids = new Set(sc.assets.map((a) => a.id));
    for (const id of ["AGENT-BUSINESS-ANALYST", "AGENT-PO-SCRUM", "AGENT-QA-AGILE"]) {
      expect(ids).toContain(id);
    }
  });

  it("assembles + runs the spine with real prose → completed, 3 pass verdicts", async () => {
    const sc = loadSidecar(SIDECAR_PATH, CATALOG_ROOT);
    const steps = assembleWf001Spine(sc, (asset) => toAgentDefinition(asset, CATALOG_ROOT));

    // The real prose did feed the prompts.
    expect(steps[0]!.agent.prompt).toContain("Business Analyst");
    expect(steps.every((s) => s.agent.prompt.length > 100)).toBe(true);
    // The provenance traces the catalog's real tag.
    expect(steps[0]!.provenance.catalogTag).toBe(sc.catalog.version);

    const res = await runSpine(steps, mockRunner(happyOutputs), { brief: "Rebuild the B2B portal" });
    expect(res.status).toBe("completed");
    expect(res.traces).toHaveLength(3);
    expect(res.traces.every((t) => t.gate.verdict === "pass")).toBe(true);
  });
});

// If the catalog is absent, document the skip rather than silencing it.
describe.runIf(!HAVE_CATALOG)("WF-001 spine — real sidecar (skip)", () => {
  it("skipped: catalog not found (set CATALOG_ROOT or checkout sibling)", () => {
    expect(HAVE_CATALOG).toBe(false);
  });
});
