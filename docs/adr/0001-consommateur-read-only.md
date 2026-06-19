# ADR-0001 — The runtime is a *read-only* consumer of the catalog

- **Status**: Accepted (2026-06-03)
- **Decision-maker**: Guy HUI-BON-HOA (assisted by Claude Opus 4.8)
- **Project context**: POC `claude-agentic-runtime`

## Context
The `claude-agents` catalog is the single source of truth (SSOT) for roles, skills, and workflows. It is public and **audited** (quality rubric v2.8). The runtime must execute it without compromising that integrity.

## Decision
The runtime **consumes the catalog read-only**. It never writes to `claude-agents`. The dependency direction is **one-way**: `runtime → reads → catalog`.

Implementation: separate repos; the runtime's CI has only a **read-only token** on `claude-agents`; the runtime writes only to its own stores (run logs, eval results, state).

## Consequences
### Positive
- SSOT integrity preserved; no silent mutation of the audited catalog.
- No circular dependency; clear provenance.
- The catalog stays reusable by other consumers.

### Negative / costs
- Any catalog improvement triggered by the runtime requires a human detour (see ADR-0005).

## Rejected alternatives
- **Read/write runtime**: rejected — drift, circular coupling, loss of audit guarantees.
