import { randomUUID } from 'node:crypto';

// F-AI-01 (spec-review audit): approval previously named only a use case, never the provider/
// model actually executing it, and no record was kept of what really ran. requireApprovedModel
// still gates on a use case having an approved registry row (unchanged), and now additionally
// persists execution provenance — which provider/model actually served this call, under which
// approved registry row — whenever the caller passes the runtime provider and a workspace to
// attribute it to. Callers with no configured provider (the recorded-data-only fallback path)
// pass no provider, so nothing is logged for a call that never actually executed.
export async function requireApprovedModel(store, useCase, { provider, workspaceId } = {}) {
  const row = await store.db
    .prepare(
      "SELECT * FROM model_registry WHERE use_case = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 1",
    )
    .get(useCase);
  if (!row)
    throw Object.assign(new Error(`No approved model is registered for "${useCase}".`), {
      status: 503,
    });
  if (provider && workspaceId) {
    await store.db
      .prepare(
        'INSERT INTO model_executions (id, model_registry_id, workspace_id, use_case, provider, model, executed_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(randomUUID(), row.id, workspaceId, useCase, provider.name || null, provider.model || null, new Date().toISOString());
  }
  return row;
}

export function mountModelRegistry(app, store) {
  app.get('/api/models', async (_req, res) =>
    res.json(await store.db.prepare('SELECT * FROM model_registry ORDER BY use_case').all()),
  );
  // Governance visibility: what actually ran under a use case's approval, not just what's
  // configured — the audit's "persist execution provenance" requirement.
  app.get('/api/models/executions', async (req, res) => {
    const useCase = typeof req.query.useCase === 'string' ? req.query.useCase : null;
    const rows = useCase
      ? await store.db
          .prepare(
            'SELECT * FROM model_executions WHERE workspace_id = ? AND use_case = ? ORDER BY executed_at DESC LIMIT 100',
          )
          .all(req.workspace.id, useCase)
      : await store.db
          .prepare('SELECT * FROM model_executions WHERE workspace_id = ? ORDER BY executed_at DESC LIMIT 100')
          .all(req.workspace.id);
    res.json(rows);
  });
}
