# claude-agentic-runtime

[![License: PolyForm Noncommercial 1.0.0](https://img.shields.io/badge/license-PolyForm--Noncommercial--1.0.0-blue.svg)](LICENSE)

> **Governance compiler** on top of the **Claude Agent SDK**: it reads the declarative [`claude-agents`](https://github.com/guyhui01/claude-agents) catalog, **validates its contracts**, then runs it through the SDK — which provides the engine.
> **Status: runnable POC / portfolio asset** — `v0.9.1`: full backbone, the **10 catalog workflows (WF-001 … WF-010) proven live end to end** (real agents + real catalog) — **9 runs `completed`** with their *blocking* and *advisory* gates green, **1 returned for rework** by a fail-closed gate (WF-008: the counter-review gate halted the deliverable **by design**) — plus the **WF-000 dispatch layer** (validated brief → deterministic completeness check → routing → execution plan) proven live upstream of the spines. CI green, **276 tests green** (22 *skipped*) · ISO quality audit v1 delivered (P1–P4 remediations closed).

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

Initial scope: run the *delivery spine* **WF-001 scoping → WF-002 SAFe delivery → WF-003 app launch** by consuming the catalog. **Reached and extended** — each of the catalog's **ten** workflows now has a deterministic spine on the same unchanged linear orchestrator, and a **dispatch layer (WF-000)** sits upstream of them.

Building blocks (the rest is carried by the Claude Agent SDK):
1. ✅ **Loader** — catalog sidecar → typed `Sidecar` (fail-closed)
2. ✅ **Typed handoff contracts** — schematized I/O between steps
3. ✅ **Eval gate** — quality guardrail on an agent output
4. ✅ **Dispatch (WF-000)** — validated need brief → deterministic completeness check → LLM routing proposal → **deterministic** validation against the pinned sidecar → execution plan read verbatim from the routed card, then **stop**: the go/no-go before any billed run stays human

**Claude Agent SDK** integration: the `Asset → AgentDefinition` adapter (§2.4-A) **and the live spine executor** (§2.4-B) are **delivered** — `runWf001` … `runWf010` run their backbone through `query()` (capped, `permissionMode:"plan"`, subscription OAuth).

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
- 🔬 [Live-run traces](docs/audit/live-runs/) — every billed live run is versioned verbatim, `completed` and returned-for-rework alike
- 🚦 [Dispatch discovery](docs/discovery/) — the WF-000 brief contract, coverage matrix, router draft, and V0 plan
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
- [x] WF-002 / WF-003 live run end to end (on explicit approval + observed run)
- [x] WF-004 … WF-010 spines modeled, tested, and **run live** — all ten catalog workflows live-proven (9 `completed`, WF-008 *returned for rework* by its counter-review gate)
- [x] WF-000 dispatch V0 — intake → routing → execution plan, live-proven end to end (router accuracy run + a pilot brief carried through to a spine delivery)
- [ ] Dispatch V1 — the nine remaining parameter manifests, assisted parameter filling, cost estimate
- [ ] Multi-workflow chaining (WF-006 → WF-007 → WF-001) — discovery stage; blocked on inter-workflow context accumulation, which the linear orchestrator does not carry

## Stack

Claude Agent SDK (execution substrate) · JSON Schema (contracts + sidecar) · Opus 4.8 / Sonnet 5 depending on the step — the per-workflow `modele_recommande` is a **catalog artifact**, read verbatim; which model a given live proof is routed to is a runtime decision.

## License

[PolyForm Noncommercial License 1.0.0](LICENSE) © 2026 Guy HUI-BON-HOA.

- **Noncommercial use** (research, study, personal projects, nonprofit organizations): free, under the terms of the license.
- **Any commercial use**: requires a commercial license → see [`COMMERCIAL.md`](COMMERCIAL.md).
- **Permanent protection**: no open-source switch (the license includes no *Change Date*).

> **Proprietary execution dependency**: regardless of the license above, the execution substrate `@anthropic-ai/claude-agent-sdk` is **proprietary** (© Anthropic PBC, [Anthropic Commercial Terms](https://code.claude.com/docs/en/legal-and-compliance)) — its use requires accepting Anthropic's terms and a subscription. The rest of the dependency tree is permissive (MIT/ISC/BSD/Apache-2.0), with no strong copyleft. Details: [`docs/audit/conformite_licences_iso5230.md`](docs/audit/conformite_licences_iso5230.md).

## Tooling

Documentation and design assisted by **Claude Opus** — Opus 4.8 through `v0.9.0`, **Opus 5** from `v0.9.1` on. Per-release model provenance is stated in the [changelog](CHANGELOG.md).
