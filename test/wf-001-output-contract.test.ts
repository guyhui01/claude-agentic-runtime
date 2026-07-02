/**
 * Regression guard from the 2026-06-09 live run (§2.4-B.3): the WF-001 manifest's
 * output schemas MUST communicate the exact contract the eval gates expect (fields
 * + bounds), so a live agent no longer diverges (cf. live run: 24 US / 9 epics,
 * field `userStory` instead of `statement` → fail-closed STEP-03).
 *
 * Since these schemas are injected into the prompt by `createQueryRunner` (enforced
 * format), pinning them there aligns the agent's output with what the gate checks.
 */
import { describe, it, expect } from "vitest";
import {
  WF_001_CADRAGE_MANIFEST,
  WF_001_CADRAGE_CRITERIA,
} from "../src/spines/wf-001-cadrage.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
function stepOutput(stepId: string): any {
  const step = WF_001_CADRAGE_MANIFEST.steps.find((s) => s.stepId === stepId);
  if (!step) throw new Error(`step ${stepId} not found`);
  return step.output as any;
}

describe("WF-001 — output schemas aligned with the gate criteria", () => {
  it("STEP-03: backlog pins the US fields (statement/priorite/estimation/dod) + bounds 8–15", () => {
    const out = stepOutput("STEP-03");
    expect(out.properties.backlog.minItems).toBe(8);
    expect(out.properties.backlog.maxItems).toBe(15);
    expect(out.properties.backlog.items.required).toEqual(
      expect.arrayContaining(["statement", "priorite", "estimation", "dod"]),
    );
    expect(out.properties.backlog.items.properties.estimation.type).toBe("number");
  });

  it("STEP-03: epics bounded 3–5 (DoD)", () => {
    const out = stepOutput("STEP-03");
    expect(out.properties.epics.minItems).toBe(3);
    expect(out.properties.epics.maxItems).toBe(5);
  });

  it("STEP-04: gherkin pins given/when/then", () => {
    const out = stepOutput("STEP-04");
    expect(out.properties.gherkin.items.required).toEqual(
      expect.arrayContaining(["given", "when", "then"]),
    );
  });

  // --- Advisory nudges communicated via descriptions (full scoping run) ---
  it("STEP-03: `statement` describes the INVEST template (advisory po-us-format-invest)", () => {
    const out = stepOutput("STEP-03");
    expect(out.properties.backlog.items.properties.statement.description).toMatch(
      /as a/i,
    );
  });

  it("STEP-04: gherkin describes the error/boundary coverage + carries `type` (advisory qa-cas-erreur-et-limite)", () => {
    const out = stepOutput("STEP-04");
    expect(out.properties.gherkin.description).toMatch(/error/i);
    expect(out.properties.gherkin.description).toMatch(/boundary/i);
    expect(out.properties.gherkin.items.properties.type).toBeDefined();
  });

  it("po-us-format-invest accepts the INVEST template, determiner-agnostic", () => {
    const invest = WF_001_CADRAGE_CRITERIA.find((c) => c.id === "po-us-format-invest");
    expect(invest).toBeDefined();
    // "an" article: "As an insured … so that …".
    expect(
      invest!.check({ backlog: [{ statement: "As an insured I want X so that I avoid Y" }] }),
    ).toBe(true);
    // "a" article also accepted.
    expect(
      invest!.check({ backlog: [{ statement: "As a user I want X so that Y" }] }),
    ).toBe(true);
    // "the" determiner — regression: real WF-001 Fable live run flagged a valid
    // "As the Head of B2B (sponsor), I want … so that …" story as off-template.
    expect(
      invest!.check({
        backlog: [
          {
            statement:
              "As the Head of B2B (sponsor), I want the legacy portal decommissioned so that we cut double-run costs",
          },
        ],
      }),
    ).toBe(true);
    // No determiner at all is still on-template.
    expect(
      invest!.check({ backlog: [{ statement: "As Head of B2B I want X so that Y" }] }),
    ).toBe(true);
    // Off-template: rejected.
    expect(invest!.check({ backlog: [{ statement: "I want a thing" }] })).toBe(false);
    // Word boundary: "was a" inside a sentence must NOT be read as the "as a"
    // opener (the old /as an?/ pattern matched the "as a" substring of "was a").
    expect(
      invest!.check({
        backlog: [{ statement: "It was a request, I want X so that Y" }],
      }),
    ).toBe(false);
  });
});
