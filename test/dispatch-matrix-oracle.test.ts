import { describe, it, expect } from "vitest";
import { checkCompleteness } from "../src/dispatch/completeness-check.js";
import { validateRoute } from "../src/dispatch/validate-route.js";
import { buildRouterPrompt } from "../src/dispatch/router-prompt.js";
import { WF001_MANIFEST } from "../src/dispatch/manifests/wf-001.js";
import { DISPATCH_FIXTURES } from "./fixtures/dispatch-briefs.js";
import type { Sidecar, Asset } from "../src/sidecar/types.js";

/**
 * The coverage-matrix oracle (plan §3): all 20 fixture briefs through the
 * DETERMINISTIC pipeline, expected-route cells reproduced by string equality.
 * The LLM proposer is FAKED with the expected route on purpose — this harness
 * guards intake + validation, not the proposer; the proposer's own accuracy is
 * what the billed live harness measures against this same oracle. No LLM in CI.
 */

const WF_TITLES: Record<string, [title: string, description: string]> = {
  "WF-001": ["AI Product Scoping", "Client brief → prioritized backlog + acceptance criteria"],
  "WF-002": ["Delivery Agile SAFe", "PI Planning → sprint backlog → executive-committee progress reporting"],
  "WF-003": ["AI Application Launch", "Validated idea → architecture → code → deployment → security audit"],
  "WF-004": ["AI Consulting Engagement", "Engagement signed → maturity audit → strategy → training plan → executive deliverables"],
  "WF-005": ["Strategic Intelligence & Growth", "Market signal / weekly cadence → qualified synthesis → thought-leadership content → publication"],
  "WF-006": ["Pre-sales / Commercial proposal", "RFP received → qualification → scoping → architecture → schedule → costing → commercial proposal"],
  "WF-007": ["Client Engagement Onboarding D1-D5", "Engagement signed → client context → kickoff plan → D1 deliverables → D5 scoping"],
  "WF-008": ["AI Act / GDPR Compliance Audit", "AI system to audit → obligations mapping → architecture review → security → data → governance → report + remediation plan"],
  "WF-009": ["IT/AI Recruitment", "Identified need → job description → sourcing → assessment → selection → offer"],
  "WF-010": ["Project Post-mortem / Lessons Learned", "Project closed (or major incident) → collection → analysis → lessons-learned report → improvement plan"],
};

const AGENT: Asset = {
  id: "AGENT-CORE",
  type: "agent",
  path: "agents/core.md",
  title: "Core",
  description: "d",
  catalogVersion: "v4.2.0",
  source: { file: "agents/core.md", catalogTag: "v4.2.0" },
};

const TEN_WF_SIDECAR: Sidecar = {
  schemaVersion: "1.0",
  catalog: { name: "claude-agents", version: "v4.2.0" },
  generatedAt: "2026-07-19T00:00:00Z",
  assets: [
    AGENT,
    ...Object.entries(WF_TITLES).map(
      ([id, [title, description]]): Asset => ({
        id,
        type: "workflow",
        path: `workflows/${id}.md`,
        title,
        description,
        catalogVersion: "v4.2.0",
        source: { file: `workflows/${id}.md`, catalogTag: "v4.2.0" },
        dependsOn: ["AGENT-CORE"],
      }),
    ),
  ],
};

const MANIFESTS = { "WF-001": WF001_MANIFEST } as const;

describe("coverage-matrix oracle — 20 fixtures, deterministic pipeline", () => {
  for (const fixture of DISPATCH_FIXTURES) {
    it(`${fixture.id} → ${fixture.expected}`, () => {
      const completeness = checkCompleteness(fixture.raw ?? fixture.brief);

      if (fixture.expected === "REJECT_INCOMPLETE") {
        expect(completeness.status).toBe("REJECT_INCOMPLETE");
        return; // never reaches routing — that IS the expectation
      }

      expect(completeness.status, `${fixture.id} must pass intake`).toBe("ok");
      if (completeness.status !== "ok") return;

      // Proposer faked with the expected cell (see file header) — the oracle
      // guards everything AFTER the proposal, deterministically.
      const decision = validateRoute(
        { proposedRoute: fixture.expected, rationale: "oracle", nearestMiss: null },
        completeness.brief,
        TEN_WF_SIDECAR,
        MANIFESTS,
      );

      if (fixture.expected === "NO_MATCH") {
        expect(decision.status).toBe("NO_MATCH");
        return;
      }

      expect(decision.status, `${fixture.id} routed`).toBe("ROUTED");
      if (decision.status !== "ROUTED") return;
      expect(decision.route).toBe(fixture.expected);
      // V0 has one manifest: WF-001 decisions are param-checked, others honestly not.
      expect(decision.paramsChecked).toBe(fixture.expected === "WF-001");
    });
  }
});

describe("router prompt — built from the sidecar, never hardcoded", () => {
  it("lists exactly the injected sidecar's workflows and carries the role-invariance and NO_MATCH rules", () => {
    const prompt = buildRouterPrompt(TEN_WF_SIDECAR);
    for (const id of Object.keys(WF_TITLES)) expect(prompt).toContain(id);
    expect(prompt).toContain("NEVER let the submitter's role");
    expect(prompt).toContain("NO_MATCH");
    expect(prompt).toContain("Never invent a workflow id");
  });

  it("follows a smaller sidecar (two workflows only appear)", () => {
    const two: Sidecar = {
      ...TEN_WF_SIDECAR,
      assets: TEN_WF_SIDECAR.assets.filter((a) =>
        ["AGENT-CORE", "WF-001", "WF-008"].includes(a.id),
      ),
    };
    const prompt = buildRouterPrompt(two);
    expect(prompt).toContain("WF-001");
    expect(prompt).toContain("WF-008");
    expect(prompt).not.toContain("WF-009");
  });
});
