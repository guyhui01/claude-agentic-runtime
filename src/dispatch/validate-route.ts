/**
 * Deterministic validation of the router LLM's proposal (router draft §3) —
 * the LLM proposes, THIS code disposes, the human decides. Fail-closed at
 * every step; no LLM ever evaluates the proposal (ADR-0007).
 *
 * Order: strict shape (ajv) → id exists in the sidecar as a workflow →
 * `dependsOn` all resolvable → manifest-driven param check. NO_MATCH and
 * PARAMS_MISSING come out as valid decisions; only an output the pipeline
 * cannot trust (malformed, invented id, broken dependency) is rejected.
 */

import { Ajv2020 } from "ajv/dist/2020.js";
import { affirmativeString } from "../spines/spine-helpers.js";
import type { ValidateFunction } from "ajv";
import type { Sidecar } from "../sidecar/types.js";
import type {
  NeedBrief,
  ParamManifest,
  RouteDecision,
  RouteIssue,
  RouterOutput,
} from "./types.js";

/** Strict JSON Schema of the router's answer (router draft §2). */
export const ROUTER_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["proposedRoute", "rationale", "nearestMiss"],
  properties: {
    proposedRoute: { type: "string" },
    rationale: { type: "string" },
    nearestMiss: { type: ["string", "null"] },
  },
} as const;

const ajv = new Ajv2020({ allErrors: true, strict: true });
let compiled: ValidateFunction | undefined;

function getValidator(): ValidateFunction {
  compiled ??= ajv.compile(ROUTER_OUTPUT_SCHEMA as unknown as Record<string, unknown>);
  return compiled;
}

/** Parses the raw router answer; issues (empty = shape-valid) aggregate all ajv errors. */
export function parseRouterOutput(raw: unknown): {
  output?: RouterOutput;
  issues: RouteIssue[];
} {
  const validate = getValidator();
  if (validate(raw)) return { output: raw as RouterOutput, issues: [] };
  const issues = (validate.errors ?? []).map(
    (e): RouteIssue => ({
      code: "MALFORMED_OUTPUT",
      message: `router output${e.instancePath ? ` ${e.instancePath}` : ""} ${e.message ?? "invalid"}`.trim(),
    }),
  );
  return { issues };
}

/**
 * One workflow param against the brief — `true` when deterministically filled.
 *
 * Fail-closed on the detector itself: a spec with no `pattern` and no
 * `defaultValue` is reported MISSING, never accepted on "the mapped text is
 * non-empty". Most card params map onto the same shared brief fields, so an
 * emptiness test would pass a whole card on one sentence of context — a false
 * "filled", the unsafe direction. A spec that genuinely cannot be missing
 * declares it with `defaultValue`.
 *
 * Exported for `scripts/measure-manifest.ts`. That instrument reports which
 * specs a brief fills, so it must read THIS verdict rather than re-implement
 * it — a measurement that reproduces the rule it describes drifts from it
 * silently, and would then describe a check that is not the one running.
 */
/**
 * `true` when the brief ANSWERS this parameter by naming it — the `Label: value`
 * form the catalog's own quick-start blocks teach the operator to write
 * ("- Engagement type: [to fill in]", "- Audit origin: [Preventive / Inspection
 * / Due diligence]").
 *
 * WHY THIS EXISTS. Card values are ordinary English — Scoping, Build, Training,
 * Support, Team, Neutral, Demo — so every detector narrows them to a qualified
 * form ("a scoping engagement"), which is right for PROSE and wrong for the form
 * the card teaches. Measured across the eight manifests: 22 card values were
 * refused when written the way the card writes them, and the mismatch is between
 * the catalog and this runtime, not inside either. Patching 22 regular
 * expressions would encode the same rule twenty-two times; this reads the label
 * the specification already carries.
 *
 * TWO GUARDS, both load-bearing:
 *   - A CONJUNCTION'S LINE LABEL ANSWERS ITS `(name)` HALF AND NOTHING ELSE.
 *     "Client: Acme" says WHICH company — that IS the name half, and it is the
 *     one fact the label designates. Sector, size, geographic footprint, Art. 9
 *     category are ADDITIONAL facts the label does not state, so they stay
 *     excluded by construction (their qualifier is still in the matched string).
 *     Letting one label fill a whole family is the hollow pass that splitting
 *     conjunctions exists to prevent — see the measurement below.
 *   - THE VALUE MUST BE AFFIRMATIVE. `affirmativeString` rejects the in-band
 *     refusals ("TBD", "to be defined", "unknown", "n/a"), so declaring a label
 *     with nothing behind it is not an answer. A card-sanctioned unknown still
 *     passes, because `sanctionedUnknown` is tested before this.
 */
/**
 * A DENIAL IS NOT AN ANSWER — measured 2026-08-02, guarded 2026-08-05.
 *
 * `paramFilled` used to accept any sentence that named a card value, denial
 * included: "No cloud provider has been chosen; AWS was ruled out" answered
 * WF-003 `Cloud provider`. Ten of twelve probe sentences filled, across eight
 * manifests, and the failure direction is the UNSAFE one — `paramsChecked:
 * true` on a brief that denies the fact.
 *
 * SCOPE, written before the detector and unchanged by it (the definition lives
 * in `test/dispatch-denial-probe.test.ts`, which is its home):
 *
 *   A denial GOVERNS a card value when a denial token and that value sit in the
 *   same CLAUSE and the denial does not come after it.
 *
 * The clause — not the sentence — is what makes the rule decidable without
 * parsing meaning, and the choice is measured rather than argued: scoping to
 * the sentence would refuse "No budget was agreed, BUT the client is advanced
 * in AI maturity" and "No blame culture here — this is a partial failure",
 * two legitimate answers.
 *
 * ⚠️ THE COMMA IS A BOUNDARY, and the first design dropped it on a measurement
 * that was empty. Zero divergence over 2052 corpus cells and seventeen probe
 * sentences said only that neither corpus places a negation ahead of an
 * enumeration. The AMENDED briefs the suite builds do, and they are not in
 * either corpus: "…with a budget NOT disclosed, three other firms bidding,
 * award criteria weighting price and expertise…" made one negation govern three
 * later values, and "with NO monitored sources yet, with positioning on large
 * accounts as the growth focus" closed `Opportunity focus`. Without the comma
 * this rule reads an operator's list as one long denial.
 *
 * ⚠️ THE VOCABULARY IS THE LEVER, NOT THE SCOPE, and that inverted the first
 * design. The probe's twelve sentences were written with the tokens the probe's
 * own list contains — a positive control closed on itself. Measured against
 * ordinary English negation, that list missed SIX forms of eight (`isn't`,
 * `doesn't`, `lack`, `yet to be`, `absent`, `failed to`, `far from`). The list
 * below catches eight of eight and moves ZERO verdict on the nineteen briefs.
 */
const DENIAL_WORDS =
  "no longer|no|not|never|without|neither|nor|none|rather than|ruled out|declined|" +
  "rejected|paused|lacks?|lacking|absent|unable to|fails? to|failed to|far from|yet to be|\\w+n't";

const DENIAL_TOKEN = new RegExp(`\\b(?:${DENIAL_WORDS})\\b`, "gi");

/**
 * Opening denial of a DECLARED VALUE — the label route's own form of the rule.
 *
 * `labelDeclared` was left unguarded in the first design, on the evidence that
 * no probe sentence filled through it. That evidence was void: no probe
 * sentence used the `Label: value` form at all, so the route was never
 * exercised. Re-measured on the `(name)` halves, whose detector cannot fire on
 * a value: "Client: no name has been given" FILLED. `affirmativeString` only
 * catches the bare sentinels (`none`, `n/a`) because it is anchored at `^`.
 *
 * The clause rule does not transpose here — the whole capture IS the value, so
 * "inside the match" would refuse "Prospect: Kestrel Mutual, not a client",
 * where the name is genuinely given. What transposes is the ANCHOR: a declared
 * value that OPENS with a denial is a refusal to answer, and one that merely
 * contains a denial further along is an answer with a caveat.
 */
const OPENING_DENIAL = new RegExp(`^\\s*(?:${DENIAL_WORDS})\\b`, "i");

/** Clause spans of `text`, in order. Boundaries: `. , ; — |` newline, and coordinating conjunctions. */
function clauses(text: string): Array<{ start: number; end: number }> {
  // ⛔ `yet` IS NOT A BOUNDARY HERE, though it is a coordinating conjunction.
  // It collides with the denial vocabulary: "has YET TO BE put in production"
  // was split between "has" and "to be put in production", cutting the denial
  // token in half and leaving the matched clause innocent. Measured — that
  // sentence filled while every sibling closed. Its adversative use ("tired,
  // yet he continued") is rare in brief prose; its adverbial use inside a
  // denial is not, and the boundary list must lose the argument.
  const breaks = /[.,;—|\n]|\s+(?:and|but|or|nor|so)\s+/g;
  const spans: Array<{ start: number; end: number }> = [];
  let cursor = 0;
  let brk: RegExpExecArray | null;
  while ((brk = breaks.exec(text)) !== null) {
    spans.push({ start: cursor, end: brk.index });
    cursor = brk.index + brk[0].length;
  }
  spans.push({ start: cursor, end: text.length });
  return spans;
}

/**
 * `true` when a denial governs the region `[start, end)`.
 *
 * A match that STRADDLES a clause boundary is governed as soon as ANY clause it
 * occupies denies it — measured on WF-009 `role_level`, whose adjacency window
 * pairs "The role is not yet defined" with "senior hires are paused" ACROSS the
 * semicolon. ⚠️ The root cause is wider and is deliberately not fixed here: all
 * 90 adjacency windows across the ten manifests are `[^.]{0,N}` and admit a
 * semicolon. Tightening them to `[^.;]{0,N}` is a separate lot whose cost is
 * unmeasured; this rule closes the case without touching them.
 */
function denialGoverns(text: string, start: number, end: number): boolean {
  for (const span of clauses(text)) {
    if (start >= span.end || end <= span.start) continue;
    const tokens = new RegExp(DENIAL_TOKEN.source, "gi");
    const segment = text.slice(span.start, span.end);
    let hit: RegExpExecArray | null;
    while ((hit = tokens.exec(segment)) !== null) {
      if (span.start + hit.index < end) return true;
    }
  }
  return false;
}

/**
 * `true` when at least ONE occurrence of `pattern` is not governed by a denial.
 *
 * Every occurrence, never the first: each mapping concatenates `need`,
 * `context` and `constraints`, so one field can deny a fact another states, and
 * the operator HAS given the information in that case. ⚠️ Fields are joined by
 * a BARE SPACE, so a field boundary is a clause boundary only when the text
 * happens to end in punctuation. All nineteen briefs do; that is a property of
 * the fixtures, not a guarantee about operator prose.
 */
function patternAnswers(text: string, pattern: RegExp): boolean {
  const scan = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
  let hit: RegExpExecArray | null;
  while ((hit = scan.exec(text)) !== null) {
    if (hit[0].length === 0) {
      scan.lastIndex++;
      continue;
    }
    if (!denialGoverns(text, hit.index, hit.index + hit[0].length)) return true;
  }
  return false;
}

function declaredValue(text: string, card: string): string | undefined {
  // ⚖️ END-OF-PROJECT AUDIT, debt (c) — settled by Guy on 2026-08-02, once and
  // for the seven manifests that carry a conjunction, never lot by lot.
  //
  // The rule previously matched the spec's `card` VERBATIM, qualifier included,
  // so no conjunction half could ever be served by the label. That exclusion was
  // deliberate and its cost had never been measured. It was, on the quick-start
  // form each card teaches the operator: 9 of the 29 conjunction halves present
  // in those forms came back MISSING although the operator had answered them —
  // 31%, and SIX of the nine were `(name)` halves. A proper-noun detector cannot
  // read a name sitting immediately after the card's own label.
  //
  // Three options were measured, not argued:
  //   A, keep the verbatim match  → 9 missing, no hollow pass.
  //   B, strip any qualifier      → 0 missing, but "Client: Acme" then answers
  //      3/3 halves on WF-004 and 4/4 on WF-008, and "Data processed: yes"
  //      answers all three INCLUDING the Art. 9 category. Invisible to the
  //      corpus — all nineteen briefs are prose, none uses the label form — so
  //      only the dedicated guard catches it.
  //   C, strip `(name)` only      → 3 missing, and a bare label answers exactly
  //      the name: 1/3 on WF-004, 0/3 on "Data processed: yes". CHOSEN.
  //
  // C is a line rather than a heuristic: the label DESIGNATES the identity, so
  // the name half is what it states and every other half is a further fact. The
  // three residual misses are detector questions, not label ones (`Client
  // (geographic footprint)`, `Data processed (Art. 9 categories)`, and `Team
  // involved (remote or on-site)`, whose comma guard was earned against P09).
  //
  // ⚠️ THE OPERATIVE CONDITION IS NARROWER THAN "DESIGNATES THE IDENTITY", and
  // the analytical-hardening pass of 2026-08-02 is what forced it to be written.
  // Stated that way, the principle is wider than this code: `Role sought
  // [Title / Level]` (WF-009) would qualify, since a title is what that label
  // designates — yet its half is `(title)` and stays excluded. Measured, and the
  // measurement is the reason: "Role sought: senior" fills `role_level` and NOT
  // `role_title`, so a bare answer to THAT label is ambiguous between its two
  // halves. "Client: Acme Corp" cannot be a sector or a size.
  //
  // So the condition is not "the label designates this half" but **no sibling
  // half can claim the same answer**. It holds for all six `(name)` halves
  // (Client, Prospect, AI system audited, Project / Incident) and fails for
  // `Role sought`, which is why the rule keys on `(name)` and must keep doing
  // so. Serving `(title)` would re-open the hollow pass on the one card where a
  // bare label answer is genuinely two-way.
  const label = card.replace(/\s*\(name\)\s*$/, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // SEPARATOR: THE COLON ONLY \u2014 the exact form the card teaches (`- Label: value`).
  // The class used to be `[:\u2014-]`, and the second-pass audit of 2026-08-02 measured
  // what the two dashes buy on ordinary prose: nothing but false fills, the unsafe
  // direction. The bare hyphen parses a compound word as a declaration \u2014 measured
  // on the real specs, "a client-facing chatbot" filled `client_name` as
  // `Client: facing\u2026` and "location-based recommendations" filled WF-009
  // `location`, the latter proving the defect predates debt (c) (that label was
  // never a conjunction half). The em-dash reads an apposition as an answer \u2014
  // "the prospect \u2014 a regional insurer \u2014" filled `prospect_name` while naming no
  // one. Debt (c) did not create the hole; it widened the exposure by making the
  // highest-frequency English compounds (`client-`, `prospect-`) active labels.
  // Invisible to every fixture: the nineteen briefs are prose and place no card
  // label before a dash, so narrowing moves zero corpus verdict (measured, both
  // snapshots byte-identical) and every quick-start probe writes the colon.
  const declared = new RegExp(`\\b${label}\\s*:\\s*([^.;\\n]+)`, "i").exec(text);
  const value = declared?.[1];
  return value !== undefined && affirmativeString(value) ? value : undefined;
}

/** The declared value answers the label — no denial rule. Reserved for `absenceIsAnswer` specs. */
function labelDeclaredRaw(text: string, card: string): boolean {
  return declaredValue(text, card) !== undefined;
}

/** The default: a declared value that OPENS with a denial is a refusal to answer, not an answer. */
function labelDeclared(text: string, card: string): boolean {
  const value = declaredValue(text, card);
  return value !== undefined && !OPENING_DENIAL.test(value);
}

export function paramFilled(
  brief: NeedBrief,
  spec: ParamManifest["params"][number],
): boolean {
  if (spec.defaultValue !== undefined) return true;
  const text = spec.mapping(brief);
  if (spec.sanctionedUnknown?.test(text)) return true;
  // A card-sanctioned unknown is tested FIRST and stays outside the denial rule:
  // it is an admitted non-answer the card itself licenses, not a denial to catch.
  // `absenceIsAnswer` opts a spec out of the denial rule entirely: its card asks
  // WHETHER, so "no personal data is processed" is the answer, not a refusal to
  // give one. Both routes are exempted — a declared "Sensitivities: none
  // reported" is the same answer written in the card's own form.
  if (spec.absenceIsAnswer === true) {
    if (spec.pattern?.test(text) === true) return true;
    return labelDeclaredRaw(text, spec.card);
  }
  if (spec.pattern !== undefined && patternAnswers(text, spec.pattern)) return true;
  return labelDeclared(text, spec.card);
}

/**
 * Full deterministic validation of a router proposal against the sidecar and
 * the available param manifests (V0: WF-001 only).
 */
export function validateRoute(
  raw: unknown,
  brief: NeedBrief,
  sidecar: Sidecar,
  manifests: Readonly<Record<string, ParamManifest>>,
): RouteDecision {
  const { output, issues } = parseRouterOutput(raw);
  if (output === undefined) return { status: "REJECT_ROUTER_OUTPUT", issues };

  if (output.proposedRoute === "NO_MATCH") {
    const decision: RouteDecision = {
      status: "NO_MATCH",
      rationale: output.rationale,
    };
    if (output.nearestMiss !== null) decision.nearestMiss = output.nearestMiss;
    return decision;
  }

  const asset = sidecar.assets.find(
    (a) => a.id === output.proposedRoute && a.type === "workflow",
  );
  if (asset === undefined) {
    return {
      status: "REJECT_ROUTER_OUTPUT",
      issues: [
        {
          code: "UNKNOWN_WORKFLOW",
          message: `proposed route "${output.proposedRoute}" is not a workflow of the pinned sidecar (invented id — fail-closed)`,
        },
      ],
    };
  }

  const knownIds = new Set(sidecar.assets.map((a) => a.id));
  const broken = (asset.dependsOn ?? []).filter((id) => !knownIds.has(id));
  if (broken.length > 0) {
    return {
      status: "REJECT_ROUTER_OUTPUT",
      issues: broken.map(
        (id): RouteIssue => ({
          code: "UNRESOLVABLE_DEPENDENCY",
          message: `"${asset.id}" depends on "${id}", absent from the sidecar`,
        }),
      ),
    };
  }

  const manifest = manifests[asset.id];
  if (manifest === undefined) {
    // No manifest yet (V1 scope) — route stands, but say so honestly.
    return {
      status: "ROUTED",
      route: asset.id,
      rationale: output.rationale,
      paramsChecked: false,
    };
  }

  // Surface the CARD label, not the internal key: PARAMS_MISSING is read by the
  // operator who has to amend the brief, and the card labels are business
  // vocabulary by construction (copied verbatim from the catalog card). `name`
  // stays the internal identifier and is never shown here.
  const missing = manifest.params
    .filter((p) => p.required && !paramFilled(brief, p))
    .map((p) => p.card);
  if (missing.length > 0) {
    return { status: "PARAMS_MISSING", route: asset.id, missingParams: missing };
  }

  return {
    status: "ROUTED",
    route: asset.id,
    rationale: output.rationale,
    paramsChecked: true,
  };
}
