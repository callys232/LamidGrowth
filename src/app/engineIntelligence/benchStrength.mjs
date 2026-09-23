/**
 * BENCH STRENGTH — the real engine behind A22.
 *
 * ────────────────────────────────────────────────────────────────
 * WHY THIS IS NOT AN ASSESSMENT
 *
 * A22 is named "Leadership Bench Strength" and ran the shared
 * four-dimension archetype: rate four abstractions, get a weighted
 * mean. Applied to succession, a mean is not merely imprecise — it is
 * actively dangerous, and for a reason the module's own name gives
 * away.
 *
 * Succession is a COVERAGE question. For each seat you cannot afford to
 * leave empty, is there someone ready to take it? That is answered per
 * seat, and a seat with nobody is not offset by a seat with three. A
 * weighted mean does exactly that offsetting: eight well-covered roles
 * and two with nothing average to "good bench strength", and the two
 * roles that will actually break the organisation disappear into the
 * arithmetic.
 *
 * This is the same argument that took Q44 off the archetype — a chain
 * is limited by its weakest link, not by the average of its links.
 * Succession is that argument applied to people.
 *
 * FOUR THINGS THIS ENCODES THAT A SCORE CANNOT
 *
 * 1. COVERAGE IS PER SEAT, AND ZERO IS ABSORBING. A critical role with
 *    no ready successor is reported as an uncovered seat no matter how
 *    strong the rest of the bench is. It cannot be averaged away.
 *
 * 2. READINESS IS TIME, NOT A RATING. "Ready in 24 months" is not a
 *    weaker version of "ready now" — it is a different answer to a
 *    different question. Cover is counted against the notice you would
 *    actually get, so a successor who arrives after the seat is empty
 *    does not count as cover.
 *
 * 3. ONE PERSON COVERING FOUR SEATS IS NOT FOUR COVERS. Naming your
 *    strongest deputy as successor everywhere is the most common way a
 *    succession grid flatters itself. Concentration is detected across
 *    the whole plan and reported as a single point of failure.
 *
 * 4. RISK MULTIPLIES COVERAGE, IT DOES NOT ADD TO IT. A well-covered
 *    seat whose incumbent is leaving is an urgent problem; a poorly
 *    covered seat whose incumbent is stable is a planning problem.
 *    Exposure is the product, so neither hides the other.
 * ────────────────────────────────────────────────────────────────
 */

/** How soon a successor could actually hold the seat.
 * @typedef {'now'|'12m'|'24m'|'development'} Readiness
 */

/** Likelihood the incumbent leaves the seat inside a year.
 * @typedef {'low'|'medium'|'high'|'leaving'} FlightRisk
 */

/**
 * @typedef {Object} SuccessorInput
 * @property {string} person Name or identifier. Used to detect one person covering many seats.
 * @property {Readiness} readiness
 * @property {number} [confidence] 0–5: how much of the case rests on assessed evidence.
 */

/**
 * @typedef {Object} RoleInput
 * @property {string} id
 * @property {string} title The seat — "CFO", "Head of Clinical Ops".
 * @property {number} criticality How badly the organisation is hurt if this sits empty. 1–5.
 * @property {FlightRisk} incumbentFlightRisk
 * @property {number} [noticeMonths] Months of notice you would realistically get. Drives what counts.
 * @property {SuccessorInput[]} successors
 */

const READY_MONTHS = {
  now: 0,
  '12m': 12,
  '24m': 24,
  /* Not a duration — an admission that no timeline has been set. Held
     beyond any plausible notice period so it never counts as cover. */
  development: 999,
};

const READINESS_LABEL = {
  now: 'Ready now',
  '12m': 'Ready within 12 months',
  '24m': 'Ready within 24 months',
  development: 'In development, no date',
};

/**
 * Departure likelihood inside a year.
 *
 * These are structural judgements of this implementation, not published
 * constants, and are stated as such wherever the result is shown. What
 * matters is the ordering and that "leaving" is certainty rather than a
 * high probability — a resignation already tendered is not a risk, it
 * is a date.
 */
const RISK_WEIGHT = {
  low: 0.05,
  medium: 0.2,
  high: 0.5,
  leaving: 1,
};

const RISK_LABEL = {
  low: 'Stable',
  medium: 'Some risk',
  high: 'High risk',
  leaving: 'Leaving',
};

/** @typedef {'covered'|'thin'|'uncovered'} CoverState */

/**
 * @typedef {Object} ScoredRole
 * @property {string} id
 * @property {string} title
 * @property {number} criticality
 * @property {FlightRisk} flightRisk
 * @property {string} flightRiskLabel
 * @property {number} noticeMonths
 * @property {{person:string, readiness:Readiness, readinessLabel:string}[]} readyInTime Successors who could hold the seat within the notice period.
 * @property {{person:string, readiness:Readiness, readinessLabel:string}[]} tooLate Named but arriving too late to be cover for this seat.
 * @property {number} coverDepth
 * @property {CoverState} cover
 * @property {number} exposure criticality × departure likelihood × shortfall. The ranking key.
 * @property {string} reading Plain sentence stating what this seat's number means.
 */

/**
 * @typedef {Object} BenchStrengthResult
 * @property {ScoredRole[]} roles
 * @property {ScoredRole[]} uncovered Seats with no successor ready inside the notice period.
 * @property {ScoredRole[]} thin Seats with exactly one. A cover of one is a coin toss, not a plan.
 * @property {ScoredRole[]} priorities Ranked by exposure — where to work first.
 * @property {{person:string, seats:string[]}[]} concentration People named on more than one seat.
 * @property {number} coveredPct
 * @property {number} criticalSeats
 * @property {string} headline
 * @property {string[]} planWarnings True of the plan as a whole, even when every seat looks fine.
 * @property {string[]} warnings
 */

const r1 = (n) => Math.round(n * 10) / 10;
const clamp = (v, lo, hi) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : lo;
};

/** @param {RoleInput[]} inputs */
export function computeBenchStrength(inputs) {
  const warnings = [];
  const planWarnings = [];

  const clean = (inputs ?? []).filter((r) => r?.title?.trim());
  if (clean.length === 0) {
    return {
      roles: [],
      uncovered: [],
      thin: [],
      priorities: [],
      concentration: [],
      coveredPct: 0,
      criticalSeats: 0,
      headline: 'No roles to assess yet.',
      planWarnings: [],
      warnings: [
        'Add the seats you cannot afford to leave empty. Succession cover is measured per seat — there is nothing to average.',
      ],
    };
  }

  const roles = clean.map((r) => {
    const criticality = clamp(r.criticality, 1, 5);
    const flightRisk =
      RISK_WEIGHT[r.incumbentFlightRisk] !== undefined ? r.incumbentFlightRisk : 'medium';
    /* Six months is the default notice for a senior seat. Generous
       rather than pessimistic, so the engine is not manufacturing
       urgency the organisation would not actually face. */
    const noticeMonths = Math.max(0, Number(r.noticeMonths) || 6);

    const named = (r.successors ?? []).filter((s) => s?.person?.trim());
    const readyInTime = named
      .filter((s) => READY_MONTHS[s.readiness] <= noticeMonths)
      .map((s) => ({
        person: s.person.trim(),
        readiness: s.readiness,
        readinessLabel: READINESS_LABEL[s.readiness],
      }));
    const tooLate = named
      .filter((s) => READY_MONTHS[s.readiness] > noticeMonths)
      .map((s) => ({
        person: s.person.trim(),
        readiness: s.readiness,
        readinessLabel: READINESS_LABEL[s.readiness],
      }));

    const coverDepth = readyInTime.length;
    const cover = coverDepth === 0 ? 'uncovered' : coverDepth === 1 ? 'thin' : 'covered';

    /* Shortfall against a bench of two. Two is the target because one
       successor is a single point of failure — that person can decline,
       leave, or be the wrong fit once the seat is actually open. */
    const shortfall = Math.max(0, 2 - coverDepth) / 2;
    const exposure = r1(criticality * RISK_WEIGHT[flightRisk] * shortfall * 20);

    const reading =
      coverDepth === 0
        ? tooLate.length > 0
          ? `No cover inside ${noticeMonths} months. ${tooLate.length} named successor${tooLate.length > 1 ? 's are' : ' is'} further out than the notice you would get.`
          : `No successor named. If this seat empties you are recruiting from cold.`
        : coverDepth === 1
          ? `One successor ready inside ${noticeMonths} months. That is a single point of failure, not a plan — they can decline, leave, or turn out to be the wrong fit once the seat is real.`
          : `${coverDepth} successors ready inside ${noticeMonths} months.`;

    return {
      id: r.id,
      title: r.title.trim(),
      criticality,
      flightRisk,
      flightRiskLabel: RISK_LABEL[flightRisk],
      noticeMonths,
      readyInTime,
      tooLate,
      coverDepth,
      cover,
      exposure,
      reading,
    };
  });

  const uncovered = roles.filter((r) => r.cover === 'uncovered');
  const thin = roles.filter((r) => r.cover === 'thin');
  const priorities = [...roles]
    .filter((r) => r.exposure > 0)
    .sort((a, b) => b.exposure - a.exposure || b.criticality - a.criticality);

  const criticalSeats = roles.filter((r) => r.criticality >= 4).length;
  const coveredPct = r1((roles.filter((r) => r.cover === 'covered').length / roles.length) * 100);

  /* ── Concentration: one person named on many seats ── */
  const bySeat = new Map();
  for (const role of roles) {
    for (const s of role.readyInTime) {
      const key = s.person.toLowerCase();
      bySeat.set(key, [...(bySeat.get(key) ?? []), role.title]);
    }
  }
  const concentration = [...bySeat.entries()]
    .filter(([, seats]) => seats.length > 1)
    .map(([person, seats]) => ({
      person: roles.flatMap((r) => r.readyInTime).find((s) => s.person.toLowerCase() === person)
        .person,
      seats,
    }))
    .sort((a, b) => b.seats.length - a.seats.length);

  /* ── Plan-level problems — true even when seats look individually fine ── */
  for (const c of concentration) {
    if (c.seats.length >= 3) {
      planWarnings.push(
        `${c.person} is the named cover for ${c.seats.length} seats (${c.seats.join(', ')}). They can only take one. Counting them ${c.seats.length} times is how a succession grid flatters itself.`,
      );
    }
  }

  const criticalUncovered = uncovered.filter((r) => r.criticality >= 4);
  if (criticalUncovered.length > 0) {
    planWarnings.push(
      `${criticalUncovered.length} of your most critical seats have no cover inside the notice period: ${criticalUncovered.map((r) => r.title).join(', ')}. No overall score offsets this — a seat with nobody is not repaired by a seat with three.`,
    );
  }

  const leavingUncovered = roles.filter((r) => r.cover !== 'covered' && r.flightRisk === 'leaving');
  if (leavingUncovered.length > 0) {
    planWarnings.push(
      `${leavingUncovered.length} seat${leavingUncovered.length > 1 ? 's are' : ' is'} losing an incumbent without full cover behind them. This is no longer succession planning; it is recruitment with a deadline.`,
    );
  }

  if (roles.length >= 3 && roles.every((r) => r.readyInTime.length === 0)) {
    planWarnings.push(
      'Nothing on this plan is ready inside its own notice period. The grid records intent, not cover.',
    );
  }

  /* ── Input quality ── */
  const noSuccessors = roles.filter((r) => r.readyInTime.length + r.tooLate.length === 0);
  if (noSuccessors.length === roles.length) {
    warnings.push(
      'No successors named on any seat. This reads as a list of roles rather than a succession plan.',
    );
  }
  if (roles.every((r) => r.criticality === roles[0].criticality) && roles.length > 2) {
    warnings.push(
      'Every seat is rated identically for criticality, so the ranking below reflects only flight risk and cover. Differentiate what actually hurts most.',
    );
  }

  const headline =
    uncovered.length > 0
      ? `${uncovered.length} of ${roles.length} seats have no cover inside their notice period.`
      : thin.length > 0
        ? `Every seat has cover, but ${thin.length} rest${thin.length > 1 ? '' : 's'} on a single person.`
        : `All ${roles.length} seats have at least two successors ready inside the notice period.`;

  return {
    roles,
    uncovered,
    thin,
    priorities,
    concentration,
    coveredPct,
    criticalSeats,
    headline,
    planWarnings,
    warnings,
  };
}

/**
 * The result rendered as prose, for the agent layer and the CSV export.
 *
 * Every other engine ships one of these — it is the `working` field, and
 * it is what makes "the arithmetic is shown" and "the export includes
 * the calculation steps" true rather than decorative.
 */
export function benchStrengthToPrompt(r) {
  const out = [r.headline, ''];

  out.push(
    `${r.coveredPct}% of seats have two or more successors ready inside their notice period. ${r.criticalSeats} seat(s) rated critical (4+).`,
  );
  out.push('');

  for (const role of r.roles) {
    out.push(
      `${role.title} — criticality ${role.criticality}/5, incumbent ${role.flightRiskLabel.toLowerCase()}, ${role.noticeMonths} months notice assumed.`,
    );
    out.push(`  ${role.reading}`);
    if (role.readyInTime.length) {
      out.push(
        `  Ready in time: ${role.readyInTime.map((s) => `${s.person} (${s.readinessLabel.toLowerCase()})`).join(', ')}.`,
      );
    }
    if (role.tooLate.length) {
      out.push(
        `  Named but too late: ${role.tooLate.map((s) => `${s.person} (${s.readinessLabel.toLowerCase()})`).join(', ')}.`,
      );
    }
    out.push(
      `  Exposure ${role.exposure} = criticality ${role.criticality} × departure likelihood ${RISK_WEIGHT[role.flightRisk]} × cover shortfall ${Math.max(0, 2 - role.coverDepth) / 2} × 20.`,
    );
  }

  if (r.priorities.length) {
    out.push(
      '',
      `Work in this order: ${r.priorities.map((p) => `${p.title} (${p.exposure})`).join(', ')}.`,
    );
  }
  if (r.planWarnings.length) {
    out.push('', 'Problems with the plan as a whole:');
    for (const w of r.planWarnings) out.push(`  · ${w}`);
  }
  if (r.warnings.length) {
    out.push('', 'Input quality:');
    for (const w of r.warnings) out.push(`  · ${w}`);
  }

  out.push(
    '',
    'Departure likelihoods and the bench-of-two target are structural judgements of this engine, not published constants. What is durable is that a seat with no successor is never offset by a seat with several.',
  );

  return out.join('\n');
}
