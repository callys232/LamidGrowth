import type { ProductEngineItem } from './ProductSuitePage';

export interface EnginePlaybookAndUseCase {
  cadence: string;
  howItWorks: string;
  playbookSteps: [string, string, string];
  sampleRun: {
    inputs: string;
    output: string;
  };
  useCase: {
    role: string;
    scenario: string;
    outcome: string;
  };
  linkedPlaybookId?: string;
}

export interface SuiteUseCaseCard {
  id: string;
  suiteId: string;
  engineCode: string;
  engineName: string;
  role: string;
  title: string;
  scenario: string;
  howUsed: string;
  outcome: string;
}

export interface SuitePlaybookSummary {
  id: string;
  suiteId: string;
  title: string;
  category: string;
  cadence: string;
  description: string;
  engineCodes: string[];
  linkedPlaybookId?: string;
}

export const suitePlaybooks: Record<string, SuitePlaybookSummary[]> = {
  strategy: [
    {
      id: 'pb-strategy-alignment',
      suiteId: 'strategy',
      title: 'Quarterly Strategy & Spend Alignment',
      category: 'Clarity',
      cadence: 'Quarterly',
      description:
        'Test whether active initiatives and capital actually serve your stated strategic objectives before locking next quarter budgets.',
      engineCodes: ['S01', 'S03', 'S09'],
    },
    {
      id: 'pb-strategy-execution',
      suiteId: 'strategy',
      title: 'OKR & Operating Model Review',
      category: 'Clarity',
      cadence: 'Monthly',
      description:
        'Track objective completion against external market shifts and structural handoff bottlenecks.',
      engineCodes: ['S06', 'S07', 'C06'],
    },
  ],
  decisions: [
    {
      id: 'decision-review',
      suiteId: 'decisions',
      title: 'Make decisions with clear ownership',
      category: 'Clarity',
      cadence: 'Weekly',
      description:
        'Track pending decisions, surface stalled calls and missing owners, and keep review dates visible.',
      engineCodes: ['Q02', 'Q29', 'Q05'],
      linkedPlaybookId: 'decision-review',
    },
    {
      id: 'pb-decisions-commit',
      suiteId: 'decisions',
      title: 'Pre-Commit Decision Quality Gate',
      category: 'Clarity',
      cadence: 'Pre-Commit',
      description:
        'Score option quality, run Bayesian expected-value scenarios, and test sensitivity before signing off.',
      engineCodes: ['Q44', 'Q21', 'Q03'],
    },
  ],
  people: [
    {
      id: 'team-development',
      suiteId: 'people',
      title: 'Plan the next development step',
      category: 'Capability',
      cadence: 'Quarterly',
      description:
        'Map critical skill gaps, bench readiness, and targeted upskilling for each role.',
      engineCodes: ['A02', 'A03', 'A22'],
      linkedPlaybookId: 'team-development',
    },
    {
      id: 'pb-people-retention',
      suiteId: 'people',
      title: 'Leadership Bench & Culture Pulse',
      category: 'Capability',
      cadence: 'Bi-Annual',
      description:
        'Calibrate performance-potential, measure eNPS with small-team protection, and audit development ROI.',
      engineCodes: ['A09', 'A11', 'A15'],
    },
  ],
  operations: [
    {
      id: 'delivery-health',
      suiteId: 'operations',
      title: 'Review delivery without chasing noise',
      category: 'Consistency',
      cadence: 'Weekly',
      description:
        'Use Little’s Law flow metrics and XmR stability limits to separate true process drift from normal variation.',
      engineCodes: ['R02', 'R03', 'R05'],
      linkedPlaybookId: 'delivery-health',
    },
    {
      id: 'operating-rhythm',
      suiteId: 'operations',
      title: 'Build a useful review rhythm',
      category: 'Consistency',
      cadence: 'Monthly',
      description:
        'Eliminate recurring bottlenecks with root-cause fishbone analysis and clear cross-team dependency boards.',
      engineCodes: ['R06', 'P14', 'R25', 'S05'],
      linkedPlaybookId: 'operating-rhythm',
    },
  ],
  finance: [
    {
      id: 'cash-spend',
      suiteId: 'finance',
      title: 'Bring cash and spending into view',
      category: 'Finance',
      cadence: 'Weekly',
      description:
        'Monitor 13-week direct cash runway alongside Pareto spend concentration and DuPont ROE drivers.',
      engineCodes: ['F02', 'F04', 'F03'],
      linkedPlaybookId: 'cash-spend',
    },
    {
      id: 'pb-finance-valuation',
      suiteId: 'finance',
      title: 'Capital Efficiency & Valuation Readiness',
      category: 'Finance',
      cadence: 'Quarterly',
      description:
        'Benchmark liquidity and solvency ratios, stress-test DCF valuation sensitivity, and audit finance maturity.',
      engineCodes: ['F01', 'F05', 'F07'],
    },
  ],
  'risk-governance': [
    {
      id: 'pb-risk-early-warning',
      suiteId: 'risk-governance',
      title: 'Early Warning & Appetite Governance',
      category: 'Consistency',
      cadence: 'Monthly',
      description:
        'Track KRI breach velocity against risk appetite thresholds and keep board obligations auditable.',
      engineCodes: ['Q15', 'Q43', 'Q99', 'Q76'],
    },
    {
      id: 'pb-risk-resilience',
      suiteId: 'risk-governance',
      title: 'Continuity, Cyber & Controls Audit',
      category: 'Consistency',
      cadence: 'Quarterly',
      description:
        'Verify RTO/RPO recovery targets, cyber posture controls, and financial segregation of duties.',
      engineCodes: ['Q86', 'X02', 'X06', 'F06'],
    },
  ],
  'growth-change': [
    {
      id: 'growth-review',
      suiteId: 'growth-change',
      title: 'Choose opportunities and review value',
      category: 'Growth',
      cadence: 'Quarterly',
      description:
        'Balance bets across the 3 Horizons, sequence growth pathways within capacity, and verify feasibility.',
      engineCodes: ['Z01', 'G03', 'G07'],
      linkedPlaybookId: 'growth-review',
    },
    {
      id: 'pb-change-readiness',
      suiteId: 'growth-change',
      title: 'Transformation & Readiness Mobilisation',
      category: 'Growth',
      cadence: 'Monthly',
      description:
        'Pinpoint ADKAR barriers by stakeholder group and track transformation milestone delivery.',
      engineCodes: ['C08', 'Z06', 'G04', 'G06'],
    },
  ],
  advisory: [
    {
      id: 'pb-advisory-escrow',
      suiteId: 'advisory',
      title: 'Milestone-Governed Fractional Engagement',
      category: 'Consistency',
      cadence: 'Per Milestone',
      description:
        'Scope deliverables upfront, fund milestones in escrow, and release capital only upon verified sign-off.',
      engineCodes: ['ADV-01', 'ADV-02'],
    },
    {
      id: 'pb-advisory-review',
      suiteId: 'advisory',
      title: 'Boardroom Second Opinion & Concierge',
      category: 'Consistency',
      cadence: 'On Demand',
      description:
        'Run rapid independent peer reviews before M&A, debt, or restructuring calls with full workspace context.',
      engineCodes: ['ADV-03', 'ADV-04'],
    },
  ],
};

export const engineGuides: Record<string, EnginePlaybookAndUseCase> = {
  S01: {
    cadence: 'Annual / Quarterly',
    howItWorks:
      'Scores core ideology clarity, values consistency, and strategic focus across leadership responses using Collins & Porras alignment criteria.',
    playbookSteps: [
      'Collect leadership answers on purpose, core values, and 3-year strategic anchors.',
      'Run S01 to quantify alignment dispersion and highlight vague or conflicting priorities.',
      'Lock a single 1-page strategic anchor shared across all department heads.',
    ],
    sampleRun: {
      inputs: '6 exec scores across Purpose, Values, and 3-Year Focus',
      output: '84% Alignment · Flagged: 2 conflicting regional expansion goals',
    },
    useCase: {
      role: 'CEO / Founder',
      scenario: 'Post-Series B leadership team pulling in different directions on enterprise vs. SMB.',
      outcome: 'Cut 4 unaligned side-bets and focused 90% of Q3 engineering on enterprise retention.',
    },
  },
  S03: {
    cadence: 'Quarterly',
    howItWorks:
      'Maps every active project and budget line to strategic objectives, computing the exact % of spend and capacity serving zero objectives.',
    playbookSteps: [
      'List active initiatives with quarterly budget and headcount allocation.',
      'Map each initiative to primary and secondary strategic objectives.',
      'Reallocate "orphan" spend into top-ranked strategic priorities.',
    ],
    sampleRun: {
      inputs: '18 active initiatives ($2.4M quarterly spend)',
      output: '22% ($528k) orphan spend identified across 4 legacy projects',
    },
    useCase: {
      role: 'Chief Strategy Officer',
      scenario: 'Annual budgeting where every department claims all projects are "mission critical".',
      outcome: 'Reclaimed $528k in orphan spend to fund two stalled core platform milestones.',
    },
  },
  S09: {
    cadence: 'Quarterly',
    howItWorks:
      'Applies weighted multi-criteria scoring and Monte Carlo / weight sensitivity checks to test whether top-ranked priorities hold under shifting assumptions.',
    playbookSteps: [
      'Define 4–6 decision criteria (e.g., Revenue Impact, Strategic Fit, Time to Value) and weights.',
      'Score candidate priorities and run S09 rank-reversal sensitivity.',
      'Approve top-tier initiatives whose rank stays stable across weight perturbations.',
    ],
    sampleRun: {
      inputs: '12 candidate initiatives across 5 weighted criteria',
      output: 'Top 3 stable at ±15% weight swing · #4 & #5 swap under cost sensitivity',
    },
    useCase: {
      role: 'VP Product & Strategy',
      scenario: 'Debating 12 roadmap candidates with finite Q4 engineering capacity.',
      outcome: 'Locked top 3 initiatives in 45 minutes with transparent, auditable scoring.',
    },
  },
  S06: {
    cadence: 'Monthly',
    howItWorks:
      'Normalizes key result progress (including "lower-is-better" targets like churn or cycle time) and flags confidence drift against elapsed quarter time.',
    playbookSteps: [
      'Enter baseline, target, and current actuals for each Objective and Key Result.',
      'Review confidence ratings vs. linear time-elapsed pacing.',
      'Trigger corrective owner actions on any KR >15% behind pace.',
    ],
    sampleRun: {
      inputs: '4 Objectives, 14 Key Results at Week 7 of 12',
      output: '68% overall pace · 3 KRs flagged behind pace (Support SLA, Net Retention)',
    },
    useCase: {
      role: 'COO',
      scenario: 'Mid-quarter business review where green status lights hide lagging operational metrics.',
      outcome: 'Detected SLA slippage 5 weeks early and rebalanced tier-2 support coverage.',
    },
  },
  S07: {
    cadence: 'Bi-Annual',
    howItWorks:
      'Structures PESTLE and ISO 9001 §4.1 external context signals by impact velocity and likelihood to surface early strategic shifts.',
    playbookSteps: [
      'Log regulatory, macroeconomic, technology, and competitive shifts.',
      'Score impact magnitude and time horizon (0–6m, 6–18m, 18m+).',
      'Assign watch owners and link high-velocity shifts to Strategy & Risk registers.',
    ],
    sampleRun: {
      inputs: '14 external PESTLE signals scored for impact and horizon',
      output: '3 high-velocity regulatory shifts flagged for Q1 compliance prep',
    },
    useCase: {
      role: 'Managing Director',
      scenario: 'Preparing ISO 9001 §4.1 context review ahead of market expansion.',
      outcome: 'Produced audit-ready external context matrix and hedged FX exposure early.',
    },
  },
  C06: {
    cadence: 'Bi-Annual',
    howItWorks:
      'Evaluates structural clarity, handoff friction, decision latency, and role accountability across business units.',
    playbookSteps: [
      'Score core value-stream handoffs across Product, Sales, Delivery, and Finance.',
      'Identify structural bottlenecks where work stalls between teams.',
      'Redesign ownership boundaries and governance cadences.',
    ],
    sampleRun: {
      inputs: '5 core value-stream handoffs scored across 4 dimensions',
      output: 'Sales-to-Delivery handoff scored 42/100 (primary bottleneck)',
    },
    useCase: {
      role: 'Head of Operations',
      scenario: 'Scaling from 40 to 110 staff as cross-team handoffs break down.',
      outcome: 'Cut onboarding handoff time from 14 days to 4 days via clear stage gates.',
    },
  },
  Q44: {
    cadence: 'Pre-Commit',
    howItWorks:
      'Applies Matheson & Howard’s 6-element Decision Quality chain (Frame, Alternatives, Information, Values, Reasoning, Commitment) where overall quality is bounded by the weakest link.',
    playbookSteps: [
      'Score each of the 6 Decision Quality dimensions from 0–100%.',
      'Inspect the weakest link (the chain cannot exceed its lowest dimension).',
      'Close the gap on that single dimension before committing capital.',
    ],
    sampleRun: {
      inputs: '6 DQ dimensions for $1.2M Warehouse Automation Call',
      output: 'Chain Quality: 48% (bottlenecked by Alternatives: only 1 vendor quoted)',
    },
    useCase: {
      role: 'CFO / Investment Committee',
      scenario: 'Evaluating a $1.2M capital commitment presented as a binary yes/no.',
      outcome: 'Added 2 competing alternatives and saved $290k on final contract terms.',
    },
    linkedPlaybookId: 'decision-review',
  },
  Q02: {
    cadence: 'Weekly',
    howItWorks:
      'Computes open decision cycle time, stalled calls past threshold, missing owners, overdue reviews, and reversal rates from your decision log.',
    playbookSteps: [
      'Log every consequential decision with raised date, owner, and status.',
      'Set your stall threshold (e.g., 21 or 30 days) and review queue.',
      'Clear stalled items in the weekly executive standup.',
    ],
    sampleRun: {
      inputs: '24 logged decisions, 30-day stall threshold',
      output: 'Avg cycle: 19 days · 4 stalled decisions · 2 missing explicit owners',
    },
    useCase: {
      role: 'Chief of Staff',
      scenario: 'Key pricing and hiring decisions lingering unresolved across Slack threads.',
      outcome: 'Reduced average decision cycle time from 34 days to 11 days in 6 weeks.',
    },
    linkedPlaybookId: 'decision-review',
  },
  Q29: {
    cadence: 'Quarterly / Per Initiative',
    howItWorks:
      'Validates RACI/DACI tables to automatically catch rows with zero Accountable owners, multiple Accountable owners, or overloaded approvers.',
    playbookSteps: [
      'List key recurring or project decisions and assign D/A/C/I roles.',
      'Run Q29 to flag missing or duplicate accountability.',
      'Publish the validated rights matrix to all stakeholders.',
    ],
    sampleRun: {
      inputs: '16 cross-functional decisions across 7 executives',
      output: '3 duplicate Accountable owners & 2 ownerless pricing calls flagged',
    },
    useCase: {
      role: 'VP Operations',
      scenario: 'Two VPs repeatedly overriding each other on enterprise discount approvals.',
      outcome: 'Clarified single Accountable owner per deal tier, cutting quote turnaround by 60%.',
    },
  },
  Q21: {
    cadence: 'Per Decision',
    howItWorks:
      'Computes weighted option totals and calculates the minimum weight shift required to flip the winning option.',
    playbookSteps: [
      'Define options and weighted evaluation criteria.',
      'Score each option with documented evidence.',
      'Check the winner’s sensitivity margin before selecting.',
    ],
    sampleRun: {
      inputs: '3 ERP vendors scored across 6 criteria',
      output: 'Vendor B leads 78.4 vs 74.1 · Flips only if Implementation Cost weight >38%',
    },
    useCase: {
      role: 'CTO',
      scenario: 'Selecting a core cloud/ERP vendor with split engineering and finance preferences.',
      outcome: 'Aligned both teams around Vendor B with documented cost-cap guardrails.',
    },
  },
  Q03: {
    cadence: 'Per Major Bet',
    howItWorks:
      'Computes probability-weighted Expected Value (EV), downside VaR, and upside spread across Bear/Base/Bull scenarios.',
    playbookSteps: [
      'Estimate Bear, Base, and Bull outcomes with explicit probabilities summing to 100%.',
      'Run Q03 to inspect Expected Value vs. worst-case downside exposure.',
      'Structure stage-gates to cap Bear-case loss.',
    ],
    sampleRun: {
      inputs: 'New Market Entry: Bear (-$180k, 25%), Base (+$320k, 55%), Bull (+$900k, 20%)',
      output: 'Expected Value: +$311k · Max Downside Exposure: -$180k',
    },
    useCase: {
      role: 'Founder / Board',
      scenario: 'Deciding whether to open a second regional office or invest in partner channels.',
      outcome: 'Used stage-gated pilot to cap Bear downside at -$45k while preserving +$311k EV.',
    },
  },
  Q05: {
    cadence: 'Weekly',
    howItWorks:
      'Applies Black Swan / Reinertsen WSJF (Cost of Delay divided by duration) to sequence queued decisions and quantify weekly waiting cost.',
    playbookSteps: [
      'Estimate weekly Cost of Delay and decision/execution duration for queued items.',
      'Sort queue by WSJF score rather than loudest stakeholder.',
      'Fast-track top WSJF calls immediately.',
    ],
    sampleRun: {
      inputs: '6 pending decisions ($48k/week total waiting cost)',
      output: '#1 Enterprise SLA Renewal (WSJF 9.4, $22k/wk delay cost)',
    },
    useCase: {
      role: 'Product & RevOps Lead',
      scenario: 'Leadership backlog treating minor policy tweaks equally with revenue-blocking calls.',
      outcome: 'Recovered $66k in delayed revenue by resolving top-2 WSJF items first.',
    },
  },
  Q06: {
    cadence: 'Quarterly',
    howItWorks:
      'Cross-tabulates competing initiatives against shared bottlenecks (budget, key specialists, leadership bandwidth) to expose hidden resource collisions.',
    playbookSteps: [
      'Tag each active initiative with required specialist teams and peak months.',
      'Run Q06 to surface over-committed teams (>100% allocation).',
      'Stagger start dates to eliminate thrashing.',
    ],
    sampleRun: {
      inputs: '9 initiatives competing for Data Engineering & Legal',
      output: 'Data Eng allocated at 165% in October · 3 collisions flagged',
    },
    useCase: {
      role: 'PMO Director',
      scenario: 'Three strategic projects stalling simultaneously on the same 2 data engineers.',
      outcome: 'Sequenced launches cleanly across Q3–Q4, improving on-time delivery to 92%.',
    },
  },
  Q17: {
    cadence: 'Per Initiative',
    howItWorks:
      'Plots stakeholders on a Power vs. Interest / Support grid and generates targeted engagement actions for high-power blockers.',
    playbookSteps: [
      'List internal/external stakeholders with Power, Interest, and Current Stance.',
      'Identify high-power skeptics or unengaged sponsors.',
      'Assign tailored alignment actions before launch.',
    ],
    sampleRun: {
      inputs: '11 stakeholders for Pricing Model Overhaul',
      output: '2 High-Power Skeptics (Enterprise Sales VP, Legal) flagged for pre-briefing',
    },
    useCase: {
      role: 'Change Lead',
      scenario: 'Rolling out usage-based pricing that could trigger sales compensation pushback.',
      outcome: 'Resolved commission transition concerns upfront, avoiding launch-week resistance.',
    },
  },
  S08: {
    cadence: 'Per Change',
    howItWorks:
      'Quantifies weighted Driving Forces vs. Restraining Forces (Kurt Lewin) to show whether net momentum supports change or needs friction removal first.',
    playbookSteps: [
      'List and weight forces pushing for and resisting the proposed change.',
      'Inspect net force balance and top restraining barriers.',
      'Dismantle top 2 restraining forces before pushing harder.',
    ],
    sampleRun: {
      inputs: '5 driving forces (wt 19) vs. 4 restraining forces (wt 16)',
      output: 'Net Balance: +3 (Fragile) · Top blocker: Manual data migration fear',
    },
    useCase: {
      role: 'Transformation Sponsor',
      scenario: 'CRM migration facing silent non-adoption across regional sales teams.',
      outcome: 'Eliminated manual migration friction, swinging net force from +3 to +14.',
    },
  },
  Q35: {
    cadence: 'Per Decision',
    howItWorks:
      'Matches decision reversibility, stakes, and uncertainty to the appropriate governance path (Type-1 irreversible vs. Type-2 reversible).',
    playbookSteps: [
      'Rate decision reversibility, financial/brand stakes, and data certainty.',
      'Follow Q35’s recommended governance tier (fast owner call vs. formal DQ gate).',
      'Avoid applying heavyweight committees to reversible calls.',
    ],
    sampleRun: {
      inputs: 'Low reversibility, High stakes, Medium uncertainty',
      output: 'Type-1 Formal Gate: Requires Q44 DQ Review + Independent Peer Check',
    },
    useCase: {
      role: 'Executive Team',
      scenario: 'Board bogged down reviewing minor vendor contracts while rushing irreversible leases.',
      outcome: 'Delegated 70% of Type-2 calls to owners and focused board time on Type-1 bets.',
    },
  },
  Q58: {
    cadence: '30/90 Days Post-Launch',
    howItWorks:
      'Compares projected business-case benefits and costs against realized post-implementation outcomes to surface variance and capture lessons.',
    playbookSteps: [
      'Enter original projected ROI, timeline, and assumptions.',
      'Record realized 90-day metrics and variance drivers.',
      'Feed calibration lessons back into future business cases.',
    ],
    sampleRun: {
      inputs: 'Projected +$400k annual savings vs. Actual +$285k at Day 90',
      output: '71% realization · Root gap: 6-week adoption lag in ops team',
    },
    useCase: {
      role: 'Finance & Ops',
      scenario: 'Checking whether last year’s automation spend actually delivered promised savings.',
      outcome: 'Identified training gap, unlocked remaining $115k savings, and refined future ROI models.',
    },
  },
  Q27: {
    cadence: 'Quarterly',
    howItWorks:
      'Computes Brier scores and calibration curves comparing forecasted probabilities against actual binary outcomes.',
    playbookSteps: [
      'Log historical probability forecasts (e.g., deal close %, launch on-time %) and outcomes.',
      'Compute Brier score and overconfidence bias by bucket.',
      'Recalibrate forecasting teams using objective feedback.',
    ],
    sampleRun: {
      inputs: '40 historical launch & revenue probability forecasts',
      output: 'Brier Score: 0.14 · Overconfidence detected in 80–90% confidence bucket',
    },
    useCase: {
      role: 'VP Revenue / Strategy',
      scenario: 'Sales and delivery teams consistently missing "90% certain" quarterly commits.',
      outcome: 'Improved forecast accuracy by 28% over two quarters.',
    },
  },
  A05: {
    cadence: 'Annual',
    howItWorks:
      'Measures stated cultural values against observed workplace behaviors and decision norms across departments.',
    playbookSteps: [
      'Run anonymous behavioral pulse across core cultural dimensions.',
      'Compare executive perception vs. frontline reality.',
      'Target top 2 say-do gaps with concrete leadership habits.',
    ],
    sampleRun: {
      inputs: '85 employee responses across 4 departments',
      output: 'Say-Do Gap on "Psychological Safety": Exec 82% vs Frontline 54%',
    },
    useCase: {
      role: 'Chief People Officer',
      scenario: 'High junior attrition despite strong stated values on paper.',
      outcome: 'Addressed manager feedback habits, lifting 12-month retention by 14 pts.',
    },
  },
  A02: {
    cadence: 'Quarterly',
    howItWorks:
      'Computes role-by-role skill deficits against target proficiency levels and prioritizes training vs. hiring interventions.',
    playbookSteps: [
      'Define required proficiency (1–5) for critical roles.',
      'Assess current team capability and flag gaps ≥ 1.5 levels.',
      'Assign upskilling or targeted hiring plans per gap.',
    ],
    sampleRun: {
      inputs: '32 specialists assessed across 12 core capabilities',
      output: '3 Critical Gaps: Cloud FinOps (-1.8), Enterprise Discovery (-1.5)',
    },
    useCase: {
      role: 'VP Engineering / HR',
      scenario: 'Moving upmarket without knowing which technical and sales skills are missing.',
      outcome: 'Targeted 6-week enablement closed FinOps gap without premature headcount.',
    },
    linkedPlaybookId: 'team-development',
  },
  A03: {
    cadence: 'Quarterly',
    howItWorks:
      'Models headcount demand, attrition run-rate, and hiring lead times against quarterly growth targets.',
    playbookSteps: [
      'Input current headcount, historical attrition, and growth revenue plan.',
      'Model hiring lead-time lags by role family.',
      'Trigger requisitions ahead of capacity cliffs.',
    ],
    sampleRun: {
      inputs: '65 FTEs, 12% attrition, +40% delivery demand in Q3',
      output: 'Need 9 net hires · Start recruiting 45 days earlier for Senior Ops',
    },
    useCase: {
      role: 'CEO & People Lead',
      scenario: 'Repeatedly hiring customer success staff 2 months after churn spikes.',
      outcome: 'Aligned hiring triggers to pipeline milestones, eliminating capacity crunch.',
    },
  },
  A22: {
    cadence: 'Bi-Annual',
    howItWorks:
      'Scores bench depth and single-point-of-failure risk for every critical leadership and specialist seat.',
    playbookSteps: [
      'Identify critical roles and list ready-now / ready-in-12m successors.',
      'Flag roles with zero identified backup.',
      'Assign stretch assignments to build bench coverage.',
    ],
    sampleRun: {
      inputs: '14 critical roles evaluated for successor readiness',
      output: 'Bench Coverage: 64% · 3 Single-Point-of-Failure seats flagged',
    },
    useCase: {
      role: 'Board / CEO',
      scenario: 'Key-person risk in Head of Finance and Lead Architect ahead of institutional due diligence.',
      outcome: 'Cross-trained deputies and documented playbooks, passing diligence cleanly.',
    },
  },
  A07: {
    cadence: 'Monthly',
    howItWorks:
      'Calculates revenue per FTE, human capital ROI, ramp time, and regrettable attrition trends.',
    playbookSteps: [
      'Enter payroll, revenue, and headcount movement figures.',
      'Track Human Capital ROI and ramp efficiency over time.',
      'Spot productivity dilution early during rapid hiring.',
    ],
    sampleRun: {
      inputs: '78 FTEs, $14.2M ARR, $6.8M total people cost',
      output: 'HC ROI: 2.09x · Revenue/FTE: $182k · Ramp time: 4.2 months',
    },
    useCase: {
      role: 'CFO & CHRO',
      scenario: 'Headcount growing faster than revenue without visibility into productivity.',
      outcome: 'Paused non-core hiring and improved onboarding to cut ramp time by 3 weeks.',
    },
  },
  A09: {
    cadence: 'Bi-Annual',
    howItWorks:
      'Maps talent across a calibrated 9-Box Performance × Potential matrix to differentiate retention, promotion, and coaching investments.',
    playbookSteps: [
      'Calibrate performance and growth potential ratings across managers.',
      'Review distribution across the 9 boxes to prevent rating inflation.',
      'Assign tailored retention and coaching plans per segment.',
    ],
    sampleRun: {
      inputs: '48 managers & senior ICs calibrated',
      output: '8 High-Potential Stars identified · 4 Misaligned Roles flagged for coaching',
    },
    useCase: {
      role: 'Leadership Team',
      scenario: 'Top performers leaving due to flat, undifferentiated compensation and growth paths.',
      outcome: 'Retained 100% of top-box talent over the next 12 months.',
    },
  },
  A11: {
    cadence: 'Quarterly',
    howItWorks:
      'Computes eNPS and engagement drivers while automatically suppressing cohorts below minimum anonymity thresholds.',
    playbookSteps: [
      'Collect short pulse responses across teams.',
      'Review eNPS and top driver correlations (with small-team privacy protection).',
      'Act on the lowest-scoring driver per division.',
    ],
    sampleRun: {
      inputs: '112 responses across 6 teams (min cohort size: 5)',
      output: 'eNPS: +34 · 1 team (<5) suppressed · Top drag: Cross-team clarity',
    },
    useCase: {
      role: 'People Partner',
      scenario: 'Running pulse checks in small teams without exposing individual respondents.',
      outcome: 'Preserved trust via automatic suppression while pinpointing clarity friction.',
    },
  },
  A15: {
    cadence: 'Bi-Annual',
    howItWorks:
      'Measures net training/enablement return by comparing program spend against post-training productivity or retention lift.',
    playbookSteps: [
      'Log training program cost, hours, and target performance KPI.',
      'Measure pre/post KPI lift 90 days after completion.',
      'Cut low-ROI workshops and double down on high-impact coaching.',
    ],
    sampleRun: {
      inputs: '$48k Sales Enablement vs. +18% win-rate lift',
      output: 'Program ROI: +310% · Payback period: 2.4 months',
    },
    useCase: {
      role: 'L&D / Finance',
      scenario: 'Defending enablement budget during cost-discipline review.',
      outcome: 'Proved 3.1x return on deal-coaching while cutting generic vendor courses.',
    },
  },
  A23: {
    cadence: 'Annual',
    howItWorks:
      'Triangulates self, peer, manager, and direct-report ratings to reveal blind spots and hidden strengths.',
    playbookSteps: [
      'Collect structured 360 behavioral feedback around core competencies.',
      'Compare self-ratings vs. peer/report averages.',
      'Build focused 90-day leadership coaching goals.',
    ],
    sampleRun: {
      inputs: '12 leaders reviewed with 6–8 raters each',
      output: 'Avg blind-spot delta: -0.9 on "Delegation" across newly promoted leads',
    },
    useCase: {
      role: 'Executive Coach / HR',
      scenario: 'Technical leads struggling after promotion into people-management roles.',
      outcome: 'Targeted delegation coaching lifted team autonomy scores by 24%.',
    },
  },
  A25: {
    cadence: 'Bi-Annual',
    howItWorks:
      'Evaluates candidate readiness against target role competencies, surfacing exact transition milestones needed before promotion.',
    playbookSteps: [
      'Select candidate and target next-level role profile.',
      'Score current evidence across required leadership competencies.',
      'Assign 1–2 stretch projects to close readiness gaps.',
    ],
    sampleRun: {
      inputs: 'Senior Ops Manager evaluated for Director of Operations',
      output: '81% Ready · Gap: P&L ownership experience (assign Q3 budget lead)',
    },
    useCase: {
      role: 'COO / HR',
      scenario: 'Deciding whether to promote internally or hire externally for a Director seat.',
      outcome: 'Closed the P&L gap in 4 months and promoted internally, saving $35k in recruiting.',
    },
  },
  R02: {
    cadence: 'Weekly',
    howItWorks:
      'Applies Little’s Law (WIP = Throughput × Cycle Time) to check flow consistency and expose hidden work-in-progress congestion.',
    playbookSteps: [
      'Record weekly WIP count, completed throughput, and median cycle time.',
      'Check Little’s Law balance to verify whether WIP is inflating lead times.',
      'Cap WIP limits where cycle time diverges from throughput.',
    ],
    sampleRun: {
      inputs: 'WIP: 42 items, Throughput: 7/wk, Avg Cycle: 6.1 wks',
      output: 'WIP overload detected (+40% above optimal) · Reducing WIP to 28 cuts cycle to 4 wks',
    },
    useCase: {
      role: 'VP Delivery',
      scenario: 'Teams working overtime yet client deliveries keep slipping.',
      outcome: 'Enforced WIP limits, cutting average delivery cycle time by 34% in 5 weeks.',
    },
    linkedPlaybookId: 'delivery-health',
  },
  R03: {
    cadence: 'Weekly',
    howItWorks:
      'Computes Statistical Process Control (XmR) Individuals & Moving Range limits to separate real process drift from normal week-to-week noise.',
    playbookSteps: [
      'Plot weekly operational KPI (e.g., ticket resolution time, defect rate).',
      'Inspect Upper/Lower Natural Process Limits and 8-point run rules.',
      'Investigate only true special-cause signals rather than reacting to noise.',
    ],
    sampleRun: {
      inputs: '16 weeks of SLA resolution times (mean 14.2h)',
      output: 'UNPL: 21.8h · Week 14–16 run signal flagged early drift (+22%)',
    },
    useCase: {
      role: 'Operations Director',
      scenario: 'Leadership overreacting to normal weekly fluctuations in support volume.',
      outcome: 'Eliminated false alarms and caught genuine system drift 3 weeks earlier.',
    },
    linkedPlaybookId: 'delivery-health',
  },
  R06: {
    cadence: 'Weekly',
    howItWorks:
      'Maps upstream/downstream dependencies across teams, highlighting critical-path blockers and cascading slip risk.',
    playbookSteps: [
      'Register cross-team deliverables and upstream dependencies.',
      'Identify nodes blocking ≥ 2 downstream workstreams.',
      'Escalate and clear critical-path blockers first.',
    ],
    sampleRun: {
      inputs: '22 deliverables, 31 cross-team links',
      output: 'API Auth v2 blocks 4 downstream launches (7-day buffer remaining)',
    },
    useCase: {
      role: 'Program Manager',
      scenario: 'Product launch slipping repeatedly due to uncoordinated legal, security, and eng dependencies.',
      outcome: 'Cleared top 2 dependency bottlenecks and hit launch date on schedule.',
    },
    linkedPlaybookId: 'operating-rhythm',
  },
  R05: {
    cadence: 'Weekly',
    howItWorks:
      'Compares committed workload hours against net available capacity per role/team to expose overload (>90%) and idle slack.',
    playbookSteps: [
      'Enter team net capacity (excluding meetings/leave) and committed project hours.',
      'Flag teams above 90% utilization where burnout and delays spike.',
      'Rebalance work or defer low-priority tasks.',
    ],
    sampleRun: {
      inputs: '5 delivery squads (1,680 net hrs/wk)',
      output: 'Platform Squad at 114% load · Data Squad at 68% · Rebalance 180 hrs',
    },
    useCase: {
      role: 'Resource Manager',
      scenario: 'Senior engineers burning out while adjacent squads have spare capacity.',
      outcome: 'Rebalanced backlog across squads, lifting sprint predictability to 91%.',
    },
  },
  P14: {
    cadence: 'Monthly',
    howItWorks:
      'Identifies the single constraining step in a multi-stage workflow and models throughput gain from elevating that constraint (Theory of Constraints).',
    playbookSteps: [
      'Measure cycle time, wait time, and queue depth at each workflow stage.',
      'Pinpoint the stage with longest wait-to-touch ratio.',
      'Focus process improvement solely on that constraint.',
    ],
    sampleRun: {
      inputs: '5-stage client onboarding workflow (21 days total)',
      output: 'Constraint: Security Questionnaire Review (9.5 days wait time, 45% of total)',
    },
    useCase: {
      role: 'Head of Customer Ops',
      scenario: 'Trying to speed up onboarding by tweaking every step equally.',
      outcome: 'Templatized security review and cut total onboarding from 21 days to 11 days.',
    },
    linkedPlaybookId: 'operating-rhythm',
  },
  R25: {
    cadence: 'Per Incident',
    howItWorks:
      'Structures 5-Whys and Ishikawa (Fishbone) cause trees across People, Process, Tech, and Policy to isolate systemic root causes.',
    playbookSteps: [
      'Define the recurring operational failure and quantifiable impact.',
      'Trace contributing factors through structured 5-Whys branches.',
      'Assign permanent systemic controls rather than one-off patches.',
    ],
    sampleRun: {
      inputs: '3 consecutive billing reconciliation failures',
      output: 'Root Cause: Manual CSV export schema mismatch (no automated check)',
    },
    useCase: {
      role: 'Finance Ops Lead',
      scenario: 'Same month-end reconciliation error recurring every quarter.',
      outcome: 'Added schema validation gate, reducing month-end close by 3 days.',
    },
  },
  S05: {
    cadence: 'Quarterly',
    howItWorks:
      'Audits recurring meeting load, decision yield per meeting hour, and cadence alignment (Daily/Weekly/Monthly/Quarterly).',
    playbookSteps: [
      'Inventory recurring leadership and team meetings with attendee hours.',
      'Score each meeting on explicit decisions produced vs. status updates.',
      'Consolidate status meetings into async updates and tighten decision cadences.',
    ],
    sampleRun: {
      inputs: '14 recurring meetings (186 leadership hrs/month)',
      output: '42% pure status-readout · Consolidating reclaims 78 hrs/month',
    },
    useCase: {
      role: 'COO',
      scenario: 'Executives spending 25+ hours/week in meetings with zero execution time left.',
      outcome: 'Reclaimed 78 executive hours/month while improving decision throughput.',
    },
    linkedPlaybookId: 'operating-rhythm',
  },
  P10: {
    cadence: 'Monthly',
    howItWorks:
      'Tracks output per unit cost, rework ratio, and first-time-right quality across operational teams.',
    playbookSteps: [
      'Enter completed output volume, rework count, and unit hours/cost.',
      'Inspect first-time-right yield vs. cost-per-unit trend.',
      'Eliminate rework loops eroding margin.',
    ],
    sampleRun: {
      inputs: '140 deliverables/month, 24 rework cycles',
      output: 'First-Time-Right: 82.8% · Rework consumes 14% of total capacity',
    },
    useCase: {
      role: 'Delivery Director',
      scenario: 'Margins shrinking despite higher team output volume.',
      outcome: 'Added pre-delivery QA checklist, lifting First-Time-Right to 95%.',
    },
  },
  Q39: {
    cadence: 'Bi-Annual',
    howItWorks:
      'Applies graph-centrality analysis to collaboration patterns to spot isolated silos and single-person information bridges.',
    playbookSteps: [
      'Map frequent cross-team collaboration links between key roles.',
      'Identify bridge nodes whose absence disconnects whole groups.',
      'Broaden cross-team pairing to eliminate structural bottlenecks.',
    ],
    sampleRun: {
      inputs: '28 nodes, 64 cross-team collaboration edges',
      output: '1 Critical Bridge (Lead Architect) · Absence disconnects Product & Infra',
    },
    useCase: {
      role: 'VP Engineering',
      scenario: 'Everything grinding to a halt whenever one senior architect takes leave.',
      outcome: 'Paired 2 staff engineers into architecture reviews, removing the single point of failure.',
    },
  },
  P24: {
    cadence: 'Annual / Quarterly',
    howItWorks:
      'Computes Total Cost of Ownership (licenses + integration + maintenance) against verified productivity/revenue impact.',
    playbookSteps: [
      'List software/tech stack items with license, admin, and integration costs.',
      'Score active utilization and verified business value.',
      'Retire overlapping or low-ROI subscriptions.',
    ],
    sampleRun: {
      inputs: '22 SaaS & internal systems ($410k/yr TCO)',
      output: '$68k/yr redundant overlap identified across 4 underutilized licenses',
    },
    useCase: {
      role: 'IT & Finance Lead',
      scenario: 'SaaS spend ballooning 45% YoY with duplicate analytics and project trackers.',
      outcome: 'Consolidated 4 overlapping subscriptions, saving $68k annually.',
    },
  },
  P25: {
    cadence: 'Quarterly',
    howItWorks:
      'Measures conversion, cycle time, and kill-rate across Ideation → Validation → Pilot → Scale stages.',
    playbookSteps: [
      'Log active experiments and pilots by funnel stage.',
      'Check stage conversion rates and zombie pilots stuck in validation.',
      'Graduate winners or kill stalled pilots cleanly.',
    ],
    sampleRun: {
      inputs: '15 experiments across 4 stages',
      output: '4 zombie pilots (>90 days in Pilot) flagged · Scale conversion: 20%',
    },
    useCase: {
      role: 'Head of Innovation',
      scenario: 'Dozens of "pilots" running indefinitely without scaling or shutting down.',
      outcome: 'Retired 4 stalled pilots and reallocated budget to 2 proven revenue winners.',
    },
  },
  R26: {
    cadence: 'Monthly',
    howItWorks:
      'Audits completeness, timeliness, uniqueness, and schema validity across core operational and financial datasets.',
    playbookSteps: [
      'Score core datasets (CRM, ERP, HRIS) on completeness, freshness, and duplicates.',
      'Quantify decision risk from stale or missing fields.',
      'Fix upstream capture rules at the source.',
    ],
    sampleRun: {
      inputs: '4 core tables (CRM Pipeline, AR Ledger, Time Tracking, HRIS)',
      output: 'Overall Data Quality: 76% · CRM close-date completeness at 58%',
    },
    useCase: {
      role: 'RevOps Manager',
      scenario: 'Board reports showing conflicting ARR numbers across CRM and billing.',
      outcome: 'Enforced required CRM close-date & ID mapping, lifting trust to 97%.',
    },
  },
  F01: {
    cadence: 'Monthly',
    howItWorks:
      'Computes liquidity (Current/Quick), leverage, profitability, and working-capital efficiency ratios with strict input validation.',
    playbookSteps: [
      'Enter balance sheet and P&L period totals.',
      'Inspect liquidity buffer, DSO/DPO cash conversion cycle, and margin trends.',
      'Flag covenant or working-capital pressure early.',
    ],
    sampleRun: {
      inputs: 'Q3 P&L & Balance Sheet ($1.8M Cash, $950k Current Liabilities)',
      output: 'Current Ratio: 1.89 · Cash Conversion Cycle: 38 days · Gross Margin: 64.2%',
    },
    useCase: {
      role: 'CFO / Controller',
      scenario: 'Fast revenue growth masking tightening working capital from slow enterprise receivables.',
      outcome: 'Tightened net-30 enforcement, freeing $240k in trapped working capital.',
    },
  },
  F02: {
    cadence: 'Weekly',
    howItWorks:
      'Models direct weekly cash inflows and outflows over 13 weeks, pinpointing exact trough week, minimum cash balance, and runway.',
    playbookSteps: [
      'Enter opening cash, weekly AR collections, payroll, vendor, and tax outflows.',
      'Inspect the 13-week curve for low-point cash trough.',
      'Time collections or defer discretionary spend ahead of trough weeks.',
    ],
    sampleRun: {
      inputs: '$620k opening cash + 13 weeks of AR/AP schedules',
      output: 'Low Point: Week 8 ($184k) · Ending Week 13 Balance: $410k',
    },
    useCase: {
      role: 'Founder / CFO',
      scenario: 'Navigating lumpy enterprise collections against bi-weekly payroll.',
      outcome: 'Spotted Week 8 trough 6 weeks ahead and accelerated two invoice milestones.',
    },
    linkedPlaybookId: 'cash-spend',
  },
  F03: {
    cadence: 'Monthly',
    howItWorks:
      'Decomposes Return on Equity / Operating Profit using DuPont driver trees (Margin × Asset Turnover × Leverage) to show which lever moves the needle most.',
    playbookSteps: [
      'Input revenue, operating cost, assets, and equity figures.',
      'Inspect sensitivity of ROE to a +1% margin vs. +1% turnover improvement.',
      'Focus operational initiatives on the highest-leverage driver.',
    ],
    sampleRun: {
      inputs: '$12M Revenue, 14% Net Margin, 1.4x Asset Turnover',
      output: 'ROE: 23.5% · Margin +1% yields +1.7% ROE (2.2x stronger than turnover)',
    },
    useCase: {
      role: 'CEO & CFO',
      scenario: 'Debating whether to push top-line volume discounts or protect gross margin.',
      outcome: 'Proved margin preservation outperformed volume discounting 2.2x on ROE.',
    },
  },
  F04: {
    cadence: 'Monthly',
    howItWorks:
      'Applies Pareto (80/20) concentration analysis and MoM growth velocity across cost categories to highlight the vital few spend drivers.',
    playbookSteps: [
      'Import monthly expense lines by vendor or cost center.',
      'Inspect top-20% categories driving 80% of spend plus fastest-growing lines.',
      'Renegotiate or cap high-velocity categories.',
    ],
    sampleRun: {
      inputs: '46 expense lines ($420k monthly burn)',
      output: '7 lines drive 79% of burn · Cloud Compute growing +18% MoM',
    },
    useCase: {
      role: 'VP Finance',
      scenario: 'Operating burn creeping up 15% over two quarters without clear visibility.',
      outcome: 'Right-sized cloud instances and vendor retainers, cutting $38k/month.',
    },
    linkedPlaybookId: 'cash-spend',
  },
  F05: {
    cadence: 'Quarterly / Pre-Raise',
    howItWorks:
      'Runs Discounted Cash Flow (DCF) valuation with explicit WACC, terminal growth rate, and sensitivity grid across discount and growth assumptions.',
    playbookSteps: [
      'Enter 5-year free cash flow projections, WACC, and terminal growth rate.',
      'Inspect Enterprise Value and sensitivity matrix across ±1.5% WACC.',
      'Identify which value drivers raise valuation most ahead of fundraising or M&A.',
    ],
    sampleRun: {
      inputs: '5-yr FCF ($450k → $1.9M), 11% WACC, 2.5% terminal growth',
      output: 'Implied EV: $18.4M (Range: $15.1M – $22.8M across sensitivity grid)',
    },
    useCase: {
      role: 'Founder / M&A Advisor',
      scenario: 'Preparing defensible valuation range ahead of strategic acquisition talks.',
      outcome: 'Entered negotiations with auditable DCF model, defending a 22% higher multiple.',
    },
  },
  F07: {
    cadence: 'Annual',
    howItWorks:
      'Benchmarks FP&A, close speed, controls, and cash forecasting maturity across 5 institutional stages.',
    playbookSteps: [
      'Score current finance processes (close days, forecast accuracy, controls).',
      'Identify lowest-maturity bottlenecks ahead of audit or growth.',
      'Sequence 90-day finance upgrade roadmap.',
    ],
    sampleRun: {
      inputs: '6 finance capability domains scored',
      output: 'Overall Maturity: 2.8 / 5.0 · Close Speed (14 days) lags best practice',
    },
    useCase: {
      role: 'Incoming Fractional CFO',
      scenario: 'First 30 days diagnostic for a scaling $15M company preparing for audit.',
      outcome: 'Prioritized chart-of-accounts cleanup and cut close from 14 days to 6 days.',
    },
  },
  Q15: {
    cadence: 'Weekly / Monthly',
    howItWorks:
      'Tracks Key Risk Indicators against green/amber/red thresholds and calculates linear velocity to breach.',
    playbookSteps: [
      'Define leading KRIs with amber warning and red breach thresholds.',
      'Update recent period readings to compute trend velocity.',
      'Trigger pre-agreed mitigations before red breach occurs.',
    ],
    sampleRun: {
      inputs: '8 KRIs (Churn Velocity, Cash Buffer, Key-Staff Turnover, SLA)',
      output: '2 Amber Warnings · Cash Buffer projected to breach threshold in 4.5 weeks',
    },
    useCase: {
      role: 'Chief Risk Officer',
      scenario: 'Risk reviews happening only after losses have already materialized.',
      outcome: 'Triggered early mitigation 4 weeks ahead of a major client concentration breach.',
    },
  },
  Q43: {
    cadence: 'Monthly',
    howItWorks:
      'Applies ISO 31000 inherent vs. residual risk scoring (Likelihood × Impact), owner assignment, and appetite tolerance checks.',
    playbookSteps: [
      'Log enterprise risks with inherent score, active controls, and residual score.',
      'Filter risks exceeding board-approved risk appetite.',
      'Track control effectiveness and mitigation due dates.',
    ],
    sampleRun: {
      inputs: '22 enterprise risks across Cyber, Ops, Regulatory, and Financial',
      output: '4 Residual Risks above Appetite · 2 overdue control verifications',
    },
    useCase: {
      role: 'Audit Committee Chair',
      scenario: 'Static spreadsheet risk register ignored between annual board meetings.',
      outcome: 'Moved to live monthly appetite tracking with 100% owner accountability.',
    },
  },
  Q86: {
    cadence: 'Annual',
    howItWorks:
      'Performs ISO 22301 Business Impact Analysis, comparing Recovery Time Objectives (RTO) and Recovery Point Objectives (RPO) against tested backup capability.',
    playbookSteps: [
      'List critical business processes with hourly downtime cost and target RTO/RPO.',
      'Compare target RTO against actual tested recovery times.',
      'Close recovery gaps on Tier-1 revenue processes.',
    ],
    sampleRun: {
      inputs: '9 critical processes · Payment Gateway RTO target: 2h',
      output: '3 RTO Gaps detected · Billing failover currently takes 9h vs 2h target',
    },
    useCase: {
      role: 'VP Infrastructure & Risk',
      scenario: 'Enterprise client requiring ISO 22301 continuity evidence before contract signing.',
      outcome: 'Closed billing failover gap and passed enterprise vendor security review.',
    },
  },
  X02: {
    cadence: 'Quarterly',
    howItWorks:
      'Assesses NIST/ISO 27001 control posture across Identity, Endpoint, Data, Cloud, and Incident Response domains.',
    playbookSteps: [
      'Score control implementation and verification evidence per domain.',
      'Identify high-impact exposures (e.g., missing MFA, unencrypted backups).',
      'Generate prioritized remediation sprint.',
    ],
    sampleRun: {
      inputs: '24 security controls across 5 domains',
      output: 'Posture Score: 74% · Critical gap: Privileged admin MFA enforcement',
    },
    useCase: {
      role: 'CISO / CTO',
      scenario: 'Preparing for SOC 2 Type II readiness without hiring a full-time compliance team.',
      outcome: 'Closed top 4 control gaps in 30 days and passed readiness assessment.',
    },
  },
  X06: {
    cadence: 'Bi-Annual',
    howItWorks:
      'Evaluates organizational shock-absorption capacity across supply chain, liquidity, leadership depth, and operational redundancy.',
    playbookSteps: [
      'Score single-source dependencies across suppliers, systems, and key staff.',
      'Stress-test combined shock scenarios.',
      'Build redundancy buffers on fragile nodes.',
    ],
    sampleRun: {
      inputs: '5 resilience pillars stressed against 30-day supplier outage',
      output: 'Resilience Index: 66/100 · Single cloud region & 1 payment processor flagged',
    },
    useCase: {
      role: 'COO / Board',
      scenario: 'Board requesting stress-test evidence after sector-wide vendor outage.',
      outcome: 'Added secondary payment rail and documented 4-hour failover runbook.',
    },
  },
  Q99: {
    cadence: 'Annual',
    howItWorks:
      'Assesses board oversight, decision rights, internal audit independence, and reporting transparency against recognized governance principles.',
    playbookSteps: [
      'Score governance practices with supporting policy/minutes evidence.',
      'Highlight gaps between formal charter and actual practice.',
      'Present action plan to Governance & Nominations Committee.',
    ],
    sampleRun: {
      inputs: '18 governance principles assessed with evidence links',
      output: 'Governance Score: 81% · Gap: Related-party conflict log update cadence',
    },
    useCase: {
      role: 'Company Secretary / Board',
      scenario: 'Pre-IPO or institutional investment governance readiness check.',
      outcome: 'Resolved 3 governance documentation gaps ahead of investor diligence.',
    },
  },
  Q76: {
    cadence: 'Monthly',
    howItWorks:
      'Tracks contractual, regulatory, and board commitments with renewal windows, penalty exposure, and owner sign-off.',
    playbookSteps: [
      'Register all material customer SLAs, debt covenants, and regulatory filings.',
      'Monitor upcoming 60-day obligation deadlines.',
      'Verify evidence of fulfillment before due dates.',
    ],
    sampleRun: {
      inputs: '34 active commitments & debt covenants',
      output: '3 deadlines within 30 days · 1 auto-renewal notice window closing Friday',
    },
    useCase: {
      role: 'General Counsel / Finance',
      scenario: 'Missing vendor auto-renewal cancellation windows and covenant reporting dates.',
      outcome: 'Avoided $92k unwanted SaaS auto-renewal and maintained 100% on-time filings.',
    },
  },
  X04: {
    cadence: 'Quarterly',
    howItWorks:
      'Maps applicable regulatory obligations to active controls, calculating compliance coverage and unmitigated exposure.',
    playbookSteps: [
      'Select applicable regulatory frameworks (GDPR, ISO, sector rules).',
      'Map control evidence to each requirement.',
      'Prioritize remediation of unmapped or partial obligations.',
    ],
    sampleRun: {
      inputs: '42 regulatory obligations mapped',
      output: '88% Compliant · 5 partial gaps in Data Retention & DPA tracking',
    },
    useCase: {
      role: 'Compliance Lead',
      scenario: 'Expanding into EU/UK enterprise accounts requiring GDPR/DPA proof.',
      outcome: 'Closed 5 retention gaps and shortened enterprise legal review by 3 weeks.',
    },
  },
  X05: {
    cadence: 'Annual',
    howItWorks:
      'Evaluates ethics policy awareness, whistleblower channel trust, and conflict-of-interest disclosure completeness.',
    playbookSteps: [
      'Review policy attestation rates and anonymous channel health.',
      'Check conflict disclosures across procurement and leadership.',
      'Close attestation and training gaps.',
    ],
    sampleRun: {
      inputs: '94% staff attestation, 100% leadership conflict disclosures',
      output: 'Integrity Index: 92% · Flagged: 6% contractor onboarding attestation lag',
    },
    useCase: {
      role: 'Compliance / HR',
      scenario: 'Ensuring third-party contractors adhere to the same anti-bribery standards as staff.',
      outcome: 'Closed contractor onboarding gap to 100% attestation.',
    },
  },
  F06: {
    cadence: 'Quarterly',
    howItWorks:
      'Tests segregation of duties (maker-checker), approval thresholds, and reconciliation timeliness across cash and procurement.',
    playbookSteps: [
      'Audit approval chains for payments, payroll, and vendor creation.',
      'Flag any role holding both creation and approval rights.',
      'Enforce dual-control limits.',
    ],
    sampleRun: {
      inputs: '8 financial workflows audited',
      output: '2 Segregation of Duties conflicts found in AP vendor creation',
    },
    useCase: {
      role: 'External Audit / CFO',
      scenario: 'Small finance team where one controller can both add vendors and approve wires.',
      outcome: 'Separated vendor master approval from payment release, satisfying audit.',
    },
  },
  C08: {
    cadence: 'Per Transformation',
    howItWorks:
      'Measures Awareness, Desire, Knowledge, Ability, and Reinforcement (ADKAR) across each affected stakeholder group to pinpoint the exact stall point.',
    playbookSteps: [
      'Survey affected teams across the 5 change-readiness dimensions.',
      'Locate the weakest dimension per group (the barrier point).',
      'Tailor interventions to that exact barrier rather than generic comms.',
    ],
    sampleRun: {
      inputs: '4 affected departments scored across 5 readiness stages',
      output: 'Ops Team stalled at Ability (41%) · Sales stalled at Desire (46%)',
    },
    useCase: {
      role: 'VP Transformation',
      scenario: 'New operating system rollout failing despite dozens of town-hall emails.',
      outcome: 'Shifted from emails to hands-on Ops workshops, lifting adoption from 38% to 86%.',
    },
  },
  Z06: {
    cadence: 'Monthly',
    howItWorks:
      'Tracks transformation workstreams across milestone completion, benefit realization, and cross-workstream risk.',
    playbookSteps: [
      'Register transformation workstreams, milestones, and target value.',
      'Review monthly variance and red/amber dependencies.',
      'Intervene on drifting milestones before value erodes.',
    ],
    sampleRun: {
      inputs: '6 transformation workstreams ($1.6M target EBITDA lift)',
      output: '74% milestones on track · Supply Chain workstream 3 weeks behind',
    },
    useCase: {
      role: 'Transformation Director',
      scenario: 'Post-merger integration tracking 6 workstreams across two legacy companies.',
      outcome: 'Delivered 94% of Year-1 synergy targets on schedule.',
    },
  },
  Z01: {
    cadence: 'Quarterly',
    howItWorks:
      'Scores growth opportunities across the 3 Horizons (H1 Core, H2 Emerging, H3 Transformational) to prevent over-indexing on distant bets or neglecting core.',
    playbookSteps: [
      'List growth opportunities with investment cost, risk, and 3-Horizon classification.',
      'Inspect portfolio split against recommended 70/20/10 balance.',
      'Rebalance bets to protect H1 cash flow while seeding H2.',
    ],
    sampleRun: {
      inputs: '10 growth bets ($1.5M total growth budget)',
      output: 'Split: 45% H1 / 20% H2 / 35% H3 (Over-exposed to H3 speculative bets)',
    },
    useCase: {
      role: 'CEO / Strategy Lead',
      scenario: 'Core product starving while engineering chases 3 speculative moonshots.',
      outcome: 'Rebalanced to 65/25/10, accelerating H1 upsell revenue by 22%.',
    },
    linkedPlaybookId: 'growth-review',
  },
  G03: {
    cadence: 'Quarterly',
    howItWorks:
      'Evaluates Ansoff / Growth Pathways (Market Penetration, Expansion, New Product, Diversification) against available capital and operational capacity.',
    playbookSteps: [
      'Score candidate growth pathways on attractiveness and capability fit.',
      'Sequence pathways into Wave 1, Wave 2, and Wave 3.',
      'Fund Wave 1 fully before opening Wave 2.',
    ],
    sampleRun: {
      inputs: '4 growth pathways evaluated against current team capacity',
      output: 'Wave 1: Existing-Account Expansion (Score 88) · Wave 2: UK Vertical Entry',
    },
    useCase: {
      role: 'VP Growth',
      scenario: 'Trying to launch two new countries and two new products simultaneously.',
      outcome: 'Sequenced Waves 1–2 cleanly, hitting ARR target with 30% less CAC.',
    },
    linkedPlaybookId: 'growth-review',
  },
  G07: {
    cadence: 'Pre-Launch',
    howItWorks:
      'Stress-tests growth targets against required sales capacity, working capital burn, and delivery headcount to expose infeasible plans early.',
    playbookSteps: [
      'Enter target ARR growth, CAC payback, sales cycle, and delivery ratio.',
      'Run feasibility check on peak cash burn and hiring velocity.',
      'Adjust pacing or financing before committing.',
    ],
    sampleRun: {
      inputs: '+80% ARR target with 14-month CAC payback',
      output: 'Feasibility Warning: Requires +$1.1M working capital bridge in Q3',
    },
    useCase: {
      role: 'Founder & CFO',
      scenario: 'Board pushing for 2x growth plan without modeling cash-collection lag.',
      outcome: 'Adjusted growth pacing to +55% self-funded, avoiding emergency dilution.',
    },
  },
  G04: {
    cadence: 'Bi-Annual',
    howItWorks:
      'Prioritizes legacy system, process, and automation upgrades by business impact vs. implementation complexity.',
    playbookSteps: [
      'Inventory manual bottlenecks and legacy systems.',
      'Score replacement impact, migration risk, and payback period.',
      'Sequence quick wins ahead of core platform swaps.',
    ],
    sampleRun: {
      inputs: '9 modernisation candidates scored',
      output: 'Quick Win #1: Automated Billing Reconciliation (2-mo payback)',
    },
    useCase: {
      role: 'CTO / COO',
      scenario: 'Modernising 10-year-old operations stack without halting daily fulfillment.',
      outcome: 'Delivered 3 high-ROI automations in Q1 while staging core ERP swap safely.',
    },
  },
  G06: {
    cadence: 'Annual',
    howItWorks:
      'Assesses digital capability across Data, Workflow Automation, Customer Experience, and Decision Intelligence.',
    playbookSteps: [
      'Score 4 digital pillars from Level 1 (Manual) to Level 5 (Adaptive).',
      'Benchmark against target operating tier.',
      'Fund highest-leverage capability upgrades.',
    ],
    sampleRun: {
      inputs: '4 digital capability pillars evaluated',
      output: 'Digital Maturity: 2.6 / 5.0 · Workflow Automation (1.8) lags Customer UX (3.4)',
    },
    useCase: {
      role: 'Managing Partner',
      scenario: 'Sleek client portal backed by spreadsheets and manual email approvals internally.',
      outcome: 'Targeted internal workflow automation, cutting fulfillment cost by 19%.',
    },
  },
  'ADV-01': {
    cadence: 'Flexible Retainer',
    howItWorks:
      'Matches your organization with vetted Fractional CFOs, COOs, CTOs, or Chief Strategy Officers aligned to your exact industry and stage.',
    playbookSteps: [
      'Define executive mandate, weekly cadence, and 90-day outcomes.',
      'Review vetted fractional partner profiles matched to your workspace context.',
      'Launch structured onboarding inside your LAMID ONE workspace.',
    ],
    sampleRun: {
      inputs: 'Series A SaaS needing Fractional CFO for 12 hrs/wk',
      output: 'Matched within 72h · 90-day scope: 13-week cash + Series B data room',
    },
    useCase: {
      role: 'Founder / CEO',
      scenario: 'Needing seasoned CFO leadership for fundraising without $300k+ full-time overhead.',
      outcome: 'Closed $8M Series B cleanly with institutional-grade financial models.',
    },
  },
  'ADV-02': {
    cadence: 'Per Milestone',
    howItWorks:
      'Locks advisory milestone capital in neutral escrow and releases funds only when explicit acceptance criteria are verified by you.',
    playbookSteps: [
      'Break engagement into clear milestones with measurable acceptance criteria.',
      'Fund milestone into protected escrow before work begins.',
      'Review deliverable and authorize release upon sign-off.',
    ],
    sampleRun: {
      inputs: '3-milestone Supply Chain Turnaround ($45k total)',
      output: 'Milestone 1 Verified & Released ($15k) · Milestones 2–3 Protected in Escrow',
    },
    useCase: {
      role: 'Procurement / Managing Director',
      scenario: 'Burned previously by consulting retainers billing hours with no tangible outputs.',
      outcome: '100% milestone-linked accountability; zero billable-hour disputes.',
    },
  },
  'ADV-03': {
    cadence: 'On Demand',
    howItWorks:
      'Packages your engine calculations, assumptions, and sensitivity models for rapid independent review by a domain specialist before high-stakes commitment.',
    playbookSteps: [
      'Run relevant decision/finance engines (e.g., Q44, F05, Q03).',
      'Request an independent second opinion with full evidence context.',
      'Receive written challenge notes and risk sign-off within 48 hours.',
    ],
    sampleRun: {
      inputs: 'Q44 + F05 Acquisition Package ($4.5M target)',
      output: 'Peer Review flagged 2 working-capital adjustments saving $340k at close',
    },
    useCase: {
      role: 'Board / Investment Committee',
      scenario: 'Validating management’s acquisition model before signing a binding LOI.',
      outcome: 'Identified hidden customer concentration and renegotiated earn-out terms.',
    },
  },
  'ADV-04': {
    cadence: 'Weekly',
    howItWorks:
      'Provides dedicated concierge coordination across workspace setup, engine runs, adviser handoffs, and executive cadence tracking.',
    playbookSteps: [
      'Align quarterly operating calendar and required engine cadences.',
      'Concierge prepares pre-meeting briefs and flags missing inputs.',
      'Leadership spends 100% of review time on decisions, not admin.',
    ],
    sampleRun: {
      inputs: 'Monthly Board & Executive Operating Rhythm',
      output: '100% pre-read completion · 6 engine briefs compiled 48h pre-meeting',
    },
    useCase: {
      role: 'CEO / Chief of Staff',
      scenario: 'Lean leadership team lacking dedicated RevOps/Chief-of-Staff bandwidth.',
      outcome: 'Maintained disciplined weekly/monthly governance with zero added headcount.',
    },
  },
};

export function getEngineGuide(engine: ProductEngineItem): EnginePlaybookAndUseCase {
  return (
    engineGuides[engine.code] || {
      cadence: 'Quarterly',
      howItWorks: engine.computes,
      playbookSteps: [
        'Gather current baseline inputs and evidence from your team.',
        `Run ${engine.code} (${engine.name}) to compute auditable outputs.`,
        'Review findings with owners and record next actions.',
      ],
      sampleRun: {
        inputs: 'Baseline team & operational metrics',
        output: engine.computes,
      },
      useCase: {
        role: 'Executive Lead',
        scenario: engine.purpose,
        outcome: engine.computes,
      },
    }
  );
}

export function getSuiteUseCases(
  suiteId: string,
  engines: ProductEngineItem[],
): SuiteUseCaseCard[] {
  return engines.slice(0, 3).map((engine) => {
    const guide = getEngineGuide(engine);
    return {
      id: `${suiteId}-${engine.code.toLowerCase()}`,
      suiteId,
      engineCode: engine.code,
      engineName: engine.name,
      role: guide.useCase.role,
      title: `${engine.name} in Practice`,
      scenario: guide.useCase.scenario,
      howUsed: guide.howItWorks,
      outcome: guide.useCase.outcome,
    };
  });
}
