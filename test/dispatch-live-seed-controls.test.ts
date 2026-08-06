import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { validateRoute } from "../src/dispatch/validate-route.js";
import { DEFAULT_MANIFESTS } from "../src/dispatch/run-dispatch.js";
import type { Sidecar } from "../src/sidecar/types.js";

/**
 * LIVE-SEED CONTROLS — the seven manifests that had none.
 *
 * The nineteen coverage-matrix briefs are all written by the same hand as the
 * detectors, so a manifest measured only against them is a positive control that
 * proves the detectors non-empty and little else. The strongest independent
 * source this repository has is the seed of each workflow's LIVE HARNESS: written
 * earlier, for the spine rather than for any parameter check, and PROVEN by
 * billed live runs. ⚠️ No quantifier on "earlier": the WF-005 seed predates the
 * first param manifest by six days (2026-07-13 vs 2026-07-19), not by weeks. WF-005, WF-009 and WF-010 already carry one; this closes the
 * remaining seven.
 *
 * ⚠️ IT DOES NOT ESCAPE CIRCULARITY, it only climbs the hierarchy. The seeds are
 * mine too. What they are not is written for THIS purpose, or after these
 * detectors existed — which is the top tier available (`already proven live` >
 * `written by another chantier` > `written by me today`).
 *
 * METHOD, copied from the WF-009/WF-010 precedent rather than reinvented:
 *   · seed values copied VERBATIM, with a drift guard reading the harness file —
 *     a copy that silently diverges from its source is worthless;
 *   · flattened WITHOUT the field labels. With them the label-declaration rule
 *     would read every line and the control would measure that rule instead of
 *     these detectors;
 *   · ⛔ THE EXPECTATION IS NEVER TUNED. Reshaping the prose until the number
 *     improves is the circular control the WF-005 lesson exists to refuse. What
 *     the seed says is what the seed says.
 *
 * TWO FIELDS ARE EXCLUDED, deliberately, and neither is a card fact:
 *   · WF-007 `instructions` — harness plumbing ("work offline, do not browse");
 *   · WF-008 `highStakes: true` — a boolean flag, not prose.
 *
 * ⚠️ THE CONTROL IS NEARLY POWERLESS ON WF-001/002/003, and saying so matters
 * more than the number it produces there. Those three spines take a SINGLE prose
 * string as input, so their seeds state one sentence rather than a set of card
 * facts: 2/7, 3/8 and 1/9 measure the seed's shape, not the detectors. Reading
 * them as a detector verdict would be the mistake this file exists to avoid.
 *
 * SHAPE: one snapshot for the seven rather than seven near-identical tests. The
 * three earlier controls are individual assertions because each carries per-miss
 * reasoning; here the reasoning is per-manifest and the snapshot makes movement
 * visible in a diff — the cross-vocabulary and policy precedents.
 */

/** Verbatim seed values, per manifest, with the harness file they are copied from. */
const SEEDS: Record<
  string,
  {
    harness: string;
    domain: string;
    deliverable: string;
    need: string[];
    constraints: string[];
    context: string[];
  }
> = {
  "WF-001": {
    harness: "wf-001-run-live.test.ts",
    domain: "Product & Delivery",
    deliverable: "Prioritized backlog with acceptance criteria",
    need: [
      "Rebuild an insurer's B2B customer portal: self-care area, policy tracking and claims filing, web and mobile.",
    ],
    constraints: [],
    context: [],
  },
  "WF-002": {
    harness: "wf-002-run-live.test.ts",
    domain: "Product & Delivery",
    deliverable: "PI Planning pack",
    need: [
      "Digital Banking ART at a retail bank: customer portal redesign (self-care, payments, complaints), PI Planning for the next Program Increment, web and mobile teams.",
    ],
    constraints: [],
    context: [],
  },
  "WF-003": {
    harness: "wf-003-run-live.test.ts",
    domain: "Tech & Data",
    deliverable: "Deployment-ready launch plan",
    need: [
      "Launch of a RAG customer-support chatbot for an insurer: answers sourced from the policies/claims knowledge base, from business case to secure deployment.",
    ],
    constraints: [],
    context: [],
  },
  "WF-004": {
    harness: "wf-004-run-live.test.ts",
    domain: "Management & Consulting",
    deliverable: "Report + roadmap + ComEx presentation + training plan",
    need: [
      "Mid-cap European industrial group (EU footprint, ~4,000 employees).",
      "Full AI consulting engagement: maturity audit, ROI business cases, a 12-24 month strategic AI roadmap, an ADKAR change-management plan, a training plan per profile, and executive-committee deliverables (executive summary, full report, ComEx deck).",
    ],
    constraints: ["Productivity + competitiveness, under budget and change-resistance constraints"],
    context: [
      "CEO, CIO, CDO, executive committee, operational teams",
      "Experimenter (isolated pilots, no enterprise strategy yet)",
    ],
  },
  "WF-006": {
    harness: "wf-006-run-live.test.ts",
    domain: "Management & Consulting",
    deliverable: "scoping note, architecture blueprint, governance plan and a commercial proposal",
    need: [
      "Mid-cap European insurer (EU, ~1,200 employees), experimenter AI maturity, CDO-sponsored.",
      "Direct solicitation / referral (sole source — no competing firms)",
    ],
    constraints: ["EU data residency, GDPR, AI Act high-risk tier — governance emphasis"],
    context: [
      "Advisory engagement a freelance can prime: AI-use-case scoping, TARGET architecture for a claims-triage assistant (design only, not the build), AI-Act/GDPR governance framework, and a phased roadmap — deliverables = scoping note, architecture blueprint, governance plan and a commercial proposal. Build/run is explicitly OUT of scope (a later, separately staffed phase).",
      "€45k envelope, disclosed (≈ 30-40 consultant person-days)",
      "2026-09-30 (award in ~5 weeks)",
      "CDO (economic buyer) + Head of Claims (business sponsor)",
      "AI + AI-Act expertise and prior insurance-sector references (not lowest price)",
      "Sole source (referral) — no incumbent SSII competing",
      "Solo freelance via portage; advisory/design scope matched to a single-expert delivery.",
    ],
  },
  "WF-007": {
    harness: "wf-007-run-live.test.ts",
    domain: "Management & Consulting",
    deliverable:
      "D1-D5 kickoff plan, stakeholder RACI, client context sheet, D1-D30 engagement plan, D1 kit + introduction email + D1 report template, D5 scoping note",
    need: [
      "Mid-cap European industrial group (EU footprint, ~4,000 employees).",
      "AI scoping engagement (3 months, hybrid on-site/remote)",
    ],
    constraints: ["Post-reorg mood, undocumented legacy IS, two incumbent SSII"],
    context: [
      "Medium (3-12 months)",
      "Sponsor (COO), direct manager (CIO), delivery team, CHRO",
      "Hybrid (2 days on-site / week)",
      "Business + organizational; a recent reorganization adds sensitivity",
    ],
  },
  "WF-008": {
    harness: "wf-008-run-live.test.ts",
    domain: "Legal & Compliance",
    deliverable: "Audit report, remediation plan and executive-board presentation",
    need: [
      "European insurer (mid-cap, EU-only footprint).",
      "AI Act / GDPR compliance audit of a claims-triage AI system in production: an LLM-based classifier that routes and prioritizes insurance claims from the policies/claims knowledge base. High-risk tier (Annex III), personal data, preventive audit ahead of a possible CNIL review — from obligations mapping through an independent methodology counter-review to the final audit report.",
    ],
    constraints: [],
    context: ["Preventive (regulatory pressure)", "AI Act + GDPR + NIS2 + ISO 42001"],
  },
};

/** Per-manifest reading, written once and carried into the snapshot. */
const NOTES: Record<string, string> = {
  "WF-001":
    "SEED SHAPE, not a detector verdict — this spine takes one prose string, so the seed states a product need and nothing about method, team or level of detail.",
  "WF-002":
    "SEED SHAPE — one prose string. It names the ART and the PI, and states no capacity, dependency or PI duration, which is what the misses say.",
  "WF-003":
    "SEED SHAPE — one prose string, the weakest of the seven. It describes the app and nothing of the stack, cloud, database, budget or SLA.",
  "WF-004":
    "`Client (name)` is correctly missing: the seed says \"Mid-cap European industrial group\" and names no company. `Engagement duration` is the CORROBORATION worth having — the seed's only quantity is a \"12-24 month strategic roadmap\", the roadmap's horizon rather than the engagement's, and the anchoring policy refuses it. A source that knows nothing about that policy agrees with it.",
  "WF-006":
    "`Prospect (name)`, `Known risks` and `Proposal format` are absent from the seed. `Selection criteria` is refused correctly — the detector wants the concept noun beside a value, and bare \"expertise\"/\"price\" are generic business words. ⚠️ `Requested scope` is a CANDIDATE, not a verdict: the seed says \"Advisory engagement\" where the card lists \"Consulting engagement\". Synonym or new member is a judgement to settle at the card, and deliberately not settled here.",
  "WF-007":
    "`Client (name)` and `D1 access` are genuinely absent from the seed. `Identified stakes` is the label-dropping effect: the seed states \"Business + organizational\" with no stake noun beside it, and that card line IS served by the label rule when the label survives — the WF-009 finding reproduced.",
  "WF-008":
    "Nine misses, most of them the seed stating nothing: no volumes, no compliance deadline, no model class, no AI-system name. `Data processed (sensitive)`/`(Art. 9)` are correct — the seed says \"personal data\" only, the one-way implication already written on those specs. ⚠️ `Client (geographic footprint)` is a CANDIDATE: its own comment PREDICTED this miss (\"MISSING on BOTH briefs… that is the split working\"), and the seed's \"EU-only footprint\" is data-geography phrasing owned by the sibling `Geography`. The narrow question is that `europe` is a territory token and `EU` is not.",
};

function sidecarFor(id: string): Sidecar {
  return {
    schemaVersion: "1.0",
    catalog: { name: "claude-agents", version: "v4.2.0" },
    generatedAt: "2026-07-19T00:00:00Z",
    assets: [
      {
        id,
        type: "workflow",
        path: `workflows/${id}.md`,
        title: id,
        description: "d",
        catalogVersion: "v4.2.0",
        steps: [{ id: "STEP-01", agent: "AGENT-BUSINESS-ANALYST" }],
        source: { file: `workflows/${id}.md`, catalogTag: "v4.2.0" },
      },
      {
        id: "AGENT-BUSINESS-ANALYST",
        type: "agent",
        path: "agents/ba.md",
        title: "BA",
        description: "d",
        catalogVersion: "v4.2.0",
        source: { file: "agents/ba.md", catalogTag: "v4.2.0" },
      },
    ],
  } as unknown as Sidecar;
}

function render(): string {
  const out: string[] = [
    "# Live-seed controls — the independent source, per manifest",
    "",
    "Generated by `test/dispatch-live-seed-controls.test.ts`. Each manifest is measured against",
    "the seed of its OWN live harness — written for the spine, before any parameter check existed,",
    "and proven by billed runs — flattened without its field labels.",
    "",
    "**A miss is not a defect.** It is a defect only when the seed STATES the fact and the",
    "detector refuses it. Read each note before acting on a number, and never tune the seed",
    "until the count improves.",
    "",
    "| Manifest | Fills | Missing |",
    "|---|---|---|",
  ];
  const rows: Array<[string, number, number, string[]]> = [];
  for (const [id, s] of Object.entries(SEEDS)) {
    const manifest = DEFAULT_MANIFESTS[id];
    if (manifest === undefined) throw new Error(`${id} is no longer registered`);
    const res = validateRoute(
      { proposedRoute: id, rationale: "live-seed control", nearestMiss: null },
      {
        need: s.need.join(" "),
        domain: s.domain,
        expectedDeliverable: s.deliverable,
        constraints: [...s.constraints],
        context: s.context.join(". "),
      },
      sidecarFor(id),
      DEFAULT_MANIFESTS,
    );
    const missing = res.status === "PARAMS_MISSING" ? [...res.missingParams].sort() : [];
    const total = manifest.params.length;
    rows.push([id, total - missing.length, total, missing]);
    out.push(`| ${id} | **${total - missing.length} / ${total}** | ${missing.join(" · ") || "—"} |`);
  }
  const fills = rows.reduce((a, [, f]) => a + f, 0);
  const totals = rows.reduce((a, [, , t]) => a + t, 0);
  out.push("", `**${fills} of ${totals} specifications fill across the seven.**`, "");
  out.push("## Readings", "");
  for (const [id] of rows) out.push(`- **${id}** — ${NOTES[id] ?? ""}`);
  out.push("");
  return out.join("\n");
}

describe("live-seed controls — an independent source, not a verdict", () => {
  it("matches the reviewed snapshot of what each live seed fills", () => {
    expect(render()).toMatchFileSnapshot("./__snapshots__/live-seed-controls.md");
  });

  it("GUARDS THE GUARD — every seed string is still in its harness, WHOLE", () => {
    // The values above are COPIES. The day a harness seed changes and this copy
    // does not, the control silently stops being independent and starts measuring
    // a fiction. This is the failure mode of a copied corpus, and it is the only
    // hard assertion in the file.
    //
    // ⚠️ THE VALUE MUST BE WHOLE, NOT MERELY PRESENT — and that distinction was
    // paid for in this very file. A first version asserted presence alone, so a
    // TRUNCATED copy passed silently: moving three seeds from a scratch probe
    // into this instrument shortened them, one cut mid-sentence, and WF-008 read
    // 8/19 instead of 10/19 with nothing objecting. It surfaced only by comparing
    // against the scratch measurement, which is not a mechanism a later reader
    // gets.
    //
    // The fix is one character, and the reasoning that first refused it ("this
    // would need a parser") was a rationalisation. Once the concatenation seams
    // are closed above, a COMPLETE literal is followed by its closing quote and a
    // truncated prefix is followed by more text — so appending `"` to the needle
    // turns presence into completeness with no parsing at all.
    for (const [id, s] of Object.entries(SEEDS)) {
      const raw = readFileSync(fileURLToPath(new URL(`./${s.harness}`, import.meta.url)), "utf8");
      // ⚠️ THE SEAMS MUST BE CLOSED FIRST, and this guard found that out by
      // failing on its first run — which is what it is for. Most harness seeds
      // are written as multi-line concatenations (`"…portal: self-care area, " +
      // "policy tracking…"`), so the joined value a spine receives never appears
      // literally in the source. Comparing raw text would make the guard reject
      // every correct copy. Closing `" + "` joins is the smallest faithful
      // transformation: it reconstructs exactly what the harness passes.
      const harness = raw.replace(/"\s*\+\s*"/g, "");
      for (const value of [...s.need, ...s.constraints, ...s.context]) {
        expect(
          harness,
          `${id}: the live seed no longer carries ${JSON.stringify(value)} WHOLE (changed, or copied truncated)`,
        ).toContain(`${value}"`);
      }
    }
  });
});
