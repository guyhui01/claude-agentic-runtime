import { describe, it, expect } from "vitest";
import { loadSpine } from "../src/manifest/load-manifest.js";
import { runSpine } from "../src/orchestrator/run-spine.js";
import {
  WF_001_CADRAGE_MANIFEST,
  buildWf001CadrageRegistry,
} from "../src/spines/wf-001-cadrage.js";
import {
  WF_003_LANCEMENT_MANIFEST,
  buildWf003LancementRegistry,
} from "../src/spines/wf-003-lancement.js";
import {
  wf001InterimSidecar,
  wf001ResolveAgent,
  mockRunner,
} from "./fixtures/wf-001-spine.js";
import { wf003InterimSidecar, wf003ResolveAgent } from "./fixtures/wf-003-spine.js";
import { wf001HappyOutputs } from "./fixtures/wf-001-outputs.js";
import { wf003HappyOutputs } from "./fixtures/wf-003-outputs.js";

/**
 * GHERKIN CASE-TYPE VOCABULARY — a regression guard, written as a record of a defect that
 * shipped, not as a description of the design.
 *
 * On 2026-08-23 a schema `enum: ["nominal", "error", "boundary"]` was added to
 * `gherkin[].type` on both spines, to stop the advisory that reads that field from keying on
 * unconstrained literals. Measured after the fact, it converted a SOFT miss into a HARD run
 * failure: a case variant, a padded value, and the `nominal/erreur/limite` French vocabulary
 * the 2026-06-09 live WF-001 run ACTUALLY produced each became `failed`/`kind:"handoff"`.
 * The enum was reverted; this file exists so it cannot come back unnoticed.
 *
 * The contract these tests pin, in one sentence: **an unexpected case type costs an advisory
 * warning, never the run.** Two halves, and BOTH are load-bearing —
 *   · a variant of FORM (casing, whitespace) is absorbed by the normalized `coversCaseTypes`
 *     and satisfies the advisory: no false warning;
 *   · a variant of SUBSTANCE (a vocabulary the card does not name) REDDENS the advisory while
 *     the spine still completes: the criterion is not a decoration that passes on anything.
 * A guard asserting only the first half would stay green on a criterion that never reddens
 * (`feedback-garde-vert-sans-avoir-garde`), which is why the drift case asserts BOTH
 * `completed` AND the unsatisfied criterion.
 */

type Outputs = Record<string, unknown>;

const withTypes = (outs: Outputs, stepId: string, types: string[]): Outputs => {
  const step = outs[stepId] as Record<string, unknown>;
  const gherkin = (step["gherkin"] as Array<Record<string, unknown>>).map((sc, i) => ({
    ...sc,
    type: types[i] ?? sc["type"],
  }));
  return { ...outs, [stepId]: { ...step, gherkin } };
};

const runWf001 = (outs: Outputs) =>
  runSpine(
    loadSpine(
      WF_001_CADRAGE_MANIFEST,
      wf001InterimSidecar,
      buildWf001CadrageRegistry(),
      wf001ResolveAgent,
    ),
    mockRunner(outs),
    {},
  );

const runWf003 = (outs: Outputs) =>
  runSpine(
    loadSpine(
      WF_003_LANCEMENT_MANIFEST,
      wf003InterimSidecar,
      buildWf003LancementRegistry(),
      wf003ResolveAgent,
    ),
    mockRunner(outs),
    {},
  );

/** Ids of the criteria that did NOT pass, across every gate report of the run. */
const unsatisfied = (result: { traces: Array<{ gate: { results: Array<{ id: string; passed: boolean }> } }> }): string[] =>
  result.traces.flatMap((t) => t.gate.results.filter((c) => !c.passed).map((c) => c.id));

const SPINES = [
  {
    wf: "WF-001",
    run: runWf001,
    happy: wf001HappyOutputs,
    step: "STEP-04",
    criterion: "qa-cas-erreur-et-limite",
    // The card's own vocabulary, in the order the fixture lays the scenarios out.
    conformant: ["nominal", "error", "boundary"],
    drift: ["nominal", "erreur", "limite"],
  },
  {
    wf: "WF-003",
    run: runWf003,
    happy: wf003HappyOutputs,
    step: "STEP-04",
    criterion: "qa-gherkin-3-types",
    conformant: ["nominal", "boundary", "error"],
    drift: ["nominal", "limite", "erreur"],
  },
] as const;

describe.each(SPINES)(
  "$wf gherkin case types — an unexpected value costs a warning, never the run",
  ({ run, happy, step, criterion, conformant, drift }) => {
    it("the card-conformant vocabulary completes with the criterion satisfied", async () => {
      const r = await run(happy);
      expect(r.status).toBe("completed");
      expect(unsatisfied(r)).not.toContain(criterion);
    });

    it("a CASE variant completes and still satisfies the criterion (normalized, not enum-gated)", async () => {
      const r = await run(
        withTypes(happy, step, conformant.map((t) => t[0].toUpperCase() + t.slice(1))),
      );
      expect(r.status).toBe("completed"); // an `enum` on `type` would fail this at the handoff
      expect(r.failure).toBeUndefined();
      expect(unsatisfied(r)).not.toContain(criterion);
    });

    it("a WHITESPACE variant completes and still satisfies the criterion", async () => {
      const r = await run(withTypes(happy, step, conformant.map((t) => ` ${t} `)));
      expect(r.status).toBe("completed");
      expect(unsatisfied(r)).not.toContain(criterion);
    });

    it("an out-of-vocabulary drift REDDENS the advisory but does not stop the spine", async () => {
      // `nominal/erreur/limite` is not hypothetical: it is what the 2026-06-09 live run emitted.
      const r = await run(withTypes(happy, step, [...drift]));
      expect(r.status).toBe("completed"); // the whole point: a warning, not a dead run
      expect(r.failure).toBeUndefined();
      expect(unsatisfied(r)).toContain(criterion); // and the criterion is not a `/.+/`
    });
  },
);

describe("the schema must not close the case-type vocabulary", () => {
  it.each([
    ["WF-001", WF_001_CADRAGE_MANIFEST],
    ["WF-003", WF_003_LANCEMENT_MANIFEST],
  ])("%s STEP-04 `gherkin[].type` carries a description, never an `enum`", (_wf, manifest) => {
    const step = manifest.steps.find((s) => s.stepId === "STEP-04");
    const type = (step?.output as any).properties.gherkin.items.properties.type;
    // The description is how the constraint reaches the agent (the WF-006 `verdictCode` idiom);
    // an `enum` would make ajv reject a variant at the handoff, one step after the gate that
    // was built to tolerate it.
    expect(type.description).toMatch(/nominal/i);
    expect(type.enum).toBeUndefined();
  });
});
