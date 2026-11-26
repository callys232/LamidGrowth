import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useReducedMotion } from 'motion/react';
import { Activity, CheckCircle2, Layers, Pause, Play, Target } from 'lucide-react';
import type { ProductSuiteConfig } from '../ProductSuitePage';
import './dashboards.css';

interface DashboardRow {
  label: string;
  owner: string;
  metric: string;
  nextStep: string;
  status: 'healthy' | 'warning' | 'alert';
  statusText: string;
}

interface DashboardViewState {
  kpis: Array<{
    label: string;
    value: string;
    delta: string;
    tone?: 'positive' | 'warn' | 'accent';
    spark: string;
  }>;
  bars: Array<{ label: string; pct: number; value: string; tone?: 'accent' | 'warn' | 'muted' }>;
  rows: DashboardRow[];
  callout: string;
}

interface SuiteDashboardSpec {
  workspaceTitle: string;
  breadcrumb: string;
  exampleCompany: string;
  enginesUsed: string;
  inputsFed: string;
  cadence: string;
  chartTitle: string;
  tableTitle: string;
  before: DashboardViewState;
  after: DashboardViewState;
}

const suiteDashboards: Record<string, SuiteDashboardSpec> = {
  strategy: {
    workspaceTitle: 'Strategy Alignment & Capital Matrix',
    breadcrumb: 'LAMID ONE / Strategy / Q4 Review',
    exampleCompany: 'Northstar Logistics ($42M ARR)',
    enginesUsed: 'Strategy Alignment Matrix · Priority Ranking',
    inputsFed: '14 active projects · $2.6M Q4 budget · 3 board goals',
    cadence: 'Quarterly',
    chartTitle: 'Quarterly Budget by Strategic Objective',
    tableTitle: 'Active Initiative Alignment Log',
    before: {
      kpis: [
        { label: 'Objective Alignment', value: '64%', delta: '14% below target', tone: 'warn', spark: '0,14 16,13 32,12 48,14 64,11' },
        { label: 'Unaligned Spend', value: '$528k', delta: '4 orphan projects', tone: 'warn', spark: '0,6 16,8 32,10 48,14 64,16' },
        { label: 'Priority Stability', value: '±15%', delta: 'Rank-safe margin', tone: 'accent', spark: '0,12 16,10 32,11 48,9 64,8' },
      ],
      bars: [
        { label: 'Obj 1 · Enterprise Retention', pct: 74, value: '$720k', tone: 'accent' },
        { label: 'Obj 2 · Automated Fulfillment', pct: 56, value: '$520k', tone: 'accent' },
        { label: 'Obj 3 · Margin Expansion', pct: 48, value: '$410k', tone: 'muted' },
        { label: 'Unaligned Legacy Work', pct: 44, value: '$528k', tone: 'warn' },
      ],
      rows: [
        { label: 'Automated Customs Clearing', owner: 'VP Ops', metric: '94% fit', nextStep: 'Approve Q4 tranche', status: 'healthy', statusText: 'Funded' },
        { label: 'Legacy Portal Skinning', owner: 'Unassigned', metric: '12% fit', nextStep: 'Pause & move $240k', status: 'alert', statusText: 'Reallocate' },
        { label: 'Carrier SLA Telemetry', owner: 'CTO', metric: '89% fit', nextStep: 'Track weekly milestone', status: 'healthy', statusText: 'On Track' },
      ],
      callout: 'Exposes $528k in orphan spend so leadership can redirect budget before Q4 locks.',
    },
    after: {
      kpis: [
        { label: 'Objective Alignment', value: '88%', delta: '+24 pts after reallocation', tone: 'positive', spark: '0,15 16,13 32,10 48,6 64,3' },
        { label: 'Unaligned Spend', value: '$60k', delta: '-88% orphan budget', tone: 'positive', spark: '0,4 16,7 32,11 48,14 64,16' },
        { label: 'Priority Stability', value: '±4%', delta: 'Locked across teams', tone: 'accent', spark: '0,12 16,10 32,7 48,5 64,4' },
      ],
      bars: [
        { label: 'Obj 1 · Enterprise Retention', pct: 92, value: '$980k', tone: 'accent' },
        { label: 'Obj 2 · Automated Fulfillment', pct: 78, value: '$760k', tone: 'accent' },
        { label: 'Obj 3 · Margin Expansion', pct: 64, value: '$540k', tone: 'accent' },
        { label: 'Unaligned Legacy Work', pct: 8, value: '$60k', tone: 'muted' },
      ],
      rows: [
        { label: 'Automated Customs Clearing', owner: 'VP Ops', metric: '94% fit', nextStep: 'Live in 3 hubs', status: 'healthy', statusText: 'Scaling' },
        { label: 'Legacy Portal Skinning', owner: 'PMO', metric: 'Sunset', nextStep: '$468k freed for Obj 1', status: 'healthy', statusText: 'Reallocated' },
        { label: 'Carrier SLA Telemetry', owner: 'CTO', metric: '93% fit', nextStep: '99.4% SLA met', status: 'healthy', statusText: 'Delivered' },
      ],
      callout: 'Result: +24 pts strategic alignment and $468k redirected into top-ranked growth goals.',
    },
  },
  decisions: {
    workspaceTitle: 'Decision Quality & Register Telemetry',
    breadcrumb: 'LAMID ONE / Decisions / Executive Queue',
    exampleCompany: 'Meridian HealthTech (Series B)',
    enginesUsed: 'Decision Quality · Decision Register',
    inputsFed: '18 pending calls · Owner log · Delay cost model',
    cadence: 'Weekly',
    chartTitle: 'Decision Quality Chain Breakdown',
    tableTitle: 'Live Decision Register',
    before: {
      kpis: [
        { label: 'Avg Cycle Time', value: '34d', delta: 'Slowing execution', tone: 'warn', spark: '0,10 16,12 32,14 48,15 64,16' },
        { label: 'Stalled Calls (>30d)', value: '4', delta: '$48k/wk delay cost', tone: 'warn', spark: '0,8 16,10 32,12 48,14 64,15' },
        { label: 'Chain Quality', value: '62%', delta: 'Missing alternatives', tone: 'accent', spark: '0,14 16,13 32,12 48,13 64,12' },
      ],
      bars: [
        { label: 'Framing & Scope', pct: 84, value: '84%', tone: 'accent' },
        { label: 'Alternatives Tested', pct: 42, value: '42%', tone: 'warn' },
        { label: 'Evidence & Data', pct: 68, value: '68%', tone: 'accent' },
        { label: 'Commitment & Owner', pct: 54, value: '54%', tone: 'warn' },
      ],
      rows: [
        { label: 'Warehouse Automation CapEx ($1.2M)', owner: 'CFO', metric: 'WSJF 9.4', nextStep: 'Require 2nd vendor quote', status: 'warning', statusText: 'Add Quote' },
        { label: 'EU Data Residency Rollout', owner: 'CTO', metric: 'DQ 88%', nextStep: 'Sign off security gate', status: 'healthy', statusText: 'Ready' },
        { label: 'Enterprise Discount Tiering', owner: 'VP Sales', metric: '42d open', nextStep: 'Assign single decider', status: 'alert', statusText: 'Stalled' },
      ],
      callout: 'Surfaces $48k/week in stalled decision cost and flags weak single-option proposals.',
    },
    after: {
      kpis: [
        { label: 'Avg Cycle Time', value: '11d', delta: '-68% faster calls', tone: 'positive', spark: '0,16 16,13 32,9 48,6 64,3' },
        { label: 'Stalled Calls (>30d)', value: '0', delta: '$48k/wk recovered', tone: 'positive', spark: '0,15 16,11 32,7 48,3 64,2' },
        { label: 'Chain Quality', value: '89%', delta: 'Pre-commit verified', tone: 'accent', spark: '0,14 16,11 32,8 48,5 64,3' },
      ],
      bars: [
        { label: 'Framing & Scope', pct: 94, value: '94%', tone: 'accent' },
        { label: 'Alternatives Tested', pct: 86, value: '86%', tone: 'accent' },
        { label: 'Evidence & Data', pct: 91, value: '91%', tone: 'accent' },
        { label: 'Commitment & Owner', pct: 95, value: '95%', tone: 'accent' },
      ],
      rows: [
        { label: 'Warehouse Automation CapEx ($1.2M)', owner: 'CFO', metric: 'DQ 91%', nextStep: 'Saved $180k on 2nd bid', status: 'healthy', statusText: 'Approved' },
        { label: 'EU Data Residency Rollout', owner: 'CTO', metric: 'DQ 92%', nextStep: 'Launched on schedule', status: 'healthy', statusText: 'Live' },
        { label: 'Enterprise Discount Tiering', owner: 'CRO', metric: '9d close', nextStep: 'Guardrails published', status: 'healthy', statusText: 'Closed' },
      ],
      callout: 'Result: Cycle time dropped from 34d to 11d with zero stalled executive calls.',
    },
  },
  people: {
    workspaceTitle: 'Capability & Succession Readiness Board',
    breadcrumb: 'LAMID ONE / People & Skills / Bench Audit',
    exampleCompany: 'Apex Industrial (140 FTEs)',
    enginesUsed: 'Skills Gap Analysis · Bench Strength',
    inputsFed: '14 key roles · Skill matrix · Retention risk',
    cadence: 'Monthly',
    chartTitle: 'Critical Capability Gap vs. Target',
    tableTitle: 'Succession & Next-Role Readiness',
    before: {
      kpis: [
        { label: 'Bench Coverage', value: '64%', delta: '5 single-point risks', tone: 'warn', spark: '0,12 16,13 32,13 48,14 64,13' },
        { label: 'Critical Skill Gaps', value: '3', delta: 'FinOps & Discovery', tone: 'warn', spark: '0,8 16,9 32,12 48,13 64,14' },
        { label: 'Human Capital ROI', value: '1.82x', delta: 'Below 2.0x peer mark', tone: 'accent', spark: '0,13 16,12 32,11 48,12 64,11' },
      ],
      bars: [
        { label: 'Cloud FinOps & Unit Econ', pct: 46, value: '-1.8 gap', tone: 'warn' },
        { label: 'Enterprise Discovery', pct: 58, value: '-1.5 gap', tone: 'warn' },
        { label: 'Delivery Governance', pct: 84, value: 'On target', tone: 'accent' },
        { label: 'Partner Management', pct: 90, value: '+0.4 surplus', tone: 'accent' },
      ],
      rows: [
        { label: 'Director of Operations', owner: 'COO', metric: '81% ready', nextStep: 'Assign Q4 stretch lead', status: 'healthy', statusText: 'Internal Ready' },
        { label: 'Head of Financial Controls', owner: 'CFO', metric: 'No deputy', nextStep: 'Cross-train controller', status: 'alert', statusText: 'SPOF Risk' },
        { label: 'Principal Systems Architect', owner: 'CTO', metric: '68% ready', nextStep: 'Pair with advisory mentor', status: 'warning', statusText: '6m Coaching' },
      ],
      callout: 'Pinpoints exact skill deficits and single-point-of-failure seats before growth stalls.',
    },
    after: {
      kpis: [
        { label: 'Bench Coverage', value: '86%', delta: '+22 pts deputy depth', tone: 'positive', spark: '0,14 16,11 32,8 48,5 64,3' },
        { label: 'Critical Skill Gaps', value: '0', delta: 'Closed via targeted sprint', tone: 'positive', spark: '0,14 16,10 32,7 48,4 64,2' },
        { label: 'Human Capital ROI', value: '2.18x', delta: '+0.36x YoY uplift', tone: 'accent', spark: '0,14 16,11 32,9 48,6 64,3' },
      ],
      bars: [
        { label: 'Cloud FinOps & Unit Econ', pct: 84, value: 'Closed', tone: 'accent' },
        { label: 'Enterprise Discovery', pct: 88, value: 'Closed', tone: 'accent' },
        { label: 'Delivery Governance', pct: 91, value: '+0.6 surplus', tone: 'accent' },
        { label: 'Partner Management', pct: 94, value: '+0.7 surplus', tone: 'accent' },
      ],
      rows: [
        { label: 'Director of Operations', owner: 'COO', metric: '94% ready', nextStep: 'Promoted internally', status: 'healthy', statusText: 'Ready Now' },
        { label: 'Head of Financial Controls', owner: 'CFO', metric: 'Deputy active', nextStep: 'Shadowing monthly close', status: 'healthy', statusText: 'Covered' },
        { label: 'Principal Systems Architect', owner: 'CTO', metric: '88% ready', nextStep: 'Lead Q1 migration', status: 'healthy', statusText: 'On Track' },
      ],
      callout: 'Result: 86% succession bench coverage and zero unstaffed critical skill gaps.',
    },
  },
  operations: {
    workspaceTitle: 'Delivery Flow & Capacity Console',
    breadcrumb: 'LAMID ONE / Operations / Flow Monitor',
    exampleCompany: 'Veridian Cloud Services',
    enginesUsed: 'Delivery Flow · XmR Monitor · Workload Balance',
    inputsFed: '120-day ticket log · Squad hours · Dependency map',
    cadence: 'Weekly',
    chartTitle: 'Squad Capacity Utilization vs. Sustainable Band',
    tableTitle: 'XmR Stability & Dependency Watch',
    before: {
      kpis: [
        { label: 'Median Cycle Time', value: '6.2w', delta: 'High WIP drag', tone: 'warn', spark: '0,10 16,11 32,14 48,15 64,16' },
        { label: 'Active WIP Load', value: '44', delta: '+16 above cap', tone: 'warn', spark: '0,8 16,10 32,13 48,15 64,16' },
        { label: 'Constraint Wait Share', value: '45%', delta: 'Security QA step', tone: 'warn', spark: '0,9 16,11 32,12 48,14 64,14' },
      ],
      bars: [
        { label: 'Platform Engineering', pct: 96, value: '114% load', tone: 'warn' },
        { label: 'Core Delivery Squad', pct: 82, value: '82% load', tone: 'accent' },
        { label: 'Onboarding Ops', pct: 76, value: '76% load', tone: 'accent' },
        { label: 'Data & Analytics', pct: 58, value: '58% spare', tone: 'muted' },
      ],
      rows: [
        { label: 'API Auth v2 Migration', owner: 'Platform', metric: 'Blocks 4', nextStep: 'Shift 2 engineers from Data', status: 'alert', statusText: 'Critical Path' },
        { label: 'Client Security Review', owner: 'SecOps', metric: '9.5d wait', nextStep: 'Pre-stage checklist', status: 'warning', statusText: 'Bottleneck' },
        { label: 'Billing Reconciliation Run', owner: 'FinOps', metric: '99.2% FTR', nextStep: 'Keep automated', status: 'healthy', statusText: 'In Control' },
      ],
      callout: 'Finds the exact step holding up 45% of delivery time and shows spare capacity to absorb it.',
    },
    after: {
      kpis: [
        { label: 'Median Cycle Time', value: '3.8w', delta: '-39% faster delivery', tone: 'positive', spark: '0,16 16,12 32,9 48,5 64,3' },
        { label: 'Active WIP Load', value: '26', delta: 'Inside 85% ceiling', tone: 'positive', spark: '0,15 16,12 32,9 48,7 64,6' },
        { label: 'Constraint Wait Share', value: '18%', delta: '-27 pts queue wait', tone: 'accent', spark: '0,15 16,11 32,8 48,5 64,4' },
      ],
      bars: [
        { label: 'Platform Engineering', pct: 84, value: '84% load', tone: 'accent' },
        { label: 'Core Delivery Squad', pct: 81, value: '81% load', tone: 'accent' },
        { label: 'Onboarding Ops', pct: 79, value: '79% load', tone: 'accent' },
        { label: 'Data & Analytics', pct: 78, value: '78% load', tone: 'accent' },
      ],
      rows: [
        { label: 'API Auth v2 Migration', owner: 'Platform', metric: 'Unblocked', nextStep: 'Shipped 9d early', status: 'healthy', statusText: 'Delivered' },
        { label: 'Client Security Review', owner: 'SecOps', metric: '2.4d wait', nextStep: 'Self-serve pre-check', status: 'healthy', statusText: 'In Control' },
        { label: 'Billing Reconciliation Run', owner: 'FinOps', metric: '99.6% FTR', nextStep: 'Zero manual rework', status: 'healthy', statusText: 'In Control' },
      ],
      callout: 'Result: Cycle time cut by 39% and all squads balanced below the 85% overload ceiling.',
    },
  },
  finance: {
    workspaceTitle: '13-Week Cash Runway & Driver Tree',
    breadcrumb: 'LAMID ONE / Finance / Treasury & FP&A',
    exampleCompany: 'Harborview Manufacturing ($18M Rev)',
    enginesUsed: '13-Week Cash · DuPont Tree · Pareto Spend',
    inputsFed: 'Bank balances · AR/AP aging · Cloud & vendor ledger',
    cadence: 'Weekly',
    chartTitle: '13-Week Direct Cash Curve & Spend Concentration',
    tableTitle: 'DuPont ROE Drivers & Pareto Spend',
    before: {
      kpis: [
        { label: '13-Week Low Point', value: '$184k', delta: 'Week 8 trough risk', tone: 'warn', spark: '0,6 16,9 32,14 48,16 64,13' },
        { label: 'Ending Week 13 Cash', value: '$310k', delta: 'Thin $10k buffer', tone: 'warn', spark: '0,8 16,11 32,14 48,13 64,12' },
        { label: 'Implied EV (DCF)', value: '$16.8M', delta: '11% WACC', tone: 'accent', spark: '0,12 16,12 32,11 48,11 64,10' },
      ],
      bars: [
        { label: 'Weeks 1–4 Opening Runway', pct: 84, value: '$620k', tone: 'accent' },
        { label: 'Weeks 5–8 Tax & CapEx Trough', pct: 28, value: '$184k', tone: 'warn' },
        { label: 'Weeks 9–11 AR Collections', pct: 52, value: '$265k', tone: 'accent' },
        { label: 'Weeks 12–13 Ending Position', pct: 58, value: '$310k', tone: 'muted' },
      ],
      rows: [
        { label: 'Net Operating Margin (+1% lever)', owner: 'CFO', metric: '+1.7% ROE', nextStep: 'Reprice low-margin SKUs', status: 'healthy', statusText: 'Top Lever' },
        { label: 'Cloud Compute Spend', owner: 'CTO', metric: '+18% MoM', nextStep: 'Right-size idle nodes', status: 'warning', statusText: 'Cap Drift' },
        { label: 'Enterprise AR (>45 days)', owner: 'Controller', metric: '$240k', nextStep: 'Collect 3 top invoices', status: 'alert', statusText: 'Accelerate' },
      ],
      callout: 'Flags the Week 8 cash trough 6 weeks ahead so treasury can pull forward AR.',
    },
    after: {
      kpis: [
        { label: '13-Week Low Point', value: '$390k', delta: '+$206k safer trough', tone: 'positive', spark: '0,10 16,11 32,9 48,7 64,4' },
        { label: 'Ending Week 13 Cash', value: '$540k', delta: '+$230k above floor', tone: 'positive', spark: '0,11 16,9 32,7 48,5 64,3' },
        { label: 'Implied EV (DCF)', value: '$19.2M', delta: '+$2.4M margin lift', tone: 'accent', spark: '0,14 16,11 32,8 48,6 64,3' },
      ],
      bars: [
        { label: 'Weeks 1–4 Opening Runway', pct: 84, value: '$620k', tone: 'accent' },
        { label: 'Weeks 5–8 Tax & CapEx Trough', pct: 62, value: '$390k', tone: 'accent' },
        { label: 'Weeks 9–11 AR Collections', pct: 74, value: '$465k', tone: 'accent' },
        { label: 'Weeks 12–13 Ending Position', pct: 82, value: '$540k', tone: 'accent' },
      ],
      rows: [
        { label: 'Net Operating Margin (+1.8% lift)', owner: 'CFO', metric: '+3.1% ROE', nextStep: 'Locked in Q4 pricing', status: 'healthy', statusText: 'Captured' },
        { label: 'Cloud Compute Spend', owner: 'CTO', metric: '-22% MoM', nextStep: 'Reserved instances active', status: 'healthy', statusText: 'On Budget' },
        { label: 'Enterprise AR (>45 days)', owner: 'Controller', metric: '$45k', nextStep: '$195k collected early', status: 'healthy', statusText: 'Collected' },
      ],
      callout: 'Result: Week 8 trough lifted by $206k and implied enterprise value increased by $2.4M.',
    },
  },
  'risk-governance': {
    workspaceTitle: 'Enterprise Risk & KRI Early Warning',
    breadcrumb: 'LAMID ONE / Risk & Governance / Board View',
    exampleCompany: 'Sterling Financial Advisory',
    enginesUsed: 'ISO 31000 Register · KRI Early Warning · BIA',
    inputsFed: '22 risk entries · KRI feeds · ISO 27001 controls',
    cadence: 'Monthly',
    chartTitle: 'Control & Continuity Readiness by Domain',
    tableTitle: 'Active Exposure & Obligation Queue',
    before: {
      kpis: [
        { label: 'Risks Above Appetite', value: '4', delta: '22 total tracked', tone: 'warn', spark: '0,9 16,10 32,12 48,14 64,14' },
        { label: 'KRI Breach Horizon', value: '4.5w', delta: 'Cash buffer KRI', tone: 'warn', spark: '0,8 16,10 32,12 48,14 64,15' },
        { label: 'Compliance Coverage', value: '78%', delta: 'ISO 27001 / SOC2', tone: 'accent', spark: '0,12 16,11 32,11 48,10 64,10' },
      ],
      bars: [
        { label: 'Board Governance', pct: 86, value: '86%', tone: 'accent' },
        { label: 'Regulatory Mapping', pct: 84, value: '84%', tone: 'accent' },
        { label: 'Cyber Posture', pct: 68, value: '68%', tone: 'warn' },
        { label: 'Billing Failover RTO', pct: 44, value: '9h vs 2h', tone: 'warn' },
      ],
      rows: [
        { label: 'Single Payment Rail Concentration', owner: 'CRO', metric: 'Residual 16', nextStep: 'Onboard backup processor', status: 'alert', statusText: 'Above Appetite' },
        { label: 'AP Vendor Creation SoD', owner: 'Audit', metric: '2 conflicts', nextStep: 'Split approval permissions', status: 'warning', statusText: 'Remediating' },
        { label: 'Enterprise SLA Covenant Renewal', owner: 'Legal', metric: 'Due in 12d', nextStep: 'Route final redline', status: 'healthy', statusText: 'On Schedule' },
      ],
      callout: 'Catches KRI breaches 4+ weeks early and maps every gap to an owned remediation.',
    },
    after: {
      kpis: [
        { label: 'Risks Above Appetite', value: '0', delta: 'All within board band', tone: 'positive', spark: '0,15 16,11 32,8 48,4 64,2' },
        { label: 'KRI Breach Horizon', value: '>16w', delta: 'No active triggers', tone: 'positive', spark: '0,14 16,11 32,8 48,5 64,3' },
        { label: 'Compliance Coverage', value: '96%', delta: 'Audit-ready evidence', tone: 'accent', spark: '0,13 16,10 32,7 48,5 64,2' },
      ],
      bars: [
        { label: 'Board Governance', pct: 95, value: '95%', tone: 'accent' },
        { label: 'Regulatory Mapping', pct: 96, value: '96%', tone: 'accent' },
        { label: 'Cyber Posture', pct: 92, value: '92%', tone: 'accent' },
        { label: 'Billing Failover RTO', pct: 94, value: '1.4h vs 2h', tone: 'accent' },
      ],
      rows: [
        { label: 'Dual Payment Rail Active', owner: 'CRO', metric: 'Residual 4', nextStep: 'Automated failover tested', status: 'healthy', statusText: 'Mitigated' },
        { label: 'AP Vendor Creation SoD', owner: 'Audit', metric: '0 conflicts', nextStep: 'RBAC enforced cleanly', status: 'healthy', statusText: 'Verified' },
        { label: 'Enterprise SLA Covenant Renewal', owner: 'Legal', metric: 'Signed', nextStep: 'Archived in audit log', status: 'healthy', statusText: 'Complete' },
      ],
      callout: 'Result: Zero exposures above board appetite and 96% audit-ready control coverage.',
    },
  },
  'growth-change': {
    workspaceTitle: '3-Horizon Growth & Readiness Board',
    breadcrumb: 'LAMID ONE / Growth & Change / Portfolio',
    exampleCompany: 'Solstice Commerce ($28M ARR)',
    enginesUsed: '3-Horizon Model · Growth Pathways · ADKAR',
    inputsFed: '6 growth bets · Working capital cap · Team survey',
    cadence: 'Quarterly',
    chartTitle: 'Change Readiness Diagnostic by Stakeholder Group',
    tableTitle: 'Sequenced Growth Pathways',
    before: {
      kpis: [
        { label: 'H1 / H2 / H3 Split', value: '82/15/3', delta: 'Over-indexed on H1', tone: 'warn', spark: '0,12 16,12 32,13 48,14 64,14' },
        { label: 'Transformation Pace', value: '54%', delta: 'Stalled in Ops rollout', tone: 'warn', spark: '0,10 16,11 32,13 48,14 64,14' },
        { label: 'Readiness Barrier', value: '41%', delta: 'Ops Ability gap', tone: 'warn', spark: '0,9 16,11 32,12 48,14 64,15' },
      ],
      bars: [
        { label: 'Awareness of Case', pct: 88, value: '88%', tone: 'accent' },
        { label: 'Desire to Adopt', pct: 62, value: '62%', tone: 'accent' },
        { label: 'Ability (Ops Workflow)', pct: 41, value: '41% Stall', tone: 'warn' },
        { label: 'Reinforcement Cadence', pct: 54, value: '54%', tone: 'warn' },
      ],
      rows: [
        { label: 'Wave 1 · Existing Account Expansion', owner: 'VP Growth', metric: 'Score 88', nextStep: 'Scale top 40 accounts', status: 'healthy', statusText: 'Scaling' },
        { label: 'Wave 2 · UK Vertical Entry', owner: 'GM EMEA', metric: '+$1.1M WC', nextStep: 'Gate on Wave 1 cash', status: 'warning', statusText: 'Stage-Gated' },
        { label: 'Ops Enablement Playbooks', owner: 'COO', metric: '41% ready', nextStep: 'Run 2-week workflow clinic', status: 'alert', statusText: 'Unblock' },
      ],
      callout: 'Pinpoints the exact ADKAR stall point (Ability) before launching Horizon 2 expansion.',
    },
    after: {
      kpis: [
        { label: 'H1 / H2 / H3 Split', value: '65/25/10', delta: 'Balanced growth portfolio', tone: 'positive', spark: '0,14 16,11 32,8 48,6 64,4' },
        { label: 'Transformation Pace', value: '86%', delta: '+32 pts adoption lift', tone: 'positive', spark: '0,15 16,12 32,8 48,5 64,3' },
        { label: 'Readiness Barrier', value: '84%', delta: 'Ops clinic completed', tone: 'accent', spark: '0,15 16,12 32,9 48,5 64,3' },
      ],
      bars: [
        { label: 'Awareness of Case', pct: 94, value: '94%', tone: 'accent' },
        { label: 'Desire to Adopt', pct: 85, value: '85%', tone: 'accent' },
        { label: 'Ability (Ops Workflow)', pct: 84, value: '84% Ready', tone: 'accent' },
        { label: 'Reinforcement Cadence', pct: 88, value: '88%', tone: 'accent' },
      ],
      rows: [
        { label: 'Wave 1 · Existing Account Expansion', owner: 'VP Growth', metric: '+$2.8M ARR', nextStep: 'Funding Wave 2 self-sustained', status: 'healthy', statusText: 'Outperforming' },
        { label: 'Wave 2 · UK Vertical Entry', owner: 'GM EMEA', metric: 'Gate Passed', nextStep: 'First 6 pilots signed', status: 'healthy', statusText: 'Active' },
        { label: 'Ops Enablement Playbooks', owner: 'COO', metric: '84% ready', nextStep: 'Weekly reinforcement live', status: 'healthy', statusText: 'Adopted' },
      ],
      callout: 'Result: 86% rollout pace and UK expansion funded cleanly from Wave 1 cash.',
    },
  },
  advisory: {
    workspaceTitle: 'Fractional Partner & Escrow Ledger',
    breadcrumb: 'LAMID ONE / Expert Advisory / Active Mandate',
    exampleCompany: 'Crestline Bio (Series B Prep)',
    enginesUsed: 'Escrow Governance · Concierge Briefs',
    inputsFed: '3 milestone gates · Engine briefs · Sign-off log',
    cadence: 'Milestone',
    chartTitle: 'Milestone Escrow & Deliverable Verification',
    tableTitle: 'Active Advisory & Peer Review Mandates',
    before: {
      kpis: [
        { label: 'Escrow Protected', value: '$45k', delta: '3 gated milestones', tone: 'accent', spark: '0,10 16,10 32,10 48,10 64,10' },
        { label: 'Briefing Prep Time', value: '0 hrs', delta: 'Auto-shared engine pack', tone: 'positive', spark: '0,4 16,4 32,4 48,4 64,4' },
        { label: 'Partner Match SLA', value: '72h', delta: 'Vetted CFO + IC', tone: 'positive', spark: '0,12 16,10 32,8 48,6 64,4' },
      ],
      bars: [
        { label: 'M1 · 13-Week Cash & Data Room', pct: 100, value: 'In Review ($15k)', tone: 'accent' },
        { label: 'M2 · Series B Investor Model', pct: 35, value: 'Escrowed ($15k)', tone: 'muted' },
        { label: 'M3 · Board & Diligence Close', pct: 10, value: 'Escrowed ($15k)', tone: 'muted' },
      ],
      rows: [
        { label: 'Fractional CFO Mandate (12 hrs/wk)', owner: 'Matched CFO', metric: 'M1 Gate', nextStep: 'Verify 13-week cash pack', status: 'warning', statusText: 'Reviewing' },
        { label: 'M&A Acquisition Peer Review', owner: 'Board IC', metric: '48h SLA', nextStep: 'Flagged $340k synergy gap', status: 'healthy', statusText: 'Active' },
        { label: 'Concierge Board Pack Prep', owner: 'Chief of Staff', metric: '6 Briefs', nextStep: 'Auto-synced with Finance', status: 'healthy', statusText: 'Ready' },
      ],
      callout: 'Advisers start with your full engine context and escrow releases only on sign-off.',
    },
    after: {
      kpis: [
        { label: 'Escrow Released', value: '$45k', delta: '3/3 milestones signed', tone: 'positive', spark: '0,15 16,12 32,8 48,5 64,2' },
        { label: 'Diligence Readiness', value: '100%', delta: 'Zero investor follow-ups', tone: 'positive', spark: '0,14 16,11 32,8 48,4 64,2' },
        { label: 'Capital Raised', value: '$14M', delta: 'Series B closed on time', tone: 'accent', spark: '0,15 16,12 32,9 48,5 64,2' },
      ],
      bars: [
        { label: 'M1 · 13-Week Cash & Data Room', pct: 100, value: 'Released ($15k)', tone: 'accent' },
        { label: 'M2 · Series B Investor Model', pct: 100, value: 'Released ($15k)', tone: 'accent' },
        { label: 'M3 · Board & Diligence Close', pct: 100, value: 'Released ($15k)', tone: 'accent' },
      ],
      rows: [
        { label: 'Fractional CFO Mandate (12 hrs/wk)', owner: 'Matched CFO', metric: '3/3 Signed', nextStep: 'Term sheet closed', status: 'healthy', statusText: 'Completed' },
        { label: 'M&A Acquisition Peer Review', owner: 'Board IC', metric: '$340k Saved', nextStep: 'Avoided overpaying', status: 'healthy', statusText: 'Verified' },
        { label: 'Concierge Board Pack Prep', owner: 'Chief of Staff', metric: '100% Ready', nextStep: 'Adopted as Q1 cadence', status: 'healthy', statusText: 'Delivered' },
      ],
      callout: 'Result: All 3 milestones verified and Series B closed with $340k saved in diligence.',
    },
  },
};

const SUITE_GOALS: Record<string, { goal: string; detail: string; workingNote: string }> = {
  strategy: {
    goal: 'Align 100% of Q4 budget to top 3 board priorities',
    detail: 'Comparing 14 active projects ($2.6M) against Enterprise Retention & Margin goals',
    workingNote: 'Reallocating $468k from low-fit legacy work into Automated Customs Clearing...',
  },
  decisions: {
    goal: 'Cut decision cycle time under 14 days with zero stalled calls',
    detail: 'Scoring 18 executive proposals across Framing, Alternatives, Evidence, and Owner',
    workingNote: 'Adding 2nd vendor bid to Warehouse CapEx and assigning CRO to Discount Tiering...',
  },
  people: {
    goal: 'Eliminate single-point-of-failure seats and close FinOps skill gaps',
    detail: 'Auditing 14 critical leadership roles against 12-month growth requirements',
    workingNote: 'Cross-training deputy controller and pairing Systems Architect with mentor...',
  },
  operations: {
    goal: 'Keep all delivery squads under 85% load and cut cycle time by 35%',
    detail: 'Tracking 120-day flow telemetry, WIP caps, and SecOps review queue',
    workingNote: 'Shifting 2 engineers from Data to Platform and pre-staging Security checklist...',
  },
  finance: {
    goal: 'Protect 13-week cash above $350k and lift return on equity',
    detail: 'Modeling weekly bank balances, AR/AP aging, and cloud spend concentration',
    workingNote: 'Pulling forward $195k in overdue AR and right-sizing idle cloud compute...',
  },
  'risk-governance': {
    goal: 'Bring all exposures inside board appetite before Q1 audit',
    detail: 'Monitoring 22 risk items, KRI breach horizons, and ISO 27001 / SOC2 controls',
    workingNote: 'Onboarding backup payment rail and splitting AP vendor approval permissions...',
  },
  'growth-change': {
    goal: 'Fund Horizon 2 expansion cleanly without overloading Ops',
    detail: 'Balancing 6 growth bets against working-capital caps and ADKAR team readiness',
    workingNote: 'Running 2-week Ops enablement clinic to unlock Wave 2 UK vertical launch...',
  },
  advisory: {
    goal: 'Close Series B diligence on time with escrow-protected milestones',
    detail: 'Syncing 6 live engine briefs with matched fractional CFO and Board IC',
    workingNote: 'Verifying 13-week cash pack at Milestone 1 and releasing $15k escrow tranche...',
  },
};

const LOOP_STAGES = [
  { id: 0, label: '1 · Goal & Inputs' },
  { id: 1, label: '2 · Engine Scan' },
  { id: 2, label: '3 · Team Action' },
  { id: 3, label: '4 · Target Met' },
] as const;

export function SuiteDashboardShowcase({ config }: { config: ProductSuiteConfig }) {
  const spec = suiteDashboards[config.id] || suiteDashboards.strategy;
  const goalInfo = SUITE_GOALS[config.id] || SUITE_GOALS.strategy;
  const reduced = useReducedMotion();
  const [stage, setStage] = useState<number>(0);
  const [paused, setPaused] = useState<boolean>(false);

  useEffect(() => {
    if (reduced || paused) return;
    const timer = window.setInterval(() => {
      setStage((prev) => (prev + 1) % LOOP_STAGES.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [reduced, paused]);

  const view = stage >= 3 ? spec.after : spec.before;
  const activeStageLabel =
    stage === 0
      ? `Goal loaded: ${goalInfo.goal}`
      : stage === 1
        ? 'Engine scan flagged gaps & priority levers'
        : stage === 2
          ? goalInfo.workingNote
          : view.callout;

  return (
    <section className="suite-dashboard-section" aria-labelledby="suite-dashboard-title">
      <div className="suite-dashboard-header">
        <div className="suite-dashboard-intro">
          <h2 id="suite-dashboard-title">{config.thesis.headline}</h2>
          <p>{config.thesis.description}</p>
        </div>

        <div className="suite-loop-controls">
          <div className="suite-loop-pills" role="tablist" aria-label="Walkthrough stages">
            {LOOP_STAGES.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                className={`suite-loop-pill ${stage === s.id ? 'is-active' : ''}`}
                aria-selected={stage === s.id}
                onClick={() => setStage(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="suite-loop-toggle"
            aria-label={paused ? 'Play walkthrough loop' : 'Pause walkthrough loop'}
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div className="suite-dash-frame" data-stage={stage} role="region" aria-label={spec.workspaceTitle}>
        <div className="suite-dash-chrome">
          <div className="suite-dash-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <span className="suite-dash-crumb">{spec.breadcrumb}</span>
          <span className="suite-dash-sample-badge">
            <span className={`suite-live-dot ${paused || reduced ? 'is-paused' : ''}`} aria-hidden="true" />
            {spec.exampleCompany}
          </span>
        </div>

        <div className="suite-dash-goal-strip">
          <div className="suite-dash-goal-main">
            <Target size={15} aria-hidden="true" />
            <strong>User Goal:</strong>
            <span>{goalInfo.goal}</span>
          </div>
          <span className="suite-dash-goal-detail">{goalInfo.detail}</span>
        </div>

        <div className="suite-dash-context">
          <div>
            <Layers size={14} aria-hidden="true" />
            <strong>Engines:</strong> <span>{spec.enginesUsed}</span>
          </div>
          <div>
            <strong>Inputs fed:</strong> <span>{spec.inputsFed}</span>
          </div>
          <span className="suite-dash-cadence">{spec.cadence} cadence</span>
        </div>

        <div className="suite-dash-progress-track" aria-hidden="true">
          <div
            className="suite-dash-progress-fill"
            style={{ width: `${((stage + 1) / LOOP_STAGES.length) * 100}%` }}
          />
        </div>

        <div className="suite-dash-body">
          <div className="suite-dash-kpi-row">
            {view.kpis.map((kpi) => (
              <div key={kpi.label} className="suite-dash-kpi">
                <div className="suite-dash-kpi-top">
                  <span className="suite-dash-kpi-lbl">{kpi.label}</span>
                  <svg
                    className={`suite-dash-spark tone-${kpi.tone || 'accent'}`}
                    viewBox="0 0 64 20"
                    aria-hidden="true"
                  >
                    <polyline fill="none" stroke="currentColor" strokeWidth="2" points={kpi.spark} />
                  </svg>
                </div>
                <strong className="suite-dash-kpi-val">{kpi.value}</strong>
                <span className={`suite-dash-kpi-delta tone-${kpi.tone || 'accent'}`}>
                  {kpi.delta}
                </span>
              </div>
            ))}
          </div>

          <div className="suite-dash-split">
            <div className="suite-dash-panel">
              <h3>{spec.chartTitle}</h3>
              <div className="suite-dash-bars">
                {view.bars.map((bar) => (
                  <div key={bar.label} className="suite-dash-bar-row">
                    <div className="suite-dash-bar-meta">
                      <span>{bar.label}</span>
                      <strong>{bar.value}</strong>
                    </div>
                    <div className="suite-dash-bar-track">
                      <div
                        className={`suite-dash-bar-fill tone-${bar.tone || 'accent'}`}
                        style={{ width: `${bar.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="suite-dash-panel">
              <h3>{spec.tableTitle}</h3>
              <div className="suite-dash-rows">
                {view.rows.map((row, idx) => (
                  <div
                    key={row.label}
                    className={`suite-dash-table-row ${stage === 2 && idx === 1 ? 'is-working' : ''}`}
                  >
                    <div>
                      <strong>{row.label}</strong>
                      <span>
                        Owner: {row.owner} · {row.metric}
                      </span>
                      <span className="suite-dash-row-action">
                        {stage === 2 ? `In progress: ${row.nextStep}` : `Next: ${row.nextStep}`}
                      </span>
                    </div>
                    <span className={`suite-dash-pill status-${row.status}`}>
                      {stage === 2 && idx === 1 ? 'Working...' : row.statusText}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="suite-dash-foot">
            <p>
              {stage === 3 ? (
                <CheckCircle2 size={16} aria-hidden="true" />
              ) : (
                <Activity size={16} aria-hidden="true" />
              )}
              {activeStageLabel}
            </p>
            <Link className="suite-demo-link" to="/demo">
              Try with your own numbers &rarr;
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
