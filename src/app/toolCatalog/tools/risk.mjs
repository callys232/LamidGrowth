import { F, dict, r1, pct, days, today, list, result } from '../schema.mjs';

/* T28 — Early Warning Indicators (Key Risk Indicators; COSO ERM, ISO 31000) */
export const kri = {
  fields: [],
  tables: [
    {
      key: 'indicators',
      label: 'Indicators',
      minRows: 1,
      columns: [
        F.text('indicator', 'Indicator', { required: true }),
        F.select('direction', 'Worse when', ['higher', 'lower'], { required: true }),
        F.num('amber', 'Amber threshold', { required: true }),
        F.num('red', 'Red threshold', { required: true }),
        F.num('current', 'Current value', { required: true }),
        F.num('previous', 'Previous value'),
        F.text('owner', 'Owner'),
      ],
    },
  ],
  compute({ indicators }) {
    const warnings = [];
    const rows = indicators.map((k) => {
      const worse = (a, b) => (k.direction === 'higher' ? a >= b : a <= b);
      if (k.direction === 'higher' ? k.red < k.amber : k.red > k.amber)
        warnings.push(`“${k.indicator}”: the red threshold should be beyond the amber threshold.`);
      const status = worse(k.current, k.red)
        ? 'red'
        : worse(k.current, k.amber)
          ? 'amber'
          : 'green';
      let trend = null,
        periodsToRed = null;
      if (k.previous != null) {
        const step = k.current - k.previous;
        const towardRed = k.direction === 'higher' ? step > 0 : step < 0;
        trend = step === 0 ? 'flat' : towardRed ? 'worsening' : 'improving';
        if (towardRed && status !== 'red') periodsToRed = r1(Math.abs((k.red - k.current) / step));
      }
      return { ...k, status, trend, periodsToRed };
    });
    const red = rows.filter((r) => r.status === 'red');
    const soon = rows.filter((r) => r.periodsToRed !== null && r.periodsToRed <= 2);
    if (red.length) warnings.push(`Red: ${list(red.map((r) => r.indicator))}.`);
    if (soon.length)
      warnings.push(
        `At the current pace these reach red within two periods: ${list(soon.map((r) => r.indicator))}.`,
      );
    const noOwner = rows.filter((r) => !r.owner && r.status !== 'green');
    if (noOwner.length)
      warnings.push(`Breached indicators with no owner: ${list(noOwner.map((r) => r.indicator))}.`);
    const summary = {
      indicators: rows,
      counts: {
        red: red.length,
        amber: rows.filter((r) => r.status === 'amber').length,
        green: rows.filter((r) => r.status === 'green').length,
      },
    };
    return result(
      'Early Warning Indicators — key risk indicators with amber and red thresholds (COSO ERM / ISO 31000)',
      summary,
      [
        `Red ${summary.counts.red}, amber ${summary.counts.amber}, green ${summary.counts.green}.`,
        ...rows.map(
          (r) =>
            `- ${r.indicator}: ${r.current} (${r.status}${r.trend ? `, ${r.trend}` : ''}${r.periodsToRed !== null ? `, about ${r.periodsToRed} periods to red` : ''}).`,
        ),
      ],
      warnings,
    );
  },
  computes:
    'Red, amber or green status for each indicator against your thresholds, its direction of travel, and how soon it reaches red at the current pace.',
  limits: 'Values are entered by you; it is not connected to live data.',
};

/* T29 — Risk Register (ISO 31000; COSO ERM) */
const CONTROL = { none: 1, weak: 0.8, adequate: 0.5, strong: 0.3 };
export const riskRegister = {
  fields: [
    F.date('asOf', 'As of (defaults to today)'),
    F.scale('appetite', 'Highest acceptable residual score (1–25)', 1, 25, { default: 9 }),
  ],
  tables: [
    {
      key: 'risks',
      label: 'Risks',
      minRows: 1,
      columns: [
        F.text('risk', 'Risk (cause → event → consequence)', { required: true }),
        F.text('owner', 'Owner'),
        F.scale('likelihood', 'Likelihood (1–5)', 1, 5, { required: true }),
        F.scale('impact', 'Impact (1–5)', 1, 5, { required: true }),
        F.select('controls', 'Control effectiveness', Object.keys(CONTROL), { required: true }),
        F.date('actionDue', 'Next action due'),
        F.bool('actionDone', 'Action complete'),
      ],
    },
  ],
  compute({ asOf, appetite, risks }) {
    const at = asOf ?? today();
    const rows = risks
      .map((r) => {
        const inherent = r.likelihood * r.impact;
        const residual = r1(inherent * CONTROL[r.controls]);
        return {
          ...r,
          inherent,
          residual,
          rating:
            residual >= 15 ? 'critical' : residual >= 9 ? 'high' : residual >= 4 ? 'medium' : 'low',
          overAppetite: residual > appetite,
          actionOverdue: !!(r.actionDue && !r.actionDone && r.actionDue < at),
        };
      })
      .sort((a, b) => b.residual - a.residual);
    const heat = dict();
    for (const r of rows)
      heat[`L${r.likelihood}×I${r.impact}`] = (heat[`L${r.likelihood}×I${r.impact}`] ?? 0) + 1;
    const over = rows.filter((r) => r.overAppetite);
    const overdue = rows.filter((r) => r.actionOverdue);
    const noOwner = rows.filter((r) => !r.owner);
    const warnings = [];
    if (over.length)
      warnings.push(`${over.length} risk(s) sit above the stated appetite of ${appetite}.`);
    if (overdue.length) warnings.push(`Overdue actions: ${list(overdue.map((r) => r.risk))}.`);
    if (noOwner.length) warnings.push(`${noOwner.length} risk(s) have no owner.`);
    warnings.push(
      'Residual score here is an estimate: inherent score reduced by the control rating you chose.',
    );
    const summary = {
      risks: rows,
      heatMap: heat,
      aboveAppetite: over.map((r) => r.risk),
      overdueActions: overdue.map((r) => r.risk),
      withoutOwner: noOwner.map((r) => r.risk),
    };
    return result(
      'Risk Register — ISO 31000 likelihood × impact assessment with residual risk',
      summary,
      [
        `${rows.length} risks; ${over.length} above appetite (${appetite}); ${overdue.length} with overdue actions.`,
        ...rows
          .slice(0, 10)
          .map(
            (r) =>
              `- ${r.risk}: inherent ${r.inherent}, residual ${r.residual} (${r.rating}), controls ${r.controls}, owner ${r.owner || 'none'}.`,
          ),
      ],
      warnings,
    );
  },
  computes:
    'Inherent and estimated residual risk, a heat map, risks above appetite, overdue actions and missing owners.',
  limits:
    'Scores are your judgement; residual risk is estimated from the control rating, not tested.',
};

/* T33 — Commitments & Obligations Register (ISO 37301 §4.5; ISO 44001) */
export const obligations = {
  fields: [F.date('asOf', 'As of (defaults to today)')],
  tables: [
    {
      key: 'items',
      label: 'Commitments',
      minRows: 1,
      columns: [
        F.text('commitment', 'Commitment', { required: true }),
        F.select(
          'type',
          'Type',
          ['contract', 'partnership', 'public pledge', 'regulatory', 'leadership mandate', 'other'],
          { required: true },
        ),
        F.text('counterparty', 'To whom'),
        F.text('owner', 'Owner'),
        F.date('due', 'Due date', { required: true }),
        F.select('status', 'Status', ['not started', 'in progress', 'met', 'missed'], {
          required: true,
        }),
      ],
    },
  ],
  compute({ asOf, items }) {
    const at = asOf ?? today();
    const rows = items
      .map((i) => {
        const left = days(at, i.due);
        const state =
          i.status === 'met'
            ? 'met'
            : i.status === 'missed' || left < 0
              ? 'overdue or missed'
              : left <= 30
                ? 'due within 30 days'
                : 'on schedule';
        return { ...i, daysLeft: left, state };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);
    const overdue = rows.filter((r) => r.state === 'overdue or missed');
    const soon = rows.filter((r) => r.state === 'due within 30 days');
    const notStartedSoon = soon.filter((r) => r.status === 'not started');
    const byType = dict();
    for (const r of rows) byType[r.type] = (byType[r.type] ?? 0) + 1;
    const warnings = [];
    if (overdue.length) warnings.push(`${overdue.length} commitment(s) are overdue or missed.`);
    if (notStartedSoon.length)
      warnings.push(
        `Due within 30 days and not started: ${list(notStartedSoon.map((r) => r.commitment))}.`,
      );
    const noOwner = rows.filter((r) => !r.owner && r.status !== 'met');
    if (noOwner.length) warnings.push(`${noOwner.length} open commitment(s) have no owner.`);
    const decided = rows.filter(
      (r) => r.status === 'met' || r.state === 'overdue or missed',
    ).length;
    const summary = {
      items: rows,
      overdue: overdue.map((r) => r.commitment),
      dueSoon: soon.map((r) => r.commitment),
      keptRatePct: pct(rows.filter((r) => r.status === 'met').length, decided),
      byType,
    };
    return result(
      'Commitments & Obligations Register — obligations register practice (ISO 37301)',
      summary,
      [
        `${rows.length} commitments as of ${at}; kept ${summary.keptRatePct}% of those due so far.`,
        ...overdue.map(
          (r) =>
            `- Overdue: ${r.commitment} (${r.type}${r.counterparty ? `, to ${r.counterparty}` : ''}), ${-r.daysLeft} days.`,
        ),
        ...soon.map((r) => `- Due in ${r.daysLeft} days: ${r.commitment} (${r.status}).`),
      ],
      warnings,
    );
  },
  computes:
    'Which commitments are overdue, due soon or not started, the rate at which commitments have been kept, and missing owners.',
  limits: 'Tracks the commitments you record; it does not read contracts.',
};

/* T34 — Compliance Assessment (ISO 37301) */
export const compliance = {
  fields: [F.date('asOf', 'As of (defaults to today)')],
  tables: [
    {
      key: 'obligations',
      label: 'Compliance obligations',
      minRows: 1,
      columns: [
        F.text('source', 'Law, regulation or policy', { required: true }),
        F.text('obligation', 'Specific obligation', { required: true }),
        F.select('control', 'Control in place', ['none', 'partial', 'full'], { required: true }),
        F.select('evidence', 'Evidence', ['none', 'some', 'documented'], { required: true }),
        F.text('owner', 'Owner'),
        F.date('reviewed', 'Last reviewed'),
      ],
    },
  ],
  compute({ asOf, obligations: obs }) {
    const at = asOf ?? today();
    const rows = obs.map((o) => ({
      ...o,
      evidenced: o.control === 'full' && o.evidence === 'documented',
      gap:
        o.control === 'none'
          ? 'no control'
          : o.control === 'partial'
            ? 'partial control'
            : o.evidence !== 'documented'
              ? 'control not evidenced'
              : null,
      stale: !o.reviewed || days(o.reviewed, at) > 365,
    }));
    const bySource = dict();
    for (const r of rows) {
      const s = (bySource[r.source] ??= { source: r.source, total: 0, evidenced: 0 });
      s.total++;
      if (r.evidenced) s.evidenced++;
    }
    const gaps = rows.filter((r) => r.gap);
    const warnings = [];
    const none = rows.filter((r) => r.gap === 'no control');
    if (none.length) warnings.push(`${none.length} obligation(s) have no control at all.`);
    const stale = rows.filter((r) => r.stale);
    if (stale.length)
      warnings.push(`${stale.length} obligation(s) have not been reviewed in the last 12 months.`);
    const summary = {
      evidencedPct: pct(rows.filter((r) => r.evidenced).length, rows.length),
      bySource: Object.values(bySource).map((s) => ({
        ...s,
        evidencedPct: pct(s.evidenced, s.total),
      })),
      gaps: gaps.map((g) => ({
        source: g.source,
        obligation: g.obligation,
        gap: g.gap,
        owner: g.owner || null,
      })),
      staleReviews: stale.map((r) => r.obligation),
    };
    return result(
      'Compliance Assessment — ISO 37301 compliance management',
      summary,
      [
        `${summary.evidencedPct}% of obligations are fully controlled with documented evidence.`,
        ...summary.bySource.map(
          (s) => `- ${s.source}: ${s.evidencedPct}% evidenced (${s.evidenced} of ${s.total}).`,
        ),
        ...summary.gaps.map((g) => `  · Gap: ${g.obligation} (${g.source}) — ${g.gap}.`),
      ],
      warnings,
    );
  },
  computes:
    'The share of obligations that are controlled and evidenced, gaps by regulation, and reviews older than a year.',
  limits:
    'It does not interpret the law; the obligations and their status are yours. Not a legal opinion.',
};

/* T36 — Business Continuity (ISO 22301 business impact analysis) */
export const bia = {
  fields: [F.date('asOf', 'As of (defaults to today)')],
  tables: [
    {
      key: 'activities',
      label: 'Critical activities',
      minRows: 1,
      columns: [
        F.text('activity', 'Activity', { required: true }),
        F.num('mtpdHours', 'Maximum tolerable disruption (hours)', { required: true, min: 0 }),
        F.num('rtoHours', 'Recovery time objective (hours)', { required: true, min: 0 }),
        F.num('provenHours', 'Recovery time actually achieved in last test (hours)', { min: 0 }),
        F.date('lastTested', 'Last tested'),
        F.bool('alternative', 'Has a workaround or alternative site, supplier or system'),
        F.bool('keyPerson', 'Depends on one person'),
      ],
    },
  ],
  compute({ asOf, activities }) {
    const at = asOf ?? today();
    const rows = activities
      .map((a) => {
        const gaps = [];
        if (a.rtoHours > a.mtpdHours)
          gaps.push('recovery objective is longer than the tolerable disruption');
        if (a.provenHours != null && a.provenHours > a.rtoHours)
          gaps.push(`last test took ${a.provenHours}h against a ${a.rtoHours}h objective`);
        if (!a.lastTested || days(a.lastTested, at) > 365)
          gaps.push('not tested in the last 12 months');
        if (!a.alternative) gaps.push('no workaround or alternative');
        if (a.keyPerson) gaps.push('single-person dependency');
        return { ...a, gaps };
      })
      .sort((a, b) => a.mtpdHours - b.mtpdHours);
    const atRisk = rows.filter((r) => r.gaps.length);
    const warnings = [];
    const invalid = rows.filter((r) => r.rtoHours > r.mtpdHours);
    if (invalid.length)
      warnings.push(
        `For ${list(invalid.map((r) => r.activity))}, the recovery objective exceeds the tolerable disruption: recovery would come too late.`,
      );
    if (atRisk.length)
      warnings.push(`${atRisk.length} of ${rows.length} critical activities have continuity gaps.`);
    const summary = {
      activities: rows,
      readyPct: pct(rows.length - atRisk.length, rows.length),
      recoveryOrder: rows.map((r) => r.activity),
    };
    return result(
      'Business Continuity — ISO 22301 business impact analysis',
      summary,
      [
        `${summary.readyPct}% of critical activities have no continuity gap.`,
        `Recovery priority (shortest tolerable disruption first): ${list(summary.recoveryOrder, 10)}.`,
        ...rows.filter((r) => r.gaps.length).map((r) => `- ${r.activity}: ${r.gaps.join('; ')}.`),
      ],
      warnings,
    );
  },
  computes:
    'Recovery priority, activities whose recovery objective or tested recovery is too slow, untested plans and single-person dependencies.',
  limits: 'Works from the times and test results you record; it does not run a recovery test.',
};

/* T61 — Financial Controls Review (COSO Internal Control – Integrated Framework) */
const FREQ_DAYS = { daily: 30, weekly: 60, monthly: 90, quarterly: 180, yearly: 400 };
export const controls = {
  fields: [F.date('asOf', 'As of (defaults to today)')],
  tables: [
    {
      key: 'controls',
      label: 'Key controls',
      minRows: 1,
      columns: [
        F.text('process', 'Process (e.g. payments, payroll, revenue)', { required: true }),
        F.text('control', 'Control', { required: true }),
        F.text('owner', 'Owner'),
        F.select('frequency', 'Performed', Object.keys(FREQ_DAYS), { required: true }),
        F.date('lastTested', 'Last independently tested'),
        F.select(
          'result',
          'Last test result',
          ['not tested', 'effective', 'deficiency', 'significant deficiency', 'material weakness'],
          { required: true },
        ),
      ],
    },
  ],
  compute({ asOf, controls: cs }) {
    const at = asOf ?? today();
    const rows = cs.map((c) => ({
      ...c,
      testOverdue: !c.lastTested || days(c.lastTested, at) > FREQ_DAYS[c.frequency] * 4,
    }));
    const count = (r) => rows.filter((c) => c.result === r).length;
    const byProcess = dict();
    for (const c of rows) {
      const p = (byProcess[c.process] ??= { process: c.process, controls: 0, effective: 0 });
      p.controls++;
      if (c.result === 'effective') p.effective++;
    }
    const warnings = [];
    if (count('material weakness'))
      warnings.push(
        `${count('material weakness')} material weakness(es): these need board-level attention.`,
      );
    if (count('significant deficiency'))
      warnings.push(`${count('significant deficiency')} significant deficiency(ies).`);
    const untested = rows.filter((c) => c.result === 'not tested' || c.testOverdue);
    if (untested.length)
      warnings.push(`${untested.length} control(s) are untested or overdue for testing.`);
    const noOwner = rows.filter((c) => !c.owner);
    if (noOwner.length) warnings.push(`${noOwner.length} control(s) have no owner.`);
    const summary = {
      effectivePct: pct(count('effective'), rows.length),
      results: {
        effective: count('effective'),
        deficiency: count('deficiency'),
        significantDeficiency: count('significant deficiency'),
        materialWeakness: count('material weakness'),
        notTested: count('not tested'),
      },
      byProcess: Object.values(byProcess).map((p) => ({
        ...p,
        effectivePct: pct(p.effective, p.controls),
      })),
      untestedOrOverdue: untested.map((c) => c.control),
    };
    return result(
      'Financial Controls Review — COSO Internal Control framework deficiency classification',
      summary,
      [
        `${summary.effectivePct}% of key controls tested effective.`,
        ...summary.byProcess.map(
          (p) => `- ${p.process}: ${p.effective} of ${p.controls} effective.`,
        ),
        ...rows
          .filter((c) => !['effective', 'not tested'].includes(c.result))
          .map((c) => `  · ${c.control} (${c.process}): ${c.result}.`),
      ],
      warnings,
    );
  },
  computes:
    'Control effectiveness by process using COSO deficiency levels, plus untested and unowned controls.',
  limits: 'Uses the test results you record; it does not test controls or replace an audit.',
};
