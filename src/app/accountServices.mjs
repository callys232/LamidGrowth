import { z } from 'zod';
import { requirePermission } from './policy.mjs';

const profileSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    role: z.string().trim().max(160).default(''),
    bio: z.string().trim().max(2000).default(''),
    timezone: z.string().trim().max(80).default(''),
  })
  .strict();
const internalProjectSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(4000).default(''),
    goalId: z.string().uuid().or(z.literal('')).default(''),
    owner: z.string().trim().min(1).max(100),
    dueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .or(z.literal(''))
      .default(''),
    status: z.enum(['In progress', 'Paused', 'Complete']),
    milestones: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            title: z.string().trim().min(1).max(200),
            done: z.boolean(),
          })
          .strict(),
      )
      .min(1)
      .max(30),
  })
  .strict();

export function mountAccountServices(app, store, { verifyCurrentPassword, ecosystemAdminEmails }) {
  const { db, transaction, insert, records, log } = store;
  const personalRows = (userId, kind) =>
    db
      .prepare(
        "SELECT * FROM records WHERE kind = ? AND data::jsonb ->> 'userId' = ? ORDER BY created_at DESC",
      )
      .all(kind, userId);
  app.get('/api/account/profile', async (req, res) => {
    const rows = await personalRows(req.user.id, 'account_profile');
    const details = rows[0] ? JSON.parse(rows[0].data) : {};
    res.json({
      ...details,
      name: req.user.name,
      email: req.user.email,
      context: req.workspace.context,
    });
  });
  app.patch('/api/account/profile', async (req, res) => {
    const input = profileSchema.parse(req.body);
    await transaction(async () => {
      await db
        .prepare('SELECT pg_advisory_xact_lock(hashtext(?))')
        .get(`account-profile:${req.user.id}`);
      const rows = await personalRows(req.user.id, 'account_profile');
      const data = { ...input, userId: req.user.id };
      if (rows[0])
        await db
          .prepare('UPDATE records SET data = ?, version = version + 1 WHERE id = ?')
          .run(JSON.stringify(data), rows[0].id);
      else await insert(req.workspace.id, 'account_profile', data);
      await db.prepare('UPDATE users SET name = ? WHERE id = ?').run(input.name, req.user.id);
      await log(
        req.workspace.id,
        input.name,
        'Personal profile updated',
        req.user.id,
        'Account owner',
      );
    });
    res.json({ ok: true });
  });
  app.get('/api/account/export', async (req, res) => {
    const [profile, talent, credentials, requests, bids, invitations, payoutAccounts, projects] =
      await Promise.all([
        personalRows(req.user.id, 'account_profile'),
        db.prepare('SELECT * FROM talent_profiles WHERE user_id = ?').all(req.user.id),
        db
          .prepare(
            'SELECT * FROM expert_credentials WHERE profile_id IN (SELECT id FROM talent_profiles WHERE user_id = ?)',
          )
          .all(req.user.id),
        personalRows(req.user.id, 'account_deletion_request'),
        db.prepare('SELECT * FROM bids WHERE freelancer_user_id = ?').all(req.user.id),
        db
          .prepare('SELECT * FROM job_invitations WHERE freelancer_user_id = ? OR invited_by = ?')
          .all(req.user.id, req.user.id),
        db
          .prepare(
            'SELECT id, provider, account_name, RIGHT(account_number, 4) AS "lastFour", bank_code, created_at FROM payment_accounts WHERE user_id = ?',
          )
          .all(req.user.id),
        db
          .prepare(
            'SELECT projects.* FROM projects LEFT JOIN job_posts ON job_posts.id = projects.job_id WHERE projects.freelancer_user_id = ? OR job_posts.client_user_id = ?',
          )
          .all(req.user.id, req.user.id),
      ]);
    res.json({
      schemaVersion: 2,
      scope: 'personal',
      exportedAt: new Date().toISOString(),
      account: { id: req.user.id, name: req.user.name, email: req.user.email },
      profile: profile.map((r) => JSON.parse(r.data)),
      talent,
      credentials,
      bids,
      invitations,
      payoutAccounts,
      projects,
      deletionRequests: requests.map((r) => ({
        ...JSON.parse(r.data),
        id: r.id,
        createdAt: r.created_at,
      })),
    });
  });
  app.get('/api/account/deletion-request', async (req, res) => {
    const rows = await personalRows(req.user.id, 'account_deletion_request');
    res.json(
      rows[0]
        ? { ...JSON.parse(rows[0].data), id: rows[0].id, createdAt: rows[0].created_at }
        : null,
    );
  });
  app.post('/api/account/deletion-request', async (req, res) => {
    const input = z
      .object({
        password: z.string().min(1).max(128),
        reason: z.string().trim().max(1000).default(''),
      })
      .strict()
      .parse(req.body);
    if (!(await verifyCurrentPassword(req, input.password)))
      return res.status(403).json({ error: 'Your password is incorrect.' });
    const result = await transaction(async () => {
      await db
        .prepare('SELECT pg_advisory_xact_lock(hashtext(?))')
        .get(`account-deletion:${req.user.id}`);
      const previous = await personalRows(req.user.id, 'account_deletion_request');
      if (previous[0] && ['pending', 'under_review'].includes(JSON.parse(previous[0].data).status))
        return {
          ...JSON.parse(previous[0].data),
          id: previous[0].id,
          createdAt: previous[0].created_at,
        };
      const request = await insert(req.workspace.id, 'account_deletion_request', {
        userId: req.user.id,
        reason: input.reason,
        status: 'pending',
      });
      await log(
        req.workspace.id,
        req.user.name,
        'Account deletion requested',
        request.id,
        'Pending administrator review',
      );
      return request;
    });
    res.status(201).json(result);
  });
  app.get('/api/internal-projects', async (req, res) =>
    res.json(await records(req.workspace.id, 'internal_project')),
  );
  app.get('/api/admin/deletion-requests', async (req, res) => {
    if (!ecosystemAdminEmails.includes((req.user.email || '').toLowerCase()))
      return res.status(403).json({ error: 'Ecosystem administrator access required.' });
    const rows = await db
      .prepare(
        "SELECT records.id, records.data, records.version, records.created_at, users.name, users.email FROM records JOIN users ON users.id = records.data::jsonb ->> 'userId' WHERE records.kind = 'account_deletion_request' ORDER BY records.created_at DESC",
      )
      .all();
    res.json(rows.map(({ data, ...row }) => ({ ...row, ...JSON.parse(data) })));
  });
  app.post('/api/admin/deletion-requests/:id', async (req, res) => {
    if (!ecosystemAdminEmails.includes((req.user.email || '').toLowerCase()))
      return res.status(403).json({ error: 'Ecosystem administrator access required.' });
    const input = z
      .object({
        status: z.enum(['under_review', 'declined']),
        note: z.string().trim().min(1).max(2000),
        version: z.number().int().positive(),
      })
      .strict()
      .parse(req.body);
    await transaction(async () => {
      const row = await db
        .prepare(
          "SELECT * FROM records WHERE id = ? AND kind = 'account_deletion_request' FOR UPDATE",
        )
        .get(req.params.id);
      if (!row || Number(row.version) !== input.version)
        throw Object.assign(new Error('This request changed. Refresh before reviewing.'), {
          status: 409,
        });
      const data = {
        ...JSON.parse(row.data),
        status: input.status,
        reviewNote: input.note,
        reviewedBy: req.user.id,
        reviewedAt: new Date().toISOString(),
      };
      await db
        .prepare('UPDATE records SET data = ?, version = version + 1 WHERE id = ?')
        .run(JSON.stringify(data), row.id);
      await log(row.workspace_id, req.user.name, 'Deletion request reviewed', row.id, input.status);
    });
    res.json({ ok: true });
  });
  async function validateGoal(req, input) {
    if (
      input.goalId &&
      !(await db
        .prepare("SELECT 1 FROM records WHERE id = ? AND workspace_id = ? AND kind = 'objective'")
        .get(input.goalId, req.workspace.id))
    )
      throw Object.assign(new Error('Select a goal in this workspace.'), { status: 400 });
    if (input.status === 'Complete' && input.milestones.some((m) => !m.done))
      throw Object.assign(new Error('Complete all milestones before completing the project.'), {
        status: 400,
      });
  }
  app.post('/api/internal-projects', requirePermission('work:write'), async (req, res) => {
    const input = internalProjectSchema.parse(req.body);
    const result = await transaction(async () => {
      await validateGoal(req, input);
      const project = await insert(req.workspace.id, 'internal_project', input);
      await log(
        req.workspace.id,
        req.user.name,
        'Internal project created',
        project.id,
        input.title,
      );
      return project;
    });
    res.status(201).json(result);
  });
  app.patch('/api/internal-projects/:id', requirePermission('work:write'), async (req, res) => {
    const { version, ...body } = z
      .object({ version: z.number().int().positive() })
      .passthrough()
      .parse(req.body);
    const input = internalProjectSchema.parse(body);
    const result = await transaction(async () => {
      await validateGoal(req, input);
      const row = await db
        .prepare(
          "UPDATE records SET data = ?, version = version + 1 WHERE id = ? AND workspace_id = ? AND kind = 'internal_project' AND version = ? RETURNING *",
        )
        .get(JSON.stringify(input), req.params.id, req.workspace.id, version);
      if (!row)
        throw Object.assign(
          new Error('This project changed or is unavailable. Refresh before saving.'),
          { status: 409 },
        );
      await log(req.workspace.id, req.user.name, 'Internal project updated', row.id, input.title);
      return { ...input, id: row.id, version: row.version, createdAt: row.created_at };
    });
    res.json(result);
  });
  app.delete('/api/internal-projects/:id', requirePermission('work:write'), async (req, res) => {
    const { version } = z.object({ version: z.number().int().positive() }).strict().parse(req.body);
    await transaction(async () => {
      const row = await db
        .prepare(
          "UPDATE records SET kind = 'deleted_internal_project', version = version + 1 WHERE id = ? AND workspace_id = ? AND kind = 'internal_project' AND version = ? RETURNING id",
        )
        .get(req.params.id, req.workspace.id, version);
      if (!row)
        throw Object.assign(
          new Error('This project changed or is unavailable. Refresh before deleting.'),
          { status: 409 },
        );
      await log(
        req.workspace.id,
        req.user.name,
        'Internal project deleted',
        row.id,
        'Account user',
      );
    });
    res.json({ ok: true });
  });
}
