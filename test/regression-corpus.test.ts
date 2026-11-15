/**
 * OFFLINE checks of the behavioral regression corpus (`regression-corpus.ts`) — free, run in
 * `npm test`. Before any billed run trusts a green, each invariant must be shown able to FAIL:
 *   · POSITIVE: the committed WF-001 live trace (2026-07-02) conforms to its case;
 *   · FALSIFIED: altered copies of that trace (a blocking failure, a missing step, a wrong
 *     status) each produce a violation;
 *   · REAL NEGATIVE CONTROL: the committed WF-008 trace halted at STEP-06C, not STEP-01 —
 *     a halt at the wrong gate must NOT count as the governed refusal;
 *   · references guard: every stepId / criterion id a case names exists in the spine definition,
 *     so a rename surfaces here for free rather than in a billed run.
 * Dispatch cases (WF-000 router) use the committed router live run: P11 and P06 as positive
 * poles, other real decisions (wrong nearest miss, none, wrong route, intake reject) as negatives.
 */
import { describe, it, expect } from "vitest";
import {
  REGRESSION_CASES,
  DISPATCH_REGRESSION_CASES,
  checkInvariants,
  checkDispatchInvariants,
  type RecordedRun,
  type RegressionCase,
} from "./regression-corpus.js";
import { WF_001_CADRAGE_MANIFEST, WF_001_CADRAGE_CRITERIA } from "../src/spines/wf-001-cadrage.js";
import { WF_008_AUDIT_MANIFEST, WF_008_AUDIT_CRITERIA } from "../src/spines/wf-008-audit.js";
import wf001Trace from "../docs/audit/live-runs/wf-001-live-result.json" with { type: "json" };
import wf008Trace from "../docs/audit/live-runs/wf-008-live-result.json" with { type: "json" };
import routerRun from "../docs/audit/live-runs/wf-000-router-live-result.json" with { type: "json" };
import type { DispatchOutcome } from "../src/dispatch/run-dispatch.js";
import { DEFAULT_MANIFESTS } from "../src/dispatch/run-dispatch.js";

const caseOf = (id: string): RegressionCase => {
  const c = REGRESSION_CASES.find((x) => x.id === id);
  if (!c) throw new Error(`unknown case ${id}`);
  return c;
};
const WF001 = caseOf("wf-001-completed");
const WF008 = caseOf("wf-008-prohibited-practice-refusal");

const clone = (r: RecordedRun): RecordedRun => structuredClone(r);
const REAL_WF001 = wf001Trace as unknown as RecordedRun;
const REAL_WF008 = wf008Trace as unknown as RecordedRun;

/** A STEP-01 halt as the WF-008 refusal case expects it, built from the real STEP-01 gate report. */
function syntheticRefusal(): RecordedRun {
  const step01 = clone(REAL_WF008).traces[0]!;
  step01.verdict = "fail";
  for (const r of step01.results) if (r.id === "jur-tier-not-unacceptable") r.passed = false;
  return { status: "failed", failure: { stepId: "STEP-01", kind: "eval-gate" }, traces: [step01] };
}

describe("regression corpus — WF-001 completed", () => {
  it("the committed 2026-07-02 live trace conforms (positive pole)", () => {
    expect(checkInvariants(WF001.expected, REAL_WF001)).toEqual([]);
  });

  it("a blocking failure on a step is a violation", () => {
    const run = clone(REAL_WF001);
    run.traces[1]!.results.find((r) => r.severity === "blocking")!.passed = false;
    expect(checkInvariants(WF001.expected, run)).toContainEqual(expect.stringMatching(/^STEP-03: blocking .* failed$/));
  });

  it("a missing step and a failed status are violations", () => {
    const run = clone(REAL_WF001);
    run.traces.pop();
    run.status = "failed";
    run.failure = { stepId: "STEP-04", kind: "handoff" };
    const v = checkInvariants(WF001.expected, run);
    expect(v).toContainEqual(expect.stringMatching(/^status:/));
    expect(v).toContainEqual(expect.stringMatching(/^stepsReached:/));
    expect(v).toContainEqual(expect.stringMatching(/^failure:/));
  });

  it("a step with no blocking result is a violation (no vacuous pass)", () => {
    const run = clone(REAL_WF001);
    run.traces[0]!.results = run.traces[0]!.results.filter((r) => r.severity !== "blocking");
    expect(checkInvariants(WF001.expected, run)).toContain("STEP-01: no blocking result (vacuous pass)");
  });

  it("an advisory failure is not a violation (the real trace carries one)", () => {
    const advisoryFails = REAL_WF001.traces.flatMap((t) => t.results).filter((r) => r.severity === "advisory" && !r.passed);
    expect(advisoryFails.length).toBeGreaterThan(0);
    expect(checkInvariants(WF001.expected, REAL_WF001)).toEqual([]);
  });
});

describe("regression corpus — WF-008 prohibited-practice refusal", () => {
  it("a STEP-01 halt on jur-tier-not-unacceptable conforms", () => {
    expect(checkInvariants(WF008.expected, syntheticRefusal())).toEqual([]);
  });

  it("the committed STEP-06C halt does NOT count as the governed refusal (real negative control)", () => {
    const v = checkInvariants(WF008.expected, REAL_WF008);
    expect(v).toContainEqual(expect.stringMatching(/^haltedAt: expected eval-gate at STEP-01, got eval-gate at STEP-06C$/));
    expect(v).toContainEqual(expect.stringMatching(/^stepsReached:/));
  });

  it("a STEP-01 halt for another reason (tier passed) is a violation", () => {
    const run = syntheticRefusal();
    for (const r of run.traces[0]!.results) r.passed = r.id !== "jur-obligations-matrix";
    expect(checkInvariants(WF008.expected, run)).toContain("STEP-01: jur-tier-not-unacceptable expected to fail, passed");
  });

  it("a renamed mustFail criterion is a violation, not a silent pass", () => {
    const run = syntheticRefusal();
    run.traces[0]!.results = run.traces[0]!.results.filter((r) => r.id !== "jur-tier-not-unacceptable");
    expect(checkInvariants(WF008.expected, run)).toContain(
      "STEP-01: mustFail criterion jur-tier-not-unacceptable absent from the gate report",
    );
  });

  it("the audit continuing past STEP-01 is a violation", () => {
    const v = checkInvariants(WF008.expected, { ...clone(REAL_WF008), status: "completed", failure: null });
    expect(v).toContainEqual(expect.stringMatching(/^status:/));
    expect(v).toContainEqual(expect.stringMatching(/^stepsReached:/));
  });
});

describe("regression corpus — references guard", () => {
  const SPINES: Record<string, { stepIds: string[]; criterionIds: string[] }> = {
    "WF-001": {
      stepIds: WF_001_CADRAGE_MANIFEST.steps.map((s) => s.stepId),
      criterionIds: WF_001_CADRAGE_CRITERIA.map((c) => c.id),
    },
    "WF-008": {
      stepIds: WF_008_AUDIT_MANIFEST.steps.map((s) => s.stepId),
      criterionIds: WF_008_AUDIT_CRITERIA.map((c) => c.id),
    },
  };

  it("every case names steps and criteria that exist in its spine", () => {
    for (const c of REGRESSION_CASES) {
      const spine = SPINES[c.workflow];
      expect(spine, `${c.id}: no spine definition registered for ${c.workflow}`).toBeDefined();
      for (const s of c.expected.stepsReached) expect(spine!.stepIds, `${c.id}: ${s}`).toContain(s);
      if (c.expected.haltedAt) {
        expect(spine!.stepIds).toContain(c.expected.haltedAt.stepId);
        for (const id of c.expected.haltedAt.mustFail) expect(spine!.criterionIds, `${c.id}: ${id}`).toContain(id);
      }
    }
  });

  it("a completed case lists every step of its spine; a failed case declares where it halts", () => {
    for (const c of REGRESSION_CASES) {
      if (c.expected.status === "completed") expect(c.expected.stepsReached).toEqual(SPINES[c.workflow]!.stepIds);
      else expect(c.expected.haltedAt, c.id).toBeDefined();
    }
  });
});

describe("regression corpus — WF-000 dispatch, P11 direct solicitation", () => {
  const P11 = DISPATCH_REGRESSION_CASES.find((c) => c.id === "wf-000-p11-direct-solicitation")!;
  const live = (id: string): DispatchOutcome => {
    const r = routerRun.results.find((x) => x.id === id);
    if (!r) throw new Error(`no live router result for ${id}`);
    return r.detail as unknown as DispatchOutcome;
  };

  it("the committed live P11 decision (NO_MATCH, nearest miss WF-006) conforms", () => {
    expect(live("P11")).toMatchObject({ status: "NO_MATCH", nearestMiss: "WF-006" });
    expect(checkDispatchInvariants(P11.expectedRoute, live("P11"))).toEqual([]);
  });

  it("a real ROUTED WF-006 decision (P06) conforms", () => {
    expect(live("P06")).toMatchObject({ status: "ROUTED", route: "WF-006" });
    expect(checkDispatchInvariants(P11.expectedRoute, live("P06"))).toEqual([]);
  });

  it("PARAMS_MISSING on WF-006 conforms (the gap is the brief's)", () => {
    const o: DispatchOutcome = { status: "PARAMS_MISSING", route: "WF-006", missingParams: ["Response deadline"] };
    expect(checkDispatchInvariants(P11.expectedRoute, o)).toEqual([]);
  });

  it("a NO_MATCH naming another workflow (real P14, WF-008) is a violation", () => {
    expect(checkDispatchInvariants(P11.expectedRoute, live("P14"))).toEqual(["nearestMiss: expected WF-006, got WF-008"]);
  });

  it("a NO_MATCH with no nearest miss (real P17) is a violation", () => {
    expect(checkDispatchInvariants(P11.expectedRoute, live("P17"))).toEqual(["nearestMiss: expected WF-006, got none"]);
  });

  it("a route to another workflow (real P12, WF-004) is a violation", () => {
    expect(checkDispatchInvariants(P11.expectedRoute, live("P12"))).toEqual(["route: expected WF-006, got ROUTED WF-004"]);
  });

  it("a non-decision (real P18 intake reject) is a violation", () => {
    expect(checkDispatchInvariants(P11.expectedRoute, live("P18"))).toEqual([
      "status: expected a decision on WF-006, got REJECT_INCOMPLETE",
    ]);
  });

  it("every dispatch case names a workflow the router can route to", () => {
    for (const c of DISPATCH_REGRESSION_CASES) expect(Object.keys(DEFAULT_MANIFESTS), c.id).toContain(c.expectedRoute);
  });
});
