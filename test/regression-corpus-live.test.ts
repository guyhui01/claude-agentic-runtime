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
 * Cost note: the WF-008 refusal case is expected to halt at STEP-01. If a regression lets the
 * audit continue, the full spine runs (caps $4.0 / 15 turns per step) — that cost IS the finding.
 */
import { describe, it, expect } from "vitest";
import { existsSync, writeFileSync, mkdirSync, realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSidecar } from "../src/loader/load-sidecar.js";
import { CATALOG_ROOT, SIDECAR_PATH } from "./catalog-root.js";
import { REGRESSION_CASES, checkInvariants, toRecordedRun } from "./regression-corpus.js";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const RESULT_DIR = process.env.LIVE_RESULT_DIR ?? join(HERE, "..", "docs", "audit", "live-runs");
const ENABLED = !!process.env.LIVE_RUN && existsSync(SIDECAR_PATH);
const ONLY = process.env.REGRESSION_CASE;

if (ONLY && !REGRESSION_CASES.some((c) => c.id === ONLY)) {
  throw new Error(`REGRESSION_CASE=${ONLY}: unknown case (known: ${REGRESSION_CASES.map((c) => c.id).join(", ")})`);
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
        const violations = checkInvariants(c.expected, recorded);

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
              outputs: res.traces.map((t) => ({ stepId: t.provenance.stepId, output: t.output })),
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
});
