import { describe, it, expect, vi } from "vitest";
import { runDispatch } from "../src/dispatch/run-dispatch.js";
import { extractPlanFields } from "../src/dispatch/plan.js";
import type { ExecutionPlan } from "../src/dispatch/plan.js";
import type { StepRunner } from "../src/orchestrator/types.js";
import type { Sidecar, Asset } from "../src/sidecar/types.js";
import { DISPATCH_FIXTURES, P01_UNAMENDED } from "./fixtures/dispatch-briefs.js";

/**
 * Hermetic guard of the V0 dispatch pipeline: intake short-circuits before any
 * LLM call, the bounded retry re-asks exactly once on a shape-invalid answer
 * then fails closed, and a ROUTED decision carries the execution plan. The
 * runner is always faked (zero network — the billed path lives in the gated
 * live harness only).
 */

const fixtureBrief = (id: string) => {
  const f = DISPATCH_FIXTURES.find((x) => x.id === id);
  if (!f?.brief) throw new Error(`fixture ${id} has no brief`);
  return f.brief;
};

const WF001_ASSET: Asset = {
  id: "WF-001",
  type: "workflow",
  path: "workflows/WF-001.md",
  title: "AI Product Scoping",
  description: "Client brief → prioritized backlog + acceptance criteria",
  catalogVersion: "v4.2.0",
  source: { file: "workflows/WF-001.md", catalogTag: "v4.2.0" },
  dependsOn: ["AGENT-BUSINESS-ANALYST"],
};

const SIDECAR: Sidecar = {
  schemaVersion: "1.0",
  catalog: { name: "claude-agents", version: "v4.2.0" },
  generatedAt: "2026-07-19T00:00:00Z",
  assets: [
    {
      id: "AGENT-BUSINESS-ANALYST",
      type: "agent",
      path: "agents/ba.md",
      title: "BA",
      description: "d",
      catalogVersion: "v4.2.0",
      source: { file: "agents/ba.md", catalogTag: "v4.2.0" },
    },
    WF001_ASSET,
  ],
};

const FAKE_PLAN: ExecutionPlan = {
  workflow: "WF-001",
  title: "AI Product Scoping",
  durationEstimate: "45-90 min",
  recommendedModel: "claude-sonnet-5",
};
const fakePlanBuilder = () => FAKE_PLAN;

function runnerOf(...outputs: unknown[]): StepRunner & { calls: () => number } {
  const fn = vi.fn(async () => ({ output: outputs[Math.min(fn.mock.calls.length - 1, outputs.length - 1)] }));
  const runner = fn as unknown as StepRunner & { calls: () => number };
  runner.calls = () => fn.mock.calls.length;
  return runner;
}

const GOOD = { proposedRoute: "WF-001", rationale: "brief received + backlog", nearestMiss: null };
const MALFORMED = { proposedRoute: "WF-001" }; // missing required keys

describe("runDispatch — pipeline order and bounded retry", () => {
  it("rejects an incomplete brief BEFORE any router call", async () => {
    const runner = runnerOf(GOOD);
    const res = await runDispatch(
      { need: "We need AI." },
      { sidecar: SIDECAR, catalogRoot: "/nowhere", runner, planBuilder: fakePlanBuilder },
    );
    expect(res.status).toBe("REJECT_INCOMPLETE");
    expect(runner.calls()).toBe(0);
  });

  it("routes a qualified WF-001 brief and attaches the execution plan", async () => {
    const runner = runnerOf(GOOD);
    const res = await runDispatch(fixtureBrief("P01"), {
      sidecar: SIDECAR,
      catalogRoot: "/nowhere",
      runner,
      planBuilder: fakePlanBuilder,
    });
    expect(res).toMatchObject({
      status: "ROUTED",
      route: "WF-001",
      paramsChecked: true,
      plan: FAKE_PLAN,
    });
    expect(runner.calls()).toBe(1);
  });

  it("returns PARAMS_MISSING with the three pilot gaps on the unamended P01", async () => {
    // Pilot return loop (identity-card dry run §2): the pre-amendment P01
    // passes intake but cannot fill the WF-001 card — deterministic outcome.
    const runner = runnerOf(GOOD);
    const res = await runDispatch(P01_UNAMENDED, {
      sidecar: SIDECAR,
      catalogRoot: "/nowhere",
      runner,
      planBuilder: fakePlanBuilder,
    });
    expect(res).toEqual({
      status: "PARAMS_MISSING",
      route: "WF-001",
      missingParams: ["team_size", "project_method", "level_of_detail"],
    });
    expect(runner.calls()).toBe(1);
  });

  it("re-asks exactly once on a shape-invalid answer, then succeeds", async () => {
    const runner = runnerOf(MALFORMED, GOOD);
    const res = await runDispatch(fixtureBrief("P01"), {
      sidecar: SIDECAR,
      catalogRoot: "/nowhere",
      runner,
      planBuilder: fakePlanBuilder,
    });
    expect(res.status).toBe("ROUTED");
    expect(runner.calls()).toBe(2);
  });

  it("fails closed after the second shape-invalid answer (no loop)", async () => {
    const runner = runnerOf(MALFORMED, MALFORMED);
    const res = await runDispatch(fixtureBrief("P01"), {
      sidecar: SIDECAR,
      catalogRoot: "/nowhere",
      runner,
      planBuilder: fakePlanBuilder,
    });
    expect(res.status).toBe("REJECT_ROUTER_OUTPUT");
    expect(runner.calls()).toBe(2);
  });

  it("does NOT retry an invented workflow id — a router-quality signal, not a glitch", async () => {
    const runner = runnerOf({ ...GOOD, proposedRoute: "WF-042" });
    const res = await runDispatch(fixtureBrief("P01"), {
      sidecar: SIDECAR,
      catalogRoot: "/nowhere",
      runner,
      planBuilder: fakePlanBuilder,
    });
    expect(res.status).toBe("REJECT_ROUTER_OUTPUT");
    expect(runner.calls()).toBe(1);
  });

  it("passes NO_MATCH through without building any plan", async () => {
    const planBuilder = vi.fn(fakePlanBuilder);
    const runner = runnerOf({ proposedRoute: "NO_MATCH", rationale: "nothing fits", nearestMiss: null });
    const res = await runDispatch(fixtureBrief("P14"), {
      sidecar: SIDECAR,
      catalogRoot: "/nowhere",
      runner,
      planBuilder,
    });
    expect(res.status).toBe("NO_MATCH");
    expect(planBuilder).not.toHaveBeenCalled();
  });
});

describe("extractPlanFields — card YAML parsing (pure)", () => {
  it("reads duree_estimee and modele_recommande verbatim", () => {
    const card = 'id: "WF-001"\nduree_estimee: "45-90 min"\nmodele_recommande: "claude-sonnet-5"\n';
    expect(extractPlanFields(card)).toEqual({
      durationEstimate: "45-90 min",
      recommendedModel: "claude-sonnet-5",
    });
  });

  it("returns nothing for a card without the fields (buildPlan then fails closed)", () => {
    expect(extractPlanFields("# a card without identity yaml")).toEqual({});
  });
});
