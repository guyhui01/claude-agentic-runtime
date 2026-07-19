/**
 * PILOT P01 END-TO-END, DISPATCH PHASE (plan §4.2) — BILLED, OBSERVED, on
 * explicit approval. Two router calls, then STOP: the pipeline halts before
 * the human go/no-go by construction (`runDispatch` never launches a spine);
 * the WF-001 spine run is a separate human command on Guy's GO.
 *
 * Phase 1 — the UNAMENDED P01 brief (pre-qualification): expected to route
 * WF-001 then return `PARAMS_MISSING` [team_size, project_method,
 * level_of_detail] — the return loop, live.
 * Phase 2 — the AMENDED P01 brief (fixture P01): expected `ROUTED` with
 * `paramsChecked: true` + the execution plan printed verbatim for the go/no-go.
 *
 * Outcomes are REPORTED VERBATIM (a deviation is a finding, never hidden);
 * the harness only asserts mechanical soundness — both phases yield a decision.
 *
 * Guarded: runs ONLY if `LIVE_RUN=1` AND the catalog is reachable; the normal
 * suite always SKIPS it. Auth: subscription OAuth only (runner guard). Caps
 * per call: single completion, maxTurns 2, $0.5.
 *
 * Launch: `LIVE_RUN=1 npx vitest run test/dispatch-pilot-p01-live.test.ts`
 * Optional: `LIVE_MODEL=<model>` routes the router call.
 */
import { describe, it, expect } from "vitest";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSidecar } from "../src/loader/load-sidecar.js";
import { runDispatch, type DispatchOutcome } from "../src/dispatch/run-dispatch.js";
import { createQueryRunner } from "../src/sdk/query-runner.js";
import { DISPATCH_FIXTURES, P01_UNAMENDED } from "./fixtures/dispatch-briefs.js";
import { CATALOG_ROOT, SIDECAR_PATH } from "./catalog-root.js";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const RESULT_FILE =
  process.env.LIVE_RESULT_FILE ??
  join(HERE, "..", "docs", "audit", "live-runs", "wf-000-pilot-p01-dispatch-live-result.json");

const ENABLED = !!process.env.LIVE_RUN && existsSync(SIDECAR_PATH);

describe.skipIf(!ENABLED)("WF-000 pilot P01 — LIVE dispatch phase (billed, observed)", () => {
  it(
    "runs the return loop (unamended) then the amended brief to a plan, and stops",
    async () => {
      const amended = DISPATCH_FIXTURES.find((f) => f.id === "P01")?.brief;
      if (!amended) throw new Error("fixture P01 has no brief");

      const sidecar = loadSidecar(SIDECAR_PATH, CATALOG_ROOT);
      const runner = createQueryRunner({ caps: { maxBudgetUsd: 0.5, maxTurns: 2 } });
      const opts = {
        sidecar,
        catalogRoot: CATALOG_ROOT,
        runner,
        ...(process.env.LIVE_MODEL ? { model: process.env.LIVE_MODEL } : {}),
      };

      const phases: Array<{
        phase: string;
        expected: string;
        brief: unknown;
        outcome: DispatchOutcome;
      }> = [];

      const unamendedOutcome = await runDispatch(P01_UNAMENDED, opts);
      phases.push({
        phase: "unamended (return loop)",
        expected: "PARAMS_MISSING [team_size, project_method, level_of_detail]",
        brief: P01_UNAMENDED,
        outcome: unamendedOutcome,
      });

      const amendedOutcome = await runDispatch(amended, opts);
      phases.push({
        phase: "amended (fixture P01)",
        expected: "ROUTED WF-001, paramsChecked true, plan attached",
        brief: amended,
        outcome: amendedOutcome,
      });

      console.log("\n===== WF-000 PILOT P01 — DISPATCH PHASE =====");
      for (const p of phases) {
        console.log(`- ${p.phase}`);
        console.log(`    expected: ${p.expected}`);
        console.log(`    got     : ${JSON.stringify(p.outcome)}`);
      }
      if (amendedOutcome.status === "ROUTED") {
        console.log("execution plan (verbatim from the card, for the human go/no-go):");
        console.log(JSON.stringify(amendedOutcome.plan, null, 2));
      }
      console.log("STOP — the go/no-go and the spine launch are human commands.");
      console.log("=============================================\n");

      mkdirSync(dirname(RESULT_FILE), { recursive: true });
      writeFileSync(
        RESULT_FILE,
        JSON.stringify({ ranAt: new Date().toISOString(), phases }, null, 2),
        "utf-8",
      );

      // Mechanical soundness only (see header): both phases reached a decision.
      expect(phases).toHaveLength(2);
      for (const p of phases) {
        expect([
          "REJECT_INCOMPLETE",
          "REJECT_ROUTER_OUTPUT",
          "NO_MATCH",
          "PARAMS_MISSING",
          "ROUTED",
        ]).toContain(p.outcome.status);
      }
    },
    600_000,
  );
});
