import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const createSchema = z
  .object({
    summary: z.string().trim().min(1).max(2000),
    learnings: z.string().trim().max(4000).default(''),
    reusableContext: z.string().trim().max(4000).default(''),
  })
  .strict();

// Closes the loop the gap-analysis called "return to OS": what an expert engagement produced
// gets recorded against the client's own workspace, not just left inside the project thread.
export function mountOutcomes(app, store) {
  const { db, transaction, log } = store;

  app.post('/api/projects/:id/outcome', async (req, res) => {
    const project = await db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    if (project.workspace_id !== req.workspace.id) return res.status(403).json({ error: 'This project does not belong to your workspace.' });
    if (await db.prepare('SELECT 1 FROM engagement_outcomes WHERE project_id = ?').get(project.id))
      return res.status(400).json({ error: 'An outcome has already been recorded for this project.' });
    const input = createSchema.parse(req.body);
    const id = randomUUID();
    const now = new Date().toISOString();
    await transaction(async () => {
      await db.prepare('INSERT INTO engagement_outcomes VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        id,
        project.id,
        req.workspace.id,
        req.user.id,
        input.summary,
        input.learnings,
        input.reusableContext,
        now,
      );
      await log(req.workspace.id, req.user.name, 'Engagement outcome recorded', id, project.title);
    });
    res.status(201).json(await db.prepare('SELECT * FROM engagement_outcomes WHERE id = ?').get(id));
  });

  app.get('/api/projects/:id/outcome', async (req, res) => {
    const project = await db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    if (project.workspace_id !== req.workspace.id) return res.status(403).json({ error: 'This project does not belong to your workspace.' });
    res.json((await db.prepare('SELECT * FROM engagement_outcomes WHERE project_id = ?').get(project.id)) ?? null);
  });

  // The workspace-level feed a returning OS context view can read from — every recorded
  // outcome across the workspace's completed engagements, most recent first.
  app.get('/api/workspace/outcomes', async (req, res) => {
    res.json(
      await db
        .prepare(
          `SELECT o.*, p.title AS project_title FROM engagement_outcomes o
           JOIN projects p ON p.id = o.project_id
           WHERE o.workspace_id = ? ORDER BY o.created_at DESC`,
        )
        .all(req.workspace.id),
    );
  });
}
