# WF-000 Dispatch — Brief Contract (draft)

> **Status: DISCOVERY DRAFT** — first deliverable of the WF-000 dispatch discovery (scoped and
> approved 2026-07-18). Not an implemented spec: the schema below is a proposal to be exercised
> against the [coverage matrix](wf-000-dispatch-coverage-matrix.md) before any code is written.
> Companion deliverable: `wf-000-dispatch-coverage-matrix.md` (20 fictional stakeholder prompts × 10 WF).
> Drafted 2026-07-19 with Claude Fable 5 (`claude-fable-5`), reviewed by the product owner.

## 1. Purpose and locked framing

WF-000 dispatch productizes **intake → routing → delivery** on top of the existing stack:
the catalog sidecar (`claude-agents` v4.2.0, 85 assets, 10 workflows with `dependsOn`) is the
machine-readable routing substrate; the 10 live-proven spines are the delivery layer.

Decisions locked with the product owner (2026-07-18) — restated here because the contract
derives from them:

- **V0 user = the accountable operator** (PO / consultant). The operator collects, consolidates
  and **validates** the need with the stakeholder upstream. The router input is a **validated
  need brief, never a raw stakeholder prompt**.
- **Closed profile, open contract.** V0 serves a single operator profile, but the contract below
  carries **no operator-specific assumption**. Multi-profile later = productize the upstream
  QUALIFY step (an agent interviews the stakeholder and emits this same contract); the router
  never changes.
- **The go/no-go gate before any billed run stays human**, whatever the profile.
- **Honest coverage**: if no workflow matches, the router answers *"no workflow for this"*
  (returned-for-rework pattern) — it never force-fits.

## 2. Pipeline V0 (where this contract sits)

```
validated brief                      ← THIS CONTRACT
  → deterministic completeness check   (fail-closed, §4)
  → ROUTE                              (LLM proposes a WF; DETERMINISTIC validation §5)
  → execution plan                     (duration/model from the WF YAML card)
  → human go/no-go                     (billed-run gate)
  → run the spine
```

Deterministic validation of the routing proposal — never LLM-judge-LLM: the proposed WF must
**exist in the sidecar**, its `dependsOn` agents must be **resolvable**, and its identity-card
client-context parameters must be **fillable from the brief**.

## 3. Brief schema (proposal)

| Field | Type | Required | Content |
|---|---|---|---|
| `need` | string | **yes** | The validated need, one paragraph, operator's words after stakeholder qualification. Must state the *current state* (e.g. "RFP received", "engagement signed", "project closed") — this is the primary routing signal (see matrix §3). |
| `domain` | string | **yes** | Business domain of the need (e.g. "Compliance & Governance", "HR & Talent"). Free text in V0; validated against the catalog domain list at routing, not at intake. |
| `expectedDeliverable` | string | **yes** | What the stakeholder walks away with (e.g. "prioritized backlog + acceptance criteria", "commercial proposal"). |
| `constraints` | string[] | **yes** (may be `[]` only if `context` states why) | Budget, deadline, regulatory, tooling constraints. |
| `context` | string | **yes** | Client context needed to fill the WF identity-card parameters (sector, size, maturity, stack). Synthetic/fictional in every versioned trace (public-trace rule). |
| `submittedBy` | string (role) | no | Role of the upstream stakeholder (e.g. "Head of Customer Service"). A **role, never a name** — minimization by design. **Advisory only: routing must be invariant to this field (role ⊥ route)** — the matrix carries two role probes (P19/P20) making that invariance falsifiable. |

## 4. Deterministic completeness check (fail-closed)

Runs **before** any LLM call. A brief that fails is **rejected with the failing field named**
— it never reaches routing.

Per-field rules (all deterministic, in the spirit of the existing spine helpers):

1. **Presence + substance**: every required field non-empty after trim; `need`, `context`
   and `expectedDeliverable` must be **affirmative strings** — reject negative sentinels
   ("none", "n/a", "TBD", "cannot", "unknown"), per the WF-009 lesson: a decision gate must
   reject an honest in-band refusal, not just check presence.
2. **`need` minimum information**: length floor (indicative: ≥ 15 words) **and** at least one
   recognizable state marker (matched against a fixed, versioned marker list derived from the
   sidecar descriptions — see matrix §3). No marker ⇒ reject: the operator has not qualified
   *where the client stands*, which is exactly what routing discriminates on.
3. **`constraints`**: empty array allowed only when `context` explicitly says the engagement is
   unconstrained — otherwise reject (an unstated constraint is the classic silent scope killer).
4. **No PII**: `submittedBy` must match a role pattern (no email, no proper-name heuristic
   needed in V0 — the operator is the accountable filter; the check is a guard, not a scanner).

Bounds pinned to the **blocking floor**, not the advisory ideal (WF-005 lesson): the floor
rejects an unqualified brief; it must not reject a modest-but-valid one.

## 5. Routing output contract (for completeness of the picture)

The router returns exactly one of:

- `{ route: "WF-00X", rationale, planRef }` — after deterministic validation (WF exists in
  sidecar, `dependsOn` resolvable, identity-card params fillable from `context`). `rationale`
  is advisory for the human gate, never evaluated by another LLM.
- `{ route: "WF-00X", status: "PARAMS_MISSING", missingParams: [...] }` — the route is valid
  but the brief cannot fill the workflow's identity-card parameters; the brief is **returned
  to the operator with the missing params named** (upstream of the go/no-go). Established by
  the [identity-card dry run](wf-000-dispatch-identity-card-dry-run.md) (finding 4): 15/15
  routed matrix prompts carry a param gap before operator qualification.
- `{ route: "NO_MATCH", rationale }` — honest coverage answer; surfaced to the operator as
  *"no workflow for this"*, with the nearest-miss WF named when one exists (advisory only).

`NO_MATCH` and `PARAMS_MISSING` are **valid, successful outcomes** of the dispatch — the
returned-for-rework pattern applied to intake.

## 6. Slicing (locked)

- **V0** — dispatch spine, single target WF. **Pilot: WF-001.**
- **V1** — assisted client-context parameter filling + cost estimate.
- **V2** — ad-hoc agent composition when no WF matches + multi-WF chaining
  (WF-006 → WF-007 → WF-001 pre-sales → onboarding → scoping arc).

## 7. Placement and trace hygiene

This PUBLIC repo hosts the code and discovery (PolyForm NC protects commercial use — runtime
AND catalog). Private = per-engagement client instances only (filled briefs with real client
context). Every brief in discovery documents and versioned traces uses **fictional data only**.
