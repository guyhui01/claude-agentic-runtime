/**
 * WF-002 step outputs compliant with the DoD AND the TIGHTENED schema (hence with
 * the producer-output handoff). Fixture SHARED between the hermetic test
 * (`run-wf-002.test.ts`) and the "real sidecar" test
 * (`run-wf-002-real-sidecar.test.ts`) — DRY, single source.
 */

const happyBacklog = Array.from({ length: 6 }, (_, i) => ({
  statement: `US ${i + 1}: sprint 1 story`,
  wsjf: 20 - i,
}));

/** "Full" outputs: satisfy all criteria (blocking AND advisory). */
export const wf002HappyOutputs: Record<string, unknown> = {
  "STEP-01": {
    visionBoard: "PI-07 vision board (1 page): self-care + payment.",
    featuresWsjf: [
      { feature: "Self-care", wsjf: 18 },
      { feature: "Payment", wsjf: 14 },
      { feature: "Claims", wsjf: 9 },
    ],
    leanBusinessCase: "Lean Business Case: 2.1x ROI over 18 months.",
  },
  "STEP-02": {
    programBoard: [{ from: "EQ1", to: "EQ2", dep: "API auth" }],
    voteConfiance: 4.2,
    roamRisks: [{ risk: "external IS dependency", roam: "Owned" }],
  },
  "STEP-03": {
    piObjectives: ["PIO-1 SSO delivered", "PIO-2 payment pilot", "PIO-3 CODIR reporting"],
    backlogSprint: happyBacklog,
  },
  "STEP-04": {
    sprintGoal: "Deliver end-to-end SSO authentication.",
    sprintPlan: { usEngagees: ["US 1", "US 2", "US 3"], storyPoints: 21 },
    impediments: [{ id: "IMP-1", desc: "staging environment access" }],
  },
  "STEP-06": {
    noteCodir: "CODIR note: PI-07 on track, 1 Owned risk, CPI 1.02.",
    dashboard: { avancement: "32%", risques: ["external IS dep."] },
    evm: { cpi: 1.02, spi: 0.98 },
  },
};
