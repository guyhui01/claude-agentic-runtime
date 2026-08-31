import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * ADR-0011 clause (b), mechanical enforcement — "no vendor coupling may cross
 * into the core."
 *
 * Adapter layer = src/sdk/. Core = every other directory under src/. A RUNTIME
 * dependency on a vendor package (@anthropic-ai/*) anywhere in the core is a
 * violation; a TYPE-ONLY import (`import type ...`), erased before execution, is
 * not (ADR-0011 §3).
 *
 * This test can FAIL (negative control, ADR-0011 doctrine applied to itself):
 * add a value import `import { query } from "@anthropic-ai/claude-agent-sdk"` to
 * any core file and the first assertion goes red. Do not commit that mutation.
 */

const srcRoot = fileURLToPath(new URL("../src/", import.meta.url));
const ADAPTER_DIR = "sdk"; // the only legitimate vendor-runtime home (ADR-0011 §3)
const VENDOR = /from\s+["']@anthropic-ai\/[^"']+["']/;

function tsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...tsFiles(full));
    else if (entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

const coreFiles = tsFiles(srcRoot).filter(
  (f) => !relative(srcRoot, f).split("/").includes(ADAPTER_DIR),
);

type VendorImport = { file: string; line: number; typeOnly: boolean };

const vendorImports: VendorImport[] = [];
for (const file of coreFiles) {
  const lines = readFileSync(file, "utf-8").split("\n");
  lines.forEach((text, i) => {
    if (!VENDOR.test(text)) return;
    // `import type ...` is erased at runtime; a value import couples the core.
    const typeOnly = /^\s*import\s+type\b/.test(text);
    vendorImports.push({ file: relative(srcRoot, file), line: i + 1, typeOnly });
  });
}

describe("ADR-0011 §3 — adapter/core boundary (clause b)", () => {
  it("no core file has a RUNTIME (value) vendor import — the line that must not be crossed", () => {
    const violations = vendorImports.filter((v) => !v.typeOnly);
    expect(violations).toEqual([]);
  });

  it("the tolerated type-only carve-out is exactly the three recorded files, so a fourth surfaces for a decision", () => {
    const carveOut = vendorImports
      .filter((v) => v.typeOnly)
      .map((v) => v.file)
      .sort();
    expect(carveOut).toEqual([
      "dispatch/run-dispatch.ts",
      "manifest/load-manifest.ts",
      "orchestrator/types.ts",
    ]);
  });
});
