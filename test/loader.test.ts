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

/** Fresh copy of the fixture sidecar, to degrade then write to a temp file. */
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

/** Runs fn, requires a SidecarValidationError, and returns it for inspection. */
function expectError(fn: () => unknown): SidecarValidationError {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(SidecarValidationError);
    return err as SidecarValidationError;
  }
  throw new Error("expected: SidecarValidationError, but no error was thrown");
}

describe("loadSidecar — happy path", () => {
  it("loads the fixture and returns a typed Sidecar (default catalogRoot)", () => {
    const sidecar = loadSidecar(fixtureSidecar);
    expect(sidecar.assets).toHaveLength(3);
    expect(sidecar.catalog.version).toBe("v3.25.0");
  });
});

describe("loadSidecar — parse stage", () => {
  it("throws on a nonexistent file (READ_ERROR)", () => {
    const err = expectError(() => loadSidecar(join(tmp, "absent.json")));
    expect(err.issues[0]!.stage).toBe("parse");
    expect(err.issues[0]!.code).toBe("READ_ERROR");
  });

  it("throws on malformed JSON (INVALID_JSON)", () => {
    const p = writeRaw("malformed.json", "{ not json");
    const err = expectError(() => loadSidecar(p, catalogRoot));
    expect(err.issues[0]!.stage).toBe("parse");
    expect(err.issues[0]!.code).toBe("INVALID_JSON");
  });
});

describe("loadSidecar — schema stage (short-circuits before integrity)", () => {
  it("throws if a required field is missing, without running integrity", () => {
    const s = freshSidecar() as Partial<Sidecar>;
    delete s.catalog;
    const p = writeJson("without-catalog.json", s);
    const err = expectError(() => loadSidecar(p, catalogRoot));
    expect(err.issues.every((i) => i.stage === "schema")).toBe(true);
  });
});

describe("loadSidecar — integrity stage", () => {
  it("throws on a dangling dependsOn (DANGLING_REFERENCE)", () => {
    const s = freshSidecar();
    s.assets[2]!.dependsOn = ["AGENT-PHANTOM"];
    const p = writeJson("dangling.json", s);
    const err = expectError(() => loadSidecar(p, catalogRoot));
    expect(err.issues[0]!.stage).toBe("integrity");
    expect(err.issues[0]!.code).toBe("DANGLING_REFERENCE");
  });

  it("throws when a path is missing from disk (MISSING_FILE)", () => {
    const s = freshSidecar();
    s.assets[0]!.path = "skills/nonexistent/SKILL.md";
    const p = writeJson("missing-path.json", s);
    const err = expectError(() => loadSidecar(p, catalogRoot));
    expect(err.issues[0]!.stage).toBe("integrity");
    expect(err.issues[0]!.code).toBe("MISSING_FILE");
  });
});

describe("loadSidecar — catalogRoot is actually used", () => {
  it("a catalogRoot without the files fails accessibility", () => {
    // schema-valid sidecar, but resolved against an empty folder
    const err = expectError(() => loadSidecar(fixtureSidecar, tmp));
    expect(err.issues.every((i) => i.code === "MISSING_FILE")).toBe(true);
  });
});
