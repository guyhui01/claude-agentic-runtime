/**
 * WF-005 step outputs compliant with the DoD AND the tightened schema (hence with
 * the producer-output handoff). Fixture SHARED between the hermetic test
 * (`run-wf-005.test.ts`) and the "real sidecar" test
 * (`run-wf-005-real-sidecar.test.ts`) — DRY, single source.
 */

const highlights = Array.from({ length: 5 }, (_, i) => ({
  title: `AI intelligence highlight ${i + 1}`,
  source: `https://example.org/signal-${i + 1}`,
  impact: i < 2 ? "High" : i < 4 ? "Medium" : "Low",
}));
const topics = Array.from({ length: 2 }, (_, i) => ({
  topic: `Weekly focus topic ${i + 1}`,
  format: i === 0 ? "LinkedIn post" : "newsletter",
  angle: `Thought-leadership angle ${i + 1} with a punchy hook`,
}));
const linkedinPosts = [
  "🔍 AI INTELLIGENCE — Agentic runtimes\n\nDeterministic gates beat vibes.\n\n#AI #GenAI",
  "🔍 AI INTELLIGENCE — Model routing\n\nRight model, right step.\n\n#ProductManagement #Claude",
];

/** "Full" outputs: satisfy all criteria (blocking AND advisory). */
export const wf005HappyOutputs: Record<string, unknown> = {
  "STEP-01": {
    highlights,
    weakSignals: ["on-device MLLM inference", "agentic eval frameworks emerging"],
    toolsToWatch: ["a new open-source eval harness", "a structured-output SDK feature"],
  },
  "STEP-02": {
    topics,
    hashtags: ["#AI", "#ProductManagement", "#GenAI", "#Claude"],
    timing: "Monday 08:30 CET",
  },
  "STEP-03": {
    synthesis:
      "# AI INTELLIGENCE — Week N\n\n## The highlight\nDeterministic eval gates are the story.\n\n## 3 to remember\n1. ... 2. ... 3. ...",
    linkedinPosts,
    quoteOfTheWeek: '"The best agent is the one you can audit." — anon',
    internalNote: "Executive note: two signals worth a follow-up call.",
  },
};
