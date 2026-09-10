import { createHash } from 'node:crypto';
import { z } from 'zod';
import { requirePermission } from './policy.mjs';

const schema = z
  .object({
    title: z.string().trim().min(1).max(200),
    content: z.string().trim().min(1).max(20000),
    objectiveId: z.string().uuid().nullable().default(null),
    sourceType: z.enum(['note', 'text-file']).default('note'),
    sourceName: z.string().trim().max(255).default(''),
    classification: z.enum(['workspace', 'confidential']).default('workspace'),
  })
  .strict();
export function mountKnowledge(app, store) {
  const { db, transaction, insert, records, log } = store;
  function validateObjective(workspace, id) {
    if (
      id &&
      !db
        .prepare("SELECT 1 FROM records WHERE id = ? AND workspace_id = ? AND kind = 'objective'")
        .get(id, workspace)
    )
      throw Object.assign(new Error('Connected objective not found.'), { status: 404 });
  }
  function enrich(input, user) {
    return {
      ...input,
      authorId: user,
      contentHash: createHash('sha256').update(input.content).digest('hex'),
      observedAt: new Date().toISOString(),
    };
  }
  app.get('/api/knowledge', (req, res) => {
    const query = z
      .object({
        q: z.string().trim().max(200).default(''),
        offset: z.coerce.number().int().min(0).max(100000).default(0),
      })
      .strict()
      .parse(req.query);
    const matching = records(req.workspace.id, 'knowledge').filter((item) =>
      `${item.title} ${item.content}`.toLowerCase().includes(query.q.toLowerCase()),
    );
    res.json({ items: matching.slice(query.offset, query.offset + 50), total: matching.length });
  });
  app.post('/api/knowledge', requirePermission('work:write'), (req, res) => {
    const input = schema.parse(req.body);
    const result = transaction(() => {
      validateObjective(req.workspace.id, input.objectiveId);
      const item = insert(req.workspace.id, 'knowledge', enrich(input, req.user.id));
      log(req.workspace.id, req.user.name, 'Knowledge recorded', item.id, input.title);
      return item;
    });
    res.status(201).json(result);
  });
  app.patch('/api/knowledge/:id', requirePermission('work:write'), (req, res) => {
    const { version, ...input } = schema
      .extend({ version: z.number().int().positive() })
      .parse(req.body);
    const result = transaction(() => {
      const row = db
        .prepare("SELECT * FROM records WHERE id = ? AND workspace_id = ? AND kind = 'knowledge'")
        .get(req.params.id, req.workspace.id);
      if (!row) throw Object.assign(new Error('Knowledge not found.'), { status: 404 });
      if (row.version !== version)
        throw Object.assign(
          new Error('This knowledge changed. Reload its latest version before editing.'),
          { status: 409 },
        );
      validateObjective(req.workspace.id, input.objectiveId);
      const updated = enrich(input, req.user.id);
      db.prepare('UPDATE records SET data = ?, version = version + 1 WHERE id = ?').run(
        JSON.stringify(updated),
        row.id,
      );
      log(
        req.workspace.id,
        req.user.name,
        'Knowledge revised',
        row.id,
        `${input.title}; prior version ${version}`,
      );
      return { ...updated, id: row.id, version: version + 1, createdAt: row.created_at };
    });
    res.json(result);
  });
  app.delete('/api/knowledge/:id', requirePermission('work:write'), (req, res) => {
    const { version } = z.object({ version: z.number().int().positive() }).strict().parse(req.body);
    transaction(() => {
      const row = db
        .prepare("SELECT * FROM records WHERE id = ? AND workspace_id = ? AND kind = 'knowledge'")
        .get(req.params.id, req.workspace.id);
      if (!row) throw Object.assign(new Error('Knowledge not found.'), { status: 404 });
      if (row.version !== version)
        throw Object.assign(new Error('This knowledge changed. Reload before deleting.'), {
          status: 409,
        });
      db.prepare('DELETE FROM records WHERE id = ?').run(row.id);
      for (const review of records(req.workspace.id, 'ai_review')) {
        if (review.sources.some((source) => source.id === row.id))
          db.prepare('DELETE FROM records WHERE id = ?').run(review.id);
      }
      log(
        req.workspace.id,
        req.user.name,
        'Knowledge deleted',
        row.id,
        `Removed version ${version}`,
      );
    });
    res.json({ ok: true });
  });
}
