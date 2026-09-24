import { randomUUID } from 'node:crypto';
import { z } from 'zod';

// Expert Context Handoff & Evidence Return Service (spec 19.1/19.4/19.7, EX-04): least-privilege,
// explicit, revocable context sharing for an engaged expert — distinct from mountHandoff.mjs
// (AI-to-human escalation) and from ordinary project-party access, which only proves someone is
// assigned to a project, not what of the client's broader workspace they were meant to see.
const SCOPE_KINDS = ['objective', 'knowledge'];
const scopeItemSchema = z.object({ kind: z.enum(SCOPE_KINDS), id: z.string().uuid() }).strict();
const createSchema = z.object({ scope: z.array(scopeItemSchema).min(1).max(50) }).strict();

const fail = (message, status) => {
  throw Object.assign(new Error(message), { status });
};

export function mountExpertContextPackage(app, store) {
  const { db, transaction, log } = store;

  async function projectFor(id) {
    const project = await db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!project) fail('Project not found.', 404);
    return project;
  }
  async function requireClient(project, userId) {
    const job = await db.prepare('SELECT * FROM job_posts WHERE id = ?').get(project.job_id);
    if (!job || job.client_user_id !== userId) fail('Only the project owner can manage context handoff.', 403);
    return job;
  }
  async function packageFor(id, workspaceId) {
    const row = await db.prepare('SELECT * FROM context_packages WHERE id = ? AND workspace_id = ?').get(id, workspaceId);
    if (!row) fail('Context package not found.', 404);
    return row;
  }

  app.post('/api/projects/:id/context-package', async (req, res) => {
    const project = await projectFor(req.params.id);
    await requireClient(project, req.user.id);
    if (!project.freelancer_user_id) fail('This project has no engaged expert yet.', 400);
    const input = createSchema.parse(req.body);
    for (const item of input.scope) {
      const exists = await db
        .prepare('SELECT 1 FROM records WHERE id = ? AND workspace_id = ? AND kind = ?')
        .get(item.id, project.workspace_id, item.kind);
      if (!exists) fail(`Referenced ${item.kind} "${item.id}" was not found in this workspace.`, 404);
    }
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    await transaction(async () => {
      await db
        .prepare('INSERT INTO context_packages VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, project.workspace_id, project.id, project.freelancer_user_id, req.user.id, JSON.stringify(input.scope), 'active', createdAt, null);
      await log(project.workspace_id, req.user.name, 'Expert context package granted', id, `${input.scope.length} item(s)`);
    });
    res.status(201).json(await packageFor(id, project.workspace_id));
  });

  app.get('/api/projects/:id/context-package', async (req, res) => {
    const project = await projectFor(req.params.id);
    const isClient = (await db.prepare('SELECT client_user_id FROM job_posts WHERE id = ?').get(project.job_id))?.client_user_id === req.user.id;
    const isExpert = project.freelancer_user_id === req.user.id;
    if (!isClient && !isExpert) fail('You are not a party to this project.', 403);
    const rows = await db
      .prepare('SELECT * FROM context_packages WHERE project_id = ? ORDER BY created_at DESC')
      .all(project.id);
    res.json(rows.map((row) => ({ ...row, scope: JSON.parse(row.scope) })));
  });

  app.post('/api/context-packages/:id/revoke', async (req, res) => {
    const row = await db.prepare('SELECT * FROM context_packages WHERE id = ?').get(req.params.id);
    if (!row) fail('Context package not found.', 404);
    const project = await projectFor(row.project_id);
    await requireClient(project, req.user.id);
    if (row.status === 'revoked') fail('This context package has already been revoked.', 409);
    await db
      .prepare("UPDATE context_packages SET status = 'revoked', revoked_at = ? WHERE id = ?")
      .run(new Date().toISOString(), row.id);
    await log(project.workspace_id, req.user.name, 'Expert context package revoked', row.id, '');
    res.json(await packageFor(row.id, project.workspace_id));
  });

  // Evidence Return: the engaged expert reads exactly the referenced objects, and only while the
  // package is active — revocation takes effect on the very next resolve, not just at grant time.
  app.get('/api/context-packages/:id/resolve', async (req, res) => {
    const row = await db.prepare('SELECT * FROM context_packages WHERE id = ?').get(req.params.id);
    if (!row) fail('Context package not found.', 404);
    if (row.expert_user_id !== req.user.id) fail('This context package was not granted to you.', 403);
    if (row.status !== 'active') fail('This context package has been revoked.', 403);
    const scope = JSON.parse(row.scope);
    const items = [];
    for (const item of scope) {
      const record = await db
        .prepare('SELECT * FROM records WHERE id = ? AND workspace_id = ? AND kind = ?')
        .get(item.id, row.workspace_id, item.kind);
      if (record) items.push({ kind: item.kind, id: record.id, data: JSON.parse(record.data) });
    }
    res.json({ packageId: row.id, items });
  });
}
