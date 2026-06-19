# ADR-0006 — Quality standards retained, deferred, and rejected

- **Status**: Accepted (2026-06-03)
- **Decision-maker**: Guy HUI-BON-HOA (assisted by Claude Opus 4.8)
- **Project context**: POC `claude-agentic-runtime`

## Context
The project aims for maximum quality of **data, docs, architecture, and runtime**, without falling into over-engineering (solo portfolio POC). We set the ISO standards **applied as a methodological framework** — **not as a certification goal** (no ROI solo; the value is rigor + portfolio signal).

## Decision

### Retained (applied right now)
| Axis | Standard | Application |
|---|---|---|
| Architecture | **ISO/IEC/IEEE 42010:2022** | Architecture description: stakeholders · concerns · viewpoints (see `ARCHITECTURE.md`) + ADR |
| Data (catalog + sidecar) | **ISO/IEC 25012:2008** | A subset of the 15 characteristics encoded in the sidecar's JSON Schema (accuracy, completeness, consistency, credibility, currentness, accessibility, compliance) |
| Software / runtime | **ISO/IEC 25010** | Non-functional requirements of the runtime (reliability, maintainability, security) |
| AI governance | **ISO/IEC 42001:2023** | Governance principles, risks, AI-system lifecycle (umbrella) |

### Deferred (to add when the context justifies it)
| Standard | Activation trigger |
|---|---|
| **ISO/IEC 25024:2015** (data quality measurement) | When we want **quantified metrics** of catalog/sidecar quality |
| **ISO/IEC 23894:2023** (AI risk management) | When the **eval gates** (block 2) evolve toward formalized risk management |
| **ISO/IEC 5230 (OpenChain)** (open-source license compliance) | When **setting the repo license** (see README "to be defined") |

### Rejected (over-engineering for this POC — explicit decision)
ISO/IEC 27001 (ISMS) · ISO/IEC 12207 / 15288 (full lifecycles) · the ISO/IEC 26511+ series (documentation management) · ISO/IEC 19770 (ITAM). Too heavy, near-zero ROI for a solo portfolio POC.

## Consequences
### Positive
- **Traceable and defensible** quality across the 4 axes; a strong maturity signal.
- Data quality becomes **executable** (25012 in the JSON Schema), not declarative.

### Negative / costs
- Maintenance of the schemas + the 42010 architecture section.

## Review
The deferred standards are **re-assessed** at each major milestone (end of POC, industrialization).
