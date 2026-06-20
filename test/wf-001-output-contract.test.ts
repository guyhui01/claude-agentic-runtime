/**
 * Garde de régression du run live 2026-06-09 (§2.4-B.3) : les schémas de sortie
 * du manifeste WF-001 DOIVENT communiquer le contrat exact attendu par les eval
 * gates (champs + bornes), pour qu'un agent live ne diverge plus (cf. run live :
 * 24 US / 9 épics, champ `userStory` au lieu de `statement` → fail-closed STEP-03).
 *
 * Ces schémas étant injectés au prompt par `createQueryRunner` (format imposé),
 * les y épingler aligne la sortie de l'agent sur ce que la gate vérifie.
 */
import { describe, it, expect } from "vitest";
import {
  WF_001_CADRAGE_MANIFEST,
  WF_001_CADRAGE_CRITERIA,
} from "../src/spines/wf-001-cadrage.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
function stepOutput(stepId: string): any {
  const step = WF_001_CADRAGE_MANIFEST.steps.find((s) => s.stepId === stepId);
  if (!step) throw new Error(`étape ${stepId} introuvable`);
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

  it("po-us-format-invest accepts the INVEST template (a/an article)", () => {
    const invest = WF_001_CADRAGE_CRITERIA.find((c) => c.id === "po-us-format-invest");
    expect(invest).toBeDefined();
    // "an" article: « As an insured … so that … ».
    expect(
      invest!.check({ backlog: [{ statement: "As an insured I want X so that I avoid Y" }] }),
    ).toBe(true);
    // "a" article also accepted.
    expect(
      invest!.check({ backlog: [{ statement: "As a user I want X so that Y" }] }),
    ).toBe(true);
    // Off-template: rejected.
    expect(invest!.check({ backlog: [{ statement: "I want a thing" }] })).toBe(false);
  });
});
