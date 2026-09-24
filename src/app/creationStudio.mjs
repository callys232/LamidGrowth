import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const reviseSchema = z
  .object({ title: z.string().trim().min(1).max(300).optional(), content: z.string().trim().min(1).max(50000) })
  .strict();

const fail = (message, status) => {
  throw Object.assign(new Error(message), { status });
};

export function mountCreationStudio(app, store) {
  const { db, transaction, log } = store;

  async function assetFor(id, workspaceId) {
    const row = await db
      .prepare('SELECT * FROM creation_assets WHERE id = ? AND workspace_id = ?')
      .get(id, workspaceId);
    if (!row) fail('Creation asset not found.', 404);
    return row;
  }
  const rootIdOf = (asset) => asset.root_asset_id || asset.id;

  // Latest-version-per-document catalog. A document's identity is its root chain, not any one
  // version row, so listing shows only the newest revision of each.
  app.get('/api/creation-assets', async (req, res) => {
    const kind = typeof req.query.kind === 'string' ? req.query.kind : null;
    const rows = await db
      .prepare(
        `SELECT DISTINCT ON (COALESCE(root_asset_id, id)) *
         FROM creation_assets WHERE workspace_id = ? ${kind ? 'AND kind = ?' : ''}
         ORDER BY COALESCE(root_asset_id, id), version DESC`,
      )
      .all(...(kind ? [req.workspace.id, kind] : [req.workspace.id]));
    res.json(rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1)));
  });

  app.get('/api/creation-assets/:id', async (req, res) => {
    res.json(await assetFor(req.params.id, req.workspace.id));
  });

  app.get('/api/creation-assets/:id/versions', async (req, res) => {
    const asset = await assetFor(req.params.id, req.workspace.id);
    const rootId = rootIdOf(asset);
    const rows = await db
      .prepare(
        'SELECT * FROM creation_assets WHERE workspace_id = ? AND (id = ? OR root_asset_id = ?) ORDER BY version',
      )
      .all(req.workspace.id, rootId, rootId);
    res.json(rows);
  });

  app.post('/api/creation-assets/:id/revise', async (req, res) => {
    const asset = await assetFor(req.params.id, req.workspace.id);
    const input = reviseSchema.parse(req.body);
    const rootId = rootIdOf(asset);
    const latest = await db
      .prepare(
        'SELECT MAX(version) AS max_version FROM creation_assets WHERE workspace_id = ? AND (id = ? OR root_asset_id = ?)',
      )
      .get(req.workspace.id, rootId, rootId);
    const nextVersion = (latest.max_version || asset.version) + 1;
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    await transaction(async () => {
      await db
        .prepare('INSERT INTO creation_assets VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(
          id,
          req.workspace.id,
          req.user.id,
          asset.kind,
          input.title || asset.title,
          input.content,
          nextVersion,
          rootId,
          asset.job_id,
          asset.proposal_id,
          createdAt,
        );
      await log(req.workspace.id, req.user.name, 'Creation asset revised', id, `${asset.title} v${nextVersion}`);
    });
    res.status(201).json(await assetFor(id, req.workspace.id));
  });

  app.delete('/api/creation-assets/:id', async (req, res) => {
    const asset = await assetFor(req.params.id, req.workspace.id);
    const rootId = rootIdOf(asset);
    await transaction(async () => {
      await db
        .prepare('DELETE FROM creation_assets WHERE workspace_id = ? AND (id = ? OR root_asset_id = ?)')
        .run(req.workspace.id, rootId, rootId);
      await log(req.workspace.id, req.user.name, 'Creation asset deleted', rootId, asset.title);
    });
    res.status(204).end();
  });
}
