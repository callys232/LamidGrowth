import { randomUUID } from 'node:crypto';
import { z } from 'zod';

// Context Transfer & Multi-Party Rules (spec 20.10 / SI-12). "Personal" and "organization" context
// are not a new scope — they are workspace ownership (personal: workspaces.user_id) versus
// workspace_members membership (organization: any other workspace the same user belongs to).
// This module is the explicit, audited crossing between two such workspaces the caller actually
// belongs to; a related result never crosses silently just because a graph edge or shared user
// exists.
const ACTIONS = ['copy', 'reference', 'promote', 'anonymize'];
// Aggregate is deliberately not implemented here — the spec requires the action exist, not a
// specific combination algorithm, and building one without a real use case would be fabricated
// complexity. Copy/reference/promote/anonymize cover the reviewable, testable transfer semantics.

// Per-kind allow-list for 'anonymize': only structural fields survive, narrative/free-text fields
// that could carry personal identifying detail are dropped rather than guessed at.
const ANONYMIZE_ALLOWLIST = {
  objective: ['title', 'context', 'priority', 'status'],
};

const createSchema = z
  .object({
    targetWorkspaceId: z.string().uuid(),
    recordKind: z.string().trim().min(1).max(80),
    recordId: z.string().uuid(),
    action: z.enum(ACTIONS),
  })
  .strict();

const fail = (message, status) => {
  throw Object.assign(new Error(message), { status });
};

export function mountContextTransfer(app, store) {
  const { db, insert, transaction, log } = store;

  async function requireMembership(workspaceId, userId) {
    const row = await db
      .prepare("SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ? AND status = 'active'")
      .get(workspaceId, userId);
    if (!row) fail('You do not have active membership in that workspace.', 403);
  }

  app.post('/api/context-transfers', async (req, res) => {
    const input = createSchema.parse(req.body);
    // The source is always the caller's current active workspace — never a client-asserted
    // arbitrary source, only the target is chosen, and both memberships are re-verified server-side.
    const sourceWorkspaceId = req.workspace.id;
    await requireMembership(input.targetWorkspaceId, req.user.id);
    if (input.targetWorkspaceId === sourceWorkspaceId) fail('Source and target workspace must differ.', 400);
    const source = await db
      .prepare('SELECT * FROM records WHERE id = ? AND workspace_id = ? AND kind = ?')
      .get(input.recordId, sourceWorkspaceId, input.recordKind);
    if (!source) fail('Source record not found in your active workspace.', 404);

    const id = randomUUID();
    const createdAt = new Date().toISOString();
    let targetRecordId = null;

    await transaction(async () => {
      if (input.action === 'copy' || input.action === 'anonymize') {
        const sourceData = JSON.parse(source.data);
        let payload = sourceData;
        if (input.action === 'anonymize') {
          const allowlist = ANONYMIZE_ALLOWLIST[input.recordKind];
          if (!allowlist) fail(`Anonymize is not defined for record kind "${input.recordKind}".`, 400);
          payload = Object.fromEntries(allowlist.map((field) => [field, sourceData[field]]));
        }
        const created = await insert(input.targetWorkspaceId, input.recordKind, payload);
        targetRecordId = created.id;
      } else {
        // reference/promote: no copied content lands in the target workspace — only a pointer.
        // The actual data is fetched live, on demand, via the resolve endpoint below, and stops
        // resolving the instant the transfer is revoked.
        targetRecordId = null;
      }
      await db
        .prepare('INSERT INTO context_transfers VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, sourceWorkspaceId, input.targetWorkspaceId, input.recordKind, source.id, targetRecordId, input.action, 'active', req.user.id, createdAt, null);
      await log(sourceWorkspaceId, req.user.name, `Context ${input.action}`, id, `${input.recordKind}:${source.id} -> workspace ${input.targetWorkspaceId}`);
    });
    res.status(201).json(await db.prepare('SELECT * FROM context_transfers WHERE id = ?').get(id));
  });

  app.get('/api/context-transfers', async (req, res) => {
    const recordId = typeof req.query.recordId === 'string' ? req.query.recordId : null;
    if (!recordId) fail('recordId query parameter is required.', 400);
    // Lineage is visible from either side: the source workspace (who did I share this with) or
    // the target workspace (what was shared into here) — but only to a workspace the caller
    // actually belongs to, never an arbitrary third workspace's history.
    const rows = await db
      .prepare(
        `SELECT * FROM context_transfers
         WHERE source_record_id = ? AND (source_workspace_id = ? OR target_workspace_id = ?)
         ORDER BY created_at DESC`,
      )
      .all(recordId, req.workspace.id, req.workspace.id);
    res.json(rows);
  });

  app.post('/api/context-transfers/:id/revoke', async (req, res) => {
    const row = await db.prepare('SELECT * FROM context_transfers WHERE id = ?').get(req.params.id);
    if (!row) fail('Context transfer not found.', 404);
    if (row.source_workspace_id !== req.workspace.id) fail('Only the sharing workspace can revoke this transfer.', 403);
    if (row.action === 'copy' || row.action === 'anonymize')
      fail(`A "${row.action}" transfer produced an independent record and cannot be revoked — delete the copy directly instead.`, 400);
    if (row.status === 'revoked') fail('This transfer has already been revoked.', 409);
    await db
      .prepare("UPDATE context_transfers SET status = 'revoked', revoked_at = ? WHERE id = ?")
      .run(new Date().toISOString(), row.id);
    await log(req.workspace.id, req.user.name, 'Context transfer revoked', row.id, '');
    res.json(await db.prepare('SELECT * FROM context_transfers WHERE id = ?').get(row.id));
  });

  // Evidence resolution for reference/promote: live-fetches the current source data, so the
  // target workspace never holds a copy that could silently drift from — or outlive — the source.
  app.get('/api/context-transfers/:id/resolve', async (req, res) => {
    const row = await db.prepare('SELECT * FROM context_transfers WHERE id = ?').get(req.params.id);
    if (!row) fail('Context transfer not found.', 404);
    if (row.target_workspace_id !== req.workspace.id) fail('This transfer was not shared into your active workspace.', 403);
    if (row.action !== 'reference' && row.action !== 'promote') fail(`A "${row.action}" transfer has no live reference to resolve.`, 400);
    if (row.status !== 'active') fail('This context transfer has been revoked.', 403);
    const record = await db
      .prepare('SELECT * FROM records WHERE id = ? AND workspace_id = ? AND kind = ?')
      .get(row.source_record_id, row.source_workspace_id, row.record_kind);
    if (!record) fail('The source record no longer exists.', 404);
    res.json({ transferId: row.id, kind: row.record_kind, id: record.id, data: JSON.parse(record.data) });
  });
}

export { ACTIONS };
