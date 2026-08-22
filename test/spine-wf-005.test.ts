import { describe, it, expect } from "vitest";
import { loadSpine, ManifestValidationError } from "../src/manifest/load-manifest.js";
import { runSpine } from "../src/orchestrator/run-spine.js";
import type { Sidecar } from "../src/sidecar/types.js";
import {
  WF_005_VEILLE_MANIFEST,
  WF_005_VEILLE_CRITERIA,
  buildWf005VeilleRegistry,
} from "../src/spines/wf-005-veille.js";
import { wf005HappyOutputs as happyOutputs } from "./fixtures/wf-005-outputs.js";
import {
  wf005InterimSidecar as sidecar,
  wf005ResolveAgent as resolveAgent,
  mockRunner,
} from "./fixtures/wf-005-spine.js";

/** Hermetic tests for the REAL WF-005 spine (Strategic Intelligence & Growth), mocked runner. */

describe("WF-005 spine — loading and execution (mocked runner)", () => {
  it("assembles the 3-step backbone STEP-01→03 with provenance and criteria", () => {
    const steps = loadSpine(WF_005_VEILLE_MANIFEST, sidecar, buildWf005VeilleRegistry(), resolveAgent);
    expect(steps.map((s) => s.provenance.stepId)).toEqual(["STEP-01", "STEP-02", "STEP-03"]);
    expect(steps[0]!.contract.input).toBeUndefined(); // seed
    expect(steps[2]!.criteria.map((c) => c.id)).toContain("red-linkedin-floor");
  });

  it("registry: every manifest criterion resolves (no dangling id)", () => {
    const registry = buildWf005VeilleRegistry();
    const allIds = WF_005_VEILLE_MANIFEST.steps.flatMap((s) => s.criteriaIds);
    expect(() => registry.resolve(allIds)).not.toThrow();
    expect(allIds.length).toBe(WF_005_VEILLE_CRITERIA.length);
  });

  it("fail-closed: agent missing from the sidecar → ManifestValidationError", () => {
    const incomplete: Sidecar = { ...sidecar, assets: sidecar.assets.slice(0, 2) }; // REDACTEUR-IA removed
    expect(() => loadSpine(WF_005_VEILLE_MANIFEST, incomplete, buildWf005VeilleRegistry(), resolveAgent)).toThrow(
      ManifestValidationError,
    );
  });

  it("DoD-conformant outputs → spine completed, 3 traces, pass verdicts", async () => {
    const steps = loadSpine(WF_005_VEILLE_MANIFEST, sidecar, buildWf005VeilleRegistry(), resolveAgent);
    const res = await runSpine(steps, mockRunner(happyOutputs), { format: "Weekly flash" });
    expect(res.status).toBe("completed");
    expect(res.traces).toHaveLength(3);
    expect(res.traces.every((t) => t.gate.verdict === "pass")).toBe(true);
  });

  it("hardening: a modest-but-valid run (3 highlights, 4 topics/posts) COMPLETES — schema bounds = blocking floor, no false KO at the strict handoff", async () => {
    // Would have FAILED under the earlier schema (highlights minItems:5, topics/
    // linkedinPosts maxItems:3) at the ajv-strict producer-output handoff, even
    // though every BLOCKING criterion passes. The ideal counts are advisory only.
    const modest: Record<string, unknown> = {
      "STEP-01": {
        highlights: [
          { title: "signal a", source: "x", impact: "High" },
          { title: "signal b", source: "y", impact: "Medium" },
          { title: "signal c", source: "z", impact: "Low" },
        ],
        weakSignals: ["one emerging opportunity"],
        toolsToWatch: [], // empty optional array must NOT hard-fail the handoff
      },
      "STEP-02": {
        topics: Array.from({ length: 4 }, (_, i) => ({
          topic: `topic ${i + 1}`,
          format: "LinkedIn post",
          angle: `angle ${i + 1}`,
        })),
      },
      "STEP-03": {
        synthesis: "# Weekly flash\nsynthesis body.",
        linkedinPosts: ["post 1", "post 2", "post 3", "post 4"],
      },
    };
    const steps = loadSpine(WF_005_VEILLE_MANIFEST, sidecar, buildWf005VeilleRegistry(), resolveAgent);
    const res = await runSpine(steps, mockRunner(modest), { format: "Weekly flash" });
    expect(res.status).toBe("completed");
    expect(res.traces).toHaveLength(3);
    // Advisory checks (Top-5, 1-3 topics, 1-3 posts) fail but do not block → verdict pass.
    expect(res.traces.every((t) => t.gate.verdict === "pass")).toBe(true);
  });

  it("unranked highlights (STEP-01: missing impact) → failed at STEP-01", async () => {
    const broken = {
      ...happyOutputs,
      "STEP-01": {
        ...(happyOutputs["STEP-01"] as object),
        highlights: [
          { title: "signal a", source: "x" },
          { title: "signal b", source: "y" },
          { title: "signal c", source: "z" },
        ],
      },
    };
    const steps = loadSpine(WF_005_VEILLE_MANIFEST, sidecar, buildWf005VeilleRegistry(), resolveAgent);
    const res = await runSpine(steps, mockRunner(broken), {});
    expect(res.status).toBe("failed");
    expect(res.failure?.stepId).toBe("STEP-01");
    expect(res.failure?.kind).toBe("eval-gate");
    expect(res.traces).toHaveLength(1);
  });

  it("empty LinkedIn posts (STEP-03) → failed at STEP-03", async () => {
    const broken = { ...happyOutputs, "STEP-03": { ...(happyOutputs["STEP-03"] as object), linkedinPosts: [] } };
    const steps = loadSpine(WF_005_VEILLE_MANIFEST, sidecar, buildWf005VeilleRegistry(), resolveAgent);
    const res = await runSpine(steps, mockRunner(broken), {});
    expect(res.status).toBe("failed");
    expect(res.failure?.stepId).toBe("STEP-03");
    expect(res.traces).toHaveLength(3);
  });
});
