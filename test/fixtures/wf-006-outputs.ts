/**
 * WF-006 step outputs compliant with the DoD AND the tightened schema (hence with
 * the producer-output handoff). Fixture SHARED between the hermetic test
 * (`run-wf-006.test.ts`) and the "real sidecar" test
 * (`run-wf-006-real-sidecar.test.ts`) — DRY, single source.
 *
 * Option A (the live-run framing): STEP-01 verdict = "GO", so the GO/NO-GO gateway
 * passes and the full pre-sales backbone runs to `completed`. The NO-GO halt is
 * covered by the hermetic tests, which override `verdict` to "NO-GO".
 */

const requirements = Array.from({ length: 3 }, (_, i) => ({
  label: `requirement-${i + 1}`,
  priority: ["Must", "Should", "Could"][i]!,
}));
const personDays = ["PO", "AI Architect", "Dev", "Data", "MLOps"].map((p, i) => ({
  profile: p,
  days: 20 + i * 10,
}));
const costingGrid = personDays.map((pd) => ({
  profile: pd.profile,
  days: pd.days,
  dayRate: 900,
}));
const commercialScenarios = [
  { type: "fixed price", price: 240000 },
  { type: "T&M", price: 260000 },
  { type: "hybrid", price: 250000 },
];
const pitchDeck = Array.from({ length: 12 }, (_, i) => ({ title: `slide-${i + 1}` }));

/** "Full" outputs: satisfy all criteria (blocking AND advisory). Verdict = GO. */
export const wf006HappyOutputs: Record<string, unknown> = {
  "STEP-01": {
    bant: {
      budget: "€250k envelope confirmed by the CFO",
      authority: "CDO is the economic buyer, procurement involved",
      need: "Claims-triage automation, board-level priority",
      timeline: "Award in 8 weeks, delivery within 6 months",
    },
    winProbability: 65,
    verdict: "GO",
    qualificationSheet: "Qualified opportunity: strong need, confirmed budget, identified sponsor.",
    risks: [{ risk: "aggressive incumbent", mitigation: "differentiate on AI-Act readiness" }],
    sponsor: "CDO (economic buyer) + CIO (technical validator).",
  },
  "STEP-02": {
    scope: {
      in: ["claims-triage classifier", "RAG over policy base", "human-in-the-loop review"],
      out: ["core policy-admin migration", "fraud scoring"],
    },
    useCases: ["auto-routing", "priority scoring", "assisted review"],
    requirements,
    nfr: [{ label: "p95 latency < 2s" }, { label: "EU data residency" }],
    assumptions: [{ label: "existing claims API available" }],
  },
  "STEP-03A": {
    architectureDiagram: "Mermaid: Client IS -> API GW -> RAG(VectorDB) -> LLM -> HITL review UI",
    stack: { llm: "claude-opus-4-8", rag: "hybrid BM25 + embeddings", agents: "MCP tools" },
    tradeoffs: [{ component: "VectorDB", decision: "buy (managed)" }],
    monthlyOpCost: 4200,
    risks: [{ risk: "token cost drift", mitigation: "prompt cache + routing" }],
  },
  "STEP-04": {
    wbs: [{ package: "discovery" }, { package: "build" }, { package: "hardening" }],
    schedule: "Gantt: discovery (M1) -> build (M2-M4) -> hardening (M5) -> UAT (M6).",
    personDays,
    workloadPlan: "2 FTE ramp over 6 months, peak at M3.",
    assumptions: [{ label: "client SME availability 2 days/week" }],
  },
  "STEP-05": {
    costingGrid,
    sellingPrice: 250000,
    commercialScenarios,
    prospectRoi: "€1.1M/year in handling-cost savings vs. €250k engagement — payback < 4 months.",
    margin: 0.32,
  },
  "STEP-07": {
    execSummary:
      "Context, value, €250k price and a 6-month schedule for a claims-triage AI with AI-Act readiness.",
    proposal:
      "Complete commercial proposal: scope, architecture, schedule, costing, pricing, references.",
    anticipatedQa: [{ q: "Why not fixed price only?", a: "Hybrid caps risk while sharing upside." }],
    pitchDeck,
  },
};
