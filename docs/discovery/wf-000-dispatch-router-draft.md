# WF-000 Dispatch — Router Draft (prompt + deterministic validation + WF-001 manifest)

> **Status: DISCOVERY DRAFT** — fourth deliverable of the WF-000 dispatch discovery; executes
> step 2 of the [coverage matrix](wf-000-dispatch-coverage-matrix.md) §4. Companions:
> [brief contract](wf-000-dispatch-brief-contract.md),
> [identity-card dry run](wf-000-dispatch-identity-card-dry-run.md).
> Nothing here is code yet — pseudocode and prompt drafts to be hardened in the V0
> implementation plan (step 3).
> Drafted 2026-07-19 with Claude Fable 5 (`claude-fable-5`), reviewed by the product owner.

## 1. Division of labor (locked, restated)

The **LLM proposes, deterministic code disposes, the human decides**. The router LLM's only
job is mapping a validated brief to a workflow id (or `NO_MATCH`); everything after that
proposal is deterministic validation against the sidecar + manifests, then the human
go/no-go. No LLM ever evaluates another LLM's output (ADR-0007 spirit).

## 2. Router prompt draft (the LLM proposer)

System prompt skeleton — the workflow table is **injected at runtime from the sidecar**
(id, title, description with its arrow-shaped precondition marker), never hardcoded, so the
router follows the pinned catalog version automatically:

```
You are a dispatch router. You receive one validated need brief (JSON) and the
catalog of available workflows below. Propose AT MOST one workflow.

Routing rules — apply in order:
1. Route on the brief's CURRENT STATE (the state marker in `need`) combined with
   `expectedDeliverable`. Both must fit the workflow's description arrow
   ("state → … → deliverable").
2. `submittedBy` is advisory context only. NEVER let the submitter's role pull
   the route (an HR submitter does not imply recruitment; a data-scientist
   submitter does not imply a build).
3. If no workflow fits BOTH state and deliverable, answer NO_MATCH. A NO_MATCH
   is a correct answer, never a failure. You may name the nearest miss.
4. Never invent a workflow id. Only ids from the catalog below are valid.

Catalog (injected from sidecar {catalogTag}):
{for each workflow: - {id} — {title}: {description}}

Answer with STRICT JSON only:
{"proposedRoute": "WF-0XX" | "NO_MATCH",
 "rationale": "<one sentence: state marker + deliverable match>",
 "nearestMiss": "WF-0XX" | null}
```

Notes:
- The rationale is **advisory for the human gate** — it is displayed, never parsed for
  decisions beyond strict-JSON validity.
- Rule 2 is the falsifiable role ⊥ route rule; probes P19/P20 of the matrix exist to catch
  its violation in the offline harness.

## 3. Deterministic validation checklist (code-shaped pseudocode)

```
validateRouterOutput(raw, brief, sidecar, manifests):                # fail-closed
  out = ajv.parse(routerOutputSchema, raw)          # strict JSON, unknown keys rejected
                                                    # parse error -> REJECT (re-ask is a
                                                    # bounded retry decision for step 3)
  if out.proposedRoute == "NO_MATCH":
      return { route: NO_MATCH, rationale: out.rationale }           # honest coverage

  wf = sidecar.workflows[out.proposedRoute]
  assert wf exists                                   # unknown id -> REJECT (LLM invented)
  for agent in wf.dependsOn:
      assert agent in sidecar.assets                 # unresolvable -> REJECT

  manifest = manifests[wf.id]                        # pinned to sidecar.source.catalogTag
  missing = []
  for param in manifest.params:
      value = fillFrom(brief, param.mapping)         # deterministic field mapping
      if value is absent:
          if param.default exists: continue          # operator-profile default
          if param.sanctionedUnknown and brief acknowledges it: continue
          missing.append(param.name)
      else:
          assert not negativeSentinel(value) or param.sanctionedUnknown
                                                     # per-param sentinel policy (dry-run
                                                     # finding 3): intake-style rejection
                                                     # EXCEPT where the card sanctions an
                                                     # honest unknown
  if missing: return { route: wf.id, status: PARAMS_MISSING, missingParams: missing }

  return { route: wf.id, plan: buildPlan(wf) }       # duration/model from the WF card,
                                                     # then HUMAN go/no-go before any run
```

Offline test oracle (no LLM in CI): the 20 matrix prompts as fixtures — expected-route
column compared **by string equality** to the pipeline outcome; the two role probes and the
four NO_MATCH classes are ordinary test cases. The live router harness (billed, gated) only
adds the real LLM at the proposal step; everything downstream is already covered offline.

## 4. WF-001 parameter manifest draft (pilot — the only manifest built in V0)

Derived from the card's `CLIENT CONTEXT` block (`workflows/WF-001-cadrage-produit-ia.md`,
catalog v4.2.0). Shape to prove here before mass-producing the other nine in V1.

```yaml
workflow: "WF-001"
catalogTag: "v4.2.0"        # manifest is stale by construction if the tag moves — re-derive
params:
  - name: "sector"
    card: "Sector"
    enum: ["Banking", "Insurance", "Retail", "Industry", "Other"]
    required: true
    mapping: "brief.context"
  - name: "product_type"
    card: "Product type"
    enum: ["AI app", "B2B portal", "CMS", "Internal workflow", "Other"]
    required: true
    mapping: "brief.context | brief.need"
  - name: "team_size"
    card: "Team size"
    enum: ["Solo", "1 squad", "Several SAFe teams"]
    required: true
    mapping: "brief.context"
  - name: "project_method"
    card: "Project method"
    enum: ["Scrum", "SAFe", "Kanban", "Hybrid"]
    required: true
    mapping: "brief.context"
  - name: "constraints"
    card: "Constraints"
    required: true
    mapping: "brief.constraints"
  - name: "deliverables_language"
    card: "Deliverables language"
    enum: ["French", "English", "Bilingual"]
    required: false
    default: "English"       # operator-profile default
  - name: "level_of_detail"
    card: "Level of detail"
    enum: ["Quick MVP", "Full scoping", "Multi-sprint backlog"]
    required: true
    mapping: "brief.expectedDeliverable"
# no card-sanctioned unknowns on WF-001 -> full intake sentinel policy applies to all params
```

Dry-run cross-check (P01, from the [dry run](wf-000-dispatch-identity-card-dry-run.md)):
`sector`, `product_type`, `constraints` fill; `deliverables_language` defaults;
`team_size`, `project_method`, `level_of_detail` → `PARAMS_MISSING` named — exactly the
return loop the pilot must exercise.

## 5. Next discovery steps

1. ~~Identity-card dry run~~ — done.
2. ~~Router prompt + deterministic validation checklist + WF-001 manifest~~ — **done (this
   document)**.
3. V0 dispatch spine implementation plan (pilot WF-001, human go/no-go gate): file layout
   (`src/dispatch/`?), ajv schemas, bounded-retry decision on router parse failure, offline
   fixture harness from the matrix, live harness gating (`LIVE_RUN`, OAuth-only) — same
   discipline as the ten proven spines.
