# WF-000 Dispatch — Identity-Card Dry Run (offline, no LLM)

> **Status: DISCOVERY DRAFT** — third deliverable of the WF-000 dispatch discovery; executes
> step 1 of the [coverage matrix](wf-000-dispatch-coverage-matrix.md) §4. Method: for each of
> the **15 routed prompts** (P01-P13, P19, P20), confront the qualified brief sketched in the
> matrix with the **real "Contextual parameters" block** of the target workflow card
> (`claude-agents` @ v4.2.0, read live from the 10 `workflows/WF-0*.md` files — not from
> memory). Every parameter is classed deterministically:
>
> - **F — fillable**: value present or directly derivable from the qualified brief.
> - **D — default-able**: the card itself sanctions an honest unknown ("Not disclosed",
>   "to be defined", "to confirm in STEP-01") or an operator-profile default (deliverables
>   language, tone, proposal format).
> - **M — must-ask**: the operator has to go back to the stakeholder before the run.
>
> Drafted 2026-07-19 with Claude Fable 5 (`claude-fable-5`), reviewed by the product owner.

## 1. Parameter inventory (from the real cards)

| WF | Card block | # params | Card-sanctioned honest unknowns |
|---|---|---|---|
| WF-001 | CLIENT CONTEXT | 7 | — |
| WF-002 | ART CONTEXT | 8 | — |
| WF-003 | TECHNICAL CONTEXT | 8 | — |
| WF-004 | ENGAGEMENT CONTEXT | 8 | maturity "estimate" |
| WF-005 | INTELLIGENCE CONTEXT | 7 | — |
| WF-006 | PRE-SALES CONTEXT | 11 | budget "Not disclosed" |
| WF-007 | ENGAGEMENT CONTEXT | 9 | D1 access "to validate" |
| WF-008 | COMPLIANCE AUDIT CONTEXT | 11 | tier "to confirm in STEP-01" |
| WF-009 | RECRUITMENT CONTEXT | 10 | salary "to be defined" |
| WF-010 | POST-MORTEM CONTEXT | 9 | — |

## 2. Per-prompt fill results

| # | Route | F | D | M | Must-ask parameters (named) |
|---|---|---|---|---|---|
| P01 | WF-001 | 3 | 1 | 3 | Team size, Project method, Level of detail |
| P02 | WF-002 | 4 | 1 | 3 | PI duration, ART capacity, Dependencies |
| P03 | WF-003 | 1 | 1 | 6 | Cloud provider, Tech stack, Database, GDPR constraints, Monthly API budget, Target SLA |
| P04 | WF-004 | 4 | 1 | 3 | Engagement duration, Stakeholders, Priority stakes |
| P05 | WF-005 | 3 | 4 | **0** | — (operator-profile defaults cover the rest) |
| P06 | WF-006 | 5 | 3 | 3 | Decision-makers, Selection criteria, Competition |
| P07 | WF-007 | 2 | 2 | 5 | Engagement type, Duration, D1 stakeholders, Location, Identified stakes — all **self-resolvable** (submitter = operator) |
| P08 | WF-008 | 6 | 1 | 4 | Volumes, Geography, AI model, Compliance deadline |
| P09 | WF-009 | 1 | 3 | 6 | Contract type, Urgency, Location, Must-have skills, Nice-to-have skills, Team context |
| P10 | WF-010 | 5 | 1 | 3 | Project duration, Team involved, Available data |
| P11 | WF-006 | 3 | 3 | 5 | Response deadline, Competition, Decision-makers, Selection criteria, Constraints |
| P12 | WF-004 | 3 | 1 | 4 | Engagement duration, Stakeholders, Priority stakes, Constraints |
| P13 | WF-010 | 4 | 1 | 4 | Duration, Team involved, Available data, HR sensitivities |
| P19 | WF-001 | 2 | 1 | 4 | Sector, Team size, Project method, Level of detail |
| P20 | WF-008 | 7 | 1 | 3 | Volumes, Geography, Expected deliverables |

> **Annotation 2026-07-28 — this replaces an earlier annotation of the same date whose diagnosis was wrong. The correction is recorded here rather than edited away, because the wrong version was published.** That first note claimed the **P02** row "over-counts by one" on `PI duration`, and blamed the same class of divergence on this table having skipped the brief's `constraints` array. Both claims were wrong, and one of them doubly so — `PI duration` sits in `context`, which the method above says was read.
>
> **The table was right about its own input.** Per the method statement, it was computed against the **coverage-matrix sketches** — the raw stakeholder asks — not against the qualified fixture briefs the deterministic check runs on. The sketches are the thinner input: P02's names no PI duration, P03's names no cloud provider, P04's names neither the sponsor role nor the engagement window. Every one of those facts exists only in the fixture.
>
> The consequence is a **requalification, not a correction**: §2 answers *"what must still be asked of the stakeholder, given the raw ask"*, while a manifest check answers *"what is absent from the qualified brief"*. Two different questions on two different inputs — that their cells coincided on P01 is a coincidence, not an equivalence. Read §2 as a **checklist of the parameters that are hard to obtain**, and treat a divergence as a signal to settle the point **at the card**, never as a verdict on either side.
>
> What does hold from the first annotation, and is the reason to keep running the comparison: it caught a real defect in the code. The first `ART name` detector read *"the ART at Helvetia Rail"* as unnamed and would have asked the operator for a name the brief already carried. This table read it as filled, and was right — the field asks for an identifier of the train, in either word order.

> **Annotation 2026-08-02 — the end-of-project audit (volet 3) ran this comparison against all ten shipped manifests, aggregated TO THE CARD LINE. This annotation records the result; the table above is not edited.**
>
> Method, and why it is at the line: §2 has only ever known card LINES, while the manifests carry 108 param specs, 31 of them halves of a conjunction. Comparing a must-ask column to a set of FACTS produces arithmetic rather than judgements, so each spec is aggregated to its line first (a line is missing when at least one of its facts is). **The join is measured total: 108 specs of 108 join to a line of their own card at the pinned tag `v4.2.0`, zero orphan** — which also closes the residual concern of volet 4, since a line renamed or dropped under the pin would fail that join.
>
> Result over the fifteen routed prompts: **27 agreements, 29 lines asked by §2 alone, 35 asked by the manifests alone** (26 distinct card lines). As a control that the method is sound before any of it was read, the P08 row reproduces exactly the six real divergences measured independently on 2026-07-31.
>
> **The two directions are not symmetric, and the legend above is what explains them.**
>
> - **§2-only (29)** is the documented class and needs nothing: §2 was computed against the coverage-matrix SKETCHES, the manifest check runs on the qualified FIXTURE briefs, which are richer. §2 asking more is the expected direction.
> - **Manifest-only (35)** is the direction worth reading, and it is dominated by one structural cause that is stated here ONCE rather than restated on twenty specs: **`F` means "present *or directly derivable*"**. Deriving a value is exactly what a deterministic detector must never do — a detector that infers a sector from a company name is the false "filled" this whole layer is built to refuse. So every line §2 classed F-by-derivation shows up as a manifest-only divergence, correctly, and it is not a defect on either side.
>
> **One divergence survives that reading, and it is the only unadjudicated finding of the volet.** The legend classes `D` as a card-sanctioned unknown *or an operator-profile default*, naming three of the latter verbatim — "deliverables language, tone, proposal format". Two are honoured by the manifests (WF-001/002 `deliverables_language` carries a default; WF-005 `Tone` fills). The third, **WF-006 `Proposal format`, is `required` with no default, and it stays that way**: the argument that settled WF-005 applies unchanged — the brief carries a CLIENT, and how the PROSPECT wants to receive a proposal is not a constant of the operator's practice. The card agrees, [PDF / Oral presentation / Demo / Written Q&A] being a buyer-side choice, and an RFP mandating an oral defence is not answered by defaulting to a PDF. The reasoning is recorded on the spec itself.

## 3. Findings

1. **No routed prompt fills its card from the raw ask alone (15/15 have gaps except none —
   minimum is P05 at 0 must-ask).** This *validates* locked decision (a): the router input
   must be a brief qualified by the operator, and the qualification step is where the gaps
   close. The dry run quantifies what qualification must collect, per workflow.
2. **The param blocks are prose, not machine-readable.** They live inside a fenced text block
   with free-form bracketed placeholders — no YAML, no required/optional marking. The
   deterministic "params fillable" validation therefore needs a **versioned per-WF parameter
   manifest** in the dispatch layer (param name, class enum where the card offers one,
   card-sanctioned unknown if any), derived from the card and **pinned to the catalog tag**
   (sidecar `source.catalogTag` = the existing anchor). This is the first concrete
   implementation prerequisite the discovery has surfaced.
3. **Sentinel policy is field-class-dependent.** The intake completeness check (contract §4)
   rejects negative sentinels in `need`/`context`; but the param check must **accept** the
   card-sanctioned unknowns ("Not disclosed", "to be defined", "to confirm in STEP-01") —
   they are honest in-band values the workflow is designed to absorb. One rejection regex
   applied uniformly would false-negative WF-006/008/009 briefs. The manifest (finding 2)
   is where per-param sentinel policy lives.
4. **A param gap is a third outcome, distinct from `NO_MATCH` and `REJECT_INCOMPLETE`:**
   the route is *valid* but the brief is returned to the operator **with the missing params
   named** (returned-for-rework upstream of the go/no-go). V1's "assisted client-context
   param filling" slots exactly here. The brief-contract routing output gains a
   `PARAMS_MISSING` outcome (contract §5 updated in the same lot).
5. **Gap profiles cluster by workflow nature.** Technical build (WF-003: 6 must-ask) and
   recruitment (WF-009: 6) need a structured annex at qualification time; consulting/audit
   (WF-004/008/010: 3-4) close with one stakeholder exchange; self-serving intelligence
   (WF-005: 0) runs on operator defaults; self-briefs (P07) make the submitter the answer
   source. **Pilot WF-001 (P01) sits in the sweet spot: 3 must-ask** — small enough to
   qualify in one pass, non-zero so the V0 pilot exercises the `PARAMS_MISSING` return loop
   for real.

## 4. Implications carried into the V0 plan

- Build the **param manifests for WF-001 only** in V0 (pilot), the other nine in V1 —
  manifest shape proven before mass-producing it.
- Deterministic validation order confirmed: sidecar existence → `dependsOn` resolvable →
  param-fill check against the manifest (post-route by construction: params depend on the
  routed WF).
- The completeness check (contract §4) and the param check are **two distinct fail-closed
  gates** with different sentinel policies (finding 3) — do not merge them.

## 5. Next discovery steps

1. ~~Dry-run the matrix against the real identity cards~~ — **done (this document)**.
2. Router prompt + deterministic validation checklist as code-shaped pseudocode
   (now including the WF-001 param manifest draft).
3. Then only: V0 dispatch spine implementation plan (pilot WF-001, human go/no-go gate).
