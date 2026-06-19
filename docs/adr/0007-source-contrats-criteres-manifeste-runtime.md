# ADR-0007 — Handoff contracts & eval-gate criteria: a spine manifest owned by the runtime

- **Status**: Accepted (2026-06-04)
- **Decision-maker**: Guy HUI-BON-HOA (assisted by Claude Opus 4.8)
- **Project context**: POC `claude-agentic-runtime` — §2.4-B.2

## Context
The spine executor (§2.4-B.1) plugs, onto each step, **handoff contracts** (block 1) and **eval-gate criteria** (block 2). So far these two artifacts live in **test fixtures**. We must decide their **production source**.

Decisive technical fact: the two artifacts are not of the same nature.
- A **contract** (`StepContract`) is **JSON Schema** → serializable data.
- A **criterion** (`Criterion.check: (output) => boolean`) is an **executable predicate** → **not** serializable as data without inventing a declarative DSL compiled at load time (loss of expressiveness, a language to maintain).

Besides, contracts and gates belong to the **execution and judgment policy** of a given runtime — *how* an output is evaluated — and not to the catalog's **description** (*what exists*).

## Decision
The source is a **spine manifest, owned by `claude-agentic-runtime`**:
- each spine describes its **ordered steps** + each step's **contract** (JSON Schema, data);
- the **criteria** are **referenced by `id`** from a **TypeScript criteria registry** (the code stays expressive, deterministic, hermetically tested);
- the manifest **cross-checks** the `stepId`/`assetId` against the **sidecar**; the loader verifies consistency (every step points to a real asset of the pinned catalog).

The **sidecar stays descriptive and unchanged** (ADR-0003): it says *what exists* (assets, dependencies, provenance); the manifest says *how to execute a spine*.

## Consequences
### Positive
- **Separation of concerns**: description (catalog, ADR-0003) ≠ execution policy (runtime). The prose-first catalog is not coupled to a particular runtime's judgment.
- **Criteria = real deterministic code** (no premature DSL, YAGNI): expressive, typed, testable.
- **Consistent with ADR-0002/0004**: the bump and its validation chain (contracts + gates) are already runtime-side acts; the source is too.
- **SSOT preserved**: the "what exists" stays in the sidecar; the cross-check by `id` prevents drift.
- **Read-only catalog maintained** (ADR-0001).

### Negative / costs
- The manifest's `stepId`/`assetId` must stay in sync with the sidecar (mitigation: consistency check at load time, fail-closed).
- The manifest is not validated by the catalog's CI; it is validated by the runtime's.

## Explicit limit (honesty)
Logging criteria as code maximizes expressiveness but makes them **non-editable by a non-developer** and non-portable outside TypeScript. If a real need for declarative authoring emerges (criteria edited by a business user, shared across runtimes), a serializable **criteria DSL** will become relevant again — it can then be adopted **without breaking** the `Criterion` interface (the registry will compile the DSL into `check` functions). We do not introduce it at the POC stage (YAGNI).

## Rejected alternatives
- **Extend the sidecar** (contracts + criteria-as-DSL carried by the catalog): rejected — pushes the judgment policy into the catalog (coupling), forces a criteria DSL right now, contradicts the *descriptive* rationale of ADR-0003.
- **Hybrid** (contracts → sidecar, criteria → runtime registry): rejected for the POC — forces the prose-first catalog to generate JSON Schema per asset (a heavy step) and creates two sources for a single handoff. Re-assessable if I/O contracts become a descriptive deliverable of the catalog.
