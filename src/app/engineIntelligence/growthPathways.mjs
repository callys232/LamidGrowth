/**
 * GROWTH PATHWAYS — the real engine behind G03.
 *
 * ────────────────────────────────────────────────────────────────
 * WHY THIS IS NOT A DIAGNOSTIC
 *
 * G03 is named "Growth Pathways" but ran the shared four-dimension
 * assessment archetype: rate four abstractions, get a weighted mean.
 * That answers "how good is our growth capability" — a diagnostic
 * question — when the module's name promises "which paths are open to
 * us, and which should we take", which is a RECOMMENDATION.
 *
 * The difference is not cosmetic. A score ranks you against yourself.
 * A recommendation has to compare options against each other, price
 * the risk of each, and respect the fact that you cannot pursue all of
 * them — which a weighted mean cannot express at all.
 *
 * THREE THINGS THIS ENCODES THAT A SCORE CANNOT
 *
 * 1. RISK IS STRUCTURAL, NOT AN OPINION. Ansoff's four quadrants are
 *    not equally risky, and their ordering is one of the most durable
 *    findings in strategy: selling more of what you have to who you
 *    already serve is far more likely to work than selling something
 *    new to someone new. So the quadrant a pathway sits in sets a
 *    base risk the user does not get to argue with — they can only
 *    change it by changing what the pathway IS.
 *
 * 2. CAPACITY IS THE BINDING CONSTRAINT. Most growth strategies fail
 *    on execution bandwidth, not on idea quality. Ranking pathways
 *    without a capacity limit produces a wish list. This returns a
 *    SEQUENCED portfolio under an explicit constraint, and says what
 *    was deferred and why.
 *
 * 3. A PORTFOLIO CAN BE WRONG WHILE EVERY ITEM IN IT IS RIGHT.
 *    Everything in the core business is slow death; everything in
 *    speculative bets is a gamble with no present. Horizon balance is
 *    checked across the selected set, not per pathway.
 * ────────────────────────────────────────────────────────────────
 */

/**
 * @typedef {'penetration'|'market_development'|'product_development'|'diversification'} AnsoffQuadrant
 *   penetration: existing offer → existing market
 *   market_development: existing offer → new market
 *   product_development: new offer → existing market
 *   diversification: new offer → new market
 */

/** 1 = defend the core, 2 = build the emerging, 3 = option on the future.
 * @typedef {1|2|3} Horizon
 */

/** How much of the case rests on evidence rather than assertion.
 * asserted · indicative · evidenced
 * @typedef {0|1|2} Confidence
 */

/**
 * @typedef {Object} PathwayInput
 * @property {string} id
 * @property {string} name
 * @property {AnsoffQuadrant} quadrant
 * @property {Horizon} horizon
 * @property {number} marketAttractiveness 0–5: size, growth and margin of the opportunity itself.
 * @property {number} capabilityFit 0–5: how much of this you can already do with what you have.
 * @property {number} investmentLevel 0–5 relative call on what it takes to pursue. 0 = negligible.
 * @property {number} timeToRevenueMonths Months until it produces revenue. Drives time discounting.
 * @property {Confidence} confidence
 * @property {number} [load] Execution slots this consumes. Defaults to 1.
 */

export const QUADRANTS = [
  {
    id: 'penetration',
    label: 'Market penetration',
    what: 'More of what you already sell, to the market you already serve.',
  },
  {
    id: 'market_development',
    label: 'Market development',
    what: 'What you already sell, taken to a new market or segment.',
  },
  {
    id: 'product_development',
    label: 'Product development',
    what: 'Something new, sold to the customers you already have.',
  },
  {
    id: 'diversification',
    label: 'Diversification',
    what: 'Something new, sold to someone new. Both unknowns at once.',
  },
];

/**
 * Base success likelihood by quadrant.
 *
 * These encode the ordering — penetration safest, diversification
 * riskiest, the two adjacent quadrants in between — which is the
 * durable, well-attested part. The exact multipliers are this
 * implementation's structural judgement, not published constants, and
 * are stated as such wherever the result is shown. What matters is
 * that a diversification play must clear a materially higher bar than
 * a penetration play to rank above it, and here it must.
 */
const QUADRANT_RISK = {
  penetration: 1.0,
  market_development: 0.8,
  product_development: 0.75,
  diversification: 0.55,
};

const CONFIDENCE_FACTOR = { 0: 0.65, 1: 0.85, 2: 1 };

const HORIZON_LABEL = {
  1: 'Horizon 1 — defend and extend the core',
  2: 'Horizon 2 — build the emerging business',
  3: 'Horizon 3 — create options on the future',
};

/**
 * @typedef {Object} ScoredPathway
 * @property {string} id
 * @property {string} name
 * @property {AnsoffQuadrant} quadrant
 * @property {string} quadrantLabel
 * @property {Horizon} horizon
 * @property {number} rawValuePct Attractiveness × capability, before any discounting. 0–100.
 * @property {number} riskAdjustedPct After quadrant risk, confidence and time discounting. The rank key.
 * @property {number} efficiency Risk-adjusted value per unit of investment — what to do FIRST.
 * @property {number} timeToRevenueMonths
 * @property {number} investmentLevel
 * @property {number} load
 * @property {Confidence} confidence
 * @property {string} rationale Plain sentence explaining the discount applied.
 * @property {string|null} blocked Set when the pathway is structurally unviable regardless of score.
 */

/**
 * @typedef {Object} PortfolioSlot
 * @property {ScoredPathway} pathway
 * @property {number} sequence
 * @property {string} why
 */

/**
 * @typedef {Object} GrowthPathwaysResult
 * @property {ScoredPathway[]} scored
 * @property {PortfolioSlot[]} selected What to actually do, in order, inside the capacity constraint.
 * @property {{pathway:ScoredPathway, why:string}[]} deferred Ranked but not selected, each with the reason it was deferred.
 * @property {number} capacity
 * @property {number} capacityUsed
 * @property {{horizon:Horizon, label:string, count:number, sharePct:number}[]} horizonMix
 * @property {string[]} portfolioWarnings Portfolio-level problems — true even when every pathway is sound.
 * @property {string} headline
 * @property {string[]} warnings
 */

const r1 = (n) => Math.round(n * 10) / 10;
const clamp = (v, lo, hi) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : lo;
};

/**
 * Time discounting.
 *
 * Not a financial discount rate — this is strategic patience. Revenue
 * three years out is worth planning for but cannot be counted like
 * revenue this year, because the further out it sits the more of the
 * assumptions have time to stop being true. Tapers rather than
 * collapsing, so a genuinely valuable long play is not scored to zero.
 */
const timeFactor = (months) => {
  const m = Math.max(0, months);
  return 1 / (1 + m / 30);
};

/**
 * @param {PathwayInput[]} inputs
 * @param {number} [capacity]
 */
export function computeGrowthPathways(inputs, capacity = 3) {
  const warnings = [];
  const portfolioWarnings = [];

  const clean = (inputs ?? []).filter((p) => p?.name?.trim());
  if (clean.length === 0) {
    return {
      scored: [],
      selected: [],
      deferred: [],
      capacity,
      capacityUsed: 0,
      horizonMix: [],
      portfolioWarnings: [],
      headline: 'No pathways to compare yet.',
      warnings: [
        'Add at least two candidate pathways — a single option is a proposal, not a choice.',
      ],
    };
  }
  if (clean.length === 1) {
    warnings.push(
      'Only one pathway supplied — a single option is a proposal, not a choice. Add the alternatives you are implicitly rejecting so the comparison is real.',
    );
  }

  const scored = clean.map((p) => {
    const attractiveness = clamp(p.marketAttractiveness, 0, 5);
    const capability = clamp(p.capabilityFit, 0, 5);
    const investment = clamp(p.investmentLevel, 0, 5);
    const months = Math.max(0, Number(p.timeToRevenueMonths) || 0);
    const confidence = clamp(p.confidence, 0, 2);
    const load = Math.max(1, Number(p.load) || 1);
    const quadrant = QUADRANT_RISK[p.quadrant] !== undefined ? p.quadrant : 'diversification';

    /* Value is multiplicative, not additive: a brilliant opportunity you
       cannot execute is worth nothing, and neither is flawless capability
       aimed at a dead market. Adding them would let either cover for the
       absence of the other. */
    const rawValuePct = r1((attractiveness / 5) * (capability / 5) * 100);

    const qFactor = QUADRANT_RISK[quadrant];
    const cFactor = CONFIDENCE_FACTOR[confidence];
    const tFactor = timeFactor(months);
    const riskAdjustedPct = r1(rawValuePct * qFactor * cFactor * tFactor);

    /* Efficiency decides ORDER within the selected set. Two pathways of
       equal value are not equal if one costs a fraction of the other. */
    const efficiency = r1(riskAdjustedPct / Math.max(0.5, investment));

    /* Structural blocks — no score rescues these. */
    let blocked = null;
    if (capability === 0)
      blocked = 'No capability at all. Acquire or partner for it first, or this is a wish.';
    else if (attractiveness === 0)
      blocked = 'The market is rated as having no attractiveness. Nothing downstream can fix that.';

    const parts = [];
    if (qFactor < 1)
      parts.push(
        `${QUADRANTS.find((q) => q.id === quadrant).label.toLowerCase()} carries higher structural risk`,
      );
    if (cFactor < 1)
      parts.push(
        confidence === 0
          ? 'the case is asserted rather than evidenced'
          : 'evidence is indicative only',
      );
    if (tFactor < 0.8) parts.push(`${months} months to revenue`);

    return {
      id: p.id,
      name: p.name.trim(),
      quadrant,
      quadrantLabel: QUADRANTS.find((q) => q.id === quadrant).label,
      horizon: clamp(p.horizon, 1, 3),
      rawValuePct,
      riskAdjustedPct,
      efficiency,
      timeToRevenueMonths: months,
      investmentLevel: investment,
      load,
      confidence,
      rationale: parts.length
        ? `Discounted from ${rawValuePct}% to ${riskAdjustedPct}% — ${parts.join(', ')}.`
        : `No discount applied — existing offer, existing market, evidenced, near-term.`,
      blocked,
    };
  });

  /* ── Selection under capacity ──
     Ranked by risk-adjusted value, then packed by efficiency so the
     cheapest route to the same value goes first. Blocked pathways are
     never selected regardless of where they rank. */
  const cap = Math.max(1, Math.floor(capacity) || 1);
  const rankable = scored
    .filter((p) => !p.blocked)
    .sort((a, b) => b.riskAdjustedPct - a.riskAdjustedPct || b.efficiency - a.efficiency);

  const selected = [];
  const deferred = [];
  let used = 0;

  for (const p of rankable) {
    if (used + p.load <= cap) {
      used += p.load;
      selected.push({
        pathway: p,
        sequence: selected.length + 1,
        why:
          selected.length === 0
            ? `Highest risk-adjusted value at ${p.riskAdjustedPct}%, and ${p.timeToRevenueMonths} months to revenue.`
            : `Risk-adjusted ${p.riskAdjustedPct}%, efficiency ${p.efficiency} per unit of investment.`,
      });
    } else {
      deferred.push({
        pathway: p,
        why: `Capacity is full — this needs ${p.load} slot${p.load > 1 ? 's' : ''} and ${cap - used} remain${cap - used === 1 ? 's' : ''}.`,
      });
    }
  }
  for (const p of scored.filter((x) => x.blocked)) {
    deferred.push({ pathway: p, why: p.blocked });
  }

  /* ── Horizon balance, across the SELECTED set ── */
  const horizonMix = [1, 2, 3].map((h) => {
    const count = selected.filter((s) => s.pathway.horizon === h).length;
    return {
      horizon: h,
      label: HORIZON_LABEL[h],
      count,
      sharePct: selected.length ? r1((count / selected.length) * 100) : 0,
    };
  });

  if (selected.length >= 2) {
    const h1 = horizonMix[0].count,
      h3 = horizonMix[2].count;
    if (h1 === selected.length) {
      portfolioWarnings.push(
        'Every selected pathway defends the existing core. That protects this year and builds nothing for the years after it.',
      );
    }
    if (h1 === 0) {
      portfolioWarnings.push(
        'Nothing selected defends the core. Growth strategies that abandon the business currently paying for them tend not to get finished.',
      );
    }
    if (h3 >= Math.ceil(selected.length / 2)) {
      portfolioWarnings.push(
        'Half or more of the portfolio is speculative. Options on the future are worth holding, but they cannot be the plan.',
      );
    }
    const quadrants = new Set(selected.map((s) => s.pathway.quadrant));
    if (quadrants.size === 1 && selected.length >= 3) {
      portfolioWarnings.push(
        `All ${selected.length} selected pathways sit in ${selected[0].pathway.quadrantLabel.toLowerCase()} — correlated risk, so one wrong assumption takes the whole portfolio.`,
      );
    }
    const totalMonths = selected.map((s) => s.pathway.timeToRevenueMonths);
    if (Math.min(...totalMonths) >= 12) {
      portfolioWarnings.push(
        'Nothing selected produces revenue inside a year. Fund it accordingly, or add something nearer-term to pay for the wait.',
      );
    }
  }

  /* ── Input-quality checks ── */
  const asserted = scored.filter((p) => p.confidence === 0);
  if (asserted.length === scored.length && scored.length > 1) {
    warnings.push(
      'Every pathway is asserted rather than evidenced, so the ranking reflects confidence in opinions, not in evidence.',
    );
  }
  if (scored.every((p) => p.quadrant === scored[0].quadrant) && scored.length > 2) {
    warnings.push(
      `All candidates are ${scored[0].quadrantLabel.toLowerCase()}. The other three Ansoff quadrants are unexamined — that is usually a framing gap, not an absence of options.`,
    );
  }
  if (scored.some((p) => p.blocked)) {
    warnings.push(
      `${scored.filter((p) => p.blocked).length} pathway(s) are structurally blocked and were excluded from selection regardless of score.`,
    );
  }

  const top = selected[0]?.pathway;
  const headline = top
    ? `Start with ${top.name} — ${top.riskAdjustedPct}% risk-adjusted, ${top.timeToRevenueMonths} months to revenue. ${selected.length} of ${scored.length} pathways fit inside a capacity of ${cap}.`
    : 'Nothing is selectable — every candidate is either structurally blocked or exceeds available capacity.';

  return {
    scored: [...scored].sort((a, b) => b.riskAdjustedPct - a.riskAdjustedPct),
    selected,
    deferred,
    capacity: cap,
    capacityUsed: used,
    horizonMix,
    portfolioWarnings,
    headline,
    warnings,
  };
}

/** Deterministic summary the model reads — it never recomputes these. */
export function growthPathwaysToPrompt(r) {
  const lines = [`• ${r.headline}`];
  for (const s of r.selected) {
    lines.push(
      `• DO ${s.sequence}: ${s.pathway.name} (${s.pathway.quadrantLabel}, H${s.pathway.horizon}) — risk-adjusted ${s.pathway.riskAdjustedPct}%. ${s.why}`,
    );
  }
  for (const d of r.deferred.slice(0, 4)) {
    lines.push(`• DEFER: ${d.pathway.name} — ${d.why}`);
  }
  for (const w of r.portfolioWarnings) lines.push(`• PORTFOLIO: ${w}`);
  return lines.join('\n');
}
