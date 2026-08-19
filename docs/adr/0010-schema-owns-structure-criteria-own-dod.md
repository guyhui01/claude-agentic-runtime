# ADR-0010 — The output schema owns structure; eval criteria own DoD semantics and are the audit record

- **Status**: Accepted (decided 2026-08-19 in a design sparring session, from the WF-001 discrimination audit)
- **Decision-maker**: Guy HUI-BON-HOA (assisted by Claude Opus 4.8)
- **Project context**: POC `claude-agentic-runtime` — layering of brick 1 (handoff JSON schema) and brick 2 (eval-gate criteria) on a spine

> **Honest record.** This ADR fixes a boundary the WF-001 discrimination audit
> (`test/spine-wf-001-discrimination.test.ts`) forced into the open, and which then changed code
> in the same session (WF-001 criteria). It is not implementation dressed as a decision: the
> principle governs the nine spine audits still to come, where each spine's schema/criterion
> overlap must be re-measured, not assumed.

## Context

The WF-001 discrimination audit measured, by REMOVAL, which of the 9 blocking eval criteria are
the sole runtime gate. Runtime order in `run-spine.ts` is: runner → **eval gate (criteria, on raw
output)** → **handoff (`validateHandoff`, which enforces the manifest output schema)**. So a
criterion whose clause the output schema also enforces is caught one step later even if removed.
Result: **6 of 9 are load-bearing** (the emptiness-of-content checks JSON Schema cannot express)
and **3 overlap** — `po-backlog-8-15` and `po-epics-3-5` with the schema's count bounds,
`qa-gherkin-non-vide` with the schema's `minItems` (and, before this lot, with a sibling criterion
that re-guarded emptiness).

The overlap raised a real question: prune the redundant criteria (DRY) or keep them
(defense-in-depth)? Framed as prune-vs-keep it has no clean answer. Two facts re-frame it:

- **The eval gate is not only an enforcer; it is the audit record** (ISO 19011 — the `GateReport`
  is the per-criterion evidence that each DoD point was checked). A criterion that is redundant for
  *enforcement* is not redundant for *audit*: it is a line in the DoD compliance trace, which is
  this runtime's differentiator.
- **A count bound (8-15 US, 3-5 epics) is a DoD judgement, not a structural need of the handoff.**
  The STEP-03→STEP-04 input only needs `backlog: array`; the bound lives in STEP-03's *output*
  schema to SHAPE the agent (structured output), as the code comment already states.

## Decision

Assign every checked property to the layer that OWNS it; the other layer references or shapes, it
does not re-gate. Do not dedupe across layers by deletion.

1. **The output schema owns STRUCTURE** — shape, types, presence — because it is the agent's
   structured-output contract and the handoff-compatibility contract.
2. **Eval criteria own DoD SEMANTICS** — emptiness-of-content, business thresholds, coherence —
   and are the auditable DoD record in the `GateReport`.
3. **Where they touch (a count bound), the criterion is the owner and the schema copy is a shaping
   hint referencing the SAME named constant**, so the two can never drift apart while both stay
   (DRY *and* defense in depth). WF-001: `BACKLOG_MIN/MAX`, `EPICS_MIN/MAX`.
4. **One DoD point per criterion.** A criterion checks its own proposition and nothing more, so the
   gate report attributes the right miss. WF-001: `qa-given-when-then` checks well-formedness only
   (vacuously true on an empty array); existence is owned by `qa-gherkin-non-vide`.

Corollary defect fixed in the same lot (the one real hole the audit found, not a redundancy):
`po-us-champs-requis` tested `priorite !== undefined`, weaker than the schema's `priorite:string`,
so an empty-string priority passed both gates. It is now `nonEmptyString`.

## Consequences

- Nothing is pruned; the DoD compliance trace stays complete. The redundant criteria remain as
  audit lines, and they fail EARLIER (eval gate, step 2) with a DoD-framed id, ahead of the schema
  error (handoff, step 3) — a better signal for the operator's return loop.
- The schema/criterion overlap is now INTENTIONAL and named, not incidental. The discrimination
  snapshot records the classification and will flip a criterion's `caught-by` if the schema changes
  — a wanted coherence signal.
- The nine other spines inherit the principle but not the numbers: each spine's schema/criterion
  split must be re-measured by removal, never copied from WF-001.

## Alternatives rejected

- **Prune the 3 redundant criteria (DRY by deletion).** Rejected: deletion shrinks the audit
  record, and a count bound deleted from the criterion would survive only as a schema error that
  never fires on good output — the DoD point vanishes from the compliance trace.
- **Leave the overlap silent (do nothing).** Rejected: the two count bounds were hand-written twice
  (drift hazard), and the sibling subsumption muddied attribution (an empty gherkin reported two
  failing criteria instead of the one DoD point actually missed).
