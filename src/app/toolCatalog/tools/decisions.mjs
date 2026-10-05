import {
  dict,
  F,
  r1,
  r2,
  sum,
  mean,
  median,
  percentile,
  pct,
  days,
  today,
  money,
  list,
  result,
  ToolInputError,
} from '../schema.mjs';

/* T19 — Decision Register (decision log / ADR practice) */
export const decisionRegister = {
  fields: [
    F.date('asOf', 'As of (defaults to today)'),
    F.int('stallDays', 'Treat an open decision as stalled after (days)', { default: 30, min: 1 }),
  ],
  tables: [
    {
      key: 'decisions',
      label: 'Decisions',
      minRows: 1,
      columns: [
        F.text('title', 'Decision', { required: true }),
        F.text('owner', 'Owner'),
        F.date('raised', 'Raised on', { required: true }),
        F.date('decided', 'Decided on'),
        F.select('status', 'Status', ['open', 'decided', 'implemented', 'reversed'], {
          required: true,
        }),
        F.text('topic', 'Topic tag (same tag = same recurring question)'),
        F.bool('rationale', 'Rationale recorded'),
        F.date('reviewBy', 'Review by'),
      ],
    },
  ],
  compute({ asOf, stallDays, decisions }) {
    decisions.forEach((d, i) => {
      if (d.decided && d.decided < d.raised)
        throw new ToolInputError(
          `Decisions, row ${i + 1}: “Decided on” (${d.decided}) is before “Raised on” (${d.raised}).`,
        );
    });
    const at = asOf ?? today();
    const closed = decisions.filter((d) => d.decided);
    const cycle = closed.map((d) => days(d.raised, d.decided));
    const open = decisions.filter((d) => d.status === 'open');
    const stalled = open
      .map((d) => ({ title: d.title, owner: d.owner || 'no owner', ageDays: days(d.raised, at) }))
      .filter((d) => d.ageDays > stallDays)
      .sort((a, b) => b.ageDays - a.ageDays);
    const noOwner = decisions.filter((d) => !d.owner).map((d) => d.title);
    const noRationale = closed.filter((d) => !d.rationale).map((d) => d.title);
    const reviewsOverdue = decisions
      .filter((d) => d.reviewBy && d.reviewBy < at && d.status !== 'reversed')
      .map((d) => d.title);
    const topics = dict();
    for (const d of decisions) if (d.topic) (topics[d.topic.toLowerCase()] ??= []).push(d.title);
    const recurring = Object.entries(topics)
      .filter(([, ts]) => ts.length > 1)
      .map(([topic, ts]) => ({ topic, times: ts.length }));
    const owners = dict();
    for (const d of open) if (d.owner) owners[d.owner] = (owners[d.owner] ?? 0) + 1;
    const warnings = [];
    if (stalled.length)
      warnings.push(`${stalled.length} open decision(s) have waited more than ${stallDays} days.`);
    if (noOwner.length) warnings.push(`${noOwner.length} decision(s) have no owner.`);
    if (recurring.length)
      warnings.push(
        `Recurring questions that were never settled: ${list(recurring.map((r) => `${r.topic} (${r.times}×)`))}.`,
      );
    if (noRationale.length)
      warnings.push(`${noRationale.length} decision(s) were made without a recorded rationale.`);
    const summary = {
      total: decisions.length,
      open: open.length,
      medianCycleDays: cycle.length ? median(cycle) : null,
      p80CycleDays: cycle.length ? percentile(cycle, 80) : null,
      stalled,
      reversalRatePct: pct(decisions.filter((d) => d.status === 'reversed').length, closed.length),
      withoutOwner: noOwner,
      withoutRationale: noRationale,
      reviewsOverdue,
      recurringTopics: recurring,
      openByOwner: owners,
    };
    return result(
      'Decision Register — decision log with cycle-time measures',
      summary,
      [
        `${decisions.length} decisions as of ${at}; ${open.length} open.`,
        `Cycle time from raised to decided: median ${summary.medianCycleDays ?? '—'} days, 80% within ${summary.p80CycleDays ?? '—'} days.`,
        `Reversal rate: ${summary.reversalRatePct}% of decided items.`,
        ...stalled.map((s) => `- Stalled: ${s.title} (${s.owner}), ${s.ageDays} days.`),
        `Reviews overdue: ${list(reviewsOverdue)}.`,
        `Open decisions by owner: ${
          Object.entries(owners)
            .map(([o, n]) => `${o} ${n}`)
            .join(', ') || 'none'
        }.`,
      ],
      warnings,
    );
  },
  computes:
    'Decision cycle time, stalled and recurring decisions, missing owners and rationale, overdue reviews and reversal rate.',
  limits: 'Built from the decisions you record; it does not judge whether a decision was right.',
};

/* T20 — Decision Rights Matrix (RACI; RAPID; delegation of authority) */
export const raci = {
  fields: [],
  tables: [
    {
      key: 'assignments',
      label: 'Assignments',
      hint: 'one row per decision and role',
      minRows: 2,
      columns: [
        F.text('decision', 'Decision or decision type', { required: true }),
        F.text('role', 'Role or person', { required: true }),
        F.select(
          'code',
          'Role in the decision',
          [
            { value: 'A', label: 'A — Accountable (final say)' },
            { value: 'R', label: 'R — Responsible (does the work)' },
            { value: 'C', label: 'C — Consulted' },
            { value: 'I', label: 'I — Informed' },
          ],
          { required: true },
        ),
        F.num('limit', 'Approval limit (optional)', { min: 0 }),
      ],
    },
  ],
  compute({ assignments }) {
    const byDecision = dict();
    for (const a of assignments) (byDecision[a.decision] ??= []).push(a);
    const issues = [];
    const decisions = Object.entries(byDecision).map(([decision, rows]) => {
      const A = rows.filter((r) => r.code === 'A').map((r) => r.role);
      const R = rows.filter((r) => r.code === 'R').map((r) => r.role);
      const C = rows.filter((r) => r.code === 'C').map((r) => r.role);
      const problems = [];
      if (A.length === 0) problems.push('no one accountable');
      if (A.length > 1) problems.push(`${A.length} people accountable (${A.join(', ')})`);
      if (R.length === 0) problems.push('no one responsible');
      if (C.length > 5) problems.push(`${C.length} people consulted, which slows the decision`);
      if (problems.length) issues.push({ decision, problems });
      return {
        decision,
        accountable: A,
        responsible: R,
        consulted: C.length,
        informed: rows.filter((r) => r.code === 'I').length,
      };
    });
    const roles = dict();
    for (const a of assignments) {
      const r = (roles[a.role] ??= { role: a.role, A: 0, R: 0, C: 0, I: 0 });
      r[a.code]++;
    }
    const roleRows = Object.values(roles).sort((a, b) => b.A - a.A);
    const n = decisions.length;
    const bottlenecks = roleRows.filter((r) => n >= 4 && r.A / n > 0.4).map((r) => r.role);
    const warnings = [];
    if (issues.length)
      warnings.push(
        `${issues.length} of ${n} decisions break the one-accountable-owner rule or lack someone responsible.`,
      );
    if (bottlenecks.length)
      warnings.push(
        `${list(bottlenecks)} holds final say on over 40% of decisions; consider delegating.`,
      );
    const summary = {
      decisions,
      issues,
      roles: roleRows,
      approvalBottlenecks: bottlenecks,
      cleanPct: pct(n - issues.length, n),
    };
    return result(
      'Decision Rights Matrix — RACI with delegation-of-authority checks',
      summary,
      [
        `${n} decisions; ${summary.cleanPct}% have exactly one accountable owner and someone responsible.`,
        ...issues.map((i) => `- ${i.decision}: ${i.problems.join('; ')}.`),
        ...roleRows.map(
          (r) =>
            `  · ${r.role}: accountable for ${r.A}, responsible for ${r.R}, consulted on ${r.C}.`,
        ),
      ],
      warnings,
    );
  },
  computes:
    'Checks each decision has exactly one accountable owner and someone responsible, and finds roles that hold too many final calls.',
  limits: 'It checks the matrix you enter, not whether people follow it in practice.',
};

/* T23 — Decision Timing & Cost of Delay (Reinertsen; WSJF; Eisenhower) */
export const costOfDelay = {
  fields: [F.date('asOf', 'As of (defaults to today)')],
  tables: [
    {
      key: 'items',
      label: 'Pending decisions or work',
      minRows: 1,
      columns: [
        F.text('item', 'Item', { required: true }),
        F.num('costPerWeek', 'Cost of delay per week', { required: true, min: 0 }),
        F.num('weeks', 'Weeks to carry out once decided', { required: true, min: 0.1 }),
        F.date('deadline', 'Hard deadline (if any)'),
      ],
    },
  ],
  compute({ asOf, items }) {
    const at = asOf ?? today();
    const medCod = median(items.map((i) => i.costPerWeek));
    const rows = items
      .map((i) => {
        const slackWeeks = i.deadline ? r1(days(at, i.deadline) / 7 - i.weeks) : null;
        const important = i.costPerWeek >= medCod;
        const urgent = slackWeeks !== null && slackWeeks <= 2;
        return {
          ...i,
          wsjf: r2(i.costPerWeek / i.weeks),
          slackWeeks,
          quadrant:
            important && urgent
              ? 'do now'
              : important
                ? 'schedule'
                : urgent
                  ? 'delegate'
                  : 'drop or defer',
        };
      })
      .sort((a, b) => b.wsjf - a.wsjf);
    const late = rows.filter((r) => r.slackWeeks !== null && r.slackWeeks < 0);
    const warnings = [];
    if (late.length)
      warnings.push(
        `${list(late.map((r) => r.item))} can no longer meet the deadline even if decided today.`,
      );
    const totalWeekly = sum(rows.map((r) => r.costPerWeek));
    const summary = {
      order: rows,
      weeklyCostOfWaiting: totalWeekly,
      missedDeadlines: late.map((r) => r.item),
    };
    return result(
      'Decision Timing & Cost of Delay — weighted shortest job first and the Eisenhower matrix',
      summary,
      [
        `Leaving every item undecided costs about ${money(totalWeekly)} a week.`,
        'Recommended order (highest cost of delay per week of work first):',
        ...rows.map(
          (r, i) =>
            `${i + 1}. ${r.item}: WSJF ${r.wsjf}, ${r.quadrant}${r.slackWeeks !== null ? `, ${r.slackWeeks} weeks of slack` : ''}.`,
        ),
      ],
      warnings,
    );
  },
  computes:
    'Orders pending items by cost of delay divided by duration (WSJF), places them on the Eisenhower matrix, and flags deadlines that can no longer be met.',
  limits: 'Cost of delay is your estimate; the order is only as good as those figures.',
};

/* T25 — Stakeholder Map (Mendelow power–interest; Mitchell salience) */
export const stakeholders = {
  fields: [F.text('subject', 'Decision or change', { required: true })],
  tables: [
    {
      key: 'stakeholders',
      label: 'Stakeholders',
      minRows: 1,
      columns: [
        F.text('name', 'Stakeholder', { required: true }),
        F.scale('power', 'Power over the outcome (1–5)', 1, 5, { required: true }),
        F.scale('interest', 'Interest in the outcome (1–5)', 1, 5, { required: true }),
        F.select(
          'position',
          'Current position',
          ['champion', 'supporter', 'neutral', 'sceptic', 'opponent'],
          { required: true },
        ),
        F.bool('legitimate', 'Has a legitimate claim'),
        F.bool('urgent', 'Needs attention now'),
      ],
    },
  ],
  compute({ subject, stakeholders: list_ }) {
    const rows = list_.map((s) => {
      const quadrant =
        s.power >= 3
          ? s.interest >= 3
            ? 'manage closely'
            : 'keep satisfied'
          : s.interest >= 3
            ? 'keep informed'
            : 'monitor';
      const attrs = [s.power >= 4, s.legitimate, s.urgent].filter(Boolean).length;
      const salience =
        attrs === 3
          ? 'definitive'
          : attrs === 2
            ? 'expectant'
            : attrs === 1
              ? 'latent'
              : 'non-stakeholder';
      return { ...s, quadrant, salience };
    });
    const risks = rows.filter((r) => r.power >= 3 && ['sceptic', 'opponent'].includes(r.position));
    const champions = rows.filter((r) => r.power >= 3 && r.position === 'champion');
    const warnings = [];
    if (risks.length)
      warnings.push(
        `High-power stakeholders not yet supportive: ${list(risks.map((r) => r.name))}.`,
      );
    if (!champions.length)
      warnings.push('No high-power champion. Changes without a powerful sponsor rarely land.');
    const support = { champion: 2, supporter: 1, neutral: 0, sceptic: -1, opponent: -2 };
    const weighted =
      sum(rows.map((r) => support[r.position] * r.power)) / (sum(rows.map((r) => r.power)) * 2);
    const summary = {
      subject,
      stakeholders: rows,
      risks: risks.map((r) => r.name),
      powerWeightedSupportPct: r1(weighted * 100),
    };
    return result(
      'Stakeholder Map — Mendelow power–interest grid with Mitchell salience',
      summary,
      [
        `${subject}: power-weighted support ${summary.powerWeightedSupportPct}% (−100 all opposed, +100 all champions).`,
        ...['manage closely', 'keep satisfied', 'keep informed', 'monitor'].map(
          (q) =>
            `- ${q}: ${list(rows.filter((r) => r.quadrant === q).map((r) => `${r.name} (${r.position})`))}.`,
        ),
        `Definitive stakeholders: ${list(rows.filter((r) => r.salience === 'definitive').map((r) => r.name))}.`,
      ],
      warnings,
    );
  },
  computes:
    'Places stakeholders on the power–interest grid, rates their salience, and computes power-weighted support.',
  limits: 'Positions are your read of each stakeholder; it does not survey them.',
};

/* T26 — Force Field Analysis (Lewin) */
export const forceField = {
  fields: [F.text('change', 'Change being considered', { required: true })],
  tables: [
    {
      key: 'forces',
      label: 'Forces',
      minRows: 2,
      columns: [
        F.text('force', 'Force', { required: true }),
        F.select('direction', 'Direction', ['driving', 'resisting'], { required: true }),
        F.scale('strength', 'Strength (1–5)', 1, 5, { required: true }),
        F.bool('controllable', 'We can influence it'),
      ],
    },
  ],
  compute({ change, forces }) {
    const driving = forces.filter((f) => f.direction === 'driving');
    const resisting = forces.filter((f) => f.direction === 'resisting');
    const d = sum(driving.map((f) => f.strength));
    const r = sum(resisting.map((f) => f.strength));
    const levers = resisting.filter((f) => f.controllable).sort((a, b) => b.strength - a.strength);
    const warnings = [];
    if (r >= d)
      warnings.push(
        'Resisting forces are as strong as or stronger than driving forces. Reduce resistance before pushing harder.',
      );
    if (!levers.length && resisting.length)
      warnings.push('None of the resisting forces are marked as ones you can influence.');
    const summary = {
      change,
      drivingTotal: d,
      resistingTotal: r,
      net: d - r,
      ratio: r ? r2(d / r) : null,
      reduceFirst: levers.map((f) => f.force),
    };
    return result(
      'Force Field Analysis — Lewin’s method',
      summary,
      [
        `${change}: driving ${d} vs resisting ${r} (net ${d - r}).`,
        `Driving: ${list(driving.map((f) => `${f.force} (${f.strength})`))}.`,
        `Resisting: ${list(resisting.map((f) => `${f.force} (${f.strength})`))}.`,
        `Reduce first (strongest resisting forces you can influence): ${list(summary.reduceFirst, 3)}.`,
      ],
      warnings,
    );
  },
  computes: 'Totals driving and resisting forces and names the resisting forces to reduce first.',
  limits: 'Strengths are your judgement; it does not measure the forces.',
};

/* T27 — Decision Method Selector (Cynefin; reversibility) */
export const methodSelector = {
  fields: [
    F.text('decision', 'Decision', { required: true }),
    F.select(
      'causeEffect',
      'How well is cause and effect understood?',
      [
        { value: 'obvious', label: 'Obvious to anyone involved' },
        { value: 'expert', label: 'Knowable with expert analysis' },
        { value: 'emergent', label: 'Only clear in hindsight' },
        { value: 'none', label: 'No pattern; things are out of control' },
      ],
      { required: true },
    ),
    F.select(
      'reversibility',
      'If it goes wrong, can it be undone?',
      [
        { value: 'easy', label: 'Easily and cheaply' },
        { value: 'costly', label: 'Yes, at real cost' },
        { value: 'no', label: 'No, or only at very high cost' },
      ],
      { required: true },
    ),
    F.select('stakes', 'What is at stake?', ['low', 'medium', 'high'], { required: true }),
    F.select('timeAvailable', 'Time available', ['hours', 'days', 'weeks or more'], {
      required: true,
    }),
  ],
  tables: [],
  compute(i) {
    const domain = {
      obvious: 'Clear',
      expert: 'Complicated',
      emergent: 'Complex',
      none: 'Chaotic',
    }[i.causeEffect];
    const oneWay =
      i.reversibility === 'no' || (i.reversibility === 'costly' && i.stakes === 'high');
    const approach = {
      Clear:
        'Sense, categorise, respond: apply the known procedure or rule. Decide quickly at the lowest level that has the information.',
      Complicated:
        'Sense, analyse, respond: get expert input, compare options against weighted criteria, and test the key assumptions.',
      Complex:
        'Probe, sense, respond: run small, safe-to-fail experiments with clear stop conditions, and scale what works.',
      Chaotic:
        'Act, sense, respond: take a stabilising action now, then move the situation into a domain where analysis is possible.',
    }[domain];
    const tools = {
      Clear: ['Decision Rights Matrix (confirm who decides)'],
      Complicated: ['Option Comparison', 'Scenarios & Expected Value', 'Decision Quality'],
      Complex: [
        'Scenarios & Expected Value (to bound the downside)',
        'Benefits & After-Action Review (to learn from each probe)',
      ],
      Chaotic: ['Decision Register (record what was done and why, for review)'],
    }[domain];
    const depth = oneWay
      ? 'One-way door: slow down. Involve the accountable owner, write down the rationale, and run a Decision Quality check before committing.'
      : 'Two-way door: decide fast, at the level closest to the work, and correct course if needed.';
    const warnings = [];
    if (oneWay && i.timeAvailable === 'hours')
      warnings.push(
        'An irreversible decision with only hours available. Look for a smaller reversible step that buys time.',
      );
    if (domain === 'Complex' && i.stakes === 'high' && oneWay)
      warnings.push(
        'High stakes in a complex situation: avoid a single big bet; stage the commitment.',
      );
    const summary = {
      decision: i.decision,
      domain,
      doorType: oneWay ? 'one-way' : 'two-way',
      approach,
      depth,
      suggestedTools: tools,
    };
    return result(
      'Decision Method Selector — Cynefin framework with one-way / two-way door test',
      summary,
      [
        `${i.decision}: ${domain} domain, ${summary.doorType} door.`,
        approach,
        depth,
        `Tools to use next: ${tools.join(', ')}.`,
      ],
      warnings,
    );
  },
  computes:
    'Classifies the decision situation (Cynefin domain and reversibility) and recommends how much process it needs and which tools to use.',
  limits: 'The answer depends on how you describe the situation; it does not make the decision.',
};

/* T35 — Forecast Calibration (Brier score) */
export const calibration = {
  fields: [],
  tables: [
    {
      key: 'predictions',
      label: 'Predictions',
      hint: 'record a probability before the outcome is known',
      minRows: 1,
      columns: [
        F.text('statement', 'Prediction', { required: true }),
        F.text('forecaster', 'Who made it', { required: true }),
        F.pct('probability', 'Probability it happens (%)', { required: true }),
        F.select('outcome', 'Outcome', ['happened', 'did not happen', 'not yet known'], {
          required: true,
        }),
      ],
    },
  ],
  compute({ predictions }) {
    const resolved = predictions
      .filter((p) => p.outcome !== 'not yet known')
      .map((p) => ({ ...p, p: p.probability / 100, o: p.outcome === 'happened' ? 1 : 0 }));
    const brier = (xs) => (xs.length ? r2(mean(xs.map((x) => (x.p - x.o) ** 2))) : null);
    const people = dict();
    for (const x of resolved) (people[x.forecaster] ??= []).push(x);
    const forecasters = Object.entries(people)
      .map(([name, xs]) => ({
        forecaster: name,
        resolved: xs.length,
        brier: brier(xs),
        // Positive = said things were likelier than they turned out to be (on average).
        biasPts: r1((mean(xs.map((x) => x.p)) - mean(xs.map((x) => x.o))) * 100),
      }))
      .sort((a, b) => a.brier - b.brier);
    const buckets = [];
    for (let lo = 0; lo < 100; lo += 20) {
      const xs = resolved.filter(
        (x) =>
          x.probability >= lo && (x.probability < lo + 20 || (lo === 80 && x.probability === 100)),
      );
      if (xs.length)
        buckets.push({
          range: `${lo}–${lo + 20}%`,
          predicted: r1(mean(xs.map((x) => x.probability))),
          actual: pct(sum(xs.map((x) => x.o)), xs.length),
          n: xs.length,
        });
    }
    const warnings = [];
    if (resolved.length < 10)
      warnings.push(
        `Only ${resolved.length} resolved prediction(s). Calibration needs at least 10, ideally 30+, to mean much.`,
      );
    const summary = {
      resolved: resolved.length,
      pending: predictions.length - resolved.length,
      overallBrier: brier(resolved),
      forecasters,
      calibration: buckets,
    };
    return result(
      'Forecast Calibration — Brier score (0 is perfect, 0.25 is a coin flip)',
      summary,
      [
        `${resolved.length} resolved predictions, overall Brier score ${summary.overallBrier ?? '—'}.`,
        ...forecasters.map(
          (f) =>
            `- ${f.forecaster}: Brier ${f.brier} over ${f.resolved} predictions; average bias ${f.biasPts >= 0 ? '+' : ''}${f.biasPts} pts (positive means over-predicting).`,
        ),
        ...buckets.map((b) => `  · Said ${b.range}: happened ${b.actual}% of the time (n=${b.n}).`),
      ],
      warnings,
    );
  },
  computes:
    'Brier scores per person and overall, and how often things predicted at each confidence level actually happened.',
  limits:
    'Only resolved predictions count; it measures past judgement, not ability on new kinds of question.',
};

/* T30 — Benefits & After-Action Review (benefits realisation; AAR) */
export const benefits = {
  fields: [],
  tables: [
    {
      key: 'items',
      label: 'Decisions or initiatives reviewed',
      minRows: 1,
      columns: [
        F.text('item', 'Decision or initiative', { required: true }),
        F.text('benefit', 'Benefit claimed', { required: true }),
        F.num('planned', 'Planned value', { required: true }),
        F.num('realised', 'Realised value so far', { required: true }),
        F.long('learned', 'What we learned (what happened vs what was expected, and why)'),
      ],
    },
  ],
  compute({ items }) {
    const rows = items.map((i) => ({
      ...i,
      realisationPct: i.planned ? r1((i.realised / i.planned) * 100) : null,
      shortfall: i.planned - i.realised,
    }));
    const planned = sum(rows.map((r) => r.planned));
    const realised = sum(rows.map((r) => r.realised));
    const under = rows.filter((r) => r.realisationPct !== null && r.realisationPct < 50);
    const noLesson = rows.filter((r) => !r.learned).map((r) => r.item);
    const warnings = [];
    if (under.length)
      warnings.push(
        `Under half the planned benefit realised for: ${list(under.map((r) => r.item))}.`,
      );
    if (noLesson.length)
      warnings.push(
        `No lesson recorded for ${noLesson.length} item(s). The review is where the learning happens.`,
      );
    const summary = {
      overallRealisationPct: pct(realised, planned),
      totalShortfall: planned - realised,
      items: rows,
    };
    return result(
      'Benefits & After-Action Review — benefits realisation with after-action review',
      summary,
      [
        `Realised ${money(realised)} of ${money(planned)} planned (${summary.overallRealisationPct}%).`,
        ...rows.map(
          (r) =>
            `- ${r.item} — ${r.benefit}: ${r.realisationPct ?? '—'}%.${r.learned ? ` Learned: ${r.learned}` : ''}`,
        ),
      ],
      warnings,
    );
  },
  computes: 'Planned against realised value per item and overall, with the lessons recorded.',
  limits: 'Values are what you report; attributing results to one decision is your judgement.',
};
