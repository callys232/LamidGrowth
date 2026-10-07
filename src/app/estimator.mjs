import { z } from 'zod';
import { JOB_CATEGORIES, PROJECT_TYPES } from './jobTaxonomy.mjs';

// Deliberately NOT a table of invented per-category dollar figures — a plausible-looking
// number with no market basis is worse than an honest "not enough data yet" (the same
// principle LamidOne's escrow page states explicitly: never show a number you can't back).
// Estimates are derived from REAL historical job_posts on the platform, filtered by category
// and (when available) overlapping smart tags for a more specific match within a broad
// category — never from a static assumption.
const MIN_SAMPLE = 3;

const estimateSchema = z
  .object({
    category: z.enum(JOB_CATEGORIES),
    projectType: z.enum(PROJECT_TYPES).optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .default('USD'),
  })
  .strict();

/** Brings every job's budget into the requested currency with the fx_rates table (the same
 * rates /api/fx/convert uses). Budgets in a currency with no rate are left out rather than
 * averaged in raw — mixing NGN and USD figures used to produce "725,500 USD" for ~$1,000 jobs. */
async function inCurrency(db, rows, currency) {
  const rates = new Map();
  const rateFor = async (from) => {
    if (from === currency) return 1;
    if (!rates.has(from)) {
      const row = await db.prepare('SELECT rate FROM fx_rates WHERE pair = ?').get(`${from}_${currency}`);
      rates.set(from, row ? row.rate : null);
    }
    return rates.get(from);
  };
  const converted = [];
  let excluded = 0;
  for (const row of rows) {
    const rate = await rateFor(row.currency);
    if (rate === null) excluded++;
    else converted.push({ ...row, budget_min: row.budget_min * rate, budget_max: row.budget_max * rate });
  }
  return { rows: converted, excluded };
}

function summarize(rows) {
  const mins = rows.map((r) => r.budget_min);
  const maxes = rows.map((r) => r.budget_max);
  const budgetMin = Math.round(mins.reduce((sum, v) => sum + v, 0) / mins.length);
  const budgetMax = Math.round(maxes.reduce((sum, v) => sum + v, 0) / maxes.length);
  return { budgetMin, budgetMax };
}

export function mountEstimator(app, store) {
  const { db } = store;

  app.post('/api/jobs/estimate', async (req, res, next) => {
    try {
      const input = estimateSchema.parse(req.body);
      const { rows: categoryRows, excluded } = await inCurrency(
        db,
        await db
          .prepare('SELECT budget_min, budget_max, currency, tags FROM job_posts WHERE category = ?')
          .all(input.category),
        input.currency,
      );
      const excludedForCurrency = excluded > 0 ? { excludedForCurrency: excluded } : {};

      let tagMatched = [];
      if (input.tags.length > 0) {
        const requestedTags = new Set(input.tags.map((t) => t.toLowerCase()));
        tagMatched = categoryRows.filter((row) => {
          let rowTags = [];
          try {
            rowTags = JSON.parse(row.tags || '[]');
          } catch {
            rowTags = [];
          }
          return rowTags.some((tag) => requestedTags.has(String(tag).toLowerCase()));
        });
      }

      if (tagMatched.length >= MIN_SAMPLE) {
        return res.json({
          available: true,
          ...summarize(tagMatched),
          currency: input.currency,
          ...excludedForCurrency,
          basis: 'tag-matched-history',
          sampleSize: tagMatched.length,
          method: 'derived-from-real-platform-data',
        });
      }
      if (categoryRows.length >= MIN_SAMPLE) {
        return res.json({
          available: true,
          ...summarize(categoryRows),
          currency: input.currency,
          ...excludedForCurrency,
          basis: 'category-wide-history',
          sampleSize: categoryRows.length,
          note:
            input.tags.length > 0
              ? 'Not enough history for these specific tags yet — this range reflects the broader category instead.'
              : undefined,
          method: 'derived-from-real-platform-data',
        });
      }
      res.json({
        available: false,
        sampleSize: categoryRows.length,
        message:
          categoryRows.length === 0
            ? `Not enough posted jobs in "${input.category}" yet to produce a reliable estimate. Enter your own budget below.`
            : `Only ${categoryRows.length} prior job${categoryRows.length === 1 ? '' : 's'} in "${input.category}" so far — not enough to estimate reliably yet. Enter your own budget below.`,
      });
    } catch (error) {
      next(error);
    }
  });
}
