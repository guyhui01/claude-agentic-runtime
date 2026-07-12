import { describe, it, expect } from "vitest";
import { affirmativeString, countAffirmativeField } from "../src/spines/spine-helpers.js";

/**
 * Guards the decision-gate sentinel logic added after the WF-009 first live run
 * (an agent's honest "None — no candidate can be selected" must be rejected by a
 * decision gate, while a real value — including names that merely start with "no"/"na"
 * — must be accepted).
 */
describe("affirmativeString — decision-gate sentinel rejection", () => {
  it("rejects the negative sentinels an agent emits when it cannot fulfill a field", () => {
    for (const s of [
      "",
      "   ",
      "None — no candidate can be selected",
      "N/A",
      "n/a",
      "Not applicable — placeholder 1",
      "CANNOT BE ISSUED — NO ELIGIBLE CANDIDATE",
      "no candidate available",
      "TBD",
      "to be determined",
      "pending",
      "placeholder 3",
      "unknown",
    ]) {
      expect(affirmativeString(s), s).toBe(false);
    }
    expect(affirmativeString(undefined)).toBe(false);
    expect(affirmativeString(42)).toBe(false);
  });

  it("accepts real values, including names that merely start with 'no'/'na'", () => {
    for (const s of ["candidate-1", "Noah", "Nadia", "Nancy", "Normand Alizé", "A. Naoumov"]) {
      expect(affirmativeString(s), s).toBe(true);
    }
  });
});

describe("countAffirmativeField — real (non-placeholder) items", () => {
  it("counts only items whose field is an affirmative string", () => {
    const list = [
      { candidate: "candidate-1" },
      { candidate: "None — placeholder" },
      { candidate: "Noah" },
      { candidate: "N/A — placeholder 2" },
    ];
    expect(countAffirmativeField(list, "candidate")).toBe(2);
    expect(countAffirmativeField("not-an-array", "candidate")).toBe(0);
    expect(countAffirmativeField([{}], "candidate")).toBe(0);
  });
});
