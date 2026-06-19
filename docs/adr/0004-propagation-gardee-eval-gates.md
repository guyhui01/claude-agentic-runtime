# ADR-0004 — Propagation guarded by eval gates + contract validation

- **Status**: Accepted (2026-06-03)
- **Decision-maker**: Guy HUI-BON-HOA (assisted by Claude Opus 4.8)
- **Project context**: POC `claude-agentic-runtime`

## Context
A catalog change can alter an agent's **I/O contract** and break a workflow handoff. The version bump (ADR-0002) is the point where this risk must be intercepted.

## Decision
Every catalog version bump goes through a **CI validation chain** (Dependabot/Renovate pattern): **static contract validation** (JSON Schema) + **behavioral eval gates** on agent outputs. If red → the **bump PR fails** (*fail-closed*) and is not mergeable. Automation **checks** (evidence); **the human decides** (merge).

## Consequences
### Positive
- Defense in depth: no **undetected contract break** propagates.
- An adoption decision that is tracked and evidence-based, not based on a hunch.

### Negative / costs
- The cost of maintaining contract schemas and eval gates.

## Explicit limit (honesty)
This chain guarantees that **no _undetected_ contract break propagates** — it **does not amount to** "no regression possible": a test only covers what it tests, a semantic regression inside a valid contract can remain. Promising infallibility would be a false signal.

## Rejected alternatives
- **Dedicated propagation agent**: oversized for the POC (over-engineering); a CI workflow + human merge is enough. Re-packageable as an agent later if value is shown.
- **Bump without validation**: rejected — blind propagation.
