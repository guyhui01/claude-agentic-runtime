/**
 * P04 END-TO-END, DISPATCH PHASE — BILLED, OBSERVED, on explicit approval.
 * The second live return loop, and the first on a workflow that is NOT the
 * pilot. Two router calls, then STOP: `runDispatch` never launches a spine, so
 * the pipeline halts before the human go/no-go by construction.
 *
 * WHAT THIS RUN BUYS, EXACTLY — and what it does not.
 * It shows the dispatch loop generalises past WF-001, the single case proven
 * live on 2026-07-19. That is a change in the CLASS of evidence. It is still
 * ONE code path, not ten, and it says nothing about the other nine manifests.
 * ⚠️ It does NOT buy the card-label refusal: `validate-route` maps `p.card`
 * today, so re-running the pilot unchanged would already return card labels
 * instead of the snake_case set in the 2026-07-19 trace. That contrast is
 * asserted offline, for free, in `dispatch-validate-route.test.ts`.
 *
 * ⚠️ It does NOT buy "a real router picks WF-004" either. The router-accuracy
 * run of 2026-07-19 (`docs/audit/live-runs/wf-000-router-live-result.json`,
 * 19/20) ALREADY carried P04 and ALREADY routed it to WF-004 live — with
 * `paramsChecked: false`, WF-004 having no manifest then. What is left, and it
 * is the point: the COMPLETE RETURN LOOP on a non-pilot workflow that now has
 * a manifest — live refusal, amendment, then a checked route.
 *
 * Phase 1 — the UNAMENDED P04 brief: the parameter check is deterministic, so
 * its outcome is PREDICTED OFFLINE and pinned in `dispatch-validate-route.test.ts` —
 * `PARAMS_MISSING [Engagement duration, Client AI maturity]`.
 * Phase 2 — the AMENDED P04 brief (fixture P04): expected `ROUTED` with
 * `paramsChecked: true` and the execution plan printed for the go/no-go.
 *
 * Outcomes are REPORTED VERBATIM — a deviation is a finding, never hidden. The
 * harness asserts mechanical soundness only: both phases reach a decision. A
 * router that routes elsewhere is a RESULT to read, not a failure to retry.
 *
 * Guarded: runs ONLY if `LIVE_RUN=1` AND the catalog is reachable; the normal
 * suite always SKIPS it. Auth: subscription OAuth only (runner guard refuses a
 * metered API key). Caps per call: single completion, maxTurns 2, $0.5.
 *
 * Launch: `LIVE_RUN=1 npx vitest run test/dispatch-p04-live.test.ts`
 * Optional: `LIVE_MODEL=<model>` routes the router call.
 */
import { describe, it, expect } from "vitest";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSidecar } from "../src/loader/load-sidecar.js";
import { runDispatch, type DispatchOutcome } from "../src/dispatch/run-dispatch.js";
import { createQueryRunner } from "../src/sdk/query-runner.js";
import { DISPATCH_FIXTURES, P04_UNAMENDED } from "./fixtures/dispatch-briefs.js";
import { CATALOG_ROOT, SIDECAR_PATH } from "./catalog-root.js";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const RESULT_FILE =
  process.env.LIVE_RESULT_FILE ??
  join(HERE, "..", "docs", "audit", "live-runs", "wf-000-p04-dispatch-live-result.json");

const ENABLED = !!process.env.LIVE_RUN && existsSync(SIDECAR_PATH);

describe.skipIf(!ENABLED)("WF-000 P04 — LIVE dispatch phase, beyond the pilot (billed, observed)", () => {
  it(
    "runs the return loop (unamended) then the amended brief to a plan, and stops",
    async () => {
      const amended = DISPATCH_FIXTURES.find((f) => f.id === "P04")?.brief;
      if (!amended) throw new Error("fixture P04 has no brief");

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

      const unamendedOutcome = await runDispatch(P04_UNAMENDED, opts);
      phases.push({
        phase: "unamended (return loop)",
        expected: "PARAMS_MISSING [Engagement duration, Client AI maturity] — predicted offline",
        brief: P04_UNAMENDED,
        outcome: unamendedOutcome,
      });

      const amendedOutcome = await runDispatch(amended, opts);
      phases.push({
        phase: "amended (fixture P04)",
        expected: "ROUTED WF-004, paramsChecked true, plan attached",
        brief: amended,
        outcome: amendedOutcome,
      });

      console.log("\n===== WF-000 P04 — DISPATCH PHASE (beyond the pilot) =====");
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
      console.log("==========================================================\n");

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
