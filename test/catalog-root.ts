/**
 * Root of the `claude-agents` catalog consumed by the "real sidecar" tests
 * (`run-wf-001-real-sidecar`) and the live run (`wf-001-run-live`).
 *
 * SINGLE SOURCE OF TRUTH for the default: factored here to avoid drift between
 * tests (two duplicated defaults = a stale clone silently consumed — exactly the
 * trap being avoided).
 *
 * Default: sibling `claude-agents` — the REAL name of the catalog repo. Overridable
 * via the `CATALOG_ROOT` env var (checkout elsewhere). `SIDECAR_PATH` derives from it.
 * The runtime does NOT DEPEND on the catalog (separate repos, ADR-0002): if the
 * sibling is absent, the blocks that depend on it are SKIPPED (see `HAVE_CATALOG`
 * in the tests).
 */
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = fileURLToPath(new URL(".", import.meta.url));

export const CATALOG_ROOT =
  process.env.CATALOG_ROOT ?? join(HERE, "..", "..", "claude-agents");
export const SIDECAR_PATH = join(CATALOG_ROOT, "sidecar.json");
