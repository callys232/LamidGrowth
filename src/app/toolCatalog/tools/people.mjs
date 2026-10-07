import {
  F,
  dict,
  r1,
  r2,
  sum,
  mean,
  pct,
  days,
  today,
  money,
  list,
  result,
  ToolInputError,
} from '../schema.mjs';

/* T40 — Skills Gap Analysis (SFIA levels 1–7) */
export const skillsGap = {
  fields: [],
  tables: [
    {
      key: 'skills',
      label: 'Skills by role',
      minRows: 1,
      columns: [
        F.text('role', 'Role or team', { required: true }),
        F.text('skill', 'Skill', { required: true }),
        F.scale('required', 'Level required (SFIA 1–7)', 1, 7, { required: true }),
        F.scale('current', 'Typical level today (1–7)', 1, 7, { required: true }),
        F.int('peopleAtLevel', 'People at or above the required level', { required: true }),
      ],
    },
  ],
  compute({ skills }) {
    const rows = skills
      .map((s) => ({ ...s, gap: Math.max(0, s.required - s.current) }))
      .sort((a, b) => b.gap - a.gap);
    const critical = rows.filter((r) => r.gap >= 2);
    const singleExpert = rows.filter((r) => r.peopleAtLevel <= 1);
    const roles = dict();
    for (const r of rows) {
      const x = (roles[r.role] ??= { role: r.role, skills: 0, met: 0, totalGap: 0 });
      x.skills++;
      if (r.gap === 0) x.met++;
      x.totalGap += r.gap;
    }
    const warnings = [];
    if (critical.length)
      warnings.push(
        `${critical.length} skill(s) are two or more levels short of what the role needs.`,
      );
    if (singleExpert.length)
      warnings.push(
        `Only one person (or nobody) holds the required level for: ${list(singleExpert.map((r) => `${r.skill} (${r.role})`))}.`,
      );
    const summary = {
      coveragePct: pct(rows.filter((r) => r.gap === 0).length, rows.length),
      criticalGaps: critical.map((r) => ({ role: r.role, skill: r.skill, gap: r.gap })),
      singleExpertSkills: singleExpert.map((r) => ({
        role: r.role,
        skill: r.skill,
        people: r.peopleAtLevel,
      })),
      byRole: Object.values(roles).map((x) => ({ ...x, coveragePct: pct(x.met, x.skills) })),
    };
    return result(
      'Skills Gap Analysis — SFIA skill levels',
      summary,
      [
        `${summary.coveragePct}% of required skills are met at the required level.`,
        ...summary.byRole.map(
          (x) => `- ${x.role}: ${x.coveragePct}% covered, total gap ${x.totalGap} levels.`,
        ),
        ...critical.map((c) => `  · Critical gap: ${c.skill} in ${c.role}, ${c.gap} levels short.`),
      ],
      warnings,
    );
  },
  computes:
    'The gap between required and current skill levels by role, coverage, and skills held by only one person.',
  limits: 'Levels are your assessment; it does not test anyone’s skills.',
};

/* T41 — Workforce Plan (ISO 30409) */
export const workforcePlan = {
  fields: [F.text('horizon', 'Planning horizon', { default: '12 months' })],
  tables: [
    {
      key: 'roles',
      label: 'Roles',
      minRows: 1,
      columns: [
        F.text('role', 'Role', { required: true }),
        F.num('current', 'Headcount today', { required: true, min: 0 }),
        F.num('leavers', 'Expected leavers over the horizon', { min: 0, default: 0 }),
        F.num('needed', 'Headcount needed at the end of the horizon', { required: true, min: 0 }),
        F.num('internalReady', 'Internal people who could move in', { min: 0, default: 0 }),
        F.num('weeksToHire', 'Weeks to hire', { min: 0 }),
        F.num('weeksToDevelop', 'Weeks to develop someone internally', { min: 0 }),
      ],
    },
  ],
  compute({ horizon, roles }) {
    roles.forEach((r, i) => {
      if ((r.leavers ?? 0) > r.current)
        throw new ToolInputError(
          `Roles, row ${i + 1}: “Expected leavers” (${r.leavers}) cannot exceed “Headcount today” (${r.current}).`,
        );
    });
    const rows = roles
      .map((r) => {
        const supply = r.current - (r.leavers ?? 0);
        const gap = r1(r.needed - supply);
        const fromInside = gap > 0 ? Math.min(gap, r.internalReady ?? 0) : 0;
        const toHire = gap > 0 ? r1(gap - fromInside) : 0;
        let route =
          gap <= 0
            ? gap < 0
              ? 'surplus: redeploy or reduce'
              : 'balanced'
            : fromInside >= gap
              ? 'develop internally'
              : 'hire and develop';
        if (
          gap > 0 &&
          r.weeksToHire != null &&
          r.weeksToDevelop != null &&
          r.weeksToDevelop > r.weeksToHire * 2 &&
          fromInside > 0
        )
          route = 'hire now, develop for later';
        return { ...r, projectedSupply: supply, gap, fromInside, toHire, route };
      })
      .sort((a, b) => b.gap - a.gap);
    const shortage = rows.filter((r) => r.gap > 0);
    const surplus = rows.filter((r) => r.gap < 0);
    const warnings = [];
    if (shortage.length)
      warnings.push(
        `Shortfall in ${shortage.length} role(s), ${r1(sum(shortage.map((r) => r.gap)))} people in total.`,
      );
    const slow = shortage.filter((r) => (r.weeksToHire ?? 0) > 12);
    if (slow.length)
      warnings.push(`Hiring takes over 12 weeks for: ${list(slow.map((r) => r.role))}. Start now.`);
    const summary = {
      horizon,
      roles: rows,
      totalShortfall: r1(sum(shortage.map((r) => r.gap))),
      totalSurplus: r1(-sum(surplus.map((r) => r.gap))),
      totalToHire: r1(sum(rows.map((r) => r.toHire))),
    };
    return result(
      'Workforce Plan — supply and demand gap analysis (ISO 30409)',
      summary,
      [
        `Over ${horizon}: shortfall ${summary.totalShortfall}, surplus ${summary.totalSurplus}, external hires needed ${summary.totalToHire}.`,
        ...rows.map(
          (r) =>
            `- ${r.role}: need ${r.needed}, projected ${r.projectedSupply} → gap ${r.gap}; ${r.route}${r.toHire ? ` (hire ${r.toHire})` : ''}.`,
        ),
      ],
      warnings,
    );
  },
  computes:
    'Projected supply against demand for each role, the gap, how much internal moves can cover, and the hire or develop route.',
  limits: 'Demand and leaver numbers are your estimates; it does not forecast the business.',
};

/* T43 — Human Capital Metrics (ISO 30414) */
export const humanCapital = {
  fields: [
    F.int('months', 'Months covered', { required: true, min: 1, max: 24 }),
    F.num('avgHeadcount', 'Average headcount', { required: true, min: 1 }),
    F.num('leavers', 'Leavers', { required: true, min: 0 }),
    F.num('voluntaryLeavers', 'Of which voluntary', { min: 0 }),
    F.num('hires', 'External hires', { min: 0 }),
    F.num('avgDaysToFill', 'Average days to fill a vacancy', { min: 0 }),
    F.num('internalMoves', 'Internal moves and promotions', { min: 0 }),
    F.num('trainingCost', 'Training cost', { min: 0 }),
    F.num('trainingHours', 'Training hours', { min: 0 }),
    F.num('absenceDays', 'Days lost to absence', { min: 0 }),
    F.num('workdays', 'Working days per person in the period', { min: 1 }),
    F.num('workforceCost', 'Total workforce cost', { min: 0 }),
    F.num('revenue', 'Revenue', { min: 0 }),
  ],
  tables: [],
  compute(i) {
    const annualise = 12 / i.months;
    const m = {
      turnoverPct: r1((i.leavers / i.avgHeadcount) * 100 * annualise),
      voluntaryTurnoverPct:
        i.voluntaryLeavers != null
          ? r1((i.voluntaryLeavers / i.avgHeadcount) * 100 * annualise)
          : null,
      hiresPerHundred: i.hires != null ? r1((i.hires / i.avgHeadcount) * 100 * annualise) : null,
      avgDaysToFill: i.avgDaysToFill ?? null,
      internalMobilityPct:
        i.internalMoves != null ? r1((i.internalMoves / i.avgHeadcount) * 100 * annualise) : null,
      trainingCostPerPerson:
        i.trainingCost != null ? Math.round((i.trainingCost / i.avgHeadcount) * annualise) : null,
      trainingHoursPerPerson:
        i.trainingHours != null ? r1((i.trainingHours / i.avgHeadcount) * annualise) : null,
      absenceRatePct:
        i.absenceDays != null && i.workdays
          ? r1((i.absenceDays / (i.avgHeadcount * i.workdays)) * 100)
          : null,
      revenuePerPerson:
        i.revenue != null ? Math.round((i.revenue / i.avgHeadcount) * annualise) : null,
      workforceCostSharePct:
        i.revenue && i.workforceCost != null ? pct(i.workforceCost, i.revenue) : null,
    };
    const warnings = [];
    if (m.voluntaryTurnoverPct != null && m.voluntaryTurnoverPct > 15)
      warnings.push(`Voluntary turnover is running at ${m.voluntaryTurnoverPct}% a year.`);
    if (m.absenceRatePct != null && m.absenceRatePct > 4)
      warnings.push(`Absence rate of ${m.absenceRatePct}% is high for most sectors.`);
    if (m.avgDaysToFill != null && m.avgDaysToFill > 60)
      warnings.push('Vacancies take over 60 days to fill on average.');
    warnings.push(
      'Rates are annualised from the months entered; compare with your sector before drawing conclusions.',
    );
    const label = {
      turnoverPct: 'Turnover (annualised)',
      voluntaryTurnoverPct: 'Voluntary turnover',
      hiresPerHundred: 'Hires per 100 staff',
      avgDaysToFill: 'Days to fill',
      internalMobilityPct: 'Internal mobility',
      trainingCostPerPerson: 'Training cost per person (annual)',
      trainingHoursPerPerson: 'Training hours per person (annual)',
      absenceRatePct: 'Absence rate',
      revenuePerPerson: 'Revenue per person (annual)',
      workforceCostSharePct: 'Workforce cost as % of revenue',
    };
    return result(
      'Human Capital Metrics — ISO 30414 core measures',
      m,
      Object.entries(m)
        .filter(([, v]) => v !== null)
        .map(([k, v]) => `- ${label[k]}: ${v}${k.endsWith('Pct') ? '%' : ''}.`),
      warnings,
    );
  },
  computes:
    'The ISO 30414 core people measures you have data for: turnover, hiring, time to fill, mobility, training, absence and productivity.',
  limits: 'Uses the period totals you enter; it does not read HR or payroll systems.',
};

/* T44 — Performance–Potential Grid (9-box) */
const BOX = {
  '3-3': 'Star',
  '3-2': 'High performer',
  '3-1': 'Solid expert',
  '2-3': 'High potential',
  '2-2': 'Core player',
  '2-1': 'Effective',
  '1-3': 'Rough diamond',
  '1-2': 'Inconsistent',
  '1-1': 'Under-performer',
};
export const nineBox = {
  fields: [],
  tables: [
    {
      key: 'people',
      label: 'People or roles',
      minRows: 1,
      columns: [
        F.text('name', 'Person or role', { required: true }),
        F.select(
          'performance',
          'Performance',
          [
            { value: 1, label: '1 — below' },
            { value: 2, label: '2 — meets' },
            { value: 3, label: '3 — exceeds' },
          ],
          { required: true },
        ),
        F.select(
          'potential',
          'Potential',
          [
            { value: 1, label: '1 — limited' },
            { value: 2, label: '2 — moderate' },
            { value: 3, label: '3 — high' },
          ],
          { required: true },
        ),
        F.select('flightRisk', 'Risk of leaving', ['low', 'medium', 'high'], { default: 'low' }),
      ],
    },
  ],
  compute({ people }) {
    const rows = people.map((p) => ({ ...p, box: BOX[`${p.performance}-${p.potential}`] }));
    const dist = dict();
    for (const r of rows) dist[r.box] = (dist[r.box] ?? 0) + 1;
    const keyAtRisk = rows.filter(
      (r) =>
        ['Star', 'High potential', 'High performer'].includes(r.box) && r.flightRisk === 'high',
    );
    const under = rows.filter((r) => r.box === 'Under-performer');
    const warnings = [];
    if (keyAtRisk.length)
      warnings.push(`Key talent at high risk of leaving: ${list(keyAtRisk.map((r) => r.name))}.`);
    if (pct(rows.filter((r) => r.performance === 3).length, rows.length) > 40)
      warnings.push(
        'Over 40% rated as exceeding expectations: ratings may be inflated. Calibrate across managers.',
      );
    warnings.push(
      'Ratings should be calibrated across managers before use in pay or promotion decisions.',
    );
    const summary = {
      distribution: dist,
      people: rows,
      keyTalentAtRisk: keyAtRisk.map((r) => r.name),
      underPerformers: under.map((r) => r.name),
      topTalentPct: pct(
        rows.filter((r) => ['Star', 'High potential', 'High performer'].includes(r.box)).length,
        rows.length,
      ),
    };
    return result(
      'Performance–Potential Grid — 9-box talent review',
      summary,
      [
        `${rows.length} people; ${summary.topTalentPct}% in the top three boxes.`,
        ...Object.entries(dist).map(([b, n]) => `- ${b}: ${n}.`),
        `Key talent at risk of leaving: ${list(summary.keyTalentAtRisk)}.`,
      ],
      warnings,
    );
  },
  computes:
    'Places each person on the 9-box grid, shows the distribution, and flags key talent at risk of leaving.',
  limits: 'Ratings are managers’ judgements; calibrate them before acting.',
};

/* T45 — Engagement Survey (eNPS; UWES-style averages) */
/** Smallest number of responses that may be reported as a group. */
const MIN_GROUP = 5;
export const engagement = {
  fields: [],
  tables: [
    {
      key: 'teams',
      label: 'Survey results by team',
      hint: 'answers to “How likely are you to recommend working here?” (0–10)',
      minRows: 1,
      columns: [
        F.text('team', 'Team', { required: true }),
        F.int('invited', 'People invited', { required: true, min: 1 }),
        F.int('promoters', 'Answered 9–10', { required: true }),
        F.int('passives', 'Answered 7–8', { required: true }),
        F.int('detractors', 'Answered 0–6', { required: true }),
        F.num('engagementAvg', 'Average engagement score (1–5, optional)', { min: 1, max: 5 }),
      ],
    },
  ],
  compute({ teams }) {
    const warnings = [];
    const rows = teams.map((t) => {
      const n = t.promoters + t.passives + t.detractors;
      if (n > t.invited) warnings.push(`${t.team}: more answers than people invited.`);
      return {
        team: t.team,
        responses: n,
        responseRatePct: pct(n, t.invited),
        eNPS: n ? Math.round(((t.promoters - t.detractors) / n) * 100) : null,
        engagementAvg: t.engagementAvg ?? null,
        tooFewToShow: n < MIN_GROUP,
      };
    });
    const tot = (k) => sum(teams.map((t) => t[k]));
    const n = tot('promoters') + tot('passives') + tot('detractors');
    const small = rows.filter((r) => r.tooFewToShow);
    if (small.length)
      warnings.push(
        `Fewer than ${MIN_GROUP} responses in ${list(small.map((r) => r.team))}: do not show these team results, to protect anonymity.`,
      );
    // A hidden team's result can be worked out as the overall minus the shown teams, so the
    // overall is released only when the hidden remainder is itself at least MIN_GROUP responses.
    const hidden = sum(small.map((r) => r.responses));
    const showOverall = n >= MIN_GROUP && (hidden === 0 || hidden >= MIN_GROUP);
    if (!showOverall)
      warnings.push(
        `Overall results withheld: with them, the hidden team results could be worked out.`,
      );
    const lowResponse = rows.filter((r) => r.responseRatePct < 60);
    if (lowResponse.length)
      warnings.push(
        `Response rate under 60% in ${list(lowResponse.map((r) => r.team))}; results may not be representative.`,
      );
    const summary = {
      overallENPS: showOverall
        ? Math.round(((tot('promoters') - tot('detractors')) / n) * 100)
        : null,
      overallResponseRatePct: showOverall ? pct(n, tot('invited')) : null,
      teams: rows.map((r) =>
        r.tooFewToShow ? { team: r.team, responses: r.responses, hidden: true } : r,
      ),
    };
    return result(
      'Engagement Survey — employee Net Promoter Score (−100 to +100)',
      summary,
      [
        showOverall
          ? `Overall eNPS ${summary.overallENPS} from ${n} responses (${summary.overallResponseRatePct}% response rate).`
          : `Overall eNPS withheld to protect anonymity.`,
        ...summary.teams.map((r) =>
          r.hidden
            ? `- ${r.team}: hidden to protect anonymity.`
            : `- ${r.team}: eNPS ${r.eNPS}, response ${r.responseRatePct}%${r.engagementAvg ? `, engagement ${r.engagementAvg}/5` : ''}.`,
        ),
      ],
      warnings,
    );
  },
  computes:
    'eNPS overall and by team from staff answers, response rates, and anonymity protection for small teams.',
  limits:
    'It scores survey results you collected; it does not run the survey or explain the reasons behind scores.',
};

/* T46 — Development ROI (Kirkpatrick four levels; Phillips ROI) */
export const devRoi = {
  fields: [],
  tables: [
    {
      key: 'programmes',
      label: 'Development programmes',
      minRows: 1,
      columns: [
        F.text('programme', 'Programme', { required: true }),
        F.int('participants', 'Participants', { required: true, min: 1 }),
        F.num('cost', 'Total cost', { required: true, min: 0 }),
        F.pct('completion', 'Completion rate (%)'),
        F.num('reaction', 'Level 1 — reaction score (1–5)', { min: 1, max: 5 }),
        F.pct('learning', 'Level 2 — passed assessment (%)'),
        F.pct('behaviour', 'Level 3 — applying it at work (%)'),
        F.num('benefit', 'Level 4 — annual business benefit', { min: 0 }),
        F.pct('attribution', 'Share of benefit due to the programme (%)', { default: 50 }),
        F.pct('confidence', 'Confidence in that estimate (%)', { default: 70 }),
      ],
    },
  ],
  compute({ programmes }) {
    const rows = programmes.map((p) => {
      const net =
        p.benefit != null ? p.benefit * (p.attribution / 100) * (p.confidence / 100) : null;
      return {
        programme: p.programme,
        costPerParticipant: Math.round(p.cost / p.participants),
        levels: {
          reaction: p.reaction ?? null,
          learningPct: p.learning ?? null,
          behaviourPct: p.behaviour ?? null,
        },
        adjustedBenefit: net !== null ? Math.round(net) : null,
        roiPct: net !== null && p.cost ? r1(((net - p.cost) / p.cost) * 100) : null,
        benefitCostRatio: net !== null && p.cost ? r2(net / p.cost) : null,
        evaluatedTo:
          p.benefit != null
            ? 4
            : p.behaviour != null
              ? 3
              : p.learning != null
                ? 2
                : p.reaction != null
                  ? 1
                  : 0,
      };
    });
    const warnings = [];
    const shallow = rows.filter((r) => r.evaluatedTo < 3);
    if (shallow.length)
      warnings.push(
        `${list(shallow.map((r) => r.programme))} is only evaluated to level ${Math.max(...shallow.map((r) => r.evaluatedTo))}. Without behaviour and results data, impact is unknown.`,
      );
    const transfer = rows.filter(
      (r) =>
        r.levels.learningPct != null &&
        r.levels.behaviourPct != null &&
        r.levels.behaviourPct < r.levels.learningPct * 0.5,
    );
    if (transfer.length)
      warnings.push(
        `People learn but do not apply it in: ${list(transfer.map((r) => r.programme))}. Look at manager support and opportunity to practise.`,
      );
    const summary = { programmes: rows };
    return result(
      'Development ROI — Kirkpatrick four levels with Phillips ROI',
      summary,
      rows.map(
        (r) =>
          `- ${r.programme}: evaluated to level ${r.evaluatedTo}; cost per participant ${money(r.costPerParticipant)}; ROI ${r.roiPct ?? '—'}% (benefit adjusted for attribution and confidence).`,
      ),
      warnings,
    );
  },
  computes:
    'Evaluation depth per Kirkpatrick level and Phillips ROI after adjusting the benefit for attribution and confidence.',
  limits: 'Benefit, attribution and confidence are estimates; the ROI is only as good as them.',
};

/* T47 — Competency & 360 Review */
export const review360 = {
  fields: [F.text('person', 'Person reviewed', { required: true })],
  tables: [
    {
      key: 'competencies',
      label: 'Competencies',
      minRows: 1,
      columns: [
        F.text('competency', 'Competency (observable behaviour)', { required: true }),
        F.scale('expected', 'Expected level (1–5)', 1, 5, { required: true }),
        F.num('self', 'Self rating', { required: true, min: 1, max: 5 }),
        F.num('manager', 'Manager rating', { min: 1, max: 5 }),
        F.num('peers', 'Peers average', { min: 1, max: 5 }),
        F.num('reports', 'Direct reports average', { min: 1, max: 5 }),
      ],
    },
  ],
  compute({ person, competencies }) {
    const rows = competencies.map((c) => {
      const others = [c.manager, c.peers, c.reports].filter((v) => v != null);
      const o = others.length ? mean(others) : null;
      return {
        competency: c.competency,
        expected: c.expected,
        self: c.self,
        others: o !== null ? r1(o) : null,
        gap: o !== null ? r1(o - c.expected) : null,
        perception:
          o === null
            ? 'no other ratings'
            : c.self - o >= 1
              ? 'blind spot'
              : o - c.self >= 1
                ? 'hidden strength'
                : 'aligned',
      };
    });
    const warnings = [];
    const blind = rows.filter((r) => r.perception === 'blind spot');
    if (blind.length)
      warnings.push(
        `Blind spots (rates self a full point above others): ${list(blind.map((r) => r.competency))}.`,
      );
    if (rows.every((r) => r.others === null))
      warnings.push('Only a self rating was entered. A 360 needs other raters.');
    const gaps = rows.filter((r) => r.gap !== null && r.gap < 0).sort((a, b) => a.gap - b.gap);
    const summary = {
      person,
      competencies: rows,
      developmentPriorities: gaps.slice(0, 3).map((g) => g.competency),
    };
    return result(
      'Competency & 360 Review — multi-rater feedback against expected levels',
      summary,
      [
        `${person}: development priorities ${list(summary.developmentPriorities)}.`,
        ...rows.map(
          (r) =>
            `- ${r.competency}: expected ${r.expected}, self ${r.self}, others ${r.others ?? '—'} (${r.perception}).`,
        ),
      ],
      warnings,
    );
  },
  computes:
    'Gaps against expected levels using others’ ratings, plus blind spots and hidden strengths where self and others disagree.',
  limits:
    'Ratings are opinions; use them for development conversations, not as a sole basis for pay or dismissal.',
};

/* T48 — Next-Role Readiness */
export const nextRole = {
  fields: [
    F.text('person', 'Person', { required: true }),
    F.text('targetRole', 'Target role', { required: true }),
  ],
  tables: [
    {
      key: 'requirements',
      label: 'Target role requirements',
      minRows: 1,
      columns: [
        F.text('requirement', 'Requirement', { required: true }),
        F.scale('required', 'Level required (1–5)', 1, 5, { required: true }),
        F.scale('current', 'Current level (1–5)', 1, 5, { required: true }),
        F.num('weeks', 'Weeks to close the gap', { min: 0 }),
      ],
    },
  ],
  compute({ person, targetRole, requirements }) {
    const rows = requirements.map((r) => ({ ...r, gap: Math.max(0, r.required - r.current) }));
    const readiness = pct(
      sum(rows.map((r) => Math.min(r.current, r.required))),
      sum(rows.map((r) => r.required)),
    );
    const weeks = Math.max(0, ...rows.filter((r) => r.gap > 0).map((r) => r.weeks ?? 0));
    const label = rows.every((r) => r.gap === 0)
      ? 'ready now'
      : weeks <= 52
        ? 'ready within a year'
        : 'ready in 1–2 years or more';
    const warnings = [];
    if (rows.some((r) => r.gap > 0 && r.weeks == null))
      warnings.push('Some gaps have no time estimate, so the timeline is incomplete.');
    const summary = {
      person,
      targetRole,
      readinessPct: readiness,
      readiness: label,
      longestGapWeeks: weeks,
      gaps: rows.filter((r) => r.gap > 0),
    };
    return result(
      'Next-Role Readiness — requirement gap analysis',
      summary,
      [
        `${person} for ${targetRole}: ${readiness}% of requirements met (${label}).`,
        ...summary.gaps.map(
          (g) => `- ${g.requirement}: ${g.gap} level(s) short, about ${g.weeks ?? '?'} weeks.`,
        ),
      ],
      warnings,
    );
  },
  computes:
    'How far a person meets a target role’s requirements and how long the gaps take to close.',
  limits: 'Levels and timings are your assessment.',
};

/* T49 — Change Readiness (Armenakis & Harris five readiness beliefs; Kotter's 8 steps).
   A published academic model, free to use — no licensed instrument or wording. */
const BELIEFS = [
  ['discrepancy', 'the need for change'],
  ['appropriateness', 'that this is the right change'],
  ['efficacy', 'that they can make it work'],
  ['support', 'that leaders are behind it'],
  ['valence', 'what is in it for them'],
];
const REMEDY = {
  discrepancy: 'explain the problem and the cost of standing still, with evidence',
  appropriateness: 'show why this option beats the alternatives, and invite challenge',
  efficacy: 'provide training, time and early wins so people can see it working',
  support: 'have senior leaders visibly sponsor it and remove blockers',
  valence: 'be honest about personal impact and what people gain or lose',
};
export const readiness = {
  fields: [F.text('change', 'Change', { required: true })],
  tables: [
    {
      key: 'groups',
      label: 'Affected groups',
      hint: 'how strongly each group believes each statement (1 not at all, 5 fully)',
      minRows: 1,
      columns: [
        F.text('group', 'Group', { required: true }),
        F.int('size', 'People', { required: true, min: 1 }),
        F.scale('discrepancy', 'We need to change (1–5)', 1, 5, { required: true }),
        F.scale('appropriateness', 'This is the right change (1–5)', 1, 5, { required: true }),
        F.scale('efficacy', 'We can make it work (1–5)', 1, 5, { required: true }),
        F.scale('support', 'Leaders are behind it (1–5)', 1, 5, { required: true }),
        F.scale('valence', 'It is worth it for me (1–5)', 1, 5, { required: true }),
      ],
    },
  ],
  compute({ change, groups }) {
    const keys = BELIEFS.map(([k]) => k);
    const rows = groups.map((g) => {
      const weakest = [...keys].sort((a, b) => g[a] - g[b])[0];
      return {
        ...g,
        weakestBelief: g[weakest] <= 3 ? weakest : null,
        readinessPct: pct(sum(keys.map((k) => g[k])), 25),
      };
    });
    const people = sum(rows.map((r) => r.size));
    const byBelief = Object.fromEntries(
      keys.map((k) => [k, r1(sum(rows.map((r) => r[k] * r.size)) / people)]),
    );
    const peopleByBarrier = dict();
    for (const r of rows)
      if (r.weakestBelief)
        peopleByBarrier[r.weakestBelief] = (peopleByBarrier[r.weakestBelief] ?? 0) + r.size;
    const warnings = [];
    const unconvinced = rows.filter((r) =>
      ['discrepancy', 'appropriateness'].includes(r.weakestBelief),
    );
    if (unconvinced.length)
      warnings.push(
        `${list(unconvinced.map((r) => r.group))} are not yet convinced the change is needed or right. Training will not help until that is addressed.`,
      );
    const overall = r1(sum(rows.map((r) => r.readinessPct * r.size)) / people);
    if (overall < 60)
      warnings.push(
        `Overall readiness is ${overall}%. Expect strong resistance if the change is pushed now.`,
      );
    const summary = {
      change,
      overallReadinessPct: overall,
      groups: rows,
      weightedByBelief: byBelief,
      peopleByBarrier,
    };
    return result(
      'Change Readiness — Armenakis & Harris five readiness beliefs (weakest belief scored 3 or below is the barrier)',
      summary,
      [
        `${change}: ${people} people across ${rows.length} group(s); overall readiness ${overall}%.`,
        `Average belief: ${BELIEFS.map(([k, label]) => `${label} ${byBelief[k]}`).join('; ')}.`,
        ...rows.map((r) =>
          r.weakestBelief
            ? `- ${r.group} (${r.size}): readiness ${r.readinessPct}%; weakest is belief in ${BELIEFS.find(([k]) => k === r.weakestBelief)[1]} — ${REMEDY[r.weakestBelief]}.`
            : `- ${r.group} (${r.size}): readiness ${r.readinessPct}%; no belief at 3 or below.`,
        ),
      ],
      warnings,
    );
  },
  computes:
    'Readiness of each affected group across the five change beliefs, weighted by group size, and the weakest belief to work on first.',
  limits:
    'Scores are your assessment of each group; ideally ask the groups themselves. Uses a published research model with original wording, not a licensed survey.',
};

/* T50 — Transformation Programme Tracker (PMI programme management; MSP) */
export const programme = {
  fields: [F.date('asOf', 'As of (defaults to today)')],
  tables: [
    {
      key: 'milestones',
      label: 'Milestones',
      minRows: 1,
      columns: [
        F.text('milestone', 'Milestone', { required: true }),
        F.text('owner', 'Owner'),
        F.date('planned', 'Planned date', { required: true }),
        F.date('forecast', 'Current forecast date'),
        F.date('actual', 'Actual date'),
      ],
    },
    {
      key: 'benefits',
      label: 'Benefits',
      minRows: 0,
      columns: [
        F.text('benefit', 'Benefit', { required: true }),
        F.num('planned', 'Planned value', { required: true }),
        F.num('forecast', 'Forecast value', { required: true }),
      ],
    },
  ],
  compute({ asOf, milestones, benefits }) {
    const at = asOf ?? today();
    const ms = milestones.map((m) => {
      const ref = m.actual ?? m.forecast ?? (m.planned < at ? at : m.planned);
      const slip = days(m.planned, ref);
      const state = m.actual
        ? slip > 0
          ? 'done late'
          : 'done on time'
        : m.planned < at
          ? 'overdue'
          : slip > 0
            ? 'forecast late'
            : 'on track';
      return { ...m, slipDays: Math.max(0, slip), state };
    });
    const done = ms.filter((m) => m.actual);
    const bs = benefits.map((b) => ({
      ...b,
      atRisk: b.forecast < b.planned * 0.8,
      forecastPct: b.planned ? pct(b.forecast, b.planned) : null,
    }));
    const warnings = [];
    const overdue = ms.filter((m) => m.state === 'overdue');
    if (overdue.length)
      warnings.push(`Overdue milestones: ${list(overdue.map((m) => m.milestone))}.`);
    if (bs.some((b) => b.atRisk))
      warnings.push(
        `Benefits forecast below 80% of plan: ${list(bs.filter((b) => b.atRisk).map((b) => b.benefit))}.`,
      );
    const summary = {
      deliveredPct: pct(done.length, ms.length),
      onTimePct: pct(done.filter((m) => m.state === 'done on time').length, done.length),
      averageSlipDays: r1(mean(ms.filter((m) => m.slipDays > 0).map((m) => m.slipDays))),
      milestones: ms,
      benefits: bs,
      benefitsForecastPct: pct(sum(bs.map((b) => b.forecast)), sum(bs.map((b) => b.planned))),
    };
    return result(
      'Transformation Programme Tracker — programme milestones and benefits (PMI / MSP)',
      summary,
      [
        `${summary.deliveredPct}% of milestones delivered (${summary.onTimePct}% of those on time); average slip ${summary.averageSlipDays} days.`,
        bs.length
          ? `Benefits forecast at ${summary.benefitsForecastPct}% of plan.`
          : 'No benefits recorded. A programme without measured benefits cannot show it worked.',
        ...ms
          .filter((m) => m.state !== 'done on time' && m.state !== 'on track')
          .map((m) => `- ${m.milestone}: ${m.state}, ${m.slipDays} days.`),
      ],
      warnings,
    );
  },
  computes: 'Milestone delivery and slippage, and benefits forecast against plan.',
  limits: 'Dates and values are what you record; it does not read project plans.',
};
