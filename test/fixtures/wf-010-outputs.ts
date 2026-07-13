/**
 * WF-010 step outputs compliant with the DoD AND the tightened schema (hence with
 * the producer-output handoff). Fixture SHARED between the hermetic test
 * (`run-wf-010.test.ts`) and the "real sidecar" test
 * (`run-wf-010-real-sidecar.test.ts`) — DRY, single source.
 */

const timeline = [
  { milestone: "Kickoff", note: "on time" },
  { milestone: "MVP", note: "2-week slip (scope creep)" },
  { milestone: "Go-live", note: "delivered, 3 P1 bugs" },
];
const rootCauses = ["scope creep", "under-tested integration", "unclear ownership"].map((p) => ({
  problem: p,
  fiveWhys: ["why1", "why2", "why3", "why4", "why5"],
}));
const improvementPlan = Array.from({ length: 6 }, (_, i) => ({
  action: `Improvement action ${i + 1}`,
  priority: i < 2 ? "High" : i < 4 ? "Medium" : "Low",
}));

/** "Full" outputs: satisfy all criteria (blocking AND advisory). */
export const wf010HappyOutputs: Record<string, unknown> = {
  "STEP-01": {
    timeline,
    gaps: ["schedule +2 weeks", "budget +8%", "scope reduced (2 features cut)"],
    rootCauses,
    improvementPlan,
    whatWorkedWell: ["strong CI gates", "daily client sync"],
  },
  "STEP-02": {
    qualityReview: "Functional coverage good; technical debt concentrated in the integration layer.",
    testCoverage: "Unit 78%, integration 40%, E2E 15% — E2E is the gap.",
    topBugs: [{ bug: "race in sync", origin: "missing lock" }],
    techDebt: "~15 person-days, mostly in the legacy adapter.",
    qaRecommendations: ["Add E2E gate", "Contract tests for integrations"],
  },
  "STEP-03": {
    teamReview: "Cohesive core team; onboarding of 2 late joiners strained communication mid-project.",
    hrRecommendations: ["Stabilize the team earlier", "Rotate on-call to avoid burnout"],
    adoption: "70% active users at D30, 2 vocal resisters turned champions.",
    frictionPoints: ["Client sign-off latency", "Unclear escalation path"],
  },
  "STEP-06": {
    lessonsReport:
      "# Lessons learned\n## Timeline\n...\n## Root causes\n...\n## Quality\n...\n## Team\n...\n## Plan\n...",
    execSummary:
      "The project shipped 2 weeks late and 8% over budget; the top lesson is to gate integration testing earlier.",
    capitalizationMemo:
      "Best practices: CI gates, daily sync. Pitfalls: late team changes, deferred E2E.",
    bestPractices: ["CI gates", "daily client sync", "contract tests", "clear DoD", "risk log"],
    pitfalls: ["late team changes", "deferred E2E", "scope creep", "unclear ownership", "no escalation path"],
  },
};
