import { describe, it, expect } from "vitest";
import { validateRoute } from "../src/dispatch/validate-route.js";
import { WF001_MANIFEST } from "../src/dispatch/manifests/wf-001.js";
import { WF002_MANIFEST } from "../src/dispatch/manifests/wf-002.js";
import { WF003_MANIFEST } from "../src/dispatch/manifests/wf-003.js";
import { WF004_MANIFEST } from "../src/dispatch/manifests/wf-004.js";
import { WF005_MANIFEST } from "../src/dispatch/manifests/wf-005.js";
import { WF006_MANIFEST } from "../src/dispatch/manifests/wf-006.js";
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
    // Cross-vocabulary guard. Two specs DO fill, and the assertion records it
    // rather than hiding it behind a narrower regex: the P01 brief states an
    // insurer (sector) and GDPR (a compliance stake). Both are true statements
    // of the card's own questions — `Priority stakes` is the least
    // discriminating spec of this manifest and is documented as such.
    const res = validateRoute(proposal("WF-004"), p01AmendedBrief(), FAKE_SIDECAR, MANIFESTS);
    expect(res.status).toBe("PARAMS_MISSING");
    if (res.status !== "PARAMS_MISSING") return;
    expect(res.missingParams.sort()).toEqual([
      "Client (name)",
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

  it("WF-004: a sprint, a response deadline and a project length are not engagement durations", () => {
    // The three foreign briefs the bare quantity+unit detector filled on. WF-005
    // `Horizon` refused exactly this; the two manifests disagreeing was the find.
    for (const id of ["P02", "P06", "P10"]) {
      const res = validateRoute(proposal("WF-004"), fixtureBrief(id), FAKE_SIDECAR, MANIFESTS);
      expect(res.status, `${id} must not fill the whole card`).toBe("PARAMS_MISSING");
      if (res.status !== "PARAMS_MISSING") continue;
      expect(res.missingParams, `${id} duration`).toContain("Engagement duration");
    }
  });

  it("still reads the engagement's OWN duration, in either word order", () => {
    // Guard against over-tightening: the anchored detector must keep answering
    // the card on the two briefs that genuinely state an engagement window.
    for (const id of ["P04", "P12"]) {
      const res = validateRoute(proposal("WF-004"), fixtureBrief(id), FAKE_SIDECAR, MANIFESTS);
      const missing = res.status === "PARAMS_MISSING" ? res.missingParams : [];
      expect(missing, `${id} duration must be filled`).not.toContain("Engagement duration");
    }
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
