import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { requirePermission } from './policy.mjs';
import { recordOneTimeEcosystemFee } from './billing.mjs';

const applicationSchema = z
  .object({
    headline: z.string().trim().min(1).max(200),
    experience: z.string().trim().max(5000).default(''),
    monthlyRateMinor: z.number().int().nonnegative().max(100000000).default(0),
  })
  .strict();
const decisionSchema = z.object({ decision: z.enum(['approve', 'reject']) }).strict();
const assignSchema = z.object({ userId: z.string().uuid() }).strict();

const fail = (message, status) => {
  throw Object.assign(new Error(message), { status });
};

export function mountConcierge(app, store, { ecosystemAdminEmails }) {
  const { db, transaction, log } = store;
  const isAdmin = (req) => ecosystemAdminEmails.includes((req.user.email || '').toLowerCase());

  app.post('/api/concierge/applications', async (req, res) => {
    const input = applicationSchema.parse(req.body);
    const existing = await db
      .prepare("SELECT 1 FROM concierge_applications WHERE user_id = ? AND status IN ('pending', 'approved')")
      .get(req.user.id);
    if (existing)
      return res.status(409).json({ error: 'You already have a pending or approved concierge application.' });
    const id = randomUUID();
    await transaction(async () => {
      await db.prepare('INSERT INTO concierge_applications VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
        id,
        req.user.id,
        input.headline,
        input.experience,
        'pending',
        null,
        null,
        new Date().toISOString(),
        input.monthlyRateMinor,
      );
      await log(req.workspace.id, req.user.name, 'Concierge application submitted', id, input.headline);
    });
    res.status(201).json(await db.prepare('SELECT * FROM concierge_applications WHERE id = ?').get(id));
  });

  app.get('/api/concierge/applications/mine', async (req, res) => {
    res.json(
      await db
        .prepare('SELECT * FROM concierge_applications WHERE user_id = ? ORDER BY created_at DESC')
        .all(req.user.id),
    );
  });

  app.get('/api/admin/concierge-applications', async (req, res) => {
    if (!isAdmin(req))
      return res.status(403).json({ error: 'Only an ecosystem administrator can view concierge applications.' });
    res.json(
      await db
        .prepare(
          `SELECT concierge_applications.*, users.name AS "applicantName", users.email AS "applicantEmail"
           FROM concierge_applications JOIN users ON users.id = concierge_applications.user_id
           ORDER BY concierge_applications.created_at DESC`,
        )
        .all(),
    );
  });

  app.patch('/api/admin/concierge-applications/:id', async (req, res) => {
    if (!isAdmin(req))
      return res.status(403).json({ error: 'Only an ecosystem administrator can decide concierge applications.' });
    const input = decisionSchema.parse(req.body);
    const application = await db.prepare('SELECT * FROM concierge_applications WHERE id = ?').get(req.params.id);
    if (!application) return res.status(404).json({ error: 'Application not found.' });
    if (application.status !== 'pending')
      return res.status(409).json({ error: 'This application has already been decided.' });
    const status = input.decision === 'approve' ? 'approved' : 'rejected';
    const now = new Date().toISOString();
    await transaction(async () => {
      await db.prepare(
        'UPDATE concierge_applications SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?',
      ).run(status, req.user.id, now, application.id);
      await log(req.workspace.id, req.user.name, `Concierge application ${status}`, application.id, application.headline);
    });
    res.json(await db.prepare('SELECT * FROM concierge_applications WHERE id = ?').get(application.id));
  });

  app.get('/api/concierge/providers', async (req, res) => {
    res.json(
      await db
        .prepare(
          `SELECT users.id, users.name, concierge_applications.headline, concierge_applications.monthly_rate_minor AS "monthlyRateMinor"
           FROM concierge_applications JOIN users ON users.id = concierge_applications.user_id
           WHERE concierge_applications.status = 'approved'`,
        )
        .all(),
    );
  });

  app.post('/api/workspace/concierge', requirePermission('workspace:manage'), async (req, res, next) => {
    try {
      const input = assignSchema.parse(req.body);
      const approved = await db
        .prepare("SELECT 1 FROM concierge_applications WHERE user_id = ? AND status = 'approved'")
        .get(input.userId);
      if (!approved)
        return res.status(400).json({ error: 'That user is not an approved concierge provider.' });
      const activeConcierge = await db
        .prepare(
          "SELECT 1 FROM workspace_members WHERE workspace_id = ? AND role = 'concierge' AND status = 'active'",
        )
        .get(req.workspace.id);
      if (activeConcierge)
        return res.status(409).json({ error: 'This workspace already has an active concierge. Revoke it before assigning a new one.' });
      await transaction(async () => {
        await db.prepare(
          `INSERT INTO workspace_members (workspace_id, user_id, role, status, created_at) VALUES (?, ?, 'concierge', 'active', ?)
           ON CONFLICT(workspace_id, user_id) DO UPDATE SET role = 'concierge', status = 'active'`,
        ).run(req.workspace.id, input.userId, Date.now());
        await recordOneTimeEcosystemFee(store, req.workspace.id);
        await log(req.workspace.id, req.user.name, 'Concierge assigned', input.userId, 'Elevated to workspace:manage authority.');
      });
      res.status(201).json({ ok: true });
    } catch (error) {
      next(error);
    }
  });
}
