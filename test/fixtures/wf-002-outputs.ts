/**
 * Sorties d'étape WF-002 conformes au DoD ET au schéma RESSERRÉ (donc au handoff
 * producer-output). Fixture PARTAGÉE entre le test hermétique (`run-wf-002.test.ts`)
 * et le test « sidecar réel » (`run-wf-002-real-sidecar.test.ts`) — DRY, source unique.
 */

const happyBacklog = Array.from({ length: 6 }, (_, i) => ({
  statement: `US ${i + 1} : story du sprint 1`,
  wsjf: 20 - i,
}));

/** Sorties « plein pot » : satisfont tous les critères (blocking ET advisory). */
export const wf002HappyOutputs: Record<string, unknown> = {
  "STEP-01": {
    visionBoard: "Vision board PI-07 (1 page) : self-care + paiement.",
    featuresWsjf: [
      { feature: "Self-care", wsjf: 18 },
      { feature: "Paiement", wsjf: 14 },
      { feature: "Réclamations", wsjf: 9 },
    ],
    leanBusinessCase: "Lean Business Case : ROI 2.1x sur 18 mois.",
  },
  "STEP-02": {
    programBoard: [{ from: "EQ1", to: "EQ2", dep: "API auth" }],
    voteConfiance: 4.2,
    roamRisks: [{ risk: "dépendance externe SI", roam: "Owned" }],
  },
  "STEP-03": {
    piObjectives: ["PIO-1 SSO livré", "PIO-2 paiement pilote", "PIO-3 reporting CODIR"],
    backlogSprint: happyBacklog,
  },
  "STEP-04": {
    sprintGoal: "Livrer l'authentification SSO de bout en bout.",
    sprintPlan: { usEngagees: ["US 1", "US 2", "US 3"], storyPoints: 21 },
    impediments: [{ id: "IMP-1", desc: "accès environnement staging" }],
  },
  "STEP-06": {
    noteCodir: "Note CODIR : PI-07 en ligne, 1 risque Owned, CPI 1.02.",
    dashboard: { avancement: "32%", risques: ["dép. externe SI"] },
    evm: { cpi: 1.02, spi: 0.98 },
  },
};
