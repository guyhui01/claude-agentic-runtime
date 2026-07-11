/**
 * WF-004 step outputs compliant with the DoD AND the tightened schema (hence with
 * the producer-output handoff). Fixture SHARED between the hermetic test
 * (`run-wf-004.test.ts`) and the "real sidecar" test
 * (`run-wf-004-real-sidecar.test.ts`) — DRY, single source.
 */

const useCases = Array.from({ length: 5 }, (_, i) => ({
  name: `use-case-${i + 1}`,
  value: i < 2 ? "High" : "Medium",
  effort: i < 3 ? "Medium" : "Low",
}));
const businessCases = useCases.map((u, i) => ({
  useCase: u.name,
  investment: 50000 + i * 10000,
  gain: 120000 + i * 15000,
  roi: `${(2 + i * 0.2).toFixed(1)}x`,
  payback: `${10 + i} months`,
}));
const adkarPlan = ["executive committee", "managers", "operational"].map((p) => ({
  population: p,
  awareness: "briefings",
  desire: "incentives",
  knowledge: "training",
  ability: "coaching",
  reinforcement: "KPIs",
}));
const trainingCatalog = Array.from({ length: 4 }, (_, i) => ({
  profile: ["executive committee", "managers", "users", "tech"][i]!,
  level: `level-${i + 1}`,
  format: i % 2 === 0 ? "workshop" : "e-learning",
}));
const comexDeck = Array.from({ length: 12 }, (_, i) => ({ title: `slide-${i + 1}` }));

/** "Full" outputs: satisfy all criteria (blocking AND advisory). */
export const wf004HappyOutputs: Record<string, unknown> = {
  "STEP-01": {
    maturityScore: 6,
    swot: {
      strengths: ["data culture"],
      weaknesses: ["no MLOps"],
      opportunities: ["claims automation"],
      risks: ["regulatory"],
    },
    useCases,
    recommendations: ["hire a CDO", "launch a pilot", "set up AI governance"],
  },
  "STEP-02": {
    businessCases,
    roiSummary: "Portfolio transformation ROI: 2.4x weighted, 13-month blended payback.",
    prioritization: ["use-case-1", "use-case-2", "use-case-3"],
    scenarios: ["optimistic", "realistic", "conservative"],
  },
  "STEP-03": {
    roadmap: {
      now: ["pilot claims triage"],
      next: ["scale to underwriting"],
      later: ["enterprise AI platform"],
    },
    okrs: [{ period: "H1", objective: "ship pilot", kr: "1 use case in prod" }],
    governance: "AI committee (CDO chair), monthly review, model-risk process.",
    talentPlan: "Recruit 2 ML engineers, upskill 20 analysts.",
  },
  "STEP-04": {
    adkarPlan,
    commsPlan: "12-month plan: kickoff, monthly town halls, champions newsletter.",
    resistanceStrategy: "Address job-security fears via reskilling guarantees.",
    adoptionKpis: [{ kpi: "active users", target: "70% in 6 months" }],
  },
  "STEP-05": {
    trainingCatalog,
    quickWins: [{ name: "prompt clinic", duration: "2 weeks" }],
    evalPlan: "Pre/post assessments + certification for tech tracks.",
  },
  "STEP-07": {
    execSummary:
      "Context, stakes, top recommendations and a 2.4x ROI on a 12-24 month AI roadmap.",
    fullReport:
      "Full consulting report: maturity audit, business cases, roadmap, ADKAR, training plan.",
    comexDeck,
  },
};
