# KO matrix — live-run traces sorted by failure type

> **Date:** 2026-11-14. **Scope:** the 16 result files in [`live-runs/`](live-runs/)
> (`*-live-result*.json`, progress files excluded), catalog tags `v3.27.0` to `v4.2.0`.
> **Method:** every run is sorted into one type (A–E, defined in `next_steps.md`, section
> 2026-10-29) by citing the signal in its trace, and checked against the written instruction
> (the catalog card at the run's `catalogTag`, or the runtime criterion). Local reading only:
> no billed run, no catalog write, no fix.
> **What this is not:** about one run per workflow, so the matrix sorts cases; it measures no
> trend and no rate. A practice called "observed" is not "best" until a corpus case pins it.
> **Decides:** Guy, on every row. Nothing below is applied.

## Types (reminder)

| Type | Meaning | Admissible response | Forbidden |
|---|---|---|---|
| A | Legitimate gate refusal | none on the agent; maybe the upstream input | weakening the guard (ADR-0011 §2) |
| B | Wrongful refusal (false red) | criterion revised by PR + a corpus case | dropping the criterion without a replacement |
| C | Agent fault | a deterministic guard first, then the agent/skill text, by catalog PR | the runtime writing the catalog (ADR-0001) |
| D | Runtime / infrastructure fault | runtime fix; `--resume` | blaming the agent |
| E | False green | the deterministic criterion that would have caught it + a corpus case | counting it as a success in a proof |

## Common factor across all 16 runs (D)

The probe of 2026-11-14 (`next_steps.md`, section "sonde de chargement des instructions") shows
that `createQueryRunner` sets no `settingSources`: every step agent ran with the operator's
`~/.claude/CLAUDE.md`, the `SessionStart` hooks and the claude.ai Docs MCP tools in context.
No result below can be read as the behavior of the catalog agent alone. Isolating the runner
(`settingSources: []`) touches the ten live-proven workflows: Guy's order and a re-run first.

## Sort

| Run (file) | Status | Type | Signal in the trace |
|---|---|---|---|
| `wf-008-live-result.json` | `failed` STEP-06C | **A** (agent) + **B** candidate (gate) + **D** (input) | K1 |
| `wf-009-live-result-gate-halt.json` | `failed` STEP-04 | **A** + latent **E** | K2 |
| `wf-000-router-live-result.json` P11 | `NO_MATCH` (oracle WF-006) | **B** candidate | K3 |
| `wf-000-router-live-result.json`, other 19 | 19 matches | A for P14–P18 (`NO_MATCH` ×4, `REJECT_INCOMPLETE`); green elsewhere | per-brief `status` = oracle |
| `wf-000-pilot-p01-dispatch-live-result.json` | `PARAMS_MISSING` then `ROUTED` | A (return loop by design) | missing set = offline prediction |
| `wf-000-p04-dispatch-live-result.json` | `PARAMS_MISSING` then `ROUTED` | A (return loop by design) | missing set = offline prediction |
| `wf-001-live-result.json` | `completed`, advisory 2/3 | **B**, resolved | K4 |
| `wf-000-pilot-p01-wf001-live-result.json` | `completed`, advisory 2/3 | A/B ambiguous (advisory) | K5 |
| `wf-005-live-result.json` | `completed` 7/7 · 7/7 | green; prior Sonnet 5 run **D** (not versioned) | K6 |
| `wf-010-live-result.json` | `completed` 10/10 · 11/11 | green deliverable + **D** (plan file written) | K6 |
| `wf-002`, `wf-003`, `wf-004`, `wf-006`, `wf-007`, `wf-009` | `completed`, all criteria pass | no type found (see limits) | — |

**Classes searched in the `completed` runs** (a negative claim covers these and only these):
failed advisories; sentinel strings (`N/A`, `TBD`, `none`, `unknown`, `placeholder`,
`not provided`); empty-key objects; process-hygiene notes in [`live-runs/README.md`](live-runs/README.md).
Hits read and judged honest: WF-007 `dataQuality: "N/A"` / `"Unknown — assessment required"`
(day-1 onboarding, gaps named with a next step), WF-009 fraud flags `"None"`. Not done: a
substantive read of every deliverable against its card. A false green that looks substantive
is not excluded.

**ADR-0011 guards seen firing in live traces:** route-or-refuse (`NO_MATCH`, P11 and P14–P17),
intake (`REJECT_INCOMPLETE`, P18), param validation (`PARAMS_MISSING`, P01 and P04), fail-closed
eval gate (WF-008, WF-009). **Never seen live:** `NO_CRITERIA` (fires at manifest resolution,
before any billed call), typed-handoff rejection, the API-key refusal.

## Cases

### K1 — WF-008, counter-review halt at STEP-06C (2026-07-11, `v4.1.0`)

- **Signal:** `verdict: "returned"`, 5 reservations, `audit-verdict-cleared` the only failed
  blocking criterion (18/19).
- **Agent side — A.** The reservations are checkable in the trace: no communication plan or
  sponsor roadmap exists in any STEP-01…06 output (R2); the M0 pulse survey is scheduled after
  the plan built on the scores (R3); Population 1 flags Ability 2/5 as barrier after
  Knowledge 3/5 (R1).
- **Gate side — B candidate.** Written: the card's `condition_passage` reads "Audit cleared,
  **or returned with documented reservations**, before the final report (STEP-07)". Observed:
  the runtime criterion requires `verdict === "cleared"`, so a returned verdict with documented
  reservations halts. The runtime is stricter than the card; the README's "exactly the 'never
  cleared by default' behavior" conflates the verdict rule with the halt rule. Admissible: align
  the criterion with the card, or the card with the criterion, by PR. Forbidden: dropping the
  clearance check without a replacement. A corpus case pins either reading.
- **Input side — D.** Written: STEP-06C input = "All audit outputs (STEP-01 to STEP-06B)" plus
  stakes and the STEP-01 tier. Observed: the linear orchestrator passes only the previous step's
  output (`src/orchestrator/run-spine.ts`, `input = output`), so the reviewer saw the ADKAR plan
  alone. All five reservations attack change management; none could test "tier → obligations →
  measures". The README's "the scope boundary held live" is an effect of the input, not evidence
  of the agent's discipline.
- **Minor — C, low stakes.** 10 `"": ""` empty keys inside `biasLog` / `exitCriteria` items,
  the only file with them; the item schemas do not set `additionalProperties: false`.
- **Corpus candidate:** STEP-06C fed a fixture of all upstream outputs; invariants: verdict in
  {cleared, returned}; returned ⇒ ≥ 1 reservation citing a checkable artifact; the halt rule
  matches whichever reading Guy ratifies.

### K2 — WF-009, shortlist halt at STEP-04 (2026-07-12, `v4.1.0`)

- **Signal:** three shortlist entries `"No candidate data available (n/3)"` with "Placeholder
  only … Do not treat as a real candidate"; `rh-shortlist-validated` counts 0 real candidates.
- **A.** Seed without CVs; the agent refused to invent candidates; the hardened gate halted.
- **Latent E, masked by the halt.** In the same output, `rh-scored-cvs` (blocking,
  `nonEmptyArray`) passed on one `"N/A — no CV/resume submitted"` entry scored 0;
  `rh-fraud-report` (blocking, `nonEmptyString`) passed on a refusal text; `rh-shortlist-3-5`
  (advisory) passed on three placeholders. With the shortlist gate removed, the step would go
  green. Written instruction vs. practice: `minItems: 3` in the schema pushed the agent to pad
  the array; the honest answer had to live in free text.
- **Historical E:** the first run, before `f2afce2`, was a hollow `completed` on the same
  refusal (not versioned).
- **Corpus candidate:** STEP-04 with no CVs; invariants: halt, and no blocking criterion of the
  step passes on a sentinel entry.

### K3 — WF-000 router, P11 (2026-07-19, `v4.2.0`)

- **Signal:** `NO_MATCH`, `nearestMiss: "WF-006"`, rationale "entry state 'RFP received' is not
  met".
- **B candidate.** Written: the WF-006 card lists request types "Formal RFP / Direct
  solicitation / Referral / Competition" (line 59) and starts on "RFP received / qualified
  opportunity" (line 76). Observed: the router sees only the sidecar `description`, the line-3
  arrow "RFP received → …", unchanged at `v5.0.0`. Safe failure direction (under-match, nearest
  miss named, the operator overrides).
- **Admissible:** widen the WF-006 arrow in the catalog (catalog PR), or a router rule for
  pre-signature commercial states (runtime). The V1 router rule is not implemented.
- **Corpus candidate:** P11 brief; invariant: `ROUTED` WF-006, or `NO_MATCH` naming WF-006.

### K4 — WF-001 advisory `po-us-format-invest` (2026-07-02, `v4.0.0`)

- **Signal:** advisory 2/3, recorded verdict `fail`.
- **B, resolved.** Replaying the current criterion on the 13 recorded statements passes 13/13.
  The recorded failure came from the pre-fix regex `/as an? .+i want.+so that/i`: replayed, it
  fails exactly stories 10 and 13 ("As the Head of B2B (sponsor), I want …"). Fixed the same day
  by `0d42392`. The trace keeps its historical verdict.

### K5 — WF-001 via the dispatch pilot, same advisory (2026-07-19, `v4.2.0`)

- **Signal:** 1 of 14 statements fails: "As a claims adjuster, **I would like** …".
- **A/B ambiguous, advisory only.** Strictly, the template says "I want"; in practice "I would
  like" (and "we want", seen at the `0.3.296` smoke) is the same story form. Changing the
  criterion touches a live-proven spine: Guy's decision, not a fix in passing.

### K6 — process hygiene under `permissionMode: "plan"` (WF-005, WF-010)

- **Signal:** `live-runs/README.md`: the WF-005 Sonnet 5 run (not versioned) wrote a plan file
  into `~/.claude/plans/` and leaked plan-mode meta-commentary with a real name and a local path
  into `internalNote`; the WF-010 Opus 4.8 run also wrote a plan file (deleted after review).
- **D.** Plan mode lets the agent write its plan file, so "read-only" (ADR-0001) does not fully
  hold. The leaked name and path plausibly come from the operator context loaded in every run
  (common factor above), not from the catalog agent. Plausible, not proven: the leaked text was
  not kept. Deliverables passed every gate.

## Corpus candidates, for Guy's choice

| # | From | Invariant to pin |
|---|---|---|
| 1 | K1 | STEP-06C halt rule = the ratified reading of the card; returned ⇒ checkable reservations |
| 2 | K2 | no blocking STEP-04 criterion passes on a sentinel entry; no CVs ⇒ halt |
| 3 | K3 | P11 ⇒ WF-006 (routed, or named as nearest miss) |

The corpus has 2 cases today (WF-001 `completed`, WF-008 refused at STEP-01). Any new case
inherits the common factor until the runner is isolated.
