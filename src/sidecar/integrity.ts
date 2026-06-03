/**
 * Contrôles d'intégrité du sidecar — les 2 caractéristiques ISO/IEC 25012
 * (exactitude référentielle, accessibilité) qu'un JSON Schema ne peut pas
 * porter seul, plus l'unicité globale des id. Réutilisable par le loader
 * (brique 0) : un sidecar présentant une issue doit être rejeté au chargement.
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

/** ISO 25012 — exactitude : unicité globale des id sur tout l'index. */
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
    message: `id dupliqué : "${id}"`,
  }));
}

/** ISO 25012 — exactitude référentielle : chaque dependsOn pointe vers un id existant. */
export function checkReferentialIntegrity(sidecar: Sidecar): IntegrityIssue[] {
  const ids = new Set(sidecar.assets.map((asset) => asset.id));
  const issues: IntegrityIssue[] = [];
  for (const asset of sidecar.assets) {
    for (const dep of asset.dependsOn ?? []) {
      if (!ids.has(dep)) {
        issues.push({
          code: "DANGLING_REFERENCE",
          assetId: asset.id,
          message: `"${asset.id}" dépend d'un id inexistant : "${dep}"`,
        });
      }
    }
  }
  return issues;
}

/**
 * ISO 25012 — accessibilité : chaque `path` et `source.file` est joignable
 * sous `catalogRoot`. Refus défensif des chemins absolus ou remontant hors du
 * root (double garde avec le pattern anti-traversal du schéma).
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
          message: `fichier introuvable sous le catalogue : "${relative}"`,
        });
      }
    }
  }
  return issues;
}

/** Agrège les 3 contrôles d'intégrité. Liste vide = sidecar intègre. */
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
