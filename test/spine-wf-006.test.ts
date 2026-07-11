import { describe, it, expect } from "vitest";
import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import { loadSpine, ManifestValidationError, type AgentResolver } from "../src/manifest/load-manifest.js";
import { runSpine } from "../src/orchestrator/run-spine.js";
import type { StepRunner } from "../src/orchestrator/types.js";
import type { Sidecar } from "../src/sidecar/types.js";
import {
  WF_006_AVANT_VENTE_MANIFEST,
  WF_006_AVANT_VENTE_CRITERIA,
  buildWf006AvantVenteRegistry,
} from "../src/spines/wf-006-avant-vente.js";
import { wf006HappyOutputs as happyOutputs } from "./fixtures/wf-006-outputs.js";

/** Hermetic tests for the REAL WF-006 spine (Pre-sales / Commercial proposal), mocked runner. */

function agentAsset(id: string) {
  return {
    id,
    type: "agent" as const,
    path: `${id}.md`,
    title: id,
    description: `Agent ${id}.`,
    catalogVersion: "v4.1.0",
    source: { file: `${id}.md`, catalogTag: "v4.1.0" },
  };
}
const sidecar: Sidecar = {
  schemaVersion: "1.0.0",
  catalog: { name: "claude-agents", version: "v4.1.0" },
  generatedAt: "2026-07-11T00:00:00Z",
  assets: [
    agentAsset("AGENT-CONSULTANT-IA"),
    agentAsset("AGENT-BUSINESS-ANALYST"),
    agentAsset("AGENT-AI-ARCHITECT"),
    agentAsset("AGENT-CHEF-PROJET-IA"),
    agentAsset("AGENT-FINANCIAL-ANALYST"),
    agentAsset("AGENT-REDACTEUR-IA"),
  ],
};
const resolveAgent: AgentResolver = (asset): AgentDefinition => ({
  description: asset.description,
  prompt: `stub:${asset.id}`,
  tools: [],
});

const mockRunner = (outputs: Record<string, unknown>): StepRunner =>
  async ({ stepId }) => ({ output: outputs[stepId] });

describe("WF-006 spine — loading and execution (mocked runner)", () => {
  it("assembles the 6-step backbone STEP-01→05,07 with provenance and criteria", () => {
    const steps = loadSpine(WF_006_AVANT_VENTE_MANIFEST, sidecar, buildWf006AvantVenteRegistry(), resolveAgent);
    expect(steps.map((s) => s.provenance.stepId)).toEqual([
      "STEP-01", "STEP-02", "STEP-03A", "STEP-04", "STEP-05", "STEP-07",
    ]);
    expect(steps[0]!.contract.input).toBeUndefined(); // seed
    expect(steps[0]!.criteria.map((c) => c.id)).toContain("presales-go");
  });

  it("registry: every manifest criterion resolves (no dangling id)", () => {
    const registry = buildWf006AvantVenteRegistry();
    const allIds = WF_006_AVANT_VENTE_MANIFEST.steps.flatMap((s) => s.criteriaIds);
    expect(() => registry.resolve(allIds)).not.toThrow();
    expect(allIds.length).toBe(WF_006_AVANT_VENTE_CRITERIA.length);
  });

  it("fail-closed: agent missing from the sidecar → ManifestValidationError", () => {
    const incomplete: Sidecar = { ...sidecar, assets: sidecar.assets.slice(0, 5) }; // REDACTEUR-IA removed
    expect(() => loadSpine(WF_006_AVANT_VENTE_MANIFEST, incomplete, buildWf006AvantVenteRegistry(), resolveAgent)).toThrow(
      ManifestValidationError,
    );
  });

  it("DoD-conformant outputs (verdict GO) → spine completed, 6 traces, pass verdicts", async () => {
    const steps = loadSpine(WF_006_AVANT_VENTE_MANIFEST, sidecar, buildWf006AvantVenteRegistry(), resolveAgent);
    const res = await runSpine(steps, mockRunner(happyOutputs), { prospect: "CAC40 insurer RFP" });
    expect(res.status).toBe("completed");
    expect(res.traces).toHaveLength(6);
    expect(res.traces.every((t) => t.gate.verdict === "pass")).toBe(true);
  });

  it("GO/NO-GO gateway: NO-GO verdictCode (STEP-01) → failed at STEP-01, documented no-bid", async () => {
    const noBid = { ...happyOutputs, "STEP-01": { ...(happyOutputs["STEP-01"] as object), verdictCode: "NO-GO" } };
    const steps = loadSpine(WF_006_AVANT_VENTE_MANIFEST, sidecar, buildWf006AvantVenteRegistry(), resolveAgent);
    const res = await runSpine(steps, mockRunner(noBid), {});
    expect(res.status).toBe("failed");
    expect(res.failure?.stepId).toBe("STEP-01");
    expect(res.failure?.kind).toBe("eval-gate");
    expect(res.traces).toHaveLength(1); // the whole workflow halts at the qualification gate
  });

  it("GO/NO-GO gateway: CONDITIONAL verdictCode does not auto-clear either → failed at STEP-01", async () => {
    const conditional = { ...happyOutputs, "STEP-01": { ...(happyOutputs["STEP-01"] as object), verdictCode: "CONDITIONAL" } };
    const steps = loadSpine(WF_006_AVANT_VENTE_MANIFEST, sidecar, buildWf006AvantVenteRegistry(), resolveAgent);
    const res = await runSpine(steps, mockRunner(conditional), {});
    expect(res.status).toBe("failed");
    expect(res.failure?.stepId).toBe("STEP-01");
    expect(res.traces).toHaveLength(1);
  });

  it("GO/NO-GO gateway robustness (WF-001 lesson): case/whitespace « go » still passes, a verbose paragraph halts", async () => {
    const steps = loadSpine(WF_006_AVANT_VENTE_MANIFEST, sidecar, buildWf006AvantVenteRegistry(), resolveAgent);
    // lower-case + surrounding whitespace normalizes to GO → completed
    const lax = { ...happyOutputs, "STEP-01": { ...(happyOutputs["STEP-01"] as object), verdictCode: "  go " } };
    const ok = await runSpine(steps, mockRunner(lax), {});
    expect(ok.status).toBe("completed");
    // a rationale accidentally placed in the code field does NOT read as GO → halt
    const verbose = { ...happyOutputs, "STEP-01": { ...(happyOutputs["STEP-01"] as object), verdictCode: "« GO » because BANT is strong and…" } };
    const halted = await runSpine(steps, mockRunner(verbose), {});
    expect(halted.status).toBe("failed");
    expect(halted.failure?.stepId).toBe("STEP-01");
  });

  it("selling price missing (STEP-05) → failed at STEP-05", async () => {
    const broken = { ...happyOutputs, "STEP-05": { ...(happyOutputs["STEP-05"] as object), sellingPrice: "TBD" } };
    const steps = loadSpine(WF_006_AVANT_VENTE_MANIFEST, sidecar, buildWf006AvantVenteRegistry(), resolveAgent);
    const res = await runSpine(steps, mockRunner(broken), {});
    expect(res.status).toBe("failed");
    expect(res.failure?.stepId).toBe("STEP-05");
    expect(res.traces).toHaveLength(5);
  });
});
