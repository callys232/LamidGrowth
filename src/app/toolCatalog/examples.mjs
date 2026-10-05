/**
 * A worked example input for every catalog tool. Served with the tool's manifest so the form can
 * offer "Load an example" (clearly labelled as example figures), and used by the tests to prove
 * every tool runs end to end. Figures are illustrative, not anyone's real data.
 */
const answers = (ids, levels) =>
  Object.fromEntries(
    ids.map((id, i) => [id, { level: levels[i % levels.length], evidence: i % 3 }]),
  );

export const EXAMPLES = {
  T01: { answers: answers(['p1', 'p2', 'p3', 'p4', 'p5', 'p6'], [4, 2, 3, 1, 2, 3]) },
  T02: {
    objectives: [
      { name: 'Grow recurring revenue', weight: 3 },
      { name: 'Cut delivery time', weight: 2 },
      { name: 'Enter Kenya', weight: 1 },
    ],
    initiatives: [
      {
        name: 'Subscription pricing',
        objective: 'Grow recurring revenue',
        budget: 40000,
        status: 'active',
      },
      {
        name: 'Workflow automation',
        objective: 'Cut delivery time',
        budget: 60000,
        status: 'active',
      },
      { name: 'New office fit-out', objective: '', budget: 30000, status: 'active' },
    ],
  },
  T03: {
    criteria: [
      { id: 'c1', name: 'Revenue impact', weight: 3, direction: 'higher_better' },
      { id: 'c2', name: 'Cost', weight: 2, direction: 'lower_better' },
    ],
    options: [
      { id: 'o1', name: 'Expand sales team', scores: { c1: 8, c2: 120 } },
      { id: 'o2', name: 'Partner channel', scores: { c1: 6, c2: 40 } },
    ],
  },
  T04: {
    periodStart: '2026-07-01',
    periodEnd: '2026-09-30',
    asOf: '2026-08-31',
    keyResults: [
      {
        objective: 'Delight customers',
        keyResult: 'NPS',
        start: 20,
        target: 40,
        current: 31,
        owner: 'Ada',
      },
      {
        objective: 'Delight customers',
        keyResult: 'Support reply hours',
        start: 24,
        target: 4,
        current: 18,
        owner: 'Ben',
      },
      { objective: 'Grow revenue', keyResult: 'MRR (k)', start: 100, target: 150, current: 118 },
    ],
  },
  T05: {
    factors: [
      {
        category: 'Economic',
        factor: 'Interest rates rising',
        direction: 'threat',
        impact: 4,
        likelihood: 4,
        owner: 'CFO',
      },
      {
        category: 'Technological',
        factor: 'AI lowers service cost',
        direction: 'opportunity',
        impact: 5,
        likelihood: 4,
        owner: 'COO',
      },
      {
        category: 'Competitive rivalry',
        factor: 'Two new low-price entrants',
        direction: 'threat',
        impact: 3,
        likelihood: 5,
      },
    ],
  },
  T63: { answers: answers(['o1', 'o2', 'o3', 'o4', 'o5', 'o6'], [3, 1, 2, 2, 1, 3]) },
  T06: {
    periodDays: 7,
    periods: [
      { label: 'W1', throughput: 12, cycleTimeDays: 6, wip: 10, activeDays: 1.5 },
      { label: 'W2', throughput: 9, cycleTimeDays: 7, wip: 11, activeDays: 1.4 },
      { label: 'W3', throughput: 14, cycleTimeDays: 6, wip: 12, activeDays: 1.6 },
      { label: 'W4', throughput: 8, cycleTimeDays: 9, wip: 14, activeDays: 1.5 },
    ],
  },
  T07: {
    metric: 'On-time delivery %',
    betterWhen: 'higher',
    target: 95,
    values: [88, 90, 87, 91, 89, 90, 88, 86, 84, 83, 82, 81].map((value, i) => ({
      label: `M${i + 1}`,
      value,
    })),
  },
  T08: {
    asOf: '2026-09-15',
    dependencies: [
      {
        item: 'Pricing API',
        from: 'Platform',
        to: 'Sales',
        neededBy: '2026-09-01',
        delivered: '2026-09-10',
        critical: true,
      },
      {
        item: 'Brand assets',
        from: 'Marketing',
        to: 'Product',
        neededBy: '2026-09-05',
        critical: false,
      },
      { item: 'Data export', from: 'Platform', to: 'Finance', neededBy: '2026-10-01' },
    ],
  },
  T09: {
    unit: 'hours per week',
    teams: [
      { name: 'Design', capacity: 120, demand: 150 },
      { name: 'Engineering', capacity: 300, demand: 210 },
      { name: 'QA', capacity: 80, demand: 70 },
    ],
  },
  T10: {
    steps: [
      { id: 's1', name: 'Intake', capacity: 120, efficiencyPct: 95 },
      { id: 's2', name: 'Review', capacity: 60, efficiencyPct: 80 },
      { id: 's3', name: 'Delivery', capacity: 90, efficiencyPct: 90 },
    ],
  },
  T11: {
    problem: 'Customer onboarding takes 21 days instead of 7 for enterprise clients since March.',
    isNot: 'Small-business clients still onboard in 6 days.',
    causes: [
      {
        cause: 'Security review queue',
        explains: '',
        category: 'Process',
        evidence: 'some',
        fitsFacts: 'yes',
      },
      {
        cause: 'Only one reviewer',
        explains: 'Security review queue',
        category: 'People',
        evidence: 'strong',
        fitsFacts: 'yes',
      },
      {
        cause: 'Reviewer moved to part-time in March',
        explains: 'Only one reviewer',
        category: 'People',
        evidence: 'strong',
        fitsFacts: 'yes',
      },
      {
        cause: 'Contract template too long',
        explains: '',
        category: 'Materials and inputs',
        evidence: 'none',
        fitsFacts: 'partly',
      },
    ],
  },
  T12: {
    people: 25,
    meetings: [
      {
        name: 'Daily stand-up',
        frequency: 'daily',
        minutes: 15,
        attendees: 25,
        purpose: 'share updates',
        owner: 'Ops lead',
        agenda: true,
      },
      {
        name: 'Weekly leadership',
        frequency: 'weekly',
        minutes: 90,
        attendees: 6,
        purpose: 'review progress',
        owner: 'CEO',
        agenda: true,
      },
      {
        name: 'All-hands',
        frequency: 'monthly',
        minutes: 60,
        attendees: 25,
        purpose: 'share updates',
        agenda: false,
      },
    ],
  },
  T13: {
    outputUnit: 'orders',
    teams: [
      { team: 'North', output: 900, hours: 600, rework: 30, priorOutputPerHour: 1.4 },
      { team: 'South', output: 700, hours: 560, rework: 90 },
    ],
  },
  T14: {
    links: [
      { a: 'Ada', b: 'Ben', strength: 'critical' },
      { a: 'Ada', b: 'Cara', strength: 'regular' },
      { a: 'Ada', b: 'Dev', strength: 'regular' },
      { a: 'Dev', b: 'Eve', strength: 'regular' },
      { a: 'Ben', b: 'Cara', strength: 'occasional' },
    ],
  },
  T15: {
    hourlyCost: 40,
    systems: [
      { system: 'CRM', annualCost: 24000, licensedUsers: 40, activeUsers: 32, hoursSaved: 1 },
      { system: 'BI tool', annualCost: 18000, licensedUsers: 30, activeUsers: 9, hoursSaved: 0.5 },
    ],
  },
  T16: {
    spend: 200000,
    launchedRevenue: 350000,
    stages: [
      { stage: 'Ideas', count: 120, avgDays: 10 },
      { stage: 'Assessed', count: 30, avgDays: 20 },
      { stage: 'Pilot', count: 8, avgDays: 60 },
      { stage: 'Launched', count: 3, avgDays: 30 },
    ],
  },
  T17: { answers: answers(['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7'], [3, 2, 4, 2, 1, 3]) },
  T18: { answers: { frame_question: 1 }, consequence: 'high', reversibility: 'costly' },
  T19: {
    asOf: '2026-09-30',
    stallDays: 30,
    decisions: [
      {
        title: 'Choose payroll provider',
        owner: 'Finance',
        raised: '2026-06-01',
        decided: '2026-06-20',
        status: 'implemented',
        rationale: true,
        topic: 'payroll',
      },
      { title: 'Office move', owner: '', raised: '2026-07-01', status: 'open', topic: 'office' },
      {
        title: 'Revisit payroll provider',
        owner: 'Finance',
        raised: '2026-09-01',
        status: 'open',
        topic: 'payroll',
      },
    ],
  },
  T20: {
    assignments: [
      { decision: 'Hire a manager', role: 'COO', code: 'A' },
      { decision: 'Hire a manager', role: 'HR', code: 'R' },
      { decision: 'Change pricing', role: 'CEO', code: 'A' },
      { decision: 'Change pricing', role: 'CFO', code: 'A' },
    ],
  },
  T21: {
    criteria: [
      { id: 'c1', name: 'Fit', weight: 3, direction: 'higher_better' },
      { id: 'c2', name: 'Price', weight: 2, direction: 'lower_better' },
    ],
    options: [
      { id: 'a', name: 'Vendor A', scores: { c1: 7, c2: 50 } },
      { id: 'b', name: 'Vendor B', scores: { c1: 9, c2: 80 } },
    ],
  },
  T22: {
    scenarios: [
      { id: 's1', name: 'Strong demand', probability: 40 },
      { id: 's2', name: 'Weak demand', probability: 60 },
    ],
    options: [
      { id: 'o1', name: 'Build plant', payoffs: { s1: 500, s2: -200 } },
      { id: 'o2', name: 'Outsource', payoffs: { s1: 200, s2: 50 } },
    ],
  },
  T23: {
    asOf: '2026-10-01',
    items: [
      { item: 'Approve new supplier', costPerWeek: 5000, weeks: 2, deadline: '2026-10-20' },
      { item: 'Rebrand', costPerWeek: 1000, weeks: 8 },
    ],
  },
  T24: {
    objectives: [
      {
        id: 'a',
        name: 'Cut costs',
        priority: 4,
        effects: [{ metric: 'headcount', direction: 'decreases', magnitude: 3 }],
      },
      {
        id: 'b',
        name: 'Faster support',
        priority: 3,
        effects: [{ metric: 'headcount', direction: 'increases', magnitude: 2 }],
      },
    ],
  },
  T25: {
    subject: 'Move to four-day week',
    stakeholders: [
      {
        name: 'Board',
        power: 5,
        interest: 3,
        position: 'sceptic',
        legitimate: true,
        urgent: false,
      },
      {
        name: 'Staff',
        power: 2,
        interest: 5,
        position: 'champion',
        legitimate: true,
        urgent: true,
      },
      { name: 'Key client', power: 4, interest: 2, position: 'neutral', legitimate: true },
    ],
  },
  T26: {
    change: 'Adopt a new CRM',
    forces: [
      { force: 'Sales leadership wants it', direction: 'driving', strength: 4 },
      { force: 'Fear of losing data', direction: 'resisting', strength: 4, controllable: true },
      { force: 'Training time', direction: 'resisting', strength: 2, controllable: true },
    ],
  },
  T27: {
    decision: 'Enter a new country',
    causeEffect: 'emergent',
    reversibility: 'costly',
    stakes: 'high',
    timeAvailable: 'weeks or more',
  },
  T30: {
    items: [
      {
        item: 'CRM rollout',
        benefit: 'Sales hours saved',
        planned: 50000,
        realised: 20000,
        learned: 'Adoption stalled without manager follow-up.',
      },
      { item: 'Price rise', benefit: 'Extra margin', planned: 80000, realised: 90000 },
    ],
  },
  T35: {
    predictions: [
      {
        statement: 'Deal A closes by June',
        forecaster: 'Ada',
        probability: 80,
        outcome: 'happened',
      },
      {
        statement: 'Hire filled in 30 days',
        forecaster: 'Ada',
        probability: 90,
        outcome: 'did not happen',
      },
      { statement: 'Launch on time', forecaster: 'Ben', probability: 60, outcome: 'happened' },
      { statement: 'Churn below 3%', forecaster: 'Ben', probability: 70, outcome: 'not yet known' },
    ],
  },
  T28: {
    indicators: [
      {
        indicator: 'Days of cash',
        direction: 'lower',
        amber: 90,
        red: 60,
        current: 75,
        previous: 95,
        owner: 'CFO',
      },
      {
        indicator: 'Staff turnover %',
        direction: 'higher',
        amber: 12,
        red: 18,
        current: 10,
        previous: 9,
      },
    ],
  },
  T29: {
    asOf: '2026-10-01',
    appetite: 9,
    risks: [
      {
        risk: 'Key supplier fails → stock-out → lost sales',
        owner: 'Ops',
        likelihood: 3,
        impact: 5,
        controls: 'weak',
        actionDue: '2026-09-01',
        actionDone: false,
      },
      {
        risk: 'Data breach → fines and reputation damage',
        owner: 'CTO',
        likelihood: 2,
        impact: 5,
        controls: 'adequate',
      },
    ],
  },
  T36: {
    asOf: '2026-10-01',
    activities: [
      {
        activity: 'Payments',
        mtpdHours: 24,
        rtoHours: 8,
        provenHours: 12,
        lastTested: '2026-03-01',
        alternative: true,
        keyPerson: false,
      },
      { activity: 'Payroll', mtpdHours: 72, rtoHours: 96, alternative: false, keyPerson: true },
    ],
  },
  T37: {
    answers: answers(
      ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9'],
      [2, 1, 2, 4, 3, 2, 1, 1, 2],
    ),
  },
  T39: { answers: answers(['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7'], [3, 2, 3, 2, 1, 2, 3]) },
  T32: { answers: answers(['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7'], [3, 2, 3, 1, 2, 4, 1]) },
  T33: {
    asOf: '2026-10-01',
    items: [
      {
        commitment: 'Quarterly report to investor',
        type: 'contract',
        counterparty: 'Fund X',
        owner: 'CFO',
        due: '2026-10-15',
        status: 'not started',
      },
      {
        commitment: 'Net zero pledge interim target',
        type: 'public pledge',
        due: '2026-09-30',
        status: 'in progress',
      },
    ],
  },
  T34: {
    asOf: '2026-10-01',
    obligations: [
      {
        source: 'GDPR',
        obligation: 'Records of processing',
        control: 'full',
        evidence: 'documented',
        owner: 'DPO',
        reviewed: '2026-02-01',
      },
      {
        source: 'GDPR',
        obligation: 'Breach notification within 72h',
        control: 'partial',
        evidence: 'some',
      },
      {
        source: 'Health & Safety',
        obligation: 'Annual risk assessment',
        control: 'none',
        evidence: 'none',
      },
    ],
  },
  T38: { answers: answers(['e1', 'e2', 'e3', 'e4', 'e5', 'e6'], [3, 1, 2, 2, 1, 2]) },
  T61: {
    asOf: '2026-10-01',
    controls: [
      {
        process: 'Payments',
        control: 'Dual approval over 10k',
        owner: 'FC',
        frequency: 'daily',
        lastTested: '2026-08-01',
        result: 'effective',
      },
      {
        process: 'Payroll',
        control: 'Monthly payroll reconciliation',
        owner: '',
        frequency: 'monthly',
        result: 'not tested',
      },
      {
        process: 'Revenue',
        control: 'Credit note approval',
        owner: 'CFO',
        frequency: 'weekly',
        lastTested: '2025-06-01',
        result: 'deficiency',
      },
    ],
  },
  T31: {
    answers: answers(['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'], [3, 2, 2, 3, 1, 4, 2, 3]),
  },
  T40: {
    skills: [
      { role: 'Data team', skill: 'Data engineering', required: 5, current: 3, peopleAtLevel: 1 },
      { role: 'Data team', skill: 'SQL', required: 4, current: 4, peopleAtLevel: 4 },
    ],
  },
  T41: {
    horizon: '12 months',
    roles: [
      {
        role: 'Engineers',
        current: 20,
        leavers: 3,
        needed: 28,
        internalReady: 2,
        weeksToHire: 14,
        weeksToDevelop: 40,
      },
      { role: 'Support', current: 12, leavers: 2, needed: 8 },
    ],
  },
  T42: {
    roles: [
      {
        id: 'r1',
        title: 'CFO',
        criticality: 5,
        incumbentFlightRisk: 'medium',
        noticeMonths: 3,
        successors: [{ person: 'Deputy FC', readiness: '12m' }],
      },
    ],
  },
  T43: {
    months: 6,
    avgHeadcount: 120,
    leavers: 12,
    voluntaryLeavers: 9,
    hires: 15,
    avgDaysToFill: 48,
    internalMoves: 6,
    trainingCost: 30000,
    trainingHours: 1400,
    absenceDays: 600,
    workdays: 125,
    workforceCost: 3000000,
    revenue: 9000000,
  },
  T44: {
    people: [
      { name: 'Ada', performance: 3, potential: 3, flightRisk: 'high' },
      { name: 'Ben', performance: 2, potential: 2 },
      { name: 'Cara', performance: 1, potential: 1 },
    ],
  },
  T45: {
    teams: [
      { team: 'Sales', invited: 20, promoters: 8, passives: 6, detractors: 4 },
      { team: 'Legal', invited: 4, promoters: 1, passives: 1, detractors: 1 },
    ],
  },
  T46: {
    programmes: [
      {
        programme: 'Manager training',
        participants: 20,
        cost: 30000,
        completion: 90,
        reaction: 4.2,
        learning: 85,
        behaviour: 30,
        benefit: 120000,
        attribution: 50,
        confidence: 70,
      },
    ],
  },
  T47: {
    person: 'Ada',
    competencies: [
      { competency: 'Gives clear direction', expected: 4, self: 5, manager: 3, peers: 3.5 },
      { competency: 'Develops others', expected: 4, self: 3, manager: 4, peers: 4.5 },
    ],
  },
  T48: {
    person: 'Ben',
    targetRole: 'Head of Operations',
    requirements: [
      { requirement: 'Budget ownership', required: 4, current: 2, weeks: 26 },
      { requirement: 'Team leadership', required: 4, current: 4 },
    ],
  },
  T49: {
    change: 'New ERP system',
    groups: [
      {
        group: 'Finance',
        size: 12,
        discrepancy: 5,
        appropriateness: 4,
        efficacy: 3,
        support: 4,
        valence: 3,
      },
      {
        group: 'Warehouse',
        size: 40,
        discrepancy: 2,
        appropriateness: 3,
        efficacy: 2,
        support: 3,
        valence: 2,
      },
    ],
  },
  T50: {
    asOf: '2026-10-01',
    milestones: [
      { milestone: 'Design signed off', owner: 'PMO', planned: '2026-07-01', actual: '2026-07-10' },
      { milestone: 'Pilot live', planned: '2026-09-15', forecast: '2026-10-30' },
    ],
    benefits: [{ benefit: 'Process cost saved', planned: 200000, forecast: 140000 }],
  },
  T51: {
    opportunities: [
      {
        opportunity: 'Upsell premium tier',
        horizon: 'H1 — extend the core',
        ansoff: 'market penetration',
        reach: 2000,
        impact: 1,
        confidence: 80,
        effort: 3,
      },
      {
        opportunity: 'Launch in Ghana',
        horizon: 'H2 — build emerging business',
        ansoff: 'market development',
        reach: 5000,
        impact: 2,
        confidence: 50,
        effort: 12,
      },
    ],
  },
  T52: {
    capacity: 2,
    pathways: [
      {
        id: 'p1',
        name: 'Premium tier',
        quadrant: 'penetration',
        horizon: 1,
        marketAttractiveness: 3,
        capabilityFit: 5,
        investmentLevel: 1,
        timeToRevenueMonths: 3,
        confidence: 2,
      },
      {
        id: 'p2',
        name: 'New region',
        quadrant: 'market_development',
        horizon: 2,
        marketAttractiveness: 4,
        capabilityFit: 3,
        investmentLevel: 3,
        timeToRevenueMonths: 12,
        confidence: 1,
      },
    ],
  },
  T53: {
    periods: 4,
    capacityPerPeriod: 10,
    periodLabel: 'Quarter',
    initiatives: [
      { id: 'a', name: 'Hire sales lead', value: 4, effort: 3 },
      { id: 'b', name: 'Launch partner programme', value: 5, effort: 8, dependsOn: ['a'] },
    ],
  },
  T54: {
    periods: 4,
    capacityPerPeriod: 10,
    periodLabel: 'Quarter',
    initiatives: [
      { id: 'a', name: 'Move to cloud', value: 4, effort: 6 },
      { id: 'b', name: 'Retire old ERP', value: 5, effort: 8, dependsOn: ['a'] },
    ],
  },
  T55: { answers: answers(['dm1', 'dm2', 'dm3', 'dm4', 'dm5', 'dm6'], [2, 3, 1, 2, 2, 3]) },
  T56: {
    currency: 'GBP',
    periodLabel: 'Month',
    periods: [
      { revenue: 100000, cogs: 40000, opex: 50000 },
      { revenue: 110000, cogs: 43000, opex: 52000 },
    ],
    cashBalance: 250000,
    headcount: 20,
  },
  T57: {
    openingCash: 80000,
    minimumCash: 30000,
    monthlyRevenue: 60000,
    revenueGrowthPct: 3,
    monthlyCosts: 70000,
    costGrowthPct: 1,
    flows: [
      { item: 'Customer receipts', type: 'receipt', amount: 14000, repeat: 'weekly', startWeek: 1 },
      { item: 'Payroll', type: 'payment', amount: 45000, repeat: 'four-weekly', startWeek: 4 },
      { item: 'Rent', type: 'payment', amount: 12000, repeat: 'once', startWeek: 2 },
    ],
  },
  T58: {
    revenue: 2000000,
    netIncome: 160000,
    assets: 1600000,
    equity: 800000,
    priorRevenue: 1800000,
    priorNetIncome: 162000,
    priorAssets: 1500000,
    priorEquity: 900000,
  },
  T59: {
    lines: [
      { line: 'Cloud hosting', category: 'Technology', amount: 120000, prior: 90000 },
      { line: 'Office rent', category: 'Premises', amount: 80000, prior: 80000 },
      { line: 'Contractors', category: 'People', amount: 60000, prior: 70000 },
      { line: 'Travel', category: 'Other', amount: 15000 },
      { line: 'Stationery', category: 'Other', amount: 2000 },
    ],
  },
  T60: {
    discountRatePct: 12,
    terminalGrowthPct: 2,
    netDebt: 500000,
    years: [
      { year: '2027', fcf: 400000 },
      { year: '2028', fcf: 480000 },
      { year: '2029', fcf: 550000 },
    ],
  },
  T62: { answers: answers(['f1', 'f2', 'f3', 'f4', 'f5', 'f6'], [2, 3, 1, 2, 2, 1]) },
};
