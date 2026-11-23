import type { ProductSuiteConfig } from './ProductSuitePage';

export const productSuites: Record<string, ProductSuiteConfig> = {
  strategy: {
    id: 'strategy',
    name: 'Strategy',
    eyebrow: 'Strategic Direction & Initiative Alignment',
    pillar: 'clarity',
    title: 'Fund what creates value, not busywork.',
    lede: 'Stop perfecting existing work that goes nowhere—align every project and dollar to what matters.',
    statement:
      'You cannot out-execute a broken plan. We test every active initiative against your core objectives so you only deploy capital where it produces verified returns.',
    tags: [
      'Core Ideology (Collins & Porras)',
      'ISO 9001 §4.1 Context',
      'Initiative Alignment Matrix',
      'Weighted Criteria Sensitivity',
      'OKR & Execution Review',
      'Operating Model Assessment',
    ],
    clip: 'S01',
    thesis: {
      headline: 'Cut work that adds activity, not impact.',
      description:
        'See which active projects support your board goals and redirect wasted budget before quarters lock.',
    },
    engines: [
      {
        code: 'S01',
        name: 'Purpose & Strategic Direction',
        standard: 'Collins & Porras Core Ideology; ISO 9001 §4.1',
        purpose:
          'Checks that purpose, values, and priorities are clear, shared, and actually used in decisions.',
        computes:
          'Scores answers across 6 anchored dimensions, discounting unevidenced assertions.',
      },
      {
        code: 'S03',
        name: 'Strategy Alignment Matrix',
        standard: 'Kaplan & Norton Strategic Mapping',
        purpose:
          'Links strategic objectives to active work and spend, exposing orphan initiatives.',
        computes:
          'Calculates the proportion of corporate spend allocated to unaligned initiatives.',
      },
      {
        code: 'S09',
        name: 'Strategic Priority Ranking',
        standard: 'Multi-Attribute Utility Theory (MAUT)',
        purpose:
          'Ranks candidate priorities against weighted criteria and tests ranking sensitivity.',
        computes: 'Computes normalized utility scores and determines weight stability thresholds.',
      },
      {
        code: 'S06',
        name: 'OKR & Strategy Execution Review',
        standard: 'Objectives & Key Results (Doerr Methodology)',
        purpose: 'Evaluates execution rhythm, objective progress, and target viability.',
        computes: 'Scores key result confidence and calculates pacing variance against deadlines.',
      },
      {
        code: 'S07',
        name: 'External Environment Scan',
        standard: 'PESTEL Analysis Framework',
        purpose:
          'Evaluates external macro-environmental trends, headwinds, and regulatory changes.',
        computes:
          'Synthesizes market, regulatory, and technology indicators into risk-impact ratings.',
      },
      {
        code: 'C06',
        name: 'Operating Model Review',
        standard: 'Galbraith Star Model',
        purpose:
          'Assesses whether organizational design and structure support the strategic agenda.',
        computes:
          'Scores structural capability alignment across governance, talent, and workflows.',
      },
    ],
    advisoryHighlight: {
      title: 'Fractional Strategy Leadership',
      points: [
        'Stress-test roadmaps with seasoned strategy operators.',
        'Get independent second opinions on M&A and market entry.',
        'Share board-ready decks with full calculation trails.',
      ],
    },
  },

  decisions: {
    id: 'decisions',
    name: 'Decisions',
    eyebrow: 'Decentralized Authority & Decision Rights',
    pillar: 'clarity',
    title: 'Move decisions closer to the work.',
    lede: 'Stop routing every call through the same bottlenecks—give teams clear rights and testable options.',
    statement:
      "When your people don't know who owns a choice, work stalls on your desk. Lock down clear decision rights, score the quality of options before you commit capital, and move from debate to action.",
    tags: [
      'Decision Quality (Matheson & Howard)',
      'Decision Rights Matrix (RACI/DACI)',
      'Bayesian Expected Value',
      'Cost of Delay (WSJF)',
      'Brier Forecast Calibration',
      'Stakeholder Alignment',
    ],
    clip: 'Q44',
    thesis: {
      headline: 'Better decisions, without the approval queue.',
      description:
        'Assign single owners, score option quality upfront, and clear stalled calls before delay costs compound.',
    },
    engines: [
      {
        code: 'Q44',
        name: 'Decision Quality',
        standard: 'Matheson & Howard 6-Chain Decision Quality',
        purpose:
          'Pre-mortem assessment across framing, alternatives, information, values, reasoning, and commitment.',
        computes:
          'Calculates the weakest link in the decision chain before irrevocable capital is committed.',
      },
      {
        code: 'Q02',
        name: 'Decision Register',
        standard: 'Corporate Governance Decision Auditing',
        purpose:
          'Tracks active decisions, missing owners, stalled reviews, and escalation triggers.',
        computes: 'Surfaces overdue choices, decision backlog duration, and accountability gaps.',
      },
      {
        code: 'Q29',
        name: 'Decision Rights Matrix',
        standard: 'DACI / RACI Accountability Framework',
        purpose: 'Maps explicit decision rights across roles, eliminating duplicate vetoes.',
        computes: 'Detects orphaned decisions, ambiguous ownership, and approval congestion.',
      },
      {
        code: 'Q21',
        name: 'Option Comparison',
        standard: 'Weighted Multi-Criteria Decision Analysis',
        purpose: 'Scores alternatives against criteria and calculates winner fragility margins.',
        computes:
          'Computes margin of victory and minimum parameter shifts required to flip the choice.',
      },
      {
        code: 'Q03',
        name: 'Scenarios & Expected Value',
        standard: 'Bayesian Decision Tree Modeling',
        purpose:
          'Evaluates probabilistic branch outcomes and expected value of perfect information.',
        computes: 'Calculates EV across multiple macro futures and EVPI for critical assumptions.',
      },
      {
        code: 'Q05',
        name: 'Decision Timing & Cost of Delay',
        standard: 'Weighted Shortest Job First (Reinertsen WSJF)',
        purpose:
          'Quantifies the economic cost of delay to prioritize choices that burn capital waiting.',
        computes:
          'Ranks initiatives by WSJF score and computes weekly cash cost of deferred action.',
      },
      {
        code: 'Q06',
        name: 'Priority Conflict Check',
        standard: 'Resource Contention Modeling',
        purpose:
          'Surfaces competing resource commitments across active projects before gridlock occurs.',
        computes: 'Identifies over-allocated key personnel and schedule collisions across teams.',
      },
      {
        code: 'Q17',
        name: 'Stakeholder Map',
        standard: 'Power-Interest Grid Analysis',
        purpose: 'Maps stakeholder influence and interest to construct consensus pathways.',
        computes: 'Categorizes key sponsors, blockers, and required communication frequencies.',
      },
      {
        code: 'S08',
        name: 'Force Field Analysis',
        standard: 'Lewin Force Field Framework',
        purpose: 'Weighs driving versus restraining forces to anticipate execution friction.',
        computes:
          'Calculates net driving force momentum and identifies high-leverage resistance points.',
      },
      {
        code: 'Q35',
        name: 'Decision Method Selector',
        standard: 'Cynefin Complexity Framework (Snowden)',
        purpose:
          'Diagnoses domain complexity to choose between heuristic, algorithmic, or emergent methods.',
        computes:
          'Recommends governance protocols matched to Simple, Complicated, Complex, or Chaotic contexts.',
      },
      {
        code: 'Q58',
        name: 'Benefits & After-Action Review',
        standard: 'DoD After-Action Review Protocol',
        purpose:
          'Post-implementation outcome evaluation comparing projected gains with actual results.',
        computes: 'Calculates value realization percentage and isolates assumption variance.',
      },
      {
        code: 'Q27',
        name: 'Forecast Calibration',
        standard: 'Brier Scoring & Calibration Telemetry',
        purpose: 'Measures forecasting accuracy and overconfidence in strategic estimates.',
        computes: 'Calculates mean squared Brier calibration score and overconfidence bias curve.',
      },
    ],
    advisoryHighlight: {
      title: 'Peer Advisory & Independent Review',
      points: [
        'Pressure-test high-stakes calls with outside judgment.',
        'Resolve cross-team priority disputes objectively.',
        'Bring senior decision analysts directly into key reviews.',
      ],
    },
  },

  people: {
    id: 'people',
    name: 'People & Skills',
    eyebrow: 'Workforce Capability & Talent Architecture',
    pillar: 'capability',
    title: 'Build dynamic roles, not static boxes.',
    lede: 'Move skills across teams as priorities shift, close real gaps, and back up critical seats.',
    statement:
      "Software doesn't grow your business; your people do. We give you continuous visibility into workforce skills, cultural health, and succession readiness so you can scale without breaking your culture.",
    tags: [
      'Competency Architecture',
      '9-Box Performance-Potential',
      'Skills Gap Analysis',
      'Succession Bench Strength',
      'Workforce Demand & Supply',
      'eNPS Anonymity Shield',
    ],
    clip: 'A02',
    thesis: {
      headline: 'Match people to what your next stage needs.',
      description:
        'Track role readiness, spot single-point-of-failure seats, and close capability gaps before turnover hits.',
    },
    engines: [
      {
        code: 'A05',
        name: 'Culture & Values Assessment',
        standard: 'Barrett Values & Schein Culture Model',
        purpose:
          'Evaluates cultural coherence, lived operating values, and team psychological safety.',
        computes: 'Scores value congruence and identifies cultural entropy across departments.',
      },
      {
        code: 'A02',
        name: 'Skills Gap Analysis',
        standard: 'ISO 30414 Human Resource Metrics',
        purpose:
          'Compares required and current skills by role and identifies single-person dependencies.',
        computes:
          'Quantifies capability gap percentages and highlights high-risk single points of failure.',
      },
      {
        code: 'A03',
        name: 'Workforce Plan',
        standard: 'Strategic Workforce Planning (CIPD Model)',
        purpose:
          'Forecasts workforce demand versus projected supply to guide hire or develop decisions.',
        computes: 'Models net headcount gaps over 12 to 36 months by job family.',
      },
      {
        code: 'A22',
        name: 'Succession & Bench Strength',
        standard: 'Key Seat Succession Risk Index',
        purpose: 'Measures succession cover and readiness ratios for critical operational seats.',
        computes: 'Calculates bench strength index and emergency successor readiness.',
      },
      {
        code: 'A07',
        name: 'Human Capital Metrics',
        standard: 'Saratoga / PwC HR Benchmark Standards',
        purpose: 'Tracks core human capital productivity metrics including revenue per FTE.',
        computes:
          'Computes voluntary turnover rate, time-to-productivity, and workforce cost ratios.',
      },
      {
        code: 'A09',
        name: 'Performance–Potential Grid',
        standard: 'McKinsey 9-Box Talent Calibration',
        purpose:
          'Calibrates staff on performance and leadership potential for developmental routing.',
        computes:
          'Distributes talent into actionable segments with tailored progression playbooks.',
      },
      {
        code: 'A11',
        name: 'Engagement Survey',
        standard: 'Employee Net Promoter Score (eNPS)',
        purpose:
          'Measures engagement and sentiment while enforcing strict small-team anonymity protection.',
        computes:
          'Computes departmental eNPS scores, automatically suppressing small team data to preserve trust.',
      },
      {
        code: 'A15',
        name: 'Development ROI',
        standard: 'Kirkpatrick 4-Level Evaluation Model',
        purpose:
          'Measures capability uplift and financial business impact from corporate learning programs.',
        computes: 'Calculates cost-benefit ratio and operational performance improvement.',
      },
      {
        code: 'A23',
        name: 'Competency & 360 Review',
        standard: 'Multi-Rater Competency Feedback',
        purpose: 'Synthesizes self, peer, and manager assessments against behavioral rubrics.',
        computes: 'Identifies blind spots and hidden strengths with outlier suppression.',
      },
      {
        code: 'A25',
        name: 'Next-Role Readiness',
        standard: 'Leadership Pipeline Model (Charan)',
        purpose:
          'Evaluates readiness criteria and stretch assignment milestones for upward transitions.',
        computes:
          'Generates role-transition readiness score and identifies required developmental experiences.',
      },
    ],
    advisoryHighlight: {
      title: 'Fractional People Leadership & Coaching',
      points: [
        'Design dynamic role shifts with senior HR executives.',
        'Review succession depth for mission-critical seats.',
        'Keep workforce data protected under NDPR and GDPR.',
      ],
    },
  },

  operations: {
    id: 'operations',
    name: 'Operations',
    eyebrow: 'Operational Flow & Capacity Governance',
    pillar: 'capability',
    title: 'Fix how work flows together.',
    lede: 'Redesign handoffs and clear coordination bottlenecks instead of pushing people to work longer.',
    statement:
      'Pushing more work into a clogged pipeline only delays delivery. We show you the exact constraint throttling your output so you can fix the bottleneck, protect your team, and deliver on time.',
    tags: [
      "Delivery Flow Metrics (Little's Law)",
      'Capacity & Workload Balance',
      'Statistical Process Control (XmR)',
      'Root Cause Analysis (5-Whys)',
      'Collaboration Network Graph',
      'Operating Rhythm',
    ],
    clip: 'R05',
    thesis: {
      headline: 'Remove friction across teams, not just speed up tasks.',
      description:
        'Separate true process drift from normal noise, cap work-in-progress, and rebalance overloaded squads.',
    },
    engines: [
      {
        code: 'R02',
        name: 'Delivery Flow Metrics',
        standard: "Little's Law & Flow Efficiency (Kanban)",
        purpose: 'Measures throughput, cycle time, work in progress (WIP), and flow efficiency.',
        computes:
          'Flags data violating Little’s Law and computes true percentage of active work time.',
      },
      {
        code: 'R03',
        name: 'Drift & Stability Monitor',
        standard: 'Wheeler Process Behavior Charts (XmR)',
        purpose:
          'Monitors operational metrics against natural process limits to detect drift before failure.',
        computes:
          'Computes Upper and Lower Natural Process Limits and flags non-random variation runs.',
      },
      {
        code: 'R06',
        name: 'Dependency Board',
        standard: 'Critical Path Method (CPM)',
        purpose: 'Tracks inter-team and technical dependencies that threaten delivery schedules.',
        computes: 'Identifies critical path blockers and downstream schedule impact.',
      },
      {
        code: 'R05',
        name: 'Workload & Capacity Balance',
        standard: 'Rough-Cut Capacity Planning (RCCP)',
        purpose: 'Compares demand with team capacity and reallocates overload to spare capacity.',
        computes: 'Calculates capacity utilization percentage and recommends work shifts.',
      },
      {
        code: 'P14',
        name: 'Bottleneck & Process Improvement',
        standard: 'Goldratt Theory of Constraints (TOC)',
        purpose:
          'Locates the primary constraint limiting system throughput and models elevation steps.',
        computes:
          'Computes system constraint capacity and throughput gains from bottleneck expansion.',
      },
      {
        code: 'R25',
        name: 'Root Cause Analysis',
        standard: 'Ishikawa & 5-Whys Verification Protocol',
        purpose:
          'Tests candidate causes against empirical evidence to uncover root failure mechanisms.',
        computes:
          'Scores causal candidates by evidential corroboration, filtering out speculative opinions.',
      },
      {
        code: 'S05',
        name: 'Operating Rhythm & Meeting Design',
        standard: 'Operational Cadence & Communication Architecture',
        purpose: 'Audits recurring meetings, operational cadences, and decision turnarounds.',
        computes:
          'Quantifies meeting cost hours, decision latency, and recommends streamlined cadences.',
      },
      {
        code: 'P10',
        name: 'Productivity & Output Metrics',
        standard: 'Value-Add Output Ratios',
        purpose:
          'Measures genuine value-added output against input hours without incentivizing busywork.',
        computes: 'Calculates multifactor productivity indices and trend trajectories.',
      },
      {
        code: 'Q39',
        name: 'Collaboration Network Map',
        standard: 'Organizational Network Analysis (ONA)',
        purpose:
          'Maps communication pathways and identifies personnel whose absence disconnects groups.',
        computes:
          'Computes network betweenness centrality and pinpoints single communication bottlenecks.',
      },
      {
        code: 'P24',
        name: 'Technology ROI & Total Cost',
        standard: 'Total Cost of Ownership (Gartner TCO)',
        purpose: 'Evaluates the fully-loaded cost of technology systems and software application stacks.',
        computes:
          'Calculates 3-year TCO, cost per user, and expected ROI from technology consolidation.',
      },
      {
        code: 'P25',
        name: 'Innovation Funnel',
        standard: 'Stage-Gate Product Innovation Process (Cooper)',
        purpose:
          'Manages candidate initiatives through gating criteria from ideation to commercial rollout.',
        computes: 'Tracks stage-to-stage conversion rates and weighted pipeline value.',
      },
      {
        code: 'R26',
        name: 'Data Quality Check',
        standard: 'DAMA Data Quality Dimensions',
        purpose:
          'Evaluates operational dataset completeness, accuracy, consistency, and timeliness.',
        computes: 'Computes composite data quality index score across key operational registers.',
      },
    ],
    advisoryHighlight: {
      title: 'Fractional COOs & Process Redesign',
      points: [
        'Audit delivery workflows with veteran operations leaders.',
        'Fix cross-team handoffs instead of adding status meetings.',
        'Watch live bottleneck alerts before commitments slip.',
      ],
    },
  },

  finance: {
    id: 'finance',
    name: 'Finance',
    eyebrow: 'Capital Telemetry & Predictive Financial Modeling',
    pillar: 'growth',
    title: 'Measure impact, not just output.',
    lede: 'See your 13-week cash runway and the real drivers behind margin and return on equity.',
    statement:
      'Accounting reports tell you what happened last quarter; you need to know what happens to your cash next month. We model your cash receipts, test stress scenarios, and connect daily operational choices to your bottom line.',
    tags: [
      '13-Week Direct Cash Forecast',
      'DCF Business Valuation',
      'DuPont KPI Driver Tree',
      'Financial Health Ratios',
      'Pareto Spend Concentration',
      'Finance Maturity',
    ],
    clip: 'F02',
    thesis: {
      headline: 'Connect daily choices to cash and margin.',
      description:
        'Spot cash troughs weeks ahead and focus operational effort on the levers that actually lift return on equity.',
    },
    engines: [
      {
        code: 'F01',
        name: 'Financial Health Ratios',
        standard: 'Altman Z-Score & Corporate Ratio Analysis',
        purpose:
          'Comprehensive liquidity, solvency, operating profitability, and asset efficiency ratios.',
        computes:
          'Evaluates financial stability indices and flags early warning insolvency signals.',
      },
      {
        code: 'F02',
        name: 'Rolling Forecast & 13-Week Cash',
        standard: 'Direct Method Treasury Cash Forecasting',
        purpose:
          'Projects weekly cash receipts and disbursements over 13 weeks to identify the exact low point.',
        computes:
          'Identifies minimum cash balance trough, burn rate velocity, and funding buffer needs.',
      },
      {
        code: 'F03',
        name: 'KPI Driver Tree',
        standard: 'DuPont Model Return on Equity Decomposition',
        purpose:
          'Traces return on equity down to net profit margin, asset turnover, and financial leverage.',
        computes: 'Simulates the exact bottom-line impact of operational percentage improvements.',
      },
      {
        code: 'F04',
        name: 'Cost & Spend Analysis',
        standard: 'Pareto 80/20 Expense Concentration',
        purpose:
          'Identifies the few cost lines driving the vast majority of company disbursements.',
        computes: 'Ranks expenditure categories and isolates the fastest-growing cost centers.',
      },
      {
        code: 'F05',
        name: 'Business Valuation',
        standard: 'Discounted Cash Flow (DCF) & WACC Modeling',
        purpose:
          'Calculates intrinsic enterprise and equity valuation using multi-stage cash flow models.',
        computes:
          'Computes Net Present Value, terminal value, and sensitivity tables across discount rates.',
      },
      {
        code: 'F07',
        name: 'Finance Function Maturity',
        standard: 'CPA / Corporate Finance Capability Benchmarking',
        purpose:
          'Benchmarks finance department operations from transaction processing to strategic advisory.',
        computes:
          'Scores finance team maturity across controls, reporting speed, and commercial planning.',
      },
    ],
    advisoryHighlight: {
      title: 'Fractional CFOs & Capital Advisory',
      points: [
        'Verify 13-week cash models with seasoned CFOs.',
        'Prepare investor data rooms backed by live telemetry.',
        'Govern multi-currency treasury and settlement controls.',
      ],
    },
  },

  'risk-governance': {
    id: 'risk-governance',
    name: 'Risk & Governance',
    eyebrow: 'Enterprise Risk Management & Board Oversight',
    pillar: 'consistency',
    title: 'Give teams freedom inside clear limits.',
    lede: 'Spot early warning signs and keep controls ready so decentralized teams stay safe.',
    statement:
      'Good governance is your structural defense against avoidable disasters. We arm your leadership with real-time risk registers and early-warning monitors so you stay fully compliant, secure, and resilient.',
    tags: [
      'ISO 31000 Risk Register',
      'Early Warning Indicators (KRI)',
      'Business Impact Analysis (ISO 22301)',
      'Cybersecurity Posture',
      'Board Governance Principles',
      'Financial Controls Review',
    ],
    clip: 'Q43',
    thesis: {
      headline: 'Catch exposure early while teams move fast.',
      description:
        'Track leading risk indicators against board limits and assign clear control owners before issues escalate.',
    },
    engines: [
      {
        code: 'Q15',
        name: 'Early Warning Indicators',
        standard: 'Key Risk Indicator (KRI) Threshold Telemetry',
        purpose: 'Tracks leading risk metrics against tolerance limits to forecast breach timing.',
        computes:
          'Calculates burn rates to threshold breach and triggers proactive mitigation protocols.',
      },
      {
        code: 'Q43',
        name: 'Risk Register',
        standard: 'ISO 31000 Enterprise Risk Management',
        purpose:
          'Maintains categorized risks with inherent/residual scoring and assigned control owners.',
        computes:
          'Calculates risk severity matrices and highlights risks exceeding corporate risk appetite.',
      },
      {
        code: 'Q86',
        name: 'Business Continuity (BIA)',
        standard: 'ISO 22301 Business Continuity Management',
        purpose:
          'Analyzes business disruption impacts, identifying Recovery Time and Point Objectives (RTO/RPO).',
        computes:
          'Ranks mission-critical business processes and quantifies financial impact of operational outages.',
      },
      {
        code: 'X02',
        name: 'Cyber Security Posture',
        standard: 'NIST Cybersecurity Framework / CIS Controls',
        purpose:
          'Audits cybersecurity hygiene across identity, data protection, endpoint, and incident response.',
        computes:
          'Scores security readiness levels and identifies high-priority vulnerability gaps.',
      },
      {
        code: 'X06',
        name: 'Organisational Resilience',
        standard: 'ISO 22316 Organizational Resilience Principles',
        purpose:
          'Evaluates enterprise shock absorption, adaptive capacity, and crisis response posture.',
        computes:
          'Scores enterprise resilience across leadership, situational awareness, and agility.',
      },
      {
        code: 'Q99',
        name: 'Governance Assessment',
        standard: 'Corporate Governance Codes & King IV Principles',
        purpose:
          'Assesses board effectiveness, committee mandates, and fiduciary oversight with documentary evidence.',
        computes:
          'Benchmarks governance compliance scores against international and statutory standards.',
      },
      {
        code: 'Q76',
        name: 'Commitments & Obligations Register',
        standard: 'Contractual & Statutory Covenant Monitoring',
        purpose:
          'Centralizes contractual, regulatory, and credit facility covenants with automated review tracking.',
        computes: 'Surfaces impending compliance deadlines and tracks covenant adherence status.',
      },
      {
        code: 'X04',
        name: 'Compliance Assessment',
        standard: 'Regulatory Compliance Risk Modeling',
        purpose:
          'Evaluates regulatory standing across tax, labor, environmental, and industry-specific mandates.',
        computes:
          'Highlights statutory non-compliance exposure and prioritizes remediation actions.',
      },
      {
        code: 'X05',
        name: 'Ethics & Integrity',
        standard: 'OECD Anti-Corruption & Business Ethics Framework',
        purpose:
          'Audits whistleblower protection, conflict of interest declarations, and organizational ethics.',
        computes:
          'Evaluates organizational ethical climate and compliance with anti-bribery standards.',
      },
      {
        code: 'F06',
        name: 'Financial Controls Review',
        standard: 'COSO Internal Control Integrated Framework',
        purpose:
          'Audits internal financial controls, segregation of duties, and disbursement authorization limits.',
        computes:
          'Identifies internal control weaknesses, missing dual authorizations, and reconciliation gaps.',
      },
    ],
    advisoryHighlight: {
      title: 'Governance Advisers & Audit Readiness',
      points: [
        'Apply proven frameworks built for regulated institutions.',
        'Run independent risk reviews and committee briefings.',
        'Stay ready for statutory audits and ISO certifications.',
      ],
    },
  },

  'growth-change': {
    id: 'growth-change',
    name: 'Growth & Change',
    eyebrow: 'Strategic Scaling & Transformation Governance',
    pillar: 'growth',
    title: 'Adapt before the market forces you.',
    lede: 'Sequence growth bets around what your teams can absorb—with clear guidance, not fatigue.',
    statement:
      'Taking on too many expansion bets at once burns capital and exhausts your best people. We help you balance your short-term cash engine with long-term breakthroughs, testing change readiness before you pull the trigger.',
    tags: [
      '3-Horizon Growth Model',
      'Growth Pathways Sequencing',
      'Change Readiness Barriers',
      'Transformation Program Tracker',
      'Digital Maturity Curve',
      'Growth Plan Feasibility',
    ],
    clip: 'G03',
    thesis: {
      headline: 'Reorganize around change without burning out.',
      description:
        'Balance short- and long-horizon bets within working-capital limits and fix adoption stalls early.',
    },
    engines: [
      {
        code: 'C08',
        name: 'Change Readiness',
        standard: 'ADKAR & Kotter 8-Step Change Framework',
        purpose:
          'Identifies specific cultural and operational barriers across stakeholder groups so change does not stall.',
        computes:
          'Isolates each cohort’s weakest readiness belief and recommends targeted interventions.',
      },
      {
        code: 'Z06',
        name: 'Transformation Programme Tracker',
        standard: 'Managing Successful Programmes (MSP) Telemetry',
        purpose:
          'Monitors milestone burn-down velocity, risk profile, and execution momentum across transformation waves.',
        computes: 'Calculates program velocity variance and forecast completion probability.',
      },
      {
        code: 'Z01',
        name: 'Growth Opportunity Scoring',
        standard: 'McKinsey 3-Horizons Growth Framework',
        purpose:
          'Ranks commercial bets across Horizon 1 (core), Horizon 2 (adjacent), and Horizon 3 (emerging).',
        computes:
          'Generates weighted portfolio scores and surfaces strategic resource misallocations.',
      },
      {
        code: 'G03',
        name: 'Growth Pathways',
        standard: 'Ansoff Matrix Expansion Analysis',
        purpose:
          'Compares organic, partnership, and M&A expansion routes within organizational capacity.',
        computes:
          'Calculates pathway risk-return profiles and returns a sequenced execution portfolio.',
      },
      {
        code: 'G07',
        name: 'Growth Plan Feasibility',
        standard: 'Feasibility Stress-Testing Model',
        purpose:
          'Stress-tests proposed expansion plans against capital, talent, and operational bandwidth.',
        computes:
          'Quantifies execution feasibility index and highlights binding operational bottlenecks.',
      },
      {
        code: 'G04',
        name: 'Modernisation Roadmap',
        standard: 'Enterprise Architecture Modernization Pathways',
        purpose:
          'Sequences operational and technology modernization waves aligned with commercial milestones.',
        computes: 'Maps technical debt retirement against business capability uplift.',
      },
      {
        code: 'G06',
        name: 'Digital Maturity',
        standard: 'MIT CISR Digital Business Maturity Index',
        purpose:
          'Benchmarks digital operational capability across customer experience, data, and technology.',
        computes: 'Positions organization on digital maturity curve from siloed to future-ready.',
      },
    ],
    advisoryHighlight: {
      title: 'Transformation Directors & Change Support',
      points: [
        'Guide major restructurings with experienced change leaders.',
        'Track transformation milestones with clear sign-off gates.',
        'Remove frontline friction through targeted team clinics.',
      ],
    },
  },

  advisory: {
    id: 'advisory',
    name: 'Expert Advisory',
    eyebrow: 'Vetted Fractional Leadership & Milestone Escrow',
    pillar: 'consistency',
    title: 'Add judgment, not just more reports.',
    lede: 'Bring vetted leaders directly into your live context to sharpen decisions, backed by escrow.',
    statement:
      "You don't need expensive agencies billing endless hours. You need proven executive operators working directly in your corner, funded under milestone escrow so you only pay for verified results.",
    tags: [
      'Vetted Fractional Executives',
      'Vetted Practice Corridors',
      'Milestone Escrow Governance',
      'Independent Second Opinions',
      'Concierge Workspace Management',
      'Deliverable Acceptance Criteria',
    ],
    clip: 'Q99',
    thesis: {
      headline: 'Senior judgment inside your workflow.',
      description:
        'Match with vetted fractional leaders who start with your live numbers—and release escrow only on sign-off.',
    },
    engines: [
      {
        code: 'ADV-01',
        name: 'Fractional C-Suite Leadership',
        standard: 'Executive Leadership On-Demand',
        purpose:
          'Deploy experienced Fractional CFOs, COOs, CTOs, and Chief Strategy Officers directly inside your workspace.',
        computes:
          'Delivers executive decision-making, team coaching, and board representation on flexible retainer.',
      },
      {
        code: 'ADV-02',
        name: 'Milestone-Governed Escrow',
        standard: 'Binding Acceptance Criteria & B2B Escrow',
        purpose:
          'Funds project milestones in secure escrow accounts, releasing payments only upon verified delivery.',
        computes:
          'Automates payment claims, dual-party acceptance, and impartial administrative arbitration.',
      },
      {
        code: 'ADV-03',
        name: 'Independent Peer Review',
        standard: 'Pre-Commitment Second Opinions',
        purpose:
          'Commission an objective outside review of high-stakes capital allocations, contracts, and acquisitions.',
        computes:
          'Delivers a formal risk-and-opportunity assessment before irrevocable contracts are signed.',
      },
      {
        code: 'ADV-04',
        name: 'Concierge Workspace Operations',
        standard: 'Platform Delivery Management',
        purpose:
          'Assign a dedicated platform project manager to run day-to-day operational workflows on your behalf.',
        computes:
          'Coordinates task completion, monitors engine alerts, and prepares executive summary packages.',
      },
    ],
    advisoryHighlight: {
      title: 'Guaranteed Delivery Through Escrow',
      points: [
        'Fund milestones upfront and release only on your sign-off.',
        'Resolve disputes fairly using written acceptance criteria.',
        'Access vetted practice corridors across global markets.',
      ],
    },
  },
};
