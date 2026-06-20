/**
 * Offline proof of the full WF-001 LIVE PATH (§2.4-B.3): `runWf001` wired to the
 * REAL `createQueryRunner`, with a mocked `query()`. Shows that output-format
 * injection makes the spine COMPLETABLE:
 *   - a `query()` returning conformant JSON per step → spine `completed`;
 *   - a `query()` returning prose → fail-closed (JSON parse impossible).
 *
 * Hermetic: interim sidecar + stub agent resolver + injected `query`. Zero network,
 * zero billed call. The real `createQueryRunner` wiring (OAuth/caps/plan guards) is
 * traversed as-is — only `query()` is mocked.
 */
import { describe, it, expect } from "vitest";
import type {
  AgentDefinition,
  Options,
  SDKMessage,
} from "@anthropic-ai/claude-agent-sdk";
import { runWf001 } from "../src/spines/run-wf-001.js";
import { QueryRunnerError, type QueryFn } from "../src/sdk/query-runner.js";
import type { AgentResolver } from "../src/manifest/load-manifest.js";
import type { Sidecar } from "../src/sidecar/types.js";

// --- Interim sidecar + stub resolver (hermetic, catalog-independent) ---
function agentAsset(id: string, title: string) {
  return {
    id,
    type: "agent" as const,
    path: `${id}.md`,
    title,
    description: `Agent ${title}.`,
    catalogVersion: "v3.26.0",
    source: { file: `${id}.md`, catalogTag: "v3.26.0" },
  };
}
const sidecar: Sidecar = {
  schemaVersion: "1.0.0",
  catalog: { name: "claude-agents", version: "v3.26.0" },
  generatedAt: "2026-06-09T00:00:00Z",
  assets: [
    agentAsset("AGENT-BUSINESS-ANALYST", "Business Analyst"),
    agentAsset("AGENT-PO-SCRUM", "Product Owner Scrum"),
    agentAsset("AGENT-QA-AGILE", "QA Agile"),
  ],
};
const resolveAgent: AgentResolver = (asset): AgentDefinition => ({
  description: asset.description,
  prompt: `stub:${asset.id}`,
  tools: [],
});

// --- DoD-conformant outputs per step ---
const happyBacklog = Array.from({ length: 8 }, (_, i) => ({
  statement: `As a user I want feature ${i + 1} so that I save time`,
  priorite: "must",
  estimation: 3,
  dod: "Tested and validated in UAT",
}));
const stepOutputs: Record<string, unknown> = {
  "STEP-01": {
    besoins: ["Reduce processing time"],
    partiesPrenantes: [{ nom: "Business", role: "sponsor" }],
    perimetre: { in: ["authentication"], out: ["billing"] },
    questionsOuvertes: [],
  },
  "STEP-03": { backlog: happyBacklog, epics: ["Auth", "Search", "Reporting"] },
  "STEP-04": {
    gherkin: [
      { given: "logged in", when: "search", then: "results", type: "nominal" },
      { given: "invalid term", when: "search", then: "error", type: "error" },
      { given: "0 results", when: "search", then: "empty state", type: "boundary" },
    ],
    planTest: "Sprint 1: smoke + 3 scenarios",
  },
};

/**
 * Fake `query()`: routes by the output schema injected in the prompt
 * (`gherkin` → STEP-04, `backlog` → STEP-03, otherwise STEP-01) and returns either
 * the conformant JSON or prose depending on `mode`.
 */
function routedQuery(mode: "json" | "prose"): QueryFn {
  return async function* (params: { prompt: string; options?: Options }) {
    const p = params.prompt;
    const stepId = p.includes('"gherkin"')
      ? "STEP-04"
      : p.includes('"backlog"')
        ? "STEP-03"
        : "STEP-01";
    const result =
      mode === "prose"
        ? "Here is an analysis written as prose, without any JSON."
        : JSON.stringify(stepOutputs[stepId]);
    yield {
      type: "result",
      subtype: "success",
      is_error: false,
      result,
      num_turns: 1,
      errors: [],
    } as unknown as SDKMessage;
  };
}

describe("WF-001 — live path (mocked query, real createQueryRunner)", () => {
  it("query returns conformant JSON per step → spine completed, 3 pass verdicts", async () => {
    const res = await runWf001({
      sidecar,
      resolveAgent,
      runnerDeps: { query: routedQuery("json"), env: {} },
      initialInput: { brief: "Rebuild the B2B portal" },
    });
    expect(res.status).toBe("completed");
    expect(res.traces).toHaveLength(3);
    expect(res.traces.every((t) => t.gate.verdict === "pass")).toBe(true);
    // The output was indeed PARSED into an object by the runner (not a string).
    expect(typeof res.traces[0]!.output).toBe("object");
  });

  it("query returns prose → fail-closed (QueryRunnerError, JSON parse impossible)", async () => {
    await expect(
      runWf001({
        sidecar,
        resolveAgent,
        runnerDeps: { query: routedQuery("prose"), env: {} },
        initialInput: { brief: "x" },
      }),
    ).rejects.toBeInstanceOf(QueryRunnerError);
  });
});
