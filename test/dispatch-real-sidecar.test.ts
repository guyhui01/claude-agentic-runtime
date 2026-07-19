import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { loadSidecar } from "../src/loader/load-sidecar.js";
import { validateRoute } from "../src/dispatch/validate-route.js";
import { buildPlan } from "../src/dispatch/plan.js";
import { WF001_MANIFEST } from "../src/dispatch/manifests/wf-001.js";
import type { NeedBrief } from "../src/dispatch/types.js";
import { CATALOG_ROOT, SIDECAR_PATH } from "./catalog-root.js";

/**
 * Real-sidecar proof (offline, zero LLM): the dispatch validation runs against
 * the REAL catalog sidecar — WF-001 exists and resolves, and the WF-001 param
 * manifest is pinned to the SAME catalog tag as the sidecar entry (drift = a
 * manifest derived from a stale card = hard fail, forcing a re-derive).
 *
 * CI-safe: skipped cleanly when the catalog is not checked out (ADR-0002 —
 * the runtime does not depend on the catalog repo).
 */

const HAVE_CATALOG = existsSync(SIDECAR_PATH);

const amendedP01: NeedBrief = {
  need: "Client brief received from Nordwind Insurance: the claims department wants an AI assistant for adjusters and management approved exploring it, so we must decide what to build first.",
  domain: "Agile & Product",
  expectedDeliverable: "Prioritized initial backlog with acceptance criteria (full scoping)",
  constraints: ["GDPR applies to claimant data"],
  context:
    "Mid-size European insurer, claims department of 40 adjusters, one product squad available, Scrum in place, no imposed stack.",
  submittedBy: "Lead UX Designer",
};

describe.skipIf(!HAVE_CATALOG)("dispatch against the real sidecar", () => {
  it("routes the amended P01 brief to WF-001 with every dependsOn resolved and params checked", () => {
    const sidecar = loadSidecar(SIDECAR_PATH);
    const res = validateRoute(
      { proposedRoute: "WF-001", rationale: "brief received + backlog deliverable", nearestMiss: null },
      amendedP01,
      sidecar,
      { "WF-001": WF001_MANIFEST },
    );
    expect(res).toMatchObject({ status: "ROUTED", route: "WF-001", paramsChecked: true });
  });

  it("pins the WF-001 manifest to the sidecar's catalog tag (drift = hard fail)", () => {
    const sidecar = loadSidecar(SIDECAR_PATH);
    const wf001 = sidecar.assets.find((a) => a.id === "WF-001" && a.type === "workflow");
    expect(wf001).toBeDefined();
    expect(WF001_MANIFEST.catalogTag).toBe(wf001?.source.catalogTag);
  });

  it("builds the execution plan from the real WF-001 card (duration + recommended model verbatim)", () => {
    const sidecar = loadSidecar(SIDECAR_PATH);
    const wf001 = sidecar.assets.find((a) => a.id === "WF-001" && a.type === "workflow");
    expect(wf001).toBeDefined();
    if (wf001 === undefined) return;
    const plan = buildPlan(wf001, CATALOG_ROOT);
    expect(plan.workflow).toBe("WF-001");
    expect(plan.durationEstimate).toBeTruthy();
    expect(plan.recommendedModel).toMatch(/^claude-/);
  });

  it("still rejects an invented id against the real sidecar", () => {
    const sidecar = loadSidecar(SIDECAR_PATH);
    const res = validateRoute(
      { proposedRoute: "WF-999", rationale: "made up", nearestMiss: null },
      amendedP01,
      sidecar,
      { "WF-001": WF001_MANIFEST },
    );
    expect(res.status).toBe("REJECT_ROUTER_OUTPUT");
  });
});
