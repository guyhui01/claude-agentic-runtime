import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { SIDECAR_PATH } from "./catalog-root.js";

/**
 * The complementary block of every `real-sidecar` suite: it runs ONLY when the
 * catalog is absent, so that "skipped for lack of a checkout" never looks like
 * "did not run".
 *
 * Why it is factored here, and why its title changed. Each of the ten spine
 * suites carried its own copy titled `"WF-00X spine — real sidecar (skip)"`,
 * whose `it` read `"skipped: catalog not found (set CATALOG_ROOT or checkout
 * sibling)"`. With a checkout present that block is itself skipped, so the
 * reporter printed ten lines saying *catalog not found* precisely BECAUSE the
 * catalog was found. Every word true, the reader's conclusion inverted — on
 * 2026-07-29 it made me start reporting that the real-sidecar proofs had not run
 * before I checked. The title now names the block's CONDITION rather than its
 * effect, and states the inference a skipped line licenses.
 *
 * ⛔ Do not "simplify" this away by deleting the block: it is what distinguishes
 * *skipped for lack of a catalog* from *did not run*, which is the opposite of a
 * guard that is green without having guarded.
 */

/** True when the catalog sidecar is reachable — the single gate for both blocks. */
export const HAVE_CATALOG = existsSync(SIDECAR_PATH);

/**
 * Declares the no-catalog fallback for one real-sidecar suite. `subject` is a
 * free label, not a workflow id: the dispatch suite is not a spine, and its
 * eight assertions used to vanish with no explanation at all when the catalog
 * was missing. Eleven call sites, one wording: a correction lands once.
 */
export function describeCatalogAbsent(subject: string): void {
  describe.runIf(!HAVE_CATALOG)(
    `${subject} — no-catalog fallback (runs ONLY without a checkout; skipped here ⇒ the real-sidecar block above DID run)`,
    () => {
      it("records that no catalog is checked out (set CATALOG_ROOT or check out the sibling)", () => {
        expect(HAVE_CATALOG).toBe(false);
      });
    },
  );
}
