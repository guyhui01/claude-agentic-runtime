/**
 * Types du manifeste sidecar (cf. schema/sidecar.schema.json, ADR-0003).
 * Source de vérité = le JSON Schema ; ces types en sont le miroir TypeScript
 * pour le loader (brique 0) et les contrôles d'intégrité.
 */

export type AssetType = "agent" | "skill" | "workflow";

export interface AssetSource {
  /** Chemin relatif du fichier prose audité (provenance — ISO 25012 crédibilité). */
  file: string;
  /** Tag épinglé du catalogue (ADR-0002). */
  catalogTag: string;
}

export interface Asset {
  id: string;
  type: AssetType;
  /** Chemin relatif vers le fichier prose, résolu sous le catalogRoot. */
  path: string;
  title: string;
  description: string;
  catalogVersion: string;
  source: AssetSource;
  /** Arêtes de dépendance (ids d'autres assets). Absent pour une feuille (skill). */
  dependsOn?: string[];
}

export interface Sidecar {
  schemaVersion: string;
  catalog: { name: string; version: string };
  generatedAt: string;
  assets: Asset[];
}
