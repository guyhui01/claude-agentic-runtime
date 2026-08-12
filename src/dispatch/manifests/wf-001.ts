/**
 * WF-001 "AI Product Scoping" parameter manifest — the only manifest built in
 * V0 (pilot; the other nine come in V1 once this shape is proven).
 *
 * Derived from the card's `CLIENT CONTEXT` block
 * (`claude-agents/workflows/WF-001-cadrage-produit-ia.md`), pinned to catalog
 * v4.3.0 — the real-sidecar test hard-fails on tag drift, forcing a re-derive.
 *
 * The `pattern` detectors are V0-pilot pragmatic: they recognize the card's
 * enum families in free brief text (deterministic substring/regex, no LLM).
 * A false "missing" is the safe failure mode — the operator adds one line to
 * the brief; a false "filled" is not possible for text the pattern doesn't match.
 * WF-001 has no card-sanctioned unknowns: full intake sentinel policy applies.
 */

import type { ParamManifest } from "../types.js";

export const WF001_MANIFEST: ParamManifest = {
  workflow: "WF-001",
  catalogTag: "v4.3.0",
  params: [
    {
      name: "sector",
      card: "Sector",
      required: true,
      mapping: (b) => b.context,
      pattern:
        /\b(bank\w*|insur\w*|retail\w*|industr\w*|health\w*|logistic\w*|energy|telecom\w*|public[- ]sector|e-?commerce)\b/i,
    },
    {
      name: "product_type",
      card: "Product type",
      required: true,
      mapping: (b) => `${b.context}; ${b.need}`,
      pattern:
        /\b(ai (app\w*|assistant|product)|b2b portal|cms|internal (workflow|tool)|chatbot|copilot)\b/i,
    },
    {
      name: "team_size",
      card: "Team size",
      required: true,
      mapping: (b) => b.context,
      // ⛔ DELIBERATELY NOT WIDENED to the WF-010 vocabulary ("team of eight",
      // "8 people"), settled by the end-of-project audit (debt (a)) after the
      // two specs were measured disjoint. This card line is a CLOSED
      // enumeration — [Solo / 1 squad / Several SAFe teams] — so a headcount is
      // not one of its values and reading it would invent a new member, the
      // class corrected on WF-007 (`onboarding`) and WF-009 (`portage`). The
      // probe agrees rather than merely permitting: widening buys a foreign
      // cell (P09 ← "team of eight") and moves no verdict of this card's own.
      // The reverse direction is NOT symmetric and was fixed there — WF-010's
      // `Team involved [Size / …]` enumerates nothing, so "3 squads" is a size
      // for it. `N developers|engineers|teams` stays here: it is the granularity
      // of the listed values, not a new member.
      pattern: /\b(solo|squads?|scrum teams?|safe teams?|\d+\s+(developers?|engineers?|teams?))\b/i,
    },
    {
      name: "project_method",
      card: "Project method",
      required: true,
      mapping: (b) => b.context,
      pattern: /\b(scrum|safe|kanban|hybrid)\b/i,
    },
    {
      name: "constraints",
      card: "Constraints",
      required: true,
      // Post-intake invariant: an empty array only survives the completeness
      // check when the context justifies it — encode that as an affirmative value.
      mapping: (b) =>
        b.constraints.length > 0
          ? b.constraints.join("; ")
          : "unconstrained (justified in context)",
      // Satisfied upstream, so it can never be missing: intake already rejects
      // an unjustified empty `constraints`. Declared, not implicit — a required
      // spec carrying no detector is otherwise reported missing (fail-closed).
      defaultValue: "(guaranteed by the intake completeness check)",
    },
    {
      name: "deliverables_language",
      card: "Deliverables language",
      required: false,
      mapping: () => "",
      defaultValue: "English", // operator-profile default
    },
    {
      name: "level_of_detail",
      card: "Level of detail",
      required: true,
      mapping: (b) => b.expectedDeliverable,
      pattern: /\b(quick|mvp|full scoping|multi-sprint|backlog depth)\b/i,
    },
  ],
};
