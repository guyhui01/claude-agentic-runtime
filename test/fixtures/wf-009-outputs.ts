/**
 * WF-009 step outputs compliant with the DoD AND the tightened schema (hence with the
 * producer-output handoff). Fixture SHARED between the hermetic test
 * (`run-wf-009.test.ts`) and the "real sidecar" test (`run-wf-009-real-sidecar.test.ts`)
 * — DRY, single source. Keyed by backbone stepId.
 */

const moscow = {
  must: ["Python", "LLM/RAG experience"],
  should: ["MLOps"],
  could: ["Kubernetes"],
  wont: ["front-end ownership"],
};

/**
 * Synthetic, FICTIONAL candidate pool (never a real person — this repo is public and the
 * live trace is versioned; see the RGPD note in `wf-009-recrutement.ts`). Modeled as an
 * exogenous input to sourcing ("the CVs have arrived"): the linear orchestrator can only
 * route data through the previous step's output, so this pool is carried UNCHANGED through
 * STEP-01→03 to reach the RH sourcing step (STEP-04). Deliberate spread — 4 strong, 1
 * weaker (misses a must-have) — so STEP-04 produces a REAL shortlist and STEP-05 selects a
 * real candidate, driving a genuine `completed` run rather than a hollow pass.
 */
export const wf009CandidatePool = [
  {
    candidateId: "CAND-01",
    headline: "Senior AI/LLM engineer, RAG in production at scale",
    yearsExperience: 8,
    coreSkills: ["Python", "LLM/RAG (production)", "LLM evaluation", "MLOps"],
    highlights: "Shipped and monitored production RAG pipelines; built an eval harness (hallucination, latency, cost).",
    flags: "None — diplomas and references consistent.",
  },
  {
    candidateId: "CAND-02",
    headline: "AI engineer, RAG POCs moving to production, cross-stack",
    yearsExperience: 6,
    coreSkills: ["Python", "TypeScript", "LLM/RAG", "MLOps basics"],
    highlights: "Strong cross-stack collaborator; owns evaluation for a customer-facing assistant.",
    flags: "LinkedIn employment dates to cross-check.",
  },
  {
    candidateId: "CAND-03",
    headline: "Staff engineer, LLM evaluation and platform reliability",
    yearsExperience: 10,
    coreSkills: ["Python", "LLM evaluation", "Kubernetes", "MLOps"],
    highlights: "Startup and scale-up experience; comfortable with weekly-demo cadence.",
    flags: "None.",
  },
  {
    candidateId: "CAND-04",
    headline: "ML engineer, LLM prototyping (POC only, no production)",
    yearsExperience: 4,
    coreSkills: ["Python", "LLM POCs"],
    highlights: "Fast prototyper.",
    flags: "Misses a must-have: no production LLM/RAG nor MLOps.",
  },
  {
    candidateId: "CAND-05",
    headline: "Senior AI engineer, production LLM with cost/eval tracking",
    yearsExperience: 7,
    coreSkills: ["Python", "TypeScript", "LLM/RAG (production)", "LLM evaluation", "MLOps"],
    highlights: "Owns cost tracking and evaluation dashboards; hybrid-ready in Paris.",
    flags: "One reference check still pending.",
  },
];
const assessmentGrid = Array.from({ length: 6 }, (_, i) => ({
  criterion: `tech-criterion-${i + 1}`,
  weight: i < 2 ? "high" : "medium",
  scale: "1-5",
}));
const interviewQuestions = Array.from({ length: 10 }, (_, i) => ({
  question: `question-${i + 1}`,
  level: ["junior", "senior", "lead"][i % 3]!,
}));
// STEP-04 scores the REAL carried pool: the 4 strong profiles score high, CAND-04 (misses
// a must-have) scores low → a shortlist of real candidates, not placeholders.
const scoredCvs = [
  { candidate: "CAND-01", mustMet: "all must-haves met", score: 92 },
  { candidate: "CAND-05", mustMet: "all must-haves met", score: 89 },
  { candidate: "CAND-03", mustMet: "all must-haves met", score: 87 },
  { candidate: "CAND-02", mustMet: "MLOps only basic, rest met", score: 80 },
  { candidate: "CAND-04", mustMet: "1 must-have missing (no production LLM/MLOps)", score: 58 },
];
const shortlist = [
  { candidate: "CAND-01", justification: "Strongest on all must-haves; production RAG + eval harness." },
  { candidate: "CAND-05", justification: "Production LLM with cost/eval tracking; cross-stack." },
  { candidate: "CAND-03", justification: "Staff-level LLM evaluation and platform reliability." },
];
const techGridPerCandidate = shortlist.map((c) => ({
  candidate: c.candidate,
  rating: "grid filled, weighted score computed",
}));
const referenceChecks = [
  { candidate: "CAND-01", outcome: "positive, role and dates confirmed" },
  { candidate: "CAND-05", outcome: "positive, one reference pending but two completed" },
];

/** "Full" outputs: satisfy all criteria (blocking AND advisory) + the schema bounds. */
export const wf009HappyOutputs: Record<string, unknown> = {
  "STEP-01": {
    needSheet:
      "Senior AI/LLM engineer for the platform team: RAG pipelines, evaluation, and MLOps.",
    moscow,
    cultureFit: "Pragmatic, ships iteratively, comfortable with ambiguity and pairing.",
    workEnv: "Hybrid (2 days on-site), Python/TypeScript stack, weekly demo ritual.",
    candidatePool: wf009CandidatePool, // passthrough — carried forward unchanged
  },
  "STEP-02A": {
    assessmentGrid,
    interviewQuestions,
    practicalExercise: "Mini RAG case: index a corpus, answer with citations, discuss trade-offs.",
    marketBenchmark: "2026 senior AI engineer: €65-85k (Paris), €600-750/day freelance.",
    candidatePool: wf009CandidatePool, // passthrough — carried forward unchanged
  },
  "STEP-03": {
    jobAd:
      "Senior AI Engineer (LLM/RAG) — build and evaluate production AI features. Inclusive, remote-friendly.",
    agencyBrief: "Target senior profiles with shipped LLM products; avoid pure-research backgrounds.",
    linkedinInMail:
      "Subject: Build production AI at <company>. Body: your work on <x> caught our eye — 20 min chat?",
    replyEmail: "Thanks for applying — we received your application and will reply within 5 business days.",
    candidatePool: wf009CandidatePool, // passthrough — reaches STEP-04 (RH sourcing)
  },
  "STEP-04": {
    scoredCvs,
    fraudReport: "No inflated titles detected; 1 LinkedIn profile pending verification, 0 confirmed fakes.",
    shortlist,
    comparisonTable: [{ axis: "LLM/RAG", ranking: "candidate-1 > candidate-2 > candidate-3" }],
  },
  "STEP-05": {
    hrInterviewReport:
      "Three HR interviews: strong motivation and culture fit; compensation expectations within range.",
    techGridPerCandidate,
    referenceChecks,
    selectedCandidate: "CAND-01",
    recommendation:
      "Hire CAND-01: top technical grid score, positive references, best culture fit and availability.",
  },
  "STEP-06": {
    offerLetter: "Employment promise for CAND-01: role, level, compensation, start date, conditions.",
    adminFile: "Pre-hire declaration prepared, contract drafted, IT access request filed.",
    unsuccessfulReply: "Considerate decline to CAND-05 and CAND-03 with specific, kind feedback.",
    onboardingSheet: "D1 onboarding sheet ready (accounts, buddy, first-week plan) — handoff to WF-007.",
  },
};
