/**
 * Loader du sidecar (brique 0) — lecture + validation fail-closed (ADR-0004).
 *
 * Pipeline ordonné à court-circuit :
 *   1. lire + parser le JSON            -> stage "parse"
 *   2. valider via ajv contre le schéma -> stage "schema"  (5 caractéristiques ISO 25012)
 *   3. checkIntegrity()                 -> stage "integrity" (les 2 autres + unicité)
 *   4. retourne un Sidecar typé, sinon lève SidecarValidationError.
 *
 * On n'enchaîne pas l'intégrité si le schéma échoue : l'objet n'est pas
 * structurellement fiable, on s'arrête proprement plutôt que de risquer un crash.
 */

import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Ajv2020 } from "ajv/dist/2020.js";
import type { ValidateFunction } from "ajv";
import { checkIntegrity } from "../sidecar/integrity.js";
import type { Sidecar } from "../sidecar/types.js";

export type LoadStage = "parse" | "schema" | "integrity";

export interface LoadIssue {
  stage: LoadStage;
  code: string;
  message: string;
  /** Chemin JSON (schéma) ou id d'asset (intégrité) en cause, si applicable. */
  path?: string;
}

/** Erreur agrégeant TOUS les problèmes détectés (ajv en allErrors + intégrité). */
export class SidecarValidationError extends Error {
  readonly issues: LoadIssue[];

  constructor(issues: LoadIssue[]) {
    const summary = issues.map((i) => `[${i.stage}] ${i.message}`).join(" ; ");
    super(`Sidecar invalide (${issues.length} problème(s)) : ${summary}`);
    this.name = "SidecarValidationError";
    this.issues = issues;
  }
}

const schemaPath = fileURLToPath(
  new URL("../../schema/sidecar.schema.json", import.meta.url),
);

let cachedValidate: ValidateFunction | undefined;

/** Compile le schéma une seule fois (ajv mis en cache au niveau module). */
function getValidator(): ValidateFunction {
  if (cachedValidate !== undefined) return cachedValidate;
  const schema = JSON.parse(readFileSync(schemaPath, "utf-8")) as object;
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const validate = ajv.compile(schema);
  cachedValidate = validate;
  return validate;
}

/**
 * Charge et valide un sidecar. `catalogRoot` (où résoudre les chemins relatifs
 * des assets) vaut par défaut le dossier contenant le sidecar.
 * @throws {SidecarValidationError} si parse, schéma ou intégrité échoue.
 */
export function loadSidecar(
  sidecarPath: string,
  catalogRoot: string = dirname(sidecarPath),
): Sidecar {
  // 1. Lire + parser.
  let raw: string;
  try {
    raw = readFileSync(sidecarPath, "utf-8");
  } catch (err) {
    throw new SidecarValidationError([
      {
        stage: "parse",
        code: "READ_ERROR",
        message: `lecture impossible : ${(err as Error).message}`,
      },
    ]);
  }

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    throw new SidecarValidationError([
      {
        stage: "parse",
        code: "INVALID_JSON",
        message: `JSON malformé : ${(err as Error).message}`,
      },
    ]);
  }

  // 2. Valider contre le schéma (court-circuit si invalide).
  const validate = getValidator();
  if (!validate(data)) {
    const issues = (validate.errors ?? []).map((e): LoadIssue => {
      const issue: LoadIssue = {
        stage: "schema",
        code: e.keyword,
        message: `${e.instancePath || "(racine)"} ${e.message ?? ""}`.trim(),
      };
      if (e.instancePath) issue.path = e.instancePath;
      return issue;
    });
    throw new SidecarValidationError(issues);
  }
  const sidecar = data as Sidecar;

  // 3. Intégrité (exactitude référentielle, accessibilité, unicité).
  const integrityIssues = checkIntegrity(sidecar, catalogRoot).map(
    (i): LoadIssue => ({
      stage: "integrity",
      code: i.code,
      message: i.message,
      path: i.assetId,
    }),
  );
  if (integrityIssues.length > 0) {
    throw new SidecarValidationError(integrityIssues);
  }

  // 4. Sidecar valide et typé.
  return sidecar;
}
