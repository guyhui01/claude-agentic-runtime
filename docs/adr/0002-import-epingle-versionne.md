# ADR-0002 — Pinned, versioned catalog import

- **Status**: Accepted (2026-06-03)
- **Decision-maker**: Guy HUI-BON-HOA (assisted by Claude Opus 4.8)
- **Project context**: POC `claude-agentic-runtime`

## Context
The runtime must decide *how* it loads the catalog: a live import on `main`, or a versioned dependency. The trade-off at stake is **stability ↔ freshness**.

## Decision
The runtime depends on the catalog by **exact tag** (e.g. `claude-agents@v3.25.0`), **never** by a `^`/`~` range. Propagating a new version is an **explicit, tracked bump** (commit + CHANGELOG entry on the runtime side), not an implicit effect.

## Consequences
### Positive
- Reproducible runs; no surprise at runtime.
- The bump becomes a control point where the guardrails apply (see ADR-0004).

### Negative / costs
- Freshness is not immediate: you must bump to propagate (acceptable, that's the point).

## Rejected alternatives
- **Live import (`main`)**: rejected for production — a catalog edit would break the runtime with no safety net.
- **SemVer ranges (`^`/`~`)**: rejected — reintroduces uncontrolled implicit propagation.
