import { describe, it, expect } from "vitest";
import { validateRoute } from "../src/dispatch/validate-route.js";
import { WF001_MANIFEST } from "../src/dispatch/manifests/wf-001.js";
import { WF002_MANIFEST } from "../src/dispatch/manifests/wf-002.js";
import { DISPATCH_FIXTURES } from "./fixtures/dispatch-briefs.js";
import type { NeedBrief } from "../src/dispatch/types.js";
import type { Sidecar } from "../src/sidecar/types.js";

/**
 * Hermetic guard of the deterministic route validation (router draft §3):
 * an invented workflow id, a broken dependency or a malformed answer must be
 * rejected fail-closed; NO_MATCH passes through as a valid decision; the
 * WF-001 manifest turns an under-specified brief into PARAMS_MISSING with the
 * missing params NAMED (the dry-run P01 gap), and an amended brief into a
 * ROUTED decision with paramsChecked=true.
 */

const FAKE_SIDECAR: Sidecar = {
  schemaVersion: "1.0",
  catalog: { name: "claude-agents", version: "v4.2.0" },
  generatedAt: "2026-07-19T00:00:00Z",
  assets: [
    { id: "AGENT-BUSINESS-ANALYST", type: "agent", path: "agents/ba.md", title: "BA", description: "d", catalogVersion: "v4.2.0", source: { file: "agents/ba.md", catalogTag: "v4.2.0" } },
    { id: "AGENT-PO-SCRUM", type: "agent", path: "agents/po.md", title: "PO", description: "d", catalogVersion: "v4.2.0", source: { file: "agents/po.md", catalogTag: "v4.2.0" } },
    {
      id: "WF-001",
      type: "workflow",
      path: "workflows/WF-001.md",
      title: "AI Product Scoping",
      description: "Client brief → prioritized backlog + acceptance criteria",
      catalogVersion: "v4.2.0",
      source: { file: "workflows/WF-001.md", catalogTag: "v4.2.0" },
      dependsOn: ["AGENT-BUSINESS-ANALYST", "AGENT-PO-SCRUM"],
    },
    {
      id: "WF-002",
      type: "workflow",
      path: "workflows/WF-002.md",
      title: "Delivery Agile SAFe",
      description: "PI Planning → sprint backlog → executive-committee reporting",
      catalogVersion: "v4.2.0",
      source: { file: "workflows/WF-002.md", catalogTag: "v4.2.0" },
      dependsOn: ["AGENT-BUSINESS-ANALYST"],
    },
    {
      id: "WF-006",
      type: "workflow",
      path: "workflows/WF-006.md",
      title: "Pre-sales",
      description: "RFP received → commercial proposal",
      catalogVersion: "v4.2.0",
      source: { file: "workflows/WF-006.md", catalogTag: "v4.2.0" },
      dependsOn: ["AGENT-BUSINESS-ANALYST"],
    },
    {
      id: "WF-BROKEN",
      type: "workflow",
      path: "workflows/WF-BROKEN.md",
      title: "Broken",
      description: "d",
      catalogVersion: "v4.2.0",
      source: { file: "workflows/WF-BROKEN.md", catalogTag: "v4.2.0" },
      dependsOn: ["AGENT-GHOST"],
    },
  ],
};

const MANIFESTS = { "WF-001": WF001_MANIFEST, "WF-002": WF002_MANIFEST } as const;

/**
 * The P02 coverage-matrix brief, reused rather than re-invented: it is
 * qualified for ROUTING, which is a weaker bar than filling the ART card — the
 * dry-run finding that every routed prompt still has a param gap.
 */
function p02Brief(): NeedBrief {
  const fixture = DISPATCH_FIXTURES.find((f) => f.id === "P02");
  if (fixture?.brief === undefined) throw new Error("P02 fixture carries no brief");
  return { ...fixture.brief, constraints: [...fixture.brief.constraints] };
}

/** P02 after the operator answered the two gaps the card check names. */
function p02AmendedBrief(): NeedBrief {
  const b = p02Brief();
  b.context +=
    " The ART has a capacity of 120 story points per PI and depends on the" +
    " ticketing vendor plus two external systems.";
  return b;
}

/** P01 qualified brief BEFORE amendment — the dry-run 3-param gap. */
function p01Brief(): NeedBrief {
  return {
    need: "Client brief received from Nordwind Insurance: the claims department wants an AI assistant for adjusters and management approved exploring it, so we must decide what to build first.",
    domain: "Agile & Product",
    expectedDeliverable: "Prioritized initial backlog with acceptance criteria",
    constraints: ["GDPR applies to claimant data"],
    context: "Mid-size European insurer, claims department of 40 adjusters.",
    submittedBy: "Lead UX Designer",
  };
}

/** P01 brief AFTER the operator answered the named gaps. */
function p01AmendedBrief(): NeedBrief {
  const b = p01Brief();
  b.context += " One product squad available, Scrum in place, no imposed stack.";
  b.expectedDeliverable = "Prioritized initial backlog with acceptance criteria (full scoping)";
  return b;
}

function proposal(route: string) {
  return { proposedRoute: route, rationale: "state marker + deliverable match", nearestMiss: null };
}

describe("validateRoute — fail-closed rejections", () => {
  it("rejects a malformed router answer (extra key), aggregating ajv errors", () => {
    const res = validateRoute(
      { ...proposal("WF-001"), confidence: 0.9 },
      p01AmendedBrief(),
      FAKE_SIDECAR,
      MANIFESTS,
    );
    expect(res.status).toBe("REJECT_ROUTER_OUTPUT");
    if (res.status !== "REJECT_ROUTER_OUTPUT") return;
    expect(res.issues[0]?.code).toBe("MALFORMED_OUTPUT");
  });

  it("rejects an invented workflow id (fail-closed, never force-fit)", () => {
    const res = validateRoute(proposal("WF-042"), p01AmendedBrief(), FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("REJECT_ROUTER_OUTPUT");
    if (res.status !== "REJECT_ROUTER_OUTPUT") return;
    expect(res.issues[0]?.code).toBe("UNKNOWN_WORKFLOW");
  });

  it("rejects an agent id proposed as a route (type must be workflow)", () => {
    const res = validateRoute(
      proposal("AGENT-BUSINESS-ANALYST"),
      p01AmendedBrief(),
      FAKE_SIDECAR,
      MANIFESTS,
    );
    expect(res.status).toBe("REJECT_ROUTER_OUTPUT");
  });

  it("rejects a route whose dependsOn does not resolve in the sidecar", () => {
    const res = validateRoute(proposal("WF-BROKEN"), p01AmendedBrief(), FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("REJECT_ROUTER_OUTPUT");
    if (res.status !== "REJECT_ROUTER_OUTPUT") return;
    expect(res.issues[0]).toMatchObject({ code: "UNRESOLVABLE_DEPENDENCY" });
    expect(res.issues[0]?.message).toContain("AGENT-GHOST");
  });
});

describe("validateRoute — valid decisions", () => {
  it("passes NO_MATCH through as a valid decision (honest coverage), keeping the nearest miss", () => {
    const res = validateRoute(
      { proposedRoute: "NO_MATCH", rationale: "no workflow carries legal drafting", nearestMiss: "WF-008" },
      p01AmendedBrief(),
      FAKE_SIDECAR,
      MANIFESTS,
    );
    expect(res).toEqual({
      status: "NO_MATCH",
      rationale: "no workflow carries legal drafting",
      nearestMiss: "WF-008",
    });
  });

  it("returns PARAMS_MISSING with the dry-run P01 gap named in CARD labels, not internal keys", () => {
    const res = validateRoute(proposal("WF-001"), p01Brief(), FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.route).toBe("WF-001");
    // Same three params as the 2026-07-19 live proof, now surfaced as the
    // business vocabulary the operator reads instead of snake_case keys.
    expect(res.missingParams.sort()).toEqual([
      "Level of detail",
      "Project method",
      "Team size",
    ]);
  });

  it("routes the amended P01 brief with paramsChecked=true (the return loop closes)", () => {
    const res = validateRoute(proposal("WF-001"), p01AmendedBrief(), FAKE_SIDECAR, MANIFESTS);
    expect(res).toMatchObject({ status: "ROUTED", route: "WF-001", paramsChecked: true });
  });

  it("routes a manifest-less workflow with paramsChecked=false — honest, never silently checked", () => {
    const res = validateRoute(proposal("WF-006"), p01AmendedBrief(), FAKE_SIDECAR, MANIFESTS);
    expect(res).toMatchObject({ status: "ROUTED", route: "WF-006", paramsChecked: false });
  });
});

describe("WF-002 manifest — the SAFe card, on a vocabulary far from WF-001", () => {
  it("names the P02 gap: routing-qualified is not card-qualified", () => {
    const res = validateRoute(proposal("WF-002"), p02Brief(), FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    // P02 identifies the train, its team count, its PI duration and the current
    // PI, but states neither capacity nor dependencies. This is the acceptance
    // oracle of the 2026-07-19 dry-run (§2) minus its `PI duration` entry, which
    // the brief does state verbatim — see the annotation in that document.
    expect(res.missingParams).toEqual(["ART capacity", "Dependencies"]);
  });

  it("routes the amended P02 brief with paramsChecked=true (the return loop closes)", () => {
    const res = validateRoute(proposal("WF-002"), p02AmendedBrief(), FAKE_SIDECAR, MANIFESTS);
    expect(res).toMatchObject({ status: "ROUTED", route: "WF-002", paramsChecked: true });
  });

  it("does not accept a WF-001 product-scoping brief as a filled ART card", () => {
    // Cross-vocabulary guard: if these detectors passed on prose that mentions
    // no train, PI or capacity, they would be keying on something other than
    // the card — the hollow pass this manifest exists to prevent.
    const res = validateRoute(proposal("WF-002"), p01AmendedBrief(), FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams.sort()).toEqual([
      "ART capacity",
      "ART name",
      "Current PI number",
      "Dependencies",
      "Number of teams",
      "PI duration",
    ]);
  });
});
