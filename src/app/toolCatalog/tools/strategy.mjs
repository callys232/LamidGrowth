import { F, dict, r1, sum, pct, days, today, list, result, ToolInputError } from '../schema.mjs';

/* T02 — Strategy Alignment Matrix (Hoshin Kanri X-matrix; McKinsey 7-S) */
export const alignment = {
  fields: [],
  tables: [
    {
      key: 'objectives',
      label: 'Objectives',
      hint: 'what the organisation is trying to achieve this period',
      minRows: 1,
      columns: [
        F.text('name', 'Objective', { required: true }),
        F.scale('weight', 'Importance (1–3)', 1, 3, { default: 2 }),
      ],
    },
    {
      key: 'initiatives',
      label: 'Initiatives',
      hint: 'the work and spend actually under way',
      minRows: 1,
      columns: [
        F.text('name', 'Initiative', { required: true }),
        F.text('objective', 'Serves objective (exact name; separate several with ;)'),
        F.num('budget', 'Budget or effort', { min: 0, default: 0 }),
        F.select('status', 'Status', ['active', 'planned', 'paused'], { default: 'active' }),
      ],
    },
  ],
  compute({ objectives, initiatives }) {
    const warnings = [];
    const key = (s) => s.trim().toLowerCase();
    const objByKey = new Map(
      objectives.map((o) => [key(o.name), { ...o, budget: 0, initiatives: [] }]),
    );
    const orphans = [];
    const unknownRefs = new Set();
    for (const ini of initiatives) {
      if (ini.status === 'paused') continue;
      const refs = (ini.objective ?? '')
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean);
      const matched = refs.map((r) => objByKey.get(key(r))).filter(Boolean);
      refs.filter((r) => !objByKey.has(key(r))).forEach((r) => unknownRefs.add(r));
      if (!matched.length) {
        orphans.push(ini.name);
        continue;
      }
      const share = (ini.budget ?? 0) / matched.length;
      for (const o of matched) {
        o.budget += share;
        o.initiatives.push(ini.name);
      }
    }
    if (unknownRefs.size)
      warnings.push(
        `These objective names did not match any listed objective: ${[...unknownRefs].join(', ')}.`,
      );
    const objs = [...objByKey.values()];
    const totalWeight = sum(objs.map((o) => o.weight ?? 2));
    const linkedBudget = sum(objs.map((o) => o.budget));
    const orphanBudget = sum(
      initiatives.filter((i) => orphans.includes(i.name)).map((i) => i.budget ?? 0),
    );
    const rows = objs.map((o) => {
      const weightShare = pct(o.weight ?? 2, totalWeight);
      const budgetShare = pct(o.budget, linkedBudget);
      return {
        objective: o.name,
        weightSharePct: weightShare,
        budgetSharePct: budgetShare,
        gapPts: r1(budgetShare - weightShare),
        initiatives: o.initiatives,
      };
    });
    const unfunded = rows.filter((r) => r.initiatives.length === 0).map((r) => r.objective);
    const misallocationPct = r1(sum(rows.map((r) => Math.abs(r.gapPts))) / 2);
    const totalBudget = linkedBudget + orphanBudget;
    const summary = {
      objectives: rows,
      orphanInitiatives: orphans,
      unfundedObjectives: unfunded,
      orphanSpendPct: pct(orphanBudget, totalBudget),
      misallocationPct,
      alignmentPct: r1(Math.max(0, 100 - misallocationPct - pct(orphanBudget, totalBudget))),
    };
    if (unfunded.length) warnings.push(`No active initiative serves: ${unfunded.join(', ')}.`);
    if (orphans.length) warnings.push(`${orphans.length} initiative(s) serve no listed objective.`);
    return result(
      'Strategy Alignment Matrix — Hoshin Kanri X-matrix method',
      summary,
      [
        `Alignment ${summary.alignmentPct}% (spend misallocated against importance: ${misallocationPct}%; spend on initiatives with no objective: ${summary.orphanSpendPct}%).`,
        ...rows.map(
          (r) =>
            `- ${r.objective}: importance ${r.weightSharePct}% vs spend ${r.budgetSharePct}% (${r.gapPts >= 0 ? '+' : ''}${r.gapPts} pts); initiatives: ${list(r.initiatives, 5)}.`,
        ),
        `Initiatives serving no objective: ${list(orphans)}.`,
        `Objectives with no initiative: ${list(unfunded)}.`,
      ],
      warnings,
    );
  },
  computes:
    'Links your objectives to the initiatives and spend under way, and compares each objective’s share of spend with its share of importance.',
  limits:
    'It works only from the objectives, initiatives and figures you list; it does not judge whether the objectives themselves are right.',
};

/* T04 — OKR & Strategy Execution Review */
export const okr = {
  fields: [
    F.date('periodStart', 'Period start', { required: true }),
    F.date('periodEnd', 'Period end', { required: true }),
    F.date('asOf', 'Progress as of (defaults to today)'),
  ],
  tables: [
    {
      key: 'keyResults',
      label: 'Key results',
      minRows: 1,
      columns: [
        F.text('objective', 'Objective', { required: true }),
        F.text('keyResult', 'Key result', { required: true }),
        F.num('start', 'Start value', { required: true }),
        F.num('target', 'Target value', { required: true }),
        F.num('current', 'Current value', { required: true }),
        F.text('owner', 'Owner'),
      ],
    },
  ],
  compute({ periodStart, periodEnd, asOf, keyResults }) {
    const warnings = [];
    const at = asOf ?? today();
    const span = days(periodStart, periodEnd);
    if (span <= 0) throw new ToolInputError('Period end must be after period start.');
    const elapsed = Math.min(1, Math.max(0, days(periodStart, at) / span));
    const krs = keyResults.map((k) => {
      const range = k.target - k.start;
      const progress =
        range === 0 ? (k.current === k.target ? 1 : 0) : (k.current - k.start) / range;
      const p = Math.max(0, Math.min(1.5, progress));
      const status =
        p >= 1
          ? 'achieved'
          : p >= elapsed - 0.1
            ? 'on track'
            : p >= elapsed - 0.3
              ? 'at risk'
              : 'off track';
      if (!k.owner) warnings.push(`“${k.keyResult}” has no owner.`);
      return { ...k, progressPct: r1(p * 100), status };
    });
    const byObjective = dict();
    for (const k of krs) (byObjective[k.objective] ??= []).push(k);
    const objectives = Object.entries(byObjective).map(([objective, ks]) => ({
      objective,
      progressPct: r1(sum(ks.map((k) => Math.min(100, k.progressPct))) / ks.length),
      keyResults: ks.length,
      offTrack: ks.filter((k) => k.status === 'off track').length,
    }));
    const summary = {
      timeElapsedPct: r1(elapsed * 100),
      objectives,
      keyResults: krs,
      counts: ['achieved', 'on track', 'at risk', 'off track'].reduce(
        (a, s) => ({ ...a, [s]: krs.filter((k) => k.status === s).length }),
        {},
      ),
    };
    const behind = krs.filter((k) => k.status === 'off track' || k.status === 'at risk');
    if (behind.length)
      warnings.push(`${behind.length} key result(s) are behind the pace the period requires.`);
    return result(
      'OKR & Strategy Execution Review — OKR method with Balanced Scorecard style review',
      summary,
      [
        `${summary.timeElapsedPct}% of the period has elapsed as of ${at}.`,
        ...objectives.map(
          (o) =>
            `- ${o.objective}: ${o.progressPct}% average progress across ${o.keyResults} key result(s), ${o.offTrack} off track.`,
        ),
        ...krs.map(
          (k) =>
            `  · ${k.keyResult} (${k.owner || 'no owner'}): ${k.current} of target ${k.target} from ${k.start} → ${k.progressPct}% — ${k.status}.`,
        ),
      ],
      warnings,
    );
  },
  computes:
    'Progress of each key result from its start value toward its target, compared with how much of the period has passed, rolled up by objective.',
  limits:
    'Values are what you enter; it does not pull figures from other systems or judge whether targets are ambitious enough.',
};

/* T05 — External Environment Scan (PESTLE; Porter’s Five Forces) */
const PESTLE = ['Political', 'Economic', 'Social', 'Technological', 'Legal', 'Environmental'];
const FORCES = [
  'Competitive rivalry',
  'Threat of new entrants',
  'Threat of substitutes',
  'Buyer power',
  'Supplier power',
];
export const pestle = {
  fields: [],
  tables: [
    {
      key: 'factors',
      label: 'External factors',
      minRows: 1,
      columns: [
        F.select('category', 'Heading', [...PESTLE, ...FORCES], { required: true }),
        F.text('factor', 'Factor', { required: true }),
        F.select('direction', 'Opportunity or threat', ['opportunity', 'threat'], {
          required: true,
        }),
        F.scale('impact', 'Impact (1–5)', 1, 5, { required: true }),
        F.scale('likelihood', 'Likelihood (1–5)', 1, 5, { required: true }),
        F.text('owner', 'Response owner'),
      ],
    },
  ],
  compute({ factors }) {
    const warnings = [];
    const scored = factors
      .map((f) => ({ ...f, score: f.impact * f.likelihood }))
      .sort((a, b) => b.score - a.score);
    const covered = new Set(scored.map((f) => f.category));
    const missingPestle = PESTLE.filter((c) => !covered.has(c));
    const missingForces = FORCES.filter((c) => !covered.has(c));
    const unownedThreats = scored.filter(
      (f) => f.direction === 'threat' && f.score >= 12 && !f.owner,
    );
    if (missingPestle.length) warnings.push(`No factor listed under: ${missingPestle.join(', ')}.`);
    if (unownedThreats.length)
      warnings.push(`${unownedThreats.length} significant threat(s) have no response owner.`);
    const summary = {
      ranked: scored,
      missingPestleHeadings: missingPestle,
      missingForces,
      significantThreats: scored
        .filter((f) => f.direction === 'threat' && f.score >= 12)
        .map((f) => f.factor),
      significantOpportunities: scored
        .filter((f) => f.direction === 'opportunity' && f.score >= 12)
        .map((f) => f.factor),
    };
    return result(
      'External Environment Scan — PESTLE and Porter’s Five Forces',
      summary,
      [
        'Factors ranked by impact × likelihood (max 25; 12+ treated as significant):',
        ...scored.map(
          (f) =>
            `- [${f.category}] ${f.factor}: ${f.direction}, score ${f.score}${f.owner ? `, owner ${f.owner}` : ', no owner'}.`,
        ),
        `Headings with nothing listed: ${list([...missingPestle, ...missingForces])}.`,
      ],
      warnings,
    );
  },
  computes:
    'Ranks the external factors you list by impact × likelihood and checks every PESTLE heading and competitive force was considered.',
  limits: 'It does not research the market; factors and ratings are yours.',
};
