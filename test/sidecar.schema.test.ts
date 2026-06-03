import { describe, it, expect, beforeAll } from "vitest";
import Ajv2020 from "ajv/dist/2020";
import type { ValidateFunction } from "ajv";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// On charge le schéma via fs (robuste cross-tooling) plutôt qu'un import JSON.
const schemaPath = fileURLToPath(
  new URL("../schema/sidecar.schema.json", import.meta.url),
);
const schema = JSON.parse(readFileSync(schemaPath, "utf-8"));

let validate: ValidateFunction;

beforeAll(() => {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  validate = ajv.compile(schema);
});

/** Fabrique un manifeste minimal VALIDE ; chaque test le dégrade ponctuellement. */
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
        description: "Rédaction de User Stories INVEST.",
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
  it("accepte un manifeste minimal valide", () => {
    expect(validate(validManifest())).toBe(true);
  });
});

describe("ISO 25012 — complétude (champs requis)", () => {
  it("rejette un asset sans description", () => {
    const m = validManifest();
    delete (m.assets[0] as Record<string, unknown>).description;
    expect(validate(m)).toBe(false);
  });

  it("rejette un titre vide (minLength)", () => {
    const m = validManifest();
    m.assets[0].title = "";
    expect(validate(m)).toBe(false);
  });

  it("rejette une liste d'assets vide (minItems)", () => {
    const m = validManifest();
    m.assets = [];
    expect(validate(m)).toBe(false);
  });
});

describe("ISO 25012 — cohérence (if/then par type)", () => {
  it("rejette un workflow sans dependsOn", () => {
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

  it("rejette un workflow avec dependsOn vide (minItems 1)", () => {
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

  it("accepte un workflow avec au moins une dépendance", () => {
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

  it("rejette un agent sans dependsOn", () => {
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

  it("accepte un skill sans dependsOn (feuille)", () => {
    expect(validate(validManifest())).toBe(true);
  });
});

describe("ISO 25012 — crédibilité (source/provenance)", () => {
  it("rejette un asset sans source", () => {
    const m = validManifest();
    delete (m.assets[0] as Record<string, unknown>).source;
    expect(validate(m)).toBe(false);
  });

  it("rejette une source sans catalogTag", () => {
    const m = validManifest();
    delete (m.assets[0].source as Record<string, unknown>).catalogTag;
    expect(validate(m)).toBe(false);
  });
});

describe("ISO 25012 — actualité (tag + horodatage)", () => {
  it("rejette une version catalogue non épinglée (plage ^)", () => {
    const m = validManifest();
    m.catalog.version = "^3.25.0";
    expect(validate(m)).toBe(false);
  });

  it("rejette un generatedAt mal formé", () => {
    const m = validManifest();
    m.generatedAt = "03/06/2026";
    expect(validate(m)).toBe(false);
  });
});

describe("ISO 25012 — conformité (formats + anti-dérive)", () => {
  it("rejette un type inconnu (hors enum)", () => {
    const m = validManifest();
    m.assets[0].type = "plugin" as never;
    expect(validate(m)).toBe(false);
  });

  it("rejette une propriété additionnelle (additionalProperties:false)", () => {
    const m = validManifest();
    (m.assets[0] as Record<string, unknown>).owner = "Guy";
    expect(validate(m)).toBe(false);
  });
});

describe("ISO 25012 — exactitude (identifiants/chemins bien-formés)", () => {
  it("rejette un id contenant une espace", () => {
    const m = validManifest();
    m.assets[0].id = "skill user stories";
    expect(validate(m)).toBe(false);
  });

  it("rejette un path à '/' initial (absolu)", () => {
    const m = validManifest();
    m.assets[0].path = "/etc/passwd";
    expect(validate(m)).toBe(false);
  });

  it("rejette un path contenant '..' (traversal)", () => {
    const m = validManifest();
    m.assets[0].path = "../secret.md";
    expect(validate(m)).toBe(false);
  });
});

// Les 2 caractéristiques ISO 25012 hors portée d'un JSON Schema (exactitude
// référentielle, accessibilité) + l'unicité des id sont couvertes par
// test/sidecar.integrity.test.ts (fonctions src/sidecar/integrity.ts).
