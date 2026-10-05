import {
  dict,
  F,
  r1,
  r2,
  sum,
  mean,
  stdev,
  median,
  pct,
  days,
  today,
  money,
  list,
  result,
  ToolInputError,
} from '../schema.mjs';

/* T06 — Delivery Flow Metrics (Kanban flow metrics; Little’s Law) */
export const flow = {
  fields: [F.int('periodDays', 'Days in each period', { default: 7, min: 1 })],
  tables: [
    {
      key: 'periods',
      label: 'Periods',
      hint: 'one row per week or sprint, oldest first',
      minRows: 3,
      columns: [
        F.text('label', 'Period', { required: true }),
        F.num('throughput', 'Items finished', { required: true, min: 0 }),
        F.num('cycleTimeDays', 'Average cycle time (days)', { required: true, min: 0 }),
        F.num('wip', 'Average work in progress', { required: true, min: 0 }),
        F.num('activeDays', 'Average days actively worked per item', { min: 0 }),
      ],
    },
  ],
  compute({ periodDays, periods }) {
    const warnings = [];
    const tp = periods.map((p) => p.throughput);
    const ct = periods.map((p) => p.cycleTimeDays);
    const meanTp = mean(tp);
    const cv = meanTp ? stdev(tp) / meanTp : 0;
    const half = Math.floor(periods.length / 2);
    const ctEarly = mean(ct.slice(0, half));
    const ctLate = mean(ct.slice(-half));
    const littles = periods.map((p) => {
      const perDay = p.throughput / periodDays;
      return perDay > 0 ? p.wip / perDay : null;
    });
    const gaps = periods
      .map((p, i) => ({ label: p.label, reported: p.cycleTimeDays, implied: littles[i] }))
      .filter(
        (g) =>
          g.implied !== null &&
          g.reported > 0 &&
          Math.abs(g.implied - g.reported) / g.reported > 0.3,
      );
    if (gaps.length)
      warnings.push(
        `Little’s Law does not hold in ${gaps.length} period(s): the cycle time implied by WIP ÷ throughput differs from the reported figure by over 30%. The data may be inconsistent or WIP is not stable.`,
      );
    periods.forEach((p, i) => {
      if (p.activeDays != null && p.activeDays > p.cycleTimeDays)
        throw new ToolInputError(
          `Periods, row ${i + 1}: active days (${p.activeDays}) cannot exceed the cycle time (${p.cycleTimeDays} days); active time is part of the cycle.`,
        );
    });
    const eff = periods.filter((p) => p.activeDays != null && p.cycleTimeDays > 0);
    const flowEfficiencyPct = eff.length
      ? r1(mean(eff.map((p) => p.activeDays / p.cycleTimeDays)) * 100)
      : null;
    const predictability = cv < 0.2 ? 'high' : cv < 0.4 ? 'moderate' : 'low';
    if (predictability === 'low')
      warnings.push(
        'Throughput varies a lot from period to period, so delivery dates are hard to forecast.',
      );
    if (ctLate > ctEarly * 1.2)
      warnings.push(
        'Cycle time has risen by more than 20% between the first and second half of the periods.',
      );
    const summary = {
      meanThroughput: r1(meanTp),
      throughputVariationPct: r1(cv * 100),
      predictability,
      meanCycleTimeDays: r1(mean(ct)),
      cycleTimeTrendPct: ctEarly ? r1(((ctLate - ctEarly) / ctEarly) * 100) : 0,
      meanWip: r1(mean(periods.map((p) => p.wip))),
      flowEfficiencyPct,
      littlesLawGaps: gaps.map((g) => ({ ...g, implied: r1(g.implied) })),
    };
    return result(
      'Delivery Flow Metrics — Kanban flow metrics and Little’s Law',
      summary,
      [
        `Throughput averages ${summary.meanThroughput} items per ${periodDays}-day period (variation ${summary.throughputVariationPct}%, predictability ${predictability}).`,
        `Cycle time averages ${summary.meanCycleTimeDays} days and changed ${summary.cycleTimeTrendPct}% from the first to the second half.`,
        `Average work in progress: ${summary.meanWip}.`,
        flowEfficiencyPct !== null
          ? `Flow efficiency (active time ÷ cycle time): ${flowEfficiencyPct}%. Most knowledge work runs at 15–40%; the rest is waiting.`
          : 'Flow efficiency not calculated (no active-time data).',
      ],
      warnings,
    );
  },
  computes:
    'Throughput, cycle time, work in progress, predictability and flow efficiency, with a Little’s Law consistency check.',
  limits: 'Reads only the period figures you enter; it is not connected to your task tools.',
};

/* T07 — Drift & Stability Monitor (XmR control chart; Western Electric / Nelson rules) */
export const spc = {
  fields: [
    F.text('metric', 'Metric', { required: true }),
    F.select('betterWhen', 'Better when', ['higher', 'lower', 'closer to target'], {
      default: 'higher',
    }),
    F.num('target', 'Target (optional)'),
  ],
  tables: [
    {
      key: 'values',
      label: 'Values',
      hint: 'at least 8 points, oldest first',
      minRows: 8,
      columns: [F.text('label', 'Period'), F.num('value', 'Value', { required: true })],
    },
  ],
  compute({ metric, betterWhen, target, values }) {
    const xs = values.map((v) => v.value);
    const labels = values.map((v, i) => v.label || `#${i + 1}`);
    const centre = mean(xs);
    const mrs = xs.slice(1).map((x, i) => Math.abs(x - xs[i]));
    const mrBar = mean(mrs);
    const sigma = mrBar / 1.128;
    const ucl = centre + 2.66 * mrBar;
    const lcl = centre - 2.66 * mrBar;
    const signals = [];
    xs.forEach((x, i) => {
      if (x > ucl || x < lcl)
        signals.push({
          rule: 'Point outside control limits',
          at: labels[i],
          index: i,
          side: x > ucl ? 'above' : 'below',
        });
    });
    const side = (x) => (x > centre ? 1 : x < centre ? -1 : 0);
    for (let i = 7; i < xs.length; i++) {
      const s = xs.slice(i - 7, i + 1).map(side);
      if (s.every((v) => v === 1) || s.every((v) => v === -1))
        signals.push({
          rule: '8 points in a row on one side of the centre line',
          at: labels[i],
          index: i,
          side: s[0] === 1 ? 'above' : 'below',
        });
    }
    for (let i = 2; i < xs.length; i++) {
      for (const dir of [1, -1]) {
        const beyond = xs.slice(i - 2, i + 1).filter((x) => dir * (x - centre) > 2 * sigma).length;
        if (beyond >= 2)
          signals.push({
            rule: '2 of 3 points beyond 2σ on one side',
            at: labels[i],
            index: i,
            side: dir === 1 ? 'above' : 'below',
          });
      }
    }
    for (let i = 4; i < xs.length; i++) {
      for (const dir of [1, -1]) {
        const beyond = xs.slice(i - 4, i + 1).filter((x) => dir * (x - centre) > sigma).length;
        if (beyond >= 4)
          signals.push({
            rule: '4 of 5 points beyond 1σ on one side',
            at: labels[i],
            index: i,
            side: dir === 1 ? 'above' : 'below',
          });
      }
    }
    for (let i = 5; i < xs.length; i++) {
      const w = xs.slice(i - 5, i + 1);
      const up = w.every((x, j) => j === 0 || x > w[j - 1]);
      const down = w.every((x, j) => j === 0 || x < w[j - 1]);
      if (up || down)
        signals.push({
          rule: '6 points steadily rising or falling',
          at: labels[i],
          index: i,
          side: up ? 'above' : 'below',
        });
    }
    const seen = new Set();
    const unique = signals.filter((s) => {
      const k = `${s.rule}|${s.index}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    // Recency comes from the observation's position: labels can repeat (e.g. every row "Week").
    const recent = unique.filter((s) => s.index >= xs.length - 4);
    const good = (s) =>
      betterWhen === 'higher'
        ? s.side === 'above'
        : betterWhen === 'lower'
          ? s.side === 'below'
          : false;
    const verdict =
      unique.length === 0
        ? 'stable'
        : recent.length
          ? recent.every(good)
            ? 'improving shift'
            : 'drifting'
          : 'had past instability';
    const warnings = [];
    if (verdict === 'drifting')
      warnings.push(
        `${metric} is drifting in the wrong direction in the latest points. Investigate what changed.`,
      );
    if (unique.length === 0)
      warnings.push(
        'No special-cause signals: the variation is routine. Reacting to individual ups and downs will not help; changing the process will.',
      );
    const summary = {
      centreLine: r2(centre),
      upperControlLimit: r2(ucl),
      lowerControlLimit: r2(lcl),
      sigma: r2(sigma),
      signals: unique,
      verdict,
      targetInsideLimits: target == null ? null : target >= lcl && target <= ucl,
    };
    if (target != null && !summary.targetInsideLimits)
      warnings.push(
        `The target (${target}) is outside what the current process produces (${r2(lcl)} to ${r2(ucl)}). Meeting it needs a process change, not more effort.`,
      );
    return result(
      'Drift & Stability Monitor — XmR control chart with Western Electric and Nelson rules',
      summary,
      [
        `${metric}: centre line ${summary.centreLine}, natural process limits ${summary.lowerControlLimit} to ${summary.upperControlLimit}.`,
        `Verdict: ${verdict}. Signals found: ${unique.length}.`,
        ...unique.map((s) => `- ${s.rule} at ${s.at} (${s.side} centre).`),
      ],
      warnings,
    );
  },
  computes:
    'Natural process limits for any metric and the standard control-chart rules that separate real drift from routine variation.',
  limits: 'Reads only the values you enter; it detects that something changed, not why.',
};

/* T08 — Cross-Team Dependency Board */
export const dependencies = {
  fields: [F.date('asOf', 'As of (defaults to today)')],
  tables: [
    {
      key: 'dependencies',
      label: 'Dependencies',
      minRows: 1,
      columns: [
        F.text('item', 'What is needed', { required: true }),
        F.text('from', 'Provided by (team)', { required: true }),
        F.text('to', 'Needed by (team)', { required: true }),
        F.date('neededBy', 'Needed by date', { required: true }),
        F.date('delivered', 'Delivered on'),
        F.bool('critical', 'Blocks a critical deliverable'),
      ],
    },
  ],
  compute({ asOf, dependencies: deps }) {
    const at = asOf ?? today();
    const rows = deps.map((d) => {
      const lateBy = d.delivered ? days(d.neededBy, d.delivered) : days(d.neededBy, at);
      const state = d.delivered
        ? lateBy > 0
          ? 'delivered late'
          : 'delivered on time'
        : lateBy > 0
          ? 'overdue'
          : 'open';
      return { ...d, state, daysLate: Math.max(0, lateBy) };
    });
    const teams = dict();
    for (const r of rows) {
      const t = (teams[r.from] ??= { team: r.from, provided: 0, late: 0, overdue: 0 });
      t.provided++;
      if (r.state === 'delivered late') t.late++;
      if (r.state === 'overdue') t.overdue++;
    }
    const teamRows = Object.values(teams)
      .map((t) => ({ ...t, lateRatePct: pct(t.late + t.overdue, t.provided) }))
      .sort((a, b) => b.lateRatePct - a.lateRatePct);
    const overdue = rows.filter((r) => r.state === 'overdue');
    const criticalOverdue = overdue.filter((r) => r.critical);
    const warnings = [];
    if (criticalOverdue.length)
      warnings.push(
        `${criticalOverdue.length} critical dependency(ies) are overdue: ${list(criticalOverdue.map((r) => r.item))}.`,
      );
    const summary = {
      total: rows.length,
      overdue: overdue.length,
      criticalOverdue: criticalOverdue.map((r) => ({
        item: r.item,
        from: r.from,
        to: r.to,
        daysLate: r.daysLate,
      })),
      onTimeRatePct: pct(
        rows.filter((r) => r.state === 'delivered on time').length,
        rows.filter((r) => r.delivered).length,
      ),
      byProvidingTeam: teamRows,
    };
    return result(
      'Cross-Team Dependency Board — dependency tracking between teams',
      summary,
      [
        `${rows.length} dependencies as of ${at}: ${overdue.length} overdue, on-time delivery ${summary.onTimeRatePct}% of those delivered.`,
        ...teamRows.map(
          (t) => `- ${t.team} provides ${t.provided}; late or overdue ${t.lateRatePct}%.`,
        ),
        ...overdue.map(
          (r) =>
            `  · Overdue: ${r.item} (${r.from} → ${r.to}), ${r.daysLate} days${r.critical ? ', critical' : ''}.`,
        ),
      ],
      warnings,
    );
  },
  computes:
    'Which dependencies between teams are late or overdue, and which providing teams are most often late.',
  limits: 'Works from the dependencies and dates you record; it does not read project tools.',
};

/* T09 — Workload & Capacity Balance */
export const capacity = {
  fields: [F.text('unit', 'Unit of measure', { default: 'hours per week' })],
  tables: [
    {
      key: 'teams',
      label: 'Teams or people',
      minRows: 1,
      columns: [
        F.text('name', 'Team or person', { required: true }),
        F.num('capacity', 'Available capacity', { required: true, min: 0 }),
        F.num('demand', 'Work demanded', { required: true, min: 0 }),
      ],
    },
  ],
  compute({ unit, teams }) {
    const rows = teams.map((t) => {
      const u = t.capacity ? t.demand / t.capacity : t.demand > 0 ? Infinity : 0;
      const state =
        u > 1 ? 'overloaded' : u >= 0.85 ? 'at the limit' : u >= 0.6 ? 'healthy' : 'underused';
      return {
        ...t,
        utilisationPct: Number.isFinite(u) ? r1(u * 100) : null,
        state,
        gap: r1(t.capacity - t.demand),
      };
    });
    const over = rows.filter((r) => r.state === 'overloaded').sort((a, b) => a.gap - b.gap);
    const spare = rows
      .filter((r) => r.state === 'underused' || r.state === 'healthy')
      .map((r) => ({ ...r, give: Math.max(0, r.capacity * 0.8 - r.demand) }));
    const moves = [];
    for (const o of over) {
      let need = o.demand - o.capacity * 0.85;
      for (const s of spare.sort((a, b) => b.give - a.give)) {
        if (need <= 0) break;
        const amount = Math.min(need, s.give);
        if (amount <= 0) continue;
        moves.push({ from: o.name, to: s.name, amount: r1(amount) });
        s.give -= amount;
        need -= amount;
      }
    }
    const totalCap = sum(rows.map((r) => r.capacity));
    const totalDem = sum(rows.map((r) => r.demand));
    const warnings = [];
    if (totalDem > totalCap * 0.85)
      warnings.push(
        'Total demand is above 85% of total capacity. Rebalancing will not be enough; reduce or reschedule work.',
      );
    if (over.length)
      warnings.push(
        `Overloaded: ${list(over.map((o) => o.name))}. Sustained utilisation above 85% makes queues and delays grow sharply.`,
      );
    const summary = {
      teams: rows,
      overallUtilisationPct: pct(totalDem, totalCap),
      suggestedMoves: moves,
    };
    return result(
      'Workload & Capacity Balance — capacity utilisation with an 85% ceiling',
      summary,
      [
        `Overall utilisation ${summary.overallUtilisationPct}% (${r1(totalDem)} of ${r1(totalCap)} ${unit}).`,
        ...rows.map((r) => `- ${r.name}: ${r.utilisationPct ?? '—'}% (${r.state}).`),
        moves.length
          ? 'Suggested moves to bring overloaded teams to 85%:'
          : 'No rebalancing moves available from spare capacity.',
        ...moves.map(
          (m) =>
            `  · Move ${m.amount} ${unit} of work from ${m.from} to ${m.to}, if the skills allow.`,
        ),
      ],
      warnings,
    );
  },
  computes:
    'Utilisation of each team or person against an 85% safe ceiling, and where spare capacity could absorb overload.',
  limits: 'It does not know whether skills transfer between teams; check each suggested move.',
};

/* T11 — Root Cause Analysis (5 Whys; Ishikawa; Kepner-Tregoe problem analysis) */
const CATEGORIES = [
  'People',
  'Process',
  'Tools and equipment',
  'Materials and inputs',
  'Environment',
  'Measurement',
];
export const rootCause = {
  fields: [
    F.long('problem', 'Problem statement (what, where, when, how big)', { required: true }),
    F.long('isNot', 'Where or when it does NOT happen (optional, sharpens the analysis)'),
  ],
  tables: [
    {
      key: 'causes',
      label: 'Causes',
      hint: 'each cause, and which cause it explains',
      minRows: 1,
      columns: [
        F.text('cause', 'Cause', { required: true }),
        F.text('explains', 'Explains (cause above it; blank if it directly causes the problem)'),
        F.select('category', 'Category', CATEGORIES, { required: true }),
        F.select('evidence', 'Evidence', ['none', 'some', 'strong'], { default: 'none' }),
        F.select(
          'fitsFacts',
          'Explains both where it happens and where it does not',
          ['yes', 'partly', 'no', 'not checked'],
          { default: 'not checked' },
        ),
      ],
    },
  ],
  compute({ problem, isNot, causes }) {
    const warnings = [];
    const byName = new Map(causes.map((c) => [c.cause.toLowerCase(), c]));
    const children = new Map();
    for (const c of causes) {
      const parent = c.explains ? c.explains.toLowerCase() : '__problem__';
      if (c.explains && !byName.has(parent))
        warnings.push(`“${c.cause}” explains “${c.explains}”, which is not listed as a cause.`);
      (children.get(parent) ?? children.set(parent, []).get(parent)).push(c);
    }
    const chains = [];
    const walk = (node, path, seen) => {
      const kids = children.get(node.cause.toLowerCase()) ?? [];
      if (!kids.length || seen.has(node.cause)) chains.push([...path, node]);
      else kids.forEach((k) => walk(k, [...path, node], new Set([...seen, node.cause])));
    };
    (children.get('__problem__') ?? []).forEach((c) => walk(c, [], new Set()));
    const ev = { none: 0, some: 1, strong: 2 };
    const fit = { yes: 2, partly: 1, 'not checked': 0.5, no: 0 };
    const roots = chains
      .map((chain) => {
        const leaf = chain[chain.length - 1];
        return {
          chain: chain.map((c) => c.cause),
          depth: chain.length,
          root: leaf.cause,
          category: leaf.category,
          evidence: leaf.evidence,
          fitsFacts: leaf.fitsFacts,
          confidence: ev[leaf.evidence] * fit[leaf.fitsFacts],
        };
      })
      .sort((a, b) => b.confidence - a.confidence);
    const shallow = roots.filter((r) => r.depth < 3);
    if (shallow.length)
      warnings.push(
        `${shallow.length} chain(s) stop after fewer than 3 “why” steps; keep asking why until the cause is something you can change.`,
      );
    if (!roots.some((r) => r.evidence === 'strong'))
      warnings.push('No root cause has strong evidence yet. Verify before fixing.');
    if (roots.some((r) => r.fitsFacts === 'no'))
      warnings.push(
        'Some candidate causes do not explain where the problem does not occur; they are unlikely to be the true cause.',
      );
    const covered = new Set(causes.map((c) => c.category));
    // The ranking multiplies ordinal labels; it orders hypotheses, it is not a probability.
    // A root with no evidence or that contradicts the facts scores 0 and is never put forward.
    const leading = roots[0]?.confidence > 0 ? roots[0] : null;
    if (!leading)
      warnings.push(
        'No candidate cause has both some evidence and a fit with the facts, so none is put forward. Gather evidence before acting.',
      );
    const summary = {
      roots,
      outcome: leading ? 'leading hypothesis' : 'insufficient evidence',
      mostProbable: leading?.root ?? null,
      categoriesConsidered: [...covered],
      categoriesNotConsidered: CATEGORIES.filter((c) => !covered.has(c)),
    };
    const out = result(
      'Root Cause Analysis — 5 Whys, Ishikawa categories and Kepner-Tregoe testing',
      summary,
      [
        `Problem: ${problem}`,
        isNot ? `Does not occur: ${isNot}` : '',
        ...roots.map(
          (r) =>
            `- ${r.chain.join(' ← ')} | root: ${r.root} (${r.category}), evidence ${r.evidence}, fits facts: ${r.fitsFacts}.`,
        ),
        leading
          ? `Leading candidate root cause (a hypothesis to verify): ${leading.root}.`
          : 'Leading candidate root cause: none — insufficient evidence.',
        `Fishbone categories not yet considered: ${list(summary.categoriesNotConsidered)}.`,
      ],
      warnings,
    );
    return {
      ...out,
      status: leading ? 'completed' : 'insufficient_evidence',
      missingEvidence: leading
        ? []
        : roots.map(
            (r) =>
              `${r.root}: ${r.evidence === 'none' ? 'evidence for this cause' : 'a cause that also explains where the problem does not occur'}`,
          ),
    };
  },
  computes:
    'Builds the cause chains, ranks root causes by evidence and by whether they explain the facts, and shows which fishbone categories were not considered.',
  limits: 'It organises and tests your analysis; it cannot find causes you have not listed.',
};

/* T12 — Operating Rhythm & Meeting Design */
const PER_YEAR = { daily: 230, weekly: 46, fortnightly: 23, monthly: 12, quarterly: 4, yearly: 1 };
export const rhythm = {
  fields: [F.int('people', 'People in scope', { required: true, min: 1 })],
  tables: [
    {
      key: 'meetings',
      label: 'Recurring meetings and reviews',
      minRows: 1,
      columns: [
        F.text('name', 'Meeting', { required: true }),
        F.select('frequency', 'Frequency', Object.keys(PER_YEAR), { required: true }),
        F.int('minutes', 'Length (minutes)', { required: true, min: 1 }),
        F.int('attendees', 'Attendees', { required: true, min: 1 }),
        F.select(
          'purpose',
          'Main purpose',
          ['decide', 'review progress', 'share updates', 'plan', 'connect'],
          { required: true },
        ),
        F.text('owner', 'Owner'),
        F.bool('agenda', 'Has a set agenda'),
      ],
    },
  ],
  compute({ people, meetings }) {
    const rows = meetings.map((m) => {
      const personHoursYear = (PER_YEAR[m.frequency] * m.minutes * m.attendees) / 60;
      return { ...m, personHoursPerWeek: r1(personHoursYear / 46) };
    });
    const total = sum(rows.map((r) => r.personHoursPerWeek));
    const updates = sum(
      rows.filter((r) => r.purpose === 'share updates').map((r) => r.personHoursPerWeek),
    );
    const levels = {
      'weekly operational review': rows.some(
        (r) => ['daily', 'weekly'].includes(r.frequency) && r.purpose === 'review progress',
      ),
      'monthly performance review': rows.some(
        (r) => r.frequency === 'monthly' && ['review progress', 'decide'].includes(r.purpose),
      ),
      // A yearly meeting cannot provide a quarterly review.
      'quarterly strategy review': rows.some(
        (r) =>
          (r.frequency === 'quarterly' && ['plan', 'decide'].includes(r.purpose)) ||
          (r.frequency === 'monthly' && r.purpose === 'plan'),
      ),
    };
    const missing = Object.entries(levels)
      .filter(([, ok]) => !ok)
      .map(([k]) => k);
    const noOwner = rows.filter((r) => !r.owner).map((r) => r.name);
    const noAgenda = rows.filter((r) => !r.agenda).map((r) => r.name);
    const warnings = [];
    const perPerson = total / people;
    if (perPerson > 8)
      warnings.push(`Recurring meetings take about ${r1(perPerson)} hours per person per week.`);
    if (updates > total * 0.3)
      warnings.push(
        `${pct(updates, total)}% of meeting time is spent sharing updates, which could move to written updates.`,
      );
    if (missing.length) warnings.push(`The rhythm has no ${missing.join(', no ')}.`);
    if (noOwner.length) warnings.push(`No owner: ${list(noOwner)}.`);
    const summary = {
      personHoursPerWeek: r1(total),
      hoursPerPersonPerWeek: r1(perPerson),
      updateSharePct: pct(updates, total),
      missingRhythmLevels: missing,
      meetingsWithoutOwner: noOwner,
      meetingsWithoutAgenda: noAgenda,
      meetings: rows.sort((a, b) => b.personHoursPerWeek - a.personHoursPerWeek),
    };
    return result(
      'Operating Rhythm & Meeting Design — meeting-load analysis against a weekly, monthly and quarterly review cycle',
      summary,
      [
        `${summary.personHoursPerWeek} person-hours a week in recurring meetings; ${summary.hoursPerPersonPerWeek} per person across ${people} people.`,
        `Share of time spent on status updates: ${summary.updateSharePct}%.`,
        `Missing rhythm levels: ${list(missing)}.`,
        ...summary.meetings
          .slice(0, 10)
          .map(
            (m) =>
              `- ${m.name}: ${m.personHoursPerWeek} person-hours/week (${m.frequency}, ${m.purpose}).`,
          ),
      ],
      warnings,
    );
  },
  computes:
    'The time your recurring meetings cost per person, how much of it is status updates, and whether the weekly, monthly and quarterly review levels exist.',
  limits: 'It uses the meetings you list; it does not read calendars or judge meeting quality.',
};

/* T13 — Productivity & Output Metrics (OEE / SPACE-informed output measures) */
export const productivity = {
  fields: [F.text('outputUnit', 'Unit of output', { required: true, default: 'items' })],
  tables: [
    {
      key: 'teams',
      label: 'Teams',
      minRows: 1,
      columns: [
        F.text('team', 'Team', { required: true }),
        F.num('output', 'Output this period', { required: true, min: 0 }),
        F.num('hours', 'Hours worked', { required: true, min: 0.1 }),
        F.num('rework', 'Output needing rework or rejected', { min: 0, default: 0 }),
        F.num('priorOutputPerHour', 'Last period output per hour', { min: 0 }),
      ],
    },
  ],
  compute({ outputUnit, teams }) {
    const rows = teams
      .map((t) => {
        const perHour = t.output / t.hours;
        const quality = t.output ? 1 - Math.min(t.rework, t.output) / t.output : 0;
        return {
          team: t.team,
          outputPer100Hours: r1(perHour * 100),
          qualityRatePct: r1(quality * 100),
          goodOutputPer100Hours: r1(perHour * quality * 100),
          changePct: t.priorOutputPerHour
            ? r1(((perHour - t.priorOutputPerHour) / t.priorOutputPerHour) * 100)
            : null,
        };
      })
      .sort((a, b) => b.goodOutputPer100Hours - a.goodOutputPer100Hours);
    const med = median(rows.map((r) => r.goodOutputPer100Hours));
    const best = rows[0];
    const warnings = [];
    const lowQ = rows.filter((r) => r.qualityRatePct < 90);
    if (lowQ.length)
      warnings.push(
        `Quality below 90% in: ${list(lowQ.map((r) => r.team))}. Rework hides lost capacity.`,
      );
    warnings.push('Compare teams only where the unit of output means the same thing for each.');
    const summary = {
      teams: rows,
      medianGoodOutputPer100Hours: med,
      bestToMedianRatio: med ? r2(best.goodOutputPer100Hours / med) : null,
    };
    return result(
      'Productivity & Output Metrics — quality-adjusted output per hour (OEE-style quality rate)',
      summary,
      [
        ...rows.map(
          (r) =>
            `- ${r.team}: ${r.goodOutputPer100Hours} good ${outputUnit} per 100 hours (quality ${r.qualityRatePct}%${r.changePct !== null ? `, ${r.changePct}% vs last period` : ''}).`,
        ),
        `Best team produces ${summary.bestToMedianRatio ?? '—'}× the median.`,
      ],
      warnings,
    );
  },
  computes:
    'Quality-adjusted output per 100 hours for each team, the change from last period, and the spread between the best team and the median.',
  limits:
    'Output units must mean the same thing across teams; it cannot normalise for different kinds of work.',
};

/* T14 — Collaboration Network Map (Organisational Network Analysis) */
export const network = {
  fields: [],
  tables: [
    {
      key: 'links',
      label: 'Working relationships',
      hint: 'who relies on whom for information or decisions',
      minRows: 2,
      columns: [
        F.text('a', 'Person or team', { required: true }),
        F.text('b', 'Relies on / works with', { required: true }),
        F.select('strength', 'How often', ['occasional', 'regular', 'critical'], {
          default: 'regular',
        }),
      ],
    },
  ],
  compute({ links }) {
    const adj = new Map();
    const add = (x, y, w) => {
      if (!adj.has(x)) adj.set(x, new Map());
      adj.get(x).set(y, Math.max(adj.get(x).get(y) ?? 0, w));
    };
    const W = { occasional: 1, regular: 2, critical: 3 };
    for (const l of links) {
      if (l.a === l.b) continue;
      add(l.a, l.b, W[l.strength]);
      add(l.b, l.a, W[l.strength]);
    }
    const nodes = [...adj.keys()];
    const degree = nodes.map((n) => ({
      node: n,
      connections: adj.get(n).size,
      weight: sum([...adj.get(n).values()]),
    }));
    const totalWeight = sum(degree.map((d) => d.weight));
    // articulation points (Tarjan): people or teams whose absence splits the network
    const disc = new Map(),
      low = new Map(),
      cut = new Set();
    let t = 0;
    const dfs = (u, parent) => {
      disc.set(u, ++t);
      low.set(u, t);
      let kids = 0;
      for (const v of adj.get(u).keys()) {
        if (!disc.has(v)) {
          kids++;
          dfs(v, u);
          low.set(u, Math.min(low.get(u), low.get(v)));
          if (parent !== null && low.get(v) >= disc.get(u)) cut.add(u);
        } else if (v !== parent) low.set(u, Math.min(low.get(u), disc.get(v)));
      }
      if (parent === null && kids > 1) cut.add(u);
    };
    let components = 0;
    for (const n of nodes)
      if (!disc.has(n)) {
        components++;
        dfs(n, null);
      }
    const ranked = degree
      .sort((a, b) => b.weight - a.weight)
      .map((d) => ({ ...d, sharePct: pct(d.weight, totalWeight) }));
    const overloaded = ranked.filter(
      (d) => d.sharePct >= 25 || (nodes.length > 4 && d.connections >= nodes.length * 0.6),
    );
    const peripheral = ranked.filter((d) => d.connections === 1).map((d) => d.node);
    const density =
      nodes.length > 1 ? pct(links.length, (nodes.length * (nodes.length - 1)) / 2) : 0;
    const warnings = [];
    if (cut.size)
      warnings.push(
        `If ${list([...cut])} became unavailable, the network would split. These are single points of failure.`,
      );
    if (components > 1)
      warnings.push(`The network is already split into ${components} disconnected groups.`);
    if (overloaded.length)
      warnings.push(`Overloaded connectors: ${list(overloaded.map((d) => d.node))}.`);
    const summary = {
      people: nodes.length,
      densityPct: density,
      groups: components,
      brokers: [...cut],
      overloaded: overloaded.map((d) => d.node),
      peripheral,
      ranking: ranked,
    };
    return result(
      'Collaboration Network Map — Organisational Network Analysis',
      summary,
      [
        `${nodes.length} people or teams, ${links.length} relationships, density ${density}%, ${components} connected group(s).`,
        `Single points of failure (brokers): ${list([...cut])}.`,
        `Overloaded connectors: ${list(summary.overloaded)}.`,
        `Peripheral (one connection only): ${list(peripheral)}.`,
        ...ranked
          .slice(0, 8)
          .map(
            (d) =>
              `- ${d.node}: ${d.connections} connection${d.connections === 1 ? '' : 's'}, ${d.sharePct}% of collaboration load.`,
          ),
      ],
      warnings,
    );
  },
  computes:
    'Connections per person or team, collaboration load share, single points of failure and isolated groups.',
  limits: 'Built from the relationships you list; it does not read email or chat data.',
};

/* T15 — Technology ROI & Total Cost */
export const techRoi = {
  fields: [F.num('hourlyCost', 'Average loaded cost per hour', { required: true, min: 0 })],
  tables: [
    {
      key: 'systems',
      label: 'Systems and tools',
      minRows: 1,
      columns: [
        F.text('system', 'System', { required: true }),
        F.num('annualCost', 'Total annual cost (licences, support, hosting, admin time)', {
          required: true,
          min: 0,
        }),
        F.int('licensedUsers', 'Licensed users', { required: true, min: 0 }),
        F.int('activeUsers', 'Active users', { required: true, min: 0 }),
        F.num('hoursSaved', 'Hours saved per active user per week', { min: 0, default: 0 }),
      ],
    },
  ],
  compute({ hourlyCost, systems }) {
    const rows = systems
      .map((s) => {
        const value = s.activeUsers * s.hoursSaved * 46 * hourlyCost;
        return {
          system: s.system,
          annualCost: s.annualCost,
          annualValue: Math.round(value),
          roiPct: s.annualCost ? r1(((value - s.annualCost) / s.annualCost) * 100) : null,
          adoptionPct: pct(s.activeUsers, s.licensedUsers),
          costPerActiveUser: s.activeUsers ? Math.round(s.annualCost / s.activeUsers) : null,
          unusedLicences: Math.max(0, s.licensedUsers - s.activeUsers),
        };
      })
      .sort((a, b) => (b.roiPct ?? -Infinity) - (a.roiPct ?? -Infinity));
    const warnings = [];
    const lowAdopt = rows.filter((r) => r.adoptionPct < 50);
    if (lowAdopt.length)
      warnings.push(`Under half of licences are used for: ${list(lowAdopt.map((r) => r.system))}.`);
    const negative = rows.filter((r) => r.roiPct !== null && r.roiPct < 0);
    if (negative.length)
      warnings.push(
        `Cost exceeds the value of time saved for: ${list(negative.map((r) => r.system))}.`,
      );
    warnings.push('Hours saved are estimates; check them against a sample of users.');
    const summary = {
      systems: rows,
      totalCost: sum(rows.map((r) => r.annualCost)),
      totalValue: sum(rows.map((r) => r.annualValue)),
    };
    return result(
      'Technology ROI & Total Cost — total cost of ownership against time saved',
      summary,
      [
        `Total annual cost ${money(summary.totalCost)}; estimated value of time saved ${money(summary.totalValue)}.`,
        ...rows.map(
          (r) =>
            `- ${r.system}: ROI ${r.roiPct ?? '—'}%, adoption ${r.adoptionPct}%, ${r.unusedLicences} unused licences, cost per active user ${r.costPerActiveUser ?? '—'}.`,
        ),
      ],
      warnings,
    );
  },
  computes:
    'Return on each system from total annual cost against the value of time saved, plus adoption and unused licences.',
  limits: 'Time saved is your estimate; it does not measure usage from the systems themselves.',
};

/* T16 — Innovation Funnel (ISO 56002; Stage-Gate) */
export const funnel = {
  fields: [
    F.num('spend', 'Innovation spend this period', { min: 0 }),
    F.num('launchedRevenue', 'Revenue from launched innovations', { min: 0 }),
  ],
  tables: [
    {
      key: 'stages',
      label: 'Stages, in order',
      hint: 'e.g. idea, assessed, prototype, pilot, launched',
      minRows: 2,
      columns: [
        F.text('stage', 'Stage', { required: true }),
        F.int('count', 'Items that reached this stage', { required: true }),
        F.num('avgDays', 'Average days spent in this stage', { min: 0, default: 0 }),
      ],
    },
  ],
  compute({ spend, launchedRevenue, stages }) {
    const conv = stages.slice(1).map((s, i) => ({
      from: stages[i].stage,
      to: s.stage,
      conversionPct: pct(s.count, stages[i].count),
    }));
    const weakest = [...conv].sort((a, b) => a.conversionPct - b.conversionPct)[0];
    const warnings = [];
    if (stages.some((s, i) => i > 0 && s.count > stages[i - 1].count))
      warnings.push('A later stage has more items than the stage before it; check the counts.');
    const summary = {
      overallConversionPct: pct(stages[stages.length - 1].count, stages[0].count),
      timeToMarketDays: r1(sum(stages.map((s) => s.avgDays))),
      conversions: conv,
      weakestStep: weakest,
      innovationReturn: spend ? r2((launchedRevenue ?? 0) / spend) : null,
    };
    return result(
      'Innovation Funnel — ISO 56002 innovation process with Stage-Gate conversion',
      summary,
      [
        `${stages[0].count} ${stages[0].stage} → ${stages[stages.length - 1].count} ${stages[stages.length - 1].stage}: overall conversion ${summary.overallConversionPct}%.`,
        `Time from first stage to last: about ${summary.timeToMarketDays} days.`,
        ...conv.map((c) => `- ${c.from} → ${c.to}: ${c.conversionPct}%.`),
        weakest ? `Lowest conversion: ${weakest.from} → ${weakest.to}.` : '',
        summary.innovationReturn !== null
          ? `Revenue returned per unit of innovation spend: ${summary.innovationReturn}.`
          : '',
      ],
      warnings,
    );
  },
  computes:
    'Conversion between innovation stages, time to market and revenue returned per unit of innovation spend.',
  limits: 'Works from your stage counts; it does not judge the quality of individual ideas.',
};
