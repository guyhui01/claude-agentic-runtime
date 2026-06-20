import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadSidecar } from "../src/loader/load-sidecar.js";
import { toAgentDefinition } from "../src/sdk/to-agent-definition.js";
import type { Asset } from "../src/sidecar/types.js";

const catalogRoot = fileURLToPath(
  new URL("./fixtures/catalog/", import.meta.url),
);
const fixtureSidecar = fileURLToPath(
  new URL("./fixtures/catalog/sidecar.json", import.meta.url),
);

const sidecar = loadSidecar(fixtureSidecar);
const agentAsset = sidecar.assets.find((a) => a.type === "agent")!;
const skillAsset = sidecar.assets.find((a) => a.type === "skill")!;

describe("toAgentDefinition — adaptateur catalogue → SDK (§2.4-A)", () => {
  it("mappe un asset agent vers AgentDefinition (prompt = prose du .md)", () => {
    const def = toAgentDefinition(agentAsset, catalogRoot);
    expect(def.description).toBe(agentAsset.description);
    const prose = readFileSync(join(catalogRoot, agentAsset.path), "utf-8");
    expect(def.prompt).toBe(prose);
    expect(def.prompt).toContain("Scoping Agent");
  });

  it("applique des défauts read-only (ADR-0001) sans déclaration catalogue", () => {
    const def = toAgentDefinition(agentAsset, catalogRoot);
    expect(def.tools).toEqual(["Read", "Grep", "Glob"]);
  });

  it("respecte les overrides (model, tools, maxTurns)", () => {
    const def = toAgentDefinition(agentAsset, catalogRoot, {
      model: "claude-opus-4-8",
      tools: ["Read"],
      maxTurns: 5,
    });
    expect(def.model).toBe("claude-opus-4-8");
    expect(def.tools).toEqual(["Read"]);
    expect(def.maxTurns).toBe(5);
  });

  it("refuse un asset non-agent (skill)", () => {
    expect(() => toAgentDefinition(skillAsset, catalogRoot)).toThrow();
  });

  it("refuse un chemin remontant hors catalogue (anti-traversal)", () => {
    const piege: Asset = { ...agentAsset, path: "../secret.md" };
    expect(() => toAgentDefinition(piege, catalogRoot)).toThrow();
  });
});
