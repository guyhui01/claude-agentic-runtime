/**
 * LIVE ROUTER ACCURACY RUN (plan §4.1) — BILLED, OBSERVED, on explicit approval.
 *
 * Guarded: runs ONLY if `LIVE_RUN=1` AND the catalog is reachable; the normal
 * suite always SKIPS it. Auth: subscription OAuth only (runner guard). Tight
 * caps per call (single completion: maxTurns 2, $0.5) — 20 calls ≪ one spine run.
 *
 * The live LLM proposes on all 20 oracle fixtures; every deterministic layer
 * (intake, validation, plan) is the SAME code the offline oracle proves. The
 * score is REPORTED VERBATIM — a mis-route (especially on role probes P19/P20
 * or the discriminating pairs P11-P13) is a finding to surface honestly, never
 * a hidden failure; the harness only ASSERTS mechanical soundness (every
 * fixture yields a decision; P18 dies at intake deterministically).
 *
 * Launch: `LIVE_RUN=1 npx vitest run test/dispatch-run-live.test.ts`
 * Optional: `LIVE_MODEL=<model>` routes the router call.
 */
import { describe, it, expect } from "vitest";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSidecar } from "../src/loader/load-sidecar.js";
import { runDispatch, type DispatchOutcome } from "../src/dispatch/run-dispatch.js";
import { createQueryRunner } from "../src/sdk/query-runner.js";
import { DISPATCH_FIXTURES } from "./fixtures/dispatch-briefs.js";
import { CATALOG_ROOT, SIDECAR_PATH } from "./catalog-root.js";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const RESULT_FILE =
  process.env.LIVE_RESULT_FILE ??
  join(HERE, "..", "docs", "audit", "live-runs", "wf-000-router-live-result.json");

const ENABLED = !!process.env.LIVE_RUN && existsSync(SIDECAR_PATH);

/** What the oracle cell predicts as the live outcome status. */
function expectedStatus(expected: string): DispatchOutcome["status"] {
  if (expected === "REJECT_INCOMPLETE") return "REJECT_INCOMPLETE";
  if (expected === "NO_MATCH") return "NO_MATCH";
  return "ROUTED";
}

describe.skipIf(!ENABLED)("WF-000 dispatch — LIVE router accuracy (billed, observed)", () => {
  it(
    "proposes on the 20 oracle fixtures and reports the score verbatim",
    async () => {
      const sidecar = loadSidecar(SIDECAR_PATH, CATALOG_ROOT);
      const runner = createQueryRunner({ caps: { maxBudgetUsd: 0.5, maxTurns: 2 } });

      const results: Array<{
        id: string;
        expected: string;
        got: string;
        match: boolean;
        detail: DispatchOutcome;
      }> = [];

      for (const fixture of DISPATCH_FIXTURES) {
        const outcome = await runDispatch(fixture.raw ?? fixture.brief, {
          sidecar,
          catalogRoot: CATALOG_ROOT,
          runner,
          ...(process.env.LIVE_MODEL ? { model: process.env.LIVE_MODEL } : {}),
        });
        const got =
          outcome.status === "ROUTED" || outcome.status === "PARAMS_MISSING"
            ? outcome.route
            : outcome.status;
        // PARAMS_MISSING counts as reaching the expected route (the gap is the
        // brief's, not the router's) — the exact status stays in the detail.
        const match = got === fixture.expected;
        results.push({ id: fixture.id, expected: fixture.expected, got, match, detail: outcome });
      }

      const score = results.filter((r) => r.match).length;
      const mismatches = results.filter((r) => !r.match);

      mkdirSync(dirname(RESULT_FILE), { recursive: true });
      writeFileSync(
        RESULT_FILE,
        JSON.stringify(
          { ranAt: new Date().toISOString(), score: `${score}/${results.length}`, results },
          null,
          2,
        ),
      );

      // Honest reporting: the score is data, not a pass bar.
      // eslint-disable-next-line no-console
      console.log(`[live router] score ${score}/${results.length}`);
      for (const m of mismatches) {
        // eslint-disable-next-line no-console
        console.log(`[live router] MISMATCH ${m.id}: expected ${m.expected}, got ${m.got}`);
      }

      // Mechanical soundness only (see header): every fixture decided…
      expect(results).toHaveLength(DISPATCH_FIXTURES.length);
      // …and the deterministic intake gate is model-independent.
      const p18 = results.find((r) => r.id === "P18");
      expect(p18?.got).toBe("REJECT_INCOMPLETE");
    },
    1_800_000,
  );
});
