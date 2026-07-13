/**
 * WF-007 step outputs compliant with the DoD AND the tightened schema (hence with
 * the producer-output handoff). Fixture SHARED between the hermetic test
 * (`run-wf-007.test.ts`) and the "real sidecar" test
 * (`run-wf-007-real-sidecar.test.ts`) — DRY, single source.
 */

const slots = ["D1-AM", "D1-PM", "D2-AM", "D3-AM", "D4-PM", "D5-AM"];
const kickoffPlan = slots.map((s, i) => ({
  slot: s,
  activity: `Kickoff activity ${i + 1} (${s})`,
}));
const raci = ["Sponsor", "Direct manager", "Team lead", "CHRO"].map((p) => ({
  stakeholder: p,
  raci: p === "Sponsor" ? "A" : p === "Direct manager" ? "R" : "C",
}));
const stakeholderMap = [
  { stakeholder: "Sponsor", stance: "ally" },
  { stakeholder: "Ops lead", stance: "neutral" },
  { stakeholder: "Legacy owner", stance: "resister" },
];

/** "Full" outputs: satisfy all criteria (blocking AND advisory). */
export const wf007HappyOutputs: Record<string, unknown> = {
  "STEP-01": {
    kickoffPlan,
    raci,
    logisticsChecklist: ["Badge + PC", "VPN + accounts", "D1 kickoff meeting booked"],
    d1Questions: ["Who owns the roadmap?", "What defines success at D30?"],
    kickoffRisks: ["Post-reorg sensitivity", "Undocumented legacy IS"],
  },
  "STEP-02": {
    clientContext:
      "Mid-cap European industrial group, ~4,000 employees, cautious data culture, two SSII incumbents.",
    isMapping: ["ERP (SAP)", "legacy MES", "on-prem data warehouse"],
    orgChart: "COMEX → CIO → 3 IT domains; business sponsor in Operations.",
    glossary: [{ term: "MES", def: "Manufacturing Execution System" }],
    greyAreas: ["Cloud posture unclear", "Data ownership across BUs"],
  },
  "STEP-03": {
    stakeholderMap,
    engagementPlan: [
      { who: "Sponsor", when: "D1", why: "align on success criteria" },
      { who: "Team", when: "D2-D5", why: "build trust, gather context" },
    ],
    d1Posture: "Observer-first, expert on request.",
    quickWins: ["Fix the standup format", "Share a 1-page context map"],
  },
  "STEP-05": {
    d1Kit:
      "# D1 kit\n## Kickoff plan\n...\n## Client sheet\n...\n## Key questions\n...",
    introEmail:
      "Subject: Kickoff — looking forward to D1. Hi [manager], ahead of Monday, here is the plan...",
    d1ReportTemplate:
      "# D1 report\n- What I saw:\n- Who I met:\n- Risks:\n- Next steps:",
    d5ScopingNote:
      "D5 scoping: confirmed scope, 2 adjustments (add data-governance workstream, defer MES).",
  },
};
