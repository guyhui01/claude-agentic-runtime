import { describe, it, expect } from "vitest";
import {
  validateHandoff,
  checkContractCompatibility,
  HandoffValidationError,
} from "../src/handoff/validate-handoff.js";
import type { StepContract } from "../src/handoff/types.js";

/**
 * Fixtures hermétiques — spine delivery WF-001 (Cadrage) → WF-002 (Spécification).
 * WF-001 promet un cadrage { projet, perimetre } ; WF-002 exige { projet, perimetre }.
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

/** Exécute fn, exige une HandoffValidationError, la retourne pour inspection. */
function expectError(fn: () => unknown): HandoffValidationError {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(HandoffValidationError);
    return err as HandoffValidationError;
  }
  throw new Error("attendu : HandoffValidationError, mais aucune erreur levée");
}

describe("checkContractCompatibility — statique (design-time)", () => {
  it("compatible : tous les champs requis de l'aval sont promis par l'amont", () => {
    expect(checkContractCompatibility(wf001, wf002)).toEqual([]);
  });

  it("incompatible : un champ requis aval n'est pas promis par l'amont", () => {
    const wf002bis: StepContract = {
      ...wf002,
      input: {
        type: "object",
        required: ["projet", "budget"], // "budget" jamais promis par WF-001
        properties: { projet: { type: "string" }, budget: { type: "number" } },
      },
    };
    const issues = checkContractCompatibility(wf001, wf002bis);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.stage).toBe("compat");
    expect(issues[0]!.code).toBe("MISSING_PRODUCED_FIELD");
    expect(issues[0]!.path).toBe("budget");
  });

  it("aval sans entrée : compatible par construction (rien à garantir)", () => {
    const amorce: StepContract = { stepId: "WF-x", output: { type: "object" } };
    expect(checkContractCompatibility(wf001, amorce)).toEqual([]);
  });
});

describe("validateHandoff — runtime, chemin nominal", () => {
  it("laisse passer un payload conforme amont ET aval", () => {
    expect(() =>
      validateHandoff(wf001, wf002, {
        projet: "Refonte portail",
        perimetre: ["auth", "catalogue"],
      }),
    ).not.toThrow();
  });
});

describe("validateHandoff — fail-closed", () => {
  it("échec producer-output : l'amont ne tient pas sa promesse (champ manquant)", () => {
    const err = expectError(() => validateHandoff(wf001, wf002, { projet: "X" }));
    expect(err.issues.some((i) => i.stage === "producer-output")).toBe(true);
  });

  it("échec consumer-input : type invalide rejeté côté aval", () => {
    const err = expectError(() =>
      validateHandoff(wf001, wf002, { projet: "X", perimetre: "auth" }),
    );
    expect(err.issues.some((i) => i.stage === "consumer-input")).toBe(true);
  });

  it("agrège les issues des deux étapes en un seul jet", () => {
    const err = expectError(() =>
      validateHandoff(wf001, wf002, { perimetre: 42 }),
    );
    const stages = new Set(err.issues.map((i) => i.stage));
    expect(stages.has("producer-output")).toBe(true);
    expect(stages.has("consumer-input")).toBe(true);
  });
});
