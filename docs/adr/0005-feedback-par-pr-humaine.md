# ADR-0005 — Runtime → catalog feedback flows only through a human PR

- **Status**: Accepted (2026-06-03)
- **Decision-maker**: Guy HUI-BON-HOA (assisted by Claude Opus 4.8)
- **Project context**: POC `claude-agentic-runtime`

## Context
At execution time, the runtime produces signals (eval results, quality metrics, "trust signals") that may suggest improving a catalog skill or agent. The *registry* pattern sometimes pushes these signals back automatically.

## Decision
Any feedback from the runtime to `claude-agents` goes **through a normal human PR** (review, v2.8 rubric audit, CHANGELOG). The runtime *proposes* (issue, report, draft); **a human (Guy) decides and commits**. **No automatic write-back.**

## Consequences
### Positive
- Preserves the read-only invariant (ADR-0001) and the catalog's audited quality.
- Consistent with the audit-integrity rule (ISO 19011): prefer evidence verification over automatic approval.

### Negative / costs
- Human latency on the catalog's continuous improvement (accepted).

## Rejected alternatives
- **Automatic write-back of eval signals**: rejected — would silently mutate an audited, public catalog.
