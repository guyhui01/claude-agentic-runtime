/**
 * Validation des contrats de handoff (brique 1) — réutilise le pattern ajv du
 * loader (brique 0) : ajv2020, allErrors, issues agrégées, fail-closed.
 *
 * Deux niveaux, complémentaires (ADR-0004 : « validation statique + fail-closed ») :
 *   - checkContractCompatibility(producer, consumer) : STATIQUE (design-time).
 *       Chaque champ `required` de l'entrée aval est-il promis par la sortie amont ?
 *       Ne lève pas : retourne la liste des manques (vide = compatible).
 *   - validateHandoff(producer, consumer, payload) : RUNTIME.
 *       Le payload satisfait-il la sortie promise (amont) ET l'entrée attendue
 *       (aval) ? Fail-closed : lève en agrégeant TOUTES les issues des deux côtés.
 *
 * Limite assumée (cf. ADR-0004, note d'honnêteté) : la vérification statique est
 * *shallow* — présence des champs requis de 1er niveau seulement. Elle ne prouve
 * ni l'équivalence sémantique ni la compatibilité de types imbriqués. Promettre
 * l'infaillibilité serait un faux signal ; la validation runtime reste le garde-fou.
 */

import { Ajv2020 } from "ajv/dist/2020.js";
import type { ValidateFunction } from "ajv";
import type {
  JsonSchema,
  StepContract,
  HandoffIssue,
  HandoffStage,
} from "./types.js";

/** Erreur agrégeant tous les problèmes d'un handoff (amont + aval). */
export class HandoffValidationError extends Error {
  readonly issues: HandoffIssue[];

  constructor(issues: HandoffIssue[]) {
    const summary = issues.map((i) => `[${i.stage}] ${i.message}`).join(" ; ");
    super(`Handoff invalide (${issues.length} problème(s)) : ${summary}`);
    this.name = "HandoffValidationError";
    this.issues = issues;
  }
}

// Une instance ajv partagée ; un validateur compilé une fois par schéma
// (cache par identité d'objet — les contrats sont des objets stables).
const ajv = new Ajv2020({ allErrors: true, strict: true });
const cache = new WeakMap<JsonSchema, ValidateFunction>();

function getValidator(schema: JsonSchema): ValidateFunction {
  let validate = cache.get(schema);
  if (validate === undefined) {
    validate = ajv.compile(schema);
    cache.set(schema, validate);
  }
  return validate;
}

/** Convertit les erreurs ajv d'une étape en issues de handoff typées. */
function toIssues(
  validate: ValidateFunction,
  stage: HandoffStage,
  stepId: string,
): HandoffIssue[] {
  return (validate.errors ?? []).map((e): HandoffIssue => {
    const issue: HandoffIssue = {
      stage,
      code: e.keyword,
      message: `${stepId}${e.instancePath || ""} ${e.message ?? ""}`.trim(),
    };
    if (e.instancePath) issue.path = e.instancePath;
    return issue;
  });
}

/**
 * STATIQUE — vérifie que la sortie promise par l'amont couvre l'entrée requise
 * par l'aval (présence des champs `required` de 1er niveau dans les `properties`
 * de la sortie amont). Un aval sans `input` est compatible par construction.
 * @returns la liste des champs requis non promis (vide = compatible).
 */
export function checkContractCompatibility(
  producer: StepContract,
  consumer: StepContract,
): HandoffIssue[] {
  const input = consumer.input;
  if (input === undefined) return []; // aval d'amorce : rien à garantir

  const required = Array.isArray(input["required"])
    ? (input["required"] as string[])
    : [];
  const outProps = producer.output["properties"];
  const promised = new Set(
    outProps && typeof outProps === "object"
      ? Object.keys(outProps as Record<string, unknown>)
      : [],
  );

  const issues: HandoffIssue[] = [];
  for (const field of required) {
    if (!promised.has(field)) {
      issues.push({
        stage: "compat",
        code: "MISSING_PRODUCED_FIELD",
        message: `l'aval "${consumer.stepId}" requiert "${field}", non promis par la sortie de "${producer.stepId}"`,
        path: field,
      });
    }
  }
  return issues;
}

/**
 * RUNTIME — valide un payload réel au franchissement amont→aval, fail-closed :
 *   1. payload conforme à `producer.output` (l'amont tient sa promesse) ;
 *   2. payload conforme à `consumer.input`  (l'aval accepte ce qu'il reçoit).
 * Les issues des deux étapes sont agrégées avant de lever.
 * @throws {HandoffValidationError} si l'une des deux validations échoue.
 */
export function validateHandoff(
  producer: StepContract,
  consumer: StepContract,
  payload: unknown,
): void {
  const issues: HandoffIssue[] = [];

  const outValidate = getValidator(producer.output);
  if (!outValidate(payload)) {
    issues.push(...toIssues(outValidate, "producer-output", producer.stepId));
  }

  if (consumer.input !== undefined) {
    const inValidate = getValidator(consumer.input);
    if (!inValidate(payload)) {
      issues.push(...toIssues(inValidate, "consumer-input", consumer.stepId));
    }
  }

  if (issues.length > 0) throw new HandoffValidationError(issues);
}
