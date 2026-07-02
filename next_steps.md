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
- main pushed, clean tree, v0.6.0. Suite 130 passed / 6 skipped, strict typecheck OK.
- Fable model routing SHIPPED + PROVEN LIVE: RunWf00X.model + LIVE_MODEL env; WF-001 `LIVE_MODEL=fable` = completed in 145 s (separate Fable quota). Hermetic proof test/run-wf-model-override.test.ts.
- Functional backlog empty (POC backbone proven live, ISO audit v1 closed P1-P4).

REMAINING (nothing urgent — lead with a recommendation):
1. Version the anonymized live trace of the Fable run — docs/audit/live-runs/wf-001-live-result.json (rewritten, gitignored): P3 decision, `git add -f` after a secret-scan review. See docs/audit/live-runs/README.md.
2. Micro-edit docs/NEXT_STEPS.md "WF-001 proven live on Fable" + push on approval.
3. Recurring advisory `po-us-format-invest` (INVEST regex) = non-blocking FAIL on the last live run — brittle criterion, revisit one day (criterion bug, not agent).
4. Scoped option, only if re-runs become frequent: SEMI-automated improvement loop (GateReport traces -> tightening proposals as PRs by Fable -> human gate by Guy). NEVER autonomous (Goodhart risk, would contradict deterministic gates ADR-0007 + fail-closed budget rule).

GUARDRAILS: push/merge/live-run = gates on explicit approval; live run = subscription OAuth only (never ANTHROPIC_API_KEY); artifacts/commits/PRs in US English, chat in French. Detail: memory project-runtime-wf003-live-proof-pending.

ADJACENT (other repo, if wanted): catalog claude-agents v4.0.0 — issue #16 (Q3 quarterly maintenance to do) + CI without Dependabot + actions checkout@v4.
```

---

## Verified state — 2026-07-02

- **Repo/branch:** `guyhui01/claude-agentic-runtime` / `main`, in sync with `origin/main`, clean tree.
- **Release:** `v0.6.0` (last tag). Head = `7413e11` (per-run model routing).
- **Tests:** 130 passed / 6 skipped (3 billed live harnesses + 3 `runIf` markers), strict `typecheck` OK.
- **Last delivery:** per-run model routing — `RunWf00XOptions.model` flows through the derived resolver into `query()`; live harnesses honor `LIVE_MODEL=<alias>`; hermetic proof `test/run-wf-model-override.test.ts`. **Proven live:** WF-001 `LIVE_MODEL=fable` → `completed` in 145 s (blocking gates green; advisory `po-us-format-invest` non-blocking FAIL), Fable quota consumed (separate counter).

## Remaining (none urgent)

1. **Version the anonymized live trace** of the Fable run (P3 decision; `docs/audit/live-runs/wf-001-live-result.json` is gitignored → `git add -f` after review).
2. **Tracker micro-edit** in `docs/NEXT_STEPS.md`: record "WF-001 proven live on Fable", then push on approval.
3. **Brittle advisory** `po-us-format-invest` (INVEST regex) — recurring non-blocking FAIL; revisit the criterion (not the agent).
4. **Scoped option** — SEMI-automated improvement loop (traces → PR proposals by Fable → human gate). Never autonomous. Only if re-runs justify it.

## Guardrails

- push / merge / live-run = gates on **explicit approval**.
- Live run = **subscription OAuth only** (never `ANTHROPIC_API_KEY` — runner guard).
- Files / commits / PRs in **US English**; chat in French.
- Detailed POC roadmap: [`docs/NEXT_STEPS.md`](docs/NEXT_STEPS.md). Session memory: `project-runtime-wf003-live-proof-pending`.
