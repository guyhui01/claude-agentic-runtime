/**
 * WF-008 step outputs compliant with the DoD AND the tightened schema (hence with
 * the producer-output handoff). Fixture SHARED between the hermetic test
 * (`spine-wf-008.test.ts`) and the "real sidecar" test
 * (`run-wf-008-real-sidecar.test.ts`) — DRY, single source.
 */

const owaspLlm = Array.from({ length: 10 }, (_, i) => ({
  category: `LLM${String(i + 1).padStart(2, "0")}`,
  status: "assessed",
}));

/** "Full" outputs: satisfy all criteria (blocking AND advisory). Tier « High-risk » (audited, not unacceptable), verdict « cleared ». */
export const wf008HappyOutputs: Record<string, unknown> = {
  "STEP-01": {
    tier: "High-risk",
    obligationsMatrix: [
      { framework: "AI Act", obligation: "Art. 9 risk management system" },
      { framework: "NIS2", obligation: "Incident reporting (important entity)" },
    ],
    gdprArticles: ["Art. 5", "Art. 6", "Art. 9", "Art. 22", "Art. 25", "Art. 32", "Art. 35"],
    penalties: "Up to 7% of worldwide turnover (AI Act) + 4% (GDPR).",
  },
  "STEP-02": {
    architectureReport: "Transparency (Art. 50) OK, monitoring (Art. 15) partial, traceability logs 12-month retention.",
    humanOversight: "Human-in-the-loop on high-impact decisions + documented kill switch (Art. 14).",
    gaps: ["No GenAI watermarking", "Drift detection incomplete"],
  },
  "STEP-03": {
    securityReport: "Encryption at rest + in transit, IAM least-privilege, audit logs, BCP tested.",
    owaspLlm,
    stride: "STRIDE adapted to AI: spoofing, tampering, repudiation, info disclosure, DoS, elevation.",
    controlsPlan: [{ control: "Prompt-injection input validation", framework: "OWASP LLM01" }],
  },
  "STEP-04": {
    dataReport: "Legal basis: legitimate interest + consent; minimization enforced; 24-month retention.",
    lineage: "Source CRM → feature store → training set → RAG index, documented end to end.",
    biasAudit: "Statistical parity checked across gender/age subgroups; 3-pt gap flagged for correction.",
    correctionPlan: [{ issue: "Age-group under-representation", action: "Targeted resampling" }],
  },
  "STEP-05": {
    governanceFramework: "ISO 42001-aligned: AI ethics committee (quarterly), pre-prod compliance gate, AI policy.",
    raci: [
      { role: "DPO", responsibility: "Accountable — GDPR compliance" },
      { role: "CISO", responsibility: "Responsible — AI security" },
      { role: "AI Officer", responsibility: "Responsible — AI Act lead" },
      { role: "Business", responsibility: "Consulted — use cases" },
    ],
    aiActLead: "AI Officer appointed as AI Act lead, dotted line to the DPO.",
  },
  "STEP-06": {
    adkarPlan: "Awareness/Desire done, Knowledge in progress via training, Ability + Reinforcement Q3.",
    trainingProgram: [
      { population: "AI Act leads", content: "AI Act tiers + obligations, 2-day workshop" },
      { population: "Data teams", content: "Bias, lineage, GDPR-by-design, 1 day" },
    ],
    adoptionKpis: [{ kpi: "% leads certified", target: "100% by Q3" }],
  },
  "STEP-06C": {
    verdict: "cleared",
    biasLog: [
      { bias: "Overconfidence on tier qualification", impact: "Cross-checked against Annex III — confirmed High-risk" },
      { bias: "Blind spot on outside-EU transfers", impact: "Added TIA review — closed" },
    ],
    exitCriteria: [
      { criterion: "Traceability: every finding maps to an obligation", met: true },
      { criterion: "Evidence: each gap has a supporting artifact", met: true },
      { criterion: "Reproducibility: methodology documented", met: true },
    ],
    reservations: [],
  },
  "STEP-07": {
    execSummary: "Verdict: High-risk, largely compliant. Top-5 risks: watermarking, drift, transfers, bias, logs.",
    auditReport: "Full report structured by framework: AI Act, GDPR, NIS2, ISO 42001 — 62 pages.",
    remediationPlan: [
      { item: "Implement GenAI watermarking", priority: "High — Art. 50, 3-month deadline" },
      { item: "Complete drift detection", priority: "Medium — Art. 15" },
    ],
    roadmap: [{ quarter: "Q3", milestone: "Watermarking + drift live" }],
  },
};
