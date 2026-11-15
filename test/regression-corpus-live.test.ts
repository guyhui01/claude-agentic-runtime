/**
 * LIVE RUN of the behavioral regression corpus (`regression-corpus.ts`) — BILLED, on explicit
 * approval. Unlike the live observation harnesses (`wf-00X-run-live.test.ts`, which accept any
 * outcome), this one ASSERTS each case's deterministic invariants.
 *
 * Guarded: runs ONLY if `LIVE_RUN=1` AND the catalog is reachable; `npm test` always SKIPS it.
 * Auth: subscription OAuth only — the query runner refuses an `ANTHROPIC_API_KEY`.
 *
 * Behavioral check of a catalog change: point `CATALOG_ROOT` at the `claude-agents` checkout
 * carrying the change (default: the sibling checkout, whatever it has checked out).
 *
 * Launch:  `LIVE_RUN=1 npx vitest run test/regression-corpus-live.test.ts`
 * Options: `REGRESSION_CASE=<id>` runs one case only; `LIVE_MODEL=<alias|id>` routes every step;
 *          `LIVE_RESULT_DIR=<dir>` (default: `docs/audit/live-runs/`, raw `.json` gitignored).
 *
 * Provenance: the result records the catalog checkout's commit and whether its tree was dirty —
 * the sidecar's `catalogTag` would still name the pinned tag on a modified branch. A catalog that
 * is not a git checkout is refused BEFORE any billed call: an unattributable run proves nothing.
 *
 * Dispatch cases (WF-000 router) make a single router call each (caps $0.5 / 2 turns).
 *
 * Cost note: the WF-008 counter-review case runs STEP-06C and, on a cleared verdict, STEP-07
 * (caps $4.0 / 15 turns per step). The WF-008 refusal case is expected to halt at STEP-01. If a regression lets the
 * audit continue, the full spine runs (caps $4.0 / 15 turns per step) — that cost IS the finding.
 */
import { describe, it, expect } from "vitest";
import { existsSync, writeFileSync, mkdirSync, realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSidecar } from "../src/loader/load-sidecar.js";
import { CATALOG_ROOT, SIDECAR_PATH } from "./catalog-root.js";
import {
  REGRESSION_CASES,
  DISPATCH_REGRESSION_CASES,
  checkCase,
  checkDispatchInvariants,
  toRecordedRun,
} from "./regression-corpus.js";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const RESULT_DIR = process.env.LIVE_RESULT_DIR ?? join(HERE, "..", "docs", "audit", "live-runs");
const ENABLED = !!process.env.LIVE_RUN && existsSync(SIDECAR_PATH);
const ONLY = process.env.REGRESSION_CASE;

const ALL_IDS = [...REGRESSION_CASES, ...DISPATCH_REGRESSION_CASES].map((c) => c.id);
if (ONLY && !ALL_IDS.includes(ONLY)) {
  throw new Error(`REGRESSION_CASE=${ONLY}: unknown case (known: ${ALL_IDS.join(", ")})`);
}

/**
 * Commit and dirty state of the catalog checkout. Throws unless `root` is itself the top of a git
 * checkout — a plain folder nested in another repo would otherwise borrow that repo's commit.
 */
function catalogProvenance(root: string): { commit: string; dirty: boolean } {
  const git = (...args: string[]) => execFileSync("git", ["-C", root, ...args], { encoding: "utf-8" }).trim();
  const top = git("rev-parse", "--show-toplevel");
  if (realpathSync(top) !== realpathSync(root)) {
    throw new Error(`CATALOG_ROOT=${root} is not the top of a git checkout (enclosing repo: ${top})`);
  }
  return { commit: git("rev-parse", "HEAD"), dirty: git("status", "--porcelain") !== "" };
}

describe.skipIf(!ENABLED)("regression corpus — LIVE RUN (billed, asserted)", () => {
  for (const c of REGRESSION_CASES.filter((x) => !ONLY || x.id === ONLY)) {
    it(
      `${c.id} (${c.workflow}) reproduces its expected outcome`,
      async () => {
        const catalog = catalogProvenance(CATALOG_ROOT);
        const sidecar = loadSidecar(SIDECAR_PATH, CATALOG_ROOT);
        const res = await c.run({
          sidecar,
          catalogRoot: CATALOG_ROOT,
          ...(process.env.LIVE_MODEL ? { model: process.env.LIVE_MODEL } : {}),
        });
        const recorded = toRecordedRun(res);
        const outputs = res.traces.map((t) => ({ stepId: t.provenance.stepId, output: t.output }));
        const violations = checkCase(c, recorded, outputs);

        mkdirSync(RESULT_DIR, { recursive: true });
        writeFileSync(
          join(RESULT_DIR, `regression-${c.id}-live-result.json`),
          JSON.stringify(
            {
              case: c.id,
              catalogRoot: CATALOG_ROOT,
              catalogCommit: catalog.commit,
              catalogDirty: catalog.dirty,
              violations,
              ...recorded,
              outputs,
            },
            null,
            2,
          ),
          "utf-8",
        );

        expect(violations).toEqual([]);
      },
      1_800_000,
    );
  }

  for (const c of DISPATCH_REGRESSION_CASES.filter((x) => !ONLY || x.id === ONLY)) {
    it(
      `${c.id} (WF-000 dispatch) decides on ${c.expectedRoute}`,
      async () => {
        const catalog = catalogProvenance(CATALOG_ROOT);
        const sidecar = loadSidecar(SIDECAR_PATH, CATALOG_ROOT);
        const outcome = await c.run({
          sidecar,
          catalogRoot: CATALOG_ROOT,
          ...(process.env.LIVE_MODEL ? { model: process.env.LIVE_MODEL } : {}),
        });
        const violations = checkDispatchInvariants(c.expectedRoute, outcome);

        mkdirSync(RESULT_DIR, { recursive: true });
        writeFileSync(
          join(RESULT_DIR, `regression-${c.id}-live-result.json`),
          JSON.stringify(
            {
              case: c.id,
              catalogRoot: CATALOG_ROOT,
              catalogCommit: catalog.commit,
              catalogDirty: catalog.dirty,
              violations,
              outcome,
            },
            null,
            2,
          ),
          "utf-8",
        );

        expect(violations).toEqual([]);
      },
      300_000,
    );
  }
});
