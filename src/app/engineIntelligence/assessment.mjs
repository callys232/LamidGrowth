/**
 * Archetype G — evidence-weighted assessment.
 *
 * 144 modules declare four scored dimensions and had no way to produce them, so
 * the model was asked to invent the numbers. This is the compute layer for that
 * shape: the user rates the module's own dimensions, says how important each is,
 * and states what evidence backs the rating. TypeScript does the rest.
 *
 * The point of difference from a self-assessment questionnaire is the evidence
 * weighting. A dimension rated 5 with nothing to show for it is the single most
 * common failure of self-scoring, so it is discounted and reported rather than
 * taken at face value.
 */

/** none · anecdotal · documented
 * @typedef {0|1|2} EvidenceLevel
 */

/**
 * @typedef {Object} AssessmentRow
 * @property {string} id
 * @property {string} label The module's own dimension label.
 * @property {number} rating 0–5 where 5 is "consistently true across the organisation".
 * @property {number} weight 1–3 — how much this dimension matters for this organisation.
 * @property {EvidenceLevel} evidence What backs the rating up.
 * @property {string} [note]
 */

/**
 * @typedef {Object} AssessmentDimension
 * @property {string} label
 * @property {number} scorePct Rating as a percentage of the 0–5 scale.
 * @property {number} adjustedPct Score after discounting for missing evidence.
 * @property {number} weight
 * @property {EvidenceLevel} evidence
 * @property {boolean} unsupported Rated well above what the evidence supports.
 */

/**
 * @typedef {Object} AssessmentSummary
 * @property {AssessmentDimension[]} dimensions
 * @property {number} indexPct Weighted mean of the raw ratings, 0–100.
 * @property {number} adjustedIndexPct Weighted mean after evidence discounting — the figure to trust.
 * @property {number} evidenceGapPts Gap between the two: how much of the score rests on assertion.
 * @property {AssessmentDimension|null} weakest
 * @property {AssessmentDimension|null} strongest
 * @property {number} spreadPts Spread between best and worst — a high mean can hide a broken dimension.
 * @property {string[]} priorities Dimensions that are both heavily weighted and weakly rated.
 * @property {number} documentedCount
 * @property {string[]} warnings
 */

const MAX_RATING = 5;
const r1 = (n) => Math.round(n * 10) / 10;
const num = (v, lo, hi, dflt) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : dflt;
};

/** Evidence multiplier: unevidenced claims count for less, never for nothing. */
const EVIDENCE_FACTOR = { 0: 0.6, 1: 0.85, 2: 1 };

/** @param {AssessmentRow[]} rows */
export function computeAssessment(rows) {
  const warnings = [];
  const clean = rows.filter((r) => r.label?.trim());

  if (clean.length === 0) {
    return {
      dimensions: [],
      indexPct: 0,
      adjustedIndexPct: 0,
      evidenceGapPts: 0,
      weakest: null,
      strongest: null,
      spreadPts: 0,
      priorities: [],
      documentedCount: 0,
      warnings: ['Rate at least one dimension to produce a score.'],
    };
  }

  const dimensions = clean.map((r) => {
    const rating = num(r.rating, 0, MAX_RATING, 0);
    const weight = num(r.weight, 1, 3, 1);
    const evidence = num(r.evidence, 0, 2, 0);

    const scorePct = r1((rating / MAX_RATING) * 100);
    const adjustedPct = r1(scorePct * EVIDENCE_FACTOR[evidence]);

    return {
      label: r.label.trim(),
      scorePct,
      adjustedPct,
      weight,
      evidence,
      // A strong claim with nothing behind it is the thing worth surfacing.
      unsupported: rating >= 4 && evidence === 0,
    };
  });

  const totalWeight = dimensions.reduce((a, d) => a + d.weight, 0) || 1;
  const indexPct = r1(dimensions.reduce((a, d) => a + d.scorePct * d.weight, 0) / totalWeight);
  const adjustedIndexPct = r1(
    dimensions.reduce((a, d) => a + d.adjustedPct * d.weight, 0) / totalWeight,
  );

  const byScore = [...dimensions].sort((a, b) => a.scorePct - b.scorePct);
  const weakest = byScore[0] ?? null;
  const strongest = byScore[byScore.length - 1] ?? null;
  const spreadPts = weakest && strongest ? r1(strongest.scorePct - weakest.scorePct) : 0;

  /* Where effort pays: heavily weighted and weakly rated. Sorted by the product
     so a critical dimension at 2/5 outranks a minor one at 1/5. */
  const priorities = [...dimensions]
    .filter((d) => d.scorePct < 60)
    .sort((a, b) => b.weight * (100 - b.scorePct) - a.weight * (100 - a.scorePct))
    .slice(0, 3)
    .map((d) => d.label);

  const documentedCount = dimensions.filter((d) => d.evidence === 2).length;
  const unsupported = dimensions.filter((d) => d.unsupported);

  /* ── Checks a reviewer would raise ── */
  if (unsupported.length > 0) {
    warnings.push(
      `${unsupported.length} dimension${unsupported.length > 1 ? 's are' : ' is'} rated 4 or above with no evidence: ${unsupported.map((d) => d.label).join(', ')}. Those scores rest on assertion.`,
    );
  }
  if (spreadPts >= 40 && weakest) {
    warnings.push(
      `${spreadPts} points separate the strongest and weakest dimension — ${weakest.label} is holding the overall score down more than the average suggests.`,
    );
  }
  if (documentedCount === 0) {
    warnings.push(
      'No dimension is backed by documented evidence, so this reads as an opinion rather than an assessment.',
    );
  }
  if (indexPct - adjustedIndexPct >= 15) {
    warnings.push(
      `The score drops ${r1(indexPct - adjustedIndexPct)} points once evidence is accounted for.`,
    );
  }
  if (dimensions.every((d) => d.weight === dimensions[0].weight) && dimensions.length > 2) {
    warnings.push(
      'Every dimension carries the same weight — set what matters most for a sharper priority order.',
    );
  }

  return {
    dimensions,
    indexPct,
    adjustedIndexPct,
    evidenceGapPts: r1(indexPct - adjustedIndexPct),
    weakest,
    strongest,
    spreadPts,
    priorities,
    documentedCount,
    warnings,
  };
}

/** Deterministic summary the model reads — it never recomputes these. */
export function assessmentToPrompt(s) {
  if (s.dimensions.length === 0) return 'No dimensions were rated.';

  const EV = ['no evidence', 'anecdotal', 'documented'];
  const lines = s.dimensions.map(
    (d) =>
      `• ${d.label}: ${d.scorePct}% (weight ${d.weight}, ${EV[d.evidence]}` +
      `${d.unsupported ? ', UNSUPPORTED' : ''}) — evidence-adjusted ${d.adjustedPct}%`,
  );

  lines.push(`• Weighted index: ${s.indexPct}% raw, ${s.adjustedIndexPct}% evidence-adjusted`);
  if (s.weakest) lines.push(`• Weakest: ${s.weakest.label} at ${s.weakest.scorePct}%`);
  if (s.strongest) lines.push(`• Strongest: ${s.strongest.label} at ${s.strongest.scorePct}%`);
  lines.push(`• Spread between best and worst: ${s.spreadPts} points`);
  if (s.priorities.length) lines.push(`• Highest-return priorities: ${s.priorities.join(', ')}`);
  lines.push(`• ${s.documentedCount} of ${s.dimensions.length} dimensions documented`);

  return lines.join('\n');
}
