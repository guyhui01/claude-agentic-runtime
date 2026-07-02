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

STATE AS OF 2026-07-02 (re-verify):
- main pushed (HEAD 0d42392), clean tree, v0.6.0. Suite 130 passed / 6 skipped, strict typecheck OK.
- Fable model routing SHIPPED + PROVEN LIVE: RunWf00X.model + LIVE_MODEL env; WF-001 `LIVE_MODEL=fable` = completed in 145 s (separate Fable quota). Hermetic proof test/run-wf-model-override.test.ts.
- P3 loop CLOSED (c1fea9f): anonymized WF-001 Fable trace versioned (docs/audit/live-runs/wf-001-live-result.json, git add -f, secret-scan OK — no model field in payload, Fable attribution contextual); README + docs/NEXT_STEPS.md record "proven live on Fable".
- INVEST criterion FIXED (0d42392): po-us-format-invest was a false negative on "As the ..." roles (2/13 real live stories); regex now determiner-agnostic + word-boundary anti "was a"; regression tests added; CHANGELOG [Unreleased] updated.
- Functional backlog empty (POC backbone proven live, ISO audit v1 closed P1-P4).

REMAINING (nothing urgent — lead with a recommendation):
1. Scoped option, only if re-runs become frequent: SEMI-automated improvement loop (GateReport traces -> tightening proposals as PRs by Fable -> human gate by Guy). NEVER autonomous (Goodhart risk, would contradict deterministic gates ADR-0007 + fail-closed budget rule).

GUARDRAILS: push/merge/live-run = gates on explicit approval; live run = subscription OAuth only (never ANTHROPIC_API_KEY); artifacts/commits/PRs in US English, chat in French. Detail: memory project-runtime-wf003-live-proof-pending.

ADJACENT (other repo, if wanted): catalog claude-agents v4.0.0 — issue #16 (Q3 quarterly maintenance to do) + CI without Dependabot + actions checkout@v4.
```

---

## Verified state — 2026-07-02

- **Repo/branch:** `guyhui01/claude-agentic-runtime` / `main`, in sync with `origin/main`, clean tree.
- **Release:** `v0.6.0` (last tag). Head = `0d42392` (INVEST criterion fix).
- **Tests:** 130 passed / 6 skipped (3 billed live harnesses + 3 `runIf` markers), strict `typecheck` OK.
- **Last delivery:** `po-us-format-invest` INVEST criterion made **determiner-agnostic** (`0d42392`) — the regex accepted only `As a`/`As an`, wrongly flagging valid `As the …` roles (2/13 real stories on the WF-001 Fable live run); now `/\bas\b .+\bi want\b.+\bso that\b/i` (three anchors only, word boundary anti `was a`), regression tests added, CHANGELOG `[Unreleased]` updated.
- **Earlier (`c1fea9f`) — P3 closed:** anonymized WF-001 Fable trace versioned (`git add -f`, secret-scan OK — payload carries no model field, Fable attribution contextual); README + `docs/NEXT_STEPS.md` record "proven live on Fable". Per-run model routing (`7413e11`) proven live: WF-001 `LIVE_MODEL=fable` → `completed` in 145 s.

## Remaining (none urgent)

1. **Scoped option** — SEMI-automated improvement loop (traces → PR proposals by Fable → human gate). Never autonomous. Only if re-runs justify it.

## Guardrails

- push / merge / live-run = gates on **explicit approval**.
- Live run = **subscription OAuth only** (never `ANTHROPIC_API_KEY` — runner guard).
- Files / commits / PRs in **US English**; chat in French.
- Detailed POC roadmap: [`docs/NEXT_STEPS.md`](docs/NEXT_STEPS.md). Session memory: `project-runtime-wf003-live-proof-pending`.
