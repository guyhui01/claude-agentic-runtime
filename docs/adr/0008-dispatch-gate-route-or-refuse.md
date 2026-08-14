# ADR-0008 — The dispatch gate routes or refuses; nothing runs on an unrouted or under-qualified brief

- **Status**: Accepted (locked with the product owner 2026-07-18; recorded retrospectively 2026-08-14)
- **Decision-maker**: Guy HUI-BON-HOA (assisted by Claude Opus 4.8)
- **Project context**: POC `claude-agentic-runtime` — WF-000 dispatch (intake → routing → delivery)

> **Honest-record note.** This ADR is written after the fact. The decision below was a real
> arbitration settled with the product owner on 2026-07-18 and has driven the dispatch layer
> since; until now it lived only in the WF-000 discovery drafts, never in the ADR log (the
> dispatch layer, designed in July 2026, postdates ADR-0001…0007 of June 2026). It is recorded
> here because it is a decision that shaped the implementation — not to dress up implementation
> after the fact.

## Context

WF-000 dispatch productizes **intake → routing → delivery** on top of the existing stack: the
catalog sidecar (`claude-agents`, machine-readable routing substrate) and the ten live-proven
spines (delivery layer). It introduces an **entry point** that did not exist before: a request
arrives, and the runtime must decide what happens to it.

The catalog covers a **bounded** set of ten workflows. Real stakeholder requests routinely fall
outside that set, or arrive **under-qualified** (no clear current-state, no expected
deliverable). The design question is what the gate does with such a request — and, symmetrically,
whether the runtime may ever *execute a billed spine* on a brief it did not confidently route.

The stakes are the classic dispatcher trade-off: **permissiveness (always produce something)
↔ fail-closed honesty (route or refuse)**, against a background where a wrong route spends a
billed run and hands the operator a plausible-but-wrong deliverable.

## Decision

The dispatch gate is **total and fail-closed**: every validated brief is either **routed to
exactly one catalog workflow**, or **explicitly refused** — and **nothing executes on an
unrouted or under-qualified brief**. The gate never force-fits.

Refusal is a first-class, *successful* outcome, in three named forms (not errors):

1. **`REJECT_INCOMPLETE(field)`** — the deterministic completeness check fails **before any LLM
   call** (missing required field, negative in-band sentinel, no recognizable state marker,
   unstated constraints). The brief never reaches routing; the failing field is named.
2. **`NO_MATCH`** — the router finds no workflow whose current-state **and** deliverable fit the
   brief. Surfaced as *"no workflow for this"*, with the nearest-miss named (advisory only).
3. **`PARAMS_MISSING(params)`** — the route is valid but the workflow's identity-card parameters
   are not fillable from the brief; the brief is returned to the operator with the missing
   parameters named (returned-for-rework, upstream of the go/no-go).

The division of labor is fixed: **the LLM proposes, deterministic code disposes, the human
decides.** The router LLM only maps a validated brief to a workflow id (or `NO_MATCH`).
Everything after the proposal is deterministic validation against the sidecar and the pinned
manifests (the id must exist, its `dependsOn` agents must resolve, its identity-card parameters
must be fillable), then a **human go/no-go before any billed run**. No LLM ever evaluates another
LLM's output (ADR-0007 spirit).

## Consequences

### Positive

- **Every outcome is honest.** A request the catalog cannot serve gets a *named refusal*, not a
  confident wrong deliverable. `NO_MATCH` / `PARAMS_MISSING` / `REJECT_INCOMPLETE` are valid,
  successful results — the returned-for-rework pattern applied to intake.
- **The gate is falsifiable offline, no LLM in CI.** The 20-prompt coverage matrix pins the
  behavior by string equality: 15 routed prompts, **4 `NO_MATCH`** spanning four distinct miss
  classes, **1 `REJECT_INCOMPLETE`**, plus two `role ⊥ route` probes proving the submitter's role
  never pulls the route. The billed live harness only adds the real LLM at the proposal step.
- **The unsafe error is structurally prevented.** Running a billed spine on a thin or unroutable
  brief cannot happen; the completeness floor is tuned to the *blocking* floor (reject an
  unqualified brief) rather than the advisory ideal (do not reject a modest-but-valid one).
- **Clean seam for later.** Multi-profile V1 = productize the upstream QUALIFY step (an agent
  interviews the stakeholder and emits the same brief contract); the gate never changes.

### Negative / costs

- A valid request phrased **outside the recognized state markers** can be refused at intake (a
  false `REJECT_INCOMPLETE`). Mitigated by a generic *qualified-request* marker and by naming the
  failing field so the operator can re-qualify — without it, every off-catalog need would be
  rejected before the router could answer its honest `NO_MATCH`.
- **Routing depends on a non-deterministic proposer.** The offline oracle covers the
  deterministic half only; the LLM proposer is exercised solely by a gated, billed, OAuth-only
  harness.
- **The gate presumes an accountable operator.** It does not do discovery: the brief must be
  *validated* upstream (ADR-0001 read-only spirit, closed profile). The runtime never routes a
  raw stakeholder prompt.

## Rejected alternatives

- **(a) Mandatory explicit workflow selection** — the operator names the target workflow; no
  routing intelligence. Rejected: it discards the honest-coverage signal (*does the catalog even
  cover this need?* becomes an unchecked operator self-classification), still needs a completeness
  gate to avoid running on a thin brief, and throws away the one component V1 must reuse — the
  router. It trades a real question ("what does this request map to, if anything?") for an
  assumption.
- **(b) LLM chooses freely and executes, no deterministic guard** — the router picks the nearest
  workflow and the spine runs. Rejected: it **force-fits** out-of-scope requests (an office-move
  request onto a delivery workflow), spends billed runs on under-qualified briefs, and offers no
  honest `NO_MATCH` — the system always "succeeds" by producing *something*, which is exactly the
  failure mode this layer exists to refuse. This is the alternative the discovery drafts guard
  against explicitly: brief-contract §1 *"it never force-fits"*, and coverage-matrix P17
  *"guards against force-fit onto WF-002 (project-shaped ≠ catalog-covered)"*. It also collapses
  propose-and-validate into one LLM, violating ADR-0007.

## Related

- **Locks & drafts**: `docs/discovery/wf-000-dispatch-brief-contract.md` (§1 locked framing,
  §4 fail-closed completeness, §5 routing output contract), `…-router-draft.md` (§1 division of
  labor, §3 deterministic validation), `…-coverage-matrix.md` (the 20-prompt falsifiable oracle),
  `…-identity-card-dry-run.md` (finding 4: `PARAMS_MISSING` as a third outcome).
- **ADRs**: ADR-0001 (read-only consumer / accountable operator), ADR-0002 (manifests pinned to
  the catalog tag — the validation substrate), ADR-0007 (no LLM-judge-LLM — the deterministic
  disposer).
