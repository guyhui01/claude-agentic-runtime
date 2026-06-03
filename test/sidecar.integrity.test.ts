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

// Mini-catalogue factice, hermétique : aucun lien avec le vrai claude-agents.
const catalogRoot = fileURLToPath(
  new URL("./fixtures/catalog/", import.meta.url),
);
const sidecarPath = fileURLToPath(
  new URL("./fixtures/catalog/sidecar.json", import.meta.url),
);

/** Recharge une copie fraîche du sidecar de fixture (chaque test la dégrade). */
function loadSidecar(): Sidecar {
  return JSON.parse(readFileSync(sidecarPath, "utf-8")) as Sidecar;
}

describe("intégrité — chemin nominal", () => {
  it("la fixture est intègre (aucune issue)", () => {
    expect(checkIntegrity(loadSidecar(), catalogRoot)).toEqual([]);
  });
});

describe("ISO 25012 — exactitude : unicité des id", () => {
  it("détecte un id dupliqué", () => {
    const s = loadSidecar();
    const first = s.assets[0]!;
    s.assets.push({ ...first });
    const issues = checkUniqueIds(s);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.code).toBe("DUPLICATE_ID");
    expect(issues[0]!.assetId).toBe(first.id);
  });

  it("ne signale rien quand les id sont uniques", () => {
    expect(checkUniqueIds(loadSidecar())).toEqual([]);
  });
});

describe("ISO 25012 — exactitude référentielle", () => {
  it("détecte un dependsOn vers un id inexistant", () => {
    const s = loadSidecar();
    s.assets[2]!.dependsOn = ["AGENT-FANTOME"];
    const issues = checkReferentialIntegrity(s);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.code).toBe("DANGLING_REFERENCE");
    expect(issues[0]!.assetId).toBe("WF-001");
  });

  it("accepte des dépendances résolues", () => {
    expect(checkReferentialIntegrity(loadSidecar())).toEqual([]);
  });
});

describe("ISO 25012 — accessibilité", () => {
  it("détecte un path absent du disque", () => {
    const s = loadSidecar();
    s.assets[0]!.path = "skills/inexistant/SKILL.md";
    const issues = checkAccessibility(s, catalogRoot);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.code).toBe("MISSING_FILE");
  });

  it("refuse défensivement un chemin remontant hors du catalogue", () => {
    const s = loadSidecar();
    s.assets[0]!.source.file = "../secret.md";
    const issues = checkAccessibility(s, catalogRoot);
    expect(issues.some((i) => i.code === "MISSING_FILE")).toBe(true);
  });

  it("résout les fichiers réels de la fixture", () => {
    expect(checkAccessibility(loadSidecar(), catalogRoot)).toEqual([]);
  });
});
