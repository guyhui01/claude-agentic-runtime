import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadSidecar,
  SidecarValidationError,
} from "../src/loader/load-sidecar.js";
import type { Sidecar } from "../src/sidecar/types.js";

const catalogRoot = fileURLToPath(
  new URL("./fixtures/catalog/", import.meta.url),
);
const fixtureSidecar = fileURLToPath(
  new URL("./fixtures/catalog/sidecar.json", import.meta.url),
);

/** Copie fraîche du sidecar de fixture, à dégrader puis écrire en temporaire. */
function freshSidecar(): Sidecar {
  return JSON.parse(readFileSync(fixtureSidecar, "utf-8")) as Sidecar;
}

let tmp: string;
beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), "sidecar-loader-"));
});
afterAll(() => {
  rmSync(tmp, { recursive: true, force: true });
});

function writeJson(name: string, value: unknown): string {
  const p = join(tmp, name);
  writeFileSync(p, JSON.stringify(value), "utf-8");
  return p;
}

function writeRaw(name: string, content: string): string {
  const p = join(tmp, name);
  writeFileSync(p, content, "utf-8");
  return p;
}

/** Exécute fn, exige une SidecarValidationError, la retourne pour inspection. */
function expectError(fn: () => unknown): SidecarValidationError {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(SidecarValidationError);
    return err as SidecarValidationError;
  }
  throw new Error("attendu : SidecarValidationError, mais aucune erreur levée");
}

describe("loadSidecar — chemin nominal", () => {
  it("charge la fixture et retourne un Sidecar typé (catalogRoot par défaut)", () => {
    const sidecar = loadSidecar(fixtureSidecar);
    expect(sidecar.assets).toHaveLength(3);
    expect(sidecar.catalog.version).toBe("v3.25.0");
  });
});

describe("loadSidecar — étape parse", () => {
  it("lève sur fichier inexistant (READ_ERROR)", () => {
    const err = expectError(() => loadSidecar(join(tmp, "absent.json")));
    expect(err.issues[0]!.stage).toBe("parse");
    expect(err.issues[0]!.code).toBe("READ_ERROR");
  });

  it("lève sur JSON malformé (INVALID_JSON)", () => {
    const p = writeRaw("malforme.json", "{ pas du json");
    const err = expectError(() => loadSidecar(p, catalogRoot));
    expect(err.issues[0]!.stage).toBe("parse");
    expect(err.issues[0]!.code).toBe("INVALID_JSON");
  });
});

describe("loadSidecar — étape schéma (court-circuit avant intégrité)", () => {
  it("lève si un champ requis manque, sans exécuter l'intégrité", () => {
    const s = freshSidecar() as Partial<Sidecar>;
    delete s.catalog;
    const p = writeJson("sans-catalog.json", s);
    const err = expectError(() => loadSidecar(p, catalogRoot));
    expect(err.issues.every((i) => i.stage === "schema")).toBe(true);
  });
});

describe("loadSidecar — étape intégrité", () => {
  it("lève sur dependsOn orphelin (DANGLING_REFERENCE)", () => {
    const s = freshSidecar();
    s.assets[2]!.dependsOn = ["AGENT-FANTOME"];
    const p = writeJson("orphelin.json", s);
    const err = expectError(() => loadSidecar(p, catalogRoot));
    expect(err.issues[0]!.stage).toBe("integrity");
    expect(err.issues[0]!.code).toBe("DANGLING_REFERENCE");
  });

  it("lève sur path absent du disque (MISSING_FILE)", () => {
    const s = freshSidecar();
    s.assets[0]!.path = "skills/inexistant/SKILL.md";
    const p = writeJson("path-absent.json", s);
    const err = expectError(() => loadSidecar(p, catalogRoot));
    expect(err.issues[0]!.stage).toBe("integrity");
    expect(err.issues[0]!.code).toBe("MISSING_FILE");
  });
});

describe("loadSidecar — catalogRoot est bien utilisé", () => {
  it("un catalogRoot sans les fichiers fait échouer l'accessibilité", () => {
    // sidecar valide au schéma, mais résolu contre un dossier vide
    const err = expectError(() => loadSidecar(fixtureSidecar, tmp));
    expect(err.issues.every((i) => i.code === "MISSING_FILE")).toBe(true);
  });
});
