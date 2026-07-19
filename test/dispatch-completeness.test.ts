import { describe, it, expect } from "vitest";
import { checkCompleteness, NEED_MIN_WORDS } from "../src/dispatch/completeness-check.js";
import type { NeedBrief } from "../src/dispatch/types.js";

/**
 * Guards the WF-000 dispatch intake gate (brief contract §4): the completeness
 * check is the only thing standing between an unqualified stakeholder ask and
 * a billed routing/run path — it must fail closed with the failing fields
 * named, and must NOT reject a modest-but-valid brief (WF-005 floor lesson).
 */

/** A fully qualified P01-style brief (fictional — public-trace rule). */
function validBrief(): NeedBrief {
  return {
    need: "Client brief received from Nordwind Insurance: the claims department wants an AI assistant for adjusters and management approved exploring it, so we must decide what to build first.",
    domain: "Agile & Product",
    expectedDeliverable: "Prioritized initial backlog with acceptance criteria (full scoping)",
    constraints: ["GDPR applies to claimant data", "pilot budget capped for Q3"],
    context:
      "Mid-size European insurer, claims department of 40 adjusters, one product squad available, Scrum in place, no imposed stack.",
    submittedBy: "Lead UX Designer",
  };
}

describe("checkCompleteness — accepts qualified briefs", () => {
  it("passes a fully qualified brief", () => {
    const res = checkCompleteness(validBrief());
    expect(res.status).toBe("ok");
  });

  it("passes a modest-but-valid brief sitting exactly on the word floor (blocking floor, not advisory ideal)", () => {
    const brief = validBrief();
    // Exactly NEED_MIN_WORDS words, still carrying a state marker.
    brief.need = "Engagement signed with the client and " + "word ".repeat(NEED_MIN_WORDS - 7).trim() + " now";
    expect(brief.need.trim().split(/\s+/).length).toBe(NEED_MIN_WORDS);
    const res = checkCompleteness(brief);
    expect(res.status).toBe("ok");
  });

  it("allows empty constraints when the context explicitly says unconstrained", () => {
    const brief = validBrief();
    brief.constraints = [];
    brief.context += " The engagement is unconstrained at this stage.";
    expect(checkCompleteness(brief).status).toBe("ok");
  });

  it("accepts a brief without the optional submittedBy", () => {
    const brief = validBrief();
    delete brief.submittedBy;
    expect(checkCompleteness(brief).status).toBe("ok");
  });
});

describe("checkCompleteness — fail-closed rejections, failing field named", () => {
  it('rejects the P18 raw ask ("We need AI.") before it can reach routing', () => {
    const res = checkCompleteness({ need: "We need AI." });
    expect(res.status).toBe("REJECT_INCOMPLETE");
    if (res.status !== "REJECT_INCOMPLETE") return;
    // Missing required fields are named by the shape layer.
    const fields = res.issues.map((i) => i.field);
    for (const f of ["domain", "expectedDeliverable", "constraints", "context"]) {
      expect(fields, f).toContain(f);
    }
  });

  it("rejects a shape-valid P18 upgrade that still has no state marker and too few words", () => {
    const brief = validBrief();
    brief.need = "We need AI for the whole company as soon as possible please.";
    const res = checkCompleteness(brief);
    expect(res.status).toBe("REJECT_INCOMPLETE");
    if (res.status !== "REJECT_INCOMPLETE") return;
    const codes = res.issues.map((i) => i.code);
    expect(codes).toContain("TOO_SHORT");
    expect(codes).toContain("NO_STATE_MARKER");
    expect(res.issues.every((i) => i.field === "need")).toBe(true);
  });

  it("rejects negative sentinels in operator-authored fields (intake policy — stricter than the later param check)", () => {
    const brief = validBrief();
    brief.context = "N/A";
    const res = checkCompleteness(brief);
    expect(res.status).toBe("REJECT_INCOMPLETE");
    if (res.status !== "REJECT_INCOMPLETE") return;
    expect(res.issues).toContainEqual(
      expect.objectContaining({ field: "context", code: "NEGATIVE_SENTINEL" }),
    );
  });

  it("rejects an unjustified empty constraints array", () => {
    const brief = validBrief();
    brief.constraints = [];
    const res = checkCompleteness(brief);
    expect(res.status).toBe("REJECT_INCOMPLETE");
    if (res.status !== "REJECT_INCOMPLETE") return;
    expect(res.issues).toContainEqual(
      expect.objectContaining({ field: "constraints", code: "UNJUSTIFIED_EMPTY_CONSTRAINTS" }),
    );
  });

  it("rejects a submittedBy carrying an email address (role, never a name/address)", () => {
    const brief = validBrief();
    brief.submittedBy = "jane.doe@nordwind.example";
    const res = checkCompleteness(brief);
    expect(res.status).toBe("REJECT_INCOMPLETE");
    if (res.status !== "REJECT_INCOMPLETE") return;
    expect(res.issues).toContainEqual(
      expect.objectContaining({ field: "submittedBy", code: "NOT_A_ROLE" }),
    );
  });

  it("rejects unknown extra keys (strict contract — no silent payload smuggling)", () => {
    const raw = { ...validBrief(), candidatePool: [{ name: "CAND-01" }] };
    const res = checkCompleteness(raw);
    expect(res.status).toBe("REJECT_INCOMPLETE");
  });

  it("aggregates all issues instead of stopping at the first", () => {
    const brief = validBrief();
    brief.need = "TBD";
    brief.constraints = [];
    const res = checkCompleteness(brief);
    expect(res.status).toBe("REJECT_INCOMPLETE");
    if (res.status !== "REJECT_INCOMPLETE") return;
    const fields = new Set(res.issues.map((i) => i.field));
    expect(fields.has("need")).toBe(true);
    expect(fields.has("constraints")).toBe(true);
  });
});
