import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  checkUniqueIds,
  checkReferentialIntegrity,
  checkAccessibility,
  checkIntegrity,
} from "../src/sidecar/integrity.js";
import type { Sidecar } from "../src/sidecar/types.js";

// Fake hermetic mini-catalog: no link to the real claude-agents.
const catalogRoot = fileURLToPath(
  new URL("./fixtures/catalog/", import.meta.url),
);
const sidecarPath = fileURLToPath(
  new URL("./fixtures/catalog/sidecar.json", import.meta.url),
);

/** Reloads a fresh copy of the fixture sidecar (each test degrades it). */
function loadSidecar(): Sidecar {
  return JSON.parse(readFileSync(sidecarPath, "utf-8")) as Sidecar;
}

describe("integrity — happy path", () => {
  it("the fixture has integrity (no issue)", () => {
    expect(checkIntegrity(loadSidecar(), catalogRoot)).toEqual([]);
  });
});

describe("ISO 25012 — accuracy: id uniqueness", () => {
  it("detects a duplicate id", () => {
    const s = loadSidecar();
    const first = s.assets[0]!;
    s.assets.push({ ...first });
    const issues = checkUniqueIds(s);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.code).toBe("DUPLICATE_ID");
    expect(issues[0]!.assetId).toBe(first.id);
  });

  it("reports nothing when ids are unique", () => {
    expect(checkUniqueIds(loadSidecar())).toEqual([]);
  });
});

describe("ISO 25012 — referential accuracy", () => {
  it("detects a dependsOn to a nonexistent id", () => {
    const s = loadSidecar();
    s.assets[2]!.dependsOn = ["AGENT-PHANTOM"];
    const issues = checkReferentialIntegrity(s);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.code).toBe("DANGLING_REFERENCE");
    expect(issues[0]!.assetId).toBe("WF-001");
  });

  it("accepts resolved dependencies", () => {
    expect(checkReferentialIntegrity(loadSidecar())).toEqual([]);
  });
});

describe("ISO 25012 — accessibility", () => {
  it("detects a path missing from disk", () => {
    const s = loadSidecar();
    s.assets[0]!.path = "skills/nonexistent/SKILL.md";
    const issues = checkAccessibility(s, catalogRoot);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.code).toBe("MISSING_FILE");
  });

  it("defensively rejects a path escaping the catalog", () => {
    const s = loadSidecar();
    s.assets[0]!.source.file = "../secret.md";
    const issues = checkAccessibility(s, catalogRoot);
    expect(issues.some((i) => i.code === "MISSING_FILE")).toBe(true);
  });

  it("resolves the fixture's real files", () => {
    expect(checkAccessibility(loadSidecar(), catalogRoot)).toEqual([]);
  });
});
