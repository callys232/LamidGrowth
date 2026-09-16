export async function requireApprovedModel(store, useCase) {
  const row = await store.db
    .prepare(
      "SELECT * FROM model_registry WHERE use_case = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 1",
    )
    .get(useCase);
  if (!row)
    throw Object.assign(new Error(`No approved model is registered for "${useCase}".`), {
      status: 503,
    });
  return row;
}

export function mountModelRegistry(app, store) {
  app.get('/api/models', async (_req, res) =>
    res.json(await store.db.prepare('SELECT * FROM model_registry ORDER BY use_case').all()),
  );
}
