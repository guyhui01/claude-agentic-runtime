# ADR-0011 — Non-optional governance made testable: an enumerated guard-set no feature may weaken, and an adapter/core boundary no vendor coupling may cross

- **Status**: Accepted (decided 2026-08-31)
- **Decision-maker**: Guy HUI-BON-HOA (assisted by Claude Opus 4.8)
- **Project context**: POC `claude-agentic-runtime` — implements, in code terms, the non-optional-governance clause set upstream by DEC-0003 (strategy repo). This ADR *cites up* to DEC-0003; it does not restate or crown it (repo boundary — `CLAUDE.md`).

> **Forward-looking record, not retrospective dressing.** This ADR does not describe code that
> was written; it fixes **definitions** so that DEC-0003's two violation clauses can be *checked
> and found in violation* rather than staying decorative. It is recorded now, while the surface
> it governs is small, precisely because the cheapest moment to draw a boundary is before the
> code grows across it. Same register as ADR-0009.

## Context

DEC-0003 (positioning, strategy repo, 2026-08-30) hardened the governance doctrine into a
**non-optional, non-parametrable constraint** — *"neutrality stops at the doctrine's door"* —
with two violation clauses meant to give the principle teeth:

- **(a)** any feature that makes a governance guard **optional or disable-able "for flexibility"** violates it;
- **(b)** any **hard vendor-coupling that leaks out of the adapter layer into the core** violates it.

DEC-0003 records its own weakest point on this: *"if 'adapter layer' and 'for flexibility' stay
undefined, the teeth are cosmetic"*, and defers the enforceable definition to *"a downstream
runtime ADR that implements this clause"*. This is that ADR. Until the terms below are fixed, no
change to this runtime can be objectively judged conformant or in violation.

Facts measured at source (2026-08-31, `src/` tree):

- **The vendor adapter layer is `src/sdk/`** — `query-runner.ts` (the `query()` call, OAuth
  subscription, and the guard that refuses `ANTHROPIC_API_KEY`) and `to-agent-definition.ts`
  (catalog asset → SDK `AgentDefinition`). This is the only place the `@anthropic-ai/claude-agent-sdk`
  package is a *runtime* dependency.
- **The governance guards exist and are already named across ADRs 0004/0007/0008/0010** — but
  nowhere are they enumerated as *the closed set the doctrine protects*.
- **Three core files import the vendor package outside `src/sdk/`** — `src/dispatch/run-dispatch.ts`,
  `src/manifest/load-manifest.ts`, `src/orchestrator/types.ts` — each as `import type { AgentDefinition }`.
  These are **type-only** imports, erased at compile time: zero runtime coupling. They are the
  exact edge case clause (b) must rule on explicitly, or the clause means whatever a later reader
  wants it to mean.

## Decision

### 1. The governance guard-set (closed, enumerated)

The doctrine protects this named set. Each guard is a module with a **fail direction**; the
doctrine is the property *that the guard fires*, never the content it checks.

| Guard | Module | Fires by | ADR |
|-------|--------|----------|-----|
| Route-or-refuse | `src/dispatch/run-dispatch.ts`, `validate-route.ts` | an unroutable / too-thin brief is refused, never force-fit | ADR-0008 |
| Completeness / param validation | `src/dispatch/validate-route.ts` (+ manifests) | a missing required param yields `PARAMS_MISSING`, never a filled default | ADR-0008 |
| Eval gate, fail-closed | `src/eval/eval-gate.ts` | an exception ⇒ `passed=false`; one blocking criterion fails ⇒ verdict `fail` | ADR-0004 |
| No hollow gate (`NO_CRITERIA`) | `src/manifest/load-manifest.ts` | a step declaring zero criteria is refused at resolution, never passed vacuously | ADR-0004/0010 |
| Typed handoff enforcement | `src/handoff/` | a malformed upstream handoff is rejected downstream, never consumed | ADR-0004 |
| No LLM-judge-LLM | eval layer contract | verdicts stay deterministic; an LLM judge is an opt-in calibrated exception, not a tier | ADR-0007 |
| BYO-key / no API key | `src/sdk/query-runner.ts` | a run on `ANTHROPIC_API_KEY` is refused | ADR-0001/0009 |

Adding a guard to the runtime adds a row here; this ADR's Review trigger fires on any change to
the set.

### 2. Clause (a), testable — *no feature may weaken a guard*

A change **violates clause (a)** if it introduces a flag, parameter, environment variable, or
configuration path by which any guard in §1 can be **skipped, downgraded to warning-only, or made
to pass without checking** — presented as "flexibility," "opt-out," "fast path," or "advanced
mode." The safe direction is fixed: a guard may become *stricter* freely; it may never become
*optional*.

**Explicitly not a violation** (the doctrine is non-optional about *whether* governance holds,
not about *what* the customer's policy says): customer-authored **criteria content** — the DoDs,
thresholds, and business rules a manifest encodes. The guard is *that criteria are checked*; their
content is the customer's to define (DEC-0003 §Risks records this same carve-out). Clause (a) stays
enforced by review discipline: it is a statement about intent that no cheap mechanical test
captures.

### 3. Clause (b) + "adapter layer," testable — *no vendor coupling may cross into the core*

- **Adapter layer** = `src/sdk/`. **Core** = every other directory under `src/`.
- A change **violates clause (b)** if it introduces a **runtime** dependency on a vendor package
  (`@anthropic-ai/*`, or any future model/framework/DB SDK) anywhere in the core. "Runtime" is the
  operative word: a value import (`import { x } from "@anthropic-ai/..."`), a `require`, or a
  dynamic `import()` couples the running core to the vendor and crosses the line. A **type-only**
  import (`import type ...`), erased before execution, does not.
- **Verdict on the current tree: CONFORMANT.** The three `import type { AgentDefinition }` in
  `run-dispatch.ts`, `load-manifest.ts`, and `orchestrator/types.ts` are type-only — no runtime
  coupling — so clause (b) as written (*"hard vendor-coupling"*) is not violated.
- These three are recorded as a **tolerated, enumerated carve-out**, not silently ignored: they
  couple the core's *type vocabulary* (not its runtime) to the vendor's `AgentDefinition`. Routing
  them through an adapter-owned type alias would close even that, but doing so now would anticipate
  DEC-0003 **Axis 1** (widening independence past the model layer), which DEC-0003 records as
  *"directional, not achieved."* So it is a **named future step, not a debt this clause requires**
  — deferred deliberately, kept visible by the boundary test below.

### 4. Enforcement

Clause (b) is the one clause mechanically checkable at near-zero cost, and DEC-0003's whole point
is that *"a principle nothing can check is decorative."* So it is enforced by a test, not by prose:
`test/governance-adapter-boundary.test.ts` scans `src/**`, **fails** on any runtime vendor import
in the core, and pins the tolerated type-only carve-out to exactly the three files above — so a
fourth vendor type-coupling surfaces as a conscious decision rather than drift. Clause (a) is not
mechanically checkable and stays a review-discipline boundary, as ADR-0009's open-core line does.

## Rejected alternatives

- **(a) Leave the clauses undefined** (ship DEC-0003's principle without operational definitions).
  Rejected: it is exactly the *"clauses too vague to bind"* risk DEC-0003 flags against itself — the
  teeth stay cosmetic and no feature can ever be found in violation.
- **(b) Define governance as configurable policy** (guards exposed as tunable/opt-out for
  integration flexibility). Rejected: it re-opens the hollow-green fail-open this runtime spent
  effort closing (the `NO_CRITERIA` guard, 2026-08-30) and turns the moat — proof, fail-closed —
  into a setting. This is DEC-0003 option (a), already rejected upstream.
- **(c) Read clause (b) strictly enough to forbid type-only imports too**, and remediate the three
  files now. Rejected for this ADR: it manufactures work the clause as written does not require and
  front-runs Axis 1 (directional, not achieved). Recorded as a future step instead, not a debt.

## Consequences

### Positive

- **DEC-0003's clauses become opposable.** A pull request can now be judged conformant or in
  violation against a written definition, and clause (b) is machine-checked.
- **No accidental substrate lock-in through the back door.** A future value import of a vendor SDK
  into the core turns the suite red by policy, not by luck.
- **The guard-set is legible in one place** — a reference the GCB self-scorecard (the companion v0
  instrument) can cite for its P1/P4/P5 evidence pointers.

### Negative / costs

- **Clause (a) has no mechanical guard** — it rests on review discipline, like ADR-0009's boundary.
  A weakening "for flexibility" is caught by a human reading the diff against §2, not by a test.
- **The tolerated carve-out is a real, if type-only, vendor coupling in the core** — honest to
  record, and closing it is deferred to Axis 1, not to this ADR.

## Assumptions

- **The guard-set of §1 is complete as of 2026-08-31.** A guard omitted here is unprotected by
  clause (a); the Review trigger exists to keep the set current.
- **`src/sdk/` is the only legitimate vendor-runtime home.** If a second adapter directory appears
  (a second model/framework), the boundary test's allowlist must be widened by a conscious edit —
  which is the intended friction.

## Review trigger

Re-open if **a governance guard is added, removed, or re-homed** (the §1 table changes); if **a
second vendor adapter directory is introduced** (the boundary allowlist must move deliberately); or
if **DEC-0003 Axis 1 is engaged** — at which point the tolerated type-only carve-out (§3) stops
being deferred and the core's type surface is routed through an adapter-owned alias.

## Related

- **DEC-0003** (`agentic-strategy`, positioning) — the upstream decision this ADR *implements* and
  cites up to; it sets the non-optional-governance constraint and the two violation clauses. This
  ADR gives clauses (a)/(b) and "adapter layer" their testable definitions.
- **ADR-0008** (dispatch gate routes or refuses), **ADR-0004** (fail-closed eval gates), **ADR-0007**
  (no LLM-judge-LLM), **ADR-0010** (schema owns structure, criteria own the DoD), **ADR-0001**
  (read-only consumer / accountable operator), **ADR-0009** (open-core boundary) — the ADRs that
  each define one guard now enumerated as a set here.
- **Enforcement**: `test/governance-adapter-boundary.test.ts` (clause (b), mechanical).
- **Companion instrument**: the GCB v0 self-scorecard (this session's unit ②/③) scores this runtime
  on the fail-closed properties whose guards §1 enumerates.
