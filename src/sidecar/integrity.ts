/**
 * Sidecar integrity checks — the 2 ISO/IEC 25012 characteristics
 * (referential accuracy, accessibility) that a JSON Schema cannot
 * carry on its own, plus global id uniqueness. Reusable by the loader
 * (brick 0): a sidecar with any issue must be rejected at load time.
 */

import { existsSync } from "node:fs";
import { isAbsolute, join, normalize } from "node:path";
import type { Sidecar } from "./types.js";

export type IntegrityIssueCode =
  | "DUPLICATE_ID"
  | "DANGLING_REFERENCE"
  | "MISSING_FILE";

export interface IntegrityIssue {
  code: IntegrityIssueCode;
  message: string;
  assetId: string;
}

/** ISO 25012 — accuracy: global id uniqueness across the whole index. */
export function checkUniqueIds(sidecar: Sidecar): IntegrityIssue[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const asset of sidecar.assets) {
    if (seen.has(asset.id)) duplicates.add(asset.id);
    seen.add(asset.id);
  }
  return [...duplicates].map((id) => ({
    code: "DUPLICATE_ID",
    assetId: id,
    message: `duplicate id: "${id}"`,
  }));
}

/** ISO 25012 — referential accuracy: every dependsOn points to an existing id. */
export function checkReferentialIntegrity(sidecar: Sidecar): IntegrityIssue[] {
  const ids = new Set(sidecar.assets.map((asset) => asset.id));
  const issues: IntegrityIssue[] = [];
  for (const asset of sidecar.assets) {
    for (const dep of asset.dependsOn ?? []) {
      if (!ids.has(dep)) {
        issues.push({
          code: "DANGLING_REFERENCE",
          assetId: asset.id,
          message: `"${asset.id}" depends on a non-existent id: "${dep}"`,
        });
      }
    }
  }
  return issues;
}

/**
 * ISO 25012 — accessibility: every `path` and `source.file` is reachable
 * under `catalogRoot`. Defensive rejection of absolute paths or paths
 * escaping the root (double guard with the schema's anti-traversal pattern).
 */
export function checkAccessibility(
  sidecar: Sidecar,
  catalogRoot: string,
): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  for (const asset of sidecar.assets) {
    for (const relative of [asset.path, asset.source.file]) {
      const normalized = normalize(relative);
      const unreachable =
        isAbsolute(normalized) ||
        normalized.startsWith("..") ||
        !existsSync(join(catalogRoot, normalized));
      if (unreachable) {
        issues.push({
          code: "MISSING_FILE",
          assetId: asset.id,
          message: `file not found under the catalog: "${relative}"`,
        });
      }
    }
  }
  return issues;
}

/** Aggregates the 3 integrity checks. Empty list = sidecar is sound. */
export function checkIntegrity(
  sidecar: Sidecar,
  catalogRoot: string,
): IntegrityIssue[] {
  return [
    ...checkUniqueIds(sidecar),
    ...checkReferentialIntegrity(sidecar),
    ...checkAccessibility(sidecar, catalogRoot),
  ];
}
