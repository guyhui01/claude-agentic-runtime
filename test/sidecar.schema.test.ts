import { describe, it, expect, beforeAll } from "vitest";
import Ajv2020 from "ajv/dist/2020";
import type { ValidateFunction } from "ajv";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Load the schema via fs (robust cross-tooling) rather than a JSON import.
const schemaPath = fileURLToPath(
  new URL("../schema/sidecar.schema.json", import.meta.url),
);
const schema = JSON.parse(readFileSync(schemaPath, "utf-8"));

let validate: ValidateFunction;

beforeAll(() => {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  validate = ajv.compile(schema);
});

/** Builds a minimal VALID manifest; each test degrades it locally. */
function validManifest() {
  return {
    schemaVersion: "1.0.0",
    catalog: { name: "claude-agents", version: "v3.25.0" },
    generatedAt: "2026-06-03T14:21:18Z",
    assets: [
      {
        id: "skill-user-stories",
        type: "skill",
        path: "skills/user-stories/SKILL.md",
        title: "User Stories",
        description: "INVEST User Stories writing.",
        catalogVersion: "v3.25.0",
        source: {
          file: "skills/user-stories/SKILL.md",
          catalogTag: "v3.25.0",
        },
      },
    ],
  };
}

describe("sidecar — base", () => {
  it("accepts a minimal valid manifest", () => {
    expect(validate(validManifest())).toBe(true);
  });
});

describe("ISO 25012 — completeness (required fields)", () => {
  it("rejects an asset without a description", () => {
    const m = validManifest();
    delete (m.assets[0] as Record<string, unknown>).description;
    expect(validate(m)).toBe(false);
  });

  it("rejects an empty title (minLength)", () => {
    const m = validManifest();
    m.assets[0].title = "";
    expect(validate(m)).toBe(false);
  });

  it("rejects an empty assets list (minItems)", () => {
    const m = validManifest();
    m.assets = [];
    expect(validate(m)).toBe(false);
  });
});

describe("ISO 25012 — consistency (if/then by type)", () => {
  it("rejects a workflow without dependsOn", () => {
    const m = validManifest();
    m.assets[0] = {
      ...m.assets[0],
      id: "WF-001",
      type: "workflow",
      path: "workflows/WF-001.md",
      source: { file: "workflows/WF-001.md", catalogTag: "v3.25.0" },
    };
    expect(validate(m)).toBe(false);
  });

  it("rejects a workflow with an empty dependsOn (minItems 1)", () => {
    const m = validManifest();
    m.assets[0] = {
      ...m.assets[0],
      id: "WF-001",
      type: "workflow",
      path: "workflows/WF-001.md",
      source: { file: "workflows/WF-001.md", catalogTag: "v3.25.0" },
      dependsOn: [],
    } as never;
    expect(validate(m)).toBe(false);
  });

  it("accepts a workflow with at least one dependency", () => {
    const m = validManifest();
    m.assets[0] = {
      ...m.assets[0],
      id: "WF-001",
      type: "workflow",
      path: "workflows/WF-001.md",
      source: { file: "workflows/WF-001.md", catalogTag: "v3.25.0" },
      dependsOn: ["AGENT-CADRAGE"],
    } as never;
    expect(validate(m)).toBe(true);
  });

  it("rejects an agent without dependsOn", () => {
    const m = validManifest();
    m.assets[0] = {
      ...m.assets[0],
      id: "AGENT-CADRAGE",
      type: "agent",
      path: "AGENT-CADRAGE.md",
      source: { file: "AGENT-CADRAGE.md", catalogTag: "v3.25.0" },
    };
    expect(validate(m)).toBe(false);
  });

  it("accepts a skill without dependsOn (leaf)", () => {
    expect(validate(validManifest())).toBe(true);
  });
});

describe("ISO 25012 — credibility (source/provenance)", () => {
  it("rejects an asset without a source", () => {
    const m = validManifest();
    delete (m.assets[0] as Record<string, unknown>).source;
    expect(validate(m)).toBe(false);
  });

  it("rejects a source without catalogTag", () => {
    const m = validManifest();
    delete (m.assets[0].source as Record<string, unknown>).catalogTag;
    expect(validate(m)).toBe(false);
  });
});

describe("ISO 25012 — currency (tag + timestamp)", () => {
  it("rejects an unpinned catalog version (^ range)", () => {
    const m = validManifest();
    m.catalog.version = "^3.25.0";
    expect(validate(m)).toBe(false);
  });

  it("rejects a malformed generatedAt", () => {
    const m = validManifest();
    m.generatedAt = "03/06/2026";
    expect(validate(m)).toBe(false);
  });
});

describe("ISO 25012 — compliance (formats + drift guard)", () => {
  it("rejects an unknown type (out of enum)", () => {
    const m = validManifest();
    m.assets[0].type = "plugin" as never;
    expect(validate(m)).toBe(false);
  });

  it("rejects an additional property (additionalProperties:false)", () => {
    const m = validManifest();
    (m.assets[0] as Record<string, unknown>).owner = "Guy";
    expect(validate(m)).toBe(false);
  });
});

describe("ISO 25012 — accuracy (well-formed identifiers/paths)", () => {
  it("rejects an id containing a space", () => {
    const m = validManifest();
    m.assets[0].id = "skill user stories";
    expect(validate(m)).toBe(false);
  });

  it("rejects a path with a leading '/' (absolute)", () => {
    const m = validManifest();
    m.assets[0].path = "/etc/passwd";
    expect(validate(m)).toBe(false);
  });

  it("rejects a path containing '..' (traversal)", () => {
    const m = validManifest();
    m.assets[0].path = "../secret.md";
    expect(validate(m)).toBe(false);
  });
});

// The 2 ISO 25012 characteristics out of a JSON Schema's reach (referential
// accuracy, accessibility) + id uniqueness are covered by
// test/sidecar.integrity.test.ts (src/sidecar/integrity.ts functions).
