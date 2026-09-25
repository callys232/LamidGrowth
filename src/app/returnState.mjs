import { z } from 'zod';
import { getTasksNeedingAttention } from './tasks.mjs';
import { getLearningAttention } from './learning.mjs';

// Return-State / Attention Service (F-CORE-02): every domain already computed its own ad hoc
// "attention" (tasks.mjs's attentionFor, learning.mjs's needsYou/stalled) with no per-user
// last-visit checkpoint and no cross-lane aggregation. This builds the missing unifying layer on
// top of what's real — it imports and reuses each lane's own existing signal rather than
// re-deriving it, and adds the two things that were genuinely missing: a persisted per-user
// checkpoint per lane, and one real cross-lane view built from them.
const LANES = ['tasks', 'learning', 'goals', 'audit', 'workflows'];
const checkpointSchema = z.object({ lane: z.enum(LANES) }).strict();

// Material audit-log actions this session's own log(...) calls already use — the exact action
// strings already written by goals.mjs, projects.mjs, recommendations.mjs, growth.mjs. Never a
// suppressible security notice; this list is deliberately restricted to material state changes.
const MATERIAL_AUDIT_ACTIONS = [
  'Objective updated',
  'Goal stage changed',
  'Goal deleted',
  'Recommendation status changed',
  'Deliverable verification completed',
  'Milestone approved',
  'Milestone dispute',
  'Intelligence conflict resolved',
  'KPI redefined',
  'Experiment completed',
  'Connector status updated',
];

async function checkpointsFor(store, userId, workspaceId) {
  const rows = await store.db
    .prepare('SELECT lane, last_reviewed_at FROM return_state_checkpoints WHERE user_id = ? AND workspace_id = ?')
    .all(userId, workspaceId);
  return Object.fromEntries(rows.map((row) => [row.lane, row.last_reviewed_at]));
}

// Digest policy (F-CORE-02's "digest policy across lanes... without suppressing mandatory
// security notices"): only ever applied to goal-subscription-sourced items — reusing
// goal_subscriptions.attention_policy, which this session confirmed was stored and returned but
// never actually read anywhere. Never applied to the material audit/workflow/task signals below,
// so nothing security-relevant can be silenced by it.
async function getGoalsAttention(store, workspaceId, checkpoint) {
  const rows = await store.db
    .prepare(
      `SELECT sm.*, gs.attention_policy FROM signal_matches sm
       JOIN goal_subscriptions gs ON gs.id = sm.subscription_id
       WHERE sm.workspace_id = ? AND sm.seen = 0 ORDER BY sm.matched_at DESC`,
    )
    .all(workspaceId);
  const checkpointAgeMs = checkpoint ? Date.now() - new Date(checkpoint).getTime() : Infinity;
  return rows.filter((row) => {
    if (row.attention_policy === 'silent') return false;
    if (row.attention_policy === 'digest') return checkpointAgeMs > 24 * 60 * 60 * 1000;
    return true; // 'immediate' / 'return_state_only'
  });
}

export function mountReturnState(app, store) {
  const { db, transaction, log } = store;

  app.post('/api/return-state/checkpoint', async (req, res) => {
    const input = checkpointSchema.parse(req.body);
    const now = new Date().toISOString();
    await transaction(async () => {
      await db
        .prepare(
          `INSERT INTO return_state_checkpoints (user_id, workspace_id, lane, last_reviewed_at) VALUES (?, ?, ?, ?)
           ON CONFLICT (user_id, workspace_id, lane) DO UPDATE SET last_reviewed_at = ?`,
        )
        .run(req.user.id, req.workspace.id, input.lane, now, now);
      await log(req.workspace.id, req.user.name, 'Return-state checkpoint marked', input.lane, now);
    });
    res.json({ lane: input.lane, lastReviewedAt: now });
  });

  app.get('/api/return-state', async (req, res) => {
    const checkpoints = await checkpointsFor(store, req.user.id, req.workspace.id);

    const tasksCheckpoint = checkpoints.tasks || null;
    const allTasks = await getTasksNeedingAttention(store, req.user.id);
    const tasks = tasksCheckpoint
      ? allTasks.filter((task) => task.updated_at > tasksCheckpoint)
      : allTasks;

    const learning = await getLearningAttention(store, req.user.id);

    const goals = await getGoalsAttention(store, req.workspace.id, checkpoints.goals || null);

    const auditCheckpoint = checkpoints.audit || '1970-01-01T00:00:00.000Z';
    const audit = await db
      .prepare(
        `SELECT * FROM audit WHERE workspace_id = ? AND created_at > ? AND action = ANY(?)
         ORDER BY created_at DESC LIMIT 100`,
      )
      .all(req.workspace.id, auditCheckpoint, MATERIAL_AUDIT_ACTIONS);

    const workflows = await db
      .prepare("SELECT id, title, updated_at, reason FROM workflow_runs WHERE workspace_id = ? AND state = 'needs_approval' ORDER BY updated_at DESC")
      .all(req.workspace.id);

    res.json({
      tasks: { lastReviewedAt: tasksCheckpoint, items: tasks },
      learning: { lastReviewedAt: checkpoints.learning || null, items: learning },
      goals: { lastReviewedAt: checkpoints.goals || null, items: goals },
      audit: { lastReviewedAt: checkpoints.audit || null, items: audit },
      workflows: { lastReviewedAt: checkpoints.workflows || null, items: workflows },
    });
  });
}

export { LANES };
