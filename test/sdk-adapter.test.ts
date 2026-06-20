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

describe("toAgentDefinition — catalog → SDK adapter (§2.4-A)", () => {
  it("maps an agent asset to AgentDefinition (prompt = .md prose)", () => {
    const def = toAgentDefinition(agentAsset, catalogRoot);
    expect(def.description).toBe(agentAsset.description);
    const prose = readFileSync(join(catalogRoot, agentAsset.path), "utf-8");
    expect(def.prompt).toBe(prose);
    expect(def.prompt).toContain("Scoping Agent");
  });

  it("applies read-only defaults (ADR-0001) without a catalog declaration", () => {
    const def = toAgentDefinition(agentAsset, catalogRoot);
    expect(def.tools).toEqual(["Read", "Grep", "Glob"]);
  });

  it("respects overrides (model, tools, maxTurns)", () => {
    const def = toAgentDefinition(agentAsset, catalogRoot, {
      model: "claude-opus-4-8",
      tools: ["Read"],
      maxTurns: 5,
    });
    expect(def.model).toBe("claude-opus-4-8");
    expect(def.tools).toEqual(["Read"]);
    expect(def.maxTurns).toBe(5);
  });

  it("rejects a non-agent asset (skill)", () => {
    expect(() => toAgentDefinition(skillAsset, catalogRoot)).toThrow();
  });

  it("rejects a path escaping the catalog (anti-traversal)", () => {
    const piege: Asset = { ...agentAsset, path: "../secret.md" };
    expect(() => toAgentDefinition(piege, catalogRoot)).toThrow();
  });
});
