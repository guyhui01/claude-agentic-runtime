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

STATE AS OF 2026-07-10 (re-verify):
- main pushed (HEAD f1f260e), clean tree, v0.6.0. The three commits above 0d42392 are docs-only (this tracker). Last code change is still 0d42392. Suite 130 passed / 6 skipped, strict typecheck OK — as recorded on 2026-07-02, not re-run since.
- Fable model routing SHIPPED + PROVEN LIVE: RunWf00X.model + LIVE_MODEL env; WF-001 `LIVE_MODEL=fable` = completed in 145 s (separate Fable quota). Hermetic proof test/run-wf-model-override.test.ts.
- P3 loop CLOSED (c1fea9f): anonymized WF-001 Fable trace versioned (docs/audit/live-runs/wf-001-live-result.json, git add -f, secret-scan OK — no model field in payload, Fable attribution contextual); README + docs/NEXT_STEPS.md record "proven live on Fable".
- INVEST criterion FIXED (0d42392): po-us-format-invest was a false negative on "As the ..." roles (2/13 real live stories); regex now determiner-agnostic + word-boundary anti "was a"; regression tests added; CHANGELOG [Unreleased] updated.
- Functional backlog empty (POC backbone proven live, ISO audit v1 closed P1-P4).

REMAINING (nothing urgent — lead with a recommendation):
1. WF-008 live run — BLOCKED, and it is NOT one command away. Diagnosed 2026-07-10, see the backlog entry below.
   No WF-008 spine exists (src/spines/ stops at 003); the sidecar carries 14 of the catalog's 38 agents and is
   missing 5 of WF-008's 7 mandatory ones. Widening it is Task B, in the claude-agents repo. Three sessions, in order:
   (a) Task B in claude-agents, (b) the WF-008 spine + criteria + counter-review gate + live harness here,
   (c) the billed run + the five downstream showcase surfaces. Do NOT start (b) before (a) lands.
2. Scoped option, only if re-runs become frequent: SEMI-automated improvement loop (GateReport traces -> tightening proposals as PRs by Fable -> human gate by Guy). NEVER autonomous (Goodhart risk, would contradict deterministic gates ADR-0007 + fail-closed budget rule).
   MODEL ROUTING (best practice): design/scoping = Opus 4.8 (architecture, Goodhart/fail-closed stakes); in-loop proposer = Fable (generative + human-gated + separate quota); any pre-human verifier STAYS deterministic (regex/tests/schema) — never an LLM judging another LLM.

GUARDRAILS: push/merge/live-run = gates on explicit approval; live run = subscription OAuth only (never ANTHROPIC_API_KEY); artifacts/commits/PRs in US English, chat in French. Detail: memory project-runtime-wf003-live-proof-pending.

ADJACENT (other repo — do NOT open it in the same session): catalog claude-agents is at v4.0.1; issue #16 (Q3 maintenance) is CLOSED and actions/checkout is already @v7 — do not redo them. Still true: no dependabot.yml. Its one open workstream is Task B (widen sidecar.json to 38 agents + 37 skills; diagnosed 2026-07-09) — see claude-agents/next_steps.md.
Task B is now the HARD PREREQUISITE for the WF-008 run (item 1): today's sidecar carries 14 of 38 agents and lacks 5 of WF-008's 7 mandatory ones.
```

---

## Verified state — 2026-07-10

- **Repo/branch:** `guyhui01/claude-agentic-runtime` / `main`, in sync with `origin/main`, clean tree.
- **Release:** `v0.6.0` (last tag). Head = `f1f260e` — docs-only since `0d42392` (three tracker commits). **Last code change: `0d42392`** (INVEST criterion fix).
- **Tests:** 130 passed / 6 skipped (3 billed live harnesses + 3 `runIf` markers), strict `typecheck` OK — recorded 2026-07-02, not re-run since.
- **Last delivery:** `po-us-format-invest` INVEST criterion made **determiner-agnostic** (`0d42392`) — the regex accepted only `As a`/`As an`, wrongly flagging valid `As the …` roles (2/13 real stories on the WF-001 Fable live run); now `/\bas\b .+\bi want\b.+\bso that\b/i` (three anchors only, word boundary anti `was a`), regression tests added, CHANGELOG `[Unreleased]` updated.
- **Earlier (`c1fea9f`) — P3 closed:** anonymized WF-001 Fable trace versioned (`git add -f`, secret-scan OK — payload carries no model field, Fable attribution contextual); README + `docs/NEXT_STEPS.md` record "proven live on Fable". Per-run model routing (`7413e11`) proven live: WF-001 `LIVE_MODEL=fable` → `completed` in 145 s.

## Remaining (none urgent)

1. **Scoped option** — SEMI-automated improvement loop (traces → PR proposals by Fable → human gate). Never autonomous. Only if re-runs justify it.
   - **Model routing (best practice):** design/scoping on **Opus 4.8** (architecture, Goodhart / fail-closed stakes); the in-loop **proposer** runs on **Fable** (generative, human-gated, separate quota); any pre-human **verifier stays deterministic** (regex / tests / schema) — never an LLM judging another LLM (would reintroduce the non-determinism we refuse).

2. **Backlog — live run of WF-008 (AI Act / GDPR Compliance Audit). One run, not the remaining seven.**
   - **Why this one.** It opens a **third domain**: the three proven runs cover Agile & Product (WF-001, WF-002) and Dev & Engineering (WF-003) only, while Management & Consulting carries 5 of the 10 workflows and has no live trace at all. It also exercises the **optional counter-review gate** (AI Methodology Auditor), carried only by WF-008 and WF-010 and never traversed by any run — the showcase describes this mechanism while no execution trace of it exists. So: a new capability, not a repetition.
   - **⛔ BLOCKED — this is a three-session workstream, not a command.** Diagnosed 2026-07-10. Earlier revisions of this entry read as if the run were one approval away; it is not. Two hard blockers:
     - **No WF-008 spine exists.** `src/spines/` stops at `run-wf-003.ts`; live harnesses stop at `wf-003-run-live.test.ts`. A live run here executes a TypeScript spine, not a catalog markdown file. Scale: `wf-003-lancement.ts` is 426 lines for 7 agents, plus a ~105-line runner, eval criteria, and a harness. WF-008 additionally needs the **conditional counter-review gate**, which no existing spine implements.
     - **The sidecar does not carry WF-008's agents.** It exposes **14 assets of the catalog's 38 agents** (declares catalog `v4.0.0`). Of WF-008's 7 mandatory agents, **5 are missing** — `JURIDIQUE-IA` (STEP-01), `DATA-ENGINEER`, `CDO-DIRECTEUR-IA`, `CHANGE-MANAGER`, `REDACTEUR-IA`; only `AI-ARCHITECT` and `SECURITE-IA` are present. `AUDIT-METHODO-IA` — the counter-review agent that is the whole point of picking WF-008 — is missing too.
   - **Dependency, in another repo.** The sidecar is generated by `tools/generate-sidecar.mjs` (constant `CATALOG_AGENT_IDS`) in the public `guyhui01/claude-agents` repo. Widening it is that repo's **Task B**, tracked in its own `next_steps.md`. It is a standalone workstream: one repo in write per session.
   - **Order — do not skip (a).** (a) Task B in `claude-agents`. (b) Here: WF-008 spine + eval criteria + counter-review gate + live harness. (c) The billed run, then the five downstream showcase surfaces below. Start (b) only once (a) has landed and the sidecar exposes the seven agents.
   - **⛔ Do not run the other seven.** Each trace is a freshness liability pinned to a catalog version (today: `v3.27.0`); ten traces triple a surface that expires on its own and proves nothing new. "Three proven live, seven defined and available" is a stronger credibility signal than an all-green 10/10, which reads as theater.
   - **Gate.** A live run is a billed, outward-facing action: **explicit approval from Guy**, never inferred.
   - **Mandatory last step — update the downstream showcase site.** Five points, measured 2026-07-10, stated functionally (exact files and lines live in that repo's own tracker, which owns its paths):
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
