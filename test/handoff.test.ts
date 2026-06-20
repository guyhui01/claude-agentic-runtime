import { describe, it, expect } from "vitest";
import {
  validateHandoff,
  checkContractCompatibility,
  HandoffValidationError,
} from "../src/handoff/validate-handoff.js";
import type { StepContract } from "../src/handoff/types.js";

/**
 * Hermetic fixtures — delivery spine WF-001 (Scoping) → WF-002 (Specification).
 * WF-001 promises a scoping output { projet, perimetre }; WF-002 requires { projet, perimetre }.
 */
const wf001: StepContract = {
  stepId: "WF-001",
  output: {
    type: "object",
    required: ["projet", "perimetre"],
    properties: {
      projet: { type: "string" },
      perimetre: { type: "array", items: { type: "string" } },
    },
    additionalProperties: true,
  },
};

const wf002: StepContract = {
  stepId: "WF-002",
  input: {
    type: "object",
    required: ["projet", "perimetre"],
    properties: {
      projet: { type: "string" },
      perimetre: { type: "array", items: { type: "string" } },
    },
    additionalProperties: true,
  },
  output: { type: "object" },
};

/** Runs fn, requires a HandoffValidationError, and returns it for inspection. */
function expectError(fn: () => unknown): HandoffValidationError {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(HandoffValidationError);
    return err as HandoffValidationError;
  }
  throw new Error("expected: HandoffValidationError, but no error was thrown");
}

describe("checkContractCompatibility — static (design-time)", () => {
  it("compatible: every required downstream field is promised upstream", () => {
    expect(checkContractCompatibility(wf001, wf002)).toEqual([]);
  });

  it("incompatible: a required downstream field is not promised upstream", () => {
    const wf002bis: StepContract = {
      ...wf002,
      input: {
        type: "object",
        required: ["projet", "budget"], // "budget" never promised by WF-001
        properties: { projet: { type: "string" }, budget: { type: "number" } },
      },
    };
    const issues = checkContractCompatibility(wf001, wf002bis);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.stage).toBe("compat");
    expect(issues[0]!.code).toBe("MISSING_PRODUCED_FIELD");
    expect(issues[0]!.path).toBe("budget");
  });

  it("downstream with no input: compatible by construction (nothing to guarantee)", () => {
    const amorce: StepContract = { stepId: "WF-x", output: { type: "object" } };
    expect(checkContractCompatibility(wf001, amorce)).toEqual([]);
  });
});

describe("validateHandoff — runtime, happy path", () => {
  it("lets a payload that conforms to both upstream AND downstream pass", () => {
    expect(() =>
      validateHandoff(wf001, wf002, {
        projet: "Portal redesign",
        perimetre: ["auth", "catalogue"],
      }),
    ).not.toThrow();
  });
});

describe("validateHandoff — fail-closed", () => {
  it("producer-output failure: upstream breaks its promise (missing field)", () => {
    const err = expectError(() => validateHandoff(wf001, wf002, { projet: "X" }));
    expect(err.issues.some((i) => i.stage === "producer-output")).toBe(true);
  });

  it("consumer-input failure: invalid type rejected downstream", () => {
    const err = expectError(() =>
      validateHandoff(wf001, wf002, { projet: "X", perimetre: "auth" }),
    );
    expect(err.issues.some((i) => i.stage === "consumer-input")).toBe(true);
  });

  it("aggregates issues from both stages into a single throw", () => {
    const err = expectError(() =>
      validateHandoff(wf001, wf002, { perimetre: 42 }),
    );
    const stages = new Set(err.issues.map((i) => i.stage));
    expect(stages.has("producer-output")).toBe(true);
    expect(stages.has("consumer-input")).toBe(true);
  });
});
