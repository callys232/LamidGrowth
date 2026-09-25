import { randomUUID } from 'node:crypto';
import { z } from 'zod';

// Recommendation Lifecycle Manager (spec 20.8, Book 24 SI-10): recommended -> accepted/declined/
// deferred -> scheduled -> in_progress -> completed -> superseded, with invalidated reachable from
// any non-terminal state (e.g. by the Change Impact Analyzer when upstream data changes).
const TERMINAL = new Set(['declined', 'invalidated', 'superseded']);
const TRANSITIONS = {
  recommended: ['accepted', 'declined', 'deferred', 'invalidated'],
  deferred: ['recommended', 'declined', 'invalidated'],
  accepted: ['scheduled', 'in_progress', 'completed', 'invalidated'],
  scheduled: ['in_progress', 'invalidated'],
  in_progress: ['completed', 'invalidated'],
  completed: ['superseded'],
  declined: [],
  invalidated: [],
  superseded: [],
};

export async function createRecommendation(
  store,
  { workspaceId, subjectKind, subjectId, agentId, title, rationale = '' },
) {
  const id = randomUUID();
  const now = new Date().toISOString();
  await store.db
    .prepare('INSERT INTO recommendations VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, workspaceId, subjectKind, subjectId, agentId, title, rationale, 'recommended', null, now, now);
  return { id, status: 'recommended', createdAt: now };
}

// Change Impact Analyzer's write side: when the subject a recommendation was about materially
// changes, the recommendation cannot be silently left looking current — it is invalidated, never
// deleted, preserving history per the lineage rule (20.5/20.9). F-SI-05: a completed
// recommendation is a preserved historical fact, not a live claim about the subject's current
// state — it must not be silently flipped to invalidated by a later, unrelated change.
export async function invalidateRecommendations(store, { workspaceId, subjectKind, subjectId }) {
  const rows = await store.db
    .prepare(
      `SELECT id, status FROM recommendations
       WHERE workspace_id = ? AND subject_kind = ? AND subject_id = ? AND status NOT IN ('declined', 'invalidated', 'superseded', 'completed')`,
    )
    .all(workspaceId, subjectKind, subjectId);
  const now = new Date().toISOString();
  for (const row of rows) {
    await store.db.prepare('UPDATE recommendations SET status = ?, updated_at = ? WHERE id = ?').run('invalidated', now, row.id);
  }
  return rows.length;
}

const statusSchema = z
  .object({
    status: z.enum(Object.keys(TRANSITIONS)),
    reason: z.string().trim().max(2000).default(''),
    // F-SI-05: scheduling a recommendation previously had no way to record *when* — scheduled_for
    // existed in the schema and was read nowhere it could be set. Required exactly when the
    // transition target is 'scheduled', so a recommendation can't sit "scheduled" with no date.
    scheduledFor: z.string().datetime().nullish(),
  })
  .strict();
const querySchema = z.object({ subjectKind: z.string().trim().min(1).max(80), subjectId: z.string().trim().min(1).max(200) }).strict();

const fail = (message, status) => {
  throw Object.assign(new Error(message), { status });
};

export function mountRecommendations(app, store) {
  const { db, log } = store;

  app.get('/api/recommendations', async (req, res) => {
    const query = querySchema.parse(req.query);
    const rows = await db
      .prepare(
        'SELECT * FROM recommendations WHERE workspace_id = ? AND subject_kind = ? AND subject_id = ? ORDER BY created_at DESC',
      )
      .all(req.workspace.id, query.subjectKind, query.subjectId);
    res.json(
      rows.map((row) => ({
        id: row.id,
        agentId: row.agent_id,
        title: row.title,
        rationale: row.rationale,
        status: row.status,
        scheduledFor: row.scheduled_for,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    );
  });

  app.patch('/api/recommendations/:id/status', async (req, res) => {
    const row = await db
      .prepare('SELECT * FROM recommendations WHERE id = ? AND workspace_id = ?')
      .get(req.params.id, req.workspace.id);
    if (!row) fail('Recommendation not found.', 404);
    const input = statusSchema.parse(req.body);
    if (TERMINAL.has(row.status)) fail(`This recommendation is already "${row.status}" and cannot change further.`, 409);
    if (!TRANSITIONS[row.status].includes(input.status))
      fail(
        `Cannot move from "${row.status}" to "${input.status}". Allowed next states: ${TRANSITIONS[row.status].join(', ') || 'none (terminal)'}.`,
        409,
      );
    if (input.status === 'scheduled' && !input.scheduledFor)
      fail('A recommendation cannot move to "scheduled" without a scheduledFor date.', 400);
    const now = new Date().toISOString();
    // F-SI-05: a plain SELECT-then-UPDATE let two concurrent transitions both pass the
    // TRANSITIONS check against the same stale row.status and silently race each other. The
    // WHERE status = ? guard makes only the first writer's transition actually apply.
    const applied = await db
      .prepare('UPDATE recommendations SET status = ?, scheduled_for = ?, updated_at = ? WHERE id = ? AND status = ?')
      .run(
        input.status,
        input.status === 'scheduled' ? input.scheduledFor : row.scheduled_for,
        now,
        row.id,
        row.status,
      );
    if (applied.changes === 0)
      return res
        .status(409)
        .json({ error: 'This recommendation changed concurrently. Reload and retry.' });
    await log(req.workspace.id, req.user.name, 'Recommendation status changed', row.id, `${row.status} -> ${input.status}${input.reason ? `: ${input.reason}` : ''}`);
    res.json(await db.prepare('SELECT * FROM recommendations WHERE id = ?').get(row.id));
  });
}

export { TRANSITIONS, TERMINAL };
