import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { requirePermission } from './policy.mjs';
import { readAIRules, enforceFeature } from './aiRules.mjs';

const emptyInput = z.object({}).strict();
const title = z.string().trim().min(1).max(500);
const tools = {
  'context.snapshot': {
    name: 'Review objective context',
    engine: 'Clarity',
    band: 'A1',
    writes: false,
    input: emptyInput,
    fields: [],
    async execute({ objective }) {
      return { objective };
    },
  },
  'action.prepare': {
    name: 'Prepare a next action',
    engine: 'Consistency',
    band: 'A2',
    writes: true,
    input: z.object({ title, notes: z.string().trim().max(5000).default('') }).strict(),
    fields: [
      { name: 'title', required: true, maxLength: 500 },
      { name: 'notes', required: false, maxLength: 5000 },
    ],
    async execute({ store, run, objective, principal }, input) {
      if (objective.status === 'Complete')
        throw new Error('Reopen the objective before preparing another action.');
      const action = await store.insert(run.workspace_id, 'action', {
        title: input.title,
        notes: input.notes,
        objectiveId: objective.id,
        status: 'Planned',
        owner: principal.name,
        requiresApproval: true,
        dueDate: '',
      });
      await store.log(
        run.workspace_id,
        principal.name,
        'Action created',
        action.id,
        `Workflow ${run.id}: ${input.title}`,
      );
      return { action };
    },
  },
  'progress.snapshot': {
    name: 'Record progress evidence',
    engine: 'Growth',
    band: 'A2',
    writes: true,
    input: emptyInput,
    fields: [],
    async execute({ store, run, objective }) {
      const actions = (await store.records(run.workspace_id, 'action')).filter(
        (action) => action.objectiveId === objective.id,
      );
      return store.insert(run.workspace_id, 'progress', {
        objectiveId: objective.id,
        objectiveVersion: objective.version,
        completed: actions.filter((action) => action.status === 'Done').length,
        total: actions.length,
        evidence: actions.map((action) => ({
          id: action.id,
          version: action.version,
          status: action.status,
        })),
      });
    },
  },
  'capability.review': {
    name: 'Review capability requirements',
    engine: 'Capability',
    band: 'A1',
    writes: false,
    input: emptyInput,
    fields: [],
    async execute({ objective }) {
      return {
        successCriteria: objective.success,
        constraints: objective.constraints,
        source: { id: objective.id, version: objective.version },
        method: 'Recorded user inputs; no automated assessment',
      };
    },
  },
  'review.reminder': {
    name: 'Create a review reminder',
    engine: 'Consistency',
    band: 'A2',
    writes: true,
    input: z.object({ message: title }).strict(),
    fields: [{ name: 'message', required: true, maxLength: 500 }],
    async execute({ store, run }, input) {
      return store.insert(run.workspace_id, 'notification', {
        message: input.message,
        recipientId: run.principal_id,
        runId: run.id,
        readAt: null,
      });
    },
  },
};
export const toolCatalog = Object.entries(tools).map(([id, tool]) => ({
  id,
  version: '1.0.0',
  name: tool.name,
  engine: tool.engine,
  authorityBand: tool.band,
  requiresApproval: tool.writes,
  fields: tool.fields,
  execution: 'local-deterministic',
}));
const stepSchema = z
  .object({
    id: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,39}$/),
    toolId: z.string().refine((id) => Object.hasOwn(tools, id), 'Unknown or unavailable tool'),
    input: z.record(z.unknown()).default({}),
    dependsOn: z.array(z.string()).max(20).default([]),
  })
  .strict();
const workflowSchema = z
  .object({
    title,
    objectiveId: z.string().uuid(),
    steps: z.array(stepSchema).min(1).max(20),
    startAt: z.string().datetime().optional(),
    expiresAt: z.string().datetime(),
  })
  .strict();
const commandSchema = z
  .object({
    version: z.number().int().positive(),
    objectiveVersion: z.number().int().positive().optional(),
    command: z.enum(['start', 'pause', 'resume', 'approve', 'cancel', 'retry']),
  })
  .strict();
const terminal = new Set(['completed', 'cancelled', 'expired']);
const fail = (message, status = 409) => {
  throw Object.assign(new Error(message), { status });
};
const decode = (row) => row && { ...row, steps: JSON.parse(row.steps) };

export function createWorkflowRuntime(store, now = () => Date.now()) {
  const { db, transaction, log } = store;
  const read = async (id, workspace) =>
    decode(
      await db
        .prepare('SELECT * FROM workflow_runs WHERE id = ? AND workspace_id = ?')
        .get(id, workspace),
    );
  // FOR UPDATE variant for the two write paths (command() and advance()) that read-modify-persist
  // a run — a plain SELECT here would let a user's command() and the scheduler's advance() both
  // read the same run concurrently and race to persist(), with whichever commits last silently
  // discarding the other's change (persist()'s UPDATE has no WHERE version = ? guard of its own).
  // Locking the row here makes a second concurrent transaction touching the same run block until
  // the first commits, then read the fresh post-commit state instead of stale data.
  const readForUpdate = async (id, workspace) =>
    decode(
      await db
        .prepare(
          workspace
            ? 'SELECT * FROM workflow_runs WHERE id = ? AND workspace_id = ? FOR UPDATE'
            : 'SELECT * FROM workflow_runs WHERE id = ? FOR UPDATE',
        )
        .get(...(workspace ? [id, workspace] : [id])),
    );
  async function persist(run, reason = '') {
    run.reason = reason;
    run.version++;
    run.updated_at = new Date(now()).toISOString();
    await db
      .prepare(
        'UPDATE workflow_runs SET state = ?, version = ?, steps = ?, updated_at = ?, reason = ? WHERE id = ?',
      )
      .run(run.state, run.version, JSON.stringify(run.steps), run.updated_at, reason, run.id);
  }
  async function principalFor(run) {
    return db
      .prepare(
        `SELECT users.id, users.name FROM users JOIN workspace_members ON users.id = workspace_members.user_id
      WHERE users.id = ? AND users.disabled_at IS NULL AND workspace_members.workspace_id = ?
      AND workspace_members.status = 'active' AND workspace_members.role = 'owner'`,
      )
      .get(run.principal_id, run.workspace_id);
  }
  async function objectiveFor(run) {
    const row = await db
      .prepare(
        "SELECT * FROM records WHERE id = ? AND workspace_id = ? AND kind = 'objective' FOR UPDATE",
      )
      .get(run.objective_id, run.workspace_id);
    if (!row) fail('The scoped objective is no longer available.');
    return { ...JSON.parse(row.data), id: row.id, version: row.version };
  }
  function nextStep(run) {
    return run.steps.find(
      (step) =>
        step.state !== 'completed' &&
        step.dependsOn.every(
          (id) => run.steps.find((candidate) => candidate.id === id)?.state === 'completed',
        ),
    );
  }
  async function create(workspace, principal, body) {
    const input = workflowSchema.parse(body);
    const startAt = input.startAt ? Date.parse(input.startAt) : now();
    const expiresAt = Date.parse(input.expiresAt);
    if (expiresAt <= Math.max(now(), startAt) || expiresAt > now() + 30 * 86400000)
      fail('Expiry must follow the scheduled start and be within 30 days.', 400);
    const seen = new Set();
    const steps = input.steps.map((step) => {
      if (seen.has(step.id) || step.dependsOn.some((id) => !seen.has(id)))
        fail('Step IDs must be unique and dependencies must reference earlier steps.', 400);
      seen.add(step.id);
      return {
        ...step,
        toolVersion: '1.0.0',
        input: tools[step.toolId].input.parse(step.input),
        state: 'pending',
        attempts: 0,
        approval: null,
        output: null,
      };
    });
    return transaction(async () => {
      const run = {
        id: randomUUID(),
        workspace_id: workspace,
        principal_id: principal,
        title: input.title,
        objective_id: input.objectiveId,
        state: 'draft',
        version: 1,
        steps,
        start_at: startAt,
        expires_at: expiresAt,
        created_at: new Date(now()).toISOString(),
        updated_at: new Date(now()).toISOString(),
        reason: '',
      };
      if (!(await principalFor(run)))
        fail('Only an active workspace owner can authorize a workflow.', 403);
      await objectiveFor(run);
      await db
        .prepare('INSERT INTO workflow_runs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(
          run.id,
          workspace,
          principal,
          run.title,
          run.objective_id,
          run.state,
          1,
          JSON.stringify(steps),
          startAt,
          expiresAt,
          run.created_at,
          run.updated_at,
          '',
        );
      await log(workspace, principal, 'Workflow drafted', run.id, run.title);
      return run;
    });
  }
  async function command(id, workspace, actor, body, { fromCompanion = false } = {}) {
    const input = commandSchema.parse(body);
    return transaction(async () => {
      const run = await readForUpdate(id, workspace);
      if (!run) fail('Workflow not found.', 404);
      if (run.version !== input.version)
        fail('This workflow changed. Reload and review its current state.');
      if (terminal.has(run.state)) fail('This workflow has ended.');
      if (run.principal_id !== actor || !(await principalFor(run)))
        fail('Only the authorizing workspace owner can control this workflow.', 403);
      if (input.command !== 'cancel' && run.expires_at <= now())
        fail('This workflow authorization has expired.');
      if (input.command === 'start' && run.state === 'draft') run.state = 'running';
      else if (input.command === 'pause' && ['running', 'needs_approval'].includes(run.state)) {
        run.state = 'paused';
        for (const step of run.steps) if (step.state !== 'completed') step.approval = null;
      } else if (input.command === 'resume' && run.state === 'paused') run.state = 'running';
      else if (input.command === 'retry' && run.state === 'failed') {
        const step = nextStep(run);
        if (!step || step.attempts >= 3)
          fail('The retry limit has been reached. Create a revised workflow.');
        step.state = 'pending';
        step.approval = null;
        run.state = 'running';
      } else if (input.command === 'approve' && run.state === 'needs_approval') {
        const step = nextStep(run);
        if (!step) fail('No step is waiting for approval.');
        const objectiveVersion = (await objectiveFor(run)).version;
        if (input.objectiveVersion !== objectiveVersion)
          fail('The objective changed or was not reviewed. Reload its context before approving.');
        step.approval = {
          policyVersion: (await readAIRules(store, workspace)).version,
          actor,
          at: new Date(now()).toISOString(),
          reviewedVersion: run.version,
          objectiveVersion,
        };
        run.state = 'running';
      } else if (input.command === 'cancel') run.state = 'cancelled';
      else fail('This workflow command is not allowed in its current state.');
      if (fromCompanion) {
        await db.prepare('SELECT pg_advisory_xact_lock(hashtext(?))').get(`ai-policy:${workspace}`);
        enforceFeature(await readAIRules(store, workspace), 'workflowCommands', 5);
      }
      await persist(run);
      await log(
        workspace,
        actor,
        `Workflow ${input.command}`,
        run.id,
        `Reviewed version ${input.version}`,
      );
      return run;
    });
  }
  // Only a workflow that has actually finished can be deleted — 'failed' isn't in `terminal`
  // because it's still retryable (see command()'s 'retry' branch), so a failed run must be
  // cancelled first, same as the UI's own cancel-button condition. This keeps a workspace from
  // ever losing track of a still-live or still-recoverable authorization by deleting it.
  async function remove(id, workspace, actor) {
    return transaction(async () => {
      const run = await readForUpdate(id, workspace);
      if (!run) fail('Workflow not found.', 404);
      if (!terminal.has(run.state))
        fail('Only a completed, cancelled or expired workflow can be deleted. Cancel it first.');
      if (run.principal_id !== actor)
        fail('Only the authorizing workspace owner can delete this workflow.', 403);
      await db.prepare('DELETE FROM workflow_runs WHERE id = ?').run(id);
      await log(workspace, actor, 'Workflow deleted', id, run.title);
    });
  }
  async function advance(id) {
    try {
      await transaction(async () => {
        const run = await readForUpdate(id);
        if (!run || terminal.has(run.state) || run.state === 'draft' || run.state === 'failed')
          return;
        if (run.expires_at <= now()) {
          run.state = 'expired';
          await persist(run, 'Authorization expired.');
          await log(run.workspace_id, run.principal_id, 'Workflow expired', run.id, run.reason);
          return;
        }
        if (run.state !== 'running' || run.start_at > now()) return;
        const principal = await principalFor(run);
        if (!principal) {
          run.state = 'paused';
          for (const step of run.steps) if (step.state !== 'completed') step.approval = null;
          await persist(run, 'Authorizing principal no longer has an active owner role.');
          await log(run.workspace_id, run.principal_id, 'Workflow paused', run.id, run.reason);
          return;
        }
        const step = nextStep(run);
        if (!step) {
          run.state = 'completed';
          await persist(run);
          await log(run.workspace_id, principal.name, 'Workflow completed', run.id, run.title);
          return;
        }
        const tool = tools[step.toolId];
        if (!tool || step.toolVersion !== '1.0.0')
          fail('The registered tool version is unavailable.');
        const objective = await objectiveFor(run);
        await db
          .prepare('SELECT pg_advisory_xact_lock(hashtext(?))')
          .get(`ai-policy:${run.workspace_id}`);
        const policy = await readAIRules(store, run.workspace_id);
        const changeMode = policy.rules.changes[step.toolId] || 'block';
        if (tool.writes && changeMode === 'block') {
          run.state = 'paused';
          step.approval = null;
          await persist(
            run,
            'Your AI rules block this change. Review AI Settings before resuming.',
          );
          await log(
            run.workspace_id,
            principal.name,
            'Workflow blocked by AI rules',
            run.id,
            step.toolId,
          );
          return;
        }
        if (
          tool.writes &&
          changeMode !== 'allow' &&
          (!step.approval ||
            step.approval.objectiveVersion !== objective.version ||
            (step.approval.policyVersion || 0) !== policy.version)
        ) {
          step.approval = null;
          run.state = 'needs_approval';
          await persist(run, 'Review the exact next step before it changes workspace data.');
          await log(
            run.workspace_id,
            principal.name,
            'Workflow needs approval',
            run.id,
            step.toolId,
          );
          return;
        }
        const output = await tool.execute(
          { store, run, objective, principal },
          tool.input.parse(step.input),
        );
        const evidence = {
          result: output,
          observedAt: new Date(now()).toISOString(),
          objective: { id: objective.id, version: objective.version },
          method: 'deterministic',
        };
        await db
          .prepare('INSERT INTO tool_invocations VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .run(
            randomUUID(),
            run.id,
            step.id,
            step.toolId,
            step.toolVersion,
            run.principal_id,
            run.workspace_id,
            JSON.stringify(step.input),
            JSON.stringify(evidence),
            new Date(now()).toISOString(),
          );
        step.state = 'completed';
        step.output = evidence;
        step.attempts++;
        if (run.steps.every((step) => step.state === 'completed')) run.state = 'completed';
        await persist(run);
        await log(
          run.workspace_id,
          principal.name,
          'Workflow step completed',
          run.id,
          `${step.id}: ${step.toolId}`,
        );
      });
    } catch (error) {
      await transaction(async () => {
        const run = await readForUpdate(id);
        if (!run || terminal.has(run.state)) return;
        const step = nextStep(run);
        if (step) {
          step.attempts++;
          step.state = 'failed';
          step.approval = null;
        }
        run.state = 'failed';
        await persist(
          run,
          error instanceof z.ZodError ? 'Tool input no longer matches its schema.' : error.message,
        );
        await log(run.workspace_id, run.principal_id, 'Workflow failed', run.id, run.reason);
      });
    }
  }
  async function tick() {
    const candidates = await db
      .prepare(
        `SELECT id FROM workflow_runs
      WHERE (state = 'running' AND start_at <= ?) OR
        (state IN ('running', 'needs_approval', 'paused') AND expires_at <= ?)
      ORDER BY updated_at, id LIMIT 100`,
      )
      .all(now(), now());
    for (const run of candidates) await advance(run.id);
  }
  return {
    create,
    command,
    read,
    remove,
    tick,
    list: async (workspace) =>
      (
        await db
          .prepare('SELECT * FROM workflow_runs WHERE workspace_id = ? ORDER BY created_at DESC')
          .all(workspace)
      ).map(decode),
  };
}

export function mountWorkflows(app, store, runtime) {
  app.get('/api/tools', (_req, res) => res.json(toolCatalog));
  app.get('/api/workflows', async (req, res) => res.json(await runtime.list(req.workspace.id)));
  app.post('/api/workflows', requirePermission('workspace:manage'), async (req, res) =>
    res.status(201).json(await runtime.create(req.workspace.id, req.user.id, req.body)),
  );
  app.get('/api/workflows/:id', async (req, res) => {
    const run = await runtime.read(req.params.id, req.workspace.id);
    if (!run) return res.status(404).json({ error: 'Workflow not found.' });
    res.json(run);
  });
  app.patch('/api/workflows/:id', requirePermission('workspace:manage'), async (req, res) =>
    res.json(await runtime.command(req.params.id, req.workspace.id, req.user.id, req.body)),
  );
  app.delete('/api/workflows/:id', requirePermission('workspace:manage'), async (req, res) => {
    await runtime.remove(req.params.id, req.workspace.id, req.user.id);
    res.json({ ok: true });
  });
  app.get('/api/notifications', async (req, res) =>
    res.json(
      (await store.records(req.workspace.id, 'notification')).filter(
        (item) => item.recipientId === req.user.id,
      ),
    ),
  );
  app.patch('/api/notifications/:id', async (req, res) => {
    z.object({ read: z.literal(true) })
      .strict()
      .parse(req.body);
    const item = (await store.records(req.workspace.id, 'notification')).find(
      (item) => item.id === req.params.id && item.recipientId === req.user.id,
    );
    if (!item) return res.status(404).json({ error: 'Notification not found.' });
    await store.transaction(async () => {
      const row = await store.db.prepare('SELECT data FROM records WHERE id = ?').get(item.id);
      await store.db
        .prepare('UPDATE records SET data = ?, version = version + 1 WHERE id = ?')
        .run(
          JSON.stringify({ ...JSON.parse(row.data), readAt: new Date().toISOString() }),
          item.id,
        );
    });
    res.json({ ok: true });
  });
  app.get('/api/progress', async (req, res) =>
    res.json(await store.records(req.workspace.id, 'progress')),
  );
}
