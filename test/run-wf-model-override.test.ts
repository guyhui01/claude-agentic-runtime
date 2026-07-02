/**
 * HERMETIC test of the per-run model routing (`RunWf00XOptions.model`).
 *
 * The two ends of the chain are already covered elsewhere:
 *   - `sdk-adapter.test.ts`: `overrides.model` → `AgentDefinition.model`;
 *   - `query-runner.test.ts`: `agent.model` → `query()` `options.model`.
 * What THIS file proves is the new middle link: `runWf00X({ model })` builds the
 * derived resolver with that override, so EVERY step agent of the spine reaches
 * `query()` with `options.model` set (e.g. "fable" → separate-quota live runs).
 *
 * Uses a temp on-disk catalog (real `toAgentDefinition` prose reads — the derived
 * resolver path, NOT an injected stub) + an injected fake `query` ⇒ zero network,
 * zero billed call.
 */
import { describe, it, expect, afterAll } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Options, SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { QueryFn, QueryRunnerDeps } from "../src/sdk/query-runner.js";
import type { Sidecar } from "../src/sidecar/types.js";
import type { SpineResult } from "../src/orchestrator/types.js";
import { runWf001 } from "../src/spines/run-wf-001.js";
import { runWf002 } from "../src/spines/run-wf-002.js";
import { runWf003 } from "../src/spines/run-wf-003.js";
import { wf001HappyOutputs } from "./fixtures/wf-001-outputs.js";
import { wf002HappyOutputs } from "./fixtures/wf-002-outputs.js";
import { wf003HappyOutputs } from "./fixtures/wf-003-outputs.js";

// --- One spine = one case (run fn + step map + DoD-compliant outputs) --------
interface CommonRunOptions {
  sidecar: Sidecar;
  catalogRoot: string;
  model?: string;
  runnerDeps?: QueryRunnerDeps;
}
interface SpineCase {
  name: string;
  run: (opts: CommonRunOptions) => Promise<SpineResult>;
  stepByAsset: Record<string, string>;
  outputs: Record<string, unknown>;
}
const CASES: SpineCase[] = [
  {
    name: "WF-001",
    run: runWf001,
    stepByAsset: {
      "AGENT-BUSINESS-ANALYST": "STEP-01",
      "AGENT-PO-SCRUM": "STEP-03",
      "AGENT-QA-AGILE": "STEP-04",
    },
    outputs: wf001HappyOutputs,
  },
  {
    name: "WF-002",
    run: runWf002,
    stepByAsset: {
      "AGENT-PRODUCT-MANAGER-SAFE": "STEP-01",
      "AGENT-RELEASE-TRAIN-ENGINEER": "STEP-02",
      "AGENT-PO-SAFE": "STEP-03",
      "AGENT-SCRUM-MASTER": "STEP-04",
      "AGENT-CHEF-PROJET-IA": "STEP-06",
    },
    outputs: wf002HappyOutputs,
  },
  {
    name: "WF-003",
    run: runWf003,
    stepByAsset: {
      "AGENT-FINANCIAL-ANALYST": "STEP-00",
      "AGENT-PROMPT-ENGINEER": "STEP-01",
      "AGENT-AI-ARCHITECT": "STEP-02",
      "AGENT-DEV-PYTHON-IA": "STEP-03",
      "AGENT-QA-AGILE": "STEP-04",
      "AGENT-DEVOPS-CLOUD": "STEP-05",
      "AGENT-SECURITE-IA": "STEP-06",
    },
    outputs: wf003HappyOutputs,
  },
];

// --- Temp catalog: prose of each agent = a routing marker (no trailing \n) ---
const ALL_AGENT_IDS = [...new Set(CASES.flatMap((c) => Object.keys(c.stepByAsset)))];
const CATALOG_TMP = mkdtempSync(join(tmpdir(), "runtime-model-override-"));
for (const id of ALL_AGENT_IDS) {
  writeFileSync(join(CATALOG_TMP, `${id}.md`), `stub-prompt:${id}`, "utf-8");
}
afterAll(() => rmSync(CATALOG_TMP, { recursive: true, force: true }));

function agentAsset(id: string) {
  return {
    id,
    type: "agent" as const,
    path: `${id}.md`,
    title: id,
    description: `Agent ${id}.`,
    catalogVersion: "v3.25.0",
    source: { file: `${id}.md`, catalogTag: "v3.25.0" },
  };
}
function sidecarFor(c: SpineCase): Sidecar {
  return {
    schemaVersion: "1.0.0",
    catalog: { name: "claude-agents", version: "v3.25.0" },
    generatedAt: "2026-07-02T14:00:00Z",
    assets: Object.keys(c.stepByAsset).map(agentAsset),
  };
}

/** Fake query: records `options.model` per call, routes outputs by the prose marker. */
function fakeQuery(c: SpineCase, seenModels: (string | undefined)[]): QueryFn {
  return async function* (params: { prompt: string; options?: Options }) {
    seenModels.push(params.options?.model);
    const assetId = String(params.options?.systemPrompt ?? "")
      .trim()
      .replace("stub-prompt:", "");
    const stepId = c.stepByAsset[assetId]!;
    yield {
      type: "result",
      subtype: "success",
      is_error: false,
      result: "",
      num_turns: 1,
      errors: [],
      structured_output: c.outputs[stepId],
    } as unknown as SDKMessage;
  };
}

const emptyEnv: Record<string, string | undefined> = {};

// --- Tests -------------------------------------------------------------------

describe("runWf00X — per-run model routing (derived resolver)", () => {
  for (const c of CASES) {
    it(`${c.name}: model "fable" reaches query() options for every step`, async () => {
      const seenModels: (string | undefined)[] = [];
      const res = await c.run({
        sidecar: sidecarFor(c),
        catalogRoot: CATALOG_TMP,
        model: "fable",
        runnerDeps: { query: fakeQuery(c, seenModels), env: emptyEnv },
      });
      expect(res.status).toBe("completed");
      const stepCount = Object.keys(c.stepByAsset).length;
      expect(seenModels).toHaveLength(stepCount);
      expect(seenModels.every((m) => m === "fable")).toBe(true);
    });
  }

  it("WF-001 without `model`: query() receives no model (SDK default preserved)", async () => {
    const c = CASES[0]!;
    const seenModels: (string | undefined)[] = [];
    const res = await c.run({
      sidecar: sidecarFor(c),
      catalogRoot: CATALOG_TMP,
      runnerDeps: { query: fakeQuery(c, seenModels), env: emptyEnv },
    });
    expect(res.status).toBe("completed");
    expect(seenModels.every((m) => m === undefined)).toBe(true);
  });
});
