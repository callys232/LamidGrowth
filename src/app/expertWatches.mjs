import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { JOB_CATEGORIES } from './jobTaxonomy.mjs';

const watchSchema = z
  .object({
    categories: z.array(z.enum(JOB_CATEGORIES)).max(JOB_CATEGORIES.length).default([]),
    keywords: z.string().trim().max(500).default(''),
  })
  .strict()
  .refine((value) => value.categories.length > 0 || value.keywords.length > 0, {
    message: 'A watch needs at least one category or a keyword to match against.',
  });

const fail = (message, status) => {
  throw Object.assign(new Error(message), { status });
};

export function mountExpertWatches(app, store) {
  const { db, transaction, log } = store;

  async function requireExpert(req) {
    const profile = await db.prepare('SELECT 1 FROM talent_profiles WHERE user_id = ?').get(req.user.id);
    if (!profile) fail('Only registered experts (with a talent profile) can use job watches.', 403);
  }
  async function watchFor(id, userId) {
    const row = await db.prepare('SELECT * FROM expert_watches WHERE id = ? AND user_id = ?').get(id, userId);
    if (!row) fail('Job watch not found.', 404);
    return row;
  }

  app.post('/api/talent/watches', async (req, res) => {
    await requireExpert(req);
    const input = watchSchema.parse(req.body);
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    await transaction(async () => {
      await db
        .prepare('INSERT INTO expert_watches VALUES (?, ?, ?, ?, ?)')
        .run(id, req.user.id, JSON.stringify(input.categories), input.keywords, createdAt);
      await log(req.workspace.id, req.user.name, 'Job watch created', id, input.categories.join(', ') || input.keywords);
    });
    res.status(201).json({ id, categories: input.categories, keywords: input.keywords, createdAt });
  });

  app.get('/api/talent/watches', async (req, res) => {
    const rows = await db
      .prepare('SELECT * FROM expert_watches WHERE user_id = ? ORDER BY created_at DESC')
      .all(req.user.id);
    res.json(rows.map((row) => ({ id: row.id, categories: JSON.parse(row.categories), keywords: row.keywords, createdAt: row.created_at })));
  });

  app.delete('/api/talent/watches/:id', async (req, res) => {
    const watch = await watchFor(req.params.id, req.user.id);
    await transaction(async () => {
      await db.prepare('DELETE FROM expert_watch_matches WHERE watch_id = ?').run(watch.id);
      await db.prepare('DELETE FROM expert_watches WHERE id = ?').run(watch.id);
      await log(req.workspace.id, req.user.name, 'Job watch removed', watch.id, '');
    });
    res.status(204).end();
  });

  app.post('/api/talent/watches/:id/scan', async (req, res) => {
    const watch = await watchFor(req.params.id, req.user.id);
    const categories = JSON.parse(watch.categories);
    const clauses = ["status = 'open'", 'created_at > ?'];
    const params = [new Date(watch.created_at).getTime()];
    const orParts = [];
    if (categories.length) {
      orParts.push(`category = ANY(?)`);
      params.push(categories);
    }
    if (watch.keywords) {
      orParts.push(`(title ILIKE ? OR description ILIKE ?)`);
      params.push(`%${watch.keywords}%`, `%${watch.keywords}%`);
    }
    const where = `${clauses.join(' AND ')}${orParts.length ? ` AND (${orParts.join(' OR ')})` : ''}`;
    const jobs = await db
      .prepare(`SELECT * FROM job_posts WHERE ${where} ORDER BY created_at DESC LIMIT 25`)
      .all(...params);
    const inserted = [];
    await transaction(async () => {
      for (const job of jobs) {
        const id = randomUUID();
        const result = await db
          .prepare(
            'INSERT INTO expert_watch_matches VALUES (?, ?, ?, ?, 0) ON CONFLICT (watch_id, job_id) DO NOTHING',
          )
          .run(id, watch.id, job.id, new Date().toISOString());
        if (result.changes > 0) inserted.push({ id, jobId: job.id, title: job.title, category: job.category });
      }
      if (inserted.length)
        await log(req.workspace.id, req.user.name, 'Job watch scan found new matches', watch.id, `${inserted.length} new match(es)`);
    });
    res.json({ newMatches: inserted });
  });

  app.get('/api/talent/watches/:id/matches', async (req, res) => {
    const watch = await watchFor(req.params.id, req.user.id);
    const rows = await db
      .prepare(
        `SELECT m.id, m.job_id, m.matched_at, m.seen, j.title, j.category, j.budget_min, j.budget_max, j.currency
         FROM expert_watch_matches m JOIN job_posts j ON j.id = m.job_id
         WHERE m.watch_id = ? ORDER BY m.matched_at DESC`,
      )
      .all(watch.id);
    res.json(
      rows.map((row) => ({
        id: row.id,
        jobId: row.job_id,
        title: row.title,
        category: row.category,
        budgetMin: row.budget_min,
        budgetMax: row.budget_max,
        currency: row.currency,
        matchedAt: row.matched_at,
        seen: Boolean(row.seen),
      })),
    );
  });
}
