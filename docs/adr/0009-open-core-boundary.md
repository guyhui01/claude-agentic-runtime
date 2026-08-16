# ADR-0009 — Open-core boundary: the public runtime proves the method; a future private control plane owns governed execution

- **Status**: Accepted (decided 2026-08-16 in a go-to-market sparring session)
- **Decision-maker**: Guy HUI-BON-HOA (assisted by Claude Opus 4.8)
- **Project context**: POC `claude-agentic-runtime` — commercialization boundary for the WF-000 dispatch runtime and the catalog it consumes

> **Forward-looking record, not retrospective dressing.** This ADR does not describe code that
> was written; it fixes a **policy boundary** decided today, so that no future component drifts
> across it by accident. It is recorded now, before a private repo exists, precisely because the
> cheapest moment to draw the line is before the paid layer is built. No proprietary control plane
> exists at the time of writing — this ADR defines what it will and will not contain, and the
> trigger that starts it.

## Context

Two questions collided in the go-to-market analysis and needed a settled boundary:

1. **What must stay public**, given that the public repos are today the credibility proof
   ("show, don't tell") and the acquisition funnel?
2. **What is the actual commercial asset**, and when is it privatized?

Verified facts that constrain the answer (measured 2026-08-16, at source):

- **Both repos are PUBLIC**: `guyhui01/claude-agents` (catalog) and `guyhui01/claude-agentic-runtime`
  (runtime).
- **The runtime is licensed PolyForm Noncommercial 1.0.0** — commercial use is *already* reserved
  to the author while the code is public. Secrecy is not what reserves commercial rights; the
  license is.
- **The runtime today is a fail-closed dispatch/validation POC**, not a control plane. Its real
  layers (`src/`): `dispatch/` (the route-or-refuse gate + the completeness/param-validation
  policy + the ten pinned manifests — ADR-0008), `eval/` (a deterministic, fail-closed eval gate
  + criteria registry — the seed of a quality layer), `handoff/`, `orchestrator/` + ten `spines/`
  (the delivery layer), plus catalog loaders. **25 versioned live traces** in
  `docs/audit/live-runs/` are the proof artifacts.
- **The design of the gate is already disclosed** publicly (ADR-0008). A method that is published
  cannot be un-published; privatizing the code that implements it protects little.
- **The author is a solo freelance (portage salarial)**; inference for any commercial run is
  **BYO-key** (the customer's own model credentials), never author-hosted resale of tokens
  (see the model-agnostic / BYO-key constraint, and CLAUDE.md's subscription-OAuth-only rule for
  the author's own runs).

The tempting-but-wrong move is to privatize the current runtime engine to "protect the moat."
That protects code already reserved by PolyForm and already described by ADR-0008, while destroying
the proof funnel. The moat for this profile is not code secrecy: it is the noncommercial license
+ the business expertise encoded as auditable checks + the live-trace proof.

## Decision

Draw a **stable open-core boundary** and privatize **by building a new layer above**, never by
extracting or hiding the current runtime.

**Stays PUBLIC (under PolyForm Noncommercial), indefinitely:**

- The **catalog** (`claude-agents`): agents, skills, workflows, `sidecar.json`, MCP servers.
- The **dispatch gate and its policy** (`src/dispatch/`): route-or-refuse, completeness check,
  param validation, the ten manifests. This is the *method*, and ADR-0008 already publishes its
  design. Public demonstrates the philosophy; PolyForm reserves the commerce.
- The **spines** (`src/orchestrator/`, `src/spines/`) as a runnable demonstration of the delivery
  layer.
- The **live traces** (`docs/audit/live-runs/`) — the credibility proof and the acquisition funnel.
  Privatizing these would forfeit the single strongest asset the project has.

**Belongs to the FUTURE PRIVATE control plane (a new repo, not an extraction):**

- **Governance**: policies (who may run what), permissions (which tools an agent may reach), RBAC.
- **Operations**: multi-tenant workspace, cost governance/metering, a persisted & queryable
  **audit / trace store** (the durable form of the reports the public gates already emit).
- **A hardened evaluation engine** grown from the public `src/eval/` seed — deterministic criteria
  encoding business Definitions-of-Done, composite scoring, calibrated against ground truth. The
  *seed and its interface stay public*; the *operated, populated, persisted* engine is the product.
- **Enterprise integrations**, SSO, SLA, private deployment.

**Privatization trigger** — not "when I start selling", but a capability threshold: the private
control plane becomes real (and worth closing) when it runs, end to end, for a **paying customer in
BYO-key** the chain `policy → permission check → human approval → execution → evaluation → stored
audit trail`. Before that threshold, locking anything only costs visibility.

## Consequences

### Positive

- **Proof and moat coexist.** PolyForm + public code + public traces keep the show-don't-tell
  funnel while reserving commercial rights. The differentiation is defensible without secrecy.
- **No accidental drift across the line.** New governance/eval-engine work is born in the private
  repo by policy; public work stays demonstrative. The boundary is a design input, not a cleanup.
- **The commercial asset is the layer customers actually pay for** — governed, audited, multi-tenant
  execution — not a hidden copy of a POC.

### Negative / costs

- **The boundary must be enforced by discipline** until the private repo exists; there is no
  mechanical guard today. This ADR is that guard, in prose.
- **PolyForm does not protect the architecture or ideas**, only commercial use of the code. A
  clean-room reimplementation of the gate remains possible; the durable moat is the expertise-as-
  criteria and the proof, not the ~400 lines of `validate-route.ts`.
- **BYO-key narrows the addressable model** (customers must hold their own credentials) but keeps
  the author out of token resale and its thin margins and ToS exposure.

## Rejected alternatives

- **(a) Privatize the current runtime engine now** (make `src/dispatch/` or the whole runtime
  private at the start of commercialization). Rejected: it hides code already reserved by PolyForm
  and already described by public ADR-0008, and it destroys the live-trace proof funnel — trading a
  real acquisition asset for secrecy that buys almost nothing.
- **(b) Stay fully permissive/open forever** (e.g., MIT the runtime, monetize services only).
  Rejected on the licensing fact: it would give away the very commercial rights PolyForm exists to
  reserve, irrevocably for any published version (cf. the claude-projects MIT→PolyForm episode,
  where the already-published MIT versions stayed irrevocable). The noncommercial license is the
  cheaper, stronger moat.
- **(c) Build a full multi-tenant SaaS platform up front** ("Figma for AI workflows"). Rejected as
  a resourcing mismatch for a solo freelance: it is a funded-startup backlog. The realistic path is
  consulting-led (the catalog as reusable IP), with the private control plane grown only as paying
  engagements justify it.

## Related

- **ADR-0008** (the dispatch gate routes or refuses — the public method whose design is already
  disclosed), **ADR-0004** (behavioral eval gates, fail-closed propagation — the seed the private
  engine grows from), **ADR-0007** (no LLM-judge-LLM — the constraint the eval engine must keep as
  it grows), **ADR-0001** (read-only consumer / accountable operator).
- **License**: PolyForm Noncommercial 1.0.0 (`LICENSE`).
- **Proof**: `docs/audit/live-runs/` (25 versioned traces).
