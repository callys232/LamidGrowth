import { randomUUID, createHash } from 'node:crypto';
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
    // What the conclusion is about (e.g. a tool id). Results only conflict when they make the
    // same claim: two tools measuring different things about one goal are not a contradiction.
    claim = null,
    // completed | provisional | insufficient_evidence — how far the conclusion can be relied on.
    status = 'completed',
    runId = null,
  },
  { withinTransaction = false } = {},
) {
  const { db, transaction, log } = store;
  const now = new Date();
  const computedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
  const sourcesJson = JSON.stringify(sources);
  const work = async () => {
    const others = await db
      .prepare(
        `SELECT * FROM intelligence_results
         WHERE workspace_id = ? AND subject_kind = ? AND subject_id = ? AND agent_id != ? AND expires_at > ?
         AND claim IS NOT DISTINCT FROM ?`,
      )
      .all(workspaceId, subjectKind, subjectId, agentId, computedAt, claim);
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
        .run(
          conflictId,
          workspaceId,
          subjectKind,
          subjectId,
          agentId,
          conclusion,
          other.agent_id,
          other.conclusion,
          computedAt,
        );
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
    const versionId = randomUUID();
    await db
      .prepare(
        `INSERT INTO intelligence_result_versions
         (id, workspace_id, subject_kind, subject_id, agent_id, version, conclusion, summary,
          confidence, sources, model_registry_id, computed_at, derived_from, claim, status, run_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
      )
      .run(
        versionId,
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
        claim,
        status,
        runId,
      );
    // Lineage edges: which source (at which version) this version of the conclusion rests on.
    for (const src of sources) {
      if (!src?.kind || !src?.id) continue;
      await db
        .prepare('INSERT INTO intelligence_dependencies VALUES (?, ?, ?, ?, ?, ?)')
        .run(
          randomUUID(),
          workspaceId,
          versionId,
          String(src.kind),
          String(src.id),
          src.version == null ? null : String(src.version),
        );
    }
    await db
      .prepare(
        `INSERT INTO intelligence_results
         (id, workspace_id, subject_kind, subject_id, agent_id, conclusion, summary, computed_at,
          expires_at, version, sources, model_registry_id, confidence, claim, status, stale_reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
         ON CONFLICT (workspace_id, subject_kind, subject_id, agent_id)
         DO UPDATE SET conclusion = ?, summary = ?, computed_at = ?, expires_at = ?, version = ?, sources = ?, model_registry_id = ?, confidence = ?, claim = ?, status = ?, stale_reason = NULL`,
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
        claim,
        status,
        conclusion,
        summary,
        computedAt,
        expiresAt,
        version,
        sourcesJson,
        modelRegistryId,
        confidence,
        claim,
        status,
      );
    return { computedAt, expiresAt, conflictsRaised: conflicts.length, version, versionId };
  };
  return withinTransaction ? work() : transaction(work);
}

// Change Impact Analyzer's write side (spec 20.5 / SI-06): when the subject itself materially
// changes (e.g. a goal's lifecycle stage moves), any previously-computed result about that subject
// is no longer trustworthy as current — it is marked stale (expired) rather than silently left
// looking fresh. Callers that read via GET /intelligence-results will simply no longer see it.
// This only ever touches the current-pointer row in intelligence_results — the immutable log in
// intelligence_result_versions is never rewritten, even by staleness.
export async function markResultsStale(
  store,
  { workspaceId, subjectKind, subjectId, reason = 'The subject changed.' },
) {
  const now = new Date().toISOString();
  const result = await store.db
    .prepare(
      'UPDATE intelligence_results SET expires_at = ?, stale_reason = ? WHERE workspace_id = ? AND subject_kind = ? AND subject_id = ? AND expires_at > ?',
    )
    .run(now, reason, workspaceId, subjectKind, subjectId, now);
  return result.changes;
}

/** Source kinds stored in the generic records table, whose version can be read. */
export const RECORD_SOURCE_KINDS = new Set([
  'objective',
  'action',
  'knowledge',
  'progress',
  'review',
  'notification',
]);
/** Every kind whose existence and version this module can verify. */
export const CHECKABLE_SOURCE_KINDS = new Set([
  ...RECORD_SOURCE_KINDS,
  'task',
  'tool_run',
  'project',
  'project_tasks',
]);

/** The current version of a source a result cites, within the workspace — null when a
 * checkable source no longer exists there. Records carry a version; tasks have none, so their
 * last update stands in. A saved tool run never changes. A kind this module cannot check (an
 * agent's job, KPI or conflict citation) returns { checkable: false } and is never called
 * missing on that basis. */
export async function currentSourceVersion(db, workspaceId, { kind, id }) {
  if (!CHECKABLE_SOURCE_KINDS.has(kind)) return { checkable: false, version: null };
  if (kind === 'task') {
    const row = await db
      .prepare(
        'SELECT tasks.updated_at FROM tasks JOIN projects ON projects.id = tasks.project_id WHERE tasks.id = ? AND projects.workspace_id = ?',
      )
      .get(id, workspaceId);
    return row ? { checkable: true, version: row.updated_at } : null;
  }
  if (kind === 'tool_run') {
    const row = await db
      .prepare('SELECT id FROM agent_runs WHERE id = ? AND workspace_id = ?')
      .get(id, workspaceId);
    return row ? { checkable: true, version: null } : null;
  }
  if (kind === 'project_tasks') {
    // The project's tasks as a whole: any task added, edited or removed changes this version.
    const project = await db
      .prepare('SELECT id FROM projects WHERE id = ? AND workspace_id = ?')
      .get(id, workspaceId);
    if (!project) return null;
    const rows = await db
      .prepare('SELECT id, updated_at FROM tasks WHERE project_id = ? ORDER BY id')
      .all(id);
    const version = createHash('sha256')
      .update(rows.map((r) => `${r.id}@${r.updated_at}`).join('|'))
      .digest('hex')
      .slice(0, 16);
    return { checkable: true, version };
  }
  if (kind === 'project') {
    const row = await db
      .prepare('SELECT status FROM projects WHERE id = ? AND workspace_id = ?')
      .get(id, workspaceId);
    return row ? { checkable: true, version: null } : null;
  }
  const row = await db
    .prepare('SELECT kind, version FROM records WHERE id = ? AND workspace_id = ?')
    .get(id, workspaceId);
  if (!row || row.kind !== kind) return null;
  return { checkable: true, version: String(row.version) };
}

/** Whether a current result still rests on the sources it was computed from. Historical
 * versions are never rewritten; this only describes whether the current one can be relied on. */
export async function assessFreshness(store, row) {
  const reasons = [];
  if (row.expires_at <= new Date().toISOString())
    reasons.push(row.stale_reason || 'Past its freshness window.');
  const deps = await store.db
    .prepare(
      `SELECT d.source_kind, d.source_id, d.source_version FROM intelligence_dependencies d
       JOIN intelligence_result_versions v ON v.id = d.result_version_id
       WHERE v.workspace_id = ? AND v.subject_kind = ? AND v.subject_id = ? AND v.agent_id = ? AND v.version = ?`,
    )
    .all(row.workspace_id, row.subject_kind, row.subject_id, row.agent_id, row.version);
  for (const d of deps) {
    const now = await currentSourceVersion(store.db, row.workspace_id, {
      kind: d.source_kind,
      id: d.source_id,
    });
    if (!now) reasons.push(`Source ${d.source_kind} ${d.source_id} no longer exists.`);
    else if (!now.checkable) continue;
    else if (d.source_version != null && now.version != null && now.version !== d.source_version)
      reasons.push(`Source ${d.source_kind} ${d.source_id} has changed since this was computed.`);
  }
  return { state: reasons.length ? 'stale' : 'current', reasons };
}

/** Push-side invalidation: when a source changes, every current result whose current version
 * cites it is marked stale with the reason. Approved actions and plans are never touched — a
 * stale finding asks for review, it does not cancel a commitment. */
export async function markDependentsStale(store, { workspaceId, sourceKind, sourceId, reason }) {
  const now = new Date().toISOString();
  const result = await store.db
    .prepare(
      `UPDATE intelligence_results r SET expires_at = ?, stale_reason = ?
       WHERE r.workspace_id = ? AND r.expires_at > ? AND EXISTS (
         SELECT 1 FROM intelligence_result_versions v
         JOIN intelligence_dependencies d ON d.result_version_id = v.id
         WHERE v.workspace_id = r.workspace_id AND v.subject_kind = r.subject_kind
           AND v.subject_id = r.subject_id AND v.agent_id = r.agent_id AND v.version = r.version
           AND d.source_kind = ? AND d.source_id = ?)`,
    )
    .run(now, reason, workspaceId, now, sourceKind, sourceId);
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
  .object({
    subjectKind: z.string().trim().min(1).max(80),
    subjectId: z.string().trim().min(1).max(200),
  })
  .strict();
const listQuerySchema = querySchema
  .extend({ includeStale: z.enum(['true', 'false']).default('false') })
  .strict();
const historyQuerySchema = querySchema
  .extend({ agentId: z.string().trim().min(1).max(80) })
  .strict();
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
    const query = listQuerySchema.parse(req.query);
    const rows = await db
      .prepare(
        'SELECT * FROM intelligence_results WHERE workspace_id = ? AND subject_kind = ? AND subject_id = ? ORDER BY computed_at DESC',
      )
      .all(req.workspace.id, query.subjectKind, query.subjectId);
    const assessed = [];
    for (const row of rows) assessed.push({ row, freshness: await assessFreshness(store, row) });
    res.json(
      assessed
        .filter(({ freshness }) => query.includeStale === 'true' || freshness.state === 'current')
        .map(({ row, freshness }) => ({
          agentId: row.agent_id,
          conclusion: row.conclusion,
          summary: row.summary,
          computedAt: row.computed_at,
          expiresAt: row.expires_at,
          version: row.version,
          sources: JSON.parse(row.sources || '[]'),
          modelRegistryId: row.model_registry_id,
          confidence: row.confidence,
          claim: row.claim,
          status: row.status,
          freshness,
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
      .prepare(
        `SELECT * FROM intelligence_conflicts WHERE ${clauses.join(' AND ')} ORDER BY detected_at DESC`,
      )
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
        .get(
          conflict.workspace_id,
          conflict.subject_kind,
          conflict.subject_id,
          agentId,
          current.version,
        );
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
