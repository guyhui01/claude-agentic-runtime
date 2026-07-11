# Next steps — `claude-agentic-runtime`

> POC execution roadmap + ISO quality-audit planning.
> Living document (updated at each step). Decisions frozen in [`docs/adr/`](adr/); full scoping in [`docs/note_cadrage_poc.md`](note_cadrage_poc.md).
> Model in use: **Claude Opus 4.8**.

---

## 1. Current state (updated 2026-07-02)

> **Current snapshot (v0.6.0)**: **full backbone** POC — the 3 workflow backbones (WF-001, WF-002, WF-003) **proven live** (`completed`), first released as **`v0.4.0`** (annotated tag + GitHub Release). Since then: **FR→EN i18n complete** (R1–R3 — runtime now **expects English deliverables**) → released as **`v0.5.0`** (2026-06-17) then **`v0.6.0`** (2026-06-21); project **relicensed to PolyForm Noncommercial 1.0.0** (BSL 1.1 → PolyForm; ISO 5230 audit aligned). ISO quality audit v1 delivered; remediations **P1–P4 closed**, **P5 not retained** (see §3.5). Ongoing **dependency maintenance** via Dependabot — **2026-07-02**: `actions/checkout` v6→v7 (#26), `@anthropic-ai/claude-agent-sdk` 0.3.177→0.3.195 (#29), `@types/node` 25→26 + `vitest` 4.1.8→4.1.9 (#27) — all merged after local revalidation (typecheck + suite green; #27 rebased before merge); **2026-07-11**: `@anthropic-ai/claude-agent-sdk` 0.3.195→0.3.201 (#30) — merged after local revalidation (typecheck + suite 130/6 green). **Per-run model routing shipped (2026-07-02)**: `RunWf00XOptions.model` flows through the derived resolver into `query()` (SDK alias, e.g. `"fable"` = separate-quota live runs); live harnesses honor `LIVE_MODEL=<alias>`; hermetic proof `test/run-wf-model-override.test.ts` (temp catalog, model captured at query options for every step of the 3 spines). **Proven live 2026-07-02**: WF-001 with `LIVE_MODEL=fable` → `completed` in 145 s (3/3 steps `pass`; advisory `po-us-format-invest` non-blocking FAIL), Fable separate-quota counter consumed; anonymized trace versioned at `docs/audit/live-runs/wf-001-live-result.json`. **WF-008 spine added + proven live 2026-07-11** (new "AI Act / GDPR Compliance Audit" backbone, 8 steps incl. the counter-review gate `AUDIT-METHODO-IA`, on the unchanged linear orchestrator; requires catalog sidecar ≥ v4.1.0): live run with `LIVE_MODEL=fable` → **`failed` fail-closed at STEP-06C by design** — STEP-01→06 all `pass`, then the counter-review gate **returned the audit for rework** (`verdict = "returned"`, 5 documented reservations + bias log + ISTQB exit criteria; only blocking `audit-verdict-cleared` did not clear), halting the report (STEP-07). First live traversal of the counter-review gate, and the first trace showing the fail-closed halt **blocking** a deliverable (a stronger credibility signal than an all-green run). Anonymized trace `docs/audit/live-runs/wf-008-live-result.json`. Suite **139 green / 8 skipped** (billed live harnesses + `runIf` markers, catalog present), strict `typecheck` OK. Backlog **empty** (POC backbone); next step is **conditional** = industrialization → enable ISO 23894/25024 (§3.4). The block log below documents the **historical build** (original dates kept).

**Block 0 (Loader) — done.**

| Item | File | ISO 25012 coverage |
|---|---|---|
| Sidecar schema (JSON Schema 2020-12) | `schema/sidecar.schema.json` | 5 characteristics FULLY carried: completeness, consistency, credibility, currentness, **compliance** (`type` enum) + a *well-formed* seed of accuracy (`id`) and accessibility (`path`/`source.file` anti-traversal) |
| Integrity checks | `src/sidecar/integrity.ts` | COMPLETE accuracy (referential + id uniqueness) and accessibility (real reachability), out of a JSON Schema's reach → total **7** characteristics (see audit v1 P1: the "5+2" formula was inexact) |
| Fail-closed loader | `src/loader/load-sidecar.ts` | orchestrates schema + integrity (ADR-0004) |
| Types | `src/sidecar/types.ts` | TypeScript mirror of the sidecar |

**Block 1 (handoff contracts) — done (2026-06-04, Opus 4.8).**

| Item | File | Role |
|---|---|---|
| Contract types | `src/handoff/types.ts` | `StepContract { stepId, input?, output }` + `HandoffIssue` |
| Validator | `src/handoff/validate-handoff.ts` | `checkContractCompatibility` (static, shallow) + `validateHandoff` (runtime, fail-closed); ajv2020 reused from the loader |
| Tests | `test/handoff.test.ts` | 7 cases (static compat + upstream/downstream runtime + aggregation) |

**Block 2 (eval gate) — done (2026-06-04, Opus 4.8).**

| Item | File | Role |
|---|---|---|
| Types | `src/eval/types.ts` | `Criterion` (deterministic, `blocking`/`advisory`) + `GateReport` (audit evidence) |
| Gate | `src/eval/eval-gate.ts` | `runEvalGate` (evaluates, never throws) + `assertGatePassed` (enforces, fail-closed) |
| Tests | `test/eval-gate.test.ts` | 6 cases (WF-001 scoping DoD: pass · non-blocking advisory · blocking fail · defensive check · fail-closed) |

**§2.4-A (catalog → SDK adapter) — done (2026-06-04, Opus 4.8).**

| Item | File | Role |
|---|---|---|
| Adapter | `src/sdk/to-agent-definition.ts` | `Asset` (+ `.md` prose) → SDK `AgentDefinition`; read-only (ADR-0001), read-only defaults + overrides (data gap §2.1) |
| Tests | `test/sdk-adapter.test.ts` | 5 cases (prose→prompt mapping · defaults · overrides · non-agent rejection · anti-traversal) |

Verified package: **`@anthropic-ai/claude-agent-sdk`** (^0.3.162; `AgentDefinition` type, `query({prompt, options})`).

**§2.4-B.1 (spine orchestrator, offline) — done (2026-06-04, Opus 4.8).** `src/orchestrator/{types,run-spine}.ts`: `runSpine` + injectable `StepRunner`, static pre-flight + eval gate + fail-closed handoff + provenance/`GateReport` traced (see §2.4-B below).

**§2.4-B.2 (spine manifest + criteria registry, offline) — done (2026-06-04, Opus 4.8, [ADR-0007](adr/0007-source-contrats-criteres-manifeste-runtime.md)).** `src/manifest/{types,load-manifest}.ts` + `src/eval/criteria-registry.ts`: `loadSpine` assembles a manifest into `SpineStep[]`, fail-closed sidecar/registry cross-checks (see §2.4-B.2 below).

**Total at completion of §2.4-B.2 (2026-06-04): 64 tests green, strict `typecheck` OK** (up-to-date state: *Current snapshot* at the top of §1). Source of contracts/criteria/definitions = fixtures for now (wiring to the real source deferred — YAGNI, block 0 untouched). Eval gate choice: **deterministic** criteria, no LLM-as-judge (reproducible/auditable; LLM judge = later extension if needed).

---

## 2. Roadmap (by priority)

### 2.1 — Block 1: typed handoff contracts ✅ *(core value — DONE 2026-06-04)*
- ✅ Schematized I/O (JSON Schema) validated between steps, reusing the loader's ajv pattern.
- ✅ Two ADR-0004 levels: **static** upstream↔downstream compatibility + fail-closed **runtime** payload validation.
- ▶️ **Still to wire** (at SDK integration §2.4): the **real source** of contract schemas (extended sidecar vs manifest) — currently in fixtures.

### 2.2 — Block 2: an eval gate ✅ *(DONE 2026-06-04)*
- ✅ Deterministic quality guardrail on a step's output (WF-001 scoping DoD as a fixture).
- ✅ Fail-closed (`assertGatePassed`), traceable evaluation kept separate (`runEvalGate` produces evidence even on success), consistent with ADR-0004 + ISO 19011 posture.
- ▶️ **Still to wire** (SDK integration §2.4): the real per-step criteria, sourced from the catalog (see §2.1, same source decision).

### 2.3 — Sidecar generator ✅ *(DONE 2026-06-09, outside this repo — `claude-agents` v3.26.0)*
- **ADR-0003 compliance**: the generator belongs to **`claude-agents`** (generated + validated in CI on the catalog side). The runtime only **reads**.
- ✅ **Delivered (2026-06-09, Opus 4.8, `claude-agents` v3.26.0)**: `tools/generate-sidecar.mjs` parses the `AGENT-*.md` files → `sidecar.json` conforming to THIS schema (pinned 1.0.0 copy vendored on the catalog side, SSOT = this repo, anti-drift guard via `$id` pin). Scope = WF-001 backbone (3 agents), `dependsOn: []` (skills not yet indexed). ajv validation + integrity + CI on the catalog side (`.github/workflows/sidecar.yml`). Verified consumable here (see §2.4-B.3 below + `test/run-wf-001-real-sidecar.test.ts`). WF-002/003 extension = adding ids to the generator.

### 2.4 — Claude Agent SDK integration *(spine execution)*
- ✅ **§2.4-A DONE (2026-06-04)**: package verified (`@anthropic-ai/claude-agent-sdk`, see [[feedback-verification-factuelle]]) + `Asset → AgentDefinition` adapter (read-only, tested, no network).
- ✅ **§2.4-B.1 — orchestrator + injectable runner (OFFLINE, DONE 2026-06-04, Opus 4.8)**: `src/orchestrator/{types,run-spine}.ts`. `runSpine` runs WF-001→002→003 by plugging in an **injectable runner** (abstraction of `query()`, mocked), the **eval gate** (block 2, fail-closed), and the **handoff contracts** (block 1, fail-closed); **static pre-flight** of adjacent contracts before execution; **pure** orchestrator (zero disk/network); **provenance** (`assetId`/`catalogTag`) + **`GateReport`** recorded in a trace kept even on failure. 6 hermetic tests → **57 tests green**, strict `typecheck` OK. Contracts/criteria source still in fixtures.
- ✅ **§2.4-B.2 — source of contracts/criteria: DECIDED (2026-06-04, [ADR-0007](adr/0007-source-contrats-criteres-manifeste-runtime.md))**: **spine manifest owned by the runtime** — contracts in JSON Schema (data) + criteria **referenced by `id`** from a **TS criteria registry** (deterministic code, no premature DSL), `stepId`/`assetId` cross-check against the sidecar (descriptive, unchanged — ADR-0003). Decisive technical fact: a `Criterion.check` is **code**, not serializable into a sidecar without inventing a DSL. Consistent with ADR-0001/0002/0004. ✅ **Implemented (2026-06-04, Opus 4.8, offline)**: `src/manifest/{types,load-manifest}.ts` (`loadSpine` → `SpineStep[]`, fail-closed asset/agent + criterion + provenance cross-checks, aggregated `ManifestValidationError`) + `src/eval/criteria-registry.ts` (registry by `id`, duplicate rejection, fail-closed `resolve`). `runSpine` unchanged (assembler upstream). 7 hermetic tests → **64 tests green**, strict `typecheck` OK. ✅ **Real manifest + real criteria DONE (offline, 2026-06-07, Opus 4.8)** — see §2.4-B.3 below. Remaining: wire the `query()` adapter (live run).
- ✅ **§2.4-B.3 — live spine run: EXECUTED (2026-06-09, Opus 4.8, observed run, subscription OAuth)** — replace the mock runner with `query()` and run for real: DONE. **ISO audit trigger §3.4 reached** ("the spine executes"). 1st run result: **`failed` fail-closed at STEP-03** (eval gate) — **STEP-01 (BUSINESS-ANALYST) passed live** (conforming JSON), stop at STEP-03 (PO-SCRUM). Cause = **contract mismatch, not agent weakness**: the agent produced 24 US / 9 epics (DoD: 8–15 / 3–5) and named `userStory`/`criteresAcceptation` instead of `statement`/`dod`, because the output schema was too loose to convey it. **Fix shipped the same day**: STEP-03/04 output schemas **tightened** (exact item shape + `minItems`/`maxItems` bounds) → the injected format = the contract the gate checks (`src/spines/wf-001-cadrage.ts`, `arrOf` helper, test `test/wf-001-output-contract.test.ts`). Reproducible live-run harness: `test/wf-001-run-live.test.ts` (guarded by `LIVE_RUN=1`, skipped by default). ✅ **Live re-run AFTER fix: `completed` (2026-06-09)** — the 3 agents live, **all *blocking* gates passed**: STEP-01 ✓ · STEP-03 ✓ (**13 US** ∈ 8–15, `statement/priorite/estimation/dod` fields, **5 epics** ∈ 3–5) · STEP-04 ✓ (**7 scenarios** `given/when/then`, test plan). Proof the tightening was the right cause (24 US/9 epics → 13/5 within bounds). ✅ **"Full-throttle" scoping (2026-06-09)**: the 2 *advisory* criteria handled → re-run-3 `completed` with **0 failing criterion** (blocking + advisory). (a) `qa-cas-erreur-et-limite`: nudge via schema description → the agent produces `nominal/erreur/limite`. (b) `po-us-format-invest`: **criterion bug, not agent bug** — the `que `/`de ` regex rejected correct French elision (« En tant qu'assuré… afin d'éviter… »); regex fixed (`qu['’e]`/`d['’e]`), validated 12/12 on the real live output + fixture. **POC thesis empirically validated**: real agents + real catalog + deterministic handoffs/gates → a real WF-001 scoping that succeeds live, **all blocking AND advisory gates green**, controlled quality, read-only, capped.
  - ✅ **Offline prep DONE (2026-06-07, Opus 4.8)**: first REAL spine delivered in `src/spines/wf-001-cadrage.ts` — **WF-001 backbone** (`STEP-01 BUSINESS-ANALYST → STEP-03 PO-SCRUM → STEP-04 QA-AGILE`) sourced from the real workflow `claude-agents/workflows/WF-001-cadrage-produit-ia.md` v1.2, **11 deterministic criteria** traced to the real DoDs (8 *blocking* + 3 *advisory*). 6 hermetic tests → **70 tests green**. NB: the "WF-001→002→003" in the sections above was the fixtures' **placeholder naming**; the actually executable unit is the backbone of ONE workflow (here WF-001), with the conditional steps (UX/CHANGE/SAFe) staying out of the backbone.
  - ✅ **`query()` runner adapter DONE (2026-06-08, Opus 4.8, offline)**: `src/sdk/query-runner.ts` — `createQueryRunner(deps)` wraps the SDK's `query()` behind `StepRunner` (injectable `query` → hermetic tests). 4 fail-closed guards (refuse if `ANTHROPIC_API_KEY` is set · `permissionMode:"plan"` forced · hard caps `maxBudgetUsd`/`maxTurns` · non-`success` result ⇒ throw). 9 tests → **79 tests green**, strict typecheck OK. No billed call.
  - ✅ **(1) real sidecar — DONE (2026-06-09, `claude-agents` v3.26.0)**: §2.3 generator delivered; the 3 WF-001 agents' `sidecar.json` proven consumable here via `loadSidecar` (schema + integrity + real accessibility) → `toAgentDefinition` (real prose) → `assembleWf001Spine` → `runSpine` (`test/run-wf-001-real-sidecar.test.ts`, offline, cleanly skipped if the catalog is absent → runtime CI green). The interim sidecar of `test/spine-wf-001.test.ts` stays for pure hermeticity.
  - ✅ **(2) wiring `createQueryRunner` into `runSpine` — DONE**: `src/spines/run-wf-001.ts` (`runWf001`/`assembleWf001Spine`) assembles the real manifest + registry + resolver + `query()` runner. Runner guards covered by `query-runner.test.ts`.
  - ✅ **LIVE RUN DONE + "FULL THROTTLE" (2026-06-09)**: 1st run `failed`@STEP-03 (contract mismatch) → contract tightening → re-run `completed` (blocking OK, 2 advisory KO) → advisory nudges + elision regex fix → **`completed`, 0 failing criterion** (blocking + advisory). See the §2.4-B.3 line above. Nothing left on WF-001.
  - **Auth prerequisite (budget rule)**: **subscription OAuth Pro/Max only** (`claude` login) — **DO NOT** set `ANTHROPIC_API_KEY` (metered key = per-token billing + priority over OAuth → overrun risk). At quota limit: *fail-closed* failure, no paid fallback. Verified 2026-06-04: variable absent at all 3 scopes (rule already held). See memory `feedback-budget-quota-abonnement`.
  - **Per-run guard**: low `maxBudgetUsd` + low `maxTurns` + `permissionMode: "plan"` (read-only). To launch **on explicit approval from Guy + observed run**.
  - It is this end-to-end run that **reaches the ISO audit trigger §3.4** ("when the spine executes").
- ✅ **§2.4-B.4 — other real spines DONE (2026-06-08, Opus 4.8, offline)**: each workflow modeled as its **own backbone** (non-conditional sequential subset), real agents + DoD criteria, on the model of `src/spines/wf-001-cadrage.ts`. Schema/predicate helpers factored into `src/spines/spine-helpers.ts` (DRY, shared by the 3 spines; WF-001 refactored with no behavior change).
  - [x] **WF-002 spine — SAFe Agile Delivery** (`src/spines/wf-002-delivery.ts`): backbone STEP-01→02→03→04→06 (PRODUCT-MANAGER-SAFE, RELEASE-TRAIN-ENGINEER, PO-SAFE, SCRUM-MASTER, CHEF-PROJET-IA); QA (STEP-05, parallel) and CHANGE (STEP-07, conditional) out of backbone. 14 DoD criteria (confidence vote > 3.5, 3-5 PI Objectives, 5-10 US, executive-committee reporting). 5 hermetic tests.
  - [x] **WF-003 spine — AI Application Launch** (`src/spines/wf-003-lancement.ts`): full backbone of the 7 core agents STEP-00→06 (FINANCIAL-ANALYST, PROMPT-ENGINEER, AI-ARCHITECT, DEV-PYTHON-IA, QA-AGILE, DEVOPS-CLOUD, SECURITE-IA); DEV-TYPESCRIPT-IA fork (optional) out of backbone. 18 DoD criteria (financial Go, coverage ≥ 80%, success rate ≥ 90%, golden dataset 20-50, 0 Critical OWASP LLM, < 2 High). 6 hermetic tests.
  - [x] **§2.3 generator extended to WF-002/003 (DONE 2026-06-12, Opus 4.8, `claude-agents` v3.26.2)**: `WORKFLOW_BACKBONES` covers the 3 backbones → `sidecar.json` **14 assets** (deduplicated union — `AGENT-QA-AGILE` shared WF-001/003), ajv schema + integrity + `--check` green. Consumability proven here: `run-wf-001-real-sidecar.test.ts` passes **without `CATALOG_ROOT`** (default realigned, see below), perimeter assertion switched to **inclusion** (the runtime depends only on what it consumes — the exact inventory is the property of the catalog generator + its CI `--check`, ADR-0002/0003); runtime suite **111 green**. **Topology fixed along the way**: `CATALOG_ROOT` default realigned to the real `claude-agents` repo (single point of truth `test/catalog-root.ts`, end of the `claude-catalogue` duplication in 2 tests + MCP template); the old stale `claude-catalogue` clone (4 commits behind, 0 unique) archived. The interim sidecars of `spine-wf-002/003.test.ts` stay for pure hermeticity.
  - [x] **Live wiring + tightening + offline proof WF-002/003 (DONE 2026-06-13, Opus 4.8)**: `src/spines/run-wf-002.ts` + `run-wf-003.ts` (`assembleWf00X`/`runWf00X` modeled on `run-wf-001.ts`). **Output schemas tightened** (WF-001 lesson: injected schema == gate contract; blocking bounds → `minItems/maxItems`, blocking fields → `required`, advisory → `description`). Offline proof: hermetic tests (`run-wf-00X.test.ts`: mock→`completed`, eval-gate→`failed`, budget/config guards) + **real-sidecar** tests (`run-wf-00X-real-sidecar.test.ts`: real `sidecar.json` → real prose → `completed`, 5/7 gates pass); shared fixtures `test/fixtures/wf-00X-outputs.ts` (DRY). **Live harnesses kept** `wf-00X-run-live.test.ts` (`LIVE_RUN=1`, P3 capture). Suite **123 green** (offline), strict typecheck OK. ✅ **Observed and conclusive live runs (2026-06-13, on explicit approval): WF-002 `completed` (5/5) + WF-003 `completed` (7/7)** — the STEP-03 fix (the SDK's native structured output) **validated live**; **versioned traces** (`docs/audit/live-runs/`, `git add -f`, P3 review OK, no secret) → **P3 artifact closed**. Count with catalog present: **126 passed / 6 skipped** (3 billed live harnesses + 3 `runIf` markers). Released as **`v0.4.0`** (annotated tag + GitHub Release).

### 2.5 — CI pipeline ✅ *(DONE 2026-06-08, Opus 4.8)*
- ✅ **CI workflow** (`.github/workflows/ci.yml`): `npm ci` + strict `typecheck` + `npm test` on a Node 20/22 matrix, `push`/`PR` to `main` (the suite covers ajv schema validation + eval gates, fail-closed). `concurrency` + `permissions: contents read`.
- ✅ **Dependabot** (`.github/dependabot.yml`): weekly npm + github-actions bumps as **tracked PRs** (consistent with ADR-0002). Since the `claude-agents` catalog is not an npm dependency (pinned by `catalogTag`), its bump stays a tracked manual commit — out of Dependabot's scope.

### 2.6 — Technical debt ✅ *(CLEARED 2026-06-08, Opus 4.8)*
- ✅ **`vitest` 2 → 4 upgrade** (`^4.1.8`) done: **94 tests green** on vitest 4, strict `typecheck` OK, no regression or config change.
- ✅ **`npm audit`: 5 vulnerabilities → 0**. Factual correction: they came from the **vitest 2 → vite → esbuild** chain (dev), NOT from the SDK; the v4 upgrade purges them (`found 0 vulnerabilities`).
- ✅ **Repository security posture enabled**: Dependabot vulnerability alerts + automatic security fixes **ON** (GitHub repo-side settings). Automatic detection + fix PRs for any future flaw (consistent with ADR-0002).

---

## 3. ISO quality-audit planning

> ⚠️ **Not a certification.** Per [ADR-0006](adr/0006-referentiels-qualite.md), the ISO standards are a **methodological framework**, not a certification goal (zero ROI solo). This audit is an **internal self-assessment (gap analysis)**. Certification stays out of scope, **re-assessable if a client engagement requires it**.

### 3.1 — Object
Measure, with evidence, the gap between the repo's state and the **4 chosen standards** (ADR-0006): data, structure, architecture, governance.

### 3.2 — Scope (the 4 chosen standards)
| Axis | Standard | What is audited |
|---|---|---|
| **Data** | ISO/IEC 25012:2008 | Does the sidecar really encode the chosen **7 characteristics**? (5 fully at the schema — including compliance — + accuracy/accessibility split schema↔integrity; see audit v1 P1). Recompute/check, not declarative. |
| **Architecture** | ISO/IEC/IEEE 42010:2022 | `ARCHITECTURE.md` + ADR: stakeholders / concerns / viewpoints complete and consistent. |
| **Software / runtime** | ISO/IEC 25010 | Reliability (fail-closed), maintainability (tests, strict types), security (anti-traversal, read-only). |
| **AI governance** | ISO/IEC 42001:2023 | Principles, risks, lifecycle; consistency of invariants (read-only, guarded propagation). |

### 3.3 — Method
- A grid of **one criterion → one piece of evidence → one verdict** (Conforming / Partial / Not covered) → recommendation.
- Audit posture aligned with **ISO 19011** (objectivity, factual evidence, independence) — consistent with [[feedback-projet-avant-validation-sociale]] and [[feedback-verification-factuelle]]: **dare the unfavorable verdict** if the evidence demands it.
- Check the **deferred structures** (ISO 25024 metrics, 23894 AI risk, 5230 licenses): still out of scope, or trigger reached?

### 3.4 — Trigger *(a condition, not a fixed date — solo POC)*
ADR-0006 review clause: audit triggered at a **major milestone**, namely:
- **End of POC**: after delivering **block 2** (eval gate), when a workflow backbone (e.g. WF-001) executes;
- **AND before any industrialization** (moving from "portfolio asset" status to "engagement product").

### 3.5 — Deliverable ✅ *(DONE 2026-06-11, Opus 4.8)*
- ✅ [`docs/audit/audit_qualite_iso_v1.md`](audit/audit_qualite_iso_v1.md): dated report, Claude model stated, criterion→evidence→verdict grid per axis + prioritized remediation plan. **Verdicts**: Data (25012) 🟡 Conforming with reservation · Architecture (42010) 🟡 Conforming with reservation · Software/runtime (25010) 🟢 Conforming · AI governance (42001) 🟢 Conforming. No major non-conformance.
- **Review of deferred standards (§3.3)**: **ISO 5230 — trigger REACHED** (project license set — now **PolyForm Noncommercial 1.0.0**, after the BSL 1.1 → PolyForm relicense) → ✅ **P4 DONE**: [`docs/audit/conformite_licences_iso5230.md`](audit/conformite_licences_iso5230.md) (factual inventory, 🟢 Conforming verdict, README disclosure of the proprietary SDK). **ISO 23894** (AI risk) and **ISO 25024** (data metrics): **stay deferred** — triggers not reached (POC *portfolio asset*, no industrialization); enabling them now would be over-engineering (simplicity rule). **P5 explicitly NOT retained** at this stage.
- **Remediation DONE (separate lot, after the frozen finding)**: ✅ **P1** (ISO 25012 decomposition "5+2" → 7 characteristics with the exact encoding location, via a new `[Unreleased]` entry, without rewriting `[0.2.0]`) + ✅ **P2** ("spine WF-001→003" naming → "a workflow backbone" swept through all living docs) + ✅ **P3** (observability: persistent capture of the live run in [`docs/audit/live-runs/`](audit/live-runs/) instead of `/tmp` — **mechanism** fixed; **artifact PRODUCED on 2026-06-13**: `wf-002-live-result.json` `completed` 5/5 + `wf-003-live-result.json` `completed` 7/7, versioned `git add -f`, not hand-reconstructed) + ✅ **P4** (above). **P5 (ISO 23894) NOT retained** (no industrialization). Audit report unchanged (frozen finding).

---

> Document produced with **Claude Opus 4.8** (2026-06-03).
