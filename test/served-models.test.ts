import { describe, it, expect, vi } from "vitest";

// The real SDK must never run here: a case that ignored the context's query() would fall back to
// it and make a real call on the operator's subscription. Replaced by a tripwire instead.
vi.mock("@anthropic-ai/claude-agent-sdk", () => ({
  query: () => {
    throw new Error("real SDK query() reached from a hermetic test");
  },
}));
import { existsSync } from "node:fs";
import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { QueryFn } from "../src/sdk/query-runner.js";
import type { Sidecar } from "../src/sidecar/types.js";
import { loadSidecar } from "../src/loader/load-sidecar.js";
import { recordServedModels } from "./served-models.js";
import { REGRESSION_CASES, DISPATCH_REGRESSION_CASES } from "./regression-corpus.js";
import { CATALOG_ROOT, SIDECAR_PATH } from "./catalog-root.js";

/**
 * Served-model attribution for live traces, hermetic. The recorder must pass the SDK stream
 * through untouched and keep the model ids of `modelUsage`; every corpus case must send its
 * calls through the context's `query()`, or its live trace would record no served model.
 */

/** Fake `query()` yielding the given messages on every call. */
const fakeQuery = (messages: object[]): QueryFn =>
  async function* () {
    for (const m of messages) yield m as unknown as SDKMessage;
  };

const result = (extra: object) => ({
  type: "result",
  subtype: "success",
  is_error: false,
  result: "",
  num_turns: 1,
  errors: [],
  ...extra,
});

describe("recordServedModels", () => {
  it("passes every message through unchanged and keeps the modelUsage ids, sorted and deduplicated", async () => {
    const init = { type: "system", subtype: "init", model: "requested-alias" };
    const r1 = result({ modelUsage: { "claude-b": {}, "claude-a": {} } });
    const r2 = result({ modelUsage: { "claude-a": {} } });
    const rec = recordServedModels(fakeQuery([init, r1]));
    const seen: unknown[] = [];
    for await (const m of rec.query({ prompt: "p" })) seen.push(m);
    expect(seen).toEqual([init, r1]);
    expect(seen[1]).toBe(r1);
    const rec2 = recordServedModels(fakeQuery([r2]));
    for await (const _ of rec2.query({ prompt: "p" })) void _;
    expect(rec.servedModels()).toEqual(["claude-a", "claude-b"]);
    expect(rec2.servedModels()).toEqual(["claude-a"]);
  });

  it("records nothing when no result carries modelUsage (the init message's model is a request, not a proof)", async () => {
    const rec = recordServedModels(fakeQuery([{ type: "system", subtype: "init", model: "requested-alias" }, result({})]));
    for await (const _ of rec.query({ prompt: "p" })) void _;
    expect(rec.servedModels()).toEqual([]);
  });
});

describe("corpus cases send their calls through the context's query()", () => {
  const emptySidecar: Sidecar = {
    schemaVersion: "1.0.0",
    catalog: { name: "claude-agents", version: "v5.0.1" },
    generatedAt: "2026-11-24T00:00:00Z",
    assets: [],
  };

  it("every dispatch case", async () => {
    for (const c of DISPATCH_REGRESSION_CASES) {
      const rec = recordServedModels(
        fakeQuery([
          result({
            structured_output: { proposedRoute: "NO_MATCH", rationale: "fake", nearestMiss: null },
            modelUsage: { "fake-served-model": {} },
          }),
        ]),
      );
      await c.run({ sidecar: emptySidecar, catalogRoot: "/nonexistent", query: rec.query });
      expect(rec.servedModels(), c.id).toEqual(["fake-served-model"]);
    }
  });

  it.skipIf(!existsSync(SIDECAR_PATH))("every spine case (real sidecar: agents resolve from the catalog prose)", async () => {
    const sidecar = loadSidecar(SIDECAR_PATH, CATALOG_ROOT);
    for (const c of REGRESSION_CASES) {
      // A failed result: the runner throws fail-closed after the first call, so nothing else runs.
      const rec = recordServedModels(
        fakeQuery([{ ...result({ modelUsage: { "fake-served-model": {} } }), subtype: "error_during_execution", is_error: true }]),
      );
      await c.run({ sidecar, catalogRoot: CATALOG_ROOT, query: rec.query }).catch(() => undefined);
      expect(rec.servedModels(), c.id).toEqual(["fake-served-model"]);
    }
  });
});
