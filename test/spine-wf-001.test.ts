import { describe, it, expect } from "vitest";
import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import { loadSpine, ManifestValidationError, type AgentResolver } from "../src/manifest/load-manifest.js";
import { runSpine } from "../src/orchestrator/run-spine.js";
import type { StepRunner } from "../src/orchestrator/types.js";
import type { Sidecar } from "../src/sidecar/types.js";
import {
  WF_001_CADRAGE_MANIFEST,
  WF_001_CADRAGE_CRITERIA,
  buildWf001CadrageRegistry,
} from "../src/spines/wf-001-cadrage.js";

/**
 * Hermetic tests for the REAL WF-001 spine (§2.4-B.3, offline prep).
 * Validate that the manifest sourced from the real workflow assembles and that the
 * real gates (DoD) block/let through as expected — mocked runner, zero network.
 */

// --- Interim sidecar: the 3 WF-001 backbone agents --------------------------
// (In prod §2.4-B.3, this sidecar comes from claude-agents via the §2.3 generator.)
function agentAsset(id: string, title: string) {
  return {
    id,
    type: "agent" as const,
    path: `${id}.md`,
    title,
    description: `Agent ${title}.`,
    catalogVersion: "v3.25.0",
    source: { file: `${id}.md`, catalogTag: "v3.25.0" },
  };
}
const sidecar: Sidecar = {
  schemaVersion: "1.0.0",
  catalog: { name: "claude-agents", version: "v3.25.0" },
  generatedAt: "2026-06-03T14:00:00Z",
  assets: [
    agentAsset("AGENT-BUSINESS-ANALYST", "Business Analyst"),
    agentAsset("AGENT-PO-SCRUM", "Product Owner Scrum"),
    agentAsset("AGENT-QA-AGILE", "QA Agile"),
  ],
};

// Mock resolver: the prose→AgentDefinition mapping is covered by sdk-adapter.test.ts.
const resolveAgent: AgentResolver = (asset): AgentDefinition => ({
  description: asset.description,
  prompt: `stub-prompt:${asset.id}`,
  tools: [],
});

// --- DoD-compliant step outputs ---------------------------------------------
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
  "STEP-03": {
    backlog: happyBacklog,
    epics: ["Auth", "Search", "Reporting"],
  },
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

// --- Tests ------------------------------------------------------------------

describe("WF-001 spine — loading the real manifest", () => {
  it("assembles 3 steps STEP-01→03→04 with provenance, criteria, and contracts", () => {
    const steps = loadSpine(WF_001_CADRAGE_MANIFEST, sidecar, buildWf001CadrageRegistry(), resolveAgent);
    expect(steps.map((s) => s.provenance.stepId)).toEqual(["STEP-01", "STEP-03", "STEP-04"]);
    expect(steps.map((s) => s.provenance.assetId)).toEqual([
      "AGENT-BUSINESS-ANALYST",
      "AGENT-PO-SCRUM",
      "AGENT-QA-AGILE",
    ]);
    expect(steps[0]!.contract.input).toBeUndefined(); // seed
    expect(steps[1]!.contract.input).toBeDefined();
    expect(steps[0]!.criteria.map((c) => c.id)).toContain("ba-perimetre-in-out");
  });

  it("registry: every manifest criterion resolves (no dangling id)", () => {
    const registry = buildWf001CadrageRegistry();
    const allIds = WF_001_CADRAGE_MANIFEST.steps.flatMap((s) => s.criteriaIds);
    expect(() => registry.resolve(allIds)).not.toThrow();
    expect(allIds.length).toBe(WF_001_CADRAGE_CRITERIA.length);
  });

  it("fail-closed: an agent missing from the sidecar throws ManifestValidationError", () => {
    const incomplete: Sidecar = { ...sidecar, assets: sidecar.assets.slice(0, 2) }; // QA-AGILE removed
    expect(() => loadSpine(WF_001_CADRAGE_MANIFEST, incomplete, buildWf001CadrageRegistry(), resolveAgent)).toThrow(
      ManifestValidationError,
    );
  });
});

describe("WF-001 spine — end-to-end execution (mocked runner)", () => {
  it("DoD-conformant outputs → spine completed, 3 traces, pass verdicts", async () => {
    const steps = loadSpine(WF_001_CADRAGE_MANIFEST, sidecar, buildWf001CadrageRegistry(), resolveAgent);
    const res = await runSpine(steps, mockRunner(happyOutputs), { brief: "Rebuild the B2B portal" });
    expect(res.status).toBe("completed");
    expect(res.traces).toHaveLength(3);
    expect(res.traces.every((t) => t.gate.verdict === "pass")).toBe(true);
  });

  it("STEP-03 below the DoD threshold (5 US) → failed at STEP-03's eval gate", async () => {
    const steps = loadSpine(WF_001_CADRAGE_MANIFEST, sidecar, buildWf001CadrageRegistry(), resolveAgent);
    const broken = {
      ...happyOutputs,
      "STEP-03": { backlog: happyBacklog.slice(0, 5), epics: ["A", "B", "C"] },
    };
    const res = await runSpine(steps, mockRunner(broken), {});
    expect(res.status).toBe("failed");
    expect(res.failure?.stepId).toBe("STEP-03");
    expect(res.failure?.kind).toBe("eval-gate");
    expect(res.traces).toHaveLength(2); // STEP-01 passed, STEP-03 faulty, traced
  });

  it("unsatisfied advisory criterion (no error/boundary case) → spine completed anyway", async () => {
    const steps = loadSpine(WF_001_CADRAGE_MANIFEST, sidecar, buildWf001CadrageRegistry(), resolveAgent);
    const advisoryOnly = {
      ...happyOutputs,
      "STEP-04": {
        gherkin: [{ given: "g", when: "w", then: "t", type: "nominal" }],
        planTest: "Sprint 1",
      },
    };
    const res = await runSpine(steps, mockRunner(advisoryOnly), {});
    expect(res.status).toBe("completed"); // advisory does not block
    const qaTrace = res.traces[2]!;
    expect(qaTrace.gate.verdict).toBe("pass");
    expect(qaTrace.gate.results.find((r) => r.id === "qa-cas-erreur-et-limite")?.passed).toBe(false);
  });
});
