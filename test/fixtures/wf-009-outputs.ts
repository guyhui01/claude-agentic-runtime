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
const assessmentGrid = Array.from({ length: 6 }, (_, i) => ({
  criterion: `tech-criterion-${i + 1}`,
  weight: i < 2 ? "high" : "medium",
  scale: "1-5",
}));
const interviewQuestions = Array.from({ length: 10 }, (_, i) => ({
  question: `question-${i + 1}`,
  level: ["junior", "senior", "lead"][i % 3]!,
}));
const scoredCvs = Array.from({ length: 4 }, (_, i) => ({
  candidate: `candidate-${i + 1}`,
  mustMet: i < 3 ? "all must-haves met" : "1 must-have missing",
  score: 90 - i * 5,
}));
const shortlist = Array.from({ length: 3 }, (_, i) => ({
  candidate: `candidate-${i + 1}`,
  justification: `strong on must-haves (#${i + 1})`,
}));
const techGridPerCandidate = shortlist.map((c) => ({
  candidate: c.candidate,
  rating: "grid filled, weighted score computed",
}));
const referenceChecks = Array.from({ length: 2 }, (_, i) => ({
  candidate: `candidate-${i + 1}`,
  outcome: "positive, role and dates confirmed",
}));

/** "Full" outputs: satisfy all criteria (blocking AND advisory) + the schema bounds. */
export const wf009HappyOutputs: Record<string, unknown> = {
  "STEP-01": {
    needSheet:
      "Senior AI/LLM engineer for the platform team: RAG pipelines, evaluation, and MLOps.",
    moscow,
    cultureFit: "Pragmatic, ships iteratively, comfortable with ambiguity and pairing.",
    workEnv: "Hybrid (2 days on-site), Python/TypeScript stack, weekly demo ritual.",
  },
  "STEP-02A": {
    assessmentGrid,
    interviewQuestions,
    practicalExercise: "Mini RAG case: index a corpus, answer with citations, discuss trade-offs.",
    marketBenchmark: "2026 senior AI engineer: €65-85k (Paris), €600-750/day freelance.",
  },
  "STEP-03": {
    jobAd:
      "Senior AI Engineer (LLM/RAG) — build and evaluate production AI features. Inclusive, remote-friendly.",
    agencyBrief: "Target senior profiles with shipped LLM products; avoid pure-research backgrounds.",
    linkedinInMail:
      "Subject: Build production AI at <company>. Body: your work on <x> caught our eye — 20 min chat?",
    replyEmail: "Thanks for applying — we received your application and will reply within 5 business days.",
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
    selectedCandidate: "candidate-1",
    recommendation:
      "Hire candidate-1: top technical grid score, positive references, best culture fit and availability.",
  },
  "STEP-06": {
    offerLetter: "Employment promise for candidate-1: role, level, compensation, start date, conditions.",
    adminFile: "Pre-hire declaration prepared, contract drafted, IT access request filed.",
    unsuccessfulReply: "Considerate decline to candidate-2 and candidate-3 with specific, kind feedback.",
    onboardingSheet: "D1 onboarding sheet ready (accounts, buddy, first-week plan) — handoff to WF-007.",
  },
};
