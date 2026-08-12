/**
 * WF-002 "Delivery Agile SAFe" parameter manifest — first of the nine V1
 * manifests, and the prototype that stresses the shape: its SAFe vocabulary
 * (ART, PI, story points, cross-train dependencies) shares nothing with the
 * WF-001 pilot, so a detector that only worked for product-scoping prose fails
 * loudly here rather than quietly.
 *
 * Derived from the card's `ART CONTEXT` block
 * (`claude-agents/workflows/WF-002-delivery-safe.md`, v1.1), pinned to catalog
 * v4.3.0 — the real-sidecar test hard-fails on tag drift, forcing a re-derive.
 *
 * Detector policy (settled once for all nine, see `next_steps.md`):
 *   - every `required` spec carries a `pattern` built from the CARD's own
 *     vocabulary, never widened to make a fixture pass;
 *   - the safe failure direction is a false "missing" — the operator adds one
 *     line to the brief. A false "filled" is what the patterns must never do,
 *     because most specs read the same shared brief fields;
 *   - a spec that genuinely cannot be missing says so with `defaultValue`.
 * WF-002 has no card-sanctioned unknown: every bracket holds a real value.
 */

import type { NeedBrief } from "../types.js";
import type { ParamManifest } from "../types.js";

/** The two free-text fields an ART context is described in. */
const situation = (b: NeedBrief): string => `${b.need} ${b.context}`;

export const WF002_MANIFEST: ParamManifest = {
  workflow: "WF-002",
  catalogTag: "v4.3.0",
  params: [
    {
      name: "art_name",
      card: "ART name",
      required: true,
      mapping: situation,
      // The card asks for an IDENTIFIER of the train, and accepts it in either
      // position: the proper noun before ART ("Digital Banking ART", the card's
      // own example) or after it ("the ART at Helvetia Rail"). Encoding only the
      // example's word order would key on the shape of one sample rather than on
      // what the field means — the 2026-07-19 dry-run reads the second form as
      // filled, and it is right. Articles are excluded from the first form so a
      // bare "the ART" cannot pass as a name.
      pattern:
        /\b(?!The\b|This\b|Our\b|An\b|A\b)[A-Z][\w&-]+\s+(?:[A-Z][\w&-]+\s+){0,2}ART\b|\bARTs?\s+(?:at|for|of)\s+(?:the\s+)?[A-Z][\w&-]+/,
    },
    {
      name: "team_count",
      card: "Number of teams",
      required: true,
      mapping: situation,
      pattern: /\b\d+\s+(squads?|scrum teams?|teams?|trains?)\b/i,
    },
    {
      name: "pi_duration",
      card: "PI duration",
      required: true,
      mapping: situation,
      // Either the PI stated in weeks/months, or the sprint decomposition the
      // card gives as its alternative form ("4 sprints of 2 weeks").
      pattern:
        /\bPI\b[^.;]{0,40}\b\d+\s*-?\s*(weeks?|months?)\b|\b\d+\s*-?\s*(weeks?|months?)\b[^.;]{0,40}\bPI\b|\b\d+\s+sprints?\s+of\s+\d+\b/i,
    },
    {
      name: "current_pi",
      card: "Current PI number",
      required: true,
      mapping: situation,
      // "PI-07" / "PI 7". Does not fire on "PI of 10 weeks" — that is duration,
      // a different card line.
      pattern: /\bPI[-\s]?\d+\b/i,
    },
    {
      name: "art_capacity",
      card: "ART capacity",
      required: true,
      mapping: situation,
      pattern: /\b\d+\s*(story points?|velocity)\b|\bcapacity\b[^.;]{0,30}\b\d+/i,
    },
    {
      name: "dependencies",
      card: "Dependencies",
      required: true,
      // Dependencies surface as often in the constraint list as in the prose.
      mapping: (b) => `${situation(b)} ${b.constraints.join("; ")}`,
      // Card vocabulary verbatim: "other ARTs, external systems, vendors".
      pattern:
        /\bdepend\w+\b|\bother arts?\b|\bexternal (system|team|partner|dependenc)\w*\b|\bvendors?\b|\bsuppliers?\b|\bthird[-\s]party\b/i,
    },
    {
      name: "constraints",
      card: "Constraints",
      required: true,
      mapping: (b) =>
        b.constraints.length > 0
          ? b.constraints.join("; ")
          : "unconstrained (justified in context)",
      // Satisfied upstream, so it can never be missing: intake already rejects
      // an unjustified empty `constraints`. Same treatment as WF-001.
      defaultValue: "(guaranteed by the intake completeness check)",
    },
    {
      name: "deliverables_language",
      card: "Deliverables language",
      required: false,
      mapping: () => "",
      defaultValue: "English", // operator-profile default
    },
  ],
};
