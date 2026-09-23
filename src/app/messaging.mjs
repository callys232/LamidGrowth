import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const messageSchema = z.object({ body: z.string().trim().min(1).max(5000) }).strict();

const fail = (message, status) => {
  throw Object.assign(new Error(message), { status });
};

export function mountMessaging(app, store) {
  const { db, transaction } = store;

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
  }
  async function conversationFor(project) {
    let conversation = await db
      .prepare('SELECT * FROM conversations WHERE project_id = ?')
      .get(project.id);
    if (!conversation) {
      const id = randomUUID();
      await db
        .prepare(
          'INSERT INTO conversations (id, workspace_id, subject, created_at, project_id) VALUES (?, ?, ?, ?, ?)',
        )
        .run(id, project.workspace_id, project.title, new Date().toISOString(), project.id);
      conversation = await db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
    }
    return conversation;
  }

  app.get('/api/projects/:id/messages', async (req, res) => {
    const project = await projectFor(req.params.id);
    await requireParty(project, req.user.id);
    const conversation = await db
      .prepare('SELECT * FROM conversations WHERE project_id = ?')
      .get(project.id);
    if (!conversation) return res.json([]);
    res.json(
      await db
        .prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at')
        .all(conversation.id),
    );
  });

  app.post('/api/projects/:id/messages', async (req, res, next) => {
    try {
      const project = await projectFor(req.params.id);
      await requireParty(project, req.user.id);
      const input = messageSchema.parse(req.body);
      const id = randomUUID();
      await transaction(async () => {
        const conversation = await conversationFor(project);
        await db
          .prepare('INSERT INTO messages VALUES (?, ?, ?, ?, ?)')
          .run(id, conversation.id, req.user.id, input.body, new Date().toISOString());
      });
      res.status(201).json(await db.prepare('SELECT * FROM messages WHERE id = ?').get(id));
    } catch (error) {
      next(error);
    }
  });
}
