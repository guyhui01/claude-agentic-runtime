/**
 * The 20 coverage-matrix prompts qualified into validated briefs — the
 * offline dispatch oracle (docs/discovery/wf-000-dispatch-coverage-matrix.md §2).
 * Every company, person and figure is FICTIONAL (public-trace rule).
 *
 * `expected` mirrors the matrix expected-route column verbatim:
 * a workflow id, "NO_MATCH", or "REJECT_INCOMPLETE" (P18 — never reaches
 * routing). P19/P20 are the role probes (role ⊥ route).
 */

import type { NeedBrief } from "../../src/dispatch/types.js";

export interface DispatchFixture {
  id: string;
  /** Raw payload for briefs that must die at intake (P18); otherwise absent. */
  raw?: unknown;
  /** The operator-qualified brief; absent when `raw` is set. */
  brief?: NeedBrief;
  expected: string; // "WF-0XX" | "NO_MATCH" | "REJECT_INCOMPLETE"
}

export const DISPATCH_FIXTURES: DispatchFixture[] = [
  {
    id: "P01",
    expected: "WF-001",
    brief: {
      need: "Client brief received from Nordwind Insurance: the claims department wants an AI assistant for adjusters and management approved exploring it, so we must decide what to build first.",
      domain: "Agile & Product",
      expectedDeliverable: "Prioritized initial backlog with acceptance criteria (full scoping)",
      constraints: ["GDPR applies to claimant data", "pilot budget capped for Q3"],
      context:
        "Mid-size European insurer, claims department of 40 adjusters, one product squad available, Scrum in place, no imposed stack.",
      submittedBy: "Lead UX Designer",
    },
  },
  {
    id: "P02",
    expected: "WF-002",
    brief: {
      need: "The ART at Helvetia Rail runs SAFe with 3 squads; PI-7 planning starts next month and the steering committee expects clean executive progress reporting.",
      domain: "Agile & Product",
      expectedDeliverable: "PI planning outputs, sprint backlog and executive-committee progress reporting",
      constraints: ["compliance date at end of PI-7", "shared test environment freeze"],
      context: "Rail operator, Agile Release Train of 3 squads, 2-week sprints, PI of 10 weeks.",
      submittedBy: "Project Manager (SAFe program)",
    },
  },
  {
    id: "P03",
    expected: "WF-003",
    brief: {
      need: "Ferrostahl GmbH has a validated prototype of an internal doc-search AI and now wants it built, deployed to their cloud and security-checked before rollout.",
      domain: "Dev & Engineering",
      expectedDeliverable: "Deployed application with architecture, code and security audit",
      constraints: ["EU data location", "existing Azure tenancy"],
      context: "Industrial group, internal documentation corpus, RAG chatbot use case, small platform team.",
      submittedBy: "CIO",
    },
  },
  {
    id: "P04",
    expected: "WF-004",
    brief: {
      need: "Engagement signed with Marlowe Foods for an AI maturity audit and a transformation roadmap, including upskilling of their staff on generative AI.",
      domain: "Management & Consulting",
      expectedDeliverable: "Maturity audit, AI strategy roadmap and training plan",
      constraints: ["executive readout expected", "GDPR on customer data"],
      context: "Food-industry mid-cap, beginner AI maturity, CDO sponsor, three-month engagement window.",
      submittedBy: "Chief Data Officer",
    },
  },
  {
    id: "P05",
    expected: "WF-005",
    brief: {
      need: "Cobalt Partners wants a weekly digest of GenAI market moves turned into LinkedIn thought-leadership posts published on a recurring cadence.",
      domain: "Management & Consulting",
      expectedDeliverable: "Weekly qualified synthesis and LinkedIn publication-ready posts",
      constraints: [],
      context:
        "Consulting boutique, public LinkedIn audience, thought-leader tone. The engagement is unconstrained at this stage.",
      submittedBy: "Managing Partner",
    },
  },
  {
    id: "P06",
    expected: "WF-006",
    brief: {
      need: "RFP received from Astrolabe Bank for an AI chatbot program; the response is due in three weeks and qualification must start now.",
      domain: "Management & Consulting",
      expectedDeliverable: "Qualified go/no-go and full commercial proposal with costing",
      constraints: ["response deadline in three weeks", "banking regulatory context"],
      context: "Retail bank prospect, formal RFP, chatbot program scope, procurement-led process.",
      submittedBy: "Head of Sales",
    },
  },
  {
    id: "P07",
    expected: "WF-007",
    brief: {
      need: "Engagement signed with Vantage Retail; the consultant starts Monday on site and needs the D1-D5 landing plan and the first-week deliverables prepared.",
      domain: "Management & Consulting",
      expectedDeliverable: "Kickoff plan, D1 kit and D5 scoping deliverables",
      constraints: ["badge and VPN access to validate before D1"],
      context: "Retail group, hybrid on-site engagement, sponsors identified, medium duration.",
      submittedBy: "Consultant (self-brief)",
    },
  },
  {
    id: "P08",
    expected: "WF-008",
    brief: {
      need: "The triage chatbot of Meridian Health is in production and legal flagged it; they need an AI Act and GDPR compliance audit with a remediation plan.",
      domain: "Compliance & Governance",
      expectedDeliverable: "Compliance audit report and remediation plan",
      constraints: ["health data (GDPR art. 9)", "board presentation expected"],
      context: "Health provider, patient triage chatbot live in production, EU only, external LLM behind a proxy.",
      submittedBy: "Legal Counsel",
    },
  },
  {
    id: "P09",
    expected: "WF-009",
    brief: {
      need: "Quercus Analytics has an identified hiring need for a senior MLOps engineer; budget is approved but there is no job description and no candidate pipeline.",
      domain: "HR & Talent",
      expectedDeliverable: "Job description, sourcing, assessment and selection up to the offer",
      constraints: ["budget approved", "start within the quarter"],
      context: "Data-analytics scale-up, platform team of eight, hybrid Paris, Kubernetes and MLflow stack.",
      submittedBy: "Head of Engineering",
    },
  },
  {
    id: "P10",
    expected: "WF-010",
    brief: {
      need: "The chatbot project at Tessier Logistics is closed after shipping four months late and the CIO wants the lessons learned extracted for the steering committee.",
      domain: "Management & Consulting",
      expectedDeliverable: "Lessons-learned report and improvement plan",
      constraints: ["team sensitivities to handle"],
      context: "Logistics group, 10-month project, distributed team, KPIs and meeting minutes available.",
      submittedBy: "QA Manager",
    },
  },
  {
    id: "P11",
    expected: "WF-006",
    brief: {
      need: "Prospect Kestrel Mutual asked what an AI scoping mission with us would cost; nothing is signed, this is a pre-signature commercial ask to answer.",
      domain: "Management & Consulting",
      expectedDeliverable: "Commercial proposal for a scoping mission",
      constraints: ["no RFP document, direct solicitation"],
      context: "Mutual insurer prospect, first contact through referral, scoping-mission scope only.",
      submittedBy: "Account Executive",
    },
  },
  {
    id: "P12",
    expected: "WF-004",
    brief: {
      need: "Contract signed yesterday with Bruma Textiles; phase one is an AI maturity diagnostic they expect delivered before any strategy or training work starts.",
      domain: "Management & Consulting",
      expectedDeliverable: "AI maturity diagnostic report",
      constraints: ["phase-one deadline in six weeks"],
      context: "Textile manufacturer, advisory engagement signed, audit-first phasing, sponsor is the COO.",
      submittedBy: "Engagement Partner",
    },
  },
  {
    id: "P13",
    expected: "WF-010",
    brief: {
      need: "A major incident hit the fraud-scoring model in production at Ondine Credit last week, made the press, and the board wants to understand what happened.",
      domain: "Management & Consulting",
      expectedDeliverable: "Incident post-mortem analysis and lessons-learned report for the board",
      constraints: ["board timeline", "press exposure"],
      context: "Credit institution, wrong blocking decision publicized, incident logs and monitoring data available.",
      submittedBy: "Chief Risk Officer",
    },
  },
  {
    id: "P14",
    expected: "NO_MATCH",
    brief: {
      need: "Novapart Industries asked us to draft the master service agreement for their new data vendor; this is legal contract drafting, not an audit of an AI system.",
      domain: "Legal",
      expectedDeliverable: "Drafted master service agreement",
      constraints: ["vendor onboarding deadline"],
      context: "Industrial client, procurement-led vendor onboarding, legal drafting need only.",
      submittedBy: "Procurement Manager",
    },
  },
  {
    id: "P15",
    expected: "NO_MATCH",
    brief: {
      need: "Halcyon Grid wants us to take over the 24/7 on-call of their production ML pipelines; this is ongoing operations staffing, not a bounded project.",
      domain: "Operations",
      expectedDeliverable: "Continuous on-call operations coverage",
      constraints: ["24/7 coverage expectation"],
      context: "Energy utility, MLOps platform in place, unbounded operational engagement.",
      submittedBy: "Head of Data Science",
    },
  },
  {
    id: "P16",
    expected: "NO_MATCH",
    brief: {
      need: "Miravel Labs wants us to pretrain their own 7B-parameter LLM on their proprietary corpus; this is a model pretraining program, not an application build.",
      domain: "Research & Development",
      expectedDeliverable: "Pretrained proprietary language model",
      constraints: ["GPU budget under negotiation"],
      context: "Biotech scale-up, proprietary corpus, research-grade training infrastructure need.",
      submittedBy: "Data Scientist",
    },
  },
  {
    id: "P17",
    expected: "NO_MATCH",
    brief: {
      need: "The office manager of Sequoia Assurances asked us to organize the office move of the Lyon site in September; facilities logistics only, nothing digital.",
      domain: "Facilities",
      expectedDeliverable: "Executed office move",
      constraints: ["September window"],
      context: "Insurance company back office, 60 desks, purely logistical scope.",
      submittedBy: "Office Manager",
    },
  },
  {
    id: "P18",
    expected: "REJECT_INCOMPLETE",
    raw: { need: "We need AI." },
  },
  {
    id: "P19",
    expected: "WF-001", // role probe — trap is WF-009 (HR submitter, talent-flavored product)
    brief: {
      need: "Client brief received from Calluna Group HR: leadership approved exploring an AI assistant helping employees navigate internal mobility, and we must decide what to build first.",
      domain: "Agile & Product",
      expectedDeliverable: "Prioritized initial backlog with acceptance criteria (full scoping)",
      constraints: ["works council to be informed", "GDPR on employee data"],
      context:
        "Telecom services group (HR department), internal-mobility assistant product, one squad available, Scrum in place.",
      submittedBy: "Head of HR",
    },
  },
  {
    id: "P20",
    expected: "WF-008", // role probe — trap is WF-003 (builder-profile submitter)
    brief: {
      need: "The triage scoring model built at Vela Diagnostics is in production; before the next release its builder wants it checked against the AI Act and GDPR.",
      domain: "Compliance & Governance",
      expectedDeliverable: "Compliance audit report against AI Act and GDPR with remediation actions",
      constraints: ["next release gate", "health data involved"],
      context: "Diagnostics company, proprietary classic-ML scoring model live in production, EU processing.",
      submittedBy: "Lead Data Scientist",
    },
  },
];
