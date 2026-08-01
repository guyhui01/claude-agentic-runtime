import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { validateRoute } from "../src/dispatch/validate-route.js";
import { WF001_MANIFEST } from "../src/dispatch/manifests/wf-001.js";
import { WF002_MANIFEST } from "../src/dispatch/manifests/wf-002.js";
import { WF003_MANIFEST } from "../src/dispatch/manifests/wf-003.js";
import { WF004_MANIFEST } from "../src/dispatch/manifests/wf-004.js";
import { WF005_MANIFEST } from "../src/dispatch/manifests/wf-005.js";
import { WF006_MANIFEST } from "../src/dispatch/manifests/wf-006.js";
import { WF007_MANIFEST } from "../src/dispatch/manifests/wf-007.js";
import { WF008_MANIFEST } from "../src/dispatch/manifests/wf-008.js";
import { WF009_MANIFEST } from "../src/dispatch/manifests/wf-009.js";
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
      id: "WF-003",
      type: "workflow",
      path: "workflows/WF-003.md",
      title: "AI Application Launch",
      description: "Validated prototype → deployed, security-audited application",
      catalogVersion: "v4.2.0",
      source: { file: "workflows/WF-003.md", catalogTag: "v4.2.0" },
      dependsOn: ["AGENT-BUSINESS-ANALYST"],
    },
    {
      id: "WF-004",
      type: "workflow",
      path: "workflows/WF-004.md",
      title: "AI Consulting Engagement",
      description: "Engagement signed → maturity audit, roadmap and training plan",
      catalogVersion: "v4.2.0",
      source: { file: "workflows/WF-004.md", catalogTag: "v4.2.0" },
      dependsOn: ["AGENT-BUSINESS-ANALYST"],
    },
    {
      id: "WF-005",
      type: "workflow",
      path: "workflows/WF-005.md",
      title: "Strategic Intelligence & Growth",
      description: "Weekly signal → qualified synthesis and publication-ready content",
      catalogVersion: "v4.2.0",
      source: { file: "workflows/WF-005.md", catalogTag: "v4.2.0" },
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
      id: "WF-007",
      type: "workflow",
      path: "workflows/WF-007.md",
      title: "Client Engagement Onboarding D1-D5",
      description: "Engagement signed → kickoff plan → D1 kit → D5 scoping",
      catalogVersion: "v4.2.0",
      source: { file: "workflows/WF-007.md", catalogTag: "v4.2.0" },
      dependsOn: ["AGENT-BUSINESS-ANALYST"],
    },
    {
      id: "WF-008",
      type: "workflow",
      path: "workflows/WF-008.md",
      title: "AI Act / GDPR Compliance Audit",
      description: "AI system in production → compliance verdict + remediation plan",
      catalogVersion: "v4.2.0",
      source: { file: "workflows/WF-008.md", catalogTag: "v4.2.0" },
      dependsOn: ["AGENT-BUSINESS-ANALYST"],
    },
    {
      id: "WF-009",
      type: "workflow",
      path: "workflows/WF-009.md",
      title: "IT / AI Recruitment",
      description: "Hiring need → job ad → sourcing → assessment → offer",
      catalogVersion: "v4.2.0",
      source: { file: "workflows/WF-009.md", catalogTag: "v4.2.0" },
      dependsOn: ["AGENT-BUSINESS-ANALYST"],
    },
    {
      // A resolvable route deliberately kept OUT of the manifest registry, so
      // that the honest `paramsChecked: false` path has a permanent subject.
      // It used to be played by whichever real workflow had no manifest yet
      // (WF-006 until this lot), which meant every manifest lot had to move the
      // test — and the tenth would have left it with no subject at all.
      id: "WF-UNMANIFESTED",
      type: "workflow",
      path: "workflows/WF-UNMANIFESTED.md",
      title: "Unmanifested",
      description: "Resolvable, intentionally absent from the manifest registry",
      catalogVersion: "v4.2.0",
      source: { file: "workflows/WF-UNMANIFESTED.md", catalogTag: "v4.2.0" },
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

const MANIFESTS = {
  "WF-001": WF001_MANIFEST,
  "WF-002": WF002_MANIFEST,
  "WF-003": WF003_MANIFEST,
  "WF-004": WF004_MANIFEST,
  "WF-005": WF005_MANIFEST,
  "WF-006": WF006_MANIFEST,
  "WF-007": WF007_MANIFEST,
  "WF-008": WF008_MANIFEST,
  "WF-009": WF009_MANIFEST,
} as const;

/** Any coverage-matrix brief, by id — one source of truth for the fixtures. */
function fixtureBrief(id: string): NeedBrief {
  const fixture = DISPATCH_FIXTURES.find((f) => f.id === id);
  if (fixture?.brief === undefined) throw new Error(`${id} fixture carries no brief`);
  return { ...fixture.brief, constraints: [...fixture.brief.constraints] };
}

/**
 * The P02 coverage-matrix brief, reused rather than re-invented: it is
 * qualified for ROUTING, which is a weaker bar than filling the ART card — the
 * dry-run finding that every routed prompt still has a param gap.
 */
function p02Brief(): NeedBrief {
  return fixtureBrief("P02");
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
    const res = validateRoute(
      proposal("WF-UNMANIFESTED"),
      p01AmendedBrief(),
      FAKE_SIDECAR,
      MANIFESTS,
    );
    expect(res).toMatchObject({
      status: "ROUTED",
      route: "WF-UNMANIFESTED",
      paramsChecked: false,
    });
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

describe("WF-003 manifest — an enum-rich technical card", () => {
  it("names the P03 gap, and diverges from the dry-run oracle in two places", () => {
    const res = validateRoute(proposal("WF-003"), fixtureBrief("P03"), FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    // Dry-run §2 row P03 predicts six must-ask parameters and this finds six,
    // but not the same six. `Cloud provider` is stated in the constraint list
    // ("existing Azure tenancy") which the oracle did not read; `Target LLM` is
    // the client application's model — a card field to fill before starting,
    // not the operator-profile default the oracle took it for.
    expect(res.missingParams.sort()).toEqual([
      "Database",
      "GDPR constraints (personal data)",
      "Monthly API budget",
      "Target LLM",
      "Target SLA",
      "Tech stack",
    ]);
  });

  it("names the missing HALF of the GDPR line, not the whole line", () => {
    // P03 states "EU data location" and nothing about personal data. Reporting
    // "GDPR constraints" whole would tell an operator who already answered half
    // of it to supply something they can see in their own brief.
    const res = validateRoute(proposal("WF-003"), fixtureBrief("P03"), FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams).toContain("GDPR constraints (personal data)");
    expect(res.missingParams).not.toContain("GDPR constraints (data location)");
  });

  it("accepts a negative answer on the personal-data half — stating NO is stating it", () => {
    const b = fixtureBrief("P03");
    b.context += " No personal data is processed by the corpus.";
    const res = validateRoute(proposal("WF-003"), b, FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams).not.toContain("GDPR constraints (personal data)");
  });

  it("routes the amended P03 brief with paramsChecked=true (the return loop closes)", () => {
    const b = fixtureBrief("P03");
    b.context +=
      " Target LLM is Claude Sonnet 5 on a Python FastAPI stack with Qdrant as the" +
      " vector database; personal data is involved and must stay in the EU; the" +
      " monthly LLM budget is €800 and the target SLA is 99.5% with under 2s latency.";
    const res = validateRoute(proposal("WF-003"), b, FAKE_SIDECAR, MANIFESTS);
    expect(res).toMatchObject({ status: "ROUTED", route: "WF-003", paramsChecked: true });
  });
});

describe("WF-004 manifest — a commercial card, where prose imitates card vocabulary", () => {
  it("routes the P04 fixture with paramsChecked=true, and diverges from the oracle in three places", () => {
    // Dry-run §2 row P04 names three must-ask parameters — Engagement duration,
    // Stakeholders, Priority stakes — and this reports none of them missing.
    // Documented divergence class, not an error on either side: §2 was computed
    // against the coverage-matrix SKETCH, while the qualified fixture states the
    // window ("three-month engagement window"), the sponsor ("CDO sponsor") and
    // two stakes ("upskilling" in the need, "GDPR" in the constraints).
    const res = validateRoute(proposal("WF-004"), fixtureBrief("P04"), FAKE_SIDECAR, MANIFESTS);
    expect(res).toMatchObject({ status: "ROUTED", route: "WF-004", paramsChecked: true });
  });

  it("names the gap when the brief is thinned back to the sketch, in card labels", () => {
    // The sketch-level brief: the engagement and the client are stated, the
    // engagement's own context is not. This is the return loop the operator
    // actually sees.
    //
    // Written expecting `Stakeholders` to be missing too; the check disagreed
    // and was right — the fixture's constraint list says "executive readout
    // expected", which names an audience, so the card line is answered. Recorded
    // here rather than narrowed away: the reminder that commercial facts live in
    // `constraints` as readily as in the prose cuts both ways.
    const b = fixtureBrief("P04");
    b.context = "Food-industry mid-cap client.";
    const res = validateRoute(proposal("WF-004"), b, FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams.sort()).toEqual(["Client AI maturity", "Engagement duration"]);
  });

  it("names the missing HALF of the Client line, not the whole line", () => {
    // `Client [Name / Sector / Size]` is a conjunction: an operator who has
    // already named the client must be asked for the size, not for "Client".
    const b = fixtureBrief("P04");
    b.context = "Beginner AI maturity, CDO sponsor, three-month engagement window.";
    const res = validateRoute(proposal("WF-004"), b, FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams.sort()).toEqual(["Client (sector)", "Client (size)"]);
    expect(res.missingParams).not.toContain("Client (name)");
  });

  it("does not accept a WF-001 product-scoping brief as a filled engagement card", () => {
    // Cross-vocabulary guard. THREE specs now fill, and the assertion records
    // it rather than hiding it behind a narrower regex: the P01 brief states an
    // insurer (sector), GDPR (a compliance stake) and — since 2026-07-30 — the
    // client's name. All three are true statements of the card's own questions;
    // `Priority stakes` is the least discriminating spec of this manifest and
    // is documented as such.
    //
    // `Client (name)` moved out of this list when the policy-consistency table
    // showed the `from` introducer present in the WF-006 sibling and absent
    // here, with no basis on either card. The brief opens on "Client brief
    // received FROM Nordwind Insurance", so the name was there all along and
    // this detector was failing to read it. Unlike the `CAC 40` correction of
    // the same lot, this one is NOT a no-op: it fills on three foreign briefs
    // and moved the cross-vocabulary matrix from 35 cells to 38, inside the
    // class that matrix already records — every brief names a company.
    const res = validateRoute(proposal("WF-004"), p01AmendedBrief(), FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams).not.toContain("Client (name)");
    expect(res.missingParams.sort()).toEqual([
      "Client (size)",
      "Client AI maturity",
      "Engagement duration",
      "Engagement scope",
      "Expected deliverables",
      "Stakeholders",
    ]);
  });

  it("falsifies the tightened scope detector: 'decision support' is not a Support engagement", () => {
    const b = fixtureBrief("P04");
    b.need =
      "Engagement signed with Marlowe Foods to give their managers decision support" +
      " on their operations, and we support the team through the change.";
    b.expectedDeliverable = "A report for the executive committee";
    const res = validateRoute(proposal("WF-004"), b, FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams).toContain("Engagement scope");
  });

  it("falsifies the tightened maturity detector: an 'advanced RAG pipeline' is not a maturity level", () => {
    const b = fixtureBrief("P04");
    b.context =
      "Food-industry mid-cap running an advanced RAG pipeline in production," +
      " CDO sponsor, three-month engagement window.";
    const res = validateRoute(proposal("WF-004"), b, FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams).toEqual(["Client AI maturity"]);
  });

  it("accepts 'advanced' when it does qualify the maturity, not the technology", () => {
    const b = fixtureBrief("P04");
    b.context =
      "Food-industry mid-cap, advanced AI maturity, CDO sponsor, three-month" +
      " engagement window.";
    const res = validateRoute(proposal("WF-004"), b, FAKE_SIDECAR, MANIFESTS);
    expect(res).toMatchObject({ status: "ROUTED", route: "WF-004", paramsChecked: true });
  });

  it("reads the client name in either word order, as the card asks for an identifier", () => {
    // The WF-002 `ART name` lesson applied before it bites: the fixture's form
    // is "signed with Marlowe Foods", and this records what the apposition form
    // does. It is NOT read as a name — the documented weakness of this detector,
    // whose failure direction is the safe one.
    const b = fixtureBrief("P04");
    b.need =
      "Marlowe Foods, a food-industry mid-cap, signed the engagement for an AI" +
      " maturity audit and a transformation roadmap including upskilling.";
    const res = validateRoute(proposal("WF-004"), b, FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams).toEqual(["Client (name)"]);
  });
});

/** P05 after the operator answered the three gaps the card check names. */
function p05AmendedBrief(): NeedBrief {
  const b = fixtureBrief("P05");
  b.context +=
    " The intelligence runs on a 12-month horizon, prioritizing arXiv, GitHub" +
    " releases and trade press, with positioning on large accounts as the" +
    " growth focus.";
  return b;
}

describe("cross-vocabulary probe findings — the four detectors it caught", () => {
  // Each of these filled a card line from prose written for ANOTHER workflow,
  // and none was visible to the neutral-prose probe: the words were present, not
  // absent. Found 2026-07-29 by `dispatch-cross-vocabulary-probe`, and each case
  // below is the exact foreign text that filled it.

  it("WF-003: a quarter label is not a monthly budget", () => {
    // "pilot budget capped for Q3" matched `budget … digit` on the 3 of "Q3".
    const res = validateRoute(proposal("WF-003"), p01AmendedBrief(), FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams).toContain("Monthly API budget");
  });

  it("WF-003: a bare amount is not a MONTHLY budget either", () => {
    // Beyond the proven defect, and deliberately so: the card asks for a monthly
    // budget, so a total states something else. Same policy as `Horizon`.
    const b = fixtureBrief("P03");
    b.context += " A total project budget of €45k is approved.";
    const res = validateRoute(proposal("WF-003"), b, FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams).toContain("Monthly API budget");
  });

  it("WF-004: a NEGATED audit does not state an engagement scope", () => {
    // P14 is a legal-drafting brief; its only "audit" is "not an audit of an AI
    // system". Reading a denial as a statement inverts the check's semantics.
    const res = validateRoute(proposal("WF-004"), fixtureBrief("P14"), FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams).toContain("Engagement scope");
  });

  it("WF-004: model-training infrastructure is not a training engagement", () => {
    // P16 wants to pretrain an LLM: "research-grade training infrastructure".
    const res = validateRoute(proposal("WF-004"), fixtureBrief("P16"), FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams).toContain("Engagement scope");
  });

  it("WF-004: a sprint, a response deadline, a project length and a phase milestone are not engagement durations", () => {
    // The three foreign briefs the bare quantity+unit detector filled on. WF-005
    // `Horizon` refused exactly this; the two manifests disagreeing was the find.
    //
    // P12 JOINED THEM 2026-07-31, and it is the most instructive of the four
    // because it is this workflow's OWN brief. It states no engagement duration
    // anywhere — "Contract signed yesterday", "advisory engagement signed" — and
    // its only quantity is the constraint "phase-one deadline in six weeks", a
    // delivery milestone. It kept filling through the `phase` anchor long after
    // the bare quantity was removed, and the WF-006 test below already ruled
    // that this exact string is a milestone rather than a deadline. One card
    // answered no and this one answered yes, on the same words, both green.
    for (const id of ["P02", "P06", "P10", "P12"]) {
      const res = validateRoute(proposal("WF-004"), fixtureBrief(id), FAKE_SIDECAR, MANIFESTS);
      expect(res.status, `${id} must not fill the whole card`).toBe("PARAMS_MISSING");
      if (res.status !== "PARAMS_MISSING") continue;
      expect(res.missingParams, `${id} duration`).toContain("Engagement duration");
    }
  });

  it("still reads the engagement's OWN duration, in either word order", () => {
    // Guard against over-tightening: the anchored detector must keep answering
    // the card whenever a brief genuinely states an engagement window.
    //
    // P04 carries the quantity-first order ("a three-month engagement window").
    // P12 used to supply the anchor-first order and no longer does — it never
    // stated a duration at all, only a phase milestone (see the test above), so
    // the reverse order is exercised by an AMENDED brief instead of by a fixture
    // that was answering for the wrong reason. Losing the coverage silently
    // would have been the worse outcome of that correction.
    const res = validateRoute(proposal("WF-004"), fixtureBrief("P04"), FAKE_SIDECAR, MANIFESTS);
    const missing = res.status === "PARAMS_MISSING" ? res.missingParams : [];
    expect(missing, "P04 duration must be filled").not.toContain("Engagement duration");

    const reversed = fixtureBrief("P12");
    reversed.context += " The engagement runs for three months.";
    const rev = validateRoute(proposal("WF-004"), reversed, FAKE_SIDECAR, MANIFESTS);
    const revMissing = rev.status === "PARAMS_MISSING" ? rev.missingParams : [];
    expect(revMissing, "anchor-first order must fill").not.toContain("Engagement duration");
  });
});

describe("WF-005 manifest — where one card's own tokens compete across three of its lines", () => {
  it("names the three gaps of the P05 fixture, in card labels", () => {
    // The gap the operator actually sees. Note what does NOT appear:
    // `Sources to prioritize` is missing although the brief says "LinkedIn"
    // twice — the card lists LinkedIn as a source, but the token is refused
    // there precisely so that an AUDIENCE statement cannot answer a SOURCES
    // question. Under-detecting is the safe direction.
    const res = validateRoute(proposal("WF-005"), fixtureBrief("P05"), FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams.sort()).toEqual([
      "Horizon",
      "Opportunity focus",
      "Sources to prioritize",
    ]);
  });

  it("routes the amended P05 brief with paramsChecked=true", () => {
    const res = validateRoute(proposal("WF-005"), p05AmendedBrief(), FAKE_SIDECAR, MANIFESTS);
    expect(res).toMatchObject({ status: "ROUTED", route: "WF-005", paramsChecked: true });
  });

  it("accepts the operator's OWN attested phrasing of six of the seven card lines", () => {
    // Positive control whose source is INDEPENDENT of this manifest: the seven
    // values of the WF-005 live-harness seed (`wf-005-run-live.test.ts`, written
    // 2026-07-13 for the spine and live-proven by the `completed` Opus run),
    // flattened into prose. It is the only check here whose text was not written
    // against these detectors — the reason it exists is that controls written
    // from a regex prove only that the regex is non-empty.
    //
    // Six of seven fill. `Horizon` does not, and that is the seed's shape rather
    // than a defect: it says `horizon: "3 months"`, where the label lives in the
    // FIELD NAME. A brief carries no field names, and accepting a bare quantity
    // was measured to fill on P04's "three-month engagement window" and P10's
    // "10-month project" — a duration and a project length.
    const seedAsBrief: NeedBrief = {
      need: "Weekly flash + 2-3 LinkedIn posts on generative AI / LLM and AI agents: model releases, agentic runtimes, evaluation frameworks, and the AI-consulting job market.",
      domain: "Management & Consulting",
      expectedDeliverable: "Weekly synthesis and ready-to-publish LinkedIn posts",
      constraints: ["ArXiv, GitHub trending, vendor engineering blogs, trade press"],
      context:
        "Public LinkedIn (AI product leaders and practitioners), thought leader and plain-language expert tone, over 3 months. Positioning and freelance AI-consulting engagements.",
      submittedBy: "Managing Partner",
    };
    const res = validateRoute(proposal("WF-005"), seedAsBrief, FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams).toEqual(["Horizon"]);
  });

  it("reads the horizon in the card's OWN word order, value last", () => {
    // Regression on a defect of the first draft: STEP-01's input line reads
    // "Focus horizon: [short / medium / long term]" — the horizon word BEFORE a
    // qualitative value — and the detector rejected it.
    const b = p05AmendedBrief();
    b.context = b.context.replace("on a 12-month horizon", "on a focus horizon of medium term");
    const res = validateRoute(proposal("WF-005"), b, FAKE_SIDECAR, MANIFESTS);
    expect(res).toMatchObject({ status: "ROUTED", route: "WF-005", paramsChecked: true });
  });

  it("refuses a bare quantity as a horizon, which is what an engagement duration looks like", () => {
    const b = p05AmendedBrief();
    b.context = b.context.replace("on a 12-month horizon", "over 12 months");
    const res = validateRoute(proposal("WF-005"), b, FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams).toEqual(["Horizon"]);
  });

  it("does not read a statement of ABSENT sources as filled", () => {
    // Regression on the second defect of the first draft: "no monitored sources
    // yet" satisfied the sources line — a false "filled" on a statement of
    // absence, the class a decision check must reject rather than merely detect.
    const b = p05AmendedBrief();
    b.context = b.context.replace(
      "prioritizing arXiv, GitHub releases and trade press",
      "with no monitored sources yet",
    );
    const res = validateRoute(proposal("WF-005"), b, FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams).toEqual(["Sources to prioritize"]);
  });

  it("leaves all seven missing on AI-rich prose that says nothing about intelligence", () => {
    // The generic discrimination probe feeds prose with NO card vocabulary at
    // all, so it cannot see a spec that keys on plain AI vocabulary — and this
    // manifest's widest spec is exactly that risk. Measured: widening
    // `Intelligence scope` to a bare `\bAI\b` left the whole suite green until
    // this case existed. The P01 product-scoping brief is dense with AI
    // vocabulary and states not one WF-005 parameter.
    const res = validateRoute(proposal("WF-005"), p01AmendedBrief(), FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams).toHaveLength(7);
    expect(res.missingParams).toContain("Intelligence scope");
  });

  it("does not accept a WF-008 compliance brief as a filled intelligence card", () => {
    // Cross-vocabulary guard, and it records the one fill instead of narrowing
    // it away: P08's context mentions an "external LLM", which IS a statement of
    // the card's own `AI/LLM` scope item. `Intelligence scope` is the least
    // discriminating spec of this manifest and is documented as such — while
    // `AI Act`, this brief's actual subject, is refused because its watch
    // framing is absent.
    const res = validateRoute(proposal("WF-005"), fixtureBrief("P08"), FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams.sort()).toEqual([
      "Audience",
      "Horizon",
      "Opportunity focus",
      "Sources to prioritize",
      "Target format",
      "Tone",
    ]);
  });
});

/** P06 after the operator answered the nine gaps the card check names. */
function p06AmendedBrief(): NeedBrief {
  const b = fixtureBrief("P06");
  b.context +=
    " The prospect is a mid-cap whose AI maturity is beginner; they want a scoping" +
    " mission with a budget envelope around 250k€, three other firms bidding, award" +
    " criteria weighting price and expertise, a sovereign cloud constraint, an oral" +
    " presentation of the proposal, and known risks include aggressive competition.";
  return b;
}

describe("WF-006 manifest — the first with TWO home briefs, and the first to use a sanctioned unknown", () => {
  it("names the nine gaps of the P06 fixture, in card labels", () => {
    // What does NOT appear is the point of this list: `Decision-makers`. The
    // brief says "procurement-led process", which names one of the card's four
    // enumerated deciders using decision vocabulary. Dry-run §2 classes it
    // must-ask on P06 — the requalification its own annotation describes: §2
    // was computed on the raw sketch, which does not carry that phrase, and
    // this check runs on the qualified fixture, which does. It is the ONLY cell
    // where the two disagree across both WF-006 briefs.
    const res = validateRoute(proposal("WF-006"), fixtureBrief("P06"), FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams.sort()).toEqual([
      "Competition",
      "Constraints",
      "Indicative budget",
      "Known risks",
      "Proposal format",
      "Prospect (AI maturity)",
      "Prospect (size)",
      "Requested scope",
      "Selection criteria",
    ]);
  });

  it("names the ten gaps of P11 and agrees with dry-run §2 on all five of its must-ask lines", () => {
    // WF-006 is the only workflow with two coverage-matrix briefs, so it gets a
    // second independent measurement that the other five manifests never had.
    // P11 also exercises the apposition that WF-004 `client_name` documents as
    // an accepted miss ("Prospect Kestrel Mutual"): here the card's own field
    // label licenses `Prospect` as an introducer, so the name IS read.
    const res = validateRoute(proposal("WF-006"), fixtureBrief("P11"), FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams).toHaveLength(10);
    expect(res.missingParams).not.toContain("Prospect (name)");
    // The five §2 names them for P11: Response deadline, Competition,
    // Decision-makers, Selection criteria, Constraints. Full agreement.
    for (const card of [
      "Response deadline",
      "Competition",
      "Decision-makers",
      "Selection criteria",
      "Constraints",
    ]) {
      expect(res.missingParams).toContain(card);
    }
  });

  it("routes the amended P06 brief with paramsChecked=true", () => {
    const res = validateRoute(proposal("WF-006"), p06AmendedBrief(), FAKE_SIDECAR, MANIFESTS);
    expect(res).toMatchObject({ status: "ROUTED", route: "WF-006", paramsChecked: true });
  });

  it("accepts the card's own honest unknown on the budget line", () => {
    // First real exercise of `sanctionedUnknown` in this codebase: the field was
    // wired into `validate-route.ts` when the field-class policy was settled and
    // no manifest had used it. The card reads `[Estimated range / Not
    // disclosed]`, so a stated non-disclosure is a filled line, NOT one of the
    // negative sentinels intake refuses.
    const b = p06AmendedBrief();
    b.context = b.context.replace("a budget envelope around 250k€", "a budget not disclosed");
    const res = validateRoute(proposal("WF-006"), b, FAKE_SIDECAR, MANIFESTS);
    expect(res).toMatchObject({ status: "ROUTED", route: "WF-006", paramsChecked: true });
  });

  it("refuses a budget word carrying no amount", () => {
    // Two measured hazards in one assertion. The discrimination probe's brief
    // states "the budget is fixed", so a bare token turns it red; and a digit is
    // not an amount — WF-003's `Monthly API budget` filled on "capped for Q3",
    // reading a quarter label as a figure.
    const b = p06AmendedBrief();
    b.context = b.context.replace("a budget envelope around 250k€", "a budget capped for Q3");
    const res = validateRoute(proposal("WF-006"), b, FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams).toEqual(["Indicative budget"]);
  });

  it("does not read a bare departmental mention as identifying the decision-makers", () => {
    // The admission split this manifest applies: TITLES count bare, FUNCTIONS
    // only next to decision vocabulary. "procurement-led" fills; a procurement
    // portal is a system, not a decider. Removing the adjacency requirement
    // makes this case fill and is what this test exists to catch.
    const b = fixtureBrief("P06");
    b.context = b.context.replace("procurement-led process", "a procurement portal");
    const res = validateRoute(proposal("WF-006"), b, FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams).toContain("Decision-makers");
  });

  it("reads 'sole source' as a FILLED competition line, not as an absent one", () => {
    // The inverse of the WF-005 sources guard, and the difference is what each
    // card asks. WF-005 asks WHICH sources, so "no monitored sources" is a false
    // "filled". This card asks WHETHER there is competition, so an absence of
    // competitors is the answer.
    const b = p06AmendedBrief();
    b.context = b.context.replace("three other firms bidding", "a sole source situation");
    const res = validateRoute(proposal("WF-006"), b, FAKE_SIDECAR, MANIFESTS);
    expect(res).toMatchObject({ status: "ROUTED", route: "WF-006", paramsChecked: true });
  });

  it("refuses the bare token 'competition' as a request type", () => {
    // The card lists `Competition` as a Request-type value AND as the label of
    // another line. Counting it bare would make the two specs non-independent —
    // the WF-005 `LinkedIn` policy. Only the process forms count.
    //
    // Isolating the token took a correction: a first version of this case left
    // P11's context intact, which says "first contact through REFERRAL" — a
    // legitimate Request-type value of the same card. The line filled, the test
    // went red, and it had never been measuring `competition` at all. A probe
    // whose subject is masked by another branch of the same detector proves
    // nothing about the branch it names.
    //
    // What remains under test, besides the collision: the negation guard. The
    // constraint below opens on "no RFP document", and the RFP branch must not
    // read a DENIAL that an RFP exists as a stated request type.
    const b = fixtureBrief("P11");
    b.constraints = ["no RFP document, a competition against other firms"];
    b.context = b.context.replace("first contact through referral, ", "");
    const res = validateRoute(proposal("WF-006"), b, FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams).toContain("Request type");
  });

  it("does not read a delivery milestone of a SIGNED engagement as a response deadline", () => {
    // Measured on the nineteen coverage-matrix briefs before this test existed:
    // a first draft accepting `deadline` + a bare quantity filled on P12's
    // "phase-one deadline in six weeks", inside an already-signed engagement.
    // That is the anchorless quantity WF-005 `Horizon` refused and the
    // cross-vocabulary probe removed from WF-004 `engagement_duration`.
    const res = validateRoute(proposal("WF-006"), fixtureBrief("P12"), FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams).toContain("Response deadline");
  });

  it("does not read a regulatory context as a hosting constraint", () => {
    // P06 states a "banking regulatory context" and this line stays missing.
    // The card's Constraints enumeration is hosting (On-premise / Sovereign
    // cloud / SecNumCloud / HDS), which is why this spec takes no
    // `defaultValue` although WF-001/002/004 do on their own generic line:
    // intake guarantees A constraint, never an infrastructure one.
    const res = validateRoute(proposal("WF-006"), fixtureBrief("P06"), FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams).toContain("Constraints");
  });

  it("refuses a bare 'written' deliverable as a stated proposal format", () => {
    // This is the only spec here reading `expectedDeliverable`, and the
    // discrimination probe's is "A written document the stakeholder can act
    // on". Only `written Q&A` counts; a bare `proposal` is refused too, since
    // P11's deliverable names WHAT is produced, not the format it arrives in.
    const b = p06AmendedBrief();
    b.context = b.context.replace("an oral presentation of the proposal", "a written summary");
    b.expectedDeliverable = "A written commercial proposal document";
    const res = validateRoute(proposal("WF-006"), b, FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams).toEqual(["Proposal format"]);
  });
});

describe("WF-007 manifest — a self-brief, where the card's own values are ordinary English", () => {
  it("names the four gaps of the P07 fixture, in card labels", () => {
    const res = validateRoute(proposal("WF-007"), fixtureBrief("P07"), FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams.sort()).toEqual([
      "Client (size)",
      "Engagement type",
      "Identified stakes",
      "Sensitivities",
    ]);
  });

  it("routes the amended P07 brief with paramsChecked=true", () => {
    const brief = fixtureBrief("P07");
    brief.context +=
      " Mid-cap retailer, scoping engagement, business and organizational stakes," +
      " no particular sensitivities reported.";
    const res = validateRoute(proposal("WF-007"), brief, FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("ROUTED");
    if (res.status !== "ROUTED") return;
    expect(res.paramsChecked).toBe(true);
  });

  it("does not read a client SIZE as an engagement duration", () => {
    // The first-draft defect of this manifest, found by measuring it before any
    // test existed. The reverse branch accepted the whole engagement vocabulary,
    // so the fixture filled on "engagement, sponsors identified, medium" — the
    // class word tied to an `engagement` sitting in an unrelated clause. Proven
    // rather than suspected: the same detector filled identically on a brief
    // stating a size and no duration whatsoever.
    const brief = fixtureBrief("P07");
    brief.context = "Retail group, hybrid on-site engagement, sponsors identified, medium-sized client.";
    const res = validateRoute(proposal("WF-007"), brief, FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams).toContain("Engagement duration");
  });

  it("still reads the card's own phrasing, which puts the label before the value", () => {
    // Guard against over-tightening the fix above: the card writes
    // "Engagement duration : [Short / Medium / Long]", so the anchor-first order
    // is the operator's most likely phrasing and must keep filling.
    const brief = fixtureBrief("P07");
    brief.context = "Retail group, hybrid on-site. Engagement duration: medium. Sponsors identified.";
    const res = validateRoute(proposal("WF-007"), brief, FAKE_SIDECAR, MANIFESTS);
    const missing = res.status === "PARAMS_MISSING" ? res.missingParams : [];
    expect(missing).not.toContain("Engagement duration");
  });

  it("does not let the brief's DOMAIN state the engagement type", () => {
    // `Consulting` is a value of this card's enumeration AND the second half of
    // this fixture's domain, "Management & Consulting". A mapping that read
    // `domain` would fill this line for every brief of the domain without the
    // operator ever stating what kind of engagement was sold.
    //
    // THE DOMAIN IS DELIBERATELY QUALIFIED HERE, and the first version of this
    // test was worthless without it: the detector never accepts a bare
    // "Consulting", so asserting on the fixture's own domain left the test green
    // whether `domain` was mapped or not. Falsification caught it — mapping
    // `domain` in reproduced no red here, only a snapshot move. The text below
    // WOULD fill the line, so the assertion now measures its subject.
    const brief = { ...fixtureBrief("P07"), domain: "Management & Consulting engagement" };
    const res = validateRoute(proposal("WF-007"), brief, FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams).toContain("Engagement type");
  });

  it("does not let a DELIVERABLE named scoping state the engagement type", () => {
    // P07 expects "Kickoff plan, D1 kit and D5 scoping deliverables". "Scoping"
    // is a value of the card's type enumeration, but here it names an output of
    // this very workflow, not the engagement that was bought.
    const brief = fixtureBrief("P07");
    expect(brief.expectedDeliverable).toContain("scoping");
    const res = validateRoute(proposal("WF-007"), brief, FAKE_SIDECAR, MANIFESTS);
    const missing = res.status === "PARAMS_MISSING" ? res.missingParams : [];
    expect(missing).toContain("Engagement type");
  });

  it("reads the plural `sponsors`, which its WF-004 sibling used to miss", () => {
    // The fixture says "sponsors identified". WF-004 carried `\bsponsor\b` with
    // no optional plural while its immediate neighbours had one — an oversight,
    // corrected in the same lot. This locks the reading on both sides.
    const res = validateRoute(proposal("WF-007"), fixtureBrief("P07"), FAKE_SIDECAR, MANIFESTS);
    const missing = res.status === "PARAMS_MISSING" ? res.missingParams : [];
    expect(missing, "WF-007 must read the plural").not.toContain("D1 stakeholders");

    const four = validateRoute(proposal("WF-004"), fixtureBrief("P07"), FAKE_SIDECAR, MANIFESTS);
    const fourMissing = four.status === "PARAMS_MISSING" ? four.missingParams : [];
    expect(fourMissing, "WF-004 must read it too").not.toContain("Stakeholders");
  });

  it("does not read a bare `team` as identifying the D1 stakeholders", () => {
    // The card lists Team among its values, and `team` is the most common noun
    // in this corpus — counting it bare would leave this spec discriminating
    // nothing. Same call as WF-005 refusing a bare `LinkedIn` and WF-006
    // refusing a bare `competition`.
    const brief = fixtureBrief("P07");
    brief.context = "Retail group, hybrid on-site engagement, the team is in place, medium duration.";
    const res = validateRoute(proposal("WF-007"), brief, FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams).toContain("D1 stakeholders");
  });

  it("accepts an EXPLICIT absence of sensitivities, but not silence", () => {
    // The WF-006 `Competition` treatment rather than the WF-005
    // `Sources to prioritize` refusal, and the cards are what separate them:
    // STEP-03 here runs perfectly well on a declared absence, whereas WF-005's
    // STEP-01 cannot run on "no sources". Leaving the operator in a return loop
    // they cannot exit would be the defect.
    const silent = validateRoute(proposal("WF-007"), fixtureBrief("P07"), FAKE_SIDECAR, MANIFESTS);
    const silentMissing = silent.status === "PARAMS_MISSING" ? silent.missingParams : [];
    expect(silentMissing, "silence is not an answer").toContain("Sensitivities");

    const declared = fixtureBrief("P07");
    declared.context += " No particular sensitivities reported.";
    const res = validateRoute(proposal("WF-007"), declared, FAKE_SIDECAR, MANIFESTS);
    const missing = res.status === "PARAMS_MISSING" ? res.missingParams : [];
    expect(missing, "an explicit absence IS an answer").not.toContain("Sensitivities");
  });

  it("reads D1 access from the CONSTRAINT list, where the operator actually puts it", () => {
    // The fixture states it as a constraint ("badge and VPN access to validate
    // before D1") and nowhere in the prose. A detector reading only need+context
    // would report a gap the operator has already filled.
    const brief = fixtureBrief("P07");
    expect(brief.constraints.join(" ")).toContain("badge");
    const withNoConstraint = { ...brief, constraints: ["deliverables reviewed weekly"] };
    const res = validateRoute(proposal("WF-007"), withNoConstraint, FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams).toContain("D1 access");
  });

  it("treats `to validate` as a deferred VALIDATION, not as a sanctioned unknown", () => {
    // §1 of the dry-run lists this card's honest unknown as D1 access
    // "to validate". This manifest diverges: the accesses are enumerated ON the
    // card, and what the annotation defers is checking them, not stating them.
    // So a brief that names no access at all is a gap, however openly it says
    // the point is pending.
    const brief = fixtureBrief("P07");
    const res = validateRoute(
      proposal("WF-007"),
      { ...brief, constraints: ["D1 accesses to be confirmed later"] },
      FAKE_SIDECAR,
      MANIFESTS,
    );
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams).toContain("D1 access");
  });

  it("does not read a bare adjective as an identified stake", () => {
    // Business / Technical / Organizational / Political qualify almost anything,
    // so the stake vocabulary must sit beside them.
    const bare = fixtureBrief("P07");
    bare.context += " The business unit is ready and the technical setup is done.";
    const res = validateRoute(proposal("WF-007"), bare, FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams).toContain("Identified stakes");

    const stated = fixtureBrief("P07");
    stated.context += " The stakes are organizational and political.";
    const ok = validateRoute(proposal("WF-007"), stated, FAKE_SIDECAR, MANIFESTS);
    const missing = ok.status === "PARAMS_MISSING" ? ok.missingParams : [];
    expect(missing).not.toContain("Identified stakes");
  });
});

describe("WF-008 manifest — the largest card, four conjunctions and two home briefs", () => {
  const AMENDMENT =
    " Engagement with Meridian Health, a mid-cap operating in 6 countries." +
    " The system is called Triadex; this is a preventive audit ahead of the AI Act," +
    " high-risk tier suspected, covering 120000 patients and 40 GB of training data," +
    " with a compliance deadline in six months.";

  it("names the nine gaps of the P08 fixture, in card labels", () => {
    const res = validateRoute(proposal("WF-008"), fixtureBrief("P08"), FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams.sort()).toEqual([
      "AI system audited (name)",
      "Audit origin",
      "Client (geographic footprint)",
      "Client (name)",
      "Client (size)",
      "Compliance deadline",
      "Suspected AI Act tier",
      "Volumes (individuals concerned)",
      "Volumes (training data)",
    ]);
  });

  it("names the nine gaps of P20, and the ONE fact the two briefs disagree on", () => {
    // The second home brief is what makes `Data processed (sensitive)` and
    // `Data processed (Art. 9 categories)` provably distinct specifications
    // rather than one fact written twice: P08 says "health data (GDPR art. 9)"
    // and fills both, P20 says only "health data involved" and fills the
    // category while leaving the sensitivity statement missing. Conversely P20
    // names its client where P08 buries it in a genitive.
    const res = validateRoute(proposal("WF-008"), fixtureBrief("P20"), FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams).toContain("Data processed (sensitive)");
    expect(res.missingParams).not.toContain("Data processed (Art. 9 categories)");
    expect(res.missingParams).not.toContain("Client (name)");
  });

  it("routes the amended P08 brief with paramsChecked=true", () => {
    const brief = fixtureBrief("P08");
    brief.context += AMENDMENT;
    const res = validateRoute(proposal("WF-008"), brief, FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("ROUTED");
    if (res.status !== "ROUTED") return;
    expect(res.paramsChecked).toBe(true);
  });

  it("does not read an OFFICE MOVE as a geographic footprint", () => {
    // Measured on the nineteen briefs before this test existed: the first draft
    // accepted a bare `in` after the footprint noun and filled on the NO_MATCH
    // office-move brief through "office move of the Lyon site in". A building is
    // not a footprint.
    const brief = fixtureBrief("P08");
    brief.context += " We are also handling the office move of the Lyon site in June.";
    const res = validateRoute(proposal("WF-008"), brief, FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams).toContain("Client (geographic footprint)");
  });

  it("does not let DATA geography answer the client's corporate footprint", () => {
    // The independence guard between the two specifications. Both fixtures state
    // where the DATA is processed and neither states where the COMPANY operates;
    // if this line read the data-flow vocabulary the split would be decorative.
    const res = validateRoute(proposal("WF-008"), fixtureBrief("P08"), FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams, "footprint is not answered by 'EU only'").toContain(
      "Client (geographic footprint)",
    );
    expect(res.missingParams, "but Geography IS answered by it").not.toContain("Geography");
  });

  it("does not read a CONSULTING diagnostic as an audited system's use case", () => {
    // First draft filled on the WF-004 brief through "AI maturity diagnostic",
    // a consulting deliverable rather than what a system does.
    const brief = fixtureBrief("P08");
    brief.need = "They ordered an AI maturity diagnostic; the vendor also runs an AI Act review.";
    brief.context = "Health provider, EU only, external LLM behind a proxy.";
    const res = validateRoute(proposal("WF-008"), brief, FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams).toContain("AI system audited (use case)");
  });

  it("does not read a PILOT BUDGET as a deployment status", () => {
    // First draft filled on the WF-001 brief through "pilot budget capped for
    // Q3" — a budget line, not a status.
    const brief = fixtureBrief("P08");
    brief.need = "They need an AI Act and GDPR compliance audit with a remediation plan.";
    brief.context = "Health provider, patient triage chatbot, EU only, external LLM behind a proxy.";
    brief.constraints = ["pilot budget capped for Q3", "health data (GDPR art. 9)"];
    const res = validateRoute(proposal("WF-008"), brief, FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams).toContain("AI system audited (status)");
  });

  it("does not read an RFP deadline or a phase milestone as a COMPLIANCE deadline", () => {
    // The FIFTH appearance of this policy in the repository, and the first draft
    // of this manifest failed it: the anchor list contained a bare `deadline`,
    // so it filled on the pre-sales brief's "deadline in three weeks" and on the
    // WF-004 brief's "deadline in six weeks" — the phase milestone removed from
    // WF-004 `engagement_duration` in this very lot.
    //
    // The third string exercises the OTHER word order, and it is here because
    // falsification found it missing: restoring the bare `deadline` on the
    // quantity-first branch survived the whole suite, so that branch was
    // measured by nothing while its mirror was.
    for (const text of [
      "response deadline in three weeks",
      "phase-one deadline in six weeks",
      "six weeks until the delivery deadline",
    ]) {
      const brief = fixtureBrief("P08");
      brief.constraints = [text, "health data (GDPR art. 9)"];
      const res = validateRoute(proposal("WF-008"), brief, FAKE_SIDECAR, MANIFESTS);
      expect(res.status, text).toBe("PARAMS_MISSING");
      if (res.status !== "PARAMS_MISSING") continue;
      expect(res.missingParams, text).toContain("Compliance deadline");
    }
  });

  it("treats SILENCE on the AI Act tier as a gap, and an explicit deferral as an answer", () => {
    // The card's "— to confirm in STEP-01" licenses an explicit deferral, never
    // the absence of any statement. Deliberately stricter than the dry-run
    // table, which counts this covered: an intake that does not ask a compliance
    // audit for its suspected tier is not doing its job.
    const silent = validateRoute(proposal("WF-008"), fixtureBrief("P08"), FAKE_SIDECAR, MANIFESTS);
    const silentMissing = silent.status === "PARAMS_MISSING" ? silent.missingParams : [];
    expect(silentMissing, "silence is a gap").toContain("Suspected AI Act tier");

    const deferred = fixtureBrief("P08");
    deferred.context += " AI Act tier to be confirmed during the audit.";
    const res = validateRoute(proposal("WF-008"), deferred, FAKE_SIDECAR, MANIFESTS);
    const missing = res.status === "PARAMS_MISSING" ? res.missingParams : [];
    expect(missing, "an explicit deferral is an answer").not.toContain("Suspected AI Act tier");
  });

  it("reads the card's OWN values, in the card's own words", () => {
    // Found by a re-verification pass that checked every value of every closed
    // enumeration against the detector claiming to read it — the direction the
    // fixtures cannot exercise, since a fixture is prose and a card is a form.
    // Two detectors refused their own card:
    //   - `Geography` required the article in "outside THE EU", so the card's
    //     third value, "Outside EU with EU impact", did not fill;
    //   - `Audit origin` read `Preventive` in both word orders but `Incident` in
    //     only one, so "Audit origin: Incident" and "the audit follows a
    //     production incident" were both refused — an asymmetry inside one
    //     specification with no basis on the card.
    // Same class as WF-005 `Horizon` rejecting the word order of its own line.
    // ⚠️ THE CONTEXT IS REPLACED, NOT APPENDED TO, and falsification is what
    // forced that: appending left P08's own "EU only" in place, so `Geography`
    // filled through another branch and the assertion held whether the fix was
    // present or not. A case whose subject is already answered elsewhere in the
    // brief measures nothing — the WF-006 `competition` lesson again.
    const BASE = "Health provider, patient triage chatbot live in production, external LLM behind a proxy.";
    for (const [text, label] of [
      ["Outside EU with EU impact.", "Geography"],
      ["Audit origin: Incident.", "Audit origin"],
      ["The audit follows a production incident.", "Audit origin"],
    ] as const) {
      const brief = fixtureBrief("P08");
      brief.context = `${BASE} ${text}`;
      const res = validateRoute(proposal("WF-008"), brief, FAKE_SIDECAR, MANIFESTS);
      const missing = res.status === "PARAMS_MISSING" ? res.missingParams : [];
      expect(missing, `${label} must read "${text}"`).not.toContain(label);
    }
  });

  it("lets Article 9 vocabulary answer `personal`, one way only", () => {
    // Special-category data IS personal data by definition, so the implication
    // runs from Art. 9 to personal and never back. Making the operator restate
    // "personal: yes" beside "health data" would be a redundant round trip.
    const brief = fixtureBrief("P08");
    brief.constraints = ["health data (GDPR art. 9)"];
    const res = validateRoute(proposal("WF-008"), brief, FAKE_SIDECAR, MANIFESTS);
    const missing = res.status === "PARAMS_MISSING" ? res.missingParams : [];
    expect(missing).not.toContain("Data processed (personal)");

    // The reverse does not hold: a plain personal-data statement names no
    // category and leaves the Article 9 line open.
    const plain = fixtureBrief("P08");
    plain.need = "They need an AI Act and GDPR compliance audit with a remediation plan.";
    plain.context = "Insurer, claimant triage chatbot live in production, EU only, external LLM.";
    plain.constraints = ["personal data of claimants is processed"];
    const res2 = validateRoute(proposal("WF-008"), plain, FAKE_SIDECAR, MANIFESTS);
    const missing2 = res2.status === "PARAMS_MISSING" ? res2.missingParams : [];
    expect(missing2).not.toContain("Data processed (personal)");
    expect(missing2).toContain("Data processed (Art. 9 categories)");
  });
});

describe("the card-taught `Label: value` form — a brief may answer by naming the parameter", () => {
  // The catalog's own quick-start blocks tell the operator to write
  // "- Engagement type: [to fill in]" and even inline the enumerations
  // ("- Audit origin: [Preventive / Inspection / Due diligence]"). Card values
  // are ordinary English — Scoping, Build, Training, Team, Neutral, Demo — so
  // every detector narrows them to a qualified form, which is right for PROSE
  // and wrong for the form the card teaches. Measured across the eight
  // manifests: 22 card values were refused when written the way the card writes
  // them, all 22 read once the label counts. The corpus invariance is NOT
  // re-asserted here: the eight per-manifest gap tests already pin every
  // fixture's PARAMS_MISSING set, and measuring showed zero of them moves.

  it("reads a bare card value when the brief names the parameter", () => {
    // `scoping` alone is refused on purpose — "D5 scoping deliverables" names an
    // output, not the engagement bought. The label removes the ambiguity.
    const bare = fixtureBrief("P07");
    bare.context = "Retail group, hybrid on-site engagement, medium duration, scoping.";
    const res = validateRoute(proposal("WF-007"), bare, FAKE_SIDECAR, MANIFESTS);
    const missing = res.status === "PARAMS_MISSING" ? res.missingParams : [];
    expect(missing, "a bare value stays refused in prose").toContain("Engagement type");

    const declared = fixtureBrief("P07");
    declared.context = "Retail group, hybrid on-site engagement, medium duration. Engagement type: Scoping.";
    const res2 = validateRoute(proposal("WF-007"), declared, FAKE_SIDECAR, MANIFESTS);
    const missing2 = res2.status === "PARAMS_MISSING" ? res2.missingParams : [];
    expect(missing2, "the card's own form is read").not.toContain("Engagement type");
  });

  it("refuses a declared label with an in-band refusal behind it", () => {
    // Declaring a parameter and answering "TBD" is not an answer. The existing
    // NEGATIVE_SENTINEL list is what says so, rather than a second one written
    // here.
    for (const value of ["TBD", "to be defined", "unknown", "n/a"]) {
      const brief = fixtureBrief("P07");
      brief.context = `Retail group, hybrid on-site engagement, medium duration. Engagement type: ${value}.`;
      const res = validateRoute(proposal("WF-007"), brief, FAKE_SIDECAR, MANIFESTS);
      const missing = res.status === "PARAMS_MISSING" ? res.missingParams : [];
      expect(missing, `"${value}" is not an answer`).toContain("Engagement type");
    }
  });

  it("does NOT let a conjunction's line label answer any of its halves", () => {
    // `Client (name)`, `(sector)` and `(size)` all sit on a line labelled
    // `Client`, and "Client: Acme Corp" says which company — not which sector or
    // which size. Accepting the line label would fill three facts from one, the
    // hollow pass that splitting conjunctions exists to prevent.
    const brief = fixtureBrief("P07");
    brief.need = "Engagement signed; the consultant starts Monday on site.";
    brief.context = "Client: Vantage Group. Hybrid on-site engagement, medium duration.";
    const res = validateRoute(proposal("WF-007"), brief, FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams).toContain("Client (sector)");
    expect(res.missingParams).toContain("Client (size)");
  });

  it("leaves the card-sanctioned unknown working, which the sentinel list would reject", () => {
    // "AI Act tier to be confirmed" is a NEGATIVE SENTINEL for the label rule and
    // a legitimate answer for the card. `sanctionedUnknown` is tested before the
    // label, so the card's licence wins where the card grants one — and only
    // there.
    const brief = fixtureBrief("P08");
    brief.context += " Suspected AI Act tier: to be confirmed during the audit.";
    const res = validateRoute(proposal("WF-008"), brief, FAKE_SIDECAR, MANIFESTS);
    const missing = res.status === "PARAMS_MISSING" ? res.missingParams : [];
    expect(missing).not.toContain("Suspected AI Act tier");
  });
});

describe("WF-009 manifest — one home brief, and an independent control that replaces the second", () => {
  it("names the five gaps of the P09 fixture, in card labels", () => {
    const res = validateRoute(proposal("WF-009"), fixtureBrief("P09"), FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams.sort()).toEqual([
      "Anti-fraud required",
      "Assessment methods",
      "Contract type",
      "Must-have skills",
      "Salary / day rate",
    ]);
  });

  it("routes the amended P09 brief with paramsChecked=true", () => {
    const brief = fixtureBrief("P09");
    brief.context +=
      " Permanent contract, must-have skills Python and Kubernetes, salary €70-85k," +
      " tech interview and reference checks, verify diplomas and LinkedIn.";
    const res = validateRoute(proposal("WF-009"), brief, FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("ROUTED");
    if (res.status !== "ROUTED") return;
    expect(res.paramsChecked).toBe(true);
  });

  it("THE INDEPENDENT CONTROL — the WF-009 live seed, flattened without its field labels", () => {
    // This lot has ONE home brief where WF-006 and WF-008 each had two, and it
    // was the second brief that PROVED two overlapping specs distinct. The
    // replacement is a source this manifest cannot have influenced: the seed of
    // the WF-009 live harness, written 2026-07-12/13 for the spine and proven by
    // two billed runs, months before any parameter manifest existed. It is a
    // stronger control than a second brief written by the same hand as the
    // detectors — the WF-005 precedent, where a positive control derived from
    // the regular expression it tested proved only that the regex was non-empty.
    //
    // It is flattened WITHOUT the field labels on purpose. With them, the
    // label-declaration rule would read every line and the control would measure
    // that rule rather than these detectors.
    const SEED = [
      "Senior AI/LLM Engineer (platform team)",
      "Permanent",
      "3 months",
      "Paris / hybrid (2 days on-site)",
      "Python, production LLM/RAG experience, evaluation, MLOps basics",
      "TypeScript, Kubernetes, prior startup experience",
      "\u20ac70-85k or \u20ac650-750/day freelance equivalent",
      "5-person platform team, Python/TypeScript stack, weekly demos",
      "Tech interview + practical RAG case + reference checks",
      "Verify diplomas, LinkedIn, references \u2014 yes",
    ];

    // Guard the guard: the strings above are copied from the harness, so the
    // control is worthless the day the harness changes and this copy does not.
    const harness = readFileSync(
      fileURLToPath(new URL("./wf-009-run-live.test.ts", import.meta.url)),
      "utf8",
    );
    for (const value of SEED) {
      expect(harness, `the live seed no longer carries ${JSON.stringify(value)}`).toContain(value);
    }

    const brief = {
      need: `Hiring need. ${SEED.slice(0, 3).join(". ")}.`,
      domain: "HR & Talent",
      expectedDeliverable: "Job description, sourcing, assessment and selection",
      constraints: [SEED[6] ?? ""],
      context: `${SEED.slice(3, 6).join(". ")}. ${SEED.slice(7).join(". ")}.`,
    };
    const res = validateRoute(proposal("WF-009"), brief, FAKE_SIDECAR, MANIFESTS);
    const missing = res.status === "PARAMS_MISSING" ? res.missingParams : [];

    // EIGHT OF ELEVEN fill. The three that do not are all the same class — the
    // seed is a set of LABELLED FIELDS, and flattening drops the labels that
    // carry the meaning. None is a defect of a detector, and the expectation is
    // NOT tuned until the number looks better: crafting the prose until it
    // passes is the circular control the WF-005 lesson exists to refuse.
    //   - `Urgency`: the seed states "3 months", a bare quantity meaningful only
    //     under its field name. Verbatim the WF-005 `Horizon` finding reproduced
    //     on another card — the anchoring policy corroborated by a source that
    //     knows nothing about it.
    //   - `Must-have skills`: the list carries no requirement marker, and the
    //     seed's NICE-to-have list sits right beside it, which is exactly why
    //     the marker is required.
    //   - `Role sought (title)`: "Senior AI/LLM Engineer" states a title, not
    //     that anyone is being HIRED, and the recruitment anchor is what stops
    //     a client's own CDO from filling it.
    //
    // ⚠️ AND THEY ARE NOT ALL RECOVERABLE THE SAME WAY. `Urgency: 3 months` and
    // `Must-have skills: …` are read by the label-declaration rule, because
    // those labels are whole card lines. `Role sought (title)` is NOT: it is
    // half of a conjunction, its `card` carries the qualifier, and the line
    // label `Role sought` deliberately answers neither half. For that one, prose
    // naming the hire is the only route — which is the behaviour, not a gap.
    expect(missing.sort()).toEqual(["Must-have skills", "Role sought (title)", "Urgency"]);
  });

  it("refuses the values the card does not offer, even plausible ones", () => {
    // Three tokens were admitted in the first draft and removed after checking
    // each detector's vocabulary against its card: `portage` on Contract type
    // ("portage salarial" is a distinct French arrangement the card does not
    // list — and it is the OPERATOR's own situation, which has no business
    // inside a card's values), `distributed` on Location (a TEAM property, and
    // `Distribution` is a WF-010 card value), and `head of` on Role sought
    // (level) (an org-chart title, not a rung of the junior→senior→lead→director
    // ladder; a brief saying "Head of Data Science" has stated a TITLE).
    //
    // ⚠️ THIS TEST EXISTS BECAUSE FALSIFICATION COULD NOT MEASURE TWO OF THEM.
    // Re-admitting `portage` and `head of` turned NOTHING red — the first
    // appears in no brief at all, the second only inside `submittedBy`, which is
    // mapped nowhere. A green falsification is a finding about the corpus, not a
    // licence, so the inputs the corpus lacks are supplied here.
    const cases = [
      ["Contract type", "The mission would run through portage salarial."],
      ["Role sought (level)", "The Head of Engineering position is open."],
      ["Location", "The platform team is a distributed team across Europe."],
    ] as const;
    // ⚠️ The `head of` case names a POSITION on purpose. A first wording, "a
    // Head of Data Science to run it", left the case green under mutation for a
    // second reason: even re-admitted, the token needs a role noun within its
    // window, and "Data Science" is not one — so the text did not exercise the
    // branch it was written for. A case must be able to FAIL before it can pass.
    //
    // ⚠️ BOTH `need` AND `context` are replaced, and the first version of this
    // test replaced only the context: P09's own need says "senior MLOps
    // engineer", so `Role sought (level)` was already answered and the case held
    // whether the token was admitted or not. Third time this repository has hit
    // an assertion whose subject was answered elsewhere in the same brief.
    for (const [label, text] of cases) {
      const brief = fixtureBrief("P09");
      brief.need = "They are recruiting for the platform team.";
      brief.context = text;
      brief.constraints = [];
      const res = validateRoute(proposal("WF-009"), brief, FAKE_SIDECAR, MANIFESTS);
      expect(res.status, text).toBe("PARAMS_MISSING");
      if (res.status !== "PARAMS_MISSING") continue;
      expect(res.missingParams, `${label} must not be answered by "${text}"`).toContain(label);
    }
  });

  it("does not read the CLIENT's own CDO as the role sought", () => {
    // Measured before this test existed: the bare title list fills on the WF-004
    // brief through "CDO sponsor", the client's chief data officer sponsoring an
    // engagement rather than a post being recruited.
    const res = validateRoute(proposal("WF-009"), fixtureBrief("P04"), FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams).toContain("Role sought (title)");
  });

  it("does not read `upskilling of their staff` as a seniority level", () => {
    // The workforce, not the Staff Engineer grade.
    const res = validateRoute(proposal("WF-009"), fixtureBrief("P04"), FAKE_SIDECAR, MANIFESTS);
    const missing = res.status === "PARAMS_MISSING" ? res.missingParams : [];
    expect(missing).toContain("Role sought (level)");
  });

  it("does not read a bare squad or a sprint cadence as team context or urgency", () => {
    // Measured: the bare team words fill on five foreign briefs, and the bare
    // quantity on the SAFe brief ("PI of 10 weeks"), which states a cadence and
    // not a hiring deadline.
    for (const id of ["P01", "P02"]) {
      const res = validateRoute(proposal("WF-009"), fixtureBrief(id), FAKE_SIDECAR, MANIFESTS);
      expect(res.status, id).toBe("PARAMS_MISSING");
      if (res.status !== "PARAMS_MISSING") continue;
      expect(res.missingParams, `${id} team context`).toContain("Team context");
      expect(res.missingParams, `${id} urgency`).toContain("Urgency");
    }
  });

  it("does not let the TEAM's stack answer the must-have skills", () => {
    // P09 states "Kubernetes and MLflow stack" — the team's stack, which is the
    // subject of `Team context`. Without a requirement marker the two
    // specifications would answer each other; with it, `Team context` fills and
    // `Must-have skills` does not.
    const res = validateRoute(proposal("WF-009"), fixtureBrief("P09"), FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams).toContain("Must-have skills");
    expect(res.missingParams).not.toContain("Team context");
  });

  it("never reports the card-declared optional as missing", () => {
    // `Nice-to-have skills [Desired but non-blocking skills]` is the only
    // card-declared optional in the catalog. §2 classes it must-ask on P09; the
    // card wins over the table when the card speaks.
    const brief = fixtureBrief("P09");
    brief.context = "Nothing else is known about this hire.";
    const res = validateRoute(proposal("WF-009"), brief, FAKE_SIDECAR, MANIFESTS);
    const missing = res.status === "PARAMS_MISSING" ? res.missingParams : [];
    expect(missing).not.toContain("Nice-to-have skills");
  });

  it("treats an approved budget as no salary range, and an explicit deferral as an answer", () => {
    // The WF-008 `AI Act tier` rule: silence is not the sanctioned unknown, and
    // "budget is approved" says a budget EXISTS rather than what the range is.
    const silent = validateRoute(proposal("WF-009"), fixtureBrief("P09"), FAKE_SIDECAR, MANIFESTS);
    const silentMissing = silent.status === "PARAMS_MISSING" ? silent.missingParams : [];
    expect(silentMissing, "an approved budget is not a range").toContain("Salary / day rate");

    const deferred = fixtureBrief("P09");
    deferred.context += " Salary to be defined with HR.";
    const res = validateRoute(proposal("WF-009"), deferred, FAKE_SIDECAR, MANIFESTS);
    const missing = res.status === "PARAMS_MISSING" ? res.missingParams : [];
    expect(missing, "an explicit deferral is an answer").not.toContain("Salary / day rate");
  });
});
