# Live-run traces — audit observability

**P3** remediation of the [ISO quality audit v1](../audit_qualite_iso_v1.md): **persistent** capture of live-run results (status, per-step verdicts, traced outputs), **instead of the original ephemeral `/tmp`**.

## How it works

- The `test/wf-001-run-live.test.ts` harness writes its result here (`wf-001-live-result.json`) by default — overridable via `LIVE_RESULT_FILE`.
- The **raw** `.json` is **gitignored** (see the local `.gitignore`): a raw agent output must not be committed without review.
- The **anonymized** trace of a conclusive run is committed **on decision**, after review (briefs/outputs free of real client data — see the project's anonymization rule), as a dated **audit artifact**.

## State

> ✅ **Versioned traces (conclusive live runs of 2026-06-13, billed and observed on explicit approval)**, P3 review OK (synthetic cases, no real client data or secret), committed via `git add -f`:
> - **`wf-003-live-result.json`** — WF-003 "AI Application Launch", status **`completed`**, **7/7 steps `pass`** (STEP-00 → STEP-06), budget cap respected. Validates live the "native structured output" fix at STEP-03.
> - **`wf-002-live-result.json`** — WF-002 "Delivery", status **`completed`**, **5/5 steps `pass`**. An earlier run from the same day (before the session commits, including the STEP-03 fix): a valid historical artifact, not re-played post-fix.
>
> P3 (mechanism **and** artifacts) is now handled by real executions, never a manual reconstruction. The "full-throttle" run of **2026-06-09** preceded this mechanism and its `/tmp` capture had not survived.
