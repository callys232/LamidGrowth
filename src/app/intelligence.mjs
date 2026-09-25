import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const DEFAULT_TTL_SECONDS = 3600;

/** Called by an agent's execute() after it reaches a conclusion about some subject (a goal, a
 * KPI, a job, etc.) — the write side of cross-engine reuse. If another agent already reached a
 * different conclusion about the same subject and that result hasn't expired, a conflict row is
 * recorded for a human to resolve; agents never auto-reconcile each other's conclusions.
 *
 * F-SI-01: every call is an immutable new version, never an overwrite — recorded in
 * intelligence_result_versions (append-only) while intelligence_results stays a fast "current"
 * pointer, same two-table shape as scoping_cases/scope_versions. `sources` (an array of
 * {kind, id, version?} — the actual records that fed the conclusion), `modelRegistryId` and
 * `confidence` are optional real provenance; none are fabricated when a caller has nothing
 * honest to report (confidence stays null for deterministic, non-probabilistic conclusions). */
export async function upsertIntelligenceResult(
  store,
  {
    workspaceId,
    subjectKind,
    subjectId,
    agentId,
    conclusion,
    summary,
    sources = [],
    modelRegistryId = null,
    confidence = null,
    ttlSeconds = DEFAULT_TTL_SECONDS,
  },
) {
  const { db, transaction, log } = store;
  const now = new Date();
  const computedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
  const sourcesJson = JSON.stringify(sources);
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
    const versionRow = await db
      .prepare(
        `SELECT COALESCE(MAX(version), 0) AS max_version FROM intelligence_result_versions
         WHERE workspace_id = ? AND subject_kind = ? AND subject_id = ? AND agent_id = ?`,
      )
      .get(workspaceId, subjectKind, subjectId, agentId);
    const version = versionRow.max_version + 1;
    await db
      .prepare(
        'INSERT INTO intelligence_result_versions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)',
      )
      .run(
        randomUUID(),
        workspaceId,
        subjectKind,
        subjectId,
        agentId,
        version,
        conclusion,
        summary,
        confidence,
        sourcesJson,
        modelRegistryId,
        computedAt,
      );
    await db
      .prepare(
        `INSERT INTO intelligence_results VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (workspace_id, subject_kind, subject_id, agent_id)
         DO UPDATE SET conclusion = ?, summary = ?, computed_at = ?, expires_at = ?, version = ?, sources = ?, model_registry_id = ?, confidence = ?`,
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
        version,
        sourcesJson,
        modelRegistryId,
        confidence,
        conclusion,
        summary,
        computedAt,
        expiresAt,
        version,
        sourcesJson,
        modelRegistryId,
        confidence,
      );
    return { computedAt, expiresAt, conflictsRaised: conflicts.length, version };
  });
}

// Change Impact Analyzer's write side (spec 20.5 / SI-06): when the subject itself materially
// changes (e.g. a goal's lifecycle stage moves), any previously-computed result about that subject
// is no longer trustworthy as current — it is marked stale (expired) rather than silently left
// looking fresh. Callers that read via GET /intelligence-results will simply no longer see it.
// This only ever touches the current-pointer row in intelligence_results — the immutable log in
// intelligence_result_versions is never rewritten, even by staleness.
export async function markResultsStale(store, { workspaceId, subjectKind, subjectId }) {
  const now = new Date().toISOString();
  const result = await store.db
    .prepare(
      'UPDATE intelligence_results SET expires_at = ? WHERE workspace_id = ? AND subject_kind = ? AND subject_id = ? AND expires_at > ?',
    )
    .run(now, workspaceId, subjectKind, subjectId, now);
  return result.changes;
}

// F-SI-01: the real "cross-engine consumer contract" for lineage — every version ever computed
// for one agent's line of results on a subject, oldest first, each with its own sources/model/
// confidence. Used by GET /intelligence-results/history below.
export async function getResultHistory(store, { workspaceId, subjectKind, subjectId, agentId }) {
  const rows = await store.db
    .prepare(
      `SELECT * FROM intelligence_result_versions
       WHERE workspace_id = ? AND subject_kind = ? AND subject_id = ? AND agent_id = ? ORDER BY version`,
    )
    .all(workspaceId, subjectKind, subjectId, agentId);
  return rows.map((row) => ({
    version: row.version,
    conclusion: row.conclusion,
    summary: row.summary,
    confidence: row.confidence,
    sources: JSON.parse(row.sources),
    modelRegistryId: row.model_registry_id,
    computedAt: row.computed_at,
    derivedFrom: row.derived_from ? JSON.parse(row.derived_from) : null,
  }));
}

const querySchema = z
  .object({ subjectKind: z.string().trim().min(1).max(80), subjectId: z.string().trim().min(1).max(200) })
  .strict();
const historyQuerySchema = querySchema.extend({ agentId: z.string().trim().min(1).max(80) }).strict();
// F-SI-05: resolution previously only flipped a `resolved` flag with a free-text note — it never
// selected or recomputed an actual reconciled conclusion, so both agents' conflicting results
// stayed live and equally "current" after "resolution." The human must pick a side or supply a
// reconciled conclusion of their own.
const resolveSchema = z.discriminatedUnion('resolution', [
  z.object({ resolution: z.literal('A'), notes: z.string().trim().max(2000).default('') }).strict(),
  z.object({ resolution: z.literal('B'), notes: z.string().trim().max(2000).default('') }).strict(),
  z
    .object({
      resolution: z.literal('custom'),
      conclusion: z.string().trim().min(1).max(500),
      notes: z.string().trim().max(2000).default(''),
    })
    .strict(),
]);

const fail = (message, status) => {
  throw Object.assign(new Error(message), { status });
};

export function mountIntelligence(app, store) {
  const { db, log, transaction } = store;

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
        version: row.version,
        sources: JSON.parse(row.sources || '[]'),
        modelRegistryId: row.model_registry_id,
        confidence: row.confidence,
      })),
    );
  });

  // F-SI-01: the full immutable version history for one agent's line of results on a subject —
  // the real lineage surface, distinct from the "current" row GET above.
  app.get('/api/intelligence-results/history', async (req, res) => {
    const query = historyQuerySchema.parse(req.query);
    res.json(
      await getResultHistory(store, {
        workspaceId: req.workspace.id,
        subjectKind: query.subjectKind,
        subjectId: query.subjectId,
        agentId: query.agentId,
      }),
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
  // fabric exists to serve. F-SI-05: resolving now actually produces a reconciled result — the
  // chosen conclusion (agent A's, agent B's, or a human-supplied one) is written back onto both
  // conflicting agents' live results, so a later read sees one consistent, authoritative answer
  // instead of two conflicting "current" ones.
  app.patch('/api/intelligence-conflicts/:id/resolve', async (req, res) => {
    const conflict = await db
      .prepare('SELECT * FROM intelligence_conflicts WHERE id = ? AND workspace_id = ?')
      .get(req.params.id, req.workspace.id);
    if (!conflict) fail('Intelligence conflict not found.', 404);
    if (conflict.resolved) fail('This conflict has already been resolved.', 409);
    const input = resolveSchema.parse(req.body);
    const resolvedConclusion =
      input.resolution === 'A'
        ? conflict.conclusion_a
        : input.resolution === 'B'
          ? conflict.conclusion_b
          : input.conclusion;
    const now = new Date().toISOString();
    // F-SI-01: intelligence_results rows are versioned history now — resolution must not mutate
    // a prior version in place. Each affected agent gets a real new immutable version instead,
    // with derived_from recording which of their own prior versions this reconciliation replaced
    // and sources noting the conflict itself as an input — a genuine, inspectable graph edge.
    async function reconcileAgent(agentId, priorConclusion) {
      const current = await db
        .prepare(
          'SELECT * FROM intelligence_results WHERE workspace_id = ? AND subject_kind = ? AND subject_id = ? AND agent_id = ?',
        )
        .get(conflict.workspace_id, conflict.subject_kind, conflict.subject_id, agentId);
      // Only reconcile if the agent's current result still holds the exact conclusion this
      // conflict was raised against — if it has since recomputed something different, that's a
      // new, separate state this stale resolution must not silently stomp.
      if (!current || current.conclusion !== priorConclusion) return;
      const priorVersionRow = await db
        .prepare(
          `SELECT id FROM intelligence_result_versions
           WHERE workspace_id = ? AND subject_kind = ? AND subject_id = ? AND agent_id = ? AND version = ?`,
        )
        .get(conflict.workspace_id, conflict.subject_kind, conflict.subject_id, agentId, current.version);
      const nextVersion = current.version + 1;
      const sources = [
        ...JSON.parse(current.sources || '[]'),
        { kind: 'intelligence_conflict', id: conflict.id },
      ];
      const sourcesJson = JSON.stringify(sources);
      const derivedFrom = priorVersionRow ? JSON.stringify([priorVersionRow.id]) : null;
      await db
        .prepare(
          'INSERT INTO intelligence_result_versions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .run(
          randomUUID(),
          conflict.workspace_id,
          conflict.subject_kind,
          conflict.subject_id,
          agentId,
          nextVersion,
          resolvedConclusion,
          current.summary,
          current.confidence,
          sourcesJson,
          current.model_registry_id,
          now,
          derivedFrom,
        );
      await db
        .prepare(
          'UPDATE intelligence_results SET conclusion = ?, computed_at = ?, version = ?, sources = ? WHERE id = ?',
        )
        .run(resolvedConclusion, now, nextVersion, sourcesJson, current.id);
    }
    await transaction(async () => {
      await db
        .prepare(
          'UPDATE intelligence_conflicts SET resolved = 1, resolution = ?, resolved_conclusion = ?, resolved_by = ?, resolved_at = ? WHERE id = ?',
        )
        .run(input.resolution, resolvedConclusion, req.user.id, now, conflict.id);
      await reconcileAgent(conflict.agent_a, conflict.conclusion_a);
      await reconcileAgent(conflict.agent_b, conflict.conclusion_b);
      await log(
        req.workspace.id,
        req.user.name,
        'Intelligence conflict resolved',
        conflict.id,
        `${input.resolution}: ${resolvedConclusion}${input.notes ? ` — ${input.notes}` : ''}`,
      );
    });
    res.json({ id: conflict.id, resolved: true, resolution: input.resolution, resolvedConclusion });
  });
}
