/**
 * Adaptateur `query()` → `StepRunner` (§2.4-B.3, étape 2). Enveloppe la fonction
 * `query()` du Claude Agent SDK derrière l'interface `StepRunner` de
 * l'orchestrateur (§2.4-B.1), pour permettre le run LIVE de la spine sans
 * toucher au cœur de `runSpine` (qui reste pur).
 *
 * Injection de dépendance : `query` est injectable (défaut = le vrai `query` du
 * SDK), ce qui rend la factory testable HORS-LIGNE (faux `query` → AsyncIterable
 * de messages, zéro réseau), comme le reste du repo.
 *
 * Gardes fail-closed NON négociables (cf. memory `feedback-budget-quota-abonnement`,
 * ADR-0001 read-only, posture ISO 19011) :
 *   1. ANTHROPIC_API_KEY défini ⇒ refus AVANT tout appel (OAuth abonnement
 *      uniquement, jamais de clé métrée → pas de facturation au token).
 *   2. `permissionMode: "plan"` FORCÉ (read-only, non surchargeable).
 *   3. Caps DURS par étape (`maxBudgetUsd` bas + `maxTurns` faible), jamais
 *      dépassés même si l'agent en demande davantage.
 *   4. Tout résultat non-`success` (budget/tours/erreur) ⇒ on lève (fail-closed).
 *
 * Format de sortie IMPOSÉ (§2.4-B.3) : quand l'appel porte un `outputSchema`
 * (= `contract.output`), le runner ajoute au prompt une instruction « réponds
 * UNIQUEMENT par un JSON conforme à ce schéma », puis PARSE la réponse en objet.
 * Une réponse non parsable en objet ⇒ on lève (fail-closed) : c'est la brique qui
 * permet aux eval gates / handoffs (qui attendent des objets) de s'appliquer au
 * live. Sans `outputSchema`, comportement inchangé (sortie texte brute).
 */

import { query as sdkQuery } from "@anthropic-ai/claude-agent-sdk";
import type {
  Options,
  SDKMessage,
  SDKResultMessage,
} from "@anthropic-ai/claude-agent-sdk";
import type {
  StepRunner,
  StepRunCall,
  StepRunResult,
} from "../orchestrator/types.js";

/** Erreur d'exécution du runner (garde fail-closed ou échec de run). */
export class QueryRunnerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QueryRunnerError";
  }
}

/** Plafonds DURS appliqués à CHAQUE étape — jamais dépassés. */
export interface QueryRunnerCaps {
  /** Budget maximum par étape, en USD. */
  maxBudgetUsd: number;
  /** Nombre maximum de tours (round-trips API) par étape. */
  maxTurns: number;
}

/** Défauts conservateurs (POC solo, run observé). Surchargeables via `deps.caps`. */
export const DEFAULT_CAPS: QueryRunnerCaps = {
  maxBudgetUsd: 1.0,
  maxTurns: 8,
};

/** Instruction de format ajoutée au prompt quand un `outputSchema` est fourni. */
function formatInstruction(schema: object): string {
  return (
    "\n\n---\n" +
    "FORMAT DE SORTIE IMPOSÉ : réponds UNIQUEMENT par un objet JSON valide — " +
    "aucun texte, aucune explication, aucune balise hors du JSON — STRICTEMENT " +
    "conforme à ce JSON Schema :\n" +
    JSON.stringify(schema)
  );
}

/**
 * Parse une réponse texte en objet JSON (fail-closed). Tolère un objet JSON nu,
 * une clôture ```json … ``` ou du bruit autour de l'objet. Lève si rien d'exploitable.
 */
export function parseJsonObject(text: string, stepId: string): object {
  const tryParse = (s: string): unknown => {
    try {
      return JSON.parse(s);
    } catch {
      return undefined;
    }
  };
  const trimmed = text.trim();
  let parsed: unknown = tryParse(trimmed);
  if (parsed === undefined) {
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) parsed = tryParse(fence[1]!.trim());
  }
  if (parsed === undefined) {
    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");
    if (first !== -1 && last > first) parsed = tryParse(trimmed.slice(first, last + 1));
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new QueryRunnerError(
      `étape "${stepId}" : réponse non conforme au format imposé — objet JSON attendu, ` +
        `reçu du contenu non parsable en objet.`,
    );
  }
  return parsed;
}

/**
 * Signature minimale du `query()` injecté : une étape entre (prompt + options),
 * un flux de messages sort. Compatible avec le `query` réel du SDK.
 */
export type QueryFn = (params: {
  prompt: string;
  options?: Options;
}) => AsyncIterable<SDKMessage>;

export interface QueryRunnerDeps {
  /** `query()` à utiliser (défaut = celui du SDK). Injecté en test. */
  query?: QueryFn;
  /** Environnement lu pour la garde anti-clé (défaut = `process.env`). */
  env?: Record<string, string | undefined>;
  /** Surcharge des plafonds durs (défaut = `DEFAULT_CAPS`). */
  caps?: Partial<QueryRunnerCaps>;
}

/**
 * Construit un `StepRunner` enveloppant `query()`. Le runner renvoyé applique
 * les 4 gardes ci-dessus à chaque étape, puis extrait la sortie du message
 * `type:"result"` (succès) ou lève (fail-closed).
 */
export function createQueryRunner(deps: QueryRunnerDeps = {}): StepRunner {
  const query: QueryFn = deps.query ?? (sdkQuery as unknown as QueryFn);
  const env = deps.env ?? process.env;
  const caps: QueryRunnerCaps = { ...DEFAULT_CAPS, ...deps.caps };

  return async function queryRunner(
    call: StepRunCall,
  ): Promise<StepRunResult> {
    // Garde 1 : jamais de clé API métrée — OAuth abonnement uniquement.
    if (env.ANTHROPIC_API_KEY) {
      throw new QueryRunnerError(
        `étape "${call.stepId}" : ANTHROPIC_API_KEY défini — exécution refusée ` +
          `(OAuth abonnement uniquement, jamais de clé métrée ; cf. règle budget).`,
      );
    }

    const { agent, input } = call;
    let promptText = typeof input === "string" ? input : JSON.stringify(input);
    // Format imposé : on instruit l'agent de produire le JSON attendu par l'étape.
    if (call.outputSchema !== undefined) {
      promptText += formatInstruction(call.outputSchema);
    }

    // Caps DURS : on plafonne TOUJOURS, même si l'agent demande davantage.
    const maxTurns = Math.min(agent.maxTurns ?? caps.maxTurns, caps.maxTurns);

    const options: Options = {
      systemPrompt: agent.prompt,
      maxTurns,
      maxBudgetUsd: caps.maxBudgetUsd,
      // Garde 2 : read-only forcé (ADR-0001), non surchargeable par l'agent.
      permissionMode: "plan",
    };
    if (agent.tools) options.allowedTools = agent.tools;
    if (agent.disallowedTools) options.disallowedTools = agent.disallowedTools;
    if (agent.model) options.model = agent.model;

    let result: SDKResultMessage | undefined;
    for await (const message of query({ prompt: promptText, options })) {
      if (message.type === "result") {
        result = message;
        break;
      }
    }

    // Garde 4 : flux sans résultat, ou résultat d'erreur ⇒ fail-closed.
    if (!result) {
      throw new QueryRunnerError(
        `étape "${call.stepId}" : flux terminé sans message de résultat`,
      );
    }
    if (result.subtype !== "success") {
      const details =
        result.errors.length > 0 ? ` : ${result.errors.join(" ; ")}` : "";
      throw new QueryRunnerError(
        `étape "${call.stepId}" : run échoué (${result.subtype})${details}`,
      );
    }

    // Succès. Priorité à la sortie structurée native du SDK si présente. Sinon,
    // si un format est imposé, on PARSE le texte en objet (fail-closed) ; à défaut,
    // on rend le texte brut (comportement historique).
    let output: unknown;
    if (result.structured_output !== undefined) {
      output = result.structured_output;
    } else if (call.outputSchema !== undefined) {
      output = parseJsonObject(result.result, call.stepId);
    } else {
      output = result.result;
    }
    return { output };
  };
}
