/**
 * WF-001 step outputs compliant with the DoD AND the tightened schema. Fixture
 * SHARED between the hermetic test (`run-wf-001.test.ts`) and the model-routing
 * test (`run-wf-model-override.test.ts`) — DRY, single source. Extracted verbatim
 * from `run-wf-001.test.ts` (no behavior change).
 */

const happyBacklog = Array.from({ length: 8 }, (_, i) => ({
  statement: `As a user I want feature ${i + 1} so that I save time`,
  priorite: "must",
  estimation: 3,
  dod: "Tested and validated in UAT",
}));

/** "Full" outputs: satisfy all criteria (blocking AND advisory). */
export const wf001HappyOutputs: Record<string, unknown> = {
  "STEP-01": {
    besoins: ["Reduce processing time"],
    partiesPrenantes: [{ nom: "Business", role: "sponsor" }],
    perimetre: { in: ["authentication"], out: ["billing"] },
    questionsOuvertes: [],
  },
  "STEP-03": { backlog: happyBacklog, epics: ["Auth", "Search", "Reporting"] },
  "STEP-04": {
    gherkin: [
      { given: "a logged-in user", when: "they search", then: "they see the results", type: "nominal" },
      { given: "an invalid term", when: "they search", then: "an error is shown", type: "error" },
      { given: "0 results", when: "they search", then: "an empty state is shown", type: "boundary" },
    ],
    planTest: "Sprint 1: smoke tests + 3 priority scenarios",
  },
};

/** Backlog reused by failure-path variants (e.g. sliced below the DoD threshold). */
export const wf001HappyBacklog = happyBacklog;
