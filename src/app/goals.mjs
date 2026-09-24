import { randomUUID } from 'node:crypto';
import { z } from 'zod';

// Canonical 12-stage goal lifecycle. A goal (= an 'objective' record) starts 'captured' and moves
// forward; from 'active' onward it may branch across health states (progressing/at_risk/blocked)
// or be revised ('adapted') before reaching a terminal state. Terminal states have no exits.
const STAGES = [
  'captured',
  'clarified',
  'baseline_established',
  'path_defined',
  'active',
  'progressing',
  'at_risk',
  'blocked',
  'adapted',
  'achieved',
  'superseded',
  'abandoned',
];
const TERMINAL = new Set(['achieved', 'superseded', 'abandoned']);
const TRANSITIONS = {
  captured: ['clarified'],
  clarified: ['baseline_established'],
  baseline_established: ['path_defined'],
  path_defined: ['active'],
  active: ['progressing', 'at_risk', 'blocked', 'adapted', 'achieved', 'superseded', 'abandoned'],
  progressing: ['at_risk', 'blocked', 'adapted', 'achieved', 'superseded', 'abandoned'],
  at_risk: ['progressing', 'blocked', 'adapted', 'achieved', 'superseded', 'abandoned'],
  blocked: ['progressing', 'at_risk', 'adapted', 'achieved', 'superseded', 'abandoned'],
  adapted: [
    'active',
    'progressing',
    'at_risk',
    'blocked',
    'achieved',
    'superseded',
    'abandoned',
  ],
  achieved: [],
  superseded: [],
  abandoned: [],
};

const stageSchema = z.object({ stage: z.enum(STAGES), reason: z.string().trim().max(2000).default('') }).strict();
const signalClasses = z.enum([
  'jobs',
  'projects',
  'grants',
  'tenders',
  'training',
  'certifications',
  'events',
  'experts',
  'funding',
  'market_changes',
  'requirement_changes',
  'internal_progress',
]);
const subscriptionSchema = z
  .object({
    signalClasses: z.array(signalClasses).min(1).max(signalClasses.options.length),
    constraints: z
      .object({
        location: z.string().trim().max(200).optional(),
        budget: z.string().trim().max(200).optional(),
        availability: z.string().trim().max(200).optional(),
        language: z.string().trim().max(100).optional(),
        riskTolerance: z.enum(['low', 'medium', 'high']).optional(),
        timing: z.string().trim().max(200).optional(),
        freeOrPaid: z.enum(['free', 'paid', 'either']).optional(),
        jurisdiction: z.string().trim().max(200).optional(),
      })
      .strict()
      .default({}),
    attentionPolicy: z.enum(['immediate', 'digest', 'return_state_only', 'silent']).default('digest'),
  })
  .strict();

const fail = (message, status) => {
  throw Object.assign(new Error(message), { status });
};

export function mountGoals(app, store) {
  const { db, transaction, log } = store;

  async function goalFor(id, workspaceId) {
    const row = await db
      .prepare("SELECT * FROM records WHERE id = ? AND workspace_id = ? AND kind = 'objective'")
      .get(id, workspaceId);
    if (!row) fail('Goal not found.', 404);
    return row;
  }
  async function lifecycleFor(goalId, workspaceId) {
    const existing = await db
      .prepare('SELECT * FROM goal_lifecycle WHERE goal_id = ?')
      .get(goalId);
    if (existing) return existing;
    const now = new Date().toISOString();
    await db
      .prepare(
        "INSERT INTO goal_lifecycle VALUES (?, ?, 'captured', ?) ON CONFLICT (goal_id) DO NOTHING",
      )
      .run(goalId, workspaceId, now);
    return db.prepare('SELECT * FROM goal_lifecycle WHERE goal_id = ?').get(goalId);
  }

  app.get('/api/objectives/:id/goal', async (req, res) => {
    const goal = await goalFor(req.params.id, req.workspace.id);
    const lifecycle = await lifecycleFor(goal.id, req.workspace.id);
    const subscriptions = await db
      .prepare('SELECT * FROM goal_subscriptions WHERE goal_id = ? ORDER BY created_at')
      .all(goal.id);
    res.json({
      goalId: goal.id,
      stage: lifecycle.stage,
      updatedAt: lifecycle.updated_at,
      subscriptions: subscriptions.map((row) => ({
        id: row.id,
        signalClasses: JSON.parse(row.signal_classes),
        constraints: JSON.parse(row.constraints),
        attentionPolicy: row.attention_policy,
        createdAt: row.created_at,
      })),
    });
  });

  app.patch('/api/objectives/:id/goal/stage', async (req, res) => {
    const input = stageSchema.parse(req.body);
    const goal = await goalFor(req.params.id, req.workspace.id);
    const result = await transaction(async () => {
      const current = await db
        .prepare('SELECT * FROM goal_lifecycle WHERE goal_id = ? FOR UPDATE')
        .get(goal.id);
      const currentStage = current?.stage || 'captured';
      if (currentStage === input.stage)
        fail(`This goal is already at stage "${input.stage}".`, 409);
      if (TERMINAL.has(currentStage))
        fail(`This goal has reached a terminal stage ("${currentStage}") and cannot progress further.`, 409);
      if (!TRANSITIONS[currentStage].includes(input.stage))
        fail(
          `Cannot move from "${currentStage}" to "${input.stage}". Allowed next stages: ${TRANSITIONS[currentStage].join(', ') || 'none (terminal)'}.`,
          409,
        );
      const now = new Date().toISOString();
      await db
        .prepare(
          'INSERT INTO goal_lifecycle VALUES (?, ?, ?, ?) ON CONFLICT (goal_id) DO UPDATE SET stage = ?, updated_at = ?',
        )
        .run(goal.id, req.workspace.id, input.stage, now, input.stage, now);
      await log(
        req.workspace.id,
        req.user.name,
        'Goal stage changed',
        goal.id,
        `${currentStage} → ${input.stage}${input.reason ? `: ${input.reason}` : ''}`,
      );
      return { goalId: goal.id, stage: input.stage, updatedAt: now };
    });
    res.json(result);
  });

  app.post('/api/objectives/:id/goal/subscriptions', async (req, res) => {
    const input = subscriptionSchema.parse(req.body);
    const goal = await goalFor(req.params.id, req.workspace.id);
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    await transaction(async () => {
      await db
        .prepare('INSERT INTO goal_subscriptions VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(
          id,
          goal.id,
          req.workspace.id,
          JSON.stringify(input.signalClasses),
          JSON.stringify(input.constraints),
          input.attentionPolicy,
          createdAt,
        );
      await log(
        req.workspace.id,
        req.user.name,
        'Goal subscription created',
        id,
        input.signalClasses.join(', '),
      );
    });
    res.status(201).json({
      id,
      goalId: goal.id,
      signalClasses: input.signalClasses,
      constraints: input.constraints,
      attentionPolicy: input.attentionPolicy,
      createdAt,
    });
  });

  app.get('/api/objectives/:id/goal/subscriptions', async (req, res) => {
    const goal = await goalFor(req.params.id, req.workspace.id);
    const rows = await db
      .prepare('SELECT * FROM goal_subscriptions WHERE goal_id = ? ORDER BY created_at')
      .all(goal.id);
    res.json(
      rows.map((row) => ({
        id: row.id,
        goalId: row.goal_id,
        signalClasses: JSON.parse(row.signal_classes),
        constraints: JSON.parse(row.constraints),
        attentionPolicy: row.attention_policy,
        createdAt: row.created_at,
      })),
    );
  });

  app.delete('/api/goal-subscriptions/:id', async (req, res) => {
    const row = await db
      .prepare('SELECT * FROM goal_subscriptions WHERE id = ? AND workspace_id = ?')
      .get(req.params.id, req.workspace.id);
    if (!row) return res.status(404).json({ error: 'Subscription not found.' });
    await transaction(async () => {
      await db.prepare('DELETE FROM goal_subscriptions WHERE id = ?').run(row.id);
      await log(req.workspace.id, req.user.name, 'Goal subscription removed', row.id, '');
    });
    res.status(204).end();
  });
}

export { STAGES, TRANSITIONS, TERMINAL };
