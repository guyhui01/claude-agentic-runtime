# WF-000 Dispatch — V0 Implementation Plan (pilot WF-001)

> **Status: DISCOVERY DRAFT** — fifth and final discovery deliverable; executes step 3 of the
> [coverage matrix](wf-000-dispatch-coverage-matrix.md) §4. Companions: [brief contract](wf-000-dispatch-brief-contract.md),
> [identity-card dry run](wf-000-dispatch-identity-card-dry-run.md), [router draft](wf-000-dispatch-router-draft.md).
> Drafted 2026-07-19 with Claude Fable 5 (`claude-fable-5`), reviewed by the product owner.

## 1. Placement in the existing codebase

New module `src/dispatch/` beside the existing `src/{sidecar, loader, eval, handoff,
orchestrator, sdk, spines}` — the dispatcher sits **upstream** of the spines and changes
none of them (the ten proven spines and the linear orchestrator stay frozen).

Reused as-is:

- **`src/sidecar`** loader — workflow ids, `dependsOn`, catalog tag (routing substrate).
- **`src/spines/spine-helpers.ts`** — `affirmativeString` for the intake sentinel policy
  (the WF-009-hardened helper, already regression-guarded).
- **`src/sdk` query runner** — the router LLM call with native structured output
  (`json_schema`), the mechanism live-proven by the WF-003 fix; `LIVE_MODEL` routing and
  the OAuth-only guard apply unchanged.
- **ajv** (already a dependency) — brief schema + router-output schema, strict mode.

## 2. Files (V0 scope)

| File | Content |
|---|---|
| `src/dispatch/brief-schema.ts` | ajv schema of the brief contract §3 (strict, unknown keys rejected). |
| `src/dispatch/completeness-check.ts` | Contract §4: presence + affirmative substance, state-marker floor, constraints rule → `REJECT_INCOMPLETE(field)`. |
| `src/dispatch/router-prompt.ts` | Builds the router system prompt from the loaded sidecar (WF table injected — never hardcoded). |
| `src/dispatch/validate-route.ts` | Router-draft §3 pseudocode made real: strict parse, id exists, `dependsOn` resolvable, manifest param check → route / `PARAMS_MISSING` / `NO_MATCH` / reject. |
| `src/dispatch/manifests/wf-001.ts` | The WF-001 param manifest (router draft §4), `catalogTag`-pinned. Only manifest in V0. |
| `src/dispatch/run-dispatch.ts` | The V0 pipeline: brief → completeness → propose (LLM) → validate → execution plan (duration/model parsed from the WF card YAML, fail-closed if absent) → **stop and print the plan for the human go/no-go**. V0 never chains into a spine run: on GO, the operator launches the existing `run-wf-001` harness — the billed gate stays a human hand on a separate command. |
| `test/fixtures/dispatch-briefs.ts` | The 20 matrix prompts qualified into briefs (fictional data only) — the offline oracle fixtures. |

Bounded-retry decision (left open by the router draft): **one** re-ask on strict-JSON parse
failure, then fail-closed reject — mirrors the fail-closed budget rule; no loops.

## 3. Tests (offline first, same discipline as the spines)

| Test | Proves |
|---|---|
| `test/dispatch-completeness.test.ts` | P18 rejected with the field named; negative sentinels rejected in `need`/`context`; blocking-floor bounds don't reject modest-but-valid briefs (WF-005 lesson). |
| `test/dispatch-validate-route.test.ts` | Hermetic fake router outputs: invented WF id → reject; unresolvable `dependsOn` → reject; `NO_MATCH` passthrough; P01 brief → `PARAMS_MISSING` with the 3 dry-run params named; amended P01 brief → route + plan. |
| `test/dispatch-matrix-oracle.test.ts` | The 20 fixtures through the **deterministic** pipeline (proposer faked): every expected-route cell reproduced by string equality — no LLM in CI. |
| `test/dispatch-real-sidecar.test.ts` | Against the real catalog checkout (v4.2.0): WF-001 resolves, manifest tag matches the sidecar tag (drift = hard fail). |
| `test/dispatch-run-live.test.ts` | Billed, `LIVE_RUN`-gated, OAuth-only — see §4. |

## 4. Live proof (billed — explicit approval gate, per repo rule)

Two-part proof, honest by construction:

1. **Router accuracy run**: the live LLM proposes on all 20 fixture briefs; results compared
   to the oracle **deterministically**. Any mis-route — especially on role probes P19/P20 or
   the discriminating pairs P11-P13 — is **reported verbatim as a finding** (returned-for-
   rework framing), never smoothed over; the fix is a sharper contract field or router-prompt
   rule, not a smarter judge. 20 single completions ≈ far cheaper than one spine run.
2. **Pilot end-to-end (P01 → WF-001)**: raw P01 qualified → `PARAMS_MISSING` (3 named) →
   brief amended → route + execution plan → **human GO** → existing WF-001 spine harness run.
   This exercises every V0 outcome on a real billed path, including the return loop.

Trace conventions unchanged: versioned under `docs/audit/live-runs/` via `git add -f`,
secret-scan clean, no model field in the payload (attribution in prose), fictional data only.

## 5. Definition of done (V0)

- Offline: suite + strict typecheck green, matrix oracle 20/20, real-sidecar test green.
- Live: router accuracy run executed **and its score reported as-is**, pilot P01 completed
  through the human GO into a `completed` WF-001 run; both traces versioned.
- Docs: CHANGELOG `[Unreleased]`, live-runs README, this discovery folder untouched
  (snapshots — annotate, don't rewrite); tracker updated as the task's last step.
- Downstream showcase surface consigned (batched pass, separate session) — the dispatch
  story: honest `NO_MATCH` coverage + role ⊥ route probes + the `PARAMS_MISSING` return loop.

## 6. Out of V0 (locked slicing — do not re-open)

- Manifests for the other nine workflows, assisted param filling, cost estimate → **V1**.
- Ad-hoc agent composition on `NO_MATCH`, multi-WF chaining (WF-006 → 007 → 001) → **V2**.
- Any orchestrator change, any modification to a proven spine — barred.
