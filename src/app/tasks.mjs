import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const title = z.string().trim().min(1).max(500);
const longText = z.string().trim().max(10000).default('');

const taskSchema = z
  .object({
    title,
    description: longText,
    dueAt: z.string().optional(),
    assigneeUserId: z.string().uuid().optional(),
  })
  .strict();
const taskUpdateSchema = z
  .object({
    title: title.optional(),
    description: longText.optional(),
    status: z.enum(['open', 'in_progress', 'done', 'cancelled']).optional(),
    dueAt: z.string().nullable().optional(),
    assigneeUserId: z.string().uuid().nullable().optional(),
    blocked: z.boolean().optional(),
    blockedReason: longText.optional(),
  })
  .strict();
const changeRequestSchema = z.object({ title, description: longText }).strict();
const changeRequestDecisionSchema = z
  .object({ decision: z.enum(['approve', 'reject']), reason: longText })
  .strict();

const fail = (message, status) => {
  throw Object.assign(new Error(message), { status });
};

// Due within this window counts as "due soon" for attention purposes, not just already-overdue.
const ATTENTION_WINDOW_MS = 48 * 60 * 60 * 1000;

// Deadline Intelligence + Blocker Detector, computed rather than stored: a task's attention state
// is always derived fresh from its current due date and blocked flag, so it can never drift stale.
function attentionFor(task) {
  if (task.status === 'done' || task.status === 'cancelled') return null;
  if (task.blocked) return 'blocked';
  if (!task.due_at) return null;
  const due = new Date(task.due_at).getTime();
  if (Number.isNaN(due)) return null;
  const now = Date.now();
  if (due < now) return 'overdue';
  if (due - now <= ATTENTION_WINDOW_MS) return 'due_soon';
  return null;
}

export function mountTasks(app, store) {
  const { db, transaction, log } = store;

  async function projectFor(id) {
    const project = await db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!project) fail('Project not found.', 404);
    return project;
  }
  async function requireParty(project, userId) {
    const job = await db.prepare('SELECT * FROM job_posts WHERE id = ?').get(project.job_id);
    const isClient = job && job.client_user_id === userId;
    const isFreelancer = project.freelancer_user_id === userId;
    if (!isClient && !isFreelancer) fail('You are not a party to this project.', 403);
    return { job, isClient, isFreelancer };
  }
  async function taskFor(id) {
    const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!task) fail('Task not found.', 404);
    return task;
  }
  const withAttention = (task) => ({ ...task, attention: attentionFor(task) });

  app.get('/api/projects/:id/tasks', async (req, res) => {
    const project = await projectFor(req.params.id);
    await requireParty(project, req.user.id);
    const rows = await db
      .prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at')
      .all(project.id);
    res.json(rows.map(withAttention));
  });

  app.post('/api/projects/:id/tasks', async (req, res) => {
    const project = await projectFor(req.params.id);
    const { job, isClient, isFreelancer } = await requireParty(project, req.user.id);
    void isClient;
    void isFreelancer; // either party may create a task
    const input = taskSchema.parse(req.body);
    if (
      input.assigneeUserId &&
      input.assigneeUserId !== project.freelancer_user_id &&
      input.assigneeUserId !== job?.client_user_id
    )
      fail('The assignee must be a party to this project.', 400);
    const id = randomUUID();
    const now = new Date().toISOString();
    await transaction(async () => {
      await db
        .prepare('INSERT INTO tasks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(
          id,
          project.id,
          input.title,
          input.description,
          'open',
          input.assigneeUserId || null,
          input.dueAt || null,
          0,
          '',
          now,
          now,
        );
      await log(project.workspace_id, req.user.name, 'Task created', id, input.title);
    });
    res.status(201).json(withAttention(await taskFor(id)));
  });

  app.patch('/api/tasks/:id', async (req, res) => {
    const task = await taskFor(req.params.id);
    const project = await projectFor(task.project_id);
    await requireParty(project, req.user.id);
    const input = taskUpdateSchema.parse(req.body);
    const blocked = input.blocked === undefined ? Boolean(task.blocked) : input.blocked;
    const next = {
      title: input.title ?? task.title,
      description: input.description ?? task.description,
      status: input.status ?? task.status,
      due_at: input.dueAt === undefined ? task.due_at : input.dueAt,
      assignee_user_id:
        input.assigneeUserId === undefined ? task.assignee_user_id : input.assigneeUserId,
      blocked: blocked ? 1 : 0,
      blocked_reason: blocked ? (input.blockedReason ?? task.blocked_reason) : '',
    };
    await transaction(async () => {
      await db
        .prepare(
          'UPDATE tasks SET title = ?, description = ?, status = ?, due_at = ?, assignee_user_id = ?, blocked = ?, blocked_reason = ?, updated_at = ? WHERE id = ?',
        )
        .run(
          next.title,
          next.description,
          next.status,
          next.due_at,
          next.assignee_user_id,
          next.blocked,
          next.blocked_reason,
          new Date().toISOString(),
          task.id,
        );
      await log(project.workspace_id, req.user.name, 'Task updated', task.id, next.title);
    });
    res.json(withAttention(await taskFor(task.id)));
  });

  app.delete('/api/tasks/:id', async (req, res) => {
    const task = await taskFor(req.params.id);
    const project = await projectFor(task.project_id);
    await requireParty(project, req.user.id);
    await transaction(async () => {
      await db.prepare('DELETE FROM tasks WHERE id = ?').run(task.id);
      await log(project.workspace_id, req.user.name, 'Task deleted', task.id, task.title);
    });
    res.status(204).end();
  });

  // Follow-Up Manager / Deadline Intelligence / Blocker Detector, consolidated into one endpoint:
  // every open task across the caller's projects that is overdue, due soon, or explicitly
  // blocked — the set a human actually needs to look at, not a dump of every task everywhere.
  // Scoped by party membership, not req.workspace.id: a freelancer is never added as a
  // workspace_member of the client's workspace (see requireParty above), so a workspace filter
  // here would silently hide every attention item from the freelancer's own view.
  app.get('/api/tasks/attention', async (req, res) => {
    const rows = await db
      .prepare(
        `SELECT tasks.*, projects.title AS project_title FROM tasks
         JOIN projects ON projects.id = tasks.project_id
         JOIN job_posts ON job_posts.id = projects.job_id
         WHERE (job_posts.client_user_id = ? OR projects.freelancer_user_id = ?)
           AND tasks.status NOT IN ('done', 'cancelled')
         ORDER BY tasks.due_at ASC NULLS LAST`,
      )
      .all(req.user.id, req.user.id);
    res.json(rows.map(withAttention).filter((task) => task.attention !== null));
  });

  // Change Request Manager
  app.post('/api/projects/:id/change-requests', async (req, res) => {
    const project = await projectFor(req.params.id);
    await requireParty(project, req.user.id);
    const input = changeRequestSchema.parse(req.body);
    const id = randomUUID();
    await transaction(async () => {
      await db
        .prepare('INSERT INTO project_change_requests VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(
          id,
          project.id,
          input.title,
          input.description,
          req.user.id,
          'pending',
          null,
          null,
          '',
          new Date().toISOString(),
        );
      await log(project.workspace_id, req.user.name, 'Change request opened', id, input.title);
    });
    res
      .status(201)
      .json(await db.prepare('SELECT * FROM project_change_requests WHERE id = ?').get(id));
  });

  app.get('/api/projects/:id/change-requests', async (req, res) => {
    const project = await projectFor(req.params.id);
    await requireParty(project, req.user.id);
    res.json(
      await db
        .prepare('SELECT * FROM project_change_requests WHERE project_id = ? ORDER BY created_at DESC')
        .all(project.id),
    );
  });

  app.patch('/api/change-requests/:id/decision', async (req, res) => {
    const changeRequest = await db
      .prepare('SELECT * FROM project_change_requests WHERE id = ?')
      .get(req.params.id);
    if (!changeRequest) fail('Change request not found.', 404);
    const project = await projectFor(changeRequest.project_id);
    const { isClient } = await requireParty(project, req.user.id);
    if (!isClient) fail('Only the project owner can decide a change request.', 403);
    const input = changeRequestDecisionSchema.parse(req.body);
    await transaction(async () => {
      const current = await db
        .prepare('SELECT status FROM project_change_requests WHERE id = ? FOR UPDATE')
        .get(changeRequest.id);
      if (current.status !== 'pending') fail('This change request has already been decided.', 409);
      await db
        .prepare(
          'UPDATE project_change_requests SET status = ?, decided_by = ?, decided_at = ?, decision_reason = ? WHERE id = ?',
        )
        .run(
          input.decision === 'approve' ? 'approved' : 'rejected',
          req.user.id,
          new Date().toISOString(),
          input.reason,
          changeRequest.id,
        );
      await log(
        project.workspace_id,
        req.user.name,
        `Change request ${input.decision}d`,
        changeRequest.id,
        input.reason,
      );
    });
    res.json(
      await db.prepare('SELECT * FROM project_change_requests WHERE id = ?').get(changeRequest.id),
    );
  });
}
