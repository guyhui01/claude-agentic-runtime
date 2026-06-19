/**
 * Sidecar manifest types (see schema/sidecar.schema.json, ADR-0003).
 * Source of truth = the JSON Schema; these types are its TypeScript mirror
 * for the loader (brick 0) and the integrity checks.
 */

export type AssetType = "agent" | "skill" | "workflow";

export interface AssetSource {
  /** Relative path of the audited prose file (provenance — ISO 25012 credibility). */
  file: string;
  /** Pinned catalog tag (ADR-0002). */
  catalogTag: string;
}

export interface Asset {
  id: string;
  type: AssetType;
  /** Relative path to the prose file, resolved under catalogRoot. */
  path: string;
  title: string;
  description: string;
  catalogVersion: string;
  source: AssetSource;
  /** Dependency edges (ids of other assets). Absent for a leaf (skill). */
  dependsOn?: string[];
}

export interface Sidecar {
  schemaVersion: string;
  catalog: { name: string; version: string };
  generatedAt: string;
  assets: Asset[];
}
