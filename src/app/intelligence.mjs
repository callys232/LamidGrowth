import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const DEFAULT_TTL_SECONDS = 3600;

/** Called by an agent's execute() after it reaches a conclusion about some subject (a goal, a
 * KPI, a job, etc.) — the write side of cross-engine reuse. If another agent already reached a
 * different conclusion about the same subject and that result hasn't expired, a conflict row is
 * recorded for a human to resolve; agents never auto-reconcile each other's conclusions. */
export async function upsertIntelligenceResult(
  store,
  { workspaceId, subjectKind, subjectId, agentId, conclusion, summary, ttlSeconds = DEFAULT_TTL_SECONDS },
) {
  const { db, transaction, log } = store;
  const now = new Date();
  const computedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
  return transaction(async () => {
    const others = await db
      .prepare(
        `SELECT * FROM intelligence_results
         WHERE workspace_id = ? AND subject_kind = ? AND subject_id = ? AND agent_id != ? AND expires_at > ?`,
      )
      .all(workspaceId, subjectKind, subjectId, agentId, computedAt);
    const conflicts = [];
    for (const other of others) {
      if (other.conclusion === conclusion) continue;
      const already = await db
        .prepare(
          `SELECT 1 FROM intelligence_conflicts WHERE workspace_id = ? AND subject_kind = ? AND subject_id = ?
           AND resolved = 0 AND ((agent_a = ? AND agent_b = ?) OR (agent_a = ? AND agent_b = ?))`,
        )
        .get(workspaceId, subjectKind, subjectId, agentId, other.agent_id, other.agent_id, agentId);
      if (already) continue;
      const conflictId = randomUUID();
      await db
        .prepare('INSERT INTO intelligence_conflicts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)')
        .run(conflictId, workspaceId, subjectKind, subjectId, agentId, conclusion, other.agent_id, other.conclusion, computedAt);
      conflicts.push(conflictId);
    }
    if (conflicts.length)
      await log(
        workspaceId,
        'system',
        'Intelligence conflict detected',
        subjectId,
        `${agentId} vs ${others.map((o) => o.agent_id).join(', ')} on ${subjectKind}`,
      );
    await db
      .prepare(
        `INSERT INTO intelligence_results VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (workspace_id, subject_kind, subject_id, agent_id)
         DO UPDATE SET conclusion = ?, summary = ?, computed_at = ?, expires_at = ?`,
      )
      .run(
        randomUUID(),
        workspaceId,
        subjectKind,
        subjectId,
        agentId,
        conclusion,
        summary,
        computedAt,
        expiresAt,
        conclusion,
        summary,
        computedAt,
        expiresAt,
      );
    return { computedAt, expiresAt, conflictsRaised: conflicts.length };
  });
}

const querySchema = z
  .object({ subjectKind: z.string().trim().min(1).max(80), subjectId: z.string().trim().min(1).max(200) })
  .strict();
const resolveSchema = z.object({ notes: z.string().trim().max(2000).default('') }).strict();

const fail = (message, status) => {
  throw Object.assign(new Error(message), { status });
};

export function mountIntelligence(app, store) {
  const { db, log } = store;

  // Cross-engine reuse surface: any agent, or the UI, reads what's already been computed about a
  // subject instead of recomputing it — filtered to results that haven't expired.
  app.get('/api/intelligence-results', async (req, res) => {
    const query = querySchema.parse(req.query);
    const rows = await db
      .prepare(
        'SELECT * FROM intelligence_results WHERE workspace_id = ? AND subject_kind = ? AND subject_id = ? AND expires_at > ? ORDER BY computed_at DESC',
      )
      .all(req.workspace.id, query.subjectKind, query.subjectId, new Date().toISOString());
    res.json(
      rows.map((row) => ({
        agentId: row.agent_id,
        conclusion: row.conclusion,
        summary: row.summary,
        computedAt: row.computed_at,
        expiresAt: row.expires_at,
      })),
    );
  });

  app.get('/api/intelligence-conflicts', async (req, res) => {
    const query = querySchema.partial().parse(req.query);
    const clauses = ['workspace_id = ?', 'resolved = 0'];
    const params = [req.workspace.id];
    if (query.subjectKind) {
      clauses.push('subject_kind = ?');
      params.push(query.subjectKind);
    }
    if (query.subjectId) {
      clauses.push('subject_id = ?');
      params.push(query.subjectId);
    }
    const rows = await db
      .prepare(`SELECT * FROM intelligence_conflicts WHERE ${clauses.join(' AND ')} ORDER BY detected_at DESC`)
      .all(...params);
    res.json(
      rows.map((row) => ({
        id: row.id,
        subjectKind: row.subject_kind,
        subjectId: row.subject_id,
        agentA: row.agent_a,
        conclusionA: row.conclusion_a,
        agentB: row.agent_b,
        conclusionB: row.conclusion_b,
        detectedAt: row.detected_at,
      })),
    );
  });

  // Resolution is a human action, never automatic — this is the actual human-control point the
  // fabric exists to serve.
  app.patch('/api/intelligence-conflicts/:id/resolve', async (req, res) => {
    const conflict = await db
      .prepare('SELECT * FROM intelligence_conflicts WHERE id = ? AND workspace_id = ?')
      .get(req.params.id, req.workspace.id);
    if (!conflict) fail('Intelligence conflict not found.', 404);
    if (conflict.resolved) fail('This conflict has already been resolved.', 409);
    const input = resolveSchema.parse(req.body);
    await db.prepare('UPDATE intelligence_conflicts SET resolved = 1 WHERE id = ?').run(conflict.id);
    await log(req.workspace.id, req.user.name, 'Intelligence conflict resolved', conflict.id, input.notes);
    res.json({ id: conflict.id, resolved: true });
  });
}
