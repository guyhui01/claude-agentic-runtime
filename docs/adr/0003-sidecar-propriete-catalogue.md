# ADR-0003 — The *sidecar* manifest belongs to the catalog

- **Status**: Accepted (2026-06-03)
- **Decision-maker**: Guy HUI-BON-HOA (assisted by Claude Opus 4.8)
- **Project context**: POC `claude-agentic-runtime`

## Context
The `AGENT-*.md` files and `workflows/` of `claude-agents` are in **Markdown prose** (readable, audited). To be executed, the catalog must be **machine-readable**. Three options: a tolerant loader (heuristics on the prose), front-matter added to each file, or a **sidecar manifest** (a separate structured index).

## Decision
We adopt the **sidecar**: a machine-readable index (JSON/YAML, validated by JSON Schema). This sidecar **belongs to `claude-agents`**: it is **generated and validated in CI** there on each PR. The catalog's prose body stays **intact and auditable**. The runtime only **reads** the sidecar.

## Consequences
### Positive
- A **self-describing and authoritative** catalog (the index is part of the SSOT).
- Deterministic robustness + CI validation, without breaking human readability.
- The runtime has no reason to write to the catalog (consistent with ADR-0001).

### Negative / costs
- A generation/validation step to maintain on the catalog side.

## Rejected alternatives
- **Tolerant loader** (parses the prose): rejected — fragile (breaks if a heading changes), heuristics to maintain, no validation guarantee.
- **Per-file front-matter**: rejected — modifies the whole audited repo; and the `AGENTS.md` 1.0 spec defines no front-matter (unmerged 1.1 proposal, May 2026).
- **Sidecar generated on the runtime side**: rejected — would move the index out of the SSOT (less clean).
