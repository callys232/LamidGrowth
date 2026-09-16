import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const createSchema = z
  .object({
    source: z.string().trim().min(1).max(200),
    contextSummary: z.string().trim().min(1).max(4000),
    contextSnapshot: z.record(z.any()).default({}),
    targetUserId: z.string().uuid().nullish(),
    scopingCaseId: z.string().uuid().nullish(),
    projectId: z.string().uuid().nullish(),
  })
  .strict();

const fail = (message, status) => {
  throw Object.assign(new Error(message), { status });
};

// AI agents propose a handoff with the exact context that led to it; a human always decides
// whether to accept. This never lets an agent act as the expert itself — it only hands the
// already-gathered context to one.
export function mountHandoff(app, store) {
  const { db, transaction, log } = store;

  async function handoffFor(id) {
    const row = await db.prepare('SELECT * FROM handoffs WHERE id = ?').get(id);
    if (!row) fail('Handoff not found.', 404);
    return row;
  }

  app.post('/api/handoffs', async (req, res) => {
    const input = createSchema.parse(req.body);
    const id = randomUUID();
    const now = new Date().toISOString();
    await db.prepare('INSERT INTO handoffs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      id,
      req.workspace.id,
      req.user.id,
      input.source,
      input.contextSummary,
      JSON.stringify(input.contextSnapshot),
      input.targetUserId ?? null,
      'pending',
      input.scopingCaseId ?? null,
      input.projectId ?? null,
      now,
      null,
    );
    await log(req.workspace.id, req.user.name, 'AI-to-human handoff requested', id, input.source);
    res.status(201).json(await handoffFor(id));
  });

  app.get('/api/handoffs/mine', async (req, res) => {
    res.json(await db.prepare('SELECT * FROM handoffs WHERE workspace_id = ? ORDER BY created_at DESC').all(req.workspace.id));
  });

  // Open pool for experts: unassigned pending handoffs any qualified expert can pick up, plus
  // anything already routed to them by user_id.
  app.get('/api/handoffs/inbox', async (req, res) => {
    res.json(
      await db
        .prepare(
          `SELECT * FROM handoffs WHERE status = 'pending' AND (target_user_id IS NULL OR target_user_id = ?) ORDER BY created_at`,
        )
        .all(req.user.id),
    );
  });

  app.post('/api/handoffs/:id/accept', async (req, res) => {
    const handoff = await handoffFor(req.params.id);
    if (handoff.status !== 'pending') return res.status(400).json({ error: 'This handoff is no longer pending.' });
    if (handoff.target_user_id && handoff.target_user_id !== req.user.id)
      return res.status(403).json({ error: 'This handoff was routed to a different expert.' });
    await transaction(async () => {
      await db.prepare("UPDATE handoffs SET status = 'accepted', target_user_id = ?, resolved_at = ? WHERE id = ?").run(
        req.user.id,
        new Date().toISOString(),
        handoff.id,
      );
    });
    res.json(await handoffFor(handoff.id));
  });

  app.post('/api/handoffs/:id/decline', async (req, res) => {
    const handoff = await handoffFor(req.params.id);
    if (handoff.status !== 'pending') return res.status(400).json({ error: 'This handoff is no longer pending.' });
    await db.prepare("UPDATE handoffs SET status = 'declined', resolved_at = ? WHERE id = ?").run(new Date().toISOString(), handoff.id);
    res.json(await handoffFor(handoff.id));
  });

  app.post('/api/handoffs/:id/complete', async (req, res) => {
    const handoff = await handoffFor(req.params.id);
    if (handoff.status !== 'accepted') return res.status(400).json({ error: 'Only an accepted handoff can be completed.' });
    if (handoff.target_user_id !== req.user.id) return res.status(403).json({ error: 'You did not accept this handoff.' });
    await db.prepare("UPDATE handoffs SET status = 'completed', resolved_at = ? WHERE id = ?").run(new Date().toISOString(), handoff.id);
    res.json(await handoffFor(handoff.id));
  });
}
