# claude-agentic-runtime

[![License: PolyForm Noncommercial 1.0.0](https://img.shields.io/badge/license-PolyForm--Noncommercial--1.0.0-blue.svg)](LICENSE)

> **Governance compiler** on top of the **Claude Agent SDK**: it reads the declarative [`claude-agents`](https://github.com/guyhui01/claude-agents) catalog, **validates its contracts**, then runs it through the SDK — which provides the engine.
> **Status: runnable POC / portfolio asset** — `v0.5.0`: full backbone, the **3 workflows (WF-001/002/003) proven live end to end** (real agents + real catalog, all *blocking* and *advisory* gates green), CI green, **126 tests green** (6 *skipped*) · ISO quality audit v1 delivered (P1–P4 remediations closed).

## Why this repo

[`claude-agents`](https://github.com/guyhui01/claude-agents) is an **organizational agentic library**: 38 roles (agents), their skills, and delivery workflows, in audited Markdown (quality rubric v2.8). It is the **single source of truth (SSOT)**.

This repo is its **runnable consumer**: it reads the catalog (read-only, pinned version), turns it into executable agents, and orchestrates a delivery *spine* — without ever modifying the catalog.

### Positioning: a governance compiler, not an engine

The agentic execution engine (agent loop, tools, sandbox, sessions) is **commoditized** — provided by the Claude Agent SDK (and, in production, by Claude Managed Agents). This repo's non-commoditized value sits **upstream and at the boundary**: turning **governed and versioned** knowledge into executable agents, by **validating contracts** (typed handoffs), **guarding quality** (eval gates), and **tracing provenance** — all *fail-closed*. It is a **governance layer**, not a rewrite of the engine.

## Separation of responsibilities

| Repo | Role | Writes from this runtime |
|---|---|---|
| `claude-agents` | Declarative catalog, audited SSOT | ❌ **Read-only** |
| **`claude-agentic-runtime`** | Execution, eval, run state | ✅ its own stores only |
| `claude-projects` | Client projects (separate) | out of scope |

## POC scope

Run the *delivery spine* **WF-001 scoping → WF-002 SAFe delivery → WF-003 app launch** by consuming the catalog.

Three building blocks (the rest is carried by the Claude Agent SDK):
1. ✅ **Loader** — catalog sidecar → typed `Sidecar` (fail-closed)
2. ✅ **Typed handoff contracts** — schematized I/O between steps
3. ✅ **Eval gate** — quality guardrail on an agent output

**Claude Agent SDK** integration: the `Asset → AgentDefinition` adapter (§2.4-A) **and the live spine executor** (§2.4-B) are **delivered** — `runWf001` runs the backbone through `query()` (capped, `permissionMode:"plan"`, subscription OAuth).

## Documentation

- 📋 [Scoping note](docs/note_cadrage_poc.md) — objective, scope, invariants, risks
- 🏛️ [Architecture](docs/ARCHITECTURE.md) — layers, diagram, propagation model
- 🧭 [Architecture Decision Records (ADR)](docs/adr/):
  - [ADR-0001 — Read-only consumer of the catalog](docs/adr/0001-consommateur-read-only.md)
  - [ADR-0002 — Pinned versioned import](docs/adr/0002-import-epingle-versionne.md)
  - [ADR-0003 — Sidecar owned by the catalog](docs/adr/0003-sidecar-propriete-catalogue.md)
  - [ADR-0004 — Propagation guarded by eval gates](docs/adr/0004-propagation-gardee-eval-gates.md)
  - [ADR-0005 — Feedback through human PR](docs/adr/0005-feedback-par-pr-humaine.md)
  - [ADR-0006 — Quality standards (ISO 42010 / 25012 / 25010 / 42001)](docs/adr/0006-referentiels-qualite.md)
  - [ADR-0007 — Contracts & criteria: a spine manifest owned by the runtime](docs/adr/0007-source-contrats-criteres-manifeste-runtime.md)
- 📏 [Contributing & conventions](CONTRIBUTING.md) · [Changelog](CHANGELOG.md)

## Progress

- [x] Scoping note validated
- [x] Founding ADRs (6) + architecture
- [x] Block 0 — Sidecar loader (fail-closed)
- [x] Block 1 — Typed handoff contracts
- [x] Block 2 — Eval gate
- [x] §2.4-A — Catalog → `AgentDefinition` adapter
- [x] §2.4-B — Live executor for a workflow backbone (e.g. WF-001) (+ provenance)
- [x] WF-001 live run end to end (*blocking* + *advisory* gates green) + ISO quality audit v1
- [x] WF-002 / WF-003 spines modeled + tested (offline)
- [x] CI (strict typecheck + tests, Node 20/22) + Dependabot
- [x] Index the WF-002/003 agents in the sidecar (`claude-agents` repo) — 14 assets, consumable, default `CATALOG_ROOT` realigned
- [ ] WF-002/003 live run end to end (on explicit approval + observed run)

## Stack

Claude Agent SDK (execution substrate) · JSON Schema (contracts + sidecar) · Opus 4.8 / Sonnet 4.6 depending on the step.

## License

[PolyForm Noncommercial License 1.0.0](LICENSE) © 2026 Guy HUI-BON-HOA.

- **Noncommercial use** (research, study, personal projects, nonprofit organizations): free, under the terms of the license.
- **Any commercial use**: requires a commercial license → see [`COMMERCIAL.md`](COMMERCIAL.md).
- **Permanent protection**: no open-source switch (the license includes no *Change Date*).

> **Proprietary execution dependency**: regardless of the license above, the execution substrate `@anthropic-ai/claude-agent-sdk` is **proprietary** (© Anthropic PBC, [Anthropic Commercial Terms](https://code.claude.com/docs/en/legal-and-compliance)) — its use requires accepting Anthropic's terms and a subscription. The rest of the dependency tree is permissive (MIT/ISC/BSD/Apache-2.0), with no strong copyleft. Details: [`docs/audit/conformite_licences_iso5230.md`](docs/audit/conformite_licences_iso5230.md).

## Tooling

Documentation and design assisted by **Claude Opus 4.8** (model currently in use).
