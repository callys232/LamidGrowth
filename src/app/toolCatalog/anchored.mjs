/**
 * Anchored questionnaires — for the tools whose recognised method IS a structured assessment
 * (NIST CSF tiers, ISO 22316 attributes, maturity models). Unlike the old four-dimension
 * self-ratings, every question states what the bottom and top of the scale look like, so a "3"
 * means the same to everyone, and an answer without evidence counts for less than one with it.
 */
import { r1, mean, list, result, ToolInputError } from './schema.mjs';

export const LEVELS = [
  { value: 0, label: '0 — Not in place' },
  { value: 1, label: '1 — Ad hoc' },
  { value: 2, label: '2 — Developing' },
  { value: 3, label: '3 — Defined and consistent' },
  { value: 4, label: '4 — Measured and managed' },
  { value: 5, label: '5 — Continuously improved' },
];
export const EVIDENCE = [
  { value: 0, label: 'Opinion only' },
  { value: 1, label: 'Some evidence' },
  { value: 2, label: 'Documented evidence' },
];
const EVIDENCE_FACTOR = [0.8, 0.9, 1];
/** Share of questions that must be answered before an overall score and level are given. */
const MIN_COVERAGE = 0.8;

const q = (id, text, low, high) => ({ id, text, low, high });
const isRecord = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

export function runAnchored(spec, heading, input) {
  const answers = input?.answers ?? {};
  if (!isRecord(answers))
    throw new ToolInputError('Answers must be an object keyed by question id.');
  const known = new Set(spec.sections.flatMap((s) => s.questions.map((x) => x.id)));
  const unknown = Object.keys(answers).filter((k) => !known.has(k));
  if (unknown.length) throw new ToolInputError(`Unknown question id(s): ${unknown.join(', ')}.`);
  // A bare number or string used to be read as "unanswered" and silently dropped.
  for (const [id, a] of Object.entries(answers)) {
    if (a === null || a === undefined) continue;
    if (!isRecord(a) || Object.keys(a).some((k) => k !== 'level' && k !== 'evidence'))
      throw new ToolInputError(`Answer “${id}” must be { level, evidence }.`);
  }
  const unanswered = [];
  const sections = spec.sections.map((s) => {
    const scored = [];
    for (const x of s.questions) {
      const a = answers[x.id];
      const level = a?.level;
      if (level === undefined || level === null || level === '') {
        unanswered.push(x.text);
        continue;
      }
      const lv = Number(level);
      if (!Number.isInteger(lv) || lv < 0 || lv > 5)
        throw new ToolInputError(`“${x.text}”: level must be 0–5.`);
      const ev = Number(a.evidence ?? 0);
      if (!Number.isInteger(ev) || ev < 0 || ev > 2)
        throw new ToolInputError(`“${x.text}”: evidence must be 0, 1 or 2.`);
      scored.push({
        id: x.id,
        text: x.text,
        level: lv,
        evidence: ev,
        effective: lv * EVIDENCE_FACTOR[ev],
      });
    }
    return {
      id: s.id,
      label: s.label,
      answered: scored.length,
      of: s.questions.length,
      scorePct: scored.length ? r1((mean(scored.map((x) => x.effective)) / 5) * 100) : null,
      averageLevel: scored.length ? r1(mean(scored.map((x) => x.level))) : null,
      lowest: scored.length
        ? scored.reduce((a, b) => (b.effective < a.effective ? b : a)).text
        : null,
      unevidencedHighs: scored.filter((x) => x.level >= 4 && x.evidence === 0).map((x) => x.text),
    };
  });
  const scoredSections = sections.filter((s) => s.scorePct !== null);
  if (!scoredSections.length) throw new ToolInputError('Answer at least one question.');
  const weakest = [...scoredSections].sort((a, b) => a.scorePct - b.scorePct)[0];
  const warnings = [];
  const total = sections.reduce((n, s) => n + s.of, 0);
  // An overall conclusion needs most of the questionnaire and every area; otherwise only the
  // answered areas are reported, so one confident answer cannot stand for the whole organisation.
  const provisional =
    scoredSections.length < sections.length || (total - unanswered.length) / total < MIN_COVERAGE;
  const overall = provisional ? null : r1(mean(scoredSections.map((s) => s.scorePct)));
  // The level follows the evidence-adjusted score, so unevidenced 5s do not read as level 5.
  const level = overall === null ? null : Math.floor((overall / 100) * 5 + 1e-9);
  if (unanswered.length)
    warnings.push(
      `${unanswered.length} of ${total} questions unanswered; they are left out of the score, not counted as zero.`,
    );
  if (provisional)
    warnings.push(
      `Provisional: answer at least ${Math.round(MIN_COVERAGE * 100)}% of the questions, including some in every area, for an overall score and maturity level. Area scores below cover only the answers given.`,
    );
  const unev = sections.flatMap((s) => s.unevidencedHighs);
  if (unev.length)
    warnings.push(
      `Rated 4 or 5 with no evidence: ${list(unev, 4)}. These count for less until evidenced.`,
    );
  const summary = {
    provisional,
    overallPct: overall,
    maturityLevel: level,
    maturityLabel: level === null ? null : LEVELS[level].label.slice(4),
    weakestArea: weakest.label,
    // Evidence is what the respondent declared; no document was checked.
    evidenceBasis: 'self-reported',
    sections,
    unanswered,
  };
  const out = result(
    heading,
    summary,
    [
      provisional
        ? `Provisional: too few questions answered for an overall score. Weakest answered area: ${weakest.label}.`
        : `Overall ${overall}% (maturity level ${level}: ${summary.maturityLabel}). Weakest area: ${weakest.label}.`,
      ...sections.map(
        (s) =>
          `- ${s.label}: ${s.scorePct ?? '—'}% (${s.answered}/${s.of} answered)${s.lowest ? `; lowest: ${s.lowest}` : ''}.`,
      ),
    ],
    warnings,
  );
  return { ...out, status: provisional ? 'provisional' : 'completed', missingEvidence: unanswered };
}

/* ── Question banks ─────────────────────────────────────────────────────────────── */
export const BANKS = {
  purpose: {
    sections: [
      {
        id: 'statement',
        label: 'Purpose, vision and values',
        questions: [
          q(
            'p1',
            'A written purpose and vision exist and leaders describe them the same way',
            'Not written down, or every leader says something different',
            'Written, short, and every leader states it the same way unprompted',
          ),
          q(
            'p2',
            'Values are defined as behaviours people can observe',
            'Values are generic words on a wall',
            'Each value has examples of what it looks like and what breaks it',
          ),
        ],
      },
      {
        id: 'direction',
        label: 'Strategic direction',
        questions: [
          q(
            'p3',
            'There is a small set of strategic priorities for the next 1–3 years',
            'No priorities, or so many that everything is a priority',
            'Three to five priorities with measures, known across the organisation',
          ),
          q(
            'p4',
            'Leaders can say what the organisation will not do',
            'Every opportunity is pursued',
            'Explicit choices about where not to compete are written and respected',
          ),
        ],
      },
      {
        id: 'use',
        label: 'Used in decisions',
        questions: [
          q(
            'p5',
            'Major spending decisions are checked against the priorities',
            'Never referenced',
            'Every budget and investment paper shows which priority it serves',
          ),
          q(
            'p6',
            'Hiring and promotion reflect the stated values',
            'Values play no part',
            'Values are assessed in hiring and promotion with examples',
          ),
        ],
      },
    ],
  },
  dataQuality: {
    sections: [
      {
        id: 'accuracy',
        label: 'Accuracy and validity',
        questions: [
          q(
            'd1',
            'Data matches reality when spot-checked',
            'Errors are common and found by customers or auditors',
            'Regular sample checks show errors under 1%',
          ),
          q(
            'd2',
            'Entry rules stop invalid values',
            'Free text everywhere; no validation',
            'Validation at entry with defined formats and ranges',
          ),
        ],
      },
      {
        id: 'completeness',
        label: 'Completeness',
        questions: [
          q(
            'd3',
            'Required fields are filled in',
            'Key fields often blank',
            'Completeness measured and above 98% for key fields',
          ),
        ],
      },
      {
        id: 'timeliness',
        label: 'Timeliness',
        questions: [
          q(
            'd4',
            'Data is current enough for the decisions it supports',
            'Often weeks out of date',
            'Refresh frequency defined per use and monitored',
          ),
        ],
      },
      {
        id: 'consistency',
        label: 'Consistency',
        questions: [
          q(
            'd5',
            'The same fact has the same value in every system',
            'Different systems disagree; people argue about which is right',
            'One defined source of truth per fact, reconciled automatically',
          ),
        ],
      },
      {
        id: 'ownership',
        label: 'Ownership and definitions',
        questions: [
          q(
            'd6',
            'Each data set has a named owner',
            'No one owns it',
            'Named owner with accountability for quality',
          ),
          q(
            'd7',
            'Key terms have written definitions',
            'Each team defines terms differently',
            'Shared glossary used in reports and systems',
          ),
        ],
      },
    ],
  },
  culture: {
    sections: [
      {
        id: 'involvement',
        label: 'Involvement',
        questions: [
          q(
            'c1',
            'People have the authority to manage their own work',
            'Decisions are pushed upward',
            'Decisions made close to the work, within clear limits',
          ),
          q(
            'c2',
            'Teamwork across functions is normal',
            'Silos; cross-team work needs escalation',
            'Cross-functional work is the default way problems are solved',
          ),
        ],
      },
      {
        id: 'consistency',
        label: 'Consistency',
        questions: [
          q(
            'c3',
            'Leaders behave in line with the stated values',
            'Leaders’ behaviour contradicts the values',
            'Leaders model the values, including under pressure',
          ),
        ],
      },
      {
        id: 'adaptability',
        label: 'Adaptability',
        questions: [
          q(
            'c4',
            'Customer feedback changes how work is done',
            'Feedback is collected and ignored',
            'Feedback regularly leads to visible changes',
          ),
          q(
            'c5',
            'Mistakes are treated as learning',
            'Mistakes are hidden or punished',
            'Mistakes are discussed openly and lead to improvements',
          ),
        ],
      },
      {
        id: 'mission',
        label: 'Mission',
        questions: [
          q(
            'c6',
            'People understand how their work connects to the goals',
            'Most cannot explain the link',
            'Everyone can explain how their work serves the goals',
          ),
        ],
      },
      {
        id: 'safety',
        label: 'Psychological safety',
        questions: [
          q(
            'c7',
            'It is safe to raise problems or disagree with a manager',
            'People stay silent',
            'Disagreement is invited and acted on',
          ),
          q(
            'c8',
            'People can ask for help without it counting against them',
            'Asking for help is seen as weakness',
            'Asking for help is expected and quick',
          ),
        ],
      },
    ],
  },
  governance: {
    sections: [
      {
        id: 'purpose',
        label: 'Purpose and accountability (ISO 37000)',
        questions: [
          q(
            'g1',
            'The governing body sets and reviews purpose and strategy',
            'Board reviews reports only',
            'Board sets purpose, approves strategy and reviews it at least yearly',
          ),
          q(
            'g2',
            'Roles of the board, chair and executives are written down',
            'Unclear and overlapping',
            'Written terms of reference and delegations, reviewed regularly',
          ),
        ],
      },
      {
        id: 'oversight',
        label: 'Oversight',
        questions: [
          q(
            'g3',
            'The board receives timely, accurate information',
            'Late or incomplete papers',
            'Agreed board pack with key measures, risks and exceptions',
          ),
          q(
            'g4',
            'Risk and internal control are overseen by the board or a committee',
            'No structured oversight',
            'Committee with a risk appetite statement and regular reports',
          ),
        ],
      },
      {
        id: 'composition',
        label: 'Composition and independence',
        questions: [
          q(
            'g5',
            'The board has the skills and independence it needs',
            'Skills gaps; no independent members',
            'Skills matrix, independent members and regular evaluation',
          ),
          q(
            'g6',
            'Conflicts of interest are declared and managed',
            'No register',
            'Register maintained and conflicted members step out',
          ),
        ],
      },
      {
        id: 'stakeholders',
        label: 'Stakeholder engagement and transparency',
        questions: [
          q(
            'g7',
            'Stakeholders’ interests are considered and reported on',
            'Not considered',
            'Regular engagement and public reporting on how interests were weighed',
          ),
        ],
      },
    ],
  },
  cyber: {
    sections: [
      {
        id: 'govern',
        label: 'Govern',
        questions: [
          q(
            's1',
            'Cyber risk has an owner, a policy and board visibility',
            'Nobody owns it',
            'Named owner, policy, risk appetite and regular board reporting',
          ),
        ],
      },
      {
        id: 'identify',
        label: 'Identify',
        questions: [
          q(
            's2',
            'There is an up-to-date inventory of systems, data and suppliers',
            'No inventory',
            'Inventory maintained and used to set protection priorities',
          ),
          q(
            's3',
            'Cyber risks are assessed and recorded',
            'Not assessed',
            'Assessed at least yearly and on major change',
          ),
        ],
      },
      {
        id: 'protect',
        label: 'Protect',
        questions: [
          q(
            's4',
            'Multi-factor authentication protects email, remote access and admin accounts',
            'Passwords only',
            'MFA everywhere it matters, with exceptions tracked',
          ),
          q(
            's5',
            'Systems are patched and backed up',
            'Patching ad hoc; backups untested',
            'Patching within set times; backups offline and restore-tested',
          ),
          q(
            's6',
            'Staff receive security awareness training',
            'None',
            'Regular training and phishing exercises with results tracked',
          ),
        ],
      },
      {
        id: 'detect',
        label: 'Detect',
        questions: [
          q(
            's7',
            'Suspicious activity is monitored and alerts are acted on',
            'No monitoring',
            'Monitoring with defined response times',
          ),
        ],
      },
      {
        id: 'respond',
        label: 'Respond',
        questions: [
          q(
            's8',
            'There is a tested incident response plan',
            'No plan',
            'Plan with roles and contacts, exercised at least yearly',
          ),
        ],
      },
      {
        id: 'recover',
        label: 'Recover',
        questions: [
          q(
            's9',
            'Critical systems can be restored within agreed times',
            'Unknown',
            'Recovery times defined and proven in tests',
          ),
        ],
      },
    ],
  },
  ethics: {
    sections: [
      {
        id: 'policy',
        label: 'Standards',
        questions: [
          q(
            'e1',
            'A code of conduct exists and staff confirm they understand it',
            'No code',
            'Code in plain language, acknowledged yearly',
          ),
          q(
            'e2',
            'Anti-bribery controls cover gifts, hospitality and third parties (ISO 37001)',
            'None',
            'Policy, register and due diligence on higher-risk third parties',
          ),
        ],
      },
      {
        id: 'conflicts',
        label: 'Conflicts of interest',
        questions: [
          q(
            'e3',
            'Conflicts of interest are declared and managed',
            'No process',
            'Declared yearly and on change, reviewed by someone independent',
          ),
        ],
      },
      {
        id: 'speakup',
        label: 'Speak-up (ISO 37002)',
        questions: [
          q(
            'e4',
            'People can raise concerns confidentially, including anonymously',
            'No channel',
            'Independent channel, known to staff, with protection from retaliation',
          ),
          q(
            'e5',
            'Concerns raised are investigated and closed',
            'Not tracked',
            'Tracked to closure with themes reported to the board',
          ),
        ],
      },
      {
        id: 'leadership',
        label: 'Leadership and consequences',
        questions: [
          q(
            'e6',
            'Breaches lead to consistent consequences regardless of seniority',
            'Senior people are exempt',
            'Consistent outcomes, visible to staff',
          ),
        ],
      },
    ],
  },
  resilience: {
    sections: [
      {
        id: 'vision',
        label: 'Shared vision and purpose',
        questions: [
          q(
            'r1',
            'People know what must be protected first in a disruption',
            'No shared view',
            'Priorities agreed and communicated',
          ),
        ],
      },
      {
        id: 'awareness',
        label: 'Awareness of context',
        questions: [
          q(
            'r2',
            'Changes and threats in the environment are watched',
            'Surprised by events',
            'Regular horizon scanning feeds planning',
          ),
        ],
      },
      {
        id: 'leadership',
        label: 'Leadership',
        questions: [
          q(
            'r3',
            'Leaders can make fast decisions in a crisis',
            'Decisions stall in a crisis',
            'Crisis roles and delegations defined and practised',
          ),
        ],
      },
      {
        id: 'adaptive',
        label: 'Adaptive capacity',
        questions: [
          q(
            'r4',
            'The organisation has changed course quickly before and learned from it',
            'Change is slow and painful',
            'Rapid adaptation is routine and reviewed afterwards',
          ),
          q(
            'r5',
            'Lessons from incidents change how things are done',
            'Lessons not captured',
            'Post-incident reviews lead to tracked improvements',
          ),
        ],
      },
      {
        id: 'redundancy',
        label: 'Resources and redundancy',
        questions: [
          q(
            'r6',
            'There is spare capacity or alternatives for critical resources',
            'Single points of failure everywhere',
            'Alternatives for critical people, suppliers and systems',
          ),
          q(
            'r7',
            'Financial reserves could absorb a serious shock',
            'Weeks of cash',
            'Reserves and facilities sized against stress scenarios',
          ),
        ],
      },
    ],
  },
  digitalMaturity: {
    sections: [
      {
        id: 'strategy',
        label: 'Strategy',
        questions: [
          q(
            'dm1',
            'Digital is built into the business strategy',
            'Separate IT wish list',
            'Strategy sets digital outcomes with funding and owners',
          ),
        ],
      },
      {
        id: 'customer',
        label: 'Customer',
        questions: [
          q(
            'dm2',
            'Customers can do what they need online',
            'Mostly manual or paper',
            'End-to-end digital journeys, measured and improved',
          ),
        ],
      },
      {
        id: 'operations',
        label: 'Operations',
        questions: [
          q(
            'dm3',
            'Core processes are automated and connected',
            'Re-keying between systems',
            'Integrated, automated processes with data flowing end to end',
          ),
        ],
      },
      {
        id: 'technology',
        label: 'Technology and data',
        questions: [
          q(
            'dm4',
            'Systems are modern enough to change quickly',
            'Legacy systems block change',
            'Modular systems; changes released frequently and safely',
          ),
          q(
            'dm5',
            'Data is used to make decisions',
            'Gut feel',
            'Shared dashboards drive regular decisions',
          ),
        ],
      },
      {
        id: 'culture',
        label: 'People and culture',
        questions: [
          q(
            'dm6',
            'Staff have the digital skills their roles need',
            'Major gaps',
            'Skills assessed and developed continuously',
          ),
        ],
      },
    ],
  },
  financeMaturity: {
    sections: [
      {
        id: 'reporting',
        label: 'Reporting',
        questions: [
          q(
            'f1',
            'Monthly accounts are closed quickly and accurately',
            'Over 20 working days, often restated',
            'Closed within 5 working days, rarely adjusted',
          ),
          q(
            'f2',
            'Management reports show measures that drive decisions',
            'Lists of numbers',
            'Focused reports with commentary on variances and actions',
          ),
        ],
      },
      {
        id: 'planning',
        label: 'Planning and forecasting',
        questions: [
          q(
            'f3',
            'Forecasts are updated regularly and are reasonably accurate',
            'Annual budget only',
            'Rolling forecast updated monthly; accuracy tracked',
          ),
        ],
      },
      {
        id: 'analysis',
        label: 'Analysis',
        questions: [
          q(
            'f4',
            'Finance explains why results changed, not just what changed',
            'No analysis',
            'Driver-based analysis of every material variance',
          ),
        ],
      },
      {
        id: 'partnering',
        label: 'Business partnering',
        questions: [
          q(
            'f5',
            'Finance is involved in decisions before they are made',
            'Informed afterwards',
            'Finance partners sit in key decisions and model options',
          ),
        ],
      },
      {
        id: 'systems',
        label: 'Systems and data',
        questions: [
          q(
            'f6',
            'Finance systems reduce manual work',
            'Spreadsheets everywhere',
            'Integrated systems; manual work limited to exceptions',
          ),
        ],
      },
    ],
  },
  operatingModel: {
    sections: [
      {
        id: 'structure',
        label: 'Structure',
        questions: [
          q(
            'o1',
            'The structure fits how value is delivered to customers',
            'Structure reflects history, not strategy',
            'Structure designed around customer journeys or value streams',
          ),
        ],
      },
      {
        id: 'decisions',
        label: 'Decision rights',
        questions: [
          q(
            'o2',
            'It is clear who decides what, at which level',
            'Frequent escalation and confusion',
            'Written decision rights followed in practice',
          ),
        ],
      },
      {
        id: 'processes',
        label: 'Processes',
        questions: [
          q(
            'o3',
            'Core processes are defined, owned and measured',
            'Each team does it its own way',
            'Standard processes with owners and measures',
          ),
        ],
      },
      {
        id: 'people',
        label: 'People and capabilities',
        questions: [
          q(
            'o4',
            'The organisation has the capabilities the strategy needs',
            'Major gaps not addressed',
            'Capability plan tied to strategy and funded',
          ),
        ],
      },
      {
        id: 'rewards',
        label: 'Measures and rewards',
        questions: [
          q(
            'o5',
            'Targets and rewards encourage the behaviour the strategy needs',
            'Incentives work against the strategy',
            'Measures and rewards aligned to strategic outcomes',
          ),
        ],
      },
      {
        id: 'systems',
        label: 'Systems and information',
        questions: [
          q(
            'o6',
            'Information reaches the people who need it, when they need it',
            'People chase information',
            'Shared, timely information supports each role',
          ),
        ],
      },
    ],
  },
};
