# Next steps — `claude-agentic-runtime` (session resume tracker)

> **Purpose:** per-repo session resume point + paste-ready restart prompt.
> This file is the **session tracker** (where we stopped, what to do next).
> The detailed POC roadmap lives in [`docs/NEXT_STEPS.md`](docs/NEXT_STEPS.md) — do not merge the two.
> Convention: one dedicated `next_steps.md` per subject (catalog, agentic runtime, projects, RAWLY).

---

## ▶ RESUME HERE — paste-ready restart prompt

```
Resume session — runtime /Users/guyhui/CLAUDE/claude-agentic-runtime (repo guyhui01/claude-agentic-runtime).
Apply the startup ritual (prompt_demarrage.md). Factual check FIRST: `git status -sb`, `gh pr list`, docs/NEXT_STEPS.md — never from memory.

STATE AS OF 2026-07-11 (re-verify):
- main pushed, clean tree, v0.6.0. SDK bumped 0.3.195 → 0.3.201 (dependabot #30, merged 2026-07-11). Suite 139 passed / 8 skipped, strict typecheck OK (2026-07-11). Never pin HEAD here (the commit that updates this line becomes the new HEAD, stale on arrival); anchor on the last real code change instead.
- WF-008 SPINE SHIPPED — MERGED to main via PR #31 (squash, CI green Node 20/22), surface (b) DONE. New deterministic backbone "AI Act / GDPR Compliance Audit": the 7 core agents + the counter-review gate (AUDIT-METHODO-IA), sourced from the catalog workflow. Two new fail-closed constructs on the EXISTING linear orchestrator (UNCHANGED): counter-review CLEARANCE gate on STEP-06C (verdict must be "cleared" — a "returned" verdict halts the spine before the report STEP-07, the first mid-spine return-for-rework gate) and the "Unacceptable" AI Act tier GATEWAY on STEP-01 (fail-closed). Files: src/spines/wf-008-audit.ts + run-wf-008.ts; test/spine-wf-008.test.ts + run-wf-008-real-sidecar.test.ts + wf-008-run-live.test.ts + fixtures/wf-008-outputs.ts; CHANGELOG [Unreleased]. Real-sidecar test green against catalog v4.1.0 (8 agents resolve with real prose, 8 pass verdicts).
- Task B (catalog sidecar widening) is DONE — the old WF-008 "sidecar blocker" is LIFTED. Verified live 2026-07-11: claude-agents v4.1.0 pushed (tag on origin b1a1551), sidecar = 75 assets / 38 agents / 37 skills, all 8 WF-008 agents present incl. AGENT-AUDIT-METHODO-IA.
- WF-008 LIVE RUN DONE 2026-07-11 (Fable, billed, OAuth). Outcome: `failed` fail-closed at STEP-06C BY DESIGN — STEP-01→06 all pass, the counter-review gate AUDIT-METHODO-IA returned the audit (`verdict="returned"`, 5 reservations + bias log + ISTQB exit criteria), STEP-07 halted. First live traversal of the counter-review gate + first trace showing the fail-closed halt BLOCKING a deliverable — a stronger proof than an all-green run. Trace versioned (secret-scan clean, no model field), README live-runs + docs/NEXT_STEPS.md updated. ~11.6 min, $4 cap respected, Fable weekly ~9%.
- Fable model routing SHIPPED + PROVEN LIVE (unchanged): RunWf00X.model + LIVE_MODEL env; WF-001 LIVE_MODEL=fable completed in 145 s (separate quota). INVEST criterion fix (determiner-agnostic) + P3 Fable trace closed (unchanged).

REMAINING (nothing urgent — lead with a recommendation):
1. WF-008 SHOWCASE UPDATES — the ONLY WF-008 work left. Prerequisite (a, Task B), the spine (b) AND the billed live
   run are all DONE. The billed live run ran 2026-07-11 on Fable: `failed` fail-closed at STEP-06C BY DESIGN — the
   counter-review gate AUDIT-METHODO-IA returned the audit (`verdict = "returned"`, 5 documented reservations + bias log
   + ISTQB exit criteria; STEP-01→06 all pass, STEP-07 halted). First live traversal of the counter-review gate, and the
   first trace showing the fail-closed halt BLOCKING a deliverable. Trace versioned (`docs/audit/live-runs/wf-008-live-result.json`,
   git add -f, secret-scan clean — no model field, 16 "secret" hits all audit vocabulary), live-runs README +
   docs/NEXT_STEPS.md snapshot updated.
   What remains = the FIVE downstream showcase surfaces, IN THE SEPARATE (private) SHOWCASE REPO — a distinct repo, so a
   distinct session (one product repo in write per session; this repo is PUBLIC, never name the private repo here):
   workflows (live-count sentence + WF-008 status cell + WF-008 gallery Proof line), live-proofs (runs table + a WF-008
   section), home (proof card count + ✓ list). Frame it HONESTLY as a "returned for rework" live proof (the gate can say
   no), NOT as a failed run. ⛔ Do NOT run the other seven workflows (each is a freshness liability pinned to a catalog
   version; "backbones proven live + the counter-review gate proven to block" beats an all-green 10/10 that reads as theater).
2. Scoped option, only if re-runs become frequent: SEMI-automated improvement loop (GateReport traces -> tightening proposals as PRs by Fable -> human gate by Guy). NEVER autonomous (Goodhart risk, would contradict deterministic gates ADR-0007 + fail-closed budget rule).
   MODEL ROUTING (best practice): design/scoping = Opus 4.8 (architecture, Goodhart/fail-closed stakes); in-loop proposer = Fable (generative + human-gated + separate quota); any pre-human verifier STAYS deterministic (regex/tests/schema) — never an LLM judging another LLM.

GUARDRAILS: push/merge/live-run = gates on explicit approval; live run = subscription OAuth only (never ANTHROPIC_API_KEY); artifacts/commits/PRs in US English, chat in French. Detail: memory project-runtime-wf003-live-proof-pending.

ADJACENT (other repo — do NOT open it in the same session): catalog claude-agents is at v4.1.0; Task B is CLOSED (sidecar widened to 38 agents + 37 skills, dependsOn populated, released v4.1.0 and pushed). Issue #16 (Q3 maintenance) CLOSED, actions/checkout already @v7 — do not redo. Still true: no dependabot.yml. See claude-agents/next_steps.md for its own state.
```

---

## Verified state — 2026-07-11

- **Repo/branch:** `guyhui01/claude-agentic-runtime` / `main`, in sync with `origin/main`, clean tree.
- **Release:** `v0.6.0` (last tag). HEAD is deliberately not pinned here — anchor on the last real code change, see the note in the resume block.
- **Tests:** 139 passed / 8 skipped (billed live harnesses + `runIf` markers), strict `typecheck` OK — re-run 2026-07-11.
- **Last delivery — WF-008 spine, merged to main (PR #31, squash, CI green Node 20/22); surface (b) done.** New deterministic backbone "AI Act / GDPR Compliance Audit" = the 7 core agents + the counter-review gate (`AGENT-AUDIT-METHODO-IA`), sourced from `claude-agents/workflows/WF-008-audit-conformite-ia-act-rgpd.md` (v1.0). Two constructs new to the runtime, both on the **unchanged** linear fail-closed orchestrator: (1) a **counter-review clearance gate** on STEP-06C (`audit-verdict-cleared` requires `verdict === "cleared"` — a `"returned"` verdict halts the spine before the report, the first mid-spine return-for-rework gate); (2) an **"Unacceptable" AI Act tier gateway** on STEP-01 (`jur-tier-not-unacceptable`, fail-closed). Optional STEP-04B/06B stay outside the backbone; the 02/03/04 parallel fork is linearized (WF-003 precedent). Files: `src/spines/wf-008-audit.ts` + `run-wf-008.ts`; `test/spine-wf-008.test.ts` + `run-wf-008-real-sidecar.test.ts` + `wf-008-run-live.test.ts` + `fixtures/wf-008-outputs.ts`; CHANGELOG `[Unreleased]`. Real-sidecar test green against catalog **v4.1.0** (8 agents resolve with real prose, 8 pass verdicts).
- **Live run — WF-008 proven live 2026-07-11 (Fable, billed, OAuth).** `failed` **fail-closed at STEP-06C by design**: STEP-01→06 all `pass`, then the counter-review gate `AUDIT-METHODO-IA` **returned the audit** (`verdict="returned"`, 5 documented reservations + 4-entry bias log + 6 ISTQB exit criteria; only blocking `audit-verdict-cleared` did not clear), so STEP-07 (report) was halted. **First live traversal of the counter-review gate, first trace showing the fail-closed halt blocking a deliverable.** Anonymized trace versioned `docs/audit/live-runs/wf-008-live-result.json` (git add -f, secret-scan clean, no model field); live-runs README + `docs/NEXT_STEPS.md` snapshot updated. ~11.6 min, $4 cap respected.
- **Prerequisite lifted — Task B done.** `claude-agents` `v4.1.0` pushed; sidecar widened to 75 assets (38 agents + 37 skills), all 8 WF-008 agents present (verified live 2026-07-11).
- **Earlier — SDK bump (dependabot #30, 2026-07-11):** `@anthropic-ai/claude-agent-sdk` 0.3.195 → 0.3.201, merged; suite green.
- **Earlier — INVEST fix + P3 closed (unchanged):** `po-us-format-invest` made determiner-agnostic; anonymized WF-001 Fable trace versioned; per-run model routing proven live (`LIVE_MODEL=fable` → `completed` in 145 s).

## Remaining (none urgent)

1. **Scoped option** — SEMI-automated improvement loop (traces → PR proposals by Fable → human gate). Never autonomous. Only if re-runs justify it.
   - **Model routing (best practice):** design/scoping on **Opus 4.8** (architecture, Goodhart / fail-closed stakes); the in-loop **proposer** runs on **Fable** (generative, human-gated, separate quota); any pre-human **verifier stays deterministic** (regex / tests / schema) — never an LLM judging another LLM (would reintroduce the non-determinism we refuse).

2. **Backlog — LIVE RUN of WF-008 (AI Act / GDPR Compliance Audit). Surface (c) — the only WF-008 work left. One run, not the remaining seven.**
   - **Why this one.** It opens a **third domain**: the three proven runs cover Agile & Product (WF-001, WF-002) and Dev & Engineering (WF-003) only, while Compliance & Governance / Management & Consulting had no live trace at all. It also exercises the **counter-review gate** (AI Methodology Auditor), never traversed by any run — the showcase describes this mechanism while no execution trace of it exists. So: a new capability, not a repetition.
   - **(a) and (b) are DONE.** (a) Task B — the sidecar now carries WF-008's 8 agents (catalog `v4.1.0`, verified live). (b) The WF-008 spine + eval criteria + **counter-review clearance gate** + live harness are shipped locally this session (see the "Last delivery" bullet above), on the **unchanged** linear orchestrator. Real-sidecar offline proof is green.
   - **(c) — billed live run DONE (2026-07-11, Fable); only the showcase surfaces remain.** The run ended `failed` **fail-closed at STEP-06C by design**: the counter-review gate `AUDIT-METHODO-IA` **returned the audit** (`verdict="returned"`, 5 documented reservations + bias log + ISTQB exit criteria; STEP-01→06 all pass, STEP-07 halted). First live traversal of the gate, first trace showing the fail-closed halt **blocking** a deliverable. Trace versioned (`docs/audit/live-runs/wf-008-live-result.json`, secret-scan clean, no model field), live-runs README + `docs/NEXT_STEPS.md` snapshot updated. What is left = the five downstream showcase surfaces below, in the separate (private) showcase repo — **frame it as a "returned for rework" proof (the gate can say no), NOT a failed run**.
   - **⛔ Do not run the other seven.** Each trace is a freshness liability pinned to a catalog version; ten traces triple a surface that expires on its own and proves nothing new. "Three/four proven live, the rest defined and available" is a stronger credibility signal than an all-green 10/10, which reads as theater.
   - **Gate.** A live run is a billed, outward-facing action: **explicit approval from Guy**, never inferred.
   - **Mandatory last step — update the downstream showcase site.** Five points, stated functionally (exact files and lines live in that repo's own tracker, which owns its paths):
     - workflows page — the live-run **count sentence** ("three backbones are proven live" → four).
     - workflows page — WF-008 **status cell** in the overview table (`Available` → live, n/n).
     - workflows page — WF-008 **gallery entry**, its `Proof` line.
     - live-proofs page — the **runs table**, plus a detailed WF-008 section.
     - home page — the **proof card**: its live-run count and its ✓ list.

## Guardrails

- push / merge / live-run = gates on **explicit approval**.
- Live run = **subscription OAuth only** (never `ANTHROPIC_API_KEY` — runner guard).
- **Cross-cutting — every live workflow run, and more generally any task whose result the downstream showcase site displays, carries "update the showcase" as its explicit last step**, naming the surfaces to touch. Not specific to WF-008: it applies to WF-001…WF-010 alike, and to any future proof surfaced downstream. This repo is the source of truth for runs and traces; the showcase only consumes them. Tracking the same task on both sides would create two sources of truth that diverge on the first update — so the downstream update lives inside the upstream task, or it is forgotten.
- **This repo is PUBLIC.** Before writing a cross-reference to another repository, read its **visibility**, not just its name (`gh repo view --json nameWithOwner,visibility`). Never name a private repo, its paths, or its file structure here: once pushed, it cannot be taken back without rewriting history.
- Files / commits / PRs in **US English**; chat in French.
- Detailed POC roadmap: [`docs/NEXT_STEPS.md`](docs/NEXT_STEPS.md). Session memory: `project-runtime-wf003-live-proof-pending`.
