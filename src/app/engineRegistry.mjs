/**
 * Module registry — ported from LamidOne's src/lib/intelligence/moduleRegistry.ts.
 *
 * 247 intelligence module entries (S, R, C, Q, X, A, Z, P, F, G series) plus the
 * fallback-attachment logic that gives every module a structured input spec even
 * when it did not declare one explicitly. This is a faithful, mechanical port —
 * no entry's data (purpose, dimensionLabels, correctionProtocols, hrefs, etc.) has
 * been altered, summarised, or dropped.
 *
 * @typedef {Object} ModuleConfig
 * @property {string} id
 * @property {string} seriesName
 * @property {string} engineName
 * @property {string} purpose
 * @property {string[]} dimensionLabels
 * @property {string} driverContext
 * @property {string[]} correctionProtocols
 * @property {string} backHref
 * @property {string} backLabel
 * @property {string} [nextHref]
 * @property {string} [nextLabel]
 * @property {import('./engineIntelligence/inputSpec.mjs')} [inputs] Structured input form. Omit to use the generic narrative form.
 */

import {
  CADENCE_METRICS,
  PRODUCTIVITY_METRICS,
  ROSTER_MODULES,
  SCENARIO_MODULES,
} from './engineIntelligence/inputSpec.mjs';

export const MODULE_REGISTRY = {
  /* ── S-SERIES ────────────────────────────────────────────── */
  S01: {
    id: 'S01',
    seriesName: 'S-Series — Strategic Intelligence',
    engineName: 'Strategic Identity Statement',
    purpose:
      'Defines who your business is and what it stands for — the identity statement your strategy, hiring, and investment decisions should all trace back to, so growth never drifts from the brand you built.',
    dimensionLabels: [
      'Identity Clarity',
      'Strategic Alignment',
      'Reputation Index',
      'Market Recognition',
    ],
    driverContext:
      'Identity Drivers govern this module most strongly — character, values, field, domain determine whether strategy is authentic or performed.',
    correctionProtocols: [
      'Identity Stabilisation',
      'Identity Realignment',
      'Identity Amplification',
      'Identity Coherence',
      'Identity Improvement',
      'Identity Lock-In',
    ],
    backHref: '/intelligence-hub',
    backLabel: 'Intelligence Hub',
    nextHref: '/s02-strategic-direction',
    nextLabel: 'Strategic Direction Setter',
  },
  S02: {
    id: 'S02',
    seriesName: 'S-Series — Strategic Intelligence',
    engineName: 'Strategic Direction Setter',
    purpose:
      'Sets your strategic north star — comparing where leadership says the business is heading with where its decisions are actually taking it, so you course-correct before the gap widens.',
    dimensionLabels: [
      'Direction Clarity',
      'Leadership Navigation',
      'Strategic Momentum',
      'Long-Term Alignment',
    ],
    driverContext:
      'Market Drivers and Identity Drivers interact here — the market pulls direction while identity anchors it.',
    correctionProtocols: [
      'Direction Stabilisation',
      'Direction Realignment',
      'Direction Amplification',
      'Direction Coherence',
      'Direction Improvement',
      'Direction Lock-In',
    ],
    backHref: '/s01-strategic-identity',
    backLabel: 'Strategic Identity Statement',
    nextHref: '/s03-strategic-coherence',
    nextLabel: 'Strategy Consistency Check',
  },
  S03: {
    id: 'S03',
    seriesName: 'S-Series — Strategic Intelligence',
    engineName: 'Strategy Consistency Check',
    purpose:
      'Tests your strategy for internal contradictions — flagging where goals, budgets, and initiatives work against each other before they cancel each other out in execution.',
    dimensionLabels: [
      'Internal Coherence',
      'Cross-Function Alignment',
      'Narrative Consistency',
      'Strategic Logic',
    ],
    driverContext:
      'Cultural Drivers are critical here — coherence breaks when culture and strategy diverge.',
    correctionProtocols: [
      'Coherence Stabilisation',
      'Coherence Realignment',
      'Coherence Amplification',
      'Coherence Integration',
      'Coherence Improvement',
      'Coherence Lock-In',
    ],
    backHref: '/s02-strategic-direction',
    backLabel: 'Strategic Direction Setter',
    nextHref: '/s04-strategic-convergence',
    nextLabel: 'Cross-Function Strategy Alignment',
  },
  S04: {
    id: 'S04',
    seriesName: 'S-Series — Strategic Intelligence',
    engineName: 'Cross-Function Strategy Alignment',
    purpose:
      'Checks that sales, operations, finance, and HR are executing the same strategy — surfacing the functions pulling in competing directions so you can realign them early.',
    dimensionLabels: [
      'Strategy–Execution Convergence',
      'Leadership Convergence',
      'Resource–Priority Match',
      'OKR Coherence',
    ],
    driverContext:
      'All seven drivers converge in this module — convergence requires alignment of identity, market, culture, timing, and long-term forces simultaneously.',
    correctionProtocols: [
      'Convergence Stabilisation',
      'Convergence Realignment',
      'Convergence Amplification',
      'Convergence Synchronisation',
      'Convergence Improvement',
      'Convergence Lock-In',
    ],
    backHref: '/s03-strategic-coherence',
    backLabel: 'Strategy Consistency Check',
    nextHref: '/s05-strategic-rhythm',
    nextLabel: 'Strategic Execution Cadence',
  },
  S05: {
    id: 'S05',
    seriesName: 'S-Series — Strategic Intelligence',
    engineName: 'Strategic Execution Cadence',
    purpose:
      'Sets the rhythm of your strategy reviews and decision cycles — so plans are revisited when the market moves, not just when the annual offsite arrives.',
    dimensionLabels: ['Review Cadence', 'Decision Rhythm', 'Execution Tempo', 'Strategic Timing'],
    driverContext:
      'Timing Drivers dominate here — the R-Series rhythm intelligence directly informs strategic timing quality.',
    correctionProtocols: [
      'Rhythm Stabilisation',
      'Rhythm Realignment',
      'Rhythm Amplification',
      'Rhythm Synchronisation',
      'Rhythm Improvement',
      'Rhythm Lock-In',
    ],
    backHref: '/s04-strategic-convergence',
    backLabel: 'Cross-Function Strategy Alignment',
    nextHref: '/s06-strategic-flow',
    nextLabel: 'Strategy Execution Tracker',
  },
  S06: {
    id: 'S06',
    seriesName: 'S-Series — Strategic Intelligence',
    engineName: 'Strategy Execution Tracker',
    purpose:
      'Tracks your strategy from vision to delivery — showing where initiatives stall between the boardroom and the front line, and which bottleneck to clear first.',
    dimensionLabels: [
      'Vision-to-Execution Flow',
      'Strategic Friction',
      'Decision Flow Speed',
      'Implementation Continuity',
    ],
    driverContext:
      'Structural Drivers and Timing Drivers interact here — operational structures either enable or block strategic flow.',
    correctionProtocols: [
      'Flow Stabilisation',
      'Flow Realignment',
      'Flow Amplification',
      'Flow Synchronisation',
      'Flow Improvement',
      'Flow Lock-In',
    ],
    backHref: '/s05-strategic-rhythm',
    backLabel: 'Strategic Execution Cadence',
    nextHref: '/s07-strategic-field',
    nextLabel: 'Strategic Cadence Impact Map',
  },
  S07: {
    id: 'S07',
    seriesName: 'S-Series — Strategic Intelligence',
    engineName: 'Strategic Cadence Impact Area',
    purpose:
      'Maps the environment your strategy operates in — the market conditions, constraints, and internal pressures shaping outcomes — so you plan for the field as it is, not as the slide deck assumed.',
    dimensionLabels: [
      'Structural Impact',
      'Human Impact',
      'Market Impact',
      'Timing Impact',
      'Long-Term Impact',
    ],
    driverContext:
      'All seven drivers create the field simultaneously. The timing field (from R-Series) and long-term field are the most influential layers.',
    correctionProtocols: [
      'Impact Stabilisation',
      'Impact Synchronisation',
      'Impact Amplification',
      'Impact Alignment',
      'Impact Improvement',
      'Impact Lock-In',
    ],
    backHref: '/s06-strategic-flow',
    backLabel: 'Strategy Execution Tracker',
    nextHref: '/s08-strategic-force',
    nextLabel: 'Strategic Momentum Score',
  },
  S08: {
    id: 'S08',
    seriesName: 'S-Series — Strategic Intelligence',
    engineName: 'Strategic Momentum Score',
    purpose:
      'Scores how much momentum your strategy actually has — which initiatives are accelerating, which are meeting resistance, and where pushing harder beats changing course.',
    dimensionLabels: [
      'Acceleration Forces',
      'Resistance Forces',
      'Distortion Forces',
      'Executive Forces',
      'Long-Term Forces',
    ],
    driverContext:
      'Human Drivers create internal forces; Market Drivers create external forces; Timing Drivers govern executive force direction; Direction Drivers create the underlying gravitational pull.',
    correctionProtocols: [
      'Force Neutralisation',
      'Force Redirection',
      'Force Amplification',
      'Force Harmonisation',
      'Force Improvement',
      'Force Lock-In',
    ],
    backHref: '/s07-strategic-field',
    backLabel: 'Strategic Cadence Impact Map',
    nextHref: '/s09-strategic-priority-weighting',
    nextLabel: 'Strategic Priority Weighting',
  },
  S09: {
    id: 'S09',
    seriesName: 'S-Series — Strategic Intelligence',
    engineName: 'Strategic Priority Weighting',
    purpose:
      'Ranks your strategic priorities by weight and urgency — so people stop treating everything as top priority and resources follow what matters most.',
    dimensionLabels: [
      'Identity Weighting',
      'Market Weighting',
      'Cultural Weighting',
      'Timing Weighting',
      'Long-Term Weighting',
    ],
    driverContext:
      'Identity Drivers create the most stable gravitational pull. Direction Drivers create the primary gravitational centre toward authentic future.',
    correctionProtocols: [
      'Gravity Stabilisation',
      'Gravity Realignment',
      'Gravity Amplification',
      'Gravity Neutralisation',
      'Gravity Improvement',
      'Gravity Lock-In',
    ],
    backHref: '/s08-strategic-force',
    backLabel: 'Strategic Momentum Score',
    nextHref: '/s10-strategic-focus-areas',
    nextLabel: 'Strategic Focus Areas',
  },
  S10: {
    id: 'S10',
    seriesName: 'S-Series — Strategic Intelligence',
    engineName: 'Strategic Focus Areas',
    purpose:
      'Identifies the handful of focus areas where your effort compounds — and the initiatives that keep consuming budget without moving the business.',
    dimensionLabels: [
      'Identity Focus Area',
      'Market Focus Area',
      'Cultural Focus Area',
      'Timing Focus Area',
      'Long-Term Focus Area',
    ],
    driverContext:
      'Cultural Drivers create the most persistent orbits — culture determines which cycles repeat. Timing Drivers govern orbital timing and frequency.',
    correctionProtocols: [
      'Orbit Break',
      'Orbit Reset',
      'Orbit Redesign',
      'Orbit Improvement',
      'Orbit Synchronisation',
      'Orbit Lock-In',
    ],
    backHref: '/s09-strategic-priority-weighting',
    backLabel: 'Strategic Priority Weighting',
    nextHref: '/s11-market-trend-response-tracker',
    nextLabel: 'Market Trend Response Tracker',
  },
  S11: {
    id: 'S11',
    seriesName: 'S-Series — Strategic Intelligence',
    engineName: 'Market Trend Response Tracker',
    purpose:
      'Tracks how fast your organization notices and responds to market shifts — how long a trend takes to reach a decision, and whether the response holds or fades.',
    dimensionLabels: [
      'Identity Trend Response',
      'Market Trend Response',
      'Cultural Trend Response',
      'Timing Trend Response',
      'Long-Term Trend Response',
    ],
    driverContext:
      'Every driver produces trend signals. Conflicts between Identity and Market signals are the most common cause of a stalled response.',
    correctionProtocols: [
      'Response Stabilisation',
      'Response Synchronisation',
      'Response Amplification',
      'Response Neutralisation',
      'Response Improvement',
      'Response Lock-In',
    ],
    backHref: '/s10-strategic-focus-areas',
    backLabel: 'Strategic Focus Areas',
    nextHref: '/s12-strategic-horizon',
    nextLabel: 'Long-Term Strategic Outlook',
  },
  S12: {
    id: 'S12',
    seriesName: 'S-Series — Strategic Intelligence',
    engineName: 'Long-Term Strategic Outlook',
    purpose:
      "Projects where your current trajectory takes the business over the long term — showing whether your stated ambition is reachable from where you stand, and what has to change if it isn't.",
    dimensionLabels: [
      'Identity Horizon',
      'Market Horizon',
      'Cultural Horizon',
      'Timing Horizon',
      'Long-Term Horizon',
    ],
    driverContext:
      'Direction Drivers are primary here — origin, source, executive, and completeness encode the underlying horizon truth. The Timing Horizon (from R-Series) determines arrival timing.',
    correctionProtocols: [
      'Horizon Stabilisation',
      'Horizon Realignment',
      'Horizon Improvement',
      'Horizon Expansion',
      'Horizon Acceleration',
      'Horizon Lock-In',
    ],
    backHref: '/s11-market-trend-response-tracker',
    backLabel: 'Market Trend Response Tracker',
    nextHref: '/intelligence-hub',
    nextLabel: 'Intelligence Hub',
  },

  /* ── R-SERIES (representative subset — full registry continues) ── */
  R01: {
    id: 'R01',
    seriesName: 'R-Series — Cadence Intelligence',
    engineName: 'Cadence Mapping',
    purpose:
      'Maps your operating rhythm end to end — when decisions get made, when work ships, and how information flows — so timing is designed around market and customer signals rather than habit.',
    dimensionLabels: [
      'Strategic Rhythms',
      'Operational Rhythms',
      'Financial Rhythms',
      'Transformation Rhythms',
    ],
    driverContext:
      'All seven drivers create rhythm patterns. Timing Drivers (from R-Series itself) and Identity Drivers create the most stable, coherent rhythm maps.',
    correctionProtocols: [
      'Rhythm Stabilisation',
      'Rhythm Synchronisation',
      'Rhythm Amplification',
      'Strategy-to-Execution Alignment',
      'Rhythm Improvement',
      'Rhythm Lock-In',
    ],
    backHref: '/cadence-intelligence',
    backLabel: 'Cadence Intelligence',
    nextHref: '/r02-pace-of-execution',
    nextLabel: 'Pace of Execution',
  },
  R02: {
    id: 'R02',
    seriesName: 'R-Series — Cadence Intelligence',
    engineName: 'Pace of Execution',
    purpose:
      "Measures how fast work actually moves through your organization — where pace is building, where it's stalling, and whether your delivery speed matches what you've promised.",
    dimensionLabels: [
      'Strategic Rhythm Velocity',
      'Operational Rhythm Velocity',
      'Financial Rhythm Velocity',
      'Transformation Rhythm Velocity',
    ],
    driverContext:
      'Timing Drivers govern velocity most directly. Identity Drivers determine the baseline rhythm pace. Market Drivers create external velocity pressures.',
    correctionProtocols: [
      'Velocity Stabilisation',
      'Velocity Synchronisation',
      'Velocity Amplification',
      'Velocity Alignment',
      'Velocity Improvement',
      'Velocity Lock-In',
    ],
    backHref: '/r01-cadence-mapping',
    backLabel: 'Cadence Mapping',
    nextHref: '/r03-cadence-drift-alert',
    nextLabel: 'Cadence Drift Alert',
  },
  R03: {
    id: 'R03',
    seriesName: 'R-Series — Cadence Intelligence',
    engineName: 'Cadence Drift Alert',
    purpose:
      'Catches your delivery rhythm slipping — a little later each cycle — and flags it before the drift shows up in a missed quarter.',
    dimensionLabels: [
      'Strategic Rhythm Drift',
      'Operational Rhythm Drift',
      'Financial Rhythm Drift',
      'Cultural Rhythm Drift',
    ],
    driverContext:
      'Cultural Drivers are the primary source of silent drift. Timing Drivers reveal the speed of drift. Identity Drivers determine whether drift is correctable or structural.',
    correctionProtocols: [
      'Drift Correction',
      'Drift Stabilisation',
      'Drift Reversal',
      'Drift Alignment',
      'Drift Improvement',
      'Drift Lock-In',
    ],
    backHref: '/r02-pace-of-execution',
    backLabel: 'Pace of Execution',
    nextHref: '/r04-cadence-stability-score',
    nextLabel: 'Cadence Stability Score',
  },
  R04: {
    id: 'R04',
    seriesName: 'R-Series — Cadence Intelligence',
    engineName: 'Cadence Stability Score',
    purpose:
      'Scores how well your operating rhythm holds up under pressure — disruption, volatility, surprise demand — so you know whether one bad week breaks the routine.',
    dimensionLabels: [
      'Strategic Rhythm Stability',
      'Operational Rhythm Stability',
      'Financial Rhythm Stability',
      'Leadership Rhythm Stability',
    ],
    driverContext:
      'Identity Drivers create the underlying rhythm stability. Structural Drivers provide the operational scaffolding. Market Drivers are the primary source of destabilising shocks.',
    correctionProtocols: [
      'Stability Reinforcement',
      'Stability Synchronisation',
      'Stability Amplification',
      'Stability Alignment',
      'Stability Improvement',
      'Stability Lock-In',
    ],
    backHref: '/r03-cadence-drift-alert',
    backLabel: 'Cadence Drift Alert',
    nextHref: '/r05-workload-balance-monitor',
    nextLabel: 'Workload Balance Monitor',
  },
  R05: {
    id: 'R05',
    seriesName: 'R-Series — Cadence Intelligence',
    engineName: 'Workload Balance Monitor',
    purpose:
      'Shows where workload is piling onto some teams while others have slack — so you rebalance before overload turns into burnout and attrition.',
    dimensionLabels: [
      'Strategic–Operational Balance',
      'Financial–Human Balance',
      'Growth–Stability Balance',
      'Internal–External Balance',
    ],
    driverContext:
      "Human Drivers and Cultural Drivers create the most common imbalances. Identity Drivers set the equilibrium point. Direction Drivers reveal the ideal balance for the enterprise's future.",
    correctionProtocols: [
      'Balance Restoration',
      'Balance Synchronisation',
      'Balance Amplification',
      'Balance Alignment',
      'Balance Improvement',
      'Balance Lock-In',
    ],
    backHref: '/r04-cadence-stability-score',
    backLabel: 'Cadence Stability Score',
    nextHref: '/r06-cross-team-cadence-fit',
    nextLabel: 'Cross-Team Cadence Fit',
  },
  R06: {
    id: 'R06',
    seriesName: 'R-Series — Cadence Intelligence',
    engineName: 'Cross-Team Cadence Fit',
    purpose:
      "Checks whether your teams' rhythms work together — where one team's cycle feeds another's queue, and where mismatched timing creates waiting.",
    dimensionLabels: [
      'Cross-Function Harmony',
      'Leadership–Team Harmony',
      'Strategy–Execution Harmony',
      'Human–Digital Harmony',
    ],
    driverContext:
      'Cultural Drivers generate the most powerful harmony conditions. Identity Drivers set how wide a range of cadences can coexist. Market Drivers are the most common source of disruption.',
    correctionProtocols: [
      'Harmony Restoration',
      'Harmony Synchronisation',
      'Harmony Amplification',
      'Harmony Alignment',
      'Harmony Improvement',
      'Harmony Lock-In',
    ],
    backHref: '/r05-workload-balance-monitor',
    backLabel: 'Workload Balance Monitor',
    nextHref: '/r07-cadence-consistency-check',
    nextLabel: 'Cadence Consistency Check',
  },
  R07: {
    id: 'R07',
    seriesName: 'R-Series — Cadence Intelligence',
    engineName: 'Cadence Consistency Check',
    purpose:
      'Tests whether your organization runs on one coherent rhythm or many conflicting ones — the meeting, reporting, and delivery cycles that create noise when they clash.',
    dimensionLabels: [
      'Strategic Rhythm Coherence',
      'Operational Rhythm Coherence',
      'Financial Rhythm Coherence',
      'Behavioural Rhythm Coherence',
    ],
    driverContext:
      'Identity Drivers create the underlying coherence foundation. Cultural Drivers determine whether coherence is lived or stated. Timing Drivers reveal coherence quality over time.',
    correctionProtocols: [
      'Coherence Restoration',
      'Coherence Synchronisation',
      'Coherence Amplification',
      'Coherence Alignment',
      'Coherence Improvement',
      'Coherence Lock-In',
    ],
    backHref: '/r06-cross-team-cadence-fit',
    backLabel: 'Cross-Team Cadence Fit',
    nextHref: '/r08-cadence-integration',
    nextLabel: 'Cadence Integration',
  },
  R08: {
    id: 'R08',
    seriesName: 'R-Series — Cadence Intelligence',
    engineName: 'Cadence Integration',
    purpose:
      'Shows how well the rhythms of your departments, systems, and teams knit into one operating cycle — and where the handoffs between them lose days.',
    dimensionLabels: [
      'Vertical Rhythm Integration',
      'Horizontal Rhythm Integration',
      'Digital–Human Integration',
      'Internal–External Integration',
    ],
    driverContext:
      'Structural Drivers create the primary integration architecture. Timing Drivers determine integration timing. Identity Drivers determine whether integration is authentic or forced.',
    correctionProtocols: [
      'Integration Stabilisation',
      'Integration Synchronisation',
      'Integration Amplification',
      'Gap Closure',
      'Integration Improvement',
      'Integration Lock-In',
    ],
    backHref: '/r07-cadence-consistency-check',
    backLabel: 'Cadence Consistency Check',
    nextHref: '/r09-strategy-to-execution-alignment',
    nextLabel: 'Strategy-to-Execution Alignment',
  },
  R09: {
    id: 'R09',
    seriesName: 'R-Series — Cadence Intelligence',
    engineName: 'Strategy-to-Execution Alignment',
    purpose:
      'Checks that your operating rhythm serves your strategy — flagging the cadences that keep teams busy but pull effort away from stated priorities.',
    dimensionLabels: [
      'Strategic Rhythm Alignment',
      'Market Rhythm Alignment',
      'Cultural Rhythm Alignment',
      'Long-Term Rhythm Alignment',
    ],
    driverContext:
      'Direction Drivers reveal the underlying alignment truth. Identity Drivers set the alignment baseline. Market Drivers test alignment under external conditions.',
    correctionProtocols: [
      'Alignment Restoration',
      'Alignment Synchronisation',
      'Alignment Amplification',
      'Misalignment Correction',
      'Alignment Improvement',
      'Alignment Lock-In',
    ],
    backHref: '/r08-cadence-integration',
    backLabel: 'Cadence Integration',
    nextHref: '/r10-multi-team-cadence-sync',
    nextLabel: 'Multi-Team Cadence Sync',
  },
  R10: {
    id: 'R10',
    seriesName: 'R-Series — Cadence Intelligence',
    engineName: 'Multi-Team Cadence Sync',
    purpose:
      'Measures how close your teams are to a shared rhythm — which are converging on the same beat, and which are drifting apart.',
    dimensionLabels: [
      'Strategic–Operational Convergence',
      'Human–Digital Convergence',
      'Financial–Execution Convergence',
      'Internal–Long-Term Convergence',
    ],
    driverContext:
      'All seven drivers contribute to convergence. Timing Drivers determine convergence timing. Direction Drivers set the convergence destination. Cultural Drivers are the most common convergence barrier.',
    correctionProtocols: [
      'Convergence Acceleration',
      'Convergence Synchronisation',
      'Convergence Amplification',
      'Divergence Correction',
      'Convergence Improvement',
      'Convergence Lock-In',
    ],
    backHref: '/r09-strategy-to-execution-alignment',
    backLabel: 'Strategy-to-Execution Alignment',
    nextHref: '/r11-real-time-cadence-sync',
    nextLabel: 'Real-Time Cadence Sync',
  },
  R11: {
    id: 'R11',
    seriesName: 'R-Series — Cadence Intelligence',
    engineName: 'Real-Time Cadence Sync',
    purpose:
      'Measures how precisely your teams and systems are synchronised right now — the lag between them, and how long alignment lasts once achieved.',
    dimensionLabels: [
      'Leadership Synchronization',
      'Cross-Team Synchronization',
      'System Synchronization',
      'Market Synchronization',
    ],
    driverContext:
      'Timing Drivers are the primary synchronisation governors. Structural Drivers create the synchronisation architecture. Cultural Drivers determine whether synchronisation is sustained or sporadic.',
    correctionProtocols: [
      'Synchronization Stabilisation',
      'Synchronization Amplification',
      'Latency Reduction',
      'Phase Alignment',
      'Synchronization Improvement',
      'Synchronization Lock-In',
    ],
    backHref: '/r10-multi-team-cadence-sync',
    backLabel: 'Multi-Team Cadence Sync',
    nextHref: '/r12-operational-flow-tracker',
    nextLabel: 'Operational Flow Tracker',
  },
  R12: {
    id: 'R12',
    seriesName: 'R-Series — Cadence Intelligence',
    engineName: 'Operational Flow Tracker',
    purpose:
      'Tracks whether work moves through your operation without interruption — surfacing the pauses, handoffs, and rework loops that break flow.',
    dimensionLabels: [
      'Strategy Execution Tracker',
      'Operational Flow',
      'Financial Flow',
      'Compliance Flow',
    ],
    driverContext:
      'Structural Drivers create the most common flow friction. Timing Drivers and Identity Drivers create the conditions for sustained flow.',
    correctionProtocols: [
      'Flow Stabilisation',
      'Flow Synchronisation',
      'Flow Amplification',
      'Flow Friction Reduction',
      'Flow Improvement',
      'Flow Lock-In',
    ],
    backHref: '/r11-real-time-cadence-sync',
    backLabel: 'Real-Time Cadence Sync',
    nextHref: '/r13-team-cadence-engagement-score',
    nextLabel: 'Team Cadence Engagement Score',
  },
  R13: {
    id: 'R13',
    seriesName: 'R-Series — Cadence Intelligence',
    engineName: 'Team Cadence Engagement Score',
    purpose:
      "Scores how well your people's working rhythm matches the pace of your markets and culture — where the beat energises teams, and where it grinds them down.",
    dimensionLabels: [
      'Strategic Alignment',
      'Human Alignment',
      'Market Alignment',
      'Long-Term Alignment',
    ],
    driverContext:
      'Identity Drivers create the underlying alignment conditions. Direction Drivers reveal the alignment frequency the enterprise is naturally moving toward. Cultural Drivers determine whether alignment is felt and embodied.',
    correctionProtocols: [
      'Alignment Restoration',
      'Alignment Synchronisation',
      'Alignment Amplification',
      'Frequency Alignment',
      'Alignment Improvement',
      'Alignment Lock-In',
    ],
    backHref: '/r12-operational-flow-tracker',
    backLabel: 'Operational Flow Tracker',
    nextHref: '/r14-real-time-cadence-pulse',
    nextLabel: 'Real-Time Cadence Pulse',
  },
  R14: {
    id: 'R14',
    seriesName: 'R-Series — Cadence Intelligence',
    engineName: 'Real-Time Cadence Pulse',
    purpose:
      "Monitors the heartbeat of your operation as it happens — the recurring delivery and decision cycles whose strength tells you the organisation's health, energy, and momentum.",
    dimensionLabels: ['Strategic Pulse', 'Operational Pulse', 'Financial Pulse', 'Cultural Pulse'],
    driverContext:
      'Human Drivers generate the most visible pulse signals. Timing Drivers determine pulse regularity. Identity Drivers encode the natural pulse frequency of the enterprise.',
    correctionProtocols: [
      'Pulse Restoration',
      'Pulse Synchronisation',
      'Pulse Amplification',
      'Pulse Alignment',
      'Pulse Improvement',
      'Pulse Lock-In',
    ],
    backHref: '/r13-team-cadence-engagement-score',
    backLabel: 'Team Cadence Engagement Score',
    nextHref: '/r15-organisational-cadence-profile',
    nextLabel: 'Organisational Cadence Profile',
  },
  R15: {
    id: 'R15',
    seriesName: 'R-Series — Cadence Intelligence',
    engineName: 'Organisational Cadence Profile',
    purpose:
      "Profiles your organization's distinctive working rhythm — the timing fingerprint that sets it apart — so you protect what makes it fast and fix what makes it late.",
    dimensionLabels: [
      'Strategic Rhythm Signature',
      'Cultural Rhythm Signature',
      'Leadership Rhythm Signature',
      'Market Rhythm Signature',
    ],
    driverContext:
      'Identity Drivers define the signature most profoundly. Cultural Drivers embed the signature into daily behaviour. Direction Drivers reveal whether the signature is evolving toward its highest expression.',
    correctionProtocols: [
      'Signature Clarification',
      'Signature Synchronisation',
      'Signature Amplification',
      'Signature Alignment',
      'Signature Improvement',
      'Signature Lock-In',
    ],
    backHref: '/r14-real-time-cadence-pulse',
    backLabel: 'Real-Time Cadence Pulse',
    nextHref: '/r16-cadence-pattern-report',
    nextLabel: 'Cadence Pattern Report',
  },
  R16: {
    id: 'R16',
    seriesName: 'R-Series — Cadence Intelligence',
    engineName: 'Cadence Pattern Report',
    purpose:
      'Reports the timing patterns your organization actually runs on — its true operating rhythm versus the schedule on paper.',
    dimensionLabels: [
      'Rhythm Identity Clarity',
      'Timing Self-Awareness',
      'Cadence Authenticity',
      'Rhythm Persona Alignment',
    ],
    driverContext:
      'Identity Drivers are primary at this layer. Timing Drivers provide the evidence base. Cultural Drivers determine whether rhythm identity is expressed or suppressed.',
    correctionProtocols: [
      'Identity Clarification',
      'Identity Synchronisation',
      'Identity Amplification',
      'Identity Alignment',
      'Identity Improvement',
      'Identity Lock-In',
    ],
    backHref: '/r15-organisational-cadence-profile',
    backLabel: 'Organisational Cadence Profile',
    nextHref: '/r17-core-cadence-drivers',
    nextLabel: 'Core Cadence Drivers',
  },
  R17: {
    id: 'R17',
    seriesName: 'R-Series — Cadence Intelligence',
    engineName: 'Core Cadence Drivers',
    purpose:
      "Identifies what actually sets your organization's pace — the constraint, the person, or the process everything else waits on.",
    dimensionLabels: [
      'Primary Cadence Driver',
      'Timing Driver Clarity',
      'Driver Consistency',
      'Driver Visibility',
    ],
    driverContext:
      'Identity and Direction Drivers together set the primary cadence. Cultural Drivers determine whether that cadence is visible or hidden. Market Drivers test character under pressure.',
    correctionProtocols: [
      'Driver Restoration',
      'Driver Synchronisation',
      'Driver Amplification',
      'Driver Alignment',
      'Driver Improvement',
      'Driver Lock-In',
    ],
    backHref: '/r16-cadence-pattern-report',
    backLabel: 'Cadence Pattern Report',
    nextHref: '/r18-cultural-cadence-fit',
    nextLabel: 'Cultural Cadence Fit',
  },
  R18: {
    id: 'R18',
    seriesName: 'R-Series — Cadence Intelligence',
    engineName: 'Cultural Cadence Fit',
    purpose:
      'Measures how well your operating rhythm fits your people and culture — where the pace is sustainable, and where it clashes with how your teams genuinely work.',
    dimensionLabels: [
      'Strategy–Culture Fit',
      'Team Culture Fit',
      'Leadership Culture Fit',
      'Timing Culture Fit',
    ],
    driverContext:
      'Direction Drivers set which values matter most. Identity Drivers keep them grounded in what the organisation actually is. Cultural Drivers determine whether they show up in day-to-day work.',
    correctionProtocols: [
      'Culture Fit Restoration',
      'Culture Fit Synchronisation',
      'Culture Fit Amplification',
      'Culture Fit Alignment',
      'Culture Fit Improvement',
      'Culture Fit Lock-In',
    ],
    backHref: '/r17-core-cadence-drivers',
    backLabel: 'Core Cadence Drivers',
    nextHref: '/r19-cadence-impact-area',
    nextLabel: 'Cadence Impact Area',
  },
  R19: {
    id: 'R19',
    seriesName: 'R-Series — Cadence Intelligence',
    engineName: 'Cadence Impact Area',
    purpose:
      'Maps where your operating rhythm touches results — which timing choices move revenue, delivery, and morale, and which are just calendar habit.',
    dimensionLabels: [
      'Structural Rhythm Field',
      'Human Rhythm Field',
      'Market Rhythm Field',
      'Long-Term Rhythm Field',
    ],
    driverContext:
      "All seven drivers simultaneously create and inhabit the rhythm field. Timing Drivers are the primary field generators. Direction Drivers define the field's ultimate direction.",
    correctionProtocols: [
      'Impact Stabilisation',
      'Impact Synchronisation',
      'Impact Amplification',
      'Impact Alignment',
      'Impact Improvement',
      'Impact Lock-In',
    ],
    backHref: '/r18-cultural-cadence-fit',
    backLabel: 'Cultural Cadence Fit',
    nextHref: '/r20-department-cadence-view',
    nextLabel: 'Department Cadence View',
  },
  R20: {
    id: 'R20',
    seriesName: 'R-Series — Cadence Intelligence',
    engineName: 'Department Cadence View',
    purpose:
      "Shows one department's rhythm in full — its cycles, its bottlenecks, and its fit with the teams upstream and downstream of it.",
    dimensionLabels: [
      'Strategic Rhythm Domain',
      'Market Rhythm Domain',
      'Operational Rhythm Domain',
      'Timing Authority',
    ],
    driverContext:
      'Market Drivers define the external domain boundaries. Identity Drivers determine domain authority. Direction Drivers reveal whether the enterprise is growing, contracting, or transforming its domain.',
    correctionProtocols: [
      'Domain Stabilisation',
      'Domain Synchronisation',
      'Domain Amplification',
      'Domain Alignment',
      'Domain Improvement',
      'Domain Lock-In',
    ],
    backHref: '/r19-cadence-impact-area',
    backLabel: 'Cadence Impact Area',
    nextHref: '/r21-business-unit-cadence-view',
    nextLabel: 'Business Unit Cadence View',
  },
  R21: {
    id: 'R21',
    seriesName: 'R-Series — Cadence Intelligence',
    engineName: 'Business Unit Cadence View',
    purpose:
      'Rolls cadence up to business-unit level — comparing rhythm and reliability across units so you see which operating models to copy.',
    dimensionLabels: [
      'Internal Cadence Scope',
      'Market Cadence Scope',
      'Cultural Cadence Scope',
      'Long-Term Cadence Scope',
    ],
    driverContext:
      "Direction Drivers define the business unit's outermost horizon. Identity Drivers determine business unit access. Cultural Drivers determine whether the enterprise can inhabit its full business unit.",
    correctionProtocols: [
      'Business Unit Expansion',
      'Business Unit Synchronisation',
      'Business Unit Amplification',
      'Business Unit Alignment',
      'Business Unit Improvement',
      'Business Unit Lock-In',
    ],
    backHref: '/r20-department-cadence-view',
    backLabel: 'Department Cadence View',
    nextHref: '/r22-enterprise-wide-cadence-view',
    nextLabel: 'Enterprise-Wide Cadence View',
  },
  R22: {
    id: 'R22',
    seriesName: 'R-Series — Cadence Intelligence',
    engineName: 'Enterprise-Wide Cadence View',
    purpose:
      "Puts the whole organization's rhythm on one screen — every unit's pace, drift, and sync — so leadership sees timing problems before they compound.",
    dimensionLabels: [
      'Macro Cadence View',
      'Market Cadence View',
      'Organisational Cadence View',
      'Long-Range Timing View',
    ],
    driverContext:
      "All seven drivers exist within the cadence landscape. Timing Drivers and Direction Drivers are the enterprise's guides through the larger rhythmic enterprise-wide view.",
    correctionProtocols: [
      'Scope Alignment',
      'Scope Synchronisation',
      'Scope Amplification',
      'Scope Orientation',
      'Scope Improvement',
      'Scope Lock-In',
    ],
    backHref: '/r21-business-unit-cadence-view',
    backLabel: 'Business Unit Cadence View',
    nextHref: '/r23-long-term-cadence-trends',
    nextLabel: 'Long-Term Cadence Trends',
  },
  R23: {
    id: 'R23',
    seriesName: 'R-Series — Cadence Intelligence',
    engineName: 'Long-Term Cadence Trends',
    purpose:
      'Tracks how your operating rhythm changes across quarters and years — speeding up, slowing down, or quietly eroding.',
    dimensionLabels: [
      'Long-Range Timing Awareness',
      'Strategic Long-Range Horizon',
      'Cultural Long-Range Potential',
      'Long-Term Trajectory',
    ],
    driverContext:
      "Direction Drivers are primary at the long-range layer. Identity Drivers determine the enterprise's relationship with long-range time. Cultural Drivers determine whether long-range is embraced or feared.",
    correctionProtocols: [
      'Long-Range Orientation',
      'Long-Range Synchronisation',
      'Long-Range Amplification',
      'Long-Range Alignment',
      'Long-Range Improvement',
      'Long-Range Lock-In',
    ],
    backHref: '/r22-enterprise-wide-cadence-view',
    backLabel: 'Enterprise-Wide Cadence View',
    nextHref: '/r24-historical-cadence-tracking',
    nextLabel: 'Historical Cadence Tracking',
  },
  R24: {
    id: 'R24',
    seriesName: 'R-Series — Cadence Intelligence',
    engineName: 'Historical Cadence Tracking',
    purpose:
      'Keeps the history of your rhythm — so you can date exactly when delivery started slipping, and connect it to what changed.',
    dimensionLabels: [
      'Historical Rhythm Continuum',
      'Present Rhythm Continuum',
      'Future Rhythm Continuum',
      'Transformation Continuum',
    ],
    driverContext:
      "Timing Drivers generate the continuum evidence. Identity Drivers provide the thread of continuity. Direction Drivers reveal the direction of the continuum's arc.",
    correctionProtocols: [
      'Continuum Stabilisation',
      'Continuum Synchronisation',
      'Continuum Amplification',
      'Continuity Restoration',
      'Continuum Improvement',
      'Continuum Lock-In',
    ],
    backHref: '/r23-long-term-cadence-trends',
    backLabel: 'Long-Term Cadence Trends',
    nextHref: '/r25-root-cause-of-cadence-issues',
    nextLabel: 'Root Cause of Cadence Issues',
  },
  R25: {
    id: 'R25',
    seriesName: 'R-Series — Cadence Intelligence',
    engineName: 'Root Cause of Cadence Issues',
    purpose:
      'Traces a broken rhythm to its root cause — the dependency, decision bottleneck, or overload behind the slippage, rather than the team it happens to show up in.',
    dimensionLabels: [
      'Founding Rhythm Origin',
      'Cultural Origin Patterns',
      'Strategic Origin Cadence',
      'Long-Term Origin Point',
    ],
    driverContext:
      'Identity Drivers carry the underlying origin information. Cultural Drivers determine whether origin patterns are preserved, evolved, or abandoned. Timing Drivers map origin patterns across time.',
    correctionProtocols: [
      'Origin Restoration',
      'Origin Synchronisation',
      'Origin Amplification',
      'Origin Alignment',
      'Origin Improvement',
      'Origin Lock-In',
    ],
    backHref: '/r24-historical-cadence-tracking',
    backLabel: 'Historical Cadence Tracking',
    nextHref: '/r26-cadence-data-sources',
    nextLabel: 'Cadence Data Sources',
  },
  R26: {
    id: 'R26',
    seriesName: 'R-Series — Cadence Intelligence',
    engineName: 'Cadence Data Sources',
    purpose:
      'Audits where your timing data comes from and how much to trust it — so cadence decisions rest on real signals, not anecdote.',
    dimensionLabels: ['Identity Source', 'Cultural Source', 'Strategic Source', 'Long-Term Source'],
    driverContext:
      "Direction Drivers and Identity Drivers reveal the source most directly. Cultural Drivers determine whether the source is accessed and honoured. Timing Drivers reveal the source's expression over time.",
    correctionProtocols: [
      'Source Restoration',
      'Source Synchronisation',
      'Source Amplification',
      'Source Alignment',
      'Source Improvement',
      'Source Lock-In',
    ],
    backHref: '/r25-root-cause-of-cadence-issues',
    backLabel: 'Root Cause of Cadence Issues',
    nextHref: '/r27-peak-performance-cadence',
    nextLabel: 'Peak Performance Cadence',
  },
  R27: {
    id: 'R27',
    seriesName: 'R-Series — Cadence Intelligence',
    engineName: 'Peak Performance Cadence',
    purpose:
      'Finds the rhythm your organization performs best at — the pace that maximises output without tipping teams into overload — and shows how far you are from it.',
    dimensionLabels: [
      'Strategic Peak Cadence',
      'Operational Peak Cadence',
      'Cultural Peak Cadence',
      'Long-Term Peak Cadence',
    ],
    driverContext:
      'Direction Drivers define the peak destination. Identity Drivers determine peak capacity. All seven drivers must be aligned for the enterprise to approach its rhythm peak.',
    correctionProtocols: [
      'Peak Preparation',
      'Peak Synchronisation',
      'Peak Amplification',
      'Peak Alignment',
      'Peak Improvement',
      'Peak Lock-In',
    ],
    backHref: '/r26-cadence-data-sources',
    backLabel: 'Cadence Data Sources',
    nextHref: '/r28-cadence-governance-console',
    nextLabel: 'Cadence Governance Console',
  },
  R28: {
    id: 'R28',
    seriesName: 'R-Series — Cadence Intelligence',
    engineName: 'Cadence Governance Console',
    purpose:
      'Puts your operating rhythm under management — who owns each cycle, what its standard is, and what happens when it breaks.',
    dimensionLabels: [
      'Strategic Cadence Governance',
      'Operational Cadence Governance',
      'Cultural Cadence Governance',
      'Long-Term Cadence Governance',
    ],
    driverContext:
      'Identity Drivers are the foundation of governance. Direction Drivers provide executive direction. Market Drivers are the primary challenges to rhythm governance.',
    correctionProtocols: [
      'Governance Restoration',
      'Governance Synchronisation',
      'Governance Amplification',
      'Governance Alignment',
      'Governance Improvement',
      'Governance Lock-In',
    ],
    backHref: '/r27-peak-performance-cadence',
    backLabel: 'Peak Performance Cadence',
    nextHref: '/r29-executive-cadence-report',
    nextLabel: 'Executive Cadence Report',
  },
  R29: {
    id: 'R29',
    seriesName: 'R-Series — Cadence Intelligence',
    engineName: 'Executive Cadence Report',
    purpose:
      "The executive summary of your organization's rhythm — pace, drift, and risk in the few numbers a leadership meeting actually needs.",
    dimensionLabels: [
      'Executive Cadence Clarity',
      'Executive Cadence Consistency',
      'Executive Alignment',
      'Board-Level Readiness',
    ],
    driverContext:
      'All seven drivers must be at executive level for R29 to register completion. Direction Drivers and Identity Drivers are the final determinants of executive achievement.',
    correctionProtocols: [
      'Executive Preparation',
      'Executive Synchronisation',
      'Executive Amplification',
      'Executive Alignment',
      'Executive Improvement',
      'Executive Lock-In',
    ],
    backHref: '/r28-cadence-governance-console',
    backLabel: 'Cadence Governance Console',
    nextHref: '/r30-enterprise-cadence-overview',
    nextLabel: 'Enterprise Cadence Overview',
  },
  R30: {
    id: 'R30',
    seriesName: 'R-Series — Cadence Intelligence',
    engineName: 'Enterprise Cadence Overview',
    purpose:
      'The complete picture of your enterprise timing — how every rhythm rolls up, where the organisation beats in sync, and where it fights itself.',
    dimensionLabels: [
      'Foundational Alignment',
      'Cross-Team Alignment',
      'Timing Alignment',
      'Enterprise-Wide Alignment',
    ],
    driverContext:
      'All seven drivers contribute equally to completeness. The absence of completeness in any driver creates a gap that undermines the whole.',
    correctionProtocols: [
      'Completeness Stabilisation',
      'Completeness Synchronisation',
      'Completeness Amplification',
      'Unity Restoration',
      'Completeness Improvement',
      'Completeness Lock-In',
    ],
    backHref: '/r29-executive-cadence-report',
    backLabel: 'Executive Cadence Report',
    nextHref: '/intelligence-hub',
    nextLabel: 'Intelligence Hub',
  },

  /* ── C-SERIES — CORE console pages ─────────────────
     Verified against ProdLamid's own source: these 8 core-*.tsx pages
     each reference MODULE_REGISTRY["C0x"], and none of those codes
     exist there either — same gap as G06/A07, just larger. CORE's
     depth sits almost entirely in the 178 real Q/R/S/P/X/Z modules
     below; these 8 are the suite-level console pages that sit above
     them, so each gets its own standalone entry-point assessment in
     that console's specific domain rather than literally aggregating
     the sub-series (a different compute shape this registry doesn't
     model, and not what any of the other consoles do either). */
  C02: {
    id: 'C02',
    seriesName: 'C-Series — CORE Console',
    engineName: 'Workflow Intelligence',
    purpose:
      'Scores how well work actually moves through your organisation — handoffs, bottlenecks, and where process breaks down under real load.',
    dimensionLabels: [
      'Process Definition Clarity',
      'Handoff Efficiency',
      'Bottleneck Visibility',
      'Workflow Compliance',
    ],
    driverContext:
      'Structural Drivers determine whether process is actually followed. Timing Drivers reveal where handoffs stall. Human Drivers govern whether people work around the process or through it.',
    correctionProtocols: [
      'Workflow Stabilisation',
      'Handoff Redesign',
      'Bottleneck Resolution',
      'Compliance Improvement',
      'Workflow Amplification',
      'Process Lock-In',
    ],
    backHref: '/suites/core',
    backLabel: 'LAMID CORE',
    nextHref: '/core-diagnostic',
    nextLabel: 'Core Diagnostic',
  },
  C03: {
    id: 'C03',
    seriesName: 'C-Series — CORE Console',
    engineName: 'Core Diagnostic',
    purpose:
      'The single-score read on CORE as a whole — decision quality, execution cadence and governance posture combined into one number before you go deep on any one of them.',
    dimensionLabels: [
      'Decision Health',
      'Execution Cadence',
      'Governance Posture',
      'Strategic Coherence',
    ],
    driverContext:
      "All seven drivers contribute to this composite read. Direction Drivers set what 'coherent' means for this organisation. Identity Drivers determine how honestly the other three dimensions get scored.",
    correctionProtocols: [
      'Diagnostic Stabilisation',
      'Decision Improvement',
      'Cadence Correction',
      'Governance Reinforcement',
      'Coherence Amplification',
      'Core Lock-In',
    ],
    backHref: '/core-workflow',
    backLabel: 'Workflow Intelligence',
    nextHref: '/core-transformation',
    nextLabel: 'Transformation Console',
  },
  C04: {
    id: 'C04',
    seriesName: 'C-Series — CORE Console',
    engineName: 'Transformation Console',
    purpose:
      'Rolls transformation pace and stability up into one executive read — is change actually landing, or just being announced.',
    dimensionLabels: [
      'Transformation Velocity',
      'Adoption Depth',
      'Stability Under Change',
      'Value Realisation',
    ],
    driverContext:
      'Timing Drivers govern velocity. Cultural Drivers determine whether adoption is genuine or performed. Direction Drivers define what value the transformation was for in the first place.',
    correctionProtocols: [
      'Transformation Stabilisation',
      'Adoption Acceleration',
      'Stability Reinforcement',
      'Value Realisation Improvement',
      'Velocity Amplification',
      'Transformation Lock-In',
    ],
    backHref: '/core-diagnostic',
    backLabel: 'Core Diagnostic',
    nextHref: '/core-operating-rhythm',
    nextLabel: 'Operating Rhythm Console',
  },
  C05: {
    id: 'C05',
    seriesName: 'C-Series — CORE Console',
    engineName: 'Operating Rhythm Console',
    purpose:
      'The executive view of delivery tempo across every team — where cadence holds, where it is drifting, and what that is costing.',
    dimensionLabels: [
      'Cross-Team Cadence Fit',
      'Rhythm Consistency',
      'Drift Exposure',
      'Recovery Speed',
    ],
    driverContext:
      'Timing Drivers are the primary signal here. Structural Drivers determine whether teams can even keep the same rhythm. Direction Drivers set the tempo the organisation should be running at.',
    correctionProtocols: [
      'Rhythm Stabilisation',
      'Cadence Synchronisation',
      'Drift Correction',
      'Recovery Improvement',
      'Consistency Amplification',
      'Rhythm Lock-In',
    ],
    backHref: '/core-transformation',
    backLabel: 'Transformation Console',
    nextHref: '/core-strategic-alignment',
    nextLabel: 'Strategic Alignment Console',
  },
  C06: {
    id: 'C06',
    seriesName: 'C-Series — CORE Console',
    engineName: 'Operating Model Blueprint',
    purpose:
      'Assesses how well your operating model — structure, decision rights, delivery rhythm — actually fits the strategy it is meant to carry.',
    dimensionLabels: [
      'Structural Fit',
      'Decision Rights Clarity',
      'Capacity Alignment',
      'Model Adaptability',
    ],
    inputs: { kind: 'roadmap' },
    driverContext:
      'Structural Drivers are the model itself. Direction Drivers define what the model has to be fit for. Identity Drivers determine how much resistance a redesign will meet.',
    correctionProtocols: [
      'Blueprint Stabilisation',
      'Structural Realignment',
      'Decision Rights Clarification',
      'Capacity Correction',
      'Adaptability Improvement',
      'Model Lock-In',
    ],
    backHref: '/core-strategic-alignment',
    backLabel: 'Strategic Alignment Console',
    nextHref: '/core-change-management',
    nextLabel: 'Change Management Console',
  },
  C07: {
    id: 'C07',
    seriesName: 'C-Series — CORE Console',
    engineName: 'Strategic Alignment Console',
    purpose:
      'Checks whether strategy, priorities and the work actually being done are still the same thing, or have quietly diverged.',
    dimensionLabels: [
      'Priority Coherence',
      'Resource-Strategy Fit',
      'Cascade Clarity',
      'Alignment Durability',
    ],
    driverContext:
      'Direction Drivers set the strategy being aligned to. Structural Drivers determine whether resourcing actually follows it. Cultural Drivers govern how the strategy cascades below the top team.',
    correctionProtocols: [
      'Alignment Stabilisation',
      'Priority Correction',
      'Resource Realignment',
      'Cascade Improvement',
      'Durability Amplification',
      'Strategic Lock-In',
    ],
    backHref: '/core-operating-rhythm',
    backLabel: 'Operating Rhythm Console',
    nextHref: '/core-blueprint',
    nextLabel: 'Operating Model Blueprint',
  },
  C08: {
    id: 'C08',
    seriesName: 'C-Series — CORE Console',
    engineName: 'Change Management Console',
    purpose:
      'Scores the health of a change programme itself — sponsorship, adoption, resistance and sustainment — separately from whether the change was the right call.',
    dimensionLabels: [
      'Sponsorship Strength',
      'Adoption Rate',
      'Resistance Management',
      'Sustainment Readiness',
    ],
    driverContext:
      'Identity Drivers reveal how much sponsors are actually willing to spend on this. Cultural Drivers govern resistance. Timing Drivers determine whether the programme is sequenced to actually stick.',
    correctionProtocols: [
      'Change Stabilisation',
      'Sponsorship Reinforcement',
      'Adoption Acceleration',
      'Resistance Resolution',
      'Sustainment Improvement',
      'Change Lock-In',
    ],
    backHref: '/core-blueprint',
    backLabel: 'Operating Model Blueprint',
    nextHref: '/core-executive-console',
    nextLabel: 'Executive Console',
  },
  C09: {
    id: 'C09',
    seriesName: 'C-Series — CORE Console',
    engineName: 'Executive Console',
    purpose:
      'One board-level score combining decision quality, delivery confidence, risk exposure and governance assurance — the number a director asks for before the detail.',
    dimensionLabels: [
      'Decision Quality',
      'Delivery Confidence',
      'Risk Exposure',
      'Governance Assurance',
    ],
    driverContext:
      'All seven drivers roll up here. Direction Drivers set what the board should actually be worried about. Identity Drivers determine whether this reads as an honest score or a managed one.',
    correctionProtocols: [
      'Executive Stabilisation',
      'Decision Reinforcement',
      'Confidence Building',
      'Risk Mitigation',
      'Assurance Improvement',
      'Executive Lock-In',
    ],
    backHref: '/core-change-management',
    backLabel: 'Change Management Console',
    nextHref: '/suites/core',
    nextLabel: 'LAMID CORE',
  },

  /* ── Q-SERIES — Decision Intelligence ─────────────── */
  Q01: {
    id: 'Q01',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision Landscape Mapping',
    purpose:
      'Maps every significant decision in play across your organization — who owns each, what it blocks, and which ones actually deserve executive attention.',
    dimensionLabels: [
      'Decision Field Clarity',
      'Possibility Space Width',
      'Field Coherence',
      'Decision Readiness',
    ],
    driverContext:
      'Identity Drivers anchor the decision field. Direction Drivers reveal the highest-probability paths. All seven drivers simultaneously inhabit and shape the decision field.',
    correctionProtocols: [
      'Impact Stabilisation',
      'Impact Synchronisation',
      'Impact Amplification',
      'Impact Alignment',
      'Impact Improvement',
      'Impact Lock-In',
    ],
    backHref: '/intelligence-hub',
    backLabel: 'Intelligence Hub',
    nextHref: '/q02-current-decision-status',
    nextLabel: 'Current Decision Status',
  },
  Q02: {
    id: 'Q02',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Current Decision Status',
    purpose:
      "Shows the live status of your decisions in progress — what's decided, what's stuck, and what's waiting on whom.",
    dimensionLabels: [
      'Live Decisions',
      'Stalled Decisions',
      'In-Transition Decisions',
      'Committed Decisions',
    ],
    driverContext:
      'Identity Drivers determine which decisions get taken up at all. Direction Drivers show which of them move the organisation toward its stated strategy. Every driver shapes the mix at once.',
    correctionProtocols: [
      'State Stabilisation',
      'State Synchronisation',
      'State Amplification',
      'State Alignment',
      'State Improvement',
      'State Lock-In',
    ],
    backHref: '/q01-decision-landscape-mapping',
    backLabel: 'Decision Landscape Mapping',
    nextHref: '/q03-decision-path-simulator',
    nextLabel: 'Decision Path Simulator',
  },
  Q03: {
    id: 'Q03',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision Path Simulator',
    purpose:
      'Simulates the paths a decision could take — playing your options forward so you see the second-order effects before committing.',
    dimensionLabels: [
      'Primary Decision Paths',
      'Branching Junctions',
      'Dead-End Paths',
      'Long-Term Paths',
    ],
    inputs: { kind: 'scenario-decision' },
    driverContext:
      'Direction Drivers clarify the stated strategy. Market Drivers expose which paths are viable. Identity Drivers determine which paths the enterprise can actually traverse.',
    correctionProtocols: [
      'Path Stabilisation',
      'Path Synchronisation',
      'Path Amplification',
      'Path Alignment',
      'Path Improvement',
      'Path Lock-In',
    ],
    backHref: '/q02-current-decision-status',
    backLabel: 'Current Decision Status',
    nextHref: '/q04-outcome-probability',
    nextLabel: 'Outcome Probability Engine',
  },
  Q04: {
    id: 'Q04',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Outcome Probability',
    purpose:
      'Puts probabilities on outcomes — so your options are compared on likelihood-weighted value, not on whoever argued loudest.',
    dimensionLabels: [
      'High-Probability Outcomes',
      'Speculative Outcomes',
      'Probability Distortions',
      'Long-Term Probability Index',
    ],
    driverContext:
      'Market Drivers supply the most probability data. Direction Drivers reveal where probability and stated strategy converge. Timing Drivers govern when probability windows open and close.',
    correctionProtocols: [
      'Probability Stabilisation',
      'Probability Synchronisation',
      'Probability Amplification',
      'Probability Alignment',
      'Probability Improvement',
      'Probability Lock-In',
    ],
    backHref: '/q03-decision-path-simulator',
    backLabel: 'Decision Path Simulator',
    nextHref: '/q05-decision-timing-diagnostic',
    nextLabel: 'Decision Timing Optimizer',
  },
  Q05: {
    id: 'Q05',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision Timing Diagnostic',
    purpose:
      'Diagnoses whether now is the right time to decide — weighing the cost of deciding early against the cost of waiting.',
    dimensionLabels: [
      'Decision Timing Accuracy',
      'Early Decision Risk',
      'Late Decision Cost',
      'Optimal Timing Windows',
    ],
    driverContext:
      "Timing Drivers carry the most weight in this module. The R-Series rhythm intelligence feeds directly into timing. Identity Drivers determine the enterprise's natural decision tempo.",
    correctionProtocols: [
      'Timing Stabilisation',
      'Timing Synchronisation',
      'Timing Amplification',
      'Timing Alignment',
      'Timing Improvement',
      'Timing Lock-In',
    ],
    backHref: '/q04-outcome-probability',
    backLabel: 'Outcome Probability Engine',
    nextHref: '/q06-conflicting-priorities-detector',
    nextLabel: 'Conflicting Priorities Detector',
  },
  Q06: {
    id: 'Q06',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Conflicting Priorities Detector',
    purpose:
      'Detects decisions and priorities working against each other — two teams solving opposite problems with the same budget.',
    dimensionLabels: [
      'Constructive Interference Zones',
      'Destructive Interference Zones',
      'Signal Conflict Sources',
      'Interference Resolution Pathways',
    ],
    inputs: { kind: 'conflict' },
    driverContext:
      'Cultural Drivers create the most persistent interference patterns. Identity Drivers and Market Drivers generate signals that can either constructively amplify or destructively cancel each other.',
    correctionProtocols: [
      'Interference Stabilisation',
      'Interference Resolution',
      'Interference Amplification',
      'Signal Alignment',
      'Interference Improvement',
      'Interference Lock-In',
    ],
    backHref: '/q05-decision-timing-diagnostic',
    backLabel: 'Decision Timing Optimizer',
    nextHref: '/q07-decision-consistency-check',
    nextLabel: 'Decision Consistency Check',
  },
  Q07: {
    id: 'Q07',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision Consistency Check',
    purpose:
      "Checks new decisions against the ones you've already made — so today's call doesn't quietly reverse last quarter's.",
    dimensionLabels: [
      'Decision Field Coherence',
      'Cross-Level Coherence',
      'Timing Coherence',
      'Long-Term Coherence',
    ],
    driverContext:
      'Identity Drivers create the foundation of coherence. Cultural Drivers determine whether coherence is maintained under pressure. Direction Drivers reveal the coherence ceiling the enterprise is capable of reaching.',
    correctionProtocols: [
      'Coherence Stabilisation',
      'Coherence Synchronisation',
      'Coherence Amplification',
      'Coherence Alignment',
      'Coherence Improvement',
      'Coherence Lock-In',
    ],
    backHref: '/q06-conflicting-priorities-detector',
    backLabel: 'Conflicting Priorities Detector',
    nextHref: '/q08-decision-finalization',
    nextLabel: 'Decision Finalization',
  },
  Q08: {
    id: 'Q08',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision Finalization',
    purpose:
      'Closes decisions properly — recorded rationale, a named owner, and a definition of done, so nothing gets relitigated at the next meeting.',
    dimensionLabels: [
      'Commitment Triggers',
      'Commitment Timing',
      'Reactive Commitments',
      'Executive-Led Finalisations',
    ],
    driverContext:
      'Timing Drivers govern commitment timing. Identity Drivers determine whether commitment is deliberate or forced. Direction Drivers reveal whether each commitment moves the enterprise toward or away from its stated strategy.',
    correctionProtocols: [
      'Commitment Stabilisation',
      'Commitment Synchronisation',
      'Commitment Amplification',
      'Commitment Alignment',
      'Commitment Improvement',
      'Commitment Lock-In',
    ],
    backHref: '/q07-decision-consistency-check',
    backLabel: 'Decision Consistency Check',
    nextHref: '/q09-option-selection-assistant',
    nextLabel: 'Option Selection Assistant',
  },
  Q09: {
    id: 'Q09',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Option Selection Assistant',
    purpose:
      'Structures the choice between options — criteria, weights, and scores in the open, so your selection survives scrutiny.',
    dimensionLabels: [
      'Selection Criteria Quality',
      'Selection Bias Patterns',
      'Strategic Selection Alignment',
      'Executive Selection Index',
    ],
    driverContext:
      "Identity Drivers shape selection criteria at the underlying level. Market Drivers provide the external filter. Direction Drivers reveal which selections are aligned with the enterprise's highest path.",
    correctionProtocols: [
      'Selection Stabilisation',
      'Selection Synchronisation',
      'Selection Amplification',
      'Selection Alignment',
      'Selection Improvement',
      'Selection Lock-In',
    ],
    backHref: '/q08-decision-finalization',
    backLabel: 'Decision Finalization',
    nextHref: '/q10-multi-factor-decision-view',
    nextLabel: 'Multi-Factor Decision View',
  },
  Q10: {
    id: 'Q10',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Multi-Factor Decision View',
    purpose:
      'Weighs a decision across every factor at once — financial, operational, people, and risk — instead of the single lens it arrived in.',
    dimensionLabels: [
      'Visible Decision Dimensions',
      'Hidden Dimensions',
      'Timing Dimensions',
      'Long-Term Dimensions',
    ],
    driverContext:
      'Direction Drivers unlock the underlying decision dimensions. Identity Drivers determine which dimensions the enterprise is capable of perceiving and operating within.',
    correctionProtocols: [
      'Dimension Stabilisation',
      'Dimension Synchronisation',
      'Dimension Amplification',
      'Dimension Alignment',
      'Dimension Improvement',
      'Dimension Lock-In',
    ],
    backHref: '/q09-option-selection-assistant',
    backLabel: 'Option Selection Assistant',
    nextHref: '/q11-scenario-reality-check',
    nextLabel: 'Scenario Reality Check',
  },
  Q11: {
    id: 'Q11',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Scenario Reality Check',
    purpose:
      'Stress-tests a scenario against reality — the assumptions it needs to be true, and which of them your own data already contradicts.',
    dimensionLabels: [
      'Objective Decision Reality',
      'Perceived Reality Gaps',
      'Assumption Layers',
      'Reality Calibration Index',
    ],
    driverContext:
      'Market Drivers supply the most reality-grounding data. Identity Drivers determine reality tolerance. Direction Drivers reveal whether the enterprise is aligned with the reality of its authentic future.',
    correctionProtocols: [
      'Reality Stabilisation',
      'Reality Synchronisation',
      'Reality Amplification',
      'Perception Correction',
      'Reality Improvement',
      'Reality Lock-In',
    ],
    backHref: '/q10-multi-factor-decision-view',
    backLabel: 'Multi-Factor Decision View',
    nextHref: '/q12-full-scenario-explorer',
    nextLabel: 'Full Scenario Explorer',
  },
  Q12: {
    id: 'Q12',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Full Scenario Explorer',
    purpose:
      'Explores the full range of scenarios — best case, worst case, and the messy middle — with the consequences of each laid side by side.',
    dimensionLabels: [
      'Known Decision Scope',
      'Unknown Decision Scope',
      'Out-of-Bounds Decision Zones',
      'Long-Term Decision Scope',
    ],
    driverContext:
      'Direction Drivers expand the decision scope toward its intended scope. Market Drivers constrain it. Identity Drivers determine which parts of that scope the enterprise can access.',
    correctionProtocols: [
      'Scope Stabilisation',
      'Scope Synchronisation',
      'Scope Amplification',
      'Scope Alignment',
      'Scope Improvement',
      'Scope Lock-In',
    ],
    backHref: '/q11-scenario-reality-check',
    backLabel: 'Scenario Reality Check',
    nextHref: '/q13-root-cause-tracer',
    nextLabel: 'Root Cause Tracer',
  },
  Q13: {
    id: 'Q13',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Root Cause Tracer',
    purpose:
      'Traces a problem to its root cause — following the chain past the symptoms so your fix lands where the problem starts.',
    dimensionLabels: [
      'Identity-Origin Decisions',
      'Market-Origin Decisions',
      'Culture-Origin Decisions',
      'Long-Term-Origin Decisions',
    ],
    driverContext:
      'Identity Drivers contain the underlying origin codes. Direction Drivers reveal whether decisions originate from authentic calling or external pressure. Cultural Drivers shape unconscious decision origins.',
    correctionProtocols: [
      'Origin Stabilisation',
      'Origin Synchronisation',
      'Origin Amplification',
      'Origin Alignment',
      'Origin Improvement',
      'Origin Lock-In',
    ],
    backHref: '/q12-full-scenario-explorer',
    backLabel: 'Full Scenario Explorer',
    nextHref: '/q14-data-source-validator',
    nextLabel: 'Data Source Validator',
  },
  Q14: {
    id: 'Q14',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Data Source Validator',
    purpose:
      "Validates the data behind a decision — where it came from, how fresh it is, and whether it can carry the weight you're about to put on it.",
    dimensionLabels: [
      'Data Source Quality',
      'Intuitive Source Depth',
      'External Source Reliability',
      'Long-Term Source Clarity',
    ],
    driverContext:
      'All seven drivers contribute source intelligence. Market Drivers supply external source data. Identity and Direction Drivers supply internal source wisdom. Cultural Drivers filter and amplify certain sources over others.',
    correctionProtocols: [
      'Source Stabilisation',
      'Source Synchronisation',
      'Source Amplification',
      'Source Alignment',
      'Source Improvement',
      'Source Lock-In',
    ],
    backHref: '/q13-root-cause-tracer',
    backLabel: 'Root Cause Tracer',
    nextHref: '/q15-early-warning-signals',
    nextLabel: 'Early Warning Signals',
  },
  Q15: {
    id: 'Q15',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Early Warning Signals',
    purpose:
      "Surfaces the early signals of trouble — the leading indicators that move weeks before your results do, while there's still time to act.",
    dimensionLabels: [
      'Signal Clarity',
      'Noise-to-Signal Ratio',
      'Missing Signal Detection',
      'Long-Term Signal Strength',
    ],
    driverContext:
      'Market Drivers generate the highest volume of signals. Identity Drivers determine which signals are attended to. Direction Drivers emit the most important signals — often the quietest and most easily missed.',
    correctionProtocols: [
      'Signal Stabilisation',
      'Signal Synchronisation',
      'Signal Amplification',
      'Noise Reduction',
      'Signal Improvement',
      'Signal Lock-In',
    ],
    backHref: '/q14-data-source-validator',
    backLabel: 'Data Source Validator',
    nextHref: '/q16-decision-recurrence-tracker',
    nextLabel: 'Decision Recurrence Tracker',
  },
  Q16: {
    id: 'Q16',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision Recurrence Tracker',
    purpose:
      'Spots the decisions you keep making again — the same call resurfacing every quarter because it was never resolved at the root.',
    dimensionLabels: [
      'Strategic Decision Frequency',
      'Operational Decision Frequency',
      'Reactive Decision Frequency',
      'Optimal Frequency Windows',
    ],
    driverContext:
      'Timing Drivers govern decision frequency most directly. Identity Drivers set the natural frequency baseline. Market Drivers force frequency acceleration or deceleration based on external pressure.',
    correctionProtocols: [
      'Frequency Stabilisation',
      'Frequency Synchronisation',
      'Frequency Amplification',
      'Frequency Alignment',
      'Frequency Improvement',
      'Frequency Lock-In',
    ],
    backHref: '/q15-early-warning-signals',
    backLabel: 'Early Warning Signals',
    nextHref: '/q17-stakeholder-alignment-score',
    nextLabel: 'Stakeholder Alignment Score',
  },
  Q17: {
    id: 'Q17',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Stakeholder Alignment Score',
    purpose:
      'Scores how aligned your stakeholders really are on a decision — surfacing quiet dissent before it becomes slow execution.',
    dimensionLabels: [
      'Internal Alignment',
      'Market Alignment',
      'Cultural Alignment',
      'Long-Term Alignment',
    ],
    driverContext:
      'Identity Drivers create the underlying alignment frequency. Direction Drivers determine whether alignment is building toward authentic amplification. Cultural Drivers propagate or dampen alignment across the enterprise.',
    correctionProtocols: [
      'Alignment Stabilisation',
      'Alignment Synchronisation',
      'Alignment Amplification',
      'Alignment Alignment',
      'Alignment Improvement',
      'Alignment Lock-In',
    ],
    backHref: '/q16-decision-recurrence-tracker',
    backLabel: 'Decision Recurrence Tracker',
    nextHref: '/q18-cross-team-consistency-check',
    nextLabel: 'Cross-Team Consistency Check',
  },
  Q18: {
    id: 'Q18',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Cross-Team Consistency Check',
    purpose:
      'Checks that different teams facing the same question decide it the same way — so your customers get one answer, not four.',
    dimensionLabels: [
      'Cross-Team Decision Consistency',
      'Reinforcing Decision Pairs',
      'Conflicting Decision Clusters',
      'Reconciliation Priority Index',
    ],
    driverContext:
      'Cultural Drivers produce the most cross-team conflict. Identity Drivers set the shared standard decisions are measured against. Market Drivers introduce outside pressure that can pull teams in different directions.',
    correctionProtocols: [
      'Consistency Stabilisation',
      'Consistency Synchronisation',
      'Consistency Amplification',
      'Conflict Resolution',
      'Consistency Improvement',
      'Consistency Lock-In',
    ],
    backHref: '/q17-stakeholder-alignment-score',
    backLabel: 'Stakeholder Alignment Score',
    nextHref: '/q19-sentiment-adjusted-assessment',
    nextLabel: 'Sentiment-Adjusted Scoring',
  },
  Q19: {
    id: 'Q19',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Sentiment-Adjusted Assessment',
    purpose:
      'Adjusts assessments for the mood in the room — separating what your data says from how people feel about it.',
    dimensionLabels: [
      'Decision Tone Inventory',
      'Authority Tone Prevalence',
      'Fear-Driven Tone Detection',
      'Long-Term Tone Alignment',
    ],
    driverContext:
      'Identity Drivers set the natural decision tone. Cultural Drivers reinforce or distort tone. Direction Drivers emit a executive tone that the enterprise must learn to match in its own decisions.',
    correctionProtocols: [
      'Tonality Stabilisation',
      'Tonality Synchronisation',
      'Tonality Amplification',
      'Tonality Alignment',
      'Tonality Improvement',
      'Tonality Lock-In',
    ],
    backHref: '/q18-cross-team-consistency-check',
    backLabel: 'Cross-Team Consistency Check',
    nextHref: '/q20-context-insight-layer',
    nextLabel: 'Context Insight Layer',
  },
  Q20: {
    id: 'Q20',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Context Insight Layer',
    purpose:
      'Adds the context a decision is missing — market conditions, history, and constraints — so you decide with the full picture.',
    dimensionLabels: [
      'Decision Clarity Texture',
      'Execution Reception Quality',
      'Organisational Energy Impact',
      'Executive Decision Texture',
    ],
    driverContext:
      'Human Drivers create the richest texture data. Cultural Drivers determine texture propagation. Identity Drivers shape the underlying texture character that persists across decision types.',
    correctionProtocols: [
      'Texture Stabilisation',
      'Texture Synchronisation',
      'Texture Amplification',
      'Texture Alignment',
      'Texture Improvement',
      'Texture Lock-In',
    ],
    backHref: '/q19-sentiment-adjusted-assessment',
    backLabel: 'Sentiment-Adjusted Scoring',
    nextHref: '/q21-decision-framework-builder',
    nextLabel: 'Decision Framework Builder',
  },
  Q21: {
    id: 'Q21',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision Framework Builder',
    purpose:
      'Builds reusable decision frameworks — so your recurring choices follow a tested structure instead of starting from scratch each time.',
    dimensionLabels: [
      'Decision Structure Quality',
      'Communication Form Effectiveness',
      'Form-Substance Alignment',
      'Executive Decision Form',
    ],
    inputs: { kind: 'selection' },
    driverContext:
      'Structural Drivers determine form frameworks. Identity Drivers shape authentic form character. Cultural Drivers determine how form is received. Direction Drivers reveal the ideal form for each decision level.',
    correctionProtocols: [
      'Form Stabilisation',
      'Form Synchronisation',
      'Form Amplification',
      'Form Alignment',
      'Form Improvement',
      'Form Lock-In',
    ],
    backHref: '/q20-context-insight-layer',
    backLabel: 'Context Insight Layer',
    nextHref: '/q22-decision-structure-mapper',
    nextLabel: 'Decision Structure Mapper',
  },
  Q22: {
    id: 'Q22',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision Structure Mapper',
    purpose:
      'Maps how a complex decision breaks into parts — dependencies, sequence, and owners — before anyone commits to the whole.',
    dimensionLabels: [
      'Decision Hierarchy Clarity',
      'Committee Effectiveness',
      'Process Architecture Quality',
      'Structural Decision Bottlenecks',
    ],
    driverContext:
      'Structural Drivers are primary here. Identity Drivers determine whether structure is authentic to the enterprise. Cultural Drivers determine whether formal structure matches actual decision behaviour.',
    correctionProtocols: [
      'Structure Stabilisation',
      'Structure Synchronisation',
      'Structure Amplification',
      'Structure Alignment',
      'Structure Improvement',
      'Structure Lock-In',
    ],
    backHref: '/q21-decision-framework-builder',
    backLabel: 'Decision Framework Builder',
    nextHref: '/q23-decision-architecture-console',
    nextLabel: 'Decision Architecture Console',
  },
  Q23: {
    id: 'Q23',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision Architecture Console',
    purpose:
      'The control panel for how your organization decides — its frameworks, thresholds, and escalation paths in one place.',
    dimensionLabels: [
      'Decision Architecture Completeness',
      'Layer Integration Quality',
      'Tool-Process Coherence',
      'Executive Architecture Index',
    ],
    driverContext:
      'All seven drivers contribute to the architecture. Structural Drivers provide the framework. Direction Drivers reveal the architecture the enterprise is meant to operate through. Identity Drivers determine architectural authenticity.',
    correctionProtocols: [
      'Architecture Stabilisation',
      'Architecture Synchronisation',
      'Architecture Amplification',
      'Architecture Alignment',
      'Architecture Improvement',
      'Architecture Lock-In',
    ],
    backHref: '/q22-decision-structure-mapper',
    backLabel: 'Decision Structure Mapper',
    nextHref: '/q24-decision-model-diagnostic',
    nextLabel: 'Decision Model Designer',
  },
  Q24: {
    id: 'Q24',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision Model Diagnostic',
    purpose:
      'Tests whether your decision models still fit reality — and retires the ones the market has moved past.',
    dimensionLabels: [
      'Decision Design Intentionality',
      'Process Design Quality',
      'Outcome-Oriented Design',
      'Executive Design Index',
    ],
    driverContext:
      'Identity Drivers encode design preferences. Cultural Drivers determine whether good design is valued. Direction Drivers reveal the design standards the enterprise must achieve to fulfil its purpose.',
    correctionProtocols: [
      'Design Stabilisation',
      'Design Synchronisation',
      'Design Amplification',
      'Design Alignment',
      'Design Improvement',
      'Design Lock-In',
    ],
    backHref: '/q23-decision-architecture-console',
    backLabel: 'Decision Architecture Console',
    nextHref: '/q25-recurring-pattern-detector',
    nextLabel: 'Recurring Pattern Detector',
  },
  Q25: {
    id: 'Q25',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Recurring Pattern Detector',
    purpose:
      'Detects the patterns in your decision history — the setups that consistently precede wins, and the ones that precede write-offs.',
    dimensionLabels: [
      'Constructive Decision Patterns',
      'Destructive Decision Patterns',
      'Pattern Frequency Analysis',
      'Long-Term Pattern Alignment',
    ],
    driverContext:
      'Cultural Drivers create the most persistent patterns. Identity Drivers encode pattern origins. Timing Drivers reveal pattern timing and recurrence frequency. Direction Drivers show which patterns must be preserved and which must be broken.',
    correctionProtocols: [
      'Pattern Stabilisation',
      'Pattern Synchronisation',
      'Pattern Amplification',
      'Pattern Break',
      'Pattern Improvement',
      'Pattern Lock-In',
    ],
    backHref: '/q24-decision-model-diagnostic',
    backLabel: 'Decision Model Designer',
    nextHref: '/q26-decision-signature-report',
    nextLabel: 'Decision Signature Report',
  },
  Q26: {
    id: 'Q26',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision Signature Report',
    purpose:
      "Reports your organization's decision signature — how it characteristically decides: fast or slow, top-down or consensus, bold or safe.",
    dimensionLabels: [
      'Decision Signature Clarity',
      'Signature Consistency',
      'Signature Differentiation',
      'Executive Signature Expression',
    ],
    driverContext:
      "Identity Drivers are the primary signature creators. Cultural Drivers either reinforce or dilute the signature. Direction Drivers reveal the fullest expression of the enterprise's decision signature.",
    correctionProtocols: [
      'Signature Stabilisation',
      'Signature Synchronisation',
      'Signature Amplification',
      'Signature Alignment',
      'Signature Improvement',
      'Signature Lock-In',
    ],
    backHref: '/q25-recurring-pattern-detector',
    backLabel: 'Recurring Pattern Detector',
    nextHref: '/q27-decision-maker-profile',
    nextLabel: 'Decision-Maker Profile',
  },
  Q27: {
    id: 'Q27',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision-Maker Profile',
    purpose:
      'Profiles your individual decision-makers — their speed, their biases, their hit rate — so assignments match strengths.',
    dimensionLabels: [
      'Decision Identity Clarity',
      'Decision Character Stability',
      'Identity-Decision Alignment',
      'Executive Decision Identity',
    ],
    driverContext:
      'Identity Drivers carry the most weight in this module. Direction Drivers reveal the fullest decision identity the enterprise is called to embody. Cultural Drivers determine how identity is expressed through daily decision behaviour.',
    correctionProtocols: [
      'Identity Stabilisation',
      'Identity Synchronisation',
      'Identity Amplification',
      'Identity Alignment',
      'Identity Improvement',
      'Identity Lock-In',
    ],
    backHref: '/q26-decision-signature-report',
    backLabel: 'Decision Signature Report',
    nextHref: '/q28-stakeholder-persona-mapping',
    nextLabel: 'Stakeholder Persona Mapping',
  },
  Q28: {
    id: 'Q28',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Stakeholder Persona Mapping',
    purpose:
      'Maps the stakeholders around a decision — what each one cares about, and what each one needs in order to say yes.',
    dimensionLabels: [
      'Projected Decision Persona',
      'Authentic Decision Persona',
      'Persona-Identity Gap',
      'Executive Persona Expression',
    ],
    driverContext:
      'Identity Drivers create authentic persona. Market Drivers shape the perceived persona. Cultural Drivers determine the gap between authentic and performed decision persona.',
    correctionProtocols: [
      'Persona Stabilisation',
      'Persona Synchronisation',
      'Persona Amplification',
      'Persona Alignment',
      'Persona Improvement',
      'Persona Lock-In',
    ],
    backHref: '/q27-decision-maker-profile',
    backLabel: 'Decision-Maker Profile',
    nextHref: '/q29-decision-role-assignment',
    nextLabel: 'Decision Role Assignment',
  },
  Q29: {
    id: 'Q29',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision Role Assignment',
    purpose:
      "Assigns clear roles on every decision — who decides, who's consulted, who's informed — so nothing dies of ambiguity.",
    dimensionLabels: [
      'Decision Role Clarity',
      'Role-Authority Alignment',
      'Role Capability Match',
      'Executive Role Design',
    ],
    driverContext:
      'Structural Drivers define formal roles. Identity Drivers determine whether people inhabit their roles authentically. Cultural Drivers determine how roles are respected. Direction Drivers reveal the role architecture the enterprise needs for its future.',
    correctionProtocols: [
      'Role Stabilisation',
      'Role Synchronisation',
      'Role Amplification',
      'Role Alignment',
      'Role Improvement',
      'Role Lock-In',
    ],
    backHref: '/q28-stakeholder-persona-mapping',
    backLabel: 'Stakeholder Persona Mapping',
    nextHref: '/q30-decision-function-library',
    nextLabel: 'Decision Function Library',
  },
  Q30: {
    id: 'Q30',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision Function Library',
    purpose:
      "A library of your organization's standard decisions — the calls each unit routinely makes, with the playbook for each.",
    dimensionLabels: [
      'Strategic Decision Function',
      'Operational Decision Function',
      'Financial Decision Function',
      'Crisis Decision Function',
    ],
    driverContext:
      'Structural Drivers govern functional mechanics. Timing Drivers determine function speed and rhythm. Identity Drivers determine function character. Market Drivers test function under real-world conditions.',
    correctionProtocols: [
      'Function Stabilisation',
      'Function Synchronisation',
      'Function Amplification',
      'Function Alignment',
      'Function Improvement',
      'Function Lock-In',
    ],
    backHref: '/q29-decision-role-assignment',
    backLabel: 'Decision Role Assignment',
    nextHref: '/q31-decision-capacity-planner',
    nextLabel: 'Decision Capacity Planner',
  },
  Q31: {
    id: 'Q31',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision Capacity Planner',
    purpose:
      'Plans your decision capacity — how many significant calls your leaders can make well per week, and what to delegate when the queue exceeds it.',
    dimensionLabels: [
      'Decision Volume Capacity',
      'Decision Complexity Tolerance',
      'Decision Frequency Endurance',
      'Capacity Expansion Potential',
    ],
    inputs: { kind: 'roadmap' },
    driverContext:
      'Human Drivers determine capacity most directly. Structural Drivers provide capacity scaffolding. Timing Drivers reveal capacity limits under sustained pressure. Direction Drivers reveal the capacity ceiling the enterprise must build toward.',
    correctionProtocols: [
      'Capacity Stabilisation',
      'Capacity Synchronisation',
      'Capacity Amplification',
      'Capacity Alignment',
      'Capacity Improvement',
      'Capacity Lock-In',
    ],
    backHref: '/q30-decision-function-library',
    backLabel: 'Decision Function Library',
    nextHref: '/q32-team-decision-capability-score',
    nextLabel: 'Team Decision Capability Score',
  },
  Q32: {
    id: 'Q32',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Team Decision Capability Score',
    purpose:
      "Scores each team's ability to decide well without escalating — so autonomy is granted on evidence, not seniority.",
    dimensionLabels: [
      'Strategic Decision Competence',
      'Operational Decision Competence',
      'Leadership Judgement Quality',
      'Competence Development Index',
    ],
    driverContext:
      "Human Drivers are primary — competence lives in people. Identity Drivers reveal the competence character of the enterprise. Direction Drivers identify the competence levels required for the enterprise's highest future.",
    correctionProtocols: [
      'Competence Stabilisation',
      'Competence Synchronisation',
      'Competence Amplification',
      'Competence Alignment',
      'Competence Improvement',
      'Competence Lock-In',
    ],
    backHref: '/q31-decision-capacity-planner',
    backLabel: 'Decision Capacity Planner',
    nextHref: '/q33-decision-making-skill-score',
    nextLabel: 'Decision-Making Skill Score',
  },
  Q33: {
    id: 'Q33',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision-Making Skill Score',
    purpose:
      'Scores individual decision-making skill — judgment, speed, and calibration — so development targets the actual gap.',
    dimensionLabels: [
      'Analytical Decision Skills',
      'Strategic Thinking Skills',
      'Intuitive Judgement Skills',
      'Executive Decision Skills',
    ],
    driverContext:
      'Human Drivers carry skill data. Identity Drivers reveal natural skill affinity. Cultural Drivers determine which skills are valued and developed. Direction Drivers reveal the skill set the enterprise must master.',
    correctionProtocols: [
      'Skill Stabilisation',
      'Skill Synchronisation',
      'Skill Amplification',
      'Skill Alignment',
      'Skill Improvement',
      'Skill Lock-In',
    ],
    backHref: '/q32-team-decision-capability-score',
    backLabel: 'Team Decision Capability Score',
    nextHref: '/q34-best-practice-technique-library',
    nextLabel: 'Best-Practice Technique Library',
  },
  Q34: {
    id: 'Q34',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Best-Practice Technique Library',
    purpose:
      'A library of proven decision techniques — pre-mortems, expected value, decision trees — matched to the situations each one fits.',
    dimensionLabels: [
      'Analytical Techniques',
      'Strategic Techniques',
      'Collaborative Techniques',
      'Executive Decision Techniques',
    ],
    driverContext:
      "Structural Drivers define formal techniques. Identity Drivers shape preferred technique styles. Cultural Drivers determine which techniques are adopted versus resisted. Direction Drivers reveal the techniques needed for the enterprise's future decisions.",
    correctionProtocols: [
      'Technique Stabilisation',
      'Technique Synchronisation',
      'Technique Amplification',
      'Technique Alignment',
      'Technique Improvement',
      'Technique Lock-In',
    ],
    backHref: '/q33-decision-making-skill-score',
    backLabel: 'Decision-Making Skill Score',
    nextHref: '/q35-decision-methodology-selector',
    nextLabel: 'Decision Methodology Selector',
  },
  Q35: {
    id: 'Q35',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision Methodology Selector',
    purpose:
      'Selects the right method for the decision at hand — a reversible call gets an afternoon, a one-way door gets the full treatment.',
    dimensionLabels: [
      'Structured Decision Methods',
      'Adaptive Decision Methods',
      'Intuitive Decision Methods',
      'Executive Decision Methods',
    ],
    inputs: { kind: 'selection' },
    driverContext:
      "Identity Drivers determine method affinity. Cultural Drivers determine which methods are culturally endorsed. Structural Drivers provide the method infrastructure. Direction Drivers reveal the most effective method mix for the enterprise's future.",
    correctionProtocols: [
      'Method Stabilisation',
      'Method Synchronisation',
      'Method Amplification',
      'Method Alignment',
      'Method Improvement',
      'Method Lock-In',
    ],
    backHref: '/q34-best-practice-technique-library',
    backLabel: 'Best-Practice Technique Library',
    nextHref: '/q36-decision-process-tracker',
    nextLabel: 'Decision Process Tracker',
  },
  Q36: {
    id: 'Q36',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision Process Tracker',
    purpose:
      'Tracks decisions through your process — where each one sits, how long each stage takes, and where they queue.',
    dimensionLabels: [
      'Signal-to-Decision Process',
      'Options Analysis Quality',
      'Deliberation Effectiveness',
      'Implementation Review Rigour',
    ],
    driverContext:
      "Structural Drivers create formal process architecture. Timing Drivers govern process speed and rhythm. Cultural Drivers determine whether processes are followed. Identity Drivers determine whether processes reflect the enterprise's authentic decision character.",
    correctionProtocols: [
      'Process Stabilisation',
      'Process Synchronisation',
      'Process Amplification',
      'Process Alignment',
      'Process Improvement',
      'Process Lock-In',
    ],
    backHref: '/q35-decision-methodology-selector',
    backLabel: 'Decision Methodology Selector',
    nextHref: '/q37-decision-workflow-automation',
    nextLabel: 'Decision Workflow Automation',
  },
  Q37: {
    id: 'Q37',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision Workflow Automation',
    purpose:
      "Automates the routine layer of your decision-making — routing, reminders, and approvals — so human judgment is spent only where it's needed.",
    dimensionLabels: [
      'Decision Workflow Mapping',
      'Workflow Bottlenecks',
      'Cross-Function Decision Flow',
      'Executive Workflow Design',
    ],
    driverContext:
      'Structural Drivers create workflow architecture. Human Drivers determine workflow behaviour. Cultural Drivers determine compliance with designed workflows. Timing Drivers reveal workflow speed and delay patterns.',
    correctionProtocols: [
      'Workflow Stabilisation',
      'Workflow Synchronisation',
      'Workflow Amplification',
      'Workflow Alignment',
      'Workflow Improvement',
      'Workflow Lock-In',
    ],
    backHref: '/q36-decision-process-tracker',
    backLabel: 'Decision Process Tracker',
    nextHref: '/q38-enterprise-decision-system',
    nextLabel: 'Enterprise Decision System',
  },
  Q38: {
    id: 'Q38',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Enterprise Decision System',
    purpose:
      'Runs decisions as an enterprise system — one pipeline with standards, visibility, and accountability from proposal to review.',
    dimensionLabels: [
      'System Integration Completeness',
      'Self-Correction Capability',
      'Cross-Layer Decision Coherence',
      'Executive System Maturity',
    ],
    driverContext:
      "All seven drivers are system inputs. Structural Drivers provide the system architecture. Direction Drivers define the system's ultimate performance standard. Identity Drivers determine the system's character and operating philosophy.",
    correctionProtocols: [
      'System Stabilisation',
      'System Synchronisation',
      'System Amplification',
      'System Alignment',
      'System Improvement',
      'System Lock-In',
    ],
    backHref: '/q37-decision-workflow-automation',
    backLabel: 'Decision Workflow Automation',
    nextHref: '/q39-cross-functional-decision-network',
    nextLabel: 'Cross-Functional Decision Network',
  },
  Q39: {
    id: 'Q39',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Cross-Functional Decision Network',
    purpose:
      'Maps the network a decision travels through — which functions touch it, and where it slows down crossing boundaries.',
    dimensionLabels: [
      'Internal Decision Network',
      'External Decision Network',
      'Trust Node Mapping',
      'Network Intelligence Flow',
    ],
    driverContext:
      'Human Drivers create network nodes. Cultural Drivers determine network quality and trust levels. Market Drivers connect the network to external intelligence. Direction Drivers reveal which network connections are strategically vital.',
    correctionProtocols: [
      'Network Stabilisation',
      'Network Synchronisation',
      'Network Amplification',
      'Network Alignment',
      'Network Improvement',
      'Network Lock-In',
    ],
    backHref: '/q38-enterprise-decision-system',
    backLabel: 'Enterprise Decision System',
    nextHref: '/q40-decision-ecosystem-overview',
    nextLabel: 'Decision Ecosystem Overview',
  },
  Q40: {
    id: 'Q40',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision Ecosystem Overview',
    purpose:
      'The overview of your entire decision ecosystem — volume, speed, quality, and risk across the organization.',
    dimensionLabels: [
      'Stakeholder Ecosystem',
      'Market Ecosystem',
      'Regulatory Ecosystem',
      'Long-Term Ecosystem',
    ],
    driverContext:
      'Market Drivers provide the richest ecosystem intelligence. Timing Drivers determine ecosystem dynamics and change velocity. Direction Drivers reveal the ecosystem the enterprise must build to fulfil its purpose.',
    correctionProtocols: [
      'Ecosystem Stabilisation',
      'Ecosystem Synchronisation',
      'Ecosystem Amplification',
      'Ecosystem Alignment',
      'Ecosystem Improvement',
      'Ecosystem Lock-In',
    ],
    backHref: '/q39-cross-functional-decision-network',
    backLabel: 'Cross-Functional Decision Network',
    nextHref: '/q41-decision-intelligence-summary',
    nextLabel: 'Decision Intelligence Summary',
  },
  Q41: {
    id: 'Q41',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision Intelligence Summary',
    purpose:
      "Summarises your decision intelligence — what's improving, what's degrading, and the three findings your leadership should act on.",
    dimensionLabels: [
      'Strategic Intelligence Quality',
      'Market Intelligence Depth',
      'Cultural Intelligence Accuracy',
      'Long-Term Intelligence Clarity',
    ],
    driverContext:
      'All seven drivers generate intelligence. Direction Drivers produce the highest-value but most often ignored intelligence. Identity Drivers determine intelligence appetite and processing style.',
    correctionProtocols: [
      'Intelligence Stabilisation',
      'Intelligence Synchronisation',
      'Intelligence Amplification',
      'Intelligence Alignment',
      'Intelligence Improvement',
      'Intelligence Lock-In',
    ],
    backHref: '/q40-decision-ecosystem-overview',
    backLabel: 'Decision Ecosystem Overview',
    nextHref: '/q42-organizational-insight-index',
    nextLabel: 'Organizational Insight Index',
  },
  Q42: {
    id: 'Q42',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Organizational Insight Index',
    purpose:
      'Indexes how much your organization actually learns from its decisions — whether insight accumulates, or evaporates between quarters.',
    dimensionLabels: [
      'Reactive Decisions',
      'Strategic Decisions',
      'Systemic Decisions',
      'Executive Decisions',
    ],
    driverContext:
      'Identity Drivers determine awareness baseline. Direction Drivers represent the highest awareness the enterprise is called to operate from. Cultural Drivers either expand or suppress decision awareness across the organisation.',
    correctionProtocols: [
      'Awareness Stabilisation',
      'Awareness Synchronisation',
      'Awareness Amplification',
      'Awareness Alignment',
      'Awareness Improvement',
      'Awareness Lock-In',
    ],
    backHref: '/q41-decision-intelligence-summary',
    backLabel: 'Decision Intelligence Summary',
    nextHref: '/q43-risk-visibility-monitor',
    nextLabel: 'Risk Visibility Monitor',
  },
  Q43: {
    id: 'Q43',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Risk Visibility Monitor',
    purpose:
      'Monitors the risk sitting inside your pending decisions — concentration, exposure, and the calls nobody has stress-tested.',
    dimensionLabels: [
      'Environmental Awareness',
      'Self-Awareness in Decisions',
      'Consequence Awareness',
      'Long-Term Awareness',
    ],
    driverContext:
      'Identity Drivers create self-awareness. Market Drivers generate environmental awareness. Cultural Drivers determine awareness spread across the organisation. Direction Drivers reveal the awareness dimensions the enterprise has not yet developed.',
    correctionProtocols: [
      'Awareness Stabilisation',
      'Awareness Synchronisation',
      'Awareness Amplification',
      'Awareness Alignment',
      'Awareness Improvement',
      'Awareness Lock-In',
    ],
    backHref: '/q42-organizational-insight-index',
    backLabel: 'Organizational Insight Index',
    nextHref: '/q44-decision-clarity-score',
    nextLabel: 'Decision Clarity Score',
  },
  Q44: {
    id: 'Q44',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision Clarity Score',
    purpose:
      'Scores one decision against the six requirements of decision quality — frame, alternatives, information, criteria, reasoning and commitment — and holds it to a bar set by how consequential and how reversible it is. Quality is the weakest link, not the average.',
    dimensionLabels: [
      'Appropriate frame',
      'Real alternatives',
      'Reliable information',
      'Clear criteria and tradeoffs',
      'Sound reasoning',
      'Commitment to action',
    ],
    inputs: { kind: 'decision-quality' },
    driverContext:
      'Identity Drivers create fundamental clarity character. Cultural Drivers determine whether clarity is valued and expected. Timing Drivers reveal how clarity changes under time pressure. Direction Drivers emit the clearest possible signal for each major decision.',
    correctionProtocols: [
      'Clarity Stabilisation',
      'Clarity Synchronisation',
      'Clarity Amplification',
      'Clarity Alignment',
      'Clarity Improvement',
      'Clarity Lock-In',
    ],
    backHref: '/q43-risk-visibility-monitor',
    backLabel: 'Risk Visibility Monitor',
    nextHref: '/q45-strategic-insight-generator',
    nextLabel: 'Strategic Insight Generator',
  },
  Q45: {
    id: 'Q45',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Strategic Insight Generator',
    purpose:
      'Turns your decision data into strategic insight — the patterns across many calls that point to what the business should do next.',
    dimensionLabels: [
      'Surface Insight',
      'Pattern Insight',
      'Systemic Insight',
      'Long-Term Insight',
    ],
    driverContext:
      'Direction Drivers produce the underlying insight. Identity Drivers determine insight capacity. Cultural Drivers either cultivate or suppress insight as an organisational capability. Timing Drivers reveal insight windows that open and close.',
    correctionProtocols: [
      'Insight Stabilisation',
      'Insight Synchronisation',
      'Insight Amplification',
      'Insight Alignment',
      'Insight Improvement',
      'Insight Lock-In',
    ],
    backHref: '/q44-decision-clarity-score',
    backLabel: 'Decision Clarity Score',
    nextHref: '/q46-predictive-foresight',
    nextLabel: 'Predictive Foresight Engine',
  },
  Q46: {
    id: 'Q46',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Predictive Foresight',
    purpose:
      'Shows you the consequences, scenarios, and futures of a decision before they arrive — so you commit with foresight rather than hindsight.',
    dimensionLabels: [
      'Near-Term Foresight',
      'Medium-Term Foresight',
      'Long-Arc Foresight',
      'Long-Term Foresight',
    ],
    inputs: { kind: 'scenario-decision' },
    driverContext:
      'Timing Drivers provide the most foresight data. Direction Drivers reveal the ultimate future toward which decisions should be oriented. Identity Drivers determine foresight character — bold or cautious, expansive or narrow.',
    correctionProtocols: [
      'Foresight Stabilisation',
      'Foresight Synchronisation',
      'Foresight Amplification',
      'Foresight Alignment',
      'Foresight Improvement',
      'Foresight Lock-In',
    ],
    backHref: '/q45-strategic-insight-generator',
    backLabel: 'Strategic Insight Generator',
    nextHref: '/q47-long-range-vision-planner',
    nextLabel: 'Long-Range Vision Planner',
  },
  Q47: {
    id: 'Q47',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Long-Range Vision Planner',
    purpose:
      "Plans decisions against the long horizon — testing today's choices for whether the business you want in ten years can live with them.",
    dimensionLabels: [
      'Operational Vision Alignment',
      'Strategic Vision Depth',
      'Cultural Vision Embodiment',
      'Executive Vision Clarity',
    ],
    inputs: { kind: 'scenario-decision' },
    driverContext:
      'Direction Drivers carry the most weight in this module. Identity Drivers anchor the vision in what the organisation actually is. Cultural Drivers determine whether the vision shows up in daily decisions. Market Drivers test whether vision is grounded in viable reality.',
    correctionProtocols: [
      'Vision Stabilisation',
      'Vision Synchronisation',
      'Vision Amplification',
      'Vision Alignment',
      'Vision Improvement',
      'Vision Lock-In',
    ],
    backHref: '/q46-predictive-foresight',
    backLabel: 'Predictive Foresight Engine',
    nextHref: '/q48-multi-stakeholder-perspective-view',
    nextLabel: 'Multi-Stakeholder Perspective View',
  },
  Q48: {
    id: 'Q48',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Multi-Stakeholder Perspective View',
    purpose:
      "Shows one decision through every stakeholder's eyes — customers, staff, owners, regulators — before you finalise it.",
    dimensionLabels: [
      'Perspective Range',
      'Excluded Perspective Risk',
      'Diversity of Decision Inputs',
      'Executive Perspective Index',
    ],
    driverContext:
      "Human Drivers carry perspective diversity. Cultural Drivers determine which perspectives are admitted or excluded. Identity Drivers shape the dominant perspective lens. Direction Drivers require perspectives that haven't yet been considered.",
    correctionProtocols: [
      'Perspective Stabilisation',
      'Perspective Synchronisation',
      'Perspective Amplification',
      'Perspective Alignment',
      'Perspective Improvement',
      'Perspective Lock-In',
    ],
    backHref: '/q47-long-range-vision-planner',
    backLabel: 'Long-Range Vision Planner',
    nextHref: '/q49-decision-rationale-explainer',
    nextLabel: 'Decision Rationale Explainer',
  },
  Q49: {
    id: 'Q49',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision Rationale Explainer',
    purpose:
      'Explains the why behind a decision in plain language — so your people execute with conviction instead of compliance.',
    dimensionLabels: [
      'Decision Context Understanding',
      'Consequence Understanding',
      'Strategic Meaning Understanding',
      'Executive Understanding Depth',
    ],
    driverContext:
      'All seven drivers contribute to understanding. Identity Drivers provide the interpretive framework. Direction Drivers reveal the understanding that is still missing. Cultural Drivers determine how deeply understanding is shared across the organisation.',
    correctionProtocols: [
      'Understanding Stabilisation',
      'Understanding Synchronisation',
      'Understanding Amplification',
      'Understanding Alignment',
      'Understanding Improvement',
      'Understanding Lock-In',
    ],
    backHref: '/q48-multi-stakeholder-perspective-view',
    backLabel: 'Multi-Stakeholder Perspective View',
    nextHref: '/q50-decision-mastery-benchmark',
    nextLabel: 'Decision Mastery Benchmark',
  },
  Q50: {
    id: 'Q50',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision Mastery Benchmark',
    purpose:
      "Benchmarks your decision-making against best practice — where you're world-class, and where you're guessing.",
    dimensionLabels: ['Decision Mastery', 'Field Mastery', 'Timing Mastery', 'Executive Command'],
    driverContext:
      'All seven drivers must be at a consistently high standard for Q50 to register completion. The Direction Driver is the final gate — mastery without long-term alignment is expertise, not governance.',
    correctionProtocols: [
      'Mastery Stabilisation',
      'Mastery Synchronisation',
      'Mastery Amplification',
      'Mastery Alignment',
      'Mastery Improvement',
      'Mastery Lock-In',
    ],
    backHref: '/q49-decision-rationale-explainer',
    backLabel: 'Decision Rationale Explainer',
    nextHref: '/q51-decision-influence-score',
    nextLabel: 'Decision Influence Score',
  },
  Q51: {
    id: 'Q51',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision Influence Score',
    purpose:
      'Scores who actually influences your decisions — the informal network behind the org chart — so you know whose alignment matters.',
    dimensionLabels: [
      'Decision Authority Level',
      'Conviction Strength',
      'Implementation Force',
      'Executive Decision Power',
    ],
    driverContext:
      'Identity Drivers create foundational decision power. Direction Drivers reveal the full power the enterprise is authorised to exercise. Cultural Drivers either amplify or drain decision power as it moves through the organisation.',
    correctionProtocols: [
      'Power Stabilisation',
      'Power Synchronisation',
      'Power Amplification',
      'Power Alignment',
      'Power Improvement',
      'Power Lock-In',
    ],
    backHref: '/q50-decision-mastery-benchmark',
    backLabel: 'Decision Mastery Benchmark',
    nextHref: '/q52-decision-impact-strength',
    nextLabel: 'Decision Impact Strength',
  },
  Q52: {
    id: 'Q52',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision Impact Strength',
    purpose:
      'Measures how strongly a decision lands — whether it changed behaviour on the ground, or just changed a slide.',
    dimensionLabels: [
      'Driving Forces',
      'Resisting Forces',
      'Long-Term Pull Forces',
      'Net Decision Force Vector',
    ],
    driverContext:
      'All seven drivers generate force. Market Drivers create the most visible external forces. Identity Drivers create the most durable internal forces. Direction Drivers generate the most powerful pull toward authentic outcomes.',
    correctionProtocols: [
      'Force Stabilisation',
      'Force Synchronisation',
      'Force Amplification',
      'Force Alignment',
      'Force Improvement',
      'Force Lock-In',
    ],
    backHref: '/q51-decision-influence-score',
    backLabel: 'Decision Influence Score',
    nextHref: '/q53-team-capacity-and-workload-monitor',
    nextLabel: 'Team Capacity & Workload Monitor',
  },
  Q53: {
    id: 'Q53',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Team Capacity & Workload Monitor',
    purpose:
      "Monitors your teams' capacity against their workload — who has room, who's saturated, and what that means for what you're about to commit.",
    dimensionLabels: [
      'Decision Energy Levels',
      'Energy Drain Patterns',
      'Creative Decision Energy',
      'Executive Decision Energy',
    ],
    driverContext:
      "Human Drivers carry the most visible decision energy. Identity Drivers determine the baseline energy character. Cultural Drivers amplify or suppress energy. Direction Drivers emit an energy frequency that aligns decisions toward the enterprise's highest output.",
    correctionProtocols: [
      'Energy Stabilisation',
      'Energy Synchronisation',
      'Energy Amplification',
      'Energy Alignment',
      'Energy Improvement',
      'Energy Lock-In',
    ],
    backHref: '/q52-decision-impact-strength',
    backLabel: 'Decision Impact Strength',
    nextHref: '/q54-decision-momentum-tracker',
    nextLabel: 'Decision Momentum Tracker',
  },
  Q54: {
    id: 'Q54',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision Momentum Tracker',
    purpose:
      "Tracks whether decisions gain or lose momentum after they're made — the follow-through gap between deciding and doing.",
    dimensionLabels: [
      'Positive Decision Momentum',
      'Momentum Drag Patterns',
      'Momentum Accumulation Rate',
      'Executive Momentum Trajectory',
    ],
    driverContext:
      'Timing Drivers reveal momentum trajectories. Identity Drivers determine the momentum character — bold or cautious. Cultural Drivers determine whether momentum is celebrated and protected or inadvertently broken.',
    correctionProtocols: [
      'Momentum Stabilisation',
      'Momentum Synchronisation',
      'Momentum Amplification',
      'Momentum Alignment',
      'Momentum Improvement',
      'Momentum Lock-In',
    ],
    backHref: '/q53-team-capacity-and-workload-monitor',
    backLabel: 'Team Capacity & Workload Monitor',
    nextHref: '/q55-decision-speed-index',
    nextLabel: 'Decision Speed Index',
  },
  Q55: {
    id: 'Q55',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision Speed Index',
    purpose:
      'Indexes how fast your organization decides — cycle time from question to call, benchmarked by decision type.',
    dimensionLabels: [
      'Decision Speed by Level',
      'Speed-Quality Balance',
      'Velocity Bottlenecks',
      'Optimal Decision Velocity',
    ],
    driverContext:
      "Timing Drivers govern velocity most directly. Market Drivers set external velocity requirements. Identity Drivers determine comfort with pace. Direction Drivers reveal the velocity required to reach the enterprise's authentic future in time.",
    correctionProtocols: [
      'Velocity Stabilisation',
      'Velocity Synchronisation',
      'Velocity Amplification',
      'Velocity Alignment',
      'Velocity Improvement',
      'Velocity Lock-In',
    ],
    backHref: '/q54-decision-momentum-tracker',
    backLabel: 'Decision Momentum Tracker',
    nextHref: '/q56-decision-acceleration-planner',
    nextLabel: 'Decision Acceleration Planner',
  },
  Q56: {
    id: 'Q56',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision Acceleration Planner',
    purpose:
      'Plans how to decide faster without deciding worse — the approvals to remove, the data to pre-stage, the thresholds to delegate.',
    dimensionLabels: [
      'Acceleration Zones',
      'Deceleration Risks',
      'Controlled Acceleration Capacity',
      'Executive Acceleration Trajectory',
    ],
    inputs: { kind: 'roadmap' },
    driverContext:
      "Timing Drivers govern acceleration dynamics. Market Drivers create external acceleration pressure. Identity Drivers determine the enterprise's acceleration tolerance. Direction Drivers reveal whether the current acceleration rate is moving toward or away from the authentic future.",
    correctionProtocols: [
      'Acceleration Stabilisation',
      'Acceleration Synchronisation',
      'Acceleration Amplification',
      'Acceleration Alignment',
      'Acceleration Improvement',
      'Acceleration Lock-In',
    ],
    backHref: '/q55-decision-speed-index',
    backLabel: 'Decision Speed Index',
    nextHref: '/q57-business-impact-estimator',
    nextLabel: 'Business Impact Estimator',
  },
  Q57: {
    id: 'Q57',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Business Impact Estimator',
    purpose:
      'Estimates the business impact of a decision in money and time — so options are compared in the units your board uses.',
    dimensionLabels: [
      'Intended vs Actual Impact',
      'Financial Decision Impact',
      'Cultural Decision Impact',
      'Long-Term-Aligned Impact',
    ],
    driverContext:
      "All seven drivers shape impact. Market Drivers provide the most immediate impact feedback. Identity Drivers determine impact character — transformational versus incremental. Direction Drivers reveal whether impact is building toward the enterprise's highest purpose.",
    correctionProtocols: [
      'Impact Stabilisation',
      'Impact Synchronisation',
      'Impact Amplification',
      'Impact Alignment',
      'Impact Improvement',
      'Impact Lock-In',
    ],
    backHref: '/q56-decision-acceleration-planner',
    backLabel: 'Decision Acceleration Planner',
    nextHref: '/q58-impact-magnitude-report',
    nextLabel: 'Impact Magnitude Report',
  },
  Q58: {
    id: 'Q58',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Impact Magnitude Report',
    purpose:
      'Reports realised impact after the fact — what a decision actually delivered against what was claimed for it.',
    dimensionLabels: [
      'Decision Scale Calibration',
      'Over-Caution Risk',
      'Over-Reach Risk',
      'Executive Magnitude Index',
    ],
    driverContext:
      "Identity Drivers determine default decision magnitude. Market Drivers reveal required decision scale. Direction Drivers set the magnitude standards needed to fulfil the enterprise's purpose. Cultural Drivers determine whether large-scale decisions are supported.",
    correctionProtocols: [
      'Magnitude Stabilisation',
      'Magnitude Synchronisation',
      'Magnitude Amplification',
      'Magnitude Alignment',
      'Magnitude Improvement',
      'Magnitude Lock-In',
    ],
    backHref: '/q57-business-impact-estimator',
    backLabel: 'Business Impact Estimator',
    nextHref: '/q59-outcome-range-assessment',
    nextLabel: 'Outcome Range Forecast',
  },
  Q59: {
    id: 'Q59',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Outcome Range Assessment',
    purpose:
      'Assesses the full range of outcomes — the spread between your best and worst case, and whether you can survive the bottom of it.',
    dimensionLabels: [
      'Peak Decision Commitment',
      'Trough Decision Resilience',
      'Amplitude Range',
      'Executive Amplitude Expression',
    ],
    driverContext:
      'Identity Drivers set the natural amplitude range. Cultural Drivers expand or contract amplitude. Direction Drivers reveal the amplitude range the enterprise must achieve. Market Drivers test amplitude under real pressure.',
    correctionProtocols: [
      'Amplitude Stabilisation',
      'Amplitude Synchronisation',
      'Amplitude Amplification',
      'Amplitude Alignment',
      'Amplitude Improvement',
      'Amplitude Lock-In',
    ],
    backHref: '/q58-impact-magnitude-report',
    backLabel: 'Impact Magnitude Report',
    nextHref: '/q60-decision-urgency-index',
    nextLabel: 'Decision Urgency Index',
  },
  Q60: {
    id: 'Q60',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision Urgency Index',
    purpose:
      'Separates urgent from important across your pending decisions — so deadlines stop deciding by default.',
    dimensionLabels: [
      'Decision Focus Intensity',
      'Commitment Depth',
      'Engagement Quality',
      'Executive Intensity Index',
    ],
    driverContext:
      'Human Drivers determine lived intensity. Cultural Drivers shape intensity norms. Identity Drivers set the natural intensity character. Direction Drivers reveal the intensity required to reach transformational decision outcomes.',
    correctionProtocols: [
      'Intensity Stabilisation',
      'Intensity Synchronisation',
      'Intensity Amplification',
      'Intensity Alignment',
      'Intensity Improvement',
      'Intensity Lock-In',
    ],
    backHref: '/q59-outcome-range-assessment',
    backLabel: 'Outcome Range Forecast',
    nextHref: '/q61-decision-scope-mapper',
    nextLabel: 'Decision Scope Mapper',
  },
  Q61: {
    id: 'Q61',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision Scope Mapper',
    purpose:
      "Maps a decision's true scope — everything and everyone it touches — before it's sized, staffed, or delegated.",
    dimensionLabels: [
      'Current Decision Space Boundaries',
      'Artificial Constraints',
      'Expansion Opportunities',
      'Executive Decision Space',
    ],
    driverContext:
      'Identity Drivers determine natural space. Market Drivers define external space limits. Structural Drivers create internal space constraints. Direction Drivers reveal the decision space the enterprise is meant to inhabit.',
    correctionProtocols: [
      'Space Stabilisation',
      'Space Synchronisation',
      'Space Amplification',
      'Space Alignment',
      'Space Improvement',
      'Space Lock-In',
    ],
    backHref: '/q60-decision-urgency-index',
    backLabel: 'Decision Urgency Index',
    nextHref: '/q62-domain-specific-decision-view',
    nextLabel: 'Domain-Specific Decision View',
  },
  Q62: {
    id: 'Q62',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Domain-Specific Decision View',
    purpose:
      'Views decisions within one domain — pricing, hiring, capital — with the context and history that domain needs.',
    dimensionLabels: [
      'Core Decision Domain',
      'Shared Decision Domains',
      'Domain Boundaries',
      'Executive Domain Expansion',
    ],
    driverContext:
      'Identity Drivers define domain character. Market Drivers reveal domain opportunities and threats. Structural Drivers create domain structures. Direction Drivers reveal the domain the enterprise is positioned to claim.',
    correctionProtocols: [
      'Domain Stabilisation',
      'Domain Synchronisation',
      'Domain Amplification',
      'Domain Alignment',
      'Domain Improvement',
      'Domain Lock-In',
    ],
    backHref: '/q61-decision-scope-mapper',
    backLabel: 'Decision Scope Mapper',
    nextHref: '/q63-market-territory-analysis',
    nextLabel: 'Market Territory Analysis',
  },
  Q63: {
    id: 'Q63',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Market Territory Analysis',
    purpose:
      'Analyses your decisions by market and territory — what works where, so a win in one region is deliberately tested in the next.',
    dimensionLabels: [
      'Claimed Decision Territory',
      'Contested Territory',
      'Unclaimed Territory',
      'Executive Territory Index',
    ],
    driverContext:
      'Market Drivers reveal territorial opportunities and threats. Identity Drivers determine territorial character. Cultural Drivers determine territorial ambition. Direction Drivers reveal the territories the enterprise must claim to fulfil its purpose.',
    correctionProtocols: [
      'Territory Stabilisation',
      'Territory Synchronisation',
      'Territory Amplification',
      'Territory Alignment',
      'Territory Improvement',
      'Territory Lock-In',
    ],
    backHref: '/q62-domain-specific-decision-view',
    backLabel: 'Domain-Specific Decision View',
    nextHref: '/q64-business-unit-decision-overview',
    nextLabel: 'Business Unit Decision Overview',
  },
  Q64: {
    id: 'Q64',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Business Unit Decision Overview',
    purpose:
      'Overviews decision-making per business unit — speed, quality, and autonomy, compared across your units.',
    dimensionLabels: [
      'Business Unit Clarity',
      'Business Unit Influence Depth',
      'Business Unit Stability',
      'Business Unit Authority',
    ],
    driverContext:
      'Identity Drivers and Direction Drivers co-create business unit character. Cultural Drivers determine how business unit is inhabited. Market Drivers reveal business unit strength in external contexts. Timing Drivers govern business unit evolution over time.',
    correctionProtocols: [
      'Business Unit Stabilisation',
      'Business Unit Synchronisation',
      'Business Unit Amplification',
      'Business Unit Alignment',
      'Business Unit Improvement',
      'Business Unit Lock-In',
    ],
    backHref: '/q63-market-territory-analysis',
    backLabel: 'Market Territory Analysis',
    nextHref: '/q65-enterprise-wide-decision-map',
    nextLabel: 'Enterprise-Wide Decision Map',
  },
  Q65: {
    id: 'Q65',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Enterprise-Wide Decision Map',
    purpose:
      'Maps decisions across your whole enterprise — where they cluster, where they conflict, and where nobody is deciding at all.',
    dimensionLabels: [
      'Enterprise Scope',
      'Enterprise Integrity',
      'Enterprise Growth Trajectory',
      'Enterprise Coverage Completeness',
    ],
    driverContext:
      'Direction Drivers define how far coverage needs to extend. Identity Drivers set the governance standard applied. Cultural Drivers determine whether that standard holds consistently across units. Market Drivers test it under external pressure.',
    correctionProtocols: [
      'Enterprise-Scope Stabilisation',
      'Enterprise-Scope Synchronisation',
      'Enterprise-Scope Amplification',
      'Enterprise-Scope Alignment',
      'Enterprise-Scope Improvement',
      'Enterprise-Scope Lock-In',
    ],
    backHref: '/q64-business-unit-decision-overview',
    backLabel: 'Business Unit Decision Overview',
    nextHref: '/q66-portfolio-group-decision-view',
    nextLabel: 'Portfolio/Group Decision View',
  },
  Q66: {
    id: 'Q66',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Portfolio/Group Decision View',
    purpose:
      'Views decisions at portfolio level — how choices in one company or unit affect the others in your group.',
    dimensionLabels: [
      'Core Portfolio Strength',
      'Extended Influence Sphere',
      'Partnership Decision Networks',
      'Portfolio Growth Trajectory',
    ],
    driverContext:
      'Market Drivers show how far group influence actually reaches. Identity Drivers determine how consistently the group operates. Direction Drivers set the portfolio the organisation is building toward. Cultural Drivers determine whether group-level authority can be sustained.',
    correctionProtocols: [
      'Portfolio Stabilisation',
      'Portfolio Synchronisation',
      'Portfolio Amplification',
      'Portfolio Alignment',
      'Portfolio Improvement',
      'Portfolio Lock-In',
    ],
    backHref: '/q65-enterprise-wide-decision-map',
    backLabel: 'Enterprise-Wide Decision Map',
    nextHref: '/q67-global-decision-overview',
    nextLabel: 'Global Decision Overview',
  },
  Q67: {
    id: 'Q67',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Global Decision Overview',
    purpose:
      'The global view of your decision-making — consistency and local variation across every geography you operate in.',
    dimensionLabels: [
      'Industry-Scale Decision Impact',
      'Societal Decision Contribution',
      'Generational Decision Thinking',
      'Societal Purpose Alignment',
    ],
    driverContext:
      'Direction Drivers are primary at this scale. Identity Drivers ground enterprise-wide ambition in authentic character. Market Drivers test enterprise-wide vision against current reality. Cultural Drivers determine whether the organisation can think and decide at enterprise-wide scale.',
    correctionProtocols: [
      'Enterprise-Wide View Stabilisation',
      'Enterprise-Wide View Synchronisation',
      'Enterprise-Wide View Amplification',
      'Enterprise-Wide View Alignment',
      'Enterprise-Wide View Improvement',
      'Enterprise-Wide View Lock-In',
    ],
    backHref: '/q66-portfolio-group-decision-view',
    backLabel: 'Portfolio/Group Decision View',
    nextHref: '/q68-long-term-scenario-planner',
    nextLabel: 'Long-Term Scenario Planner',
  },
  Q68: {
    id: 'Q68',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Long-Term Scenario Planner',
    purpose:
      'Plans long-term scenarios — the futures your industry could take, and the moves that keep you viable across most of them.',
    dimensionLabels: [
      'Artificial Limits in Decision-Making',
      'Option Range Access',
      'Horizon Expansion Capacity',
      'Executive Long-Range Outlook',
    ],
    inputs: { kind: 'scenario-decision' },
    driverContext:
      'Direction Drivers reveal the long-range possibilities available to the enterprise. Identity Drivers determine how much long-range the enterprise can currently inhabit. Cultural Drivers either expand toward or contract away from long-range possibility.',
    correctionProtocols: [
      'Long-Range Stabilisation',
      'Long-Range Synchronisation',
      'Long-Range Amplification',
      'Long-Range Alignment',
      'Long-Range Improvement',
      'Long-Range Lock-In',
    ],
    backHref: '/q67-global-decision-overview',
    backLabel: 'Global Decision Overview',
    nextHref: '/q69-decision-consistency-diagnostic',
    nextLabel: 'Continuous Decision Tracking',
  },
  Q69: {
    id: 'Q69',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision Consistency Diagnostic',
    purpose:
      "Diagnoses inconsistency across your decisions over time — where standards drift depending on who's in the room.",
    dimensionLabels: [
      'Past-Decision Legacy',
      'Present Decision Thread',
      'Future Decision Continuity',
      'Executive Continuum Coherence',
    ],
    driverContext:
      'Timing Drivers reveal the continuum most clearly. Identity Drivers provide the connecting thread. Direction Drivers show where the continuum is leading. Cultural Drivers determine whether the enterprise honours or ignores its decision continuity.',
    correctionProtocols: [
      'Continuum Stabilisation',
      'Continuum Synchronisation',
      'Continuum Amplification',
      'Continuum Alignment',
      'Continuum Improvement',
      'Continuum Lock-In',
    ],
    backHref: '/q68-long-term-scenario-planner',
    backLabel: 'Long-Term Scenario Planner',
    nextHref: '/q70-legacy-decision-archive',
    nextLabel: 'Legacy Decision Archive',
  },
  Q70: {
    id: 'Q70',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Legacy Decision Archive',
    purpose:
      "Archives past decisions with their rationale — the institutional memory that stops the next leadership team repeating this one's mistakes.",
    dimensionLabels: [
      'Legacy Decision Quality',
      'Enduring Impact Orientation',
      'Generational Decision Thinking',
      'Enduring Value Creation',
    ],
    driverContext:
      "Direction Drivers are primary at this layer — only long-term can reveal which decisions have enduring quality. Identity Drivers encode the enterprise's natural orientation toward permanence or transience. Cultural Drivers determine whether long-term legacy is valued in daily decisions.",
    correctionProtocols: [
      'Eternity Stabilisation',
      'Eternity Synchronisation',
      'Eternity Amplification',
      'Eternity Alignment',
      'Eternity Improvement',
      'Eternity Lock-In',
    ],
    backHref: '/q69-decision-consistency-diagnostic',
    backLabel: 'Continuous Decision Tracking',
    nextHref: '/q71-decision-timeline',
    nextLabel: 'Decision Timeline',
  },
  Q71: {
    id: 'Q71',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision Timeline',
    purpose:
      'Lays your decisions on a timeline — what was decided when, and how each one shaped what came next.',
    dimensionLabels: [
      'Time Horizon Orientation',
      'Urgency Distortion Patterns',
      'Timing Biases',
      'Executive Timing Command',
    ],
    driverContext:
      "Timing Drivers are primary here. Identity Drivers encode the enterprise's natural time philosophy. Market Drivers create time pressure. Direction Drivers reveal the timing orientation required for the enterprise's authentic future.",
    correctionProtocols: [
      'Time Stabilisation',
      'Time Synchronisation',
      'Time Amplification',
      'Time Alignment',
      'Time Improvement',
      'Time Lock-In',
    ],
    backHref: '/q70-legacy-decision-archive',
    backLabel: 'Legacy Decision Archive',
    nextHref: '/q72-point-in-time-snapshot',
    nextLabel: 'Point-in-Time Snapshot',
  },
  Q72: {
    id: 'Q72',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Point-in-Time Snapshot',
    purpose:
      'Snapshots your decision landscape at a point in time — the baseline that makes future audits and comparisons honest.',
    dimensionLabels: [
      'Present-Moment Decision Clarity',
      'Past Regret Distortion',
      'Future Anxiety Distortion',
      'Present-Moment Command',
    ],
    driverContext:
      'Timing Drivers govern moment awareness. Identity Drivers determine present-moment capacity. Cultural Drivers create the organisational environment for present-focused decision-making. Direction Drivers reveal what can only be accessed in the present moment.',
    correctionProtocols: [
      'Moment Stabilisation',
      'Moment Synchronisation',
      'Moment Amplification',
      'Moment Alignment',
      'Moment Improvement',
      'Moment Lock-In',
    ],
    backHref: '/q71-decision-timeline',
    backLabel: 'Decision Timeline',
    nextHref: '/q73-decision-sequence-tracker',
    nextLabel: 'Decision Sequence Tracker',
  },
  Q73: {
    id: 'Q73',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision Sequence Tracker',
    purpose:
      'Tracks the sequence of dependent decisions — what must be decided first, and what deliberately waits.',
    dimensionLabels: [
      'Decision Sequence Mapping',
      'Prerequisite Decision Chains',
      'Parallel Decision Opportunities',
      'Sequence Optimisation Index',
    ],
    driverContext:
      "Timing Drivers reveal optimal sequencing. Structural Drivers create the decision architecture that governs sequencing. Identity Drivers determine sequencing style — methodical or intuitive. Direction Drivers reveal which decisions must happen in which order to reach the enterprise's authentic future.",
    correctionProtocols: [
      'Sequence Stabilisation',
      'Sequence Synchronisation',
      'Sequence Amplification',
      'Sequence Alignment',
      'Sequence Improvement',
      'Sequence Lock-In',
    ],
    backHref: '/q72-point-in-time-snapshot',
    backLabel: 'Point-in-Time Snapshot',
    nextHref: '/q74-decision-duration-analysis',
    nextLabel: 'Decision Duration Analysis',
  },
  Q74: {
    id: 'Q74',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision Duration Analysis',
    purpose:
      'Analyses how long your decisions take — where they wait, and which stage of your process eats the calendar.',
    dimensionLabels: [
      'Decision Initiation-to-Commitment Time',
      'Implementation Duration',
      'Duration Benchmarks by Decision Type',
      'Duration Optimisation Index',
    ],
    driverContext:
      'Timing Drivers govern duration most directly. Structural Drivers create the process architecture that shapes duration. Cultural Drivers determine decision pace norms. Market Drivers set external duration requirements.',
    correctionProtocols: [
      'Duration Stabilisation',
      'Duration Synchronisation',
      'Duration Amplification',
      'Duration Alignment',
      'Duration Improvement',
      'Duration Lock-In',
    ],
    backHref: '/q73-decision-sequence-tracker',
    backLabel: 'Decision Sequence Tracker',
    nextHref: '/q75-recurring-decision-cycles',
    nextLabel: 'Recurring Decision Cycles',
  },
  Q75: {
    id: 'Q75',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Recurring Decision Cycles',
    purpose:
      'Identifies the decisions that recur on a cycle — budgets, renewals, reviews — and standardises them so they stop being reinvented.',
    dimensionLabels: [
      'Strategic Decision Cycles',
      'Investment Decision Cycles',
      'People Decision Cycles',
      'Disruption Cycle Readiness',
    ],
    driverContext:
      'Timing Drivers reveal cycle patterns. Identity Drivers encode natural cycle preferences. Cultural Drivers create cycle norms. Market Drivers introduce external cycles that must be integrated with internal decision rhythms.',
    correctionProtocols: [
      'Cycle Stabilisation',
      'Cycle Synchronisation',
      'Cycle Amplification',
      'Cycle Alignment',
      'Cycle Improvement',
      'Cycle Lock-In',
    ],
    backHref: '/q74-decision-duration-analysis',
    backLabel: 'Decision Duration Analysis',
    nextHref: '/q76-long-term-commitment-tracker',
    nextLabel: 'Long-Term Commitment Tracker',
  },
  Q76: {
    id: 'Q76',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Long-Term Commitment Tracker',
    purpose:
      'Tracks the long-term commitments your decisions created — contracts, leases, promises — and when each comes due or up for renegotiation.',
    dimensionLabels: [
      'Permanent Decision Inventory',
      'Reversible Decision Inventory',
      'Reversibility Misclassification Risk',
      'Executive Permanence Calibration',
    ],
    driverContext:
      'Identity Drivers reveal natural permanence orientation. Timing Drivers show permanence implications over time. Cultural Drivers determine whether permanence is respected. Direction Drivers reveal which decisions are permanent by executive nature.',
    correctionProtocols: [
      'Permanence Stabilisation',
      'Permanence Synchronisation',
      'Permanence Amplification',
      'Permanence Alignment',
      'Permanence Improvement',
      'Permanence Lock-In',
    ],
    backHref: '/q75-recurring-decision-cycles',
    backLabel: 'Recurring Decision Cycles',
    nextHref: '/q77-breakthrough-decision-alerts',
    nextLabel: 'Breakthrough Decision Alerts',
  },
  Q77: {
    id: 'Q77',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Breakthrough Decision Alerts',
    purpose:
      'Alerts your leadership when a genuinely breakthrough decision appears — the rare, high-leverage call that must not queue behind routine business.',
    dimensionLabels: [
      'Breakthrough Decision Identification',
      'Courage-Required Decisions',
      'Beyond-Framework Decisions',
      'Executive Breakthrough Index',
    ],
    driverContext:
      'Direction Drivers reveal breakthrough decisions most clearly. Identity Drivers determine whether the enterprise has the character to make them. Cultural Drivers determine whether breakthrough decisions are supported or suppressed.',
    correctionProtocols: [
      'Breakthrough Stabilisation',
      'Breakthrough Synchronisation',
      'Breakthrough Amplification',
      'Breakthrough Alignment',
      'Breakthrough Improvement',
      'Breakthrough Lock-In',
    ],
    backHref: '/q76-long-term-commitment-tracker',
    backLabel: 'Long-Term Commitment Tracker',
    nextHref: '/q78-cross-team-decision-convergence',
    nextLabel: 'Cross-Team Decision Convergence',
  },
  Q78: {
    id: 'Q78',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Cross-Team Decision Convergence',
    purpose:
      "Shows where separate teams' decisions are converging on the same ground — duplicated effort to merge, or collisions to prevent.",
    dimensionLabels: [
      'Cross-Function Decision Convergence',
      'Vertical Hierarchy Convergence',
      'Timing Convergence',
      'Long-Term Convergence Index',
    ],
    driverContext:
      'All seven drivers must converge for decision intelligence to reach its peak. Cultural Drivers are the most common convergence barrier. Direction Drivers set the convergence destination that all decisions must move toward.',
    correctionProtocols: [
      'Convergence Stabilisation',
      'Convergence Synchronisation',
      'Convergence Amplification',
      'Convergence Alignment',
      'Convergence Improvement',
      'Convergence Lock-In',
    ],
    backHref: '/q77-breakthrough-decision-alerts',
    backLabel: 'Breakthrough Decision Alerts',
    nextHref: '/q79-critical-decision-point-alert',
    nextLabel: 'Critical Decision Point Alert',
  },
  Q79: {
    id: 'Q79',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Critical Decision Point Alert',
    purpose:
      'Flags critical decision points before they pass — the windows where delaying a call quietly becomes making one.',
    dimensionLabels: [
      'Decision-Point Readiness',
      'Unified Decision Intelligence',
      'Decisive Choice Clarity',
      'Executive Decision-Point Index',
    ],
    driverContext:
      'All seven drivers must be at full activation for decision point to occur. Direction Drivers are the gateway — decision point cannot be forced; it must be earned through the completion of all prior decision intelligence arcs.',
    correctionProtocols: [
      'Decision Point Stabilisation',
      'Decision Point Synchronisation',
      'Decision Point Amplification',
      'Decision Point Alignment',
      'Decision Point Improvement',
      'Decision Point Lock-In',
    ],
    backHref: '/q78-cross-team-decision-convergence',
    backLabel: 'Cross-Team Decision Convergence',
    nextHref: '/q80-decision-model-evolution-tracker',
    nextLabel: 'Decision Model Evolution Tracker',
  },
  Q80: {
    id: 'Q80',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision Model Evolution Tracker',
    purpose:
      'Tracks how your decision models evolve — whether judgment is genuinely improving with evidence, or just changing with the personnel.',
    dimensionLabels: [
      'Decision Evolution History',
      'Current Evolution Stage',
      'Next Evolution Leap',
      'Executive Evolution Trajectory',
    ],
    driverContext:
      'Timing Drivers reveal evolution velocity. Identity Drivers determine evolution capacity. Direction Drivers reveal the evolutionary destination. Cultural Drivers either accelerate or resist decision intelligence evolution.',
    correctionProtocols: [
      'Evolution Stabilisation',
      'Evolution Synchronisation',
      'Evolution Amplification',
      'Evolution Alignment',
      'Evolution Improvement',
      'Evolution Lock-In',
    ],
    backHref: '/q79-critical-decision-point-alert',
    backLabel: 'Critical Decision Point Alert',
    nextHref: '/q81-organisational-self-assessment',
    nextLabel: 'Organisational Self-Assessment',
  },
  Q81: {
    id: 'Q81',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Organisational Self-Assessment',
    purpose:
      'A structured self-assessment of your organization — rated dimension by dimension, with your evidence weighed against your claims.',
    dimensionLabels: [
      'Decision Self-Awareness',
      'Self-Knowledge Depth',
      'Authentic Decision Identity',
      'Executive Identity Emergence',
    ],
    driverContext:
      'Identity Drivers are primary in this arc. Direction Drivers reveal the fullest Self the enterprise is called to become. Cultural Drivers determine whether the Self is authentically expressed or institutionally suppressed.',
    correctionProtocols: [
      'Self Stabilisation',
      'Self Synchronisation',
      'Self Amplification',
      'Self Alignment',
      'Self Improvement',
      'Self Lock-In',
    ],
    backHref: '/q80-decision-model-evolution-tracker',
    backLabel: 'Decision Model Evolution Tracker',
    nextHref: '/q82-core-decision-principles',
    nextLabel: 'Core Decision Principles',
  },
  Q82: {
    id: 'Q82',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Core Decision Principles',
    purpose:
      'Codifies the principles your organization decides by — written down, so they hold under pressure instead of dissolving into judgment calls.',
    dimensionLabels: [
      'Core Decision Values',
      'Unchanging Decision Truths',
      'Core Stability Under Pressure',
      'Executive Core Clarity',
    ],
    driverContext:
      'Identity Drivers and Direction Drivers jointly encode the core. Cultural Drivers determine whether the core is accessible in daily decisions. Market Drivers test core stability under external pressure.',
    correctionProtocols: [
      'Core Stabilisation',
      'Core Synchronisation',
      'Core Amplification',
      'Core Alignment',
      'Core Improvement',
      'Core Lock-In',
    ],
    backHref: '/q81-organisational-self-assessment',
    backLabel: 'Organisational Self-Assessment',
    nextHref: '/q83-decision-culture-profile',
    nextLabel: 'Decision Culture Profile',
  },
  Q83: {
    id: 'Q83',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision Culture Profile',
    purpose:
      'Profiles your decision culture as it really works — who speaks, who defers, what gets punished — versus what the values poster says.',
    dimensionLabels: [
      'Decision Character Clarity',
      'Character Authenticity',
      'Values Visible in Daily Decisions',
      'Executive Character Index',
    ],
    driverContext:
      'Identity and Direction Drivers reveal these traits most clearly. Cultural Drivers determine whether they hold consistently. Market and Structural Drivers test whether character survives contact with operational reality.',
    correctionProtocols: [
      'Character Stabilisation',
      'Driver Synchronisation',
      'Driver Amplification',
      'Driver Alignment',
      'Driver Improvement',
      'Driver Lock-In',
    ],
    backHref: '/q82-core-decision-principles',
    backLabel: 'Core Decision Principles',
    nextHref: '/q84-company-values-alignment',
    nextLabel: 'Company Values Alignment',
  },
  Q84: {
    id: 'Q84',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Company Values Alignment',
    purpose:
      'Checks your decisions against your stated values — surfacing where the business says one thing and consistently chooses another.',
    dimensionLabels: [
      'Values Vitality',
      'Values Visible in Decisions',
      'Values–Strategy Alignment',
      'Executive Values Presence',
    ],
    driverContext:
      'Direction Drivers set which values matter most. Identity Drivers keep them grounded in what the organisation is. Cultural Drivers either uphold or erode them in the decision environment. Human Drivers determine how consistently individuals apply them.',
    correctionProtocols: [
      'Values Stabilisation',
      'Culture Fit Synchronisation',
      'Culture Fit Amplification',
      'Culture Fit Alignment',
      'Culture Fit Improvement',
      'Culture Fit Lock-In',
    ],
    backHref: '/q83-decision-culture-profile',
    backLabel: 'Decision Culture Profile',
    nextHref: '/q85-organisational-health-check',
    nextLabel: 'Organisational Health Check',
  },
  Q85: {
    id: 'Q85',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Organisational Health Check',
    purpose:
      "A health check across your organization's vital signs — structured ratings with evidence behind them, producing a picture honest enough to act on.",
    dimensionLabels: [
      'Decision Authenticity',
      'Intent–Action Alignment',
      'Decision Presence Quality',
      'Executive Presence',
    ],
    driverContext:
      'Identity and Direction Drivers are primary — being is the most foundational level of enterprise decision identity. Cultural Drivers determine how being is expressed. All seven drivers must be integrated for full being to emerge.',
    correctionProtocols: [
      'Being Stabilisation',
      'Being Synchronisation',
      'Being Amplification',
      'Being Alignment',
      'Being Improvement',
      'Being Lock-In',
    ],
    backHref: '/q84-company-values-alignment',
    backLabel: 'Company Values Alignment',
    nextHref: '/q86-business-continuity-status',
    nextLabel: 'Business Continuity Status',
  },
  Q86: {
    id: 'Q86',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Business Continuity Status',
    purpose:
      "Reports your continuity readiness — what breaks if a key person, system, or supplier disappears tomorrow, and what's actually covered.",
    dimensionLabels: [
      'Decision Authority Claim',
      'Decision Confidence',
      'Scope of Decision Authority',
      'Operating Independence Index',
    ],
    driverContext:
      'Direction Drivers are primary — existence at this level is a long-term question. Identity Drivers encode the character of that existence. Cultural Drivers determine whether the organisation claims its full existential decision authority or self-limits.',
    correctionProtocols: [
      'Existence Stabilisation',
      'Existence Synchronisation',
      'Existence Amplification',
      'Existence Alignment',
      'Existence Improvement',
      'Existence Lock-In',
    ],
    backHref: '/q85-organisational-health-check',
    backLabel: 'Organisational Health Check',
    nextHref: '/q87-independent-decision-authority',
    nextLabel: 'Independent Decision Authority',
  },
  Q87: {
    id: 'Q87',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Independent Decision Authority',
    purpose:
      'Defines where independent decision authority sits — the calls each role may make alone, so autonomy is explicit rather than assumed.',
    dimensionLabels: [
      'Decision Authority Activation',
      'Decision Authority Completeness',
      'Self-Permission Index',
      'Decision Authority Stability',
    ],
    driverContext:
      "Direction Drivers are the gateway — executive being cannot be constructed; it must be revealed. Identity Drivers provide the executive character. Cultural Drivers determine whether executive being is supported or undermined by the organisation's collective field.",
    correctionProtocols: [
      'Executive Being Stabilisation',
      'Executive Being Synchronisation',
      'Executive Being Amplification',
      'Executive Being Alignment',
      'Executive Being Improvement',
      'Executive Being Lock-In',
    ],
    backHref: '/q86-business-continuity-status',
    backLabel: 'Business Continuity Status',
    nextHref: '/q88-enterprise-decision-insight',
    nextLabel: 'Enterprise Decision Insight',
  },
  Q88: {
    id: 'Q88',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Enterprise Decision Insight',
    purpose:
      'Distils your enterprise-wide decision data into insight — the handful of structural findings that explain many symptoms at once.',
    dimensionLabels: [
      'Executive Self-Awareness',
      'Full Landscape Awareness',
      'Deliberate Decision Mastery',
      'Executive Awareness Completeness',
    ],
    driverContext:
      'Direction Drivers clarify executive awareness. Identity Drivers embody it. Cultural Drivers must be mature enough to support enterprise-wide executive awareness. All seven drivers must be at consistently applied.',
    correctionProtocols: [
      'Executive Awareness Stabilisation',
      'Executive Awareness Synchronisation',
      'Executive Awareness Amplification',
      'Executive Awareness Alignment',
      'Executive Awareness Improvement',
      'Executive Awareness Lock-In',
    ],
    backHref: '/q87-independent-decision-authority',
    backLabel: 'Independent Decision Authority',
    nextHref: '/q89-organisational-identity-report',
    nextLabel: 'Organisational Identity Report',
  },
  Q89: {
    id: 'Q89',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Organisational Identity Report',
    purpose:
      'Reports who your organization is by how it behaves — the identity revealed in its decisions, hires, and spending, versus the one in the mission statement.',
    dimensionLabels: [
      'Executive Identity Clarity',
      'Identity Claim Completeness',
      'Executive Identity Stability',
      'Executive Identity Expression',
    ],
    driverContext:
      'Direction Drivers are primary — executive identity is a long-term fulfilment. Identity Drivers encode it. Cultural Drivers must be elevated enough to embody it. The Executive Identity prepares the enterprise for Q90 Executive Self completion.',
    correctionProtocols: [
      'Executive Identity Stabilisation',
      'Executive Identity Synchronisation',
      'Executive Identity Amplification',
      'Executive Identity Alignment',
      'Executive Identity Improvement',
      'Executive Identity Lock-In',
    ],
    backHref: '/q88-enterprise-decision-insight',
    backLabel: 'Enterprise Decision Insight',
    nextHref: '/q90-autonomous-decision-capability',
    nextLabel: 'Autonomous Decision Capability',
  },
  Q90: {
    id: 'Q90',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Autonomous Decision Capability',
    purpose:
      "Measures how well your organization decides without escalation — the depth at which good calls happen when leadership isn't in the room.",
    dimensionLabels: [
      'Executive Identity Clarity',
      'Identity Completeness',
      'Decision Independence',
      'Long-Term Alignment',
    ],
    driverContext:
      'Direction Drivers are primary at Q90. The Executive Self cannot be reached through structural or market drivers alone — it requires the underlying Identity and Long-Term alignment.',
    correctionProtocols: [
      'Executive Stabilisation',
      'Executive Synchronisation',
      'Executive Amplification',
      'Executive Alignment',
      'Executive Improvement',
      'Executive Lock-In',
    ],
    backHref: '/q89-organisational-identity-report',
    backLabel: 'Organisational Identity Report',
    nextHref: '/q91-governance-foundation',
    nextLabel: 'Governance Foundation',
  },
  Q91: {
    id: 'Q91',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Governance Foundation',
    purpose:
      'Assesses the foundations of your governance — decision rights, oversight, and accountability — before growth makes their gaps expensive.',
    dimensionLabels: [
      'Foundation Principles Clarity',
      'Foundation Stability',
      'Foundation Completeness',
      'Executive Foundation Integrity',
    ],
    driverContext:
      "Identity Drivers lay the foundation character. Direction Drivers reveal the foundation's purpose. Cultural Drivers determine whether the foundation is lived or declared. All seven drivers must contribute to foundation completeness.",
    correctionProtocols: [
      'Foundation Stabilisation',
      'Foundation Synchronisation',
      'Foundation Amplification',
      'Foundation Alignment',
      'Foundation Improvement',
      'Foundation Lock-In',
    ],
    backHref: '/q90-autonomous-decision-capability',
    backLabel: 'Autonomous Decision Capability',
    nextHref: '/q92-partnership-agreement-tracker',
    nextLabel: 'Partnership Agreement Tracker',
  },
  Q92: {
    id: 'Q92',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Partnership Agreement Tracker',
    purpose:
      "Tracks your partnership agreements — obligations, review dates, and the drift between what was signed and what's practised.",
    dimensionLabels: [
      'Internal Commitment Clarity',
      'Stakeholder Commitments',
      'Commitment Integrity Under Pressure',
      'Long-Term Commitment Alignment',
    ],
    driverContext:
      'Identity and Direction Drivers determine which commitments are made. Cultural Drivers determine whether they are honoured. Market Drivers test them under commercial pressure.',
    correctionProtocols: [
      'Commitment Stabilisation',
      'Commitment Synchronisation',
      'Commitment Amplification',
      'Commitment Alignment',
      'Commitment Improvement',
      'Commitment Lock-In',
    ],
    backHref: '/q91-governance-foundation',
    backLabel: 'Governance Foundation',
    nextHref: '/q93-enterprise-charter-and-bylaws',
    nextLabel: 'Enterprise Charter & Bylaws',
  },
  Q93: {
    id: 'Q93',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Enterprise Charter & Bylaws',
    purpose:
      'Keeps your charter and bylaws live — checking that actual decisions honour the rules the enterprise was constituted under.',
    dimensionLabels: [
      'Charter Completeness',
      'Authority Scope Definition',
      'Decision Standards Clarity',
      'Charter Activation Index',
    ],
    driverContext:
      "Identity Drivers shape the charter character. Direction Drivers define the charter's scope and ambition. Structural Drivers provide charter infrastructure. Cultural Drivers determine whether the charter is enacted or merely stated.",
    correctionProtocols: [
      'Charter Stabilisation',
      'Charter Synchronisation',
      'Charter Amplification',
      'Charter Alignment',
      'Charter Improvement',
      'Charter Lock-In',
    ],
    backHref: '/q92-partnership-agreement-tracker',
    backLabel: 'Partnership Agreement Tracker',
    nextHref: '/q94-public-commitments-tracker',
    nextLabel: 'Public Commitments Tracker',
  },
  Q94: {
    id: 'Q94',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Public Commitments Tracker',
    purpose:
      "Tracks the commitments you've made publicly — targets, pledges, promises — against delivery, before your stakeholders do.",
    dimensionLabels: [
      'Declaration Readiness',
      'Declaration Clarity',
      'Declaration Courage',
      'Executive Declaration Impact',
    ],
    driverContext:
      'Direction Drivers reveal what must be declared. Identity Drivers determine the authenticity of the declaration. Cultural Drivers determine whether the declaration is embraced internally. Market Drivers determine how the declaration lands externally.',
    correctionProtocols: [
      'Declaration Stabilisation',
      'Declaration Synchronisation',
      'Declaration Amplification',
      'Declaration Alignment',
      'Declaration Improvement',
      'Declaration Lock-In',
    ],
    backHref: '/q93-enterprise-charter-and-bylaws',
    backLabel: 'Enterprise Charter & Bylaws',
    nextHref: '/q95-executive-mandate-tracker',
    nextLabel: 'Executive Mandate Tracker',
  },
  Q95: {
    id: 'Q95',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Executive Mandate Tracker',
    purpose:
      'Tracks your executive mandates — what each leader was actually charged to deliver, and how far each has got.',
    dimensionLabels: [
      'Mandate Source Clarity',
      'Mandate Scope',
      'Mandate Activation',
      'Executive Mandate Fulfilment',
    ],
    driverContext:
      'Direction Drivers reveal the mandate most completely. Identity Drivers determine whether the enterprise is ready to receive and carry it. Cultural Drivers determine whether the mandate is embraced. Market Drivers confirm where the mandate is externally recognised.',
    correctionProtocols: [
      'Mandate Stabilisation',
      'Mandate Synchronisation',
      'Mandate Amplification',
      'Mandate Alignment',
      'Mandate Improvement',
      'Mandate Lock-In',
    ],
    backHref: '/q94-public-commitments-tracker',
    backLabel: 'Public Commitments Tracker',
    nextHref: '/q96-decision-protocol-library',
    nextLabel: 'Decision Protocol Library',
  },
  Q96: {
    id: 'Q96',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision Protocol Library',
    purpose:
      'A library of decision protocols — the standard procedure for each class of call, from pricing changes to incident response.',
    dimensionLabels: [
      'Protocol Completeness',
      'Protocol Adherence',
      'Protocol Adaptability',
      'Executive Protocol Integrity',
    ],
    driverContext:
      "Structural Drivers provide protocol architecture. Identity Drivers shape protocol character. Cultural Drivers determine protocol adoption. Direction Drivers reveal the protocols required for the enterprise's highest decision performance.",
    correctionProtocols: [
      'Protocol Stabilisation',
      'Protocol Synchronisation',
      'Protocol Amplification',
      'Protocol Alignment',
      'Protocol Improvement',
      'Protocol Lock-In',
    ],
    backHref: '/q95-executive-mandate-tracker',
    backLabel: 'Executive Mandate Tracker',
    nextHref: '/q97-compliance-and-policy-rules',
    nextLabel: 'Compliance & Policy Rules',
  },
  Q97: {
    id: 'Q97',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Compliance & Policy Rules',
    purpose:
      'Encodes compliance and policy rules into your decision-making — so the check happens before the decision, not in the audit after it.',
    dimensionLabels: [
      'Governing Rule Inventory',
      'Law Adherence Index',
      'Law Violation Risk',
      'Governing Rule Completeness',
    ],
    driverContext:
      'Identity and Direction Drivers encode executive laws at the foundational level. Cultural Drivers determine whether laws are followed even under pressure. All seven drivers must honour executive law for decision integrity to be maintained.',
    correctionProtocols: [
      'Law Stabilisation',
      'Law Synchronisation',
      'Law Amplification',
      'Law Alignment',
      'Law Improvement',
      'Law Lock-In',
    ],
    backHref: '/q96-decision-protocol-library',
    backLabel: 'Decision Protocol Library',
    nextHref: '/q98-decision-authority-matrix',
    nextLabel: 'Decision Authority Matrix',
  },
  Q98: {
    id: 'Q98',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Decision Authority Matrix',
    purpose:
      'The authority matrix for your organization — who can approve what, up to what limit — ending the deals that die waiting to find out.',
    dimensionLabels: [
      'Internal Authority Completeness',
      'External Authority Recognition',
      'Authority Legitimacy',
      'Executive Authority Index',
    ],
    driverContext:
      'Identity Drivers create the foundation of authority. Direction Drivers define its ultimate scope. Market Drivers validate authority externally. Cultural Drivers determine whether authority is used wisely and consistently within the organisation.',
    correctionProtocols: [
      'Authority Stabilisation',
      'Authority Synchronisation',
      'Authority Amplification',
      'Authority Alignment',
      'Authority Improvement',
      'Authority Lock-In',
    ],
    backHref: '/q97-compliance-and-policy-rules',
    backLabel: 'Compliance & Policy Rules',
    nextHref: '/q99-enterprise-governance',
    nextLabel: 'Enterprise Governance',
  },
  Q99: {
    id: 'Q99',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Enterprise Governance',
    purpose:
      'Assesses governance across your whole enterprise — board effectiveness, controls, and accountability, rated with evidence.',
    dimensionLabels: [
      'Governance Coverage',
      'Governance Consistency',
      'Governance Under Pressure',
      'Certification Readiness',
    ],
    driverContext:
      'Identity and Direction Drivers set the governance standard. Cultural and Structural Drivers determine whether it is applied consistently. Weak governance shows up first under pressure, not in normal conditions.',
    correctionProtocols: [
      'Governance Stabilisation',
      'Governance Synchronisation',
      'Governance Amplification',
      'Governance Alignment',
      'Governance Improvement',
      'Governance Lock-In',
    ],
    backHref: '/q98-decision-authority-matrix',
    backLabel: 'Decision Authority Matrix',
    nextHref: '/q100-executive-sign-off-and-certification',
    nextLabel: 'Executive Sign-Off & Certification',
  },
  Q100: {
    id: 'Q100',
    seriesName: 'Q-Series — Decision Intelligence',
    engineName: 'Executive Sign-Off & Certification',
    purpose:
      'Runs formal sign-off — decisions certified by name, on the record, so accountability survives reorganisations.',
    dimensionLabels: [
      'Findings Closed',
      'Standard Completeness',
      'Decision Quality Index',
      'Sign-Off Readiness',
    ],
    driverContext:
      'Direction Drivers set what the organisation is certifying against. Structural Drivers determine whether the evidence exists to support sign-off. Certification is earned by closing findings across the series, not asserted at the end of it.',
    correctionProtocols: [
      'Evidence Gathering',
      'Finding Closure',
      'Standard Alignment',
      'Sign-Off Verification',
      'Certification Improvement',
      'Certification Lock-In',
    ],
    backHref: '/q99-enterprise-governance',
    backLabel: 'Enterprise Governance Engine',
    nextHref: '/intelligence-hub',
    nextLabel: 'Intelligence Hub',
  },

  /* ── X-SERIES ─────────────────────────────────────────────── */
  X01: {
    id: 'X01',
    seriesName: 'X-Series — Protection Intelligence',
    engineName: 'Enterprise Protection',
    purpose:
      'Assesses how well your enterprise is protected end to end — assets, people, data, and reputation — and where the exposures concentrate.',
    dimensionLabels: [
      'Structural Risk Exposure',
      'Human Risk Exposure',
      'Market Threat Level',
      'Systemic Vulnerability',
    ],
    driverContext:
      'Market Drivers and Structural Drivers create the most protection signals. Identity Drivers determine risk appetite and organisational resilience culture.',
    correctionProtocols: [
      'Protection Stabilisation',
      'Risk Mitigation',
      'Threat Response',
      'Exposure Reduction',
      'Protection Improvement',
      'Protection Lock-In',
    ],
    backHref: '/intelligence-hub',
    backLabel: 'Intelligence Hub',
    nextHref: '/x02-security',
    nextLabel: 'Security Intelligence',
  },
  X02: {
    id: 'X02',
    seriesName: 'X-Series — Protection Intelligence',
    engineName: 'Security Intelligence',
    purpose:
      'Assesses your security posture, physical and digital — rating each dimension with the evidence behind it, so gaps surface before incidents do.',
    dimensionLabels: [
      'Cyber Security Posture',
      'Data Protection Status',
      'Physical Security',
      'Operational Security',
    ],
    driverContext:
      'Structural Drivers and Market Drivers create the most security signals. Timing Drivers govern when threats arrive and how quickly they must be resolved.',
    correctionProtocols: [
      'Security Stabilisation',
      'Threat Neutralisation',
      'Security Amplification',
      'Coverage Alignment',
      'Security Improvement',
      'Security Lock-In',
    ],
    backHref: '/x01-protection',
    backLabel: 'Enterprise Protection',
    nextHref: '/x03-governance',
    nextLabel: 'Governance Intelligence',
  },
  X03: {
    id: 'X03',
    seriesName: 'X-Series — Protection Intelligence',
    engineName: 'Governance Intelligence',
    purpose:
      'Assesses your governance strength — decision rights, oversight, and traceability — the machinery that keeps a growing business auditable.',
    dimensionLabels: [
      'Decision Rights Clarity',
      'Oversight Effectiveness',
      'Accountability Structure',
      'Control Integrity',
    ],
    driverContext:
      'Structural Drivers define governance architecture. Cultural Drivers determine whether it is respected or bypassed. Identity Drivers reveal whether governance reflects who the enterprise claims to be.',
    correctionProtocols: [
      'Governance Stabilisation',
      'Authority Realignment',
      'Oversight Amplification',
      'Accountability Alignment',
      'Governance Improvement',
      'Governance Lock-In',
    ],
    backHref: '/x02-security',
    backLabel: 'Security Intelligence',
    nextHref: '/x04-compliance',
    nextLabel: 'Compliance Intelligence',
  },
  X04: {
    id: 'X04',
    seriesName: 'X-Series — Protection Intelligence',
    engineName: 'Compliance Intelligence',
    purpose:
      "Assesses your compliance position, regulation by regulation — separating what's evidenced from what's merely believed.",
    dimensionLabels: [
      'Regulatory Compliance',
      'Policy Adherence',
      'Audit Readiness',
      'Reporting Integrity',
    ],
    driverContext:
      'Structural Drivers define compliance frameworks. Market Drivers determine which regulations apply. Cultural Drivers determine whether compliance is embedded or performed.',
    correctionProtocols: [
      'Compliance Stabilisation',
      'Gap Remediation',
      'Compliance Amplification',
      'Policy Alignment',
      'Compliance Improvement',
      'Compliance Lock-In',
    ],
    backHref: '/x03-governance',
    backLabel: 'Governance Intelligence',
    nextHref: '/x05-ethics',
    nextLabel: 'Ethics Intelligence',
  },
  X05: {
    id: 'X05',
    seriesName: 'X-Series — Protection Intelligence',
    engineName: 'Ethics Intelligence',
    purpose:
      'Assesses how your organization actually behaves against its ethical standards — conduct, conflicts, and culture — before a lapse becomes a headline.',
    dimensionLabels: ['Leadership Ethics', 'Decision Ethics', 'Cultural Ethics', 'Systemic Ethics'],
    driverContext:
      'Identity Drivers determine ethical character. Cultural Drivers determine how ethics is embedded in daily behaviour. Direction Drivers reveal whether ethics and ambition are aligned or in conflict.',
    correctionProtocols: [
      'Ethics Stabilisation',
      'Conduct Realignment',
      'Ethics Amplification',
      'Ethical Alignment',
      'Ethics Improvement',
      'Ethics Lock-In',
    ],
    backHref: '/x04-compliance',
    backLabel: 'Compliance Intelligence',
    nextHref: '/x06-resilience',
    nextLabel: 'Resilience Intelligence',
  },
  X06: {
    id: 'X06',
    seriesName: 'X-Series — Protection Intelligence',
    engineName: 'Resilience Intelligence',
    purpose:
      'Assesses how much shock your organization can absorb — financial, operational, and human — and where a single hit would cascade.',
    dimensionLabels: [
      'Shock Absorption Capacity',
      'Adaptive Response Speed',
      'Recovery Velocity',
      'Structural Redundancy',
    ],
    driverContext:
      'Timing Drivers govern recovery speed and shock timing. Cultural Drivers determine whether teams adapt or freeze under pressure. Structural Drivers define how much redundancy exists before failure cascades.',
    correctionProtocols: [
      'Resilience Stabilisation',
      'Redundancy Reinforcement',
      'Adaptive Amplification',
      'Recovery Alignment',
      'Resilience Improvement',
      'Resilience Lock-In',
    ],
    backHref: '/x05-ethics',
    backLabel: 'Ethics Intelligence',
    nextHref: '/x07-continuity',
    nextLabel: 'Continuity Intelligence',
  },
  X07: {
    id: 'X07',
    seriesName: 'X-Series — Protection Intelligence',
    engineName: 'Continuity Intelligence',
    purpose:
      'Assesses your ability to keep operating through disruption — backups, successors, and alternatives that are tested, not assumed.',
    dimensionLabels: [
      'Operational Continuity',
      'Knowledge Retention',
      'Succession Readiness',
      'Critical Dependency Risk',
    ],
    driverContext:
      'Structural Drivers expose single points of failure. Cultural Drivers determine whether knowledge is shared or hoarded. Direction Drivers reveal whether the enterprise can outlive its current leadership.',
    correctionProtocols: [
      'Continuity Stabilisation',
      'Dependency Reduction',
      'Knowledge Amplification',
      'Succession Alignment',
      'Continuity Improvement',
      'Continuity Lock-In',
    ],
    backHref: '/x06-resilience',
    backLabel: 'Resilience Intelligence',
    nextHref: '/intelligence-hub',
    nextLabel: 'Intelligence Hub',
  },

  /* ── A-SERIES ─────────────────────────────────────────────── */
  /* A07 does not exist in ProdLamid's own registry either — verified
     against ProdLamid's source directly, same as G06. Its
     talent-diagnostics page references MODULE_REGISTRY["A07"] and
     falls back to the generic placeholder in both apps. This is the
     suite's actual named entry-point diagnostic (parallel to Q44 for
     CORE) — broader than A08's risk focus or A15's capability-uplift
     planning focus, so it needed its own dimensions rather than
     reusing either. A standard workforce-health scorecard shape:
     capability coverage, retention risk, succession readiness, and
     engagement signal — the four things a talent leader checks first. */
  A02: {
    id: 'A02',
    seriesName: 'A-Series — TALENT Intelligence',
    engineName: 'Capability Assessment',
    purpose:
      'Scores whether your people actually have the skills your strategy needs next — not the skills on file, the skills in practice.',
    dimensionLabels: [
      'Skill-Strategy Fit',
      'Depth Beyond Named Experts',
      'Capability Currency',
      'Development Trajectory',
    ],
    driverContext:
      'Direction Drivers define the skills the strategy actually needs. Human Drivers reveal true depth versus single points of expertise. Timing Drivers govern how fast capability is decaying or growing.',
    correctionProtocols: [
      'Capability Stabilisation',
      'Skill Gap Closure',
      'Depth Building',
      'Currency Improvement',
      'Trajectory Amplification',
      'Capability Lock-In',
    ],
    backHref: '/suites/talent',
    backLabel: 'LAMID TALENT',
    nextHref: '/talent-workforce-planning',
    nextLabel: 'Workforce Planning',
  },
  A03: {
    id: 'A03',
    seriesName: 'A-Series — TALENT Intelligence',
    engineName: 'Workforce Planning',
    purpose:
      'Assesses whether your headcount and capability plan actually matches where the business is going, not where it has been.',
    dimensionLabels: [
      'Demand Forecast Accuracy',
      'Supply Pipeline Health',
      'Scenario Coverage',
      'Planning Cycle Discipline',
    ],
    inputs: { kind: 'roadmap' },
    driverContext:
      'Direction Drivers set the demand the plan has to meet. Timing Drivers govern how far ahead the plan can see reliably. Structural Drivers determine whether the pipeline can actually deliver against it.',
    correctionProtocols: [
      'Planning Stabilisation',
      'Forecast Correction',
      'Pipeline Strengthening',
      'Scenario Expansion',
      'Discipline Improvement',
      'Workforce Lock-In',
    ],
    backHref: '/talent-capability',
    backLabel: 'Capability Assessment',
    nextHref: '/talent-leadership-pipeline',
    nextLabel: 'Leadership Pipeline',
  },
  A04: {
    id: 'A04',
    seriesName: 'A-Series — TALENT Intelligence',
    engineName: 'Leadership Pipeline',
    purpose:
      'Scores how real your leadership bench actually is — named successors with genuine readiness, not an org chart that only looks complete.',
    dimensionLabels: [
      'Pipeline Depth',
      'Readiness Accuracy',
      'Development Velocity',
      'Retention of Key Successors',
    ],
    driverContext:
      'Human Drivers reveal who is genuinely ready versus assumed ready. Identity Drivers determine succession character — bold or conservative. Timing Drivers govern how fast readiness gaps are closing.',
    correctionProtocols: [
      'Pipeline Stabilisation',
      'Depth Building',
      'Readiness Verification',
      'Velocity Improvement',
      'Retention Reinforcement',
      'Leadership Lock-In',
    ],
    backHref: '/talent-workforce-planning',
    backLabel: 'Workforce Planning',
    nextHref: '/talent-culture-intelligence',
    nextLabel: 'Culture Intelligence',
  },
  A05: {
    id: 'A05',
    seriesName: 'A-Series — TALENT Intelligence',
    engineName: 'Culture Intelligence',
    purpose:
      'Reads culture from behaviour and outcomes rather than survey sentiment alone — what is actually being rewarded and repeated, not what people say they value.',
    dimensionLabels: [
      'Behavioural Consistency',
      'Values-Action Alignment',
      'Psychological Safety Signal',
      'Culture-Performance Link',
    ],
    driverContext:
      'Cultural Drivers are the direct subject here. Identity Drivers determine whether stated values match lived ones. Human Drivers surface the behavioural evidence underneath the sentiment.',
    correctionProtocols: [
      'Culture Stabilisation',
      'Consistency Improvement',
      'Alignment Correction',
      'Safety Reinforcement',
      'Performance Linkage',
      'Culture Lock-In',
    ],
    backHref: '/talent-leadership-pipeline',
    backLabel: 'Leadership Pipeline',
    nextHref: '/talent-workforce-readiness',
    nextLabel: 'Workforce Readiness',
  },
  A06: {
    id: 'A06',
    seriesName: 'A-Series — TALENT Intelligence',
    engineName: 'Workforce Readiness',
    purpose:
      'Scores whether the workforce is ready for what is coming next — not what already happened.',
    dimensionLabels: [
      'Skill Readiness',
      'Capacity Headroom',
      'Change Absorption Capacity',
      'Critical Role Coverage',
    ],
    driverContext:
      "Direction Drivers define what 'ready' has to mean. Timing Drivers reveal how much runway there actually is. Structural Drivers determine whether critical roles have real cover.",
    correctionProtocols: [
      'Readiness Stabilisation',
      'Skill Acceleration',
      'Headroom Creation',
      'Absorption Improvement',
      'Coverage Reinforcement',
      'Readiness Lock-In',
    ],
    backHref: '/talent-culture-intelligence',
    backLabel: 'Culture Intelligence',
    nextHref: '/talent-diagnostics',
    nextLabel: 'Talent Diagnostics',
  },
  A07: {
    id: 'A07',
    seriesName: 'A-Series — TALENT Intelligence',
    engineName: 'Talent Diagnostics',
    purpose:
      'The entry-point read on workforce health — capability coverage, flight risk, succession depth and engagement signal, in one score before you go looking for any one of them individually.',
    dimensionLabels: [
      'Capability Coverage',
      'Retention & Flight Risk',
      'Succession Readiness',
      'Engagement & Culture Signal',
    ],
    driverContext:
      'Human Drivers generate the underlying workforce signal. Structural Drivers determine whether capability and succession are actually covered or only look covered. Cultural Drivers shape engagement and retention. Direction Drivers reveal the workforce the strategy will need next.',
    correctionProtocols: [
      'Diagnostic Stabilisation',
      'Coverage Correction',
      'Retention Intervention',
      'Succession Build-Out',
      'Engagement Improvement',
      'Workforce Lock-In',
    ],
    backHref: '/talent-workforce-readiness',
    backLabel: 'Workforce Readiness',
    nextHref: '/a08-talent-risk',
    nextLabel: 'Talent Risk Intelligence',
  },
  A08: {
    id: 'A08',
    seriesName: 'A-Series — TALENT Intelligence',
    engineName: 'Talent Risk Intelligence',
    purpose:
      'Measures the people risk in your organization — who might leave, what leaves with them, and which roles have no cover.',
    dimensionLabels: [
      'Capability Risk Index',
      'Leadership Continuity Risk',
      'Culture Stability Risk',
      'Attrition Velocity',
    ],
    driverContext:
      "Human Drivers surface the underlying risk signals. Identity Drivers determine whether risk patterns are structural or situational. Direction Drivers reveal the talent risks that will block or enable the enterprise's future.",
    correctionProtocols: [
      'Risk Identification',
      'Risk Stabilisation',
      'Risk Mitigation',
      'Risk Realignment',
      'Risk Improvement',
      'Risk Lock-In',
    ],
    backHref: '/intelligence-hub',
    backLabel: 'Intelligence Hub',
    nextHref: '/a09-talent-opportunity',
    nextLabel: 'Talent Opportunity',
  },
  A09: {
    id: 'A09',
    seriesName: 'A-Series — TALENT Intelligence',
    engineName: 'Talent Opportunity Intelligence',
    purpose:
      'Finds the untapped opportunity in your workforce — the people ready for more than their current role asks of them.',
    dimensionLabels: [
      'High-Potential Identification',
      'Capability Opportunity Score',
      'Workforce Strength Signals',
      'Development Opportunity Index',
    ],
    driverContext:
      "Human Drivers reveal latent opportunity. Identity Drivers determine whether opportunity is recognised and acted upon. Direction Drivers clarify the opportunities most aligned with the enterprise's future trajectory.",
    correctionProtocols: [
      'Opportunity Identification',
      'Opportunity Activation',
      'Opportunity Amplification',
      'Opportunity Alignment',
      'Opportunity Improvement',
      'Opportunity Lock-In',
    ],
    backHref: '/a08-talent-risk',
    backLabel: 'Talent Risk',
    nextHref: '/a10-talent-performance',
    nextLabel: 'Talent Performance',
  },
  A10: {
    id: 'A10',
    seriesName: 'A-Series — TALENT Intelligence',
    engineName: 'Talent Performance Intelligence',
    purpose:
      'Measures performance across your workforce with structure and evidence — separating true performance from visibility.',
    dimensionLabels: [
      'Capability Performance',
      'Leadership Performance',
      'Culture Performance',
      'Transformation Performance',
    ],
    driverContext:
      'Human Drivers carry the richest performance data. Cultural Drivers determine performance norms. Identity Drivers reveal whether performance is authentic expression or compliance.',
    correctionProtocols: [
      'Performance Stabilisation',
      'Performance Realignment',
      'Performance Amplification',
      'Performance Alignment',
      'Performance Improvement',
      'Performance Lock-In',
    ],
    backHref: '/a09-talent-opportunity',
    backLabel: 'Talent Opportunity',
    nextHref: '/a11-talent-engagement',
    nextLabel: 'Talent Engagement',
  },
  A11: {
    id: 'A11',
    seriesName: 'A-Series — TALENT Intelligence',
    engineName: 'Talent Engagement Intelligence',
    purpose:
      'Measures how engaged your people really are — commitment you can act on, team by team, not one annual survey average.',
    dimensionLabels: [
      'Engagement Score',
      'Engagement Velocity',
      'Engagement Risk Level',
      'Driver Alignment',
    ],
    driverContext:
      'Human Drivers generate engagement signals. Cultural Drivers determine engagement sustainability. Identity Drivers reveal whether the enterprise creates conditions for genuine engagement.',
    correctionProtocols: [
      'Engagement Stabilisation',
      'Engagement Realignment',
      'Engagement Amplification',
      'Engagement Alignment',
      'Engagement Improvement',
      'Engagement Lock-In',
    ],
    backHref: '/a10-talent-performance',
    backLabel: 'Talent Performance',
    nextHref: '/a12-talent-sentiment',
    nextLabel: 'Talent Sentiment',
  },
  A12: {
    id: 'A12',
    seriesName: 'A-Series — TALENT Intelligence',
    engineName: 'Talent Sentiment Intelligence',
    purpose:
      "Reads your workforce's sentiment — how people feel about direction, leadership, and change — while there's still time to respond.",
    dimensionLabels: [
      'Sentiment Score',
      'Positive Sentiment Trend',
      'Negative Sentiment Signals',
      'Sentiment Volatility',
    ],
    driverContext:
      'Human Drivers carry the underlying sentiment data. Cultural Drivers amplify or suppress sentiment expression. Leadership behaviour is the primary sentiment driver across all workforce tiers.',
    correctionProtocols: [
      'Sentiment Stabilisation',
      'Sentiment Realignment',
      'Sentiment Amplification',
      'Sentiment Alignment',
      'Sentiment Improvement',
      'Sentiment Lock-In',
    ],
    backHref: '/a11-talent-engagement',
    backLabel: 'Talent Engagement',
    nextHref: '/a13-talent-experience',
    nextLabel: 'Talent Experience',
  },
  A13: {
    id: 'A13',
    seriesName: 'A-Series — TALENT Intelligence',
    engineName: 'Talent Experience Intelligence',
    purpose:
      'Assesses the experience of working at your company, from onboarding to exit — and where it quietly drives good people out.',
    dimensionLabels: [
      'Onboarding Experience',
      'Role Clarity Score',
      'Workload Balance',
      'Growth & Development Satisfaction',
    ],
    driverContext:
      "Human Drivers reveal experience quality at every lifecycle stage. Cultural Drivers determine whether good experience is systemic or individual. Identity Drivers shape the organisation's experience design philosophy.",
    correctionProtocols: [
      'Experience Stabilisation',
      'Experience Realignment',
      'Experience Amplification',
      'Experience Alignment',
      'Experience Improvement',
      'Experience Lock-In',
    ],
    backHref: '/a12-talent-sentiment',
    backLabel: 'Talent Sentiment',
    nextHref: '/a14-talent-lifecycle',
    nextLabel: 'Talent Lifecycle',
  },
  A14: {
    id: 'A14',
    seriesName: 'A-Series — TALENT Intelligence',
    engineName: 'Talent Lifecycle Intelligence',
    purpose:
      "Views each employee's full lifecycle — hire, growth, moves, exit — so your decisions about people use the whole story.",
    dimensionLabels: [
      'Lifecycle Health Score',
      'Onboarding-to-Performance Gap',
      'Retention Risk',
      'Exit Pattern Intelligence',
    ],
    driverContext:
      "Human Drivers map lifecycle transitions. Timing Drivers reveal lifecycle velocity and timing patterns. Identity Drivers determine whether the lifecycle reflects the enterprise's authentic talent philosophy.",
    correctionProtocols: [
      'Lifecycle Stabilisation',
      'Lifecycle Realignment',
      'Lifecycle Amplification',
      'Lifecycle Alignment',
      'Lifecycle Improvement',
      'Lifecycle Lock-In',
    ],
    backHref: '/a13-talent-experience',
    backLabel: 'Talent Experience',
    nextHref: '/a15-capability-uplift',
    nextLabel: 'Capability Uplift',
  },
  A15: {
    id: 'A15',
    seriesName: 'A-Series — TALENT Intelligence',
    engineName: 'Talent Capability Uplift',
    purpose:
      "Plans your capability uplift — the skills your strategy needs next, who's closest to them, and the fastest route to close the gap.",
    dimensionLabels: [
      'Uplift Potential Score',
      'Capability Velocity',
      'Development ROI',
      'Skill Gap Closure Rate',
    ],
    driverContext:
      'Human Drivers identify uplift candidates and readiness. Direction Drivers reveal the capability levels the enterprise must build toward. Timing Drivers govern uplift speed and development pacing.',
    correctionProtocols: [
      'Uplift Stabilisation',
      'Uplift Activation',
      'Uplift Amplification',
      'Uplift Alignment',
      'Uplift Improvement',
      'Uplift Lock-In',
    ],
    backHref: '/a14-talent-lifecycle',
    backLabel: 'Talent Lifecycle',
    nextHref: '/a16-leadership-uplift',
    nextLabel: 'Leadership Uplift',
  },
  A16: {
    id: 'A16',
    seriesName: 'A-Series — TALENT Intelligence',
    engineName: 'Talent Leadership Uplift',
    purpose:
      'Develops your next layer of leaders — assessing readiness and targeting growth where leadership gaps threaten your plans.',
    dimensionLabels: [
      'Leadership Readiness Gap',
      'Behaviour Improvement Rate',
      'Leadership Velocity',
      'Development Pathway Completion',
    ],
    driverContext:
      "Human Drivers reveal leadership readiness and gap severity. Identity Drivers determine the leadership character the enterprise must develop. Direction Drivers clarify the leadership capability required for the enterprise's future.",
    correctionProtocols: [
      'Leadership Stabilisation',
      'Leadership Realignment',
      'Leadership Amplification',
      'Leadership Alignment',
      'Leadership Improvement',
      'Leadership Lock-In',
    ],
    backHref: '/a15-capability-uplift',
    backLabel: 'Capability Uplift',
    nextHref: '/a17-talent-acceleration-i',
    nextLabel: 'Talent Acceleration I',
  },
  A17: {
    id: 'A17',
    seriesName: 'A-Series — TALENT Intelligence',
    engineName: 'Talent Acceleration Engine Part I',
    purpose:
      "Stage one of talent acceleration — baselining your workforce's capability and potential, so development starts from facts.",
    dimensionLabels: [
      'Acceleration Potential',
      'Capability-to-Performance Velocity',
      'Acceleration Pathway Strength',
      'Momentum Score',
    ],
    driverContext:
      'Human Drivers supply the acceleration raw material. Timing Drivers govern acceleration pacing and momentum. Direction Drivers reveal which acceleration pathways are most aligned with enterprise trajectory.',
    correctionProtocols: [
      'Acceleration Stabilisation',
      'Pathway Activation',
      'Acceleration Amplification',
      'Acceleration Alignment',
      'Acceleration Improvement',
      'Acceleration Lock-In',
    ],
    backHref: '/a16-leadership-uplift',
    backLabel: 'Leadership Uplift',
    nextHref: '/a18-talent-acceleration-ii',
    nextLabel: 'Talent Acceleration II',
  },
  A18: {
    id: 'A18',
    seriesName: 'A-Series — TALENT Intelligence',
    engineName: 'Talent Acceleration Engine Part II',
    purpose:
      "Stage two of talent acceleration — targeted development plans matched to each high-potential's gap, with owners and timelines.",
    dimensionLabels: [
      'Sprint Activation Rate',
      'Ritual Adoption Score',
      'Workflow Integration',
      'Acceleration Cadence',
    ],
    driverContext:
      'Cultural Drivers determine whether acceleration rituals take root. Structural Drivers provide the operational framework. Human Drivers generate the behavioural momentum required for embedded acceleration.',
    correctionProtocols: [
      'Sprint Stabilisation',
      'Ritual Activation',
      'Workflow Amplification',
      'Cadence Alignment',
      'Acceleration Improvement',
      'Acceleration Lock-In',
    ],
    backHref: '/a17-talent-acceleration-i',
    backLabel: 'Talent Acceleration I',
    nextHref: '/a19-talent-acceleration-iii',
    nextLabel: 'Talent Acceleration III',
  },
  A19: {
    id: 'A19',
    seriesName: 'A-Series — TALENT Intelligence',
    engineName: 'Talent Acceleration Engine Part III',
    purpose:
      'Stage three of talent acceleration — stretch deployment, moving accelerating talent into real assignments that compound their growth.',
    dimensionLabels: [
      'Governance Compliance',
      'Scaling Adoption',
      'Acceleration Standards Score',
      'Cross-Functional Alignment',
    ],
    driverContext:
      'Structural Drivers create the governance architecture. Identity Drivers determine whether governance is authentic or performative. Direction Drivers reveal the governance standards the enterprise must establish to sustain acceleration.',
    correctionProtocols: [
      'Governance Stabilisation',
      'Scaling Activation',
      'Standards Amplification',
      'Cross-Function Alignment',
      'Governance Improvement',
      'Governance Lock-In',
    ],
    backHref: '/a18-talent-acceleration-ii',
    backLabel: 'Talent Acceleration II',
    nextHref: '/a20-talent-acceleration-iv',
    nextLabel: 'Talent Acceleration IV',
  },
  A20: {
    id: 'A20',
    seriesName: 'A-Series — TALENT Intelligence',
    engineName: 'Talent Acceleration Engine Part IV',
    purpose:
      'Stage four of talent acceleration — consolidation: measuring who actually accelerated, locking in the gains, and refreshing the pipeline.',
    dimensionLabels: [
      'Impact Magnitude',
      'Transformation Velocity',
      'Performance Uplift Achieved',
      'Acceleration ROI',
    ],
    driverContext:
      'Direction Drivers define the impact standard the enterprise must achieve. Timing Drivers measure impact velocity. Human and Cultural Drivers determine whether impact is sustained or episodic.',
    correctionProtocols: [
      'Impact Stabilisation',
      'Impact Activation',
      'Impact Amplification',
      'Impact Alignment',
      'Impact Improvement',
      'Impact Lock-In',
    ],
    backHref: '/a19-talent-acceleration-iii',
    backLabel: 'Talent Acceleration III',
    nextHref: '/a21-succession-pipeline',
    nextLabel: 'Succession Pipeline',
  },
  A21: {
    id: 'A21',
    seriesName: 'A-Series — TALENT Intelligence',
    engineName: 'Succession & Leadership Pipeline',
    purpose:
      'Maps your succession pipeline — which critical roles have a ready successor, which have nobody, and how exposed each gap leaves you.',
    dimensionLabels: [
      'Succession Readiness',
      'Pipeline Strength Score',
      'Critical Role Coverage',
      'Bench Depth Index',
    ],
    driverContext:
      'Human Drivers reveal successor readiness. Direction Drivers identify the leadership pipeline the enterprise must build. Timing Drivers govern succession timing and urgency.',
    correctionProtocols: [
      'Pipeline Stabilisation',
      'Succession Activation',
      'Pipeline Amplification',
      'Succession Alignment',
      'Pipeline Improvement',
      'Pipeline Lock-In',
    ],
    backHref: '/a20-talent-acceleration-iv',
    backLabel: 'Talent Acceleration IV',
    nextHref: '/a22-bench-strength',
    nextLabel: 'Bench Strength',
  },
  A22: {
    id: 'A22',
    seriesName: 'A-Series — TALENT Intelligence',
    engineName: 'Leadership Bench Strength',
    purpose:
      'Measures the depth of your leadership bench — how many ready-now leaders stand behind each key seat.',
    dimensionLabels: [
      'Bench Depth Score',
      'Leadership Supply Forecast',
      'Vulnerability Zone Count',
      'Bench Resilience Index',
    ],
    /* Succession is a COVERAGE question answered per seat, not a
       weighted mean over four abstractions — a seat with nobody behind
       it is not offset by a seat with three. See benchStrength.ts. */
    inputs: { kind: 'bench-strength' },
    driverContext:
      'Human Drivers map bench capacity and quality. Structural Drivers determine bench architecture. Direction Drivers reveal the bench strength the enterprise must achieve to execute its future.',
    correctionProtocols: [
      'Bench Stabilisation',
      'Bench Deepening',
      'Bench Amplification',
      'Bench Alignment',
      'Bench Improvement',
      'Bench Lock-In',
    ],
    backHref: '/a21-succession-pipeline',
    backLabel: 'Succession Pipeline',
    nextHref: '/a23-behavioral-competency',
    nextLabel: 'Behavioral Competency',
  },
  A23: {
    id: 'A23',
    seriesName: 'A-Series — TALENT Intelligence',
    engineName: 'Behavioral Competency',
    purpose:
      'Assesses behavioural competencies — how your people operate under pressure, in teams, and with customers — alongside what they know.',
    dimensionLabels: [
      'Competency Score',
      'Behavioral Gap Severity',
      'Communication Competency',
      'Adaptability Score',
    ],
    driverContext:
      "Human Drivers carry the richest behavioural data. Cultural Drivers determine which competencies are valued and reinforced. Identity Drivers reveal the competency character that defines the enterprise's people.",
    correctionProtocols: [
      'Competency Stabilisation',
      'Competency Realignment',
      'Competency Amplification',
      'Competency Alignment',
      'Competency Improvement',
      'Competency Lock-In',
    ],
    backHref: '/a22-bench-strength',
    backLabel: 'Bench Strength',
    nextHref: '/a24-performance-alignment',
    nextLabel: 'Performance Alignment',
  },
  A24: {
    id: 'A24',
    seriesName: 'A-Series — TALENT Intelligence',
    engineName: 'Performance & Capability Alignment',
    purpose:
      'Checks performance against capability — spotting strong people in the wrong roles, and roles that set capable people up to fail.',
    dimensionLabels: [
      'Alignment Score',
      'High-Potential Talent %',
      'Misalignment Risk Level',
      'Capability-Performance Correlation',
    ],
    driverContext:
      'Human Drivers supply both capability and performance data. Identity Drivers determine the alignment standard. Direction Drivers reveal the capability-performance alignment the enterprise must reach to fulfil its purpose.',
    correctionProtocols: [
      'Alignment Stabilisation',
      'Alignment Activation',
      'Alignment Amplification',
      'Misalignment Correction',
      'Alignment Improvement',
      'Alignment Lock-In',
    ],
    backHref: '/a23-behavioral-competency',
    backLabel: 'Behavioral Competency',
    nextHref: '/a25-career-pathing',
    nextLabel: 'Career Pathing',
  },
  A25: {
    id: 'A25',
    seriesName: 'A-Series — TALENT Intelligence',
    engineName: 'Career Pathing',
    purpose:
      'Generates personalised career pathways for your people — aligned to capability, performance, and aspiration — so your best can see a future with you.',
    dimensionLabels: [
      'Career Readiness Score',
      'Mobility Velocity',
      'Pathway Completion Rate',
      'Capability Gap to Next Role',
    ],
    driverContext:
      'Human Drivers reveal individual career readiness and aspiration. Direction Drivers clarify pathways aligned with enterprise and individual purpose. Timing Drivers govern career move timing and velocity.',
    correctionProtocols: [
      'Pathway Stabilisation',
      'Pathway Activation',
      'Pathway Amplification',
      'Pathway Alignment',
      'Pathway Improvement',
      'Pathway Lock-In',
    ],
    backHref: '/a24-performance-alignment',
    backLabel: 'Performance Alignment',
    nextHref: '/a26-workforce-forecasting',
    nextLabel: 'Workforce Forecasting',
  },
  A26: {
    id: 'A26',
    seriesName: 'A-Series — TALENT Intelligence',
    engineName: 'Workforce Planning Readiness',
    purpose:
      'Tests whether your workforce is ready for the plan — headcount, skills, and timing checked against what your strategy assumes.',
    dimensionLabels: [
      'Workforce Supply Forecast',
      'Capability Demand Gap',
      'Hiring vs Upskilling Score',
      'Workforce Risk Index',
    ],
    inputs: { kind: 'roadmap' },
    driverContext:
      'Human Drivers supply workforce data. Market Drivers reveal external talent supply and demand dynamics. Direction Drivers determine the workforce composition the enterprise must build toward.',
    correctionProtocols: [
      'Forecast Stabilisation',
      'Supply Activation',
      'Demand Amplification',
      'Forecast Alignment',
      'Forecast Improvement',
      'Forecast Lock-In',
    ],
    backHref: '/a25-career-pathing',
    backLabel: 'Career Pathing',
    nextHref: '/a27-engagement-signals',
    nextLabel: 'Engagement Signals',
  },
  A27: {
    id: 'A27',
    seriesName: 'A-Series — TALENT Intelligence',
    engineName: 'Engagement & Culture Signals',
    purpose:
      'Tracks the live signals of engagement and culture health — participation, retention, sentiment — before the exit interviews explain them.',
    dimensionLabels: [
      'Signal Strength',
      'Cultural Drift Score',
      'Engagement Momentum',
      'Leadership Micro-Signal Quality',
    ],
    driverContext:
      "Human Drivers emit the strongest signals. Cultural Drivers determine the signal environment. Identity Drivers reveal whether signal patterns are consistent with the enterprise's authentic culture.",
    correctionProtocols: [
      'Signal Stabilisation',
      'Signal Amplification',
      'Signal Realignment',
      'Signal Alignment',
      'Signal Improvement',
      'Signal Lock-In',
    ],
    backHref: '/a26-workforce-forecasting',
    backLabel: 'Workforce Forecasting',
    nextHref: '/a28-executive-talent',
    nextLabel: 'Executive Talent',
  },
  A28: {
    id: 'A28',
    seriesName: 'A-Series — TALENT Intelligence',
    engineName: 'Executive Talent Intelligence',
    purpose:
      'Talent intelligence for your executive level — the strength, risk, and succession picture of the top team itself.',
    dimensionLabels: [
      'Talent Health Score',
      'Transformation Readiness',
      'Leadership Stability',
      'Workforce Risk Exposure',
    ],
    driverContext:
      'All seven drivers converge at the executive layer. Direction Drivers reveal the talent priorities the enterprise must address immediately. Identity Drivers determine the executive talent narrative that must be communicated.',
    correctionProtocols: [
      'Executive Stabilisation',
      'Priority Activation',
      'Intelligence Amplification',
      'Executive Alignment',
      'Executive Improvement',
      'Executive Lock-In',
    ],
    backHref: '/a27-engagement-signals',
    backLabel: 'Engagement Signals',
    nextHref: '/a29-enterprise-integration',
    nextLabel: 'Enterprise Integration',
  },
  A29: {
    id: 'A29',
    seriesName: 'A-Series — TALENT Intelligence',
    engineName: 'Enterprise Integration',
    purpose:
      'Assesses how well talent practice is integrated across your enterprise — one standard for hiring, growing, and promoting, or many.',
    dimensionLabels: [
      'Integration Completeness',
      'Cross-Module Alignment',
      'Enterprise Talent Score',
      'Unified Readiness Index',
    ],
    driverContext:
      'Structural Drivers create the integration architecture. All seven drivers must be active for full integration to occur. Identity Drivers determine whether integration is authentic or forced.',
    correctionProtocols: [
      'Integration Stabilisation',
      'Integration Activation',
      'Integration Amplification',
      'Integration Alignment',
      'Integration Improvement',
      'Integration Lock-In',
    ],
    backHref: '/a28-executive-talent',
    backLabel: 'Executive Talent',
    nextHref: '/a30-talent-fabric',
    nextLabel: 'Enterprise Talent Fabric',
  },
  A30: {
    id: 'A30',
    seriesName: 'A-Series — TALENT Intelligence',
    engineName: 'Enterprise Talent Fabric',
    purpose:
      'Maps your talent fabric — how skills, teams, and knowledge connect across the organization, and where the weave is thin.',
    dimensionLabels: [
      'Fabric Resilience Score',
      'Connectivity Matrix Strength',
      'Structural Drift Level',
      'Mesh Density Index',
    ],
    driverContext:
      "Structural Drivers create fabric architecture. Cultural Drivers determine fabric texture and resilience. Identity Drivers reveal whether the fabric reflects the enterprise's authentic talent character.",
    correctionProtocols: [
      'Fabric Stabilisation',
      'Fabric Strengthening',
      'Fabric Amplification',
      'Fabric Alignment',
      'Fabric Improvement',
      'Fabric Lock-In',
    ],
    backHref: '/a29-enterprise-integration',
    backLabel: 'Enterprise Integration',
    nextHref: '/a31-talent-flow',
    nextLabel: 'Enterprise Talent Flow',
  },
  A31: {
    id: 'A31',
    seriesName: 'A-Series — TALENT Intelligence',
    engineName: 'Enterprise Talent Flow',
    purpose:
      'Tracks how talent flows through your organization — hiring, internal moves, promotions, exits — and where the flow blocks.',
    dimensionLabels: [
      'Flow Velocity',
      'Friction Zone Count',
      'Flow Amplifier Strength',
      'Circulation Efficiency',
    ],
    driverContext:
      'Structural Drivers create flow channels. Timing Drivers govern flow velocity. Cultural Drivers determine whether intelligence circulates freely or pools and stagnates in silos.',
    correctionProtocols: [
      'Flow Stabilisation',
      'Friction Reduction',
      'Flow Amplification',
      'Flow Alignment',
      'Flow Improvement',
      'Flow Lock-In',
    ],
    backHref: '/a30-talent-fabric',
    backLabel: 'Enterprise Talent Fabric',
    nextHref: '/a32-etos',
    nextLabel: 'ETOS',
  },
  A32: {
    id: 'A32',
    seriesName: 'A-Series — TALENT Intelligence',
    engineName: 'ETOS — Enterprise Talent Operating System',
    purpose:
      'Your complete people operating picture — every talent signal in the organization, unified under one system.',
    dimensionLabels: [
      'OS Stability Score',
      'Intelligence Routing Health',
      'Governance Compliance',
      'Operating Velocity',
    ],
    driverContext:
      "All seven drivers must be active for ETOS to reach full operation. Identity Drivers encode the organisation's talent character; Direction Drivers determine the talent trajectory the OS must deliver toward.",
    correctionProtocols: [
      'ETOS Stabilisation',
      'Integration Completion',
      'ETOS Amplification',
      'Talent OS Alignment',
      'ETOS Improvement',
      'ETOS Lock-In',
    ],
    backHref: '/a31-talent-flow',
    backLabel: 'Enterprise Talent Flow',
    nextHref: '/intelligence-hub',
    nextLabel: 'Intelligence Hub',
  },

  /* ── Z-SERIES ─────────────────────────────────────────────── */
  Z01: {
    id: 'Z01',
    seriesName: 'Z-Series — Transformation Intelligence',
    engineName: 'Breakthrough Opportunity Mapping',
    purpose:
      'Maps your breakthrough opportunities — the few changes with step-change potential, separated from the stream of incremental fixes.',
    dimensionLabels: [
      'Strategic Intelligence Integration',
      'Operational Intelligence Integration',
      'Human Intelligence',
      'AI Intelligence',
    ],
    driverContext:
      'Timing Drivers and Direction Drivers are most critical here — decision point requires timing coherence and long-term alignment across all intelligence layers.',
    correctionProtocols: [
      'Decision Point Stabilisation',
      'Decision Point Synchronisation',
      'Decision Point Amplification',
      'Intelligence Alignment',
      'Decision Point Improvement',
      'Decision Point Lock-In',
    ],
    backHref: '/intelligence-hub',
    backLabel: 'Intelligence Hub',
    nextHref: '/z02-pace-of-transformation',
    nextLabel: 'Pace of Transformation',
  },
  Z02: {
    id: 'Z02',
    seriesName: 'Z-Series — Transformation Intelligence',
    engineName: 'Pace of Transformation',
    purpose:
      'Measures the real pace of your transformation — what has actually changed against plan, not activity that looks like progress.',
    dimensionLabels: [
      'Strategic Decision Point Velocity',
      'Operational Decision Point Velocity',
      'AI Integration Velocity',
      'Transformation Decision Point Velocity',
    ],
    driverContext:
      'Timing Drivers govern decision point velocity most directly. Direction Drivers define the velocity target. Identity Drivers determine whether acceleration is authentic or forced.',
    correctionProtocols: [
      'Velocity Stabilisation',
      'Velocity Synchronisation',
      'Velocity Amplification',
      'Velocity Alignment',
      'Velocity Improvement',
      'Velocity Lock-In',
    ],
    backHref: '/z01-breakthrough-opportunity-mapping',
    backLabel: 'Breakthrough Opportunity Mapping',
    nextHref: '/z03-transformation-drift-alert',
    nextLabel: 'Transformation Drift Alert',
  },
  Z03: {
    id: 'Z03',
    seriesName: 'Z-Series — Transformation Intelligence',
    engineName: 'Transformation Drift Alert',
    purpose:
      'Catches your transformation drifting off course — scope quietly narrowing, deadlines quietly moving — before the drift becomes the plan.',
    dimensionLabels: [
      'Strategic Intelligence Drift',
      'Operational Intelligence Drift',
      'AI–Human Drift',
      'Long-Term Alignment Drift',
    ],
    driverContext:
      'Cultural Drivers are the most common source of intelligence drift. Timing Drivers reveal drift accumulation over time. Identity Drivers determine whether drift is correctable or structural.',
    correctionProtocols: [
      'Drift Correction',
      'Drift Stabilisation',
      'Drift Reversal',
      'Drift Alignment',
      'Drift Improvement',
      'Drift Lock-In',
    ],
    backHref: '/z02-pace-of-transformation',
    backLabel: 'Pace of Transformation',
    nextHref: '/z04-transformation-stability-score',
    nextLabel: 'Transformation Stability Score',
  },
  Z04: {
    id: 'Z04',
    seriesName: 'Z-Series — Transformation Intelligence',
    engineName: 'Transformation Stability Score',
    purpose:
      'Scores whether your changes stick — which transformations hold after go-live, and which snap back the moment attention moves on.',
    dimensionLabels: [
      'Strategic Intelligence Stability',
      'Operational Intelligence Stability',
      'AI Integration Stability',
      'Human Intelligence Stability',
    ],
    driverContext:
      'Identity Drivers create the underlying decision point stability. Structural Drivers provide the operational foundation. Market Drivers are the primary source of destabilising pressure.',
    correctionProtocols: [
      'Stability Reinforcement',
      'Stability Synchronisation',
      'Stability Amplification',
      'Stability Alignment',
      'Stability Improvement',
      'Stability Lock-In',
    ],
    backHref: '/z03-transformation-drift-alert',
    backLabel: 'Transformation Drift Alert',
    nextHref: '/z05-transformation-alignment-across-teams',
    nextLabel: 'Transformation Alignment Across Teams',
  },
  Z05: {
    id: 'Z05',
    seriesName: 'Z-Series — Transformation Intelligence',
    engineName: 'Transformation Alignment Across Teams',
    purpose:
      'Checks that every team is transforming toward the same destination — not each running its own version of the change.',
    dimensionLabels: [
      'Intelligence Stream Convergence',
      'Human–AI Convergence',
      'Strategy–Execution Convergence',
      'Long-Term Convergence',
    ],
    driverContext:
      'All seven drivers must converge simultaneously for decision point to be achieved. Timing Drivers govern convergence timing. Direction Drivers set the convergence point.',
    correctionProtocols: [
      'Convergence Acceleration',
      'Convergence Synchronisation',
      'Convergence Amplification',
      'Divergence Correction',
      'Convergence Improvement',
      'Convergence Lock-In',
    ],
    backHref: '/z04-transformation-stability-score',
    backLabel: 'Transformation Stability Score',
    nextHref: '/z06-transformation-progress-tracker',
    nextLabel: 'Transformation Progress Tracker',
  },
  Z06: {
    id: 'Z06',
    seriesName: 'Z-Series — Transformation Intelligence',
    engineName: 'Transformation Progress Tracker',
    purpose:
      'Tracks your transformation milestone by milestone — delivered, slipped, or stalled — with an owner against each.',
    dimensionLabels: [
      'Strategic Intelligence Flow',
      'Operational Intelligence Flow',
      'Human Intelligence Flow',
      'AI Intelligence Flow',
    ],
    driverContext:
      'Structural Drivers create the flow architecture. Timing Drivers govern flow continuity. Identity Drivers determine whether intelligence flow is genuine or performative.',
    correctionProtocols: [
      'Flow Stabilisation',
      'Flow Synchronisation',
      'Flow Amplification',
      'Friction Reduction',
      'Flow Improvement',
      'Flow Lock-In',
    ],
    backHref: '/z05-transformation-alignment-across-teams',
    backLabel: 'Transformation Alignment Across Teams',
    nextHref: '/z07-transformation-identity-report',
    nextLabel: 'Transformation Identity Report',
  },
  Z07: {
    id: 'Z07',
    seriesName: 'Z-Series — Transformation Intelligence',
    engineName: 'Transformation Identity Report',
    purpose:
      'Reports what your organization is becoming — whether the transformation is changing the business, or just its slides.',
    dimensionLabels: [
      'Singular Identity Clarity',
      'Unified Intelligence Character',
      'AI–Human Identity Alignment',
      'Decision Point Persona',
    ],
    driverContext:
      'Identity Drivers are primary at this layer. Direction Drivers reveal the decision point identity the enterprise is moving toward. Cultural Drivers determine whether unified identity is embodied.',
    correctionProtocols: [
      'Identity Clarification',
      'Identity Synchronisation',
      'Identity Amplification',
      'Identity Alignment',
      'Identity Improvement',
      'Identity Lock-In',
    ],
    backHref: '/z06-transformation-progress-tracker',
    backLabel: 'Transformation Progress Tracker',
    nextHref: '/z08-enterprise-wide-intelligence-summary',
    nextLabel: 'Enterprise-Wide Intelligence Summary',
  },
  Z08: {
    id: 'Z08',
    seriesName: 'Z-Series — Transformation Intelligence',
    engineName: 'Enterprise-Wide Intelligence Summary',
    purpose:
      'Summarises intelligence across your whole enterprise — the cross-cutting findings no single department can see from where it sits.',
    dimensionLabels: [
      'Macro Intelligence Awareness',
      'Universal Pattern Recognition',
      'Global Market Intelligence',
      'Long-Term Direction Alignment',
    ],
    driverContext:
      "Direction Drivers are the primary gateway to enterprise-wide intelligence. Timing Drivers provide the timing map. Identity Drivers determine the enterprise's capacity to receive and integrate enterprise-wide intelligence.",
    correctionProtocols: [
      'Enterprise-Wide Stabilisation',
      'Enterprise-Wide Synchronisation',
      'Enterprise-Wide Amplification',
      'Enterprise-Wide Alignment',
      'Enterprise-Wide Improvement',
      'Enterprise-Wide Lock-In',
    ],
    backHref: '/z07-transformation-identity-report',
    backLabel: 'Transformation Identity Report',
    nextHref: '/z09-enterprise-consistency-check',
    nextLabel: 'Enterprise Consistency Check',
  },
  Z09: {
    id: 'Z09',
    seriesName: 'Z-Series — Transformation Intelligence',
    engineName: 'Enterprise Consistency Check',
    purpose:
      'Checks consistency across your enterprise — where policy, process, and practice diverge between units doing the same job.',
    dimensionLabels: [
      'Enterprise Intelligence Consistency',
      'Universal–Local Coherence',
      'Human–AI Enterprise-Wide Consistency',
      'Long-Term Coherence',
    ],
    driverContext:
      'Identity Drivers maintain coherence under enterprise-wide scale expansion. Direction Drivers define the coherence target. Cultural Drivers determine whether enterprise-wide coherence is embodied in daily operations.',
    correctionProtocols: [
      'Coherence Restoration',
      'Coherence Synchronisation',
      'Coherence Amplification',
      'Coherence Alignment',
      'Coherence Improvement',
      'Coherence Lock-In',
    ],
    backHref: '/z08-enterprise-wide-intelligence-summary',
    backLabel: 'Enterprise-Wide Intelligence Summary',
    nextHref: '/z10-enterprise-wide-alignment',
    nextLabel: 'Enterprise-Wide Alignment',
  },
  Z10: {
    id: 'Z10',
    seriesName: 'Z-Series — Transformation Intelligence',
    engineName: 'Enterprise-Wide Alignment',
    purpose:
      'Measures alignment across your enterprise — strategy, teams, and investment pointing the same way, or visibly not.',
    dimensionLabels: [
      'Enterprise-Wide–Enterprise Convergence',
      'Universal–Operational Convergence',
      'AI–Human Enterprise-Wide Convergence',
      'Long-Term Convergence Point',
    ],
    driverContext:
      'All seven drivers participate in enterprise-wide convergence. Direction Drivers define the convergence destination. Timing Drivers govern when enterprise-wide convergence windows open.',
    correctionProtocols: [
      'Convergence Acceleration',
      'Convergence Synchronisation',
      'Convergence Amplification',
      'Divergence Correction',
      'Convergence Improvement',
      'Convergence Lock-In',
    ],
    backHref: '/z09-enterprise-consistency-check',
    backLabel: 'Enterprise Consistency Check',
    nextHref: '/z11-enterprise-flow-tracker',
    nextLabel: 'Enterprise Flow Tracker',
  },
  Z11: {
    id: 'Z11',
    seriesName: 'Z-Series — Transformation Intelligence',
    engineName: 'Enterprise Flow Tracker',
    purpose:
      'Tracks how work, information, and decisions flow across your enterprise — and where they pool, queue, or vanish.',
    dimensionLabels: [
      'Enterprise Intelligence Flow',
      'Universal–Enterprise Flow',
      'AI–Enterprise Flow Integration',
      'Long-Term Flow Alignment',
    ],
    driverContext:
      'Direction Drivers create the primary enterprise-wide flow direction. Identity Drivers determine flow receptivity. Timing Drivers reveal when enterprise-wide flow windows are open.',
    correctionProtocols: [
      'Flow Stabilisation',
      'Flow Synchronisation',
      'Flow Amplification',
      'Flow Alignment',
      'Flow Improvement',
      'Flow Lock-In',
    ],
    backHref: '/z10-enterprise-wide-alignment',
    backLabel: 'Enterprise-Wide Alignment',
    nextHref: '/z12-enterprise-renewal-cycle',
    nextLabel: 'Enterprise Renewal Cycle',
  },
  Z12: {
    id: 'Z12',
    seriesName: 'Z-Series — Transformation Intelligence',
    engineName: 'Enterprise Renewal Cycle',
    purpose:
      'Assesses your renewal cycle — how routinely the organization refreshes its products, processes, and people before decline forces it to.',
    dimensionLabels: [
      'Intelligence Renewal Cycles',
      'Enterprise-Wide Renewal',
      'Human–AI Renewal',
      'Long-Term Renewal Arc',
    ],
    driverContext:
      'Timing Drivers govern renewal timing and cycles. Direction Drivers reveal the renewal trajectory. Cultural Drivers determine whether renewal is welcomed or resisted.',
    correctionProtocols: [
      'Renewal Initiation',
      'Renewal Synchronisation',
      'Renewal Amplification',
      'Renewal Alignment',
      'Renewal Improvement',
      'Renewal Lock-In',
    ],
    backHref: '/z11-enterprise-flow-tracker',
    backLabel: 'Enterprise Flow Tracker',
    nextHref: '/z13-enterprise-insight-index',
    nextLabel: 'Enterprise Insight Index',
  },
  Z13: {
    id: 'Z13',
    seriesName: 'Z-Series — Transformation Intelligence',
    engineName: 'Enterprise Insight Index',
    purpose:
      'Indexes how much usable insight your enterprise generates — and how much of it actually reaches a decision.',
    dimensionLabels: [
      'Strategic Self-Awareness',
      'Operational Awareness',
      'Workforce Collective Awareness',
      'AI Insight Integration',
    ],
    driverContext:
      'Identity Drivers create the awareness foundation. Direction Drivers reveal the awareness the enterprise is growing toward. Cultural Drivers determine whether awareness is shared and collective.',
    correctionProtocols: [
      'Awareness Restoration',
      'Awareness Synchronisation',
      'Awareness Amplification',
      'Awareness Alignment',
      'Awareness Improvement',
      'Awareness Lock-In',
    ],
    backHref: '/z12-enterprise-renewal-cycle',
    backLabel: 'Enterprise Renewal Cycle',
    nextHref: '/z14-organizational-insight-consistency',
    nextLabel: 'Organizational Insight Consistency',
  },
  Z14: {
    id: 'Z14',
    seriesName: 'Z-Series — Transformation Intelligence',
    engineName: 'Organizational Insight Consistency',
    purpose:
      'Checks whether different parts of your organization draw consistent conclusions from the same facts — or contradict each other in front of customers.',
    dimensionLabels: [
      'Insight Consistency Index',
      'Cross-Level Insight Alignment',
      'Human–AI Insight Consistency',
      'Long-Term Insight Consistency',
    ],
    driverContext:
      'Identity Drivers maintain awareness coherence. Cultural Drivers embed coherent awareness into daily behaviour. Direction Drivers reveal the coherence target toward which the enterprise is growing.',
    correctionProtocols: [
      'Coherence Restoration',
      'Coherence Synchronisation',
      'Coherence Amplification',
      'Coherence Alignment',
      'Coherence Improvement',
      'Coherence Lock-In',
    ],
    backHref: '/z13-enterprise-insight-index',
    backLabel: 'Enterprise Insight Index',
    nextHref: '/z15-organizational-insight-tracker',
    nextLabel: 'Organizational Insight Tracker',
  },
  Z15: {
    id: 'Z15',
    seriesName: 'Z-Series — Transformation Intelligence',
    engineName: 'Organizational Insight Tracker',
    purpose:
      'Tracks your insights from discovery to action — which findings changed something, and which died in a deck.',
    dimensionLabels: [
      'Strategic Insight Flow',
      'Operational Insight Flow',
      'Human Insight Flow',
      'AI Insight Flow',
    ],
    driverContext:
      'All seven drivers must flow simultaneously for awareness to achieve enterprise-wide coverage. A blockage in any driver creates a blind spot.',
    correctionProtocols: [
      'Awareness Stabilisation',
      'Awareness Synchronisation',
      'Awareness Amplification',
      'Gap Restoration',
      'Awareness Improvement',
      'Awareness Lock-In',
    ],
    backHref: '/z14-organizational-insight-consistency',
    backLabel: 'Organizational Insight Consistency',
    nextHref: '/intelligence-hub',
    nextLabel: 'Intelligence Hub',
  },

  /* ── P-SERIES ─────────────────────────────────────────────── */
  P01: {
    id: 'P01',
    seriesName: 'P-Series — Enterprise Productivity',
    engineName: 'Productivity Mapping',
    purpose:
      'Maps where your work actually flows and where it stalls — across every team and layer of your operation.',
    dimensionLabels: [
      'Strategic Productivity',
      'Operational Productivity',
      'Digital Productivity',
      'Human Productivity',
    ],
    driverContext:
      'Structural Drivers (processes, systems) and Human Drivers (leadership, culture) are the primary productivity shapers.',
    correctionProtocols: [
      'Productivity Stabilisation',
      'Productivity Synchronisation',
      'Productivity Amplification',
      'Waste Elimination',
      'Productivity Improvement',
      'Productivity Lock-In',
    ],
    backHref: '/operations-intelligence',
    backLabel: 'Operations Intelligence',
    nextHref: '/p02-productivity-velocity',
    nextLabel: 'Productivity Velocity',
  },
  P02: {
    id: 'P02',
    seriesName: 'P-Series — Enterprise Productivity',
    engineName: 'Productivity Velocity',
    purpose:
      "Measures the speed of output across your teams — where throughput is climbing, and where it's decaying.",
    dimensionLabels: [
      'Strategic Productivity Velocity',
      'Operational Productivity Velocity',
      'Digital Productivity Velocity',
      'Human Productivity Velocity',
    ],
    driverContext:
      'Timing Drivers govern velocity most directly. Structural Drivers create the infrastructure that enables or limits velocity. Market Drivers set the external velocity benchmark the enterprise must match.',
    correctionProtocols: [
      'Velocity Stabilisation',
      'Velocity Synchronisation',
      'Velocity Amplification',
      'Velocity Alignment',
      'Velocity Improvement',
      'Velocity Lock-In',
    ],
    backHref: '/p01-productivity-mapping',
    backLabel: 'Productivity Mapping',
    nextHref: '/p03-productivity-drift',
    nextLabel: 'Productivity Drift',
  },
  P03: {
    id: 'P03',
    seriesName: 'P-Series — Enterprise Productivity',
    engineName: 'Productivity Drift',
    purpose:
      'Catches productivity sliding gradually — the slow leak that never triggers an alarm until the quarter misses.',
    dimensionLabels: [
      'Strategic Productivity Drift',
      'Operational Productivity Drift',
      'Human Productivity Drift',
      'Digital Productivity Drift',
    ],
    driverContext:
      'Cultural Drivers are the primary drift source. Timing Drivers reveal drift velocity and duration. Identity Drivers determine whether drift is correctable or structural. Structural Drivers create the scaffolding that either catches or enables drift.',
    correctionProtocols: [
      'Drift Detection',
      'Drift Correction',
      'Drift Reversal',
      'Drift Alignment',
      'Drift Improvement',
      'Drift Lock-In',
    ],
    backHref: '/p02-productivity-velocity',
    backLabel: 'Productivity Velocity',
    nextHref: '/p04-productivity-stability',
    nextLabel: 'Productivity Stability',
  },
  P04: {
    id: 'P04',
    seriesName: 'P-Series — Enterprise Productivity',
    engineName: 'Productivity Stability',
    purpose:
      'Measures how stable your output is under pressure — whether one absence, outage, or rush order breaks the week.',
    dimensionLabels: [
      'Strategic Stability',
      'Operational Stability',
      'Financial Productivity Stability',
      'Human Performance Stability',
    ],
    driverContext:
      'Structural Drivers are the primary stability creators. Identity Drivers determine stability character. Market Drivers are the most common stability threat. Cultural Drivers determine whether stability is maintained under pressure.',
    correctionProtocols: [
      'Stability Reinforcement',
      'Stability Synchronisation',
      'Stability Amplification',
      'Stability Alignment',
      'Stability Improvement',
      'Stability Lock-In',
    ],
    backHref: '/p03-productivity-drift',
    backLabel: 'Productivity Drift',
    nextHref: '/p05-productivity-balance',
    nextLabel: 'Productivity Balance',
  },
  P05: {
    id: 'P05',
    seriesName: 'P-Series — Enterprise Productivity',
    engineName: 'Productivity Balance',
    purpose:
      "Shows whether effort is balanced across your teams — who's overloaded, who's underused, and what to move.",
    dimensionLabels: [
      'Strategic–Operational Balance',
      'Human–Digital Balance',
      'Short-Term–Long-Term Balance',
      'Input–Output Balance',
    ],
    driverContext:
      "Human Drivers and Structural Drivers create the most visible imbalances. Identity Drivers set the equilibrium point. Direction Drivers reveal the ideal balance configuration for the enterprise's productive future.",
    correctionProtocols: [
      'Balance Restoration',
      'Balance Synchronisation',
      'Balance Amplification',
      'Balance Alignment',
      'Balance Improvement',
      'Balance Lock-In',
    ],
    backHref: '/p04-productivity-stability',
    backLabel: 'Productivity Stability',
    nextHref: '/p06-productivity-harmony',
    nextLabel: 'Productivity Harmony',
  },
  P06: {
    id: 'P06',
    seriesName: 'P-Series — Enterprise Productivity',
    engineName: 'Productivity Harmony',
    purpose:
      "Measures how well your teams' ways of working fit together — where methods mesh, and where they grind.",
    dimensionLabels: [
      'Cross-Function Productivity Harmony',
      'Team–Leadership Harmony',
      'Strategy–Execution Harmony',
      'Digital–Human Harmony',
    ],
    driverContext:
      'Cultural Drivers generate the most powerful harmony conditions. Identity Drivers set how wide a range of working styles can coexist. Structural Drivers provide the operational architecture within which harmony is built.',
    correctionProtocols: [
      'Harmony Restoration',
      'Harmony Synchronisation',
      'Harmony Amplification',
      'Harmony Alignment',
      'Harmony Improvement',
      'Harmony Lock-In',
    ],
    backHref: '/p05-productivity-balance',
    backLabel: 'Productivity Balance',
    nextHref: '/p07-productivity-coherence',
    nextLabel: 'Productivity Coherence',
  },
  P07: {
    id: 'P07',
    seriesName: 'P-Series — Enterprise Productivity',
    engineName: 'Productivity Coherence',
    purpose:
      'Checks your processes for coherence — one consistent way of working, or competing systems that tax every handoff.',
    dimensionLabels: [
      'Strategic Productivity Coherence',
      'Operational Productivity Coherence',
      'Cross-Team Coherence',
      'Behavioural Productivity Coherence',
    ],
    driverContext:
      'Identity Drivers create the underlying coherence foundation. Cultural Drivers determine whether coherence is lived or stated. Structural Drivers provide the architecture that enables coherent output.',
    correctionProtocols: [
      'Coherence Restoration',
      'Coherence Synchronisation',
      'Coherence Amplification',
      'Coherence Alignment',
      'Coherence Improvement',
      'Coherence Lock-In',
    ],
    backHref: '/p06-productivity-harmony',
    backLabel: 'Productivity Harmony',
    nextHref: '/p08-productivity-integration',
    nextLabel: 'Productivity Integration',
  },
  P08: {
    id: 'P08',
    seriesName: 'P-Series — Enterprise Productivity',
    engineName: 'Productivity Integration',
    purpose:
      'Assesses how well your tools, teams, and processes integrate — and where work gets retyped, re-approved, or redone between them.',
    dimensionLabels: [
      'Vertical Productivity Integration',
      'Horizontal Productivity Integration',
      'Digital–Human Integration',
      'Strategy–Operations Integration',
    ],
    driverContext:
      'Structural Drivers create the primary integration architecture. Timing Drivers determine integration timing. Cultural Drivers determine whether integration is authentic or forced. Identity Drivers determine whether integration reflects genuine enterprise unity.',
    correctionProtocols: [
      'Integration Stabilisation',
      'Integration Synchronisation',
      'Integration Amplification',
      'Gap Closure',
      'Integration Improvement',
      'Integration Lock-In',
    ],
    backHref: '/p07-productivity-coherence',
    backLabel: 'Productivity Coherence',
    nextHref: '/p09-productivity-alignment',
    nextLabel: 'Productivity Alignment',
  },
  P09: {
    id: 'P09',
    seriesName: 'P-Series — Enterprise Productivity',
    engineName: 'Productivity Alignment',
    purpose:
      'Checks that effort aligns to your priorities — how much of your capacity is actually on the work that matters most.',
    dimensionLabels: [
      'Strategic Productivity Alignment',
      'Market Productivity Alignment',
      'Cultural Productivity Alignment',
      'Long-Term Productivity Alignment',
    ],
    driverContext:
      'Direction Drivers reveal the underlying alignment truth. Identity Drivers set the alignment baseline. Market Drivers test alignment under external conditions. Cultural Drivers determine whether strategic alignment is embedded in daily productive behaviour.',
    correctionProtocols: [
      'Alignment Restoration',
      'Alignment Synchronisation',
      'Alignment Amplification',
      'Misalignment Correction',
      'Alignment Improvement',
      'Alignment Lock-In',
    ],
    backHref: '/p08-productivity-integration',
    backLabel: 'Productivity Integration',
    nextHref: '/p10-productivity-performance',
    nextLabel: 'Productivity Performance',
  },
  P10: {
    id: 'P10',
    seriesName: 'P-Series — Enterprise Productivity',
    engineName: 'Productivity Performance',
    purpose:
      'Measures output against targets across your operation — team by team, in numbers you can compare.',
    dimensionLabels: [
      'Strategic Performance',
      'Operational Performance',
      'Financial Performance',
      'Human Performance',
    ],
    driverContext:
      'All seven drivers contribute to performance. Market Drivers set performance benchmarks. Identity Drivers determine performance character. Cultural Drivers determine whether high performance is a cultural expectation or an exception.',
    correctionProtocols: [
      'Performance Stabilisation',
      'Performance Synchronisation',
      'Performance Amplification',
      'Performance Alignment',
      'Performance Improvement',
      'Performance Lock-In',
    ],
    backHref: '/p09-productivity-alignment',
    backLabel: 'Productivity Alignment',
    nextHref: '/p11-productivity-excellence',
    nextLabel: 'Productivity Excellence',
  },
  P11: {
    id: 'P11',
    seriesName: 'P-Series — Enterprise Productivity',
    engineName: 'Productivity Excellence',
    purpose:
      'Benchmarks your productivity against excellence — the gap between your best team and the rest, and how to close it upward.',
    dimensionLabels: [
      'Excellence Readiness',
      'Excellence Culture Strength',
      'Excellence Capability Depth',
      'Executive Excellence Index',
    ],
    driverContext:
      "Identity Drivers define the excellence ceiling the enterprise can reach. Cultural Drivers determine whether excellence is a cultural expectation. Direction Drivers reveal the excellence standard required for the enterprise's highest future.",
    correctionProtocols: [
      'Excellence Stabilisation',
      'Excellence Synchronisation',
      'Excellence Amplification',
      'Excellence Alignment',
      'Excellence Improvement',
      'Excellence Lock-In',
    ],
    backHref: '/p10-productivity-performance',
    backLabel: 'Productivity Performance',
    nextHref: '/p12-productivity-delivery',
    nextLabel: 'Productivity Delivery',
  },
  P12: {
    id: 'P12',
    seriesName: 'P-Series — Enterprise Productivity',
    engineName: 'Productivity Delivery',
    purpose:
      "Measures what's actually delivered — completed, shipped, in customers' hands — not what's in progress.",
    dimensionLabels: [
      'Customer Delivery Quality',
      'Internal Commitment Delivery',
      'Delivery Timing Accuracy',
      'Delivery Consistency Index',
    ],
    driverContext:
      'Structural Drivers create delivery infrastructure. Timing Drivers govern delivery timing. Human Drivers determine delivery quality. Market Drivers set delivery expectations. Cultural Drivers determine whether delivery commitments are non-negotiable.',
    correctionProtocols: [
      'Delivery Stabilisation',
      'Delivery Synchronisation',
      'Delivery Amplification',
      'Delivery Alignment',
      'Delivery Improvement',
      'Delivery Lock-In',
    ],
    backHref: '/p11-productivity-excellence',
    backLabel: 'Productivity Excellence',
    nextHref: '/p13-productivity-execution',
    nextLabel: 'Productivity Execution',
  },
  P13: {
    id: 'P13',
    seriesName: 'P-Series — Enterprise Productivity',
    engineName: 'Productivity Execution',
    purpose:
      'Assesses your execution discipline — whether plans convert into finished work at a predictable rate.',
    dimensionLabels: [
      'Strategic Execution Quality',
      'Operational Execution Quality',
      'Execution Speed',
      'Execution Consistency',
    ],
    driverContext:
      'Structural Drivers create execution infrastructure. Human Drivers carry execution capability. Cultural Drivers determine execution discipline. Timing Drivers govern execution pacing. Direction Drivers reveal the execution standard required for transformational outcomes.',
    correctionProtocols: [
      'Execution Stabilisation',
      'Execution Synchronisation',
      'Execution Amplification',
      'Execution Alignment',
      'Execution Improvement',
      'Execution Lock-In',
    ],
    backHref: '/p12-productivity-delivery',
    backLabel: 'Productivity Delivery',
    nextHref: '/p14-productivity-optimisation',
    nextLabel: 'Productivity Optimisation',
  },
  P14: {
    id: 'P14',
    seriesName: 'P-Series — Enterprise Productivity',
    engineName: 'Productivity Optimisation',
    purpose:
      'Finds your highest-leverage productivity fixes — the constraint to lift first, ranked by impact rather than noise.',
    dimensionLabels: [
      'High-Leverage Optimisation Opportunities',
      'Process Optimisation',
      'Resource Optimisation',
      'Technology Optimisation',
    ],
    inputs: { kind: 'optimisation' },
    driverContext:
      "Structural Drivers provide the optimisation landscape. Timing Drivers reveal the optimal timing for each improvement initiative. Identity Drivers determine which optimisations are authentic to the enterprise's character.",
    correctionProtocols: [
      'Optimisation Stabilisation',
      'Optimisation Synchronisation',
      'Optimisation Amplification',
      'Optimisation Alignment',
      'Optimisation Improvement',
      'Optimisation Lock-In',
    ],
    backHref: '/p13-productivity-execution',
    backLabel: 'Productivity Execution',
    nextHref: '/p15-productivity-intelligence',
    nextLabel: 'Productivity Intelligence',
  },
  P15: {
    id: 'P15',
    seriesName: 'P-Series — Enterprise Productivity',
    engineName: 'Productivity Intelligence',
    purpose:
      'Turns your productivity data into decisions — the patterns across teams and time that say what to change next.',
    dimensionLabels: [
      'Productivity Data Quality',
      'Productivity Insight Depth',
      'Predictive Productivity Intelligence',
      'Executive Productivity Intelligence',
    ],
    driverContext:
      'All seven drivers generate productivity intelligence. Structural Drivers create intelligence infrastructure. Cultural Drivers determine how intelligence is used. Direction Drivers reveal the intelligence the enterprise needs but has not yet developed.',
    correctionProtocols: [
      'Intelligence Stabilisation',
      'Intelligence Synchronisation',
      'Intelligence Amplification',
      'Intelligence Alignment',
      'Intelligence Improvement',
      'Intelligence Lock-In',
    ],
    backHref: '/p14-productivity-optimisation',
    backLabel: 'Productivity Optimisation',
    nextHref: '/p16-team-productivity',
    nextLabel: 'Team Productivity',
  },
  P16: {
    id: 'P16',
    seriesName: 'P-Series — Enterprise Productivity',
    engineName: 'Team Productivity',
    purpose:
      'Measures productivity at team level — output, load, and blockers for each of your teams, in one comparable view.',
    dimensionLabels: [
      'Team Output Quality',
      'Team Cohesion Index',
      'Team Enablement Quality',
      'Cross-Team Productivity',
    ],
    driverContext:
      'Human Drivers are primary here — teams are made of people. Cultural Drivers determine team norms and collaboration quality. Structural Drivers provide team architecture. Identity Drivers determine team character.',
    correctionProtocols: [
      'Team Stabilisation',
      'Team Synchronisation',
      'Team Amplification',
      'Team Alignment',
      'Team Improvement',
      'Team Lock-In',
    ],
    backHref: '/p15-productivity-intelligence',
    backLabel: 'Productivity Intelligence',
    nextHref: '/p17-collaboration-engine',
    nextLabel: 'Collaboration Engine',
  },
  P17: {
    id: 'P17',
    seriesName: 'P-Series — Enterprise Productivity',
    engineName: 'Collaboration',
    purpose:
      'Assesses how well your people collaborate across boundaries — where teamwork multiplies output, and where handoffs subtract from it.',
    dimensionLabels: [
      'Internal Collaboration Quality',
      'Cross-Function Collaboration',
      'Digital Collaboration Effectiveness',
      'Strategic Collaboration Outcomes',
    ],
    driverContext:
      "Cultural Drivers determine collaboration norms and quality. Human Drivers create collaboration capability. Structural Drivers provide collaboration infrastructure. Identity Drivers determine the enterprise's natural collaboration style.",
    correctionProtocols: [
      'Collaboration Stabilisation',
      'Collaboration Synchronisation',
      'Collaboration Amplification',
      'Collaboration Alignment',
      'Collaboration Improvement',
      'Collaboration Lock-In',
    ],
    backHref: '/p16-team-productivity',
    backLabel: 'Team Productivity',
    nextHref: '/p18-communication-engine',
    nextLabel: 'Communication Engine',
  },
  P18: {
    id: 'P18',
    seriesName: 'P-Series — Enterprise Productivity',
    engineName: 'Communication',
    purpose:
      "Assesses how well information moves through your organization — who's out of the loop, and what it costs you.",
    dimensionLabels: [
      'Strategic Communication Clarity',
      'Operational Communication Flow',
      'Feedback Loop Quality',
      'Communication Productivity Index',
    ],
    driverContext:
      'Human Drivers carry communication capability. Cultural Drivers determine communication norms. Structural Drivers create communication channels. Identity Drivers shape communication character — transparent, guarded, empowering, or controlling.',
    correctionProtocols: [
      'Communication Stabilisation',
      'Communication Synchronisation',
      'Communication Amplification',
      'Communication Alignment',
      'Communication Improvement',
      'Communication Lock-In',
    ],
    backHref: '/p17-collaboration-engine',
    backLabel: 'Collaboration Engine',
    nextHref: '/p19-engagement-engine',
    nextLabel: 'Engagement Engine',
  },
  P19: {
    id: 'P19',
    seriesName: 'P-Series — Enterprise Productivity',
    engineName: 'Engagement',
    purpose:
      'Measures how engaged your people are in the work itself — the discretionary effort that never shows up on a timesheet.',
    dimensionLabels: [
      'Strategic Engagement',
      'Role-Level Engagement',
      'Purpose Engagement',
      'Engagement Sustainability',
    ],
    driverContext:
      "Human Drivers carry engagement data. Cultural Drivers determine engagement conditions. Identity Drivers shape what the enterprise stands for — the primary engagement source. Direction Drivers reveal the engagement level required for the enterprise's transformational future.",
    correctionProtocols: [
      'Engagement Stabilisation',
      'Engagement Synchronisation',
      'Engagement Amplification',
      'Engagement Alignment',
      'Engagement Improvement',
      'Engagement Lock-In',
    ],
    backHref: '/p18-communication-engine',
    backLabel: 'Communication Engine',
    nextHref: '/p20-capability-engine',
    nextLabel: 'Capability Engine',
  },
  P20: {
    id: 'P20',
    seriesName: 'P-Series — Enterprise Productivity',
    engineName: 'Capability',
    purpose:
      'Assesses whether your teams have the skills the work demands — and where capability gaps are masquerading as performance problems.',
    dimensionLabels: [
      'Core Capability Strength',
      'Capability Gaps',
      'Capability Development Velocity',
      'Future Capability Requirements',
    ],
    driverContext:
      "Human Drivers carry capability data. Structural Drivers provide capability infrastructure. Identity Drivers determine capability character. Direction Drivers reveal the capability set required for the enterprise's highest performance future.",
    correctionProtocols: [
      'Capability Stabilisation',
      'Capability Synchronisation',
      'Capability Amplification',
      'Capability Alignment',
      'Capability Improvement',
      'Capability Lock-In',
    ],
    backHref: '/p19-engagement-engine',
    backLabel: 'Engagement Engine',
    nextHref: '/p21-process-optimisation',
    nextLabel: 'Process Optimisation',
  },
  P21: {
    id: 'P21',
    seriesName: 'P-Series — Enterprise Productivity',
    engineName: 'Process Optimisation',
    purpose:
      'Examines your core processes step by step — removing the approvals, waits, and workarounds that add time but not value.',
    dimensionLabels: [
      'Core Process Efficiency',
      'Process Redundancy Identification',
      'Process Redesign Opportunities',
      'End-to-End Process Quality',
    ],
    inputs: { kind: 'optimisation' },
    driverContext:
      'Structural Drivers are primary here. Timing Drivers reveal process speed and flow issues. Cultural Drivers determine whether process improvement is valued. Human Drivers identify where process and people are mismatched.',
    correctionProtocols: [
      'Process Stabilisation',
      'Process Synchronisation',
      'Process Amplification',
      'Process Alignment',
      'Process Improvement',
      'Process Lock-In',
    ],
    backHref: '/p20-capability-engine',
    backLabel: 'Capability Engine',
    nextHref: '/p22-workflow-intelligence',
    nextLabel: 'Workflow Intelligence',
  },
  P22: {
    id: 'P22',
    seriesName: 'P-Series — Enterprise Productivity',
    engineName: 'Workflow Intelligence',
    purpose:
      'Analyses your workflows end to end — where each one stalls, loops, or gets reworked — so redesign targets facts.',
    dimensionLabels: [
      'Workflow Mapping Completeness',
      'Bottleneck Identification',
      'Cross-Function Workflow Quality',
      'Digital Workflow Integration',
    ],
    driverContext:
      'Structural Drivers create workflow architecture. Human Drivers execute workflows. Cultural Drivers determine workflow discipline. Timing Drivers reveal workflow pacing and cadence issues.',
    correctionProtocols: [
      'Workflow Stabilisation',
      'Workflow Synchronisation',
      'Workflow Amplification',
      'Workflow Alignment',
      'Workflow Improvement',
      'Workflow Lock-In',
    ],
    backHref: '/p21-process-optimisation',
    backLabel: 'Process Optimisation',
    nextHref: '/p23-systems-productivity',
    nextLabel: 'Systems Productivity',
  },
  P23: {
    id: 'P23',
    seriesName: 'P-Series — Enterprise Productivity',
    engineName: 'Systems Productivity',
    purpose:
      'Measures whether your systems help or hinder output — the tools that save hours, and the ones that quietly consume them.',
    dimensionLabels: [
      'System Performance Quality',
      'System Integration Completeness',
      'System-Human Interface Quality',
      'Systems Productivity ROI',
    ],
    driverContext:
      'Structural Drivers are primary — systems are structural assets. Timing Drivers reveal system performance over time. Human Drivers determine system adoption quality. Market Drivers set system capability benchmarks.',
    correctionProtocols: [
      'Systems Stabilisation',
      'Systems Synchronisation',
      'Systems Amplification',
      'Systems Alignment',
      'Systems Improvement',
      'Systems Lock-In',
    ],
    backHref: '/p22-workflow-intelligence',
    backLabel: 'Workflow Intelligence',
    nextHref: '/p24-technology-productivity',
    nextLabel: 'Technology Productivity',
  },
  P24: {
    id: 'P24',
    seriesName: 'P-Series — Enterprise Productivity',
    engineName: 'Technology Productivity',
    purpose:
      'Assesses the productivity return on your technology — what each platform contributes against what it costs to run and maintain.',
    dimensionLabels: [
      'Technology Adoption Quality',
      'AI & Automation Productivity Impact',
      'Technology-Human Integration',
      'Technology Productivity ROI',
    ],
    driverContext:
      'Structural Drivers govern technology infrastructure. Human Drivers determine technology adoption. Market Drivers set technology requirements. Timing Drivers reveal technology productivity trajectories and adoption timelines.',
    correctionProtocols: [
      'Technology Stabilisation',
      'Technology Synchronisation',
      'Technology Amplification',
      'Technology Alignment',
      'Technology Improvement',
      'Technology Lock-In',
    ],
    backHref: '/p23-systems-productivity',
    backLabel: 'Systems Productivity',
    nextHref: '/p25-innovation-productivity',
    nextLabel: 'Innovation Productivity',
  },
  P25: {
    id: 'P25',
    seriesName: 'P-Series — Enterprise Productivity',
    engineName: 'Innovation Productivity',
    purpose:
      'Measures the yield of your innovation effort — ideas that reached the market against ideas that consumed budget.',
    dimensionLabels: [
      'Innovation Output Quality',
      'Innovation-to-Market Velocity',
      'Innovation ROI',
      'Executive Innovation Index',
    ],
    driverContext:
      'Identity Drivers fuel authentic innovation. Market Drivers reveal innovation opportunities and threats. Cultural Drivers determine innovation appetite and risk tolerance. Direction Drivers reveal the innovation the enterprise must pursue to fulfil its purpose.',
    correctionProtocols: [
      'Innovation Stabilisation',
      'Innovation Synchronisation',
      'Innovation Amplification',
      'Innovation Alignment',
      'Innovation Improvement',
      'Innovation Lock-In',
    ],
    backHref: '/p24-technology-productivity',
    backLabel: 'Technology Productivity',
    nextHref: '/p26-transformation-engine',
    nextLabel: 'Transformation Engine',
  },
  P26: {
    id: 'P26',
    seriesName: 'P-Series — Enterprise Productivity',
    engineName: 'Transformation',
    purpose:
      'Assesses productivity through transformation — keeping delivery standing while the organization changes underneath it.',
    dimensionLabels: [
      'Transformation Readiness',
      'Transformation Execution Quality',
      'Performance Continuity During Transformation',
      'Executive Transformation Index',
    ],
    driverContext:
      'Identity Drivers determine transformation character. Direction Drivers reveal the transformation the enterprise must make. Cultural Drivers determine transformation adoption. Structural Drivers provide the transformation infrastructure.',
    correctionProtocols: [
      'Transformation Stabilisation',
      'Transformation Synchronisation',
      'Transformation Amplification',
      'Transformation Alignment',
      'Transformation Improvement',
      'Transformation Lock-In',
    ],
    backHref: '/p25-innovation-productivity',
    backLabel: 'Innovation Productivity',
    nextHref: '/p27-change-engine',
    nextLabel: 'Change Engine',
  },
  P27: {
    id: 'P27',
    seriesName: 'P-Series — Enterprise Productivity',
    engineName: 'Change',
    purpose:
      'Measures how your organization absorbs change — how fast teams return to full output after each reorganisation, tool, or process shift.',
    dimensionLabels: [
      'Change Initiation Quality',
      'Change Management Effectiveness',
      'Productivity Loss During Change',
      'Change Embedding Success',
    ],
    driverContext:
      'Cultural Drivers determine change receptivity — the most critical change variable. Identity Drivers determine change character. Structural Drivers provide change infrastructure. Timing Drivers govern change sequencing and pacing.',
    correctionProtocols: [
      'Change Stabilisation',
      'Change Synchronisation',
      'Change Amplification',
      'Change Alignment',
      'Change Improvement',
      'Change Lock-In',
    ],
    backHref: '/p26-transformation-engine',
    backLabel: 'Transformation Engine',
    nextHref: '/p28-convergence',
    nextLabel: 'Convergence Engine',
  },
  P28: {
    id: 'P28',
    seriesName: 'P-Series — Enterprise Productivity',
    engineName: 'Convergence',
    purpose:
      "Tracks whether your teams' ways of working are converging on shared standards — or fragmenting into local habits.",
    dimensionLabels: [
      'CORE–GROW Convergence',
      'GROW–TALENT Convergence',
      'Human–Digital Convergence',
      'Strategy–Execution Convergence',
    ],
    driverContext:
      'All seven drivers must converge simultaneously for enterprise productivity to reach its peak potential. Divergence in any driver creates fragmented output.',
    correctionProtocols: [
      'Convergence Stabilisation',
      'Divergence Correction',
      'Convergence Amplification',
      'Pathway Formation',
      'Convergence Improvement',
      'Convergence Lock-In',
    ],
    backHref: '/p27-change-engine',
    backLabel: 'Change Engine',
    nextHref: '/p29-synchronization',
    nextLabel: 'Synchronization',
  },
  P29: {
    id: 'P29',
    seriesName: 'P-Series — Enterprise Productivity',
    engineName: 'Synchronization',
    purpose:
      'Measures how tightly work across your teams is synchronised — so dependent tasks arrive together instead of waiting on each other.',
    dimensionLabels: [
      'Cross-Function Synchronization',
      'Leadership–Team Synchronization',
      'Digital–Human Synchronization',
      'Strategy–Operations Synchronization',
    ],
    driverContext:
      'Timing Drivers govern synchronisation most directly. Structural Drivers create the synchronisation architecture. Cultural Drivers determine synchronisation discipline. All seven drivers must synchronise simultaneously for peak enterprise productivity.',
    correctionProtocols: [
      'Synchronization Stabilisation',
      'Synchronization Amplification',
      'Latency Reduction',
      'Phase Alignment',
      'Synchronization Improvement',
      'Synchronization Lock-In',
    ],
    backHref: '/p28-convergence',
    backLabel: 'Convergence Engine',
    nextHref: '/p30-flow',
    nextLabel: 'Flow Engine',
  },
  P30: {
    id: 'P30',
    seriesName: 'P-Series — Enterprise Productivity',
    engineName: 'Flow',
    purpose:
      'Assesses your operation against flow — every system, team, and process moving without friction — and what stands between you and it.',
    dimensionLabels: [
      'Strategy Execution Tracker',
      'Operational Flow',
      'Human Flow',
      'Digital Flow',
    ],
    driverContext:
      'All seven drivers must achieve flow simultaneously. The P-Series reaches P30 Flow when all prior modules (P01-P29) have been addressed. Flow is the natural result of resolved productivity intelligence.',
    correctionProtocols: [
      'Flow Stabilisation',
      'Flow Synchronisation',
      'Flow Amplification',
      'Friction Elimination',
      'Flow Improvement',
      'Flow Lock-In',
    ],
    backHref: '/p29-synchronization',
    backLabel: 'Synchronization',
    nextHref: '/operations-intelligence',
    nextLabel: 'Operations Intelligence',
  },

  /* ── F-SERIES — Financial Intelligence (LAMID FINANCE) ─── */
  F01: {
    id: 'F01',
    seriesName: 'F-Series — Financial Intelligence',
    engineName: 'Financial Visibility',
    purpose:
      'Gives you real-time clarity across your finances — revenue, cost, cash, and margin in one live view, instead of a month-end surprise.',
    dimensionLabels: [
      'Revenue Clarity',
      'Cost Transparency',
      'Margin Visibility',
      'Cash Flow Intelligence',
    ],
    driverContext:
      'Financial visibility is governed by Structural Drivers (systems, processes, reporting architecture) and Identity Drivers (what the enterprise believes about its own financial position). Timing Drivers determine how current the financial truth is.',
    correctionProtocols: [
      'Visibility Installation',
      'Dashboard Deployment',
      'Data Unification',
      'Blind Spot Elimination',
      'Visibility Improvement',
      'Financial Truth Lock-In',
    ],
    backHref: '/finance-dashboard',
    backLabel: 'Finance Dashboard',
    nextHref: '/f02-budgeting-forecasting',
    nextLabel: 'Budgeting & Forecasting Engine',
  },
  /* None of GROW's 9 module pages exist in ProdLamid's own registry —
     verified directly against its source, not just this clone. Every
     grow-*.tsx page there references a MODULE_REGISTRY["G0x"] code and
     falls back to the generic "Primary/Secondary/Tertiary/Quaternary
     Dimension" placeholder, in both apps, until now. GROW's entire
     diagnostic layer was never given real content — these 9 are
     original designs for what each page's own name and purpose
     already promise, not a port of anything, because there was
     nothing to port. */
  G02: {
    id: 'G02',
    seriesName: 'LAMID GROW Intelligence',
    engineName: 'Opportunity Signals',
    purpose:
      'Surfaces market openings while they are still open — scored on how early, how credible, and how ready you are to act on them.',
    dimensionLabels: [
      'Signal Detection Speed',
      'Signal Credibility',
      'Market Timing',
      'Readiness to Act',
    ],
    driverContext:
      'Market Drivers generate the raw signal. Timing Drivers determine whether it is caught early enough to matter. Direction Drivers decide whether the organisation is even looking for this kind of opportunity.',
    correctionProtocols: [
      'Signal Stabilisation',
      'Detection Acceleration',
      'Credibility Verification',
      'Timing Correction',
      'Readiness Improvement',
      'Opportunity Lock-In',
    ],
    backHref: '/suites/grow',
    backLabel: 'LAMID GROW',
    nextHref: '/grow-pathways',
    nextLabel: 'Growth Pathways',
  },
  G03: {
    id: 'G03',
    seriesName: 'LAMID GROW Intelligence',
    engineName: 'Growth Pathways',
    purpose:
      'Scores which growth paths are genuinely open to you against your actual capacity, not just which look attractive on a slide.',
    dimensionLabels: ['Pathway Viability', 'Capacity Fit', 'Competitive Exposure', 'Time-to-Value'],
    inputs: { kind: 'growth-pathways' },
    driverContext:
      'Direction Drivers narrow the field of real options. Structural Drivers determine which paths your capacity can actually carry. Market Drivers reveal how exposed each path is to competitive response.',
    correctionProtocols: [
      'Pathway Stabilisation',
      'Viability Correction',
      'Capacity Realignment',
      'Exposure Mitigation',
      'Value Acceleration',
      'Pathway Lock-In',
    ],
    backHref: '/grow-opportunity-signals',
    backLabel: 'Opportunity Signals',
    nextHref: '/grow-modernisation',
    nextLabel: 'Modernisation Planning',
  },
  G04: {
    id: 'G04',
    seriesName: 'LAMID GROW Intelligence',
    engineName: 'Modernisation Planning',
    purpose:
      'Assesses how ready your systems, processes and people are for the modernisation route you are considering — before you commit budget to it.',
    dimensionLabels: [
      'Technical Readiness',
      'Organisational Readiness',
      'Change Capacity',
      'Modernisation ROI Clarity',
    ],
    inputs: { kind: 'roadmap' },
    driverContext:
      'Structural Drivers determine technical readiness. Cultural Drivers govern organisational readiness. Timing Drivers reveal how much change capacity actually exists right now versus on paper.',
    correctionProtocols: [
      'Modernisation Stabilisation',
      'Technical Uplift',
      'Readiness Building',
      'Capacity Expansion',
      'ROI Clarification',
      'Modernisation Lock-In',
    ],
    backHref: '/grow-pathways',
    backLabel: 'Growth Pathways',
    nextHref: '/grow-market-intelligence',
    nextLabel: 'Market Intelligence',
  },
  G05: {
    id: 'G05',
    seriesName: 'LAMID GROW Intelligence',
    engineName: 'Market Intelligence',
    purpose:
      'Scores how good your read on the market actually is — current, sourced and acted on, versus assumed.',
    dimensionLabels: [
      'Signal Currency',
      'Source Diversity',
      'Competitive Visibility',
      'Intelligence-to-Action Speed',
    ],
    driverContext:
      'Market Drivers are the direct subject. Timing Drivers reveal how stale the intelligence has become. Direction Drivers determine whether it is actually informing decisions or just being collected.',
    correctionProtocols: [
      'Intelligence Stabilisation',
      'Currency Refresh',
      'Source Expansion',
      'Visibility Improvement',
      'Action Acceleration',
      'Intelligence Lock-In',
    ],
    backHref: '/grow-modernisation',
    backLabel: 'Modernisation Planning',
    nextHref: '/grow-digital-maturity',
    nextLabel: 'Digital Maturity Model',
  },
  G06: {
    id: 'G06',
    seriesName: 'LAMID GROW Intelligence',
    engineName: 'Digital Maturity Model',
    purpose:
      'Scores how far digital capability has actually reached — not the roadmap, the operating reality — across strategy, infrastructure, people and the customer experience it produces.',
    dimensionLabels: [
      'Digital Strategy Alignment',
      'Technology & Data Infrastructure',
      'Operating Model Adaptability',
      'Customer & Market Digital Experience',
    ],
    driverContext:
      'Direction Drivers set the digital strategy the organisation is converging toward. Structural Drivers determine whether infrastructure and process can carry that strategy. Cultural Drivers govern how readily people adopt new digital ways of working. Market Drivers reveal how the customer experiences the result.',
    correctionProtocols: [
      'Maturity Stabilisation',
      'Infrastructure Modernisation',
      'Operating Model Redesign',
      'Experience Uplift',
      'Maturity Improvement',
      'Digital Lock-In',
    ],
    backHref: '/grow-market-intelligence',
    backLabel: 'Market Intelligence',
    nextHref: '/grow-planner',
    nextLabel: 'Growth Planner',
  },
  G07: {
    id: 'G07',
    seriesName: 'LAMID GROW Intelligence',
    engineName: 'Growth Planner',
    purpose:
      'Checks whether the growth plan you are about to sign off is one your people, cash and operating rhythm can actually carry.',
    dimensionLabels: [
      'Ambition-Capacity Fit',
      'Funding Certainty',
      'Execution Bandwidth',
      'Milestone Realism',
    ],
    inputs: { kind: 'roadmap' },
    driverContext:
      'Direction Drivers set the ambition. Structural Drivers determine whether capacity can carry it. Timing Drivers reveal whether the milestones in the plan are sequenced realistically.',
    correctionProtocols: [
      'Planning Stabilisation',
      'Ambition Recalibration',
      'Funding Confirmation',
      'Bandwidth Expansion',
      'Milestone Correction',
      'Growth Lock-In',
    ],
    backHref: '/grow-digital-maturity',
    backLabel: 'Digital Maturity Model',
    nextHref: '/grow-advisory-console',
    nextLabel: 'Advisory Console',
  },
  G08: {
    id: 'G08',
    seriesName: 'LAMID GROW Intelligence',
    engineName: 'Advisory Console',
    purpose:
      "The working view for running an advisory engagement against live growth data — how well the engagement's guidance is actually landing.",
    dimensionLabels: [
      'Diagnostic Grounding',
      'Recommendation Specificity',
      'Client Adoption',
      'Measurable Impact',
    ],
    driverContext:
      "Direction Drivers reveal whether the advice matches the client's real strategy. Human Drivers govern whether the client actually adopts it. Timing Drivers determine how fast impact shows up.",
    correctionProtocols: [
      'Advisory Stabilisation',
      'Grounding Improvement',
      'Specificity Correction',
      'Adoption Acceleration',
      'Impact Amplification',
      'Advisory Lock-In',
    ],
    backHref: '/grow-planner',
    backLabel: 'Growth Planner',
    nextHref: '/grow-executive-report',
    nextLabel: 'Executive Growth Report',
  },
  G09: {
    id: 'G09',
    seriesName: 'LAMID GROW Intelligence',
    engineName: 'Executive Growth Report',
    purpose:
      'One board-ready score for growth performance — signal quality, plan execution and realised value combined.',
    dimensionLabels: [
      'Signal-to-Plan Conversion',
      'Execution Fidelity',
      'Realised Value',
      'Forward Pipeline Strength',
    ],
    driverContext:
      "All drivers roll up here. Direction Drivers set what 'good growth' means for this board. Market Drivers determine how much of the pipeline is real versus optimistic.",
    correctionProtocols: [
      'Report Stabilisation',
      'Conversion Improvement',
      'Fidelity Correction',
      'Value Reinforcement',
      'Pipeline Strengthening',
      'Growth Lock-In',
    ],
    backHref: '/grow-advisory-console',
    backLabel: 'Advisory Console',
    nextHref: '/suites/grow',
    nextLabel: 'LAMID GROW',
  },

  F02: {
    id: 'F02',
    seriesName: 'F-Series — Financial Intelligence',
    engineName: 'Budgeting & Forecasting',
    purpose:
      'Replaces guesswork in your numbers — budgets, forecasts, cash-flow projections and margin models that make your financial future predictable.',
    dimensionLabels: [
      'Forecasting Accuracy',
      'Budget Discipline',
      'Scenario Planning Depth',
      'Cash Flow Foresight',
    ],
    driverContext:
      "Timing Drivers govern forecasting quality — the enterprise's relationship with time determines how far ahead it can see with accuracy. Identity Drivers set the budgeting discipline baseline. Market Drivers introduce the variables that test scenario planning.",
    correctionProtocols: [
      'Forecasting Engine Installation',
      'Budget Template Deployment',
      'Scenario Matrix Activation',
      'Cash Flow Intelligence',
      'Forecasting Improvement',
      'Financial Foresight Lock-In',
    ],
    backHref: '/f01-financial-visibility',
    backLabel: 'Financial Visibility Engine',
    nextHref: '/f03-financial-kpi',
    nextLabel: 'Financial KPI Linkage Diagnostic',
  },
  F03: {
    id: 'F03',
    seriesName: 'F-Series — Financial Intelligence',
    engineName: 'Financial KPI Linkage Diagnostic',
    purpose:
      'Links your financial KPIs to what drives them — so when a number moves, you know which operational lever moved it.',
    dimensionLabels: [
      'Operational KPI–Revenue Linkage',
      'Digital KPI–Growth Linkage',
      'Talent KPI–Productivity Linkage',
      'Leadership KPI–Margin Linkage',
    ],
    driverContext:
      'All four business units (CORE, GROW, TALENT, FINANCE) feed KPI intelligence. Identity Drivers determine which KPIs the enterprise genuinely tracks vs. performs. Market Drivers create the external KPI pressure points.',
    correctionProtocols: [
      'KPI Mapping',
      'KPI–Financial Linkage',
      'KPI Governance Ritual',
      'KPI Accountability',
      'KPI Improvement',
      'KPI–Value Lock-In',
    ],
    backHref: '/f02-budgeting-forecasting',
    backLabel: 'Budgeting & Forecasting Engine',
    nextHref: '/f04-cost-optimization',
    nextLabel: 'Cost Optimization Diagnostic',
  },
  F04: {
    id: 'F04',
    seriesName: 'F-Series — Financial Intelligence',
    engineName: 'Cost Optimization Diagnostic',
    purpose:
      'Spots waste, cost leakage, and productivity gaps across your business — improving margin without cutting capability.',
    dimensionLabels: [
      'Cost Leakage Index',
      'Productivity Gap Score',
      'Margin Improvement Potential',
      'Synergy Cost Reduction',
    ],
    inputs: { kind: 'optimisation' },
    driverContext:
      'Structural Drivers create the conditions where cost leakage hides — in processes, systems, and operational structures. Cultural Drivers determine whether cost discipline is behavioural or episodic. Identity Drivers set the tolerance for inefficiency.',
    correctionProtocols: [
      'Cost Mapping',
      'Leakage Elimination',
      'Productivity Uplift',
      'Synergy-Based Reduction',
      'Margin Improvement',
      'Cost Governance Lock-In',
    ],
    backHref: '/f03-financial-kpi',
    backLabel: 'Financial KPI Linkage Diagnostic',
    nextHref: '/f05-enterprise-value',
    nextLabel: 'Enterprise Value Engine',
  },
  F05: {
    id: 'F05',
    seriesName: 'F-Series — Financial Intelligence',
    engineName: 'Enterprise Value',
    purpose:
      'Measures and grows what your business is worth — the value drivers behind the number your owners and board care about most.',
    dimensionLabels: [
      'Valuation Driver Index',
      'Licensing ROI Score',
      'Synergy ROI Score',
      'Long-Term Value Trajectory',
    ],
    driverContext:
      'Direction Drivers carry the most weight in this module — they encode the ultimate financial trajectory of the enterprise. Identity Drivers determine whether the enterprise is building genuine value or performing valuation metrics. Market Drivers set the external multiplier environment.',
    correctionProtocols: [
      'Valuation Driver Mapping',
      'Licensing ROI Tracking',
      'Synergy ROI Measurement',
      'Long-Term Curve Alignment',
      'Enterprise Value Improvement',
      'Value Governance Lock-In',
    ],
    backHref: '/f04-cost-optimization',
    backLabel: 'Cost Optimization Diagnostic',
    nextHref: '/f06-financial-governance',
    nextLabel: 'Financial Governance Engine',
  },
  F06: {
    id: 'F06',
    seriesName: 'F-Series — Financial Intelligence',
    engineName: 'Financial Governance',
    purpose:
      'Assesses your financial governance — controls, approvals, and traceability strong enough to survive an audit or a due-diligence room.',
    dimensionLabels: [
      'Governance Ritual Activation',
      'Financial Control Strength',
      'Reporting Cadence Score',
      'Compliance Architecture Maturity',
    ],
    driverContext:
      'Cultural Drivers determine whether governance becomes behavioural. Structural Drivers create the systems that enforce governance. Identity Drivers determine whether governance is authentic or performative.',
    correctionProtocols: [
      'Ritual Installation',
      'Control Architecture',
      'Reporting Cadence',
      'Compliance Framework',
      'Governance Improvement',
      'Financial Discipline Lock-In',
    ],
    backHref: '/f05-enterprise-value',
    backLabel: 'Enterprise Value Engine',
    nextHref: '/f07-cfo-transformation',
    nextLabel: 'CFO Transformation Engine',
  },
  F07: {
    id: 'F07',
    seriesName: 'F-Series — Financial Intelligence',
    engineName: 'CFO Transformation',
    purpose:
      "Assesses your finance function's readiness to lead — from bookkeeping and reporting to the forward-looking intelligence a CFO's office should produce.",
    dimensionLabels: [
      'CFO Capability Score',
      'Financial Leadership Maturity',
      'Dashboard Mastery Index',
      'Strategic Finance Contribution',
    ],
    driverContext:
      "Identity Drivers determine the CFO's authentic financial leadership capacity. Human Drivers govern the capability development trajectory. Cultural Drivers determine whether financial leadership is celebrated or sidelined.",
    correctionProtocols: [
      'CFO Capability Assessment',
      'Dashboard Mastery',
      'Forecasting Mastery',
      'Enterprise Value Mastery',
      'Leadership Improvement',
      'CFO Governance Lock-In',
    ],
    backHref: '/f06-financial-governance',
    backLabel: 'Financial Governance Engine',
    nextHref: '/finance-dashboard',
    nextLabel: 'Finance Dashboard',
  },
};

/* Get config with fallback for any unregistered module */
export function getModuleConfig(moduleId) {
  return MODULE_REGISTRY[moduleId] ?? null;
}

/* Generate a fallback config for any module not explicitly registered */
/**
 * Attach structured inputs to the series that need measured data.
 *
 * R-Series (cadence) and P-Series (productivity) assess how the enterprise moves
 * over time — questions the generic narrative form cannot answer. Done here rather
 * than on 60 individual entries so new modules inherit it automatically.
 */
for (const [id, cfg] of Object.entries(MODULE_REGISTRY)) {
  if (cfg.inputs) continue; // explicit spec always wins
  if (id.startsWith('R')) {
    cfg.inputs = { kind: 'timeseries', periodLabel: 'Week', periods: 6, metrics: CADENCE_METRICS };
  } else if (id.startsWith('P')) {
    cfg.inputs = {
      kind: 'timeseries',
      periodLabel: 'Sprint',
      periods: 6,
      metrics: PRODUCTIVITY_METRICS,
    };
  } else if (id.startsWith('F')) {
    // F-Series is financial analysis — it needs actual figures, not prose.
    // F02 is excluded: it renders BudgetEngine, not IntelligenceModule.
    cfg.inputs = { kind: 'financial', periodLabel: 'Month', periods: 6 };
  } else if (ROSTER_MODULES.has(id)) {
    // Workforce-structure modules. The rest of A-Series (culture, sentiment,
    // experience) stays narrative — a roster tells you nothing about those.
    cfg.inputs = { kind: 'roster' };
  } else if (SCENARIO_MODULES.has(id)) {
    // Modules that weigh discrete options rather than assess a capability.
    cfg.inputs = { kind: 'scenario' };
  } else {
    /* Everything else declares scored dimensions but has no series, roster or
       ledger behind it — the shape that was leaving 144 modules asking a model
       to invent their numbers. They are assessed against their own dimensions,
       weighted by importance and discounted for missing evidence. */
    cfg.inputs = { kind: 'assessment', dimensions: cfg.dimensionLabels };
  }
}

export function buildFallbackConfig(moduleId, seriesName, engineName) {
  const series = moduleId.charAt(0);
  const seriesFullName =
    {
      S: 'S-Series — Strategic Intelligence',
      R: 'R-Series — Cadence Intelligence',
      Q: 'Q-Series — Decision Intelligence',
      X: 'X-Series — Protection Intelligence',
      Z: 'Z-Series — Transformation Intelligence',
      P: 'P-Series — Enterprise Productivity',
      C: 'LAMID CORE Intelligence',
      G: 'LAMID GROW Intelligence',
      A: 'LAMID TALENT Intelligence',
      F: 'F-Series — Financial Intelligence',
    }[series] ?? seriesName;

  return {
    id: moduleId,
    seriesName: seriesFullName,
    engineName,
    purpose: `${engineName} — an enterprise intelligence engine that provides deep diagnostic analysis and corrective intelligence for this domain.`,
    dimensionLabels: [
      'Primary Dimension',
      'Secondary Dimension',
      'Tertiary Dimension',
      'Quaternary Dimension',
    ],
    /* Even an unrecognised module gets a real compute layer rather than a
       narrative form the model has to score for it. */
    inputs: { kind: 'assessment' },
    driverContext:
      'All seven drivers (Identity, Market, Cultural, Human, Structural, Timing, Direction) shape the intelligence in this module.',
    correctionProtocols: [
      'Stabilisation',
      'Synchronisation',
      'Amplification',
      'Alignment',
      'Improvement',
      'Lock-In',
    ],
    backHref: '/intelligence-hub',
    backLabel: 'Intelligence Hub',
  };
}

// LamidGrowth-specific addition (not part of the original LamidOne source): stamp a
// `home_engine` field onto every module, mapped from the first letter of its id to
// this app's canonical engine names.
for (const cfg of Object.values(MODULE_REGISTRY)) {
  const first = cfg.id.charAt(0);
  if (first === 'S' || first === 'Q') cfg.home_engine = 'Clarity';
  else if (first === 'R' || first === 'P' || first === 'X') cfg.home_engine = 'Consistency';
  else if (first === 'Z' || first === 'G') cfg.home_engine = 'Growth';
  else if (first === 'A') cfg.home_engine = 'Capability';
  else if (first === 'F') cfg.home_engine = 'Finance';
  // C-series ("LAMID CORE Intelligence" in the source) covers workflow/operating-model/
  // change-management diagnostics — cross-cutting, not finance-specific, so it lands in
  // Shared rather than being forced into one of the four canonical engines.
  else cfg.home_engine = 'Shared';
}

// LamidGrowth-specific addition: which signup context (see the `contexts` zod enum in
// src/app/app.mjs) must a workspace have reached before an engine is even visible to it —
// cumulative, so a higher context sees everything a lower one does (checked in
// src/app/entitlements.mjs's hasToolAccess, alongside the existing enterprise-tier/bundle gate).
// Base rank comes from home_engine (a reasoned default, not derived from any source document —
// flagged as a judgment call); a keyword check on the engine's own name then escalates any
// module whose name explicitly claims a broader scope (e.g. "Enterprise-Wide", "Department",
// "Multi-Team") than its home_engine's default would imply, so a Clarity module named
// "Enterprise-Wide Decision Map" doesn't stay Individual-visible just because most Clarity
// modules are.
export const CONTEXT_RANK = Object.freeze({
  Individual: 0,
  Creator: 1,
  Professional: 2,
  Founder: 3,
  SME: 4,
  Team: 5,
  Institution: 6,
  Enterprise: 7,
});
const BASE_RANK_BY_HOME_ENGINE = {
  Clarity: CONTEXT_RANK.Individual,
  Consistency: CONTEXT_RANK.Professional,
  Growth: CONTEXT_RANK.Founder,
  Finance: CONTEXT_RANK.SME,
  Capability: CONTEXT_RANK.Team,
  Shared: CONTEXT_RANK.Institution,
};
const ESCALATION_KEYWORDS = [
  [/enterprise|etos\b/i, CONTEXT_RANK.Enterprise],
  [
    /\b(department|business unit|multi-team|cross-team|organi[sz]ation-wide|organi[sz]ational)\b/i,
    CONTEXT_RANK.Institution,
  ],
  [/\bteam\b/i, CONTEXT_RANK.Team],
];
for (const cfg of Object.values(MODULE_REGISTRY)) {
  let rank = BASE_RANK_BY_HOME_ENGINE[cfg.home_engine] ?? CONTEXT_RANK.Individual;
  for (const [pattern, escalatedRank] of ESCALATION_KEYWORDS) {
    if (escalatedRank > rank && pattern.test(cfg.engineName)) rank = escalatedRank;
  }
  cfg.minContextRank = rank;
}

export const ENGINE_CODES = Object.keys(MODULE_REGISTRY);
