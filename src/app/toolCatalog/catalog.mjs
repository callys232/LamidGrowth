/**
 * The standards-based tool catalog: 63 tools, each built on a recognised method, replacing the
 * 248 ported LamidOne modules (see migration.mjs for where every original code went).
 *
 * Each tool keeps one existing engine code as its primary code, so agent_manifests rows, bundle
 * entitlements, points pricing and run history keep working unchanged. Codes merged into a tool
 * run that tool; retired, view-only and content codes are no longer offered.
 *
 * Every tool plugs into the same intelligence layer as the original engines: a deterministic
 * compute returning `summary` (figures), `working` (the text the agent layer reads) and
 * `warnings`, plus a plain `computes` / `limits` disclosure. No model call happens here.
 */
import { MAP } from './migration.mjs';
import { BANKS, LEVELS, EVIDENCE, runAnchored } from './anchored.mjs';
import { parseSchemaInput, assertFinite } from './schema.mjs';
import * as strategy from './tools/strategy.mjs';
import * as operations from './tools/operations.mjs';
import * as decisions from './tools/decisions.mjs';
import * as risk from './tools/risk.mjs';
import * as people from './tools/people.mjs';
import * as finance from './tools/finance.mjs';

const S = { ...strategy, ...operations, ...decisions, ...risk, ...people, ...finance };

// engine: 'schema' (impl in tools/*), 'anchored' (bank in anchored.mjs), or 'existing' (an
// original engine archetype that already follows the method — run unchanged under a new name).
const schema = (impl) => ({ engine: 'schema', impl });
const anchored = (bank) => ({ engine: 'anchored', bank });
const existing = (kind) => ({ engine: 'existing', kind });

export const TOOLS = {
  T01: {
    area: 'Strategy',
    name: 'Purpose & Strategic Direction',
    standard:
      'Mission, vision and values (Collins & Porras core ideology); ISO 9001 §4.1 context of the organisation',
    purpose:
      'Checks that the organisation’s purpose, values and priorities are clear, shared, and actually used in decisions.',
    ...anchored('purpose'),
  },
  T02: {
    area: 'Strategy',
    name: 'Strategy Alignment Matrix',
    standard: 'Hoshin Kanri X-matrix; McKinsey 7-S',
    purpose:
      'Links objectives to the initiatives and spend under way, so you can see what serves no objective and which objectives have no funded work.',
    ...schema('alignment'),
  },
  T03: {
    area: 'Strategy',
    name: 'Strategic Priority Ranking',
    standard: 'Multi-criteria decision analysis (weighted scoring)',
    purpose:
      'Ranks your actual strategic priorities against weighted criteria and shows how sensitive the ranking is to the weights.',
    ...existing('selection'),
  },
  T04: {
    area: 'Strategy',
    name: 'OKR & Strategy Execution Review',
    standard: 'OKRs (Doerr); Balanced Scorecard reviews (Kaplan & Norton)',
    purpose:
      'Tracks objectives and key results against the time elapsed, so you see what is on pace and what is falling behind.',
    ...schema('okr'),
  },
  T05: {
    area: 'Strategy',
    name: 'External Environment Scan',
    standard: 'PESTLE; Porter’s Five Forces',
    purpose:
      'Ranks the external factors that matter by impact and likelihood and checks no heading was overlooked.',
    ...schema('pestle'),
  },
  T63: {
    area: 'Strategy',
    name: 'Operating Model Review',
    standard: 'McKinsey 7-S; Galbraith Star Model',
    purpose:
      'Assesses whether structure, decision rights, processes, people, measures and information fit the strategy.',
    ...anchored('operatingModel'),
  },
  T06: {
    area: 'Operations',
    name: 'Delivery Flow Metrics',
    standard: 'Kanban flow metrics; Little’s Law',
    purpose:
      'Measures how fast and how predictably work flows: throughput, cycle time, work in progress and flow efficiency.',
    ...schema('flow'),
  },
  T07: {
    area: 'Operations',
    name: 'Drift & Stability Monitor',
    standard: 'Statistical Process Control (XmR chart; Western Electric and Nelson rules)',
    purpose:
      'Tells real drift from routine variation in any metric, so you react to signals and not to noise.',
    ...schema('spc'),
  },
  T08: {
    area: 'Operations',
    name: 'Dependency Board',
    standard: 'Dependency tracking (DSM; programme board practice)',
    purpose:
      'Tracks what teams need from each other and when, and shows which dependencies are late and who is most often late.',
    ...schema('dependencies'),
  },
  T09: {
    area: 'Operations',
    name: 'Workload & Capacity Balance',
    standard: 'Capacity planning and utilisation (85% ceiling)',
    purpose:
      'Compares demand with capacity for each team or person and suggests where spare capacity could absorb overload.',
    ...schema('capacity'),
  },
  T10: {
    area: 'Operations',
    name: 'Bottleneck & Process Improvement',
    standard: 'Theory of Constraints (Goldratt); Lean value-stream thinking',
    purpose:
      'Finds the step that limits throughput and where improvement would actually raise output.',
    ...existing('optimisation'),
  },
  T11: {
    area: 'Operations',
    name: 'Root Cause Analysis',
    standard: '5 Whys; Ishikawa (fishbone); Kepner-Tregoe Problem Analysis',
    purpose:
      'Structures the search for a root cause and tests candidate causes against the evidence and the facts.',
    ...schema('rootCause'),
  },
  T12: {
    area: 'Operations',
    name: 'Operating Rhythm & Meeting Design',
    standard: 'Governance calendar; meeting-load analysis',
    purpose:
      'Shows what your recurring meetings cost, how much is status updates, and whether weekly, monthly and quarterly reviews exist.',
    ...schema('rhythm'),
  },
  T13: {
    area: 'Operations',
    name: 'Productivity & Output Metrics',
    standard: 'OEE quality rate (ISO 22400); SPACE framework for knowledge work',
    purpose: 'Compares quality-adjusted output per hour across teams and over time.',
    ...schema('productivity'),
  },
  T14: {
    area: 'Operations',
    name: 'Collaboration Network Map',
    standard: 'Organisational Network Analysis (Cross & Parker)',
    purpose:
      'Maps who relies on whom and finds overloaded connectors, isolated teams and single points of failure.',
    ...schema('network'),
  },
  T15: {
    area: 'Operations',
    name: 'Technology ROI & Total Cost',
    standard: 'Total cost of ownership; return on investment',
    purpose:
      'Compares what each system costs with the value of the time it saves, plus adoption and unused licences.',
    ...schema('techRoi'),
  },
  T16: {
    area: 'Operations',
    name: 'Innovation Funnel',
    standard: 'ISO 56002 innovation management; Stage-Gate (Cooper)',
    purpose:
      'Measures conversion between innovation stages, time to market and return on innovation spend.',
    ...schema('funnel'),
  },
  T17: {
    area: 'Operations',
    name: 'Data Quality Check',
    standard: 'DAMA-DMBOK data quality dimensions; ISO 8000',
    purpose:
      'Assesses whether the data behind decisions is accurate, complete, timely, consistent and owned.',
    ...anchored('dataQuality'),
  },
  T18: {
    area: 'Decisions',
    name: 'Decision Quality',
    standard: 'Decision Quality (Spetzler, Winter & Meyer; Strategic Decisions Group)',
    purpose:
      'Scores one decision against the six requirements of decision quality, limited by its weakest link.',
    ...existing('decision-quality'),
  },
  T19: {
    area: 'Decisions',
    name: 'Decision Register',
    standard: 'Decision log / Architecture Decision Records practice',
    purpose:
      'Keeps a record of decisions and measures cycle time, stalled and recurring decisions, missing owners and overdue reviews.',
    ...schema('decisionRegister'),
  },
  T20: {
    area: 'Decisions',
    name: 'Decision Rights Matrix',
    standard: 'RACI; Bain RAPID; delegation of authority',
    purpose:
      'Checks every decision has exactly one accountable owner and finds roles holding too many final calls.',
    ...schema('raci'),
  },
  T21: {
    area: 'Decisions',
    name: 'Option Comparison',
    standard: 'Kepner-Tregoe Decision Analysis; multi-criteria decision analysis',
    purpose: 'Scores options against weighted criteria and shows how fragile the winner is.',
    ...existing('selection'),
  },
  T22: {
    area: 'Decisions',
    name: 'Scenarios & Expected Value',
    standard:
      'Decision analysis: expected value, regret and value of information; scenario planning',
    purpose:
      'Compares options across possible futures and shows what better information would be worth.',
    ...existing('scenario-decision'),
  },
  T23: {
    area: 'Decisions',
    name: 'Decision Timing & Cost of Delay',
    standard: 'Cost of Delay and WSJF (Reinertsen); Eisenhower matrix',
    purpose:
      'Orders pending decisions by the cost of waiting and flags deadlines that can no longer be met.',
    ...schema('costOfDelay'),
  },
  T24: {
    area: 'Decisions',
    name: 'Priority Conflict Check',
    standard: 'Pairwise trade-off analysis',
    purpose: 'Checks objectives pair by pair for conflicts that have no stated trade-off.',
    ...existing('conflict'),
  },
  T25: {
    area: 'Decisions',
    name: 'Stakeholder Map',
    standard: 'Mendelow power–interest grid; Mitchell, Agle & Wood salience',
    purpose: 'Maps stakeholders by power, interest and position, and flags powerful opponents.',
    ...schema('stakeholders'),
  },
  T26: {
    area: 'Decisions',
    name: 'Force Field Analysis',
    standard: 'Lewin’s force field analysis',
    purpose: 'Weighs the forces for and against a change and names the resistance to reduce first.',
    ...schema('forceField'),
  },
  T27: {
    area: 'Decisions',
    name: 'Decision Method Selector',
    standard: 'Cynefin framework (Snowden); one-way / two-way door test',
    purpose: 'Recommends how much process a decision needs and which method to use.',
    ...schema('methodSelector'),
  },
  T30: {
    area: 'Decisions',
    name: 'Benefits & After-Action Review',
    standard: 'Benefits realisation (MSP; PMI); After Action Review',
    purpose: 'Compares planned with realised value and records what was learned.',
    ...schema('benefits'),
  },
  T35: {
    area: 'Decisions',
    name: 'Forecast Calibration',
    standard: 'Brier score and calibration (Tetlock; Good Judgment Project)',
    purpose:
      'Measures how good people’s judgement actually is from predictions recorded and later resolved.',
    ...schema('calibration'),
  },
  T28: {
    area: 'Risk',
    name: 'Early Warning Indicators',
    standard: 'Key Risk Indicators (COSO ERM; ISO 31000)',
    purpose:
      'Tracks leading indicators against amber and red thresholds and shows how soon they will breach.',
    ...schema('kri'),
  },
  T29: {
    area: 'Risk',
    name: 'Risk Register',
    standard: 'ISO 31000 risk management; COSO ERM',
    purpose:
      'Keeps risks with owners and controls, and shows the heat map, risks above appetite and overdue actions.',
    ...schema('riskRegister'),
  },
  T36: {
    area: 'Risk',
    name: 'Business Continuity (BIA)',
    standard: 'ISO 22301 business impact analysis',
    purpose: 'Sets recovery priorities and finds activities that would not recover in time.',
    ...schema('bia'),
  },
  T37: {
    area: 'Risk',
    name: 'Cyber Security Posture',
    standard: 'NIST Cybersecurity Framework 2.0; ISO/IEC 27001',
    purpose: 'Assesses security across the six NIST CSF functions, with evidence.',
    ...anchored('cyber'),
  },
  T39: {
    area: 'Risk',
    name: 'Organisational Resilience',
    standard: 'ISO 22316 organisational resilience',
    purpose: 'Assesses the attributes that let an organisation absorb shocks and adapt.',
    ...anchored('resilience'),
  },
  T32: {
    area: 'Governance',
    name: 'Governance Assessment',
    standard: 'ISO 37000 governance of organisations; OECD Principles; King IV',
    purpose: 'Assesses governance against recognised principles, with evidence for each answer.',
    ...anchored('governance'),
  },
  T33: {
    area: 'Governance',
    name: 'Commitments & Obligations Register',
    standard: 'Obligations register (ISO 37301); collaborative relationships (ISO 44001)',
    purpose:
      'Tracks contracts, partnership terms, public pledges and mandates against their due dates.',
    ...schema('obligations'),
  },
  T34: {
    area: 'Governance',
    name: 'Compliance Assessment',
    standard: 'ISO 37301 compliance management systems',
    purpose: 'Shows which compliance obligations are controlled and evidenced, by regulation.',
    ...schema('compliance'),
  },
  T38: {
    area: 'Governance',
    name: 'Ethics & Integrity',
    standard: 'ISO 37001 anti-bribery; ISO 37002 whistleblowing',
    purpose:
      'Assesses conduct standards, conflicts of interest, speak-up channels and consequences.',
    ...anchored('ethics'),
  },
  T61: {
    area: 'Governance',
    name: 'Financial Controls Review',
    standard: 'COSO Internal Control – Integrated Framework (2013)',
    purpose: 'Reviews key financial controls by process using COSO deficiency levels.',
    ...schema('controls'),
  },
  T31: {
    area: 'People',
    name: 'Culture & Values Assessment',
    standard:
      'Culture traits model (Denison & Mishra, 1995); team psychological safety (Edmondson, 1999) — original question wording',
    purpose:
      'Assesses involvement, consistency, adaptability, mission and psychological safety. Best answered by many people and averaged.',
    ...anchored('culture'),
  },
  T40: {
    area: 'People',
    name: 'Skills Gap Analysis',
    standard: 'SFIA skills framework',
    purpose:
      'Compares required and current skill levels by role and finds skills held by only one person.',
    ...schema('skillsGap'),
  },
  T41: {
    area: 'People',
    name: 'Workforce Plan',
    standard: 'ISO 30409 workforce planning',
    purpose:
      'Compares future demand with projected supply for each role and sets the hire or develop route.',
    ...schema('workforcePlan'),
  },
  T42: {
    area: 'People',
    name: 'Succession & Bench Strength',
    standard: 'Succession planning (ready-now / ready-later bench)',
    purpose: 'Measures succession coverage for each critical seat.',
    ...existing('bench-strength'),
  },
  T43: {
    area: 'People',
    name: 'Human Capital Metrics',
    standard: 'ISO 30414 human capital reporting',
    purpose:
      'Calculates the standard people measures: turnover, hiring, mobility, training, absence and productivity.',
    ...schema('humanCapital'),
  },
  T44: {
    area: 'People',
    name: 'Performance–Potential Grid',
    standard: '9-box talent review',
    purpose: 'Places people on the 9-box grid and flags key talent at risk of leaving.',
    ...schema('nineBox'),
  },
  T45: {
    area: 'People',
    name: 'Engagement Survey',
    standard: 'Employee Net Promoter Score (eNPS)',
    purpose: 'Scores engagement from staff answers by team, protecting anonymity in small teams.',
    ...schema('engagement'),
  },
  T46: {
    area: 'People',
    name: 'Development ROI',
    standard: 'Kirkpatrick four levels; Phillips ROI methodology',
    purpose: 'Shows how deeply each programme is evaluated and its return after attribution.',
    ...schema('devRoi'),
  },
  T47: {
    area: 'People',
    name: 'Competency & 360 Review',
    standard: 'Behavioural competency framework; 360-degree feedback',
    purpose:
      'Compares self and others’ ratings against expected levels to find gaps and blind spots.',
    ...schema('review360'),
  },
  T48: {
    area: 'People',
    name: 'Next-Role Readiness',
    standard: 'Role requirement gap analysis',
    purpose:
      'Measures how ready a person is for a target role and how long the gaps take to close.',
    ...schema('nextRole'),
  },
  T49: {
    area: 'Change',
    name: 'Change Readiness',
    standard: 'Five readiness beliefs (Armenakis & Harris); Kotter’s 8 steps',
    purpose: 'Finds each affected group’s barrier point so effort goes where the change is stuck.',
    ...schema('readiness'),
  },
  T50: {
    area: 'Change',
    name: 'Transformation Programme Tracker',
    standard: 'PMI Standard for Program Management; MSP',
    purpose: 'Tracks milestones and benefits for a transformation programme.',
    ...schema('programme'),
  },
  T51: {
    area: 'Growth',
    name: 'Growth Opportunity Scoring',
    standard: 'RICE scoring; Ansoff matrix; McKinsey Three Horizons',
    purpose: 'Ranks growth opportunities and shows how effort is spread across the three horizons.',
    ...schema('rice'),
  },
  T52: {
    area: 'Growth',
    name: 'Growth Pathways',
    standard: 'Portfolio sequencing under capacity',
    purpose: 'Compares growth pathways and returns a sequenced portfolio that fits your capacity.',
    ...existing('growth-pathways'),
  },
  T53: {
    area: 'Growth',
    name: 'Growth Plan Feasibility',
    standard: 'Capacity-constrained roadmap; critical path',
    purpose:
      'Sequences the growth plan under capacity and dependencies and reports the critical path.',
    ...existing('roadmap'),
  },
  T54: {
    area: 'Growth',
    name: 'Modernisation Roadmap',
    standard: 'TOGAF ADM migration planning',
    purpose: 'Sequences modernisation work under capacity and dependencies.',
    ...existing('roadmap'),
  },
  T55: {
    area: 'Growth',
    name: 'Digital Maturity',
    standard: 'Digital maturity models (MIT CISR; TM Forum DMM)',
    purpose:
      'Assesses digital maturity across strategy, customer, operations, technology and people.',
    ...anchored('digitalMaturity'),
  },
  T56: {
    area: 'Finance',
    name: 'Financial Health Ratios',
    standard: 'Management accounts ratios',
    purpose:
      'Calculates margins, growth, burn, runway and revenue per head from your period figures.',
    ...existing('financial'),
  },
  T57: {
    area: 'Finance',
    name: 'Rolling Forecast & 13-Week Cash',
    standard: '13-week direct cash flow forecast; driver-based rolling forecast',
    purpose: 'Projects cash week by week for 13 weeks and revenue, cost and cash for 12 months.',
    ...schema('forecast'),
  },
  T58: {
    area: 'Finance',
    name: 'KPI Driver Tree',
    standard: 'DuPont analysis',
    purpose: 'Breaks return on equity into margin, turnover and leverage and shows which moved it.',
    ...schema('dupont'),
  },
  T59: {
    area: 'Finance',
    name: 'Cost & Spend Analysis',
    standard: 'Pareto (ABC) spend analysis',
    purpose:
      'Finds the few cost lines that make up most of the spend, and the ones growing fastest.',
    ...schema('spend'),
  },
  T60: {
    area: 'Finance',
    name: 'Business Valuation',
    standard: 'Discounted cash flow (income approach, IVS 105)',
    purpose: 'Values the business from your cash-flow forecast with a sensitivity range.',
    ...schema('dcf'),
  },
  T62: {
    area: 'Finance',
    name: 'Finance Function Maturity',
    standard: 'FP&A maturity models',
    purpose:
      'Assesses reporting, planning, analysis, partnering and systems in the finance function.',
    ...anchored('financeMaturity'),
  },
};

const ORDER = Object.keys(MAP);
const rank = { KEEP: 0, REBUILD: 1, MERGE: 2 };
// Where the first source code in registry order is a poor home for the tool.
const PRIMARY_OVERRIDE = { T31: 'A05' };

/** toolId → primary code (a KEEP code if there is one, else the first REBUILD, else the first MERGE). */
export const PRIMARY = {};
/** any original code → toolId, for codes that still run (KEEP, REBUILD, MERGE). */
export const CODE_TO_TOOL = {};
for (const [toolId] of Object.entries(TOOLS)) {
  const sources = ORDER.filter(
    (c) => MAP[c].target === toolId && rank[MAP[c].verdict] !== undefined,
  );
  sources.sort(
    (a, b) => rank[MAP[a].verdict] - rank[MAP[b].verdict] || ORDER.indexOf(a) - ORDER.indexOf(b),
  );
  if (!sources.length) throw new Error(`Tool ${toolId} has no source code`);
  PRIMARY[toolId] = PRIMARY_OVERRIDE[toolId] ?? sources[0];
  for (const c of sources) CODE_TO_TOOL[c] = toolId;
}
for (const [c, v] of Object.entries(MAP))
  if (rank[v.verdict] !== undefined) CODE_TO_TOOL[c] = v.target;

export const PRIMARY_CODES = Object.values(PRIMARY);

/** Which seat (home engine) each subject area belongs to. This sets the plan level a tool opens
 * at and the seat bundle that unlocks it — chosen per subject, replacing the old rule that
 * derived it from a code's series letter and old name. */
export const AREA_HOME_ENGINE = {
  Strategy: 'Clarity',
  Decisions: 'Clarity',
  Operations: 'Consistency',
  Risk: 'Consistency',
  Governance: 'Consistency',
  People: 'Capability',
  Change: 'Growth',
  Growth: 'Growth',
  Finance: 'Finance',
};
export const homeEngineFor = (toolId) => AREA_HOME_ENGINE[TOOLS[toolId].area];

/** What agent_manifests should hold for each catalog tool's primary code (synced at startup by
 * server/store.mjs, so the price list and seat bundles show the current tools). */
export const MANIFEST_SYNC = Object.entries(PRIMARY).map(([toolId, code]) => ({
  id: code.toLowerCase(),
  name: TOOLS[toolId].name,
  homeEngine: homeEngineFor(toolId),
}));
export const isPrimary = (code) => PRIMARY_CODES.includes(code);

/** What happened to an original code that no longer runs. */
export function retirement(code) {
  const m = MAP[code];
  if (!m || rank[m.verdict] !== undefined) return null;
  const replacedBy =
    m.target && TOOLS[m.target] ? { code: PRIMARY[m.target], name: TOOLS[m.target].name } : null;
  const reason = {
    VIEW: 'This was a summary of other results and is no longer a separate paid tool.',
    CONTENT: 'This was reference material and has moved to Resources.',
    RETIRE: 'This tool had no recognised method behind it and has been withdrawn.',
  }[m.verdict];
  return { verdict: m.verdict, reason, replacedBy };
}

/** Public input spec for the form. `existing` tools keep their original archetype's spec. */
export function inputSpecFor(toolId) {
  const t = TOOLS[toolId];
  if (t.engine === 'schema') {
    const impl = S[t.impl];
    return { kind: 'schema', fields: impl.fields, tables: impl.tables };
  }
  if (t.engine === 'anchored')
    return {
      kind: 'anchored',
      levels: LEVELS,
      evidence: EVIDENCE,
      sections: BANKS[t.bank].sections,
    };
  return { kind: t.kind };
}

/** computes/limits for schema and anchored tools; existing tools use the engine-layer disclosure. */
export function disclosureFor(toolId) {
  const t = TOOLS[toolId];
  if (t.engine === 'schema') return { computes: S[t.impl].computes, limits: S[t.impl].limits };
  if (t.engine === 'anchored')
    return {
      computes: `Scores your answers to ${BANKS[t.bank].sections.reduce((n, s) => n + s.questions.length, 0)} anchored questions based on ${t.standard}, by area and overall, counting unevidenced answers for less.`,
      limits:
        'It reflects the answers given; it is a structured self-assessment, not an audit or certification.',
    };
  return null;
}

/** Runs a schema or anchored tool. Existing-archetype tools are run by engines.mjs. */
export function runCatalogTool(toolId, input) {
  const t = TOOLS[toolId];
  const heading = `${t.name} (${t.standard})`;
  const impl = S[t.impl];
  const out =
    t.engine === 'anchored'
      ? runAnchored(BANKS[t.bank], heading, input)
      : impl.compute(parseSchemaInput(impl, input));
  assertFinite(out.summary);
  return out;
}
