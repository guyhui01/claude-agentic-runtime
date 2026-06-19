# Scoping note — POC `claude-agentic-runtime`

> Status: **VALIDATED by Guy — 2026-06-03** · Author: Guy HUI-BON-HOA (assisted by Claude Opus 4.8)
> ISO quality standards applied in building the repo (see ADR-0006): ISO/IEC/IEEE 42010 · ISO/IEC 25012 · ISO/IEC 25010 · ISO/IEC 42001.
> Founding document of the repo. No line of code is written before this note is validated.

---

## 1. Objective & nature of the project

Build a **runnable agentic runtime** that consumes the declarative `claude-agents` catalog (roles, skills, workflows) as the **single source of truth**, and executes it through the **Claude Agent SDK**.

- **Chosen purpose: portfolio asset** (demonstrator of enterprise agentic-architecture maturity, delivery-oriented). Not an engagement product at this stage.
- **Continuation criterion**: if the POC proves its value "in a 6-month engagement", industrialize; otherwise it stays a polished showcase and we stop there (anti-over-engineering rule, 80/20).

## 2. Positioning in the repo ecosystem

| Repo | Role | Mutability from the runtime |
|---|---|---|
| `claude-agents` | **SSOT**: pure declarative catalog, audited (rubric v2.8) | **Read-only** |
| **`claude-agentic-runtime`** (this repo) | Consumer: execution, eval, run state | Writes only **its own** stores |
| `claude-projects` | Client projects (existing, separate) | Out of scope |

**One-way dependency direction**: `runtime → reads → catalog`. Never the reverse.

## 3. Architecture invariants (non-negotiable)

1. **Read-only consumer**: the runtime has no write access to `claude-agents` (*read-only* CI token, separate repos).
2. **Versioned & pinned import**: dependency on an **exact tag** (e.g. `claude-agents@v3.25.0`), never a `^`/`~` range. Propagation is an **explicit tracked bump** (commit + runtime CHANGELOG).
3. **Sidecar owned by the catalog**: the machine-readable manifest (JSON/YAML index) is **generated and validated in CI inside `claude-agents`**; the runtime only reads it. The catalog's prose body stays intact and auditable.
4. **Guarded propagation**: every version bump goes through contract validation + eval gates (see §6); *fail-closed* if red.
5. **Feedback through a human PR**: a runtime signal (eval, trust) suggesting an improvement to the catalog flows back **through a normal human PR** (review + CHANGELOG), **never** through automatic write-back.

> These 5 invariants are formalized as **ADRs** in `docs/adr/` (see §8).

## 4. POC scope

### In scope — the *delivery spine*
Run end to end the spine: **`WF-001 scoping` → `WF-002 SAFe delivery` → `WF-003 app launch`**, by consuming the catalog's agents/skills.

### The 3 blocks to build (the rest is carried by the SDK)
| # | Block | Value |
|---|---|---|
| **0** | **Loader** catalog → SDK definitions (sidecar read) + readability contract | Foundation: makes the catalog executable |
| **1** | **Typed handoff contracts** (schematized I/O between workflow steps) | Core value — the SDK does not provide it |
| **2** | **1 eval gate** plugged onto an agent output (e.g. conformance of the scoping deliverable) | Runtime quality guardrail |

### Out of POC scope
- **Shared state/memory** and **orchestration router** → **provided by the Claude Agent SDK** (to configure, not to build).
- **MCP catalog enrichment** → post-POC (existing Jira/Confluence or stubs are enough).
- Full eval suite, multi-spines, UI → post-POC.

## 5. Stack

- **Execution substrate**: Claude Agent SDK (sub-agents, tool routing, state, MCP) — **we do not rewrite an engine**.
- **Model**: Opus 4.8 (reasoning/orchestration), Sonnet 4.6 (high-volume steps) — tier to be decided per step.
- **Validation**: JSON Schema (contracts + sidecar), run in CI.

## 6. Propagation model (Dependabot/Renovate pattern)

| Step | Actor | Auto? |
|---|---|---|
| Detect a new catalog version | CI / bot | ✅ |
| Run contract validation + eval gates | CI | ✅ (evidence) |
| Open a **bump PR** if green / block it if red | CI / bot | ✅ |
| **Merge the PR** (adopt the version) | **Human (Guy)** | ❌ decision |

→ Automation **checks** (evidence), the human **decides** (merge). No automatic write-back. *(No dedicated "propagation agent" for the POC: a CI workflow + human merge is enough — re-packageable as an agent later if value is shown.)*

### I/O contract guardrail — exact wording
> Defense in depth: **static contract validation** + **behavioral eval gates** + **pinning**. Guarantees that **no _undetected_ contract break can propagate** (the bump PR fails in CI = *fail-closed*).
>
> ⚠️ **Does not amount to "no regression possible"**: a test only covers what it tests; a semantic regression inside a valid contract can remain. Promising infallibility would be a false signal.

## 7. Best practices & recommendations retained

- **Open formats** as native identity: `AGENTS.md` (repo guidance), Agent Skills, MCP `server.json` — do not invent a proprietary format.
- **`AGENTS.md` front-matter**: reminder — the **1.0 spec does not define one**; the addition (`description`/`tags`) is an **unmerged 1.1 proposal** (May 2026). Every file must stay readable **if the YAML block is removed** → do not depend on it for portability.
- **Registry / SSOT**: the catalog is the authoritative registry; all governance depends on it.
- **CI validation on each PR**: JSON Schema, identifier uniqueness, URL accessibility, security scan.
- **Governance documented through ADRs** (Architecture Decision Records) — one short dated file per decision, in `docs/adr/`; a maturity signal for a portfolio deliverable. **No big monolithic `BESTPRACTICES.md`** (anti-over-engineering).
- **SemVer + CHANGELOG** on the runtime side, as for the catalog.
- **Anonymization**: inherited from the catalog; no real client in the runtime either.

## 8. ADRs to create (1 page each, `docs/adr/`)

- `ADR-001` — Read-only consumer of the catalog
- `ADR-002` — Pinned versioned import (exact tag, explicit bump)
- `ADR-003` — Sidecar owned by the catalog (generated + validated in CI on the `claude-agents` side)
- `ADR-004` — Propagation guarded by eval gates + contract validation
- `ADR-005` — Runtime → catalog feedback only through a human PR

## 9. POC deliverables

1. `loader/` — read the catalog sidecar → Agent SDK definitions.
2. `contracts/` — typed I/O schemas of the WF-001→003 steps (JSON Schema).
3. `gates/` — 1 operational eval gate on an agent output.
4. Demonstrated execution of the WF-001→003 spine + run trace.
5. `docs/adr/` (5 ADRs) + `README.md` + `ARCHITECTURE.md` + `CHANGELOG.md`.
6. CI pipeline: schema validation + eval gate + catalog bump PR.

## 10. Success criteria (POC)

- The **WF-001→003 spine executes** by consuming the pinned catalog, with no write to `claude-agents`.
- A simulated **I/O contract change** in a new catalog version **makes the bump PR fail** in CI (proof of *fail-closed*).
- Governance (read-only, sidecar, ADR) is **readable and defensible** by an external technical reviewer.

## 11. Risks & guardrails

| Risk | Guardrail |
|---|---|
| **Over-engineering** | 3-block scope; SDK for the rest; "6-month engagement" criterion |
| **Low ROI** (technical curiosity) | Portfolio purpose owned; stop after POC if value not proven |
| **Catalog/runtime drift** | Single SSOT + read-only + pinned import |
| **Overclaiming reliability** | Honest wording of the guardrail (§6) |

## 12. Next step

On validation of this note: write the **5 ADRs** + the repo `README.md`, **then only** start block 0 (loader). Detailed block-0 plan to validate before writing code.
