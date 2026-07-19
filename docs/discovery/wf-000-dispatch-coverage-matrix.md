# WF-000 Dispatch — Routing Coverage Matrix (draft)

> **Status: DISCOVERY DRAFT** — second deliverable of the WF-000 dispatch discovery.
> 20 **fictional** stakeholder prompts exercised against the 10 catalog workflows
> (`claude-agents` sidecar v4.2.0). Every company, person and figure below is invented
> (public-trace rule). Companion: [brief contract draft](wf-000-dispatch-brief-contract.md).
>
> Reading key — the "prompt" column simulates the RAW stakeholder ask; the router never sees
> it (the operator qualifies it into a brief first). The matrix tests whether the QUALIFIED
> need routes to the expected workflow, whether off-catalog needs honestly reach `NO_MATCH`,
> and — via the two role probes P19/P20 — whether routing stays **invariant to the submitter's
> role** (role ⊥ route).
> Drafted 2026-07-19 with Claude Fable 5 (`claude-fable-5`), reviewed by the product owner.

## 1. The 10 routing targets (from sidecar v4.2.0)

| WF | Title | Precondition marker (from description) | Domain |
|---|---|---|---|
| WF-001 | AI Product Scoping | Client brief received | Agile & Product |
| WF-002 | Delivery Agile SAFe | PI planning / delivery cadence running | Agile & Product |
| WF-003 | AI Application Launch | Validated idea, build wanted | Dev & Engineering |
| WF-004 | AI Consulting Engagement | Engagement signed (audit/strategy) | Management & Consulting |
| WF-005 | Strategic Intelligence & Growth | Market signal / weekly cadence | Management & Consulting |
| WF-006 | Pre-sales / Commercial proposal | RFP received | Management & Consulting |
| WF-007 | Client Engagement Onboarding D1-D5 | Engagement signed (starting now) | Management & Consulting |
| WF-008 | AI Act / GDPR Compliance Audit | AI system to audit | Compliance & Governance |
| WF-009 | IT/AI Recruitment | Hiring need identified | HR & Talent |
| WF-010 | Project Post-mortem / Lessons Learned | Project closed or major incident | Management & Consulting |

## 2. Matrix — 20 fictional prompts

Expected route = what the deterministic validation should confirm after the LLM proposal.
`NO_MATCH` = honest coverage answer. `REJECT_INCOMPLETE` = stopped by the completeness
check, never reaches routing. `submittedBy` is deliberately diversified (HR, design, data
science, QA, project management, legal, sales, C-level): it is an **advisory** field the
router must NOT route on — P19/P20 probe exactly that.

| # | submittedBy (role) | Fictional stakeholder prompt (raw) | Qualified need (state marker) | Expected route | Why this route and not the neighbor |
|---|---|---|---|---|---|
| P01 | Lead UX Designer | "Our claims department (Nordwind Insurance) wants an AI assistant for adjusters. Management approved exploring it — we need to know what to build first." | Client brief received; wants prioritized backlog + acceptance criteria | **WF-001** | Brief exists, no build commitment yet — scoping, not WF-003 launch. |
| P02 | Project Manager (SAFe program) | "Our ART at Helvetia Rail (3 teams, SAFe) starts PI-7 next month and the steering committee wants clean progress reporting." | Delivery cadence running; PI planning → sprint backlog → COMEX reporting | **WF-002** | Ongoing delivery mechanics, not product discovery (WF-001). |
| P03 | CIO | "We validated a prototype of an internal doc-search AI at Ferrostahl GmbH. Now we want it built, deployed and security-checked." | Validated idea → architecture → code → deployment → security audit | **WF-003** | Idea already validated: build phase, not scoping (WF-001). |
| P04 | Chief Data Officer | "Marlowe Foods signed with us for an AI maturity audit and a transformation roadmap, incl. staff upskilling." | Engagement signed; maturity audit → strategy → training plan | **WF-004** | Signed advisory engagement, audit-shaped — not D1-D5 logistics (WF-007). |
| P05 | Managing Partner | "I want a weekly digest of GenAI market moves for Cobalt Partners, turned into LinkedIn thought-leadership posts." | Weekly cadence; qualified synthesis → content → publication | **WF-005** | Recurring intelligence + content, no client engagement involved. |
| P06 | Head of Sales | "Astrolabe Bank just sent us an RFP for an AI chatbot program. Response due in 3 weeks." | RFP received → qualification → costing → commercial proposal | **WF-006** | Pre-signature: the GO/NO-GO qualification gate is the point. Not WF-001 (no engagement yet). |
| P07 | Consultant (self-brief) | "The Vantage Retail engagement is signed, I start Monday. I need my D1-D5 landing plan and first deliverables." | Engagement signed, starting now → kickoff plan → D1/D5 deliverables | **WF-007** | Same "signed" marker as WF-004 but the need is the landing week, not an audit. |
| P08 | Legal Counsel | "Legal at Meridian Health flagged our triage chatbot: is it AI Act compliant? GDPR too. We need a real audit with a remediation plan." | AI system in production to audit → obligations mapping → report | **WF-008** | System exists and the ask is conformity — not a post-mortem (no incident, WF-010). |
| P09 | Head of Engineering | "Quercus Analytics needs a senior MLOps engineer. We have budget, no job description, no pipeline." | Hiring need identified → JD → sourcing → assessment → offer | **WF-009** | Recruitment chain end-to-end; candidate pool provided synthetically (V0 constraint, proven live). Note the submitter is engineering, not HR — the need routes, not the role. |
| P10 | QA Manager | "The chatbot project at Tessier Logistics shipped 4 months late and the team is bruised. The CIO wants us to extract the lessons." | Project closed → collection → analysis → lessons-learned report | **WF-010** | Closed project, retrospective intent — not an ongoing-delivery fix (WF-002). |
| P11 | Account Executive | "A prospect (Kestrel Mutual) asked what an AI scoping mission with us would cost." | No RFP document, but a pre-signature commercial ask | **WF-006** | Discriminator vs WF-001: nothing is signed — the deliverable is a proposal, not a backlog. |
| P12 | Engagement Partner | "Contract signed with Bruma Textiles yesterday; they expect an AI maturity diagnostic as phase 1." | Engagement signed; first phase = audit | **WF-004** | Discriminator vs WF-007: the need is the audit content, not the D1-D5 onboarding mechanics. |
| P13 | Chief Risk Officer | "Our fraud-scoring model at Ondine Credit made the press for a wrong blocking decision last week. The board wants to understand what happened." | Major incident on an AI system → analysis → lessons learned | **WF-010** | Discriminator vs WF-008: incident retrospective. (A follow-up compliance audit may be a SECOND brief → WF-008 — one brief, one route.) |
| P14 | Procurement Manager | "Draft the master service agreement for our new data vendor." | Legal contract drafting | **NO_MATCH** | Legal drafting ≠ compliance audit; AGENT-JURIDIQUE-IA exists but no workflow carries this. Nearest miss (advisory): WF-008. |
| P15 | Head of Data Science | "Take over the 24/7 on-call for our production ML pipelines." | Ongoing operations / staffing | **NO_MATCH** | Continuous ops is not a bounded workflow run; no catalog WF terminates. |
| P16 | Data Scientist | "We want to pretrain our own 7B-parameter LLM on our corpus." | Model pretraining program | **NO_MATCH** | Out of catalog scope (consulting/delivery workflows, not ML training programs). Nearest miss: WF-003, honest answer is still no. |
| P17 | Office Manager | "Organize the office move of our Lyon site in September." | Facilities logistics | **NO_MATCH** | Out of domain entirely; guards against force-fit onto WF-002 (project-shaped ≠ catalog-covered). |
| P18 | CEO | "We need AI." | — (no deliverable, no state marker, no context) | **REJECT_INCOMPLETE** | Fails the completeness check (§4 of the contract): no state marker, no expected deliverable. Never reaches routing — the operator must qualify upstream. |
| P19 | **Head of HR** (role probe) | "HR at Calluna Group wants an AI assistant helping employees navigate internal mobility. Leadership approved exploring it — what should we build first?" | Client brief received; wants prioritized backlog + acceptance criteria | **WF-001** | **Role trap = WF-009**: HR submitter + talent-flavored product. But nothing is being recruited — the need is product scoping. Role ⊥ route. |
| P20 | **Lead Data Scientist** (role probe) | "I built the triage scoring model now in production at Vela Diagnostics; before the next release I want it checked against the AI Act and GDPR." | AI system in production to audit → obligations mapping → report | **WF-008** | **Role trap = WF-003**: builder-profile submitter suggests a build/launch chain. But the system exists — the need is conformity. Role ⊥ route. |

## 3. Coverage summary and observations

- **Coverage: 10/10 workflows** reached by at least one prompt; WF-001, WF-004, WF-006, WF-008
  and WF-010 reached twice (discriminating pairs P11-P13 + role probes P19/P20).
- **4 honest `NO_MATCH`** (P14-P17) spanning four distinct miss classes: covered agent but no
  workflow (P14), unbounded ops (P15), out-of-scope program (P16), out-of-domain (P17).
- **1 `REJECT_INCOMPLETE`** (P18) proving the fail-closed intake gate has a job before routing.
- **2 role probes (P19/P20): role ⊥ route.** `submittedBy` is advisory; the router must route
  on state + expected deliverable even when the submitter's role points to a different
  workflow (HR → not necessarily WF-009; data scientist → not necessarily WF-003). This is a
  known LLM failure mode (persona bias) made falsifiable: the probes are part of the offline
  test oracle, evaluated **deterministically against the expected-route column — never by
  another LLM** (ADR-0007 spirit; the pre-human verifier stays deterministic).
- **The precondition marker is the primary routing signal.** Every sidecar description is
  arrow-shaped: `state → … → deliverable`. The hard pairs (WF-004/WF-007 both "engagement
  signed", WF-008/WF-010 both "something wrong with an AI system", WF-001/WF-006 both
  "client wants AI") are disambiguated by **state + expected deliverable together**, which is
  why both are required fields of the brief contract. This is the falsifiable claim the V0
  pilot must test: if the LLM router mis-routes any of P11-P13 or P19/P20 with a complete
  brief, the contract needs a sharper field (or the router prompt a harder rule), not a
  smarter judge.
- **Pilot run target: WF-001 (P01).** Smallest backbone with a fully proven spine and no
  passthrough caveat.

## 4. Next discovery steps

1. ~~Exercise the matrix against the real WF identity cards~~ — **DONE**, see
   [identity-card dry run](wf-000-dispatch-identity-card-dry-run.md) (15/15 routed prompts
   gap-profiled; `PARAMS_MISSING` outcome added to the brief contract §5).
2. ~~Draft the router prompt + the deterministic validation checklist~~ — **DONE**, see
   [router draft](wf-000-dispatch-router-draft.md) (prompt skeleton, fail-closed validation
   pseudocode, WF-001 param manifest draft).
3. ~~V0 dispatch spine implementation plan~~ — **DONE**, see
   [V0 implementation plan](wf-000-dispatch-v0-implementation-plan.md). Discovery complete;
   next work is implementation (Lot 1 = brief schema + completeness check, offline).
