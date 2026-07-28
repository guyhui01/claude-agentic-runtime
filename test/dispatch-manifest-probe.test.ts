import { describe, it, expect } from "vitest";
import { validateRoute } from "../src/dispatch/validate-route.js";
import { DEFAULT_MANIFESTS } from "../src/dispatch/run-dispatch.js";
import type { NeedBrief } from "../src/dispatch/types.js";
import type { Sidecar } from "../src/sidecar/types.js";

/**
 * Discrimination probe over EVERY registered manifest (offline, zero LLM).
 *
 * The fail-closed detector in `paramFilled` catches a FORGOTTEN `pattern` — the
 * spec is then missing forever and the manifest's own happy-path test fails.
 * It cannot catch a LAZY one: a pattern like `/.+/`, or an alternation widened
 * until a fixture passes, satisfies every happy-path test while checking
 * nothing. That is the false "filled" direction, and it is tempting exactly
 * where the card gives no enum to key on.
 *
 * So this probe measures the opposite claim: fed prose that is grammatical,
 * plausible and carries NONE of the card vocabulary, every required spec must
 * come back missing. A spec that survives this is keying on something other
 * than its card.
 *
 * It applies to each new manifest the moment it is registered — no per-manifest
 * fixture to write. Specs carrying `defaultValue` are excluded by construction:
 * they can never be missing, and say so.
 */

/** Grammatical, plausible, and deliberately devoid of any card's vocabulary. */
const NEUTRAL_BRIEF: NeedBrief = {
  need: "The client organisation has approved a piece of work and wants it started now.",
  domain: "General",
  expectedDeliverable: "A written document the stakeholder can act on.",
  constraints: ["the budget is fixed"],
  context: "A mid-size company with people involved, a timeline, and an approved intention.",
  submittedBy: "Manager",
};

/** Minimal sidecar exposing every registered manifest as a resolvable route. */
const PROBE_SIDECAR: Sidecar = {
  schemaVersion: "1.0",
  catalog: { name: "claude-agents", version: "v4.2.0" },
  generatedAt: "2026-07-28T00:00:00Z",
  assets: Object.keys(DEFAULT_MANIFESTS).map((id) => ({
    id,
    type: "workflow" as const,
    path: `workflows/${id}.md`,
    title: id,
    description: "probe",
    catalogVersion: "v4.2.0",
    source: { file: `workflows/${id}.md`, catalogTag: "v4.2.0" },
  })),
};

describe("param manifests — detectors must DISCRIMINATE, not merely exist", () => {
  for (const [id, manifest] of Object.entries(DEFAULT_MANIFESTS)) {
    it(`${id}: neutral prose leaves every required param missing`, () => {
      const expected = manifest.params
        .filter((p) => p.required && p.defaultValue === undefined)
        .map((p) => p.card)
        .sort();

      // Guard the guard: a manifest of nothing but defaulted specs would make
      // the assertion below pass without measuring anything.
      expect(expected.length).toBeGreaterThan(0);

      const res = validateRoute(
        { proposedRoute: id, rationale: "probe", nearestMiss: null },
        NEUTRAL_BRIEF,
        PROBE_SIDECAR,
        DEFAULT_MANIFESTS,
      );

      expect(res.status).toBe("PARAMS_MISSING");
      if (res.status !== "PARAMS_MISSING") return;
      expect(res.missingParams.sort()).toEqual(expected);
    });
  }
});
