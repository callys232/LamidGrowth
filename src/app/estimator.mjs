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
  })
  .strict();

function summarize(rows) {
  const mins = rows.map((r) => r.budget_min);
  const maxes = rows.map((r) => r.budget_max);
  const budgetMin = Math.round(mins.reduce((sum, v) => sum + v, 0) / mins.length);
  const budgetMax = Math.round(maxes.reduce((sum, v) => sum + v, 0) / maxes.length);
  return { budgetMin, budgetMax };
}

export function mountEstimator(app, store) {
  const { db } = store;

  app.post('/api/jobs/estimate', (req, res, next) => {
    try {
      const input = estimateSchema.parse(req.body);
      const categoryRows = db
        .prepare('SELECT budget_min, budget_max, tags FROM job_posts WHERE category = ?')
        .all(input.category);

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
          currency: 'USD',
          basis: 'tag-matched-history',
          sampleSize: tagMatched.length,
          method: 'derived-from-real-platform-data',
        });
      }
      if (categoryRows.length >= MIN_SAMPLE) {
        return res.json({
          available: true,
          ...summarize(categoryRows),
          currency: 'USD',
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
            ? `Not enough completed history in "${input.category}" yet to produce a reliable estimate. Enter your own budget below.`
            : `Only ${categoryRows.length} prior job${categoryRows.length === 1 ? '' : 's'} in "${input.category}" so far — not enough to estimate reliably yet. Enter your own budget below.`,
      });
    } catch (error) {
      next(error);
    }
  });
}
