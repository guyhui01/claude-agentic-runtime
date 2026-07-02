# Live-run traces — audit observability

**P3** remediation of the [ISO quality audit v1](../audit_qualite_iso_v1.md): **persistent** capture of live-run results (status, per-step verdicts, traced outputs), **instead of the original ephemeral `/tmp`**.

## How it works

- The `test/wf-001-run-live.test.ts` harness writes its result here (`wf-001-live-result.json`) by default — overridable via `LIVE_RESULT_FILE`.
- The **raw** `.json` is **gitignored** (see the local `.gitignore`): a raw agent output must not be committed without review.
- The **anonymized** trace of a conclusive run is committed **on decision**, after review (briefs/outputs free of real client data — see the project's anonymization rule), as a dated **audit artifact**.

## State

> ✅ **Versioned traces (conclusive live runs, billed and observed on explicit approval)**, P3 review OK (synthetic cases, no real client data or secret), committed via `git add -f`:
> - **`wf-001-live-result.json`** — WF-001 "Scoping", status **`completed`**, **3/3 steps `pass`** (STEP-01 BA → STEP-03 PO → STEP-04 QA). Live proof of **per-run model routing**: executed **2026-07-02** with `LIVE_MODEL=fable` in **145 s** (Fable separate-quota counter). All `blocking` checks pass; advisory `po-us-format-invest` = non-blocking FAIL (brittle INVEST regex, criterion revisit — not an agent defect). Note: the trace schema carries no model field (same as `wf-002/003`), so the Fable attribution is contextual (run env + this note), not in the payload.
> - **`wf-003-live-result.json`** — WF-003 "AI Application Launch" (live run 2026-06-13), status **`completed`**, **7/7 steps `pass`** (STEP-00 → STEP-06), budget cap respected. Validates live the "native structured output" fix at STEP-03.
> - **`wf-002-live-result.json`** — WF-002 "Delivery" (live run 2026-06-13), status **`completed`**, **5/5 steps `pass`**. An earlier run from the same day (before the session commits, including the STEP-03 fix): a valid historical artifact, not re-played post-fix.
>
> P3 (mechanism **and** artifacts) is now handled by real executions, never a manual reconstruction. The "full-throttle" run of **2026-06-09** preceded this mechanism and its `/tmp` capture had not survived.
