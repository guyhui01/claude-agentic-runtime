# ISO quality audit — `claude-agentic-runtime` (v1)

- **Date**: 2026-06-11
- **Claude model**: Claude Opus 4.8
- **Auditor**: Guy HUI-BON-HOA (assisted by Claude Opus 4.8)
- **Nature**: internal self-assessment (*gap analysis*), **NOT a certification** (see [ADR-0006](../adr/0006-referentiels-qualite.md), zero certification ROI solo).
- **Posture**: ISO 19011 — objectivity, **factual** evidence (`file:line` citation, test outputs, real live run), independence. **Unfavorable verdict owned if the evidence demands it.**
- **Trigger** ([ADR-0006](../adr/0006-referentiels-qualite.md) §review, [NEXT_STEPS](../NEXT_STEPS.md) §3.4): "full-throttle" WF-001 live run completed on 2026-06-09 (the spine executes) → audit condition **reached**, before any industrialization.

> **Frozen finding.** This is a dated snapshot (2026-06-11) and is **not** rewritten after the fact. At the time, the project license was **MIT** (correct then). It was later changed (MIT → BSL 1.1 → **PolyForm Noncommercial 1.0.0**); for the current license-compliance position see [`conformite_licences_iso5230.md` §5](conformite_licences_iso5230.md#5-remediation-action-applied).

---

## 0. Executive summary

| Axis | Standard | Verdict | Main reservation |
|---|---|---|---|
| **Data** | ISO/IEC 25012:2008 | 🟡 **Conforming with reservation** | The 7 characteristics are really encoded and executable, but the **documented "5 schema + 2 integrity" decomposition is inexact** (compliance omitted; accuracy/accessibility split). |
| **Architecture** | ISO/IEC/IEEE 42010:2022 | 🟡 **Conforming with reservation** | Stakeholders / concerns / viewpoints complete, but one viewpoint cites an **obsolete naming** ("spine WF-001→003"). |
| **Software / runtime** | ISO/IEC 25010 | 🟢 **Conforming** | Reliability (fail-closed), maintainability (strict types, 111 tests), security (anti-traversal, read-only, key guard) demonstrated. Observability note (live run captured in `/tmp`, not versioned). |
| **AI governance** | ISO/IEC 42001:2023 | 🟢 **Conforming** | Invariants traced (ADR-0001/0004/0005), explicit honesty about guarantees. AI risk analysis only implicit (see ISO 23894, deferred). |

**Overall verdict**: a **solid and defensible** foundation. No major non-conformance. The reservations are **documentary/factual** (consistency of the statements), not design flaws. The remediation plan (§7) is mostly "wording fixes" + 2 deferred-standard triggers to record.

---

## 1. Evidence corpus (reproducible)

| Evidence | Source | Finding on 2026-06-11 |
|---|---|---|
| Test suite | `npx vitest run` | **111 passed, 2 skipped** (live runs guarded by `LIVE_RUN=1`), 16 files |
| Strict typing | `npm run typecheck` (`tsc --noEmit`) | **OK**, zero error |
| Vulnerabilities | `npm audit` | **0 vulnerability** |
| WF-001 live run | CHANGELOG [Unreleased] + [NEXT_STEPS §2.4-B.3](../NEXT_STEPS.md) | `completed` "full-throttle" 2026-06-09 — **0 failing criterion** (blocking + advisory), 3 agents live, subscription OAuth |
| API-key guard (env) | `echo $ANTHROPIC_API_KEY` | **unset** (budget rule structurally held) |
| Repo cleanliness | `git ls-files \| grep DS_Store` | no tracked `.DS_Store`; `.gitignore:34` covers it |
| License | `LICENSE`, `package.json:6`, `README.md:66` | **MIT** © 2026 Guy HUI-BON-HOA |

---

## 2. Data axis — ISO/IEC 25012:2008

**Audit question** ([NEXT_STEPS §3.2](../NEXT_STEPS.md)): does the sidecar *really* encode the 7 announced characteristics? Recompute, not declarative.

### 2.1 Actual census of the encoded characteristics

| # | ISO 25012 characteristic | Real encoding | Evidence |
|---|---|---|---|
| 1 | **Completeness** | Schema: `assets` `minItems: 1` | `schema/sidecar.schema.json` (`assets`) |
| 2 | **Consistency** | Schema: `dependsOn` edges + `if/then` per `type` | same (`$defs/asset` `allOf`) |
| 3 | **Credibility** | Schema: `source = {file, catalogTag}` (provenance) | same (`source`) |
| 4 | **Currentness** | Schema: pinned `catalogTag` + `generatedAt` (ISO 8601) | same (`generatedAt`, `catalog.version`) |
| 5 | **Compliance** | Schema: `type` enum `agent\|skill\|workflow` | same (`type`, annotated "ISO 25012: compliance") |
| 6 | **Accuracy** | Schema: well-formed `id` (pattern) **+ integrity**: uniqueness (`checkUniqueIds`) + referential (`checkReferentialIntegrity`) | `src/sidecar/integrity.ts:23,38` |
| 7 | **Accessibility** | Schema: `path`/`source.file` anti-traversal (pattern) **+ integrity**: real reachability (`checkAccessibility`) | `src/sidecar/integrity.ts:61` |

**Test coverage**: `test/sidecar.schema.test.ts` (18 cases) + `test/sidecar.integrity.test.ts` (8 cases) → data quality is **executable**, not declarative. ✅ A real, differentiating strength.

### 2.2 Criterion → evidence → verdict

| Criterion | Evidence | Verdict |
|---|---|---|
| The 7 chosen characteristics (ADR-0006) are encoded | §2.1 table: 7/7 present, of which 5 fully at the schema + 2 (accuracy, accessibility) split schema↔integrity | **Conforming** |
| The encoding is executable (not declarative) | 26 green tests (schema 18 + integrity 8), fail-closed at load (`src/loader/load-sidecar.ts`) | **Conforming** |
| The **documented decomposition** is exact | ❌ **Gap**: the "**5 schema + 2 integrity**" formula (CHANGELOG [0.2.0], [NEXT_STEPS §1 l.15](../NEXT_STEPS.md), schema `$id`) **omits `compliance`** from the "5" enumeration, and counts `accuracy`/`accessibility` as purely "integrity" whereas they are **well-formed from the schema**. The **total of 7 holds**, the **breakdown does not**. | **Partial** |

> **ISO 19011 finding (nuanced verdict owned)**: the substance is conforming (7 characteristics really encoded and tested), but the **statement** describing it is inexact. An external reviewer who recounts will find 5 characteristics fully at the schema (including `compliance`, not listed) + 2 split — not "5+2" disjoint. To fix so that the documentation tells the truth of the code (see P1).

---

## 3. Architecture axis — ISO/IEC/IEEE 42010:2022

**Audit question**: stakeholders / concerns / viewpoints complete and consistent.

| 42010 criterion | Evidence | Verdict |
|---|---|---|
| Stakeholders identified | `ARCHITECTURE.md:54-60` — 4 stakeholders (owner, catalog, external reviewer, SDK execution) with a primary concern | **Conforming** |
| Concerns attached | same | **Conforming** |
| Viewpoints → views | `ARCHITECTURE.md:62-68` — 4 viewpoints (Dependency, Data, Execution, Governance), each attached to a view/ADR | **Conforming** |
| Decisions traced (ADR correspondence) | 7 ADRs (`docs/adr/0001`→`0007`), invariants listed `ARCHITECTURE.md:42-48` | **Conforming** |
| **Consistency** of the statements | ❌ **Minor gap**: the "Execution" viewpoint (`ARCHITECTURE.md:67`) speaks of "Orchestration of the **WF-001→003** spine" — **obsolete placeholder naming**. [NEXT_STEPS §2.4-B.3 l.74](../NEXT_STEPS.md) explicitly states that the actually executable unit is the **backbone of ONE workflow** (e.g. WF-001), not a WF-001→003 macro-chain. | **Partial** |

> **Axis verdict: Conforming with reservation.** The architecture description is structured per the standard. The only gap is an **internal inconsistency** between `ARCHITECTURE.md` (historical term) and `NEXT_STEPS.md` (later clarification) → to align (P2).

---

## 4. Software / runtime axis — ISO/IEC 25010

**Audit questions**: reliability (fail-closed), maintainability (tests, strict types), security (anti-traversal, read-only, API-key guard).

### 4.1 Reliability

| Criterion | Evidence | Verdict |
|---|---|---|
| Fail-closed loading | `src/loader/load-sidecar.ts` (parse→schema→integrity, short-circuit, aggregated `SidecarValidationError`) | **Conforming** |
| Fail-closed handoff | `src/handoff/validate-handoff.ts` (`validateHandoff` throws if non-conforming upstream/downstream) | **Conforming** |
| Fail-closed eval gate | `src/eval/eval-gate.ts` (`assertGatePassed`); `runEvalGate` produces evidence even on success | **Conforming** |
| Live run fails **cleanly** | Run of 2026-06-09: 1st run `failed` fail-closed at STEP-03 (contract mismatch, **valid result traced**) before fix | **Conforming** (the failure is *controlled*) |

### 4.2 Maintainability

| Criterion | Evidence | Verdict |
|---|---|---|
| Strict typing | `npm run typecheck` OK (zero error) | **Conforming** |
| Test coverage | 111 green tests / 16 files; **hermetic** tests (`query` injectable → zero network) | **Conforming** |
| DRY / factoring | `src/spines/spine-helpers.ts` shared by the 3 spines (WF-001 refactored with no behavior change) | **Conforming** |
| Technical debt | §2.6 cleared: `vitest` 2→4, `npm audit` 5→0 | **Conforming** |

### 4.3 Security

| Criterion | Evidence | Verdict |
|---|---|---|
| Anti-traversal | Schema: `path`/`source.file` pattern `^(?!/)(?!.*\.\.).+$` **+** double guard `src/sidecar/integrity.ts:61-72` (rejects absolute / `..`) | **Conforming** |
| Read-only forced | `src/sdk/query-runner.ts:159` — `permissionMode: "plan"` forced, not overridable (ADR-0001) | **Conforming** |
| Metered API-key guard | `src/sdk/query-runner.ts:137` — refuse BEFORE any call if `ANTHROPIC_API_KEY` is set (subscription OAuth only) | **Conforming** |
| Hard per-run caps | `src/sdk/query-runner.ts:152-157` — `maxTurns`/`maxBudgetUsd` capped even if the agent asks for more | **Conforming** |
| Vulnerability surface | `npm audit` = 0; Dependabot posture + auto fixes ON | **Conforming** |

> **Observability note (non-blocking)**: the live run's structured result is captured via `LIVE_RESULT_FILE` (default `/tmp/wf-001-live-result.json`, `test/wf-001-run-live.test.ts`) — **ephemeral, not versioned**. The "full-throttle" execution evidence survives only as **prose** (CHANGELOG / NEXT_STEPS). Acceptable for a POC, but audit traceability would benefit from versioning an anonymized trace (P3).

> **Axis verdict: Conforming.** Reliability, maintainability, and security are backed by convergent factual evidence.

---

## 5. AI governance axis — ISO/IEC 42001:2023

**Audit questions**: principles, risks, lifecycle; consistency of invariants (read-only ADR-0001, guarded propagation ADR-0004).

| 42001 criterion | Evidence | Verdict |
|---|---|---|
| Explicit governance principles | 7 ADRs; invariants `ARCHITECTURE.md:42-48` (read-only, pinning, sidecar SSOT, guarded propagation, human-PR feedback) | **Conforming** |
| Read-only invariant | ADR-0001 + forced `permissionMode:"plan"` (`query-runner.ts:159`) + read-only adapter | **Conforming** |
| **Guarded** propagation (risk control) | ADR-0004 (contract validation + eval gates in CI, *fail-closed*, human merge) | **Conforming** |
| Feedback without automatic write-back | ADR-0005 (human PR only) | **Conforming** |
| **Honesty about guarantees** (anti-false-signal) | ADR-0004 §"Explicit limit", ADR-0007 §"Explicit limit": the limits are written, not hidden | **Conforming** (exemplary) |
| Controlled lifecycle | ADR-0002 (explicit tracked bump) + CI (§2.5) + CHANGELOG/NEXT_STEPS docs-as-code | **Conforming** |
| **Formalized** AI risk management | Eval gates = *de facto* risk control (the live run materialized then handled a real risk: contract divergence). No formal **risk register** → falls under ISO 23894, **deferred** (§6) | **Conforming** to the 42001 scope; formal risk → see P5 |

> **Axis verdict: Conforming.** The governance invariants are consistent, traced, and **really applied in the code** (not just declared). The honesty posture (explicit limits) is a strength aligned with ISO 19011.

---

## 6. Deferred standards — status review ([NEXT_STEPS §3.3](../NEXT_STEPS.md))

| Deferred standard | Trigger ([ADR-0006](../adr/0006-referentiels-qualite.md)) | Status on 2026-06-11 | Decision |
|---|---|---|---|
| **ISO/IEC 25024:2015** (data-quality metrics) | "when we want **quantified** metrics" | The live run produced **de facto counts** (13 US, 5 epics, 7 scenarios) but **no formal metrics system** | **Stays deferred** — re-assessable if catalog quality reporting is wanted |
| **ISO/IEC 23894:2023** (AI risk management) | "when the eval gates evolve toward **formalized risk management**" | Deterministic gates in place; a real risk **materialized then handled** at the live run, but **no risk register** | **Trigger approaching** — recommended if industrialization (P5) |
| **ISO/IEC 5230 (OpenChain)** (license compliance) | "when **setting the license**" | ⚠️ **Trigger REACHED**: license **set to MIT** (`LICENSE`, `package.json:6`, `README.md:66`) — the "to be defined" of ADR-0006 is resolved | **To activate (P4)**: check dependency-license compatibility with MIT |

---

## 7. Prioritized remediation plan

| # | Priority | Action | Target | Effort | Impact |
|---|---|---|---|---|---|
| **P1** | 🔴 High | Fix the **ISO 25012 decomposition**: state the **7 characteristics** with their exact encoding location (5 fully at the schema — including `compliance` — + `accuracy`/`accessibility` split schema↔integrity). Replace the misleading "5 schema + 2 integrity" formula. | `schema/sidecar.schema.json` (`$id` desc), `CHANGELOG.md` [0.2.0], `NEXT_STEPS.md` §1 l.15 | Low | Doc credibility / honesty (Data axis → Conforming) |
| **P2** | 🟠 Medium | Align the **"Execution" viewpoint** to the real naming: "a workflow backbone" instead of "spine WF-001→003". | `ARCHITECTURE.md:67` | Low | Cross-doc consistency (Architecture axis → Conforming) |
| **P3** | 🟡 Low | **Version a trace** of the "full-throttle" live run (anonymized structured result) as an audit artifact, instead of the ephemeral `/tmp`. | new `docs/audit/` or a fixture | Low | Audit traceability (observability) |
| **P4** | 🟠 Medium | **ISO 5230 triggered**: check the compatibility of dependency licenses (`@anthropic-ai/claude-agent-sdk`, `ajv`, `vitest`…) with MIT; record the result. | new check / note | Low | License compliance (deferred standard activated) |
| **P5** | 🟡 Low (if industrialization) | **ISO 23894**: a lightweight AI risk register (the live run already provided a real case: contract divergence → schema tightening). | `docs/` | Medium | Formalized risk management (at the product→engagement transition) |

> **No action touches production code** (consistent with the audit constraint: read/analysis only). P1/P2 are documentary fixes; P3/P4/P5 are traceability/governance additions.

---

## 8. Conclusion

The `claude-agentic-runtime` POC shows **real and defensible quality** across the 4 chosen axes. The thesis — *real agents + real catalog + deterministic handoffs/gates → a workflow that succeeds live, controlled quality, read-only, capped* — is **empirically validated** by the "full-throttle" live run of 2026-06-09.

The gaps found are **honest and circumscribed**: they concern the **precision of the documentary statements** (P1, P2) and the **activation of two deferred standards** whose triggers are now reached or close (P4 licenses, P5 risk), **not the design**. No false quality signal was detected; on the contrary, the documentation exposes its own limits (ADR-0004/0007).

**Before industrialization** (moving from "portfolio asset" to "engagement product"), handling P1, P2, and P4 is recommended; P3 and P5 become priorities if a client engagement requires it.

---

> Report produced with **Claude Opus 4.8** (2026-06-11). ISO 19011 audit posture — factual evidence, independence, nuanced verdict owned.
