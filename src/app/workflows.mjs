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
  // Workflow Builder (F-WF-01): a step on this tool is never actually executed — advance()
  // intercepts it before reaching tool.execute and parks it in the 'waiting' step state until a
  // matching POST /workflows/:id/events call resolves it. execute() exists only so this tool has
  // the same shape as every other catalog entry (input schema, fields) and to fail loudly if that
  // interception is ever bypassed.
  'event.wait': {
    name: 'Wait for an external event',
    engine: 'Consistency',
    band: 'A1',
    writes: false,
    input: z.object({ correlationKey: z.string().trim().min(1).max(200) }).strict(),
    fields: [{ name: 'correlationKey', required: true, maxLength: 200 }],
    async execute() {
      throw new Error('event.wait must be resolved via POST /workflows/:id/events, not executed directly.');
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
// Workflow Builder (F-WF-01): a plain equality predicate against a prior step's real output —
// no general expression language, an honest bounded condition instead of a fabricated rules
// engine. dependsOnStepId must be one of this step's own dependsOn ids (validated in create()).
const conditionSchema = z
  .object({
    dependsOnStepId: z.string(),
    field: z.string().trim().min(1).max(100),
    equals: z.union([z.string(), z.number(), z.boolean()]),
  })
  .strict();
const stepSchema = z
  .object({
    id: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,39}$/),
    toolId: z.string().refine((id) => Object.hasOwn(tools, id), 'Unknown or unavailable tool'),
    input: z.record(z.unknown()).default({}),
    dependsOn: z.array(z.string()).max(20).default([]),
    condition: conditionSchema.optional(),
    // Compensation (F-WF-01): when this step has already completed but the run later exhausts
    // its retry budget on a later step, compensateToolId (any catalog tool — this app has no
    // generic "undo," so the author picks whatever real action reconciles this step, e.g. a
    // review reminder for manual cleanup) runs with compensateInput, in reverse completion order
    // across the whole run.
    compensateToolId: z
      .string()
      .refine((id) => Object.hasOwn(tools, id), 'Unknown or unavailable tool')
      .optional(),
    compensateInput: z.record(z.unknown()).default({}),
  })
  .strict();
const workflowSchema = z
  .object({
    title,
    objectiveId: z.string().uuid(),
    // Reusable templates (F-WF-01): either inline steps (today's behavior) or a reference to a
    // saved workflow_definitions template, snapshotted into the run at creation time so a later
    // template edit never mutates an in-flight run.
    steps: z.array(stepSchema).min(1).max(20).optional(),
    definitionId: z.string().uuid().optional(),
    definitionVersion: z.number().int().positive().optional(),
    startAt: z.string().datetime().optional(),
    expiresAt: z.string().datetime(),
  })
  .strict()
  .refine((value) => Boolean(value.steps) !== Boolean(value.definitionId), {
    message: 'Provide either steps or definitionId, not both.',
  });
const definitionSchema = z
  .object({ name: z.string().trim().min(1).max(200), steps: z.array(stepSchema).min(1).max(20) })
  .strict();
const eventSchema = z
  .object({ correlationKey: z.string().trim().min(1).max(200), payload: z.record(z.unknown()).default({}) })
  .strict();
const commandSchema = z
  .object({
    version: z.number().int().positive(),
    objectiveVersion: z.number().int().positive().optional(),
    command: z.enum(['start', 'pause', 'resume', 'approve', 'cancel', 'retry']),
  })
  .strict();
const terminal = new Set(['completed', 'cancelled', 'expired', 'compensated']);
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
  // 'skipped' (a branch not taken) and 'completed' both satisfy a downstream dependency;
  // 'waiting' (an event.wait step already parked, pending an external POST /events) is
  // deliberately excluded from matching here, so advance() won't try to re-execute it — only
  // resolveEvent() or a state change on its own dependency chain moves it forward.
  function nextStep(run) {
    return run.steps.find(
      (step) =>
        !['completed', 'skipped', 'waiting'].includes(step.state) &&
        step.dependsOn.every((id) =>
          ['completed', 'skipped'].includes(run.steps.find((candidate) => candidate.id === id)?.state),
        ),
    );
  }
  // Conditional branching (F-WF-01): a step with a `condition` only actually runs if the
  // referenced dependency's real output field matches; otherwise it's marked 'skipped' (never
  // executed) and treated as satisfied for its own downstream dependents. Cascade: ANY pending
  // step — conditional or not — that depends on an already-skipped step is skipped too, since
  // the branch it belongs to was never taken; this is checked before (and independently of) that
  // step's own condition, so a plain unconditional step downstream of a skipped branch is
  // correctly skipped rather than silently running anyway. Loops until stable since one skip can
  // unblock evaluating the next.
  function resolveSkips(run) {
    let changed = true;
    while (changed) {
      changed = false;
      for (const step of run.steps) {
        if (step.state !== 'pending') continue;
        const dependsOnSkipped = step.dependsOn.some(
          (id) => run.steps.find((s) => s.id === id)?.state === 'skipped',
        );
        if (dependsOnSkipped) {
          step.state = 'skipped';
          step.output = null;
          changed = true;
          continue;
        }
        if (!step.condition) continue;
        const dep = run.steps.find((s) => s.id === step.condition.dependsOnStepId);
        if (dep?.state !== 'completed') continue;
        const satisfied = dep.output?.result?.[step.condition.field] === step.condition.equals;
        if (!satisfied) {
          step.state = 'skipped';
          step.output = null;
          changed = true;
        }
      }
    }
  }
  async function create(workspace, principal, body) {
    const input = workflowSchema.parse(body);
    const startAt = input.startAt ? Date.parse(input.startAt) : now();
    const expiresAt = Date.parse(input.expiresAt);
    if (expiresAt <= Math.max(now(), startAt) || expiresAt > now() + 30 * 86400000)
      fail('Expiry must follow the scheduled start and be within 30 days.', 400);
    // Reusable templates: the definition's steps are snapshotted here, at creation time, so a
    // later template edit (a new version) never reaches back and mutates an already-running run.
    let rawSteps = input.steps;
    if (input.definitionId) {
      const definition = input.definitionVersion
        ? await db
            .prepare('SELECT * FROM workflow_definitions WHERE definition_id = ? AND workspace_id = ? AND version = ?')
            .get(input.definitionId, workspace, input.definitionVersion)
        : await db
            .prepare(
              'SELECT * FROM workflow_definitions WHERE definition_id = ? AND workspace_id = ? ORDER BY version DESC LIMIT 1',
            )
            .get(input.definitionId, workspace);
      if (!definition) fail('That workflow template (or version) was not found.', 404);
      rawSteps = stepSchema.array().parse(JSON.parse(definition.steps));
    }
    const seen = new Set();
    const steps = rawSteps.map((step) => {
      if (seen.has(step.id) || step.dependsOn.some((id) => !seen.has(id)))
        fail('Step IDs must be unique and dependencies must reference earlier steps.', 400);
      if (step.condition && !step.dependsOn.includes(step.condition.dependsOnStepId))
        fail('A condition must reference one of the step\'s own dependsOn ids.', 400);
      if (step.compensateToolId) tools[step.compensateToolId].input.parse(step.compensateInput);
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
        resolveSkips(run);
        const step = nextStep(run);
        if (!step) {
          // A step parked in 'waiting' for an external event blocks completion even though
          // nextStep() (deliberately) won't return it — the run isn't actually finished.
          if (run.steps.some((s) => s.state === 'waiting')) return;
          run.state = 'completed';
          await persist(run);
          await log(run.workspace_id, principal.name, 'Workflow completed', run.id, run.title);
          return;
        }
        const tool = tools[step.toolId];
        if (!tool || step.toolVersion !== '1.0.0')
          fail('The registered tool version is unavailable.');
        // Event waits (F-WF-01): this step type is never actually executed here — it parks until
        // POST /workflows/:id/events supplies a matching correlationKey via resolveEvent().
        if (step.toolId === 'event.wait' && step.state === 'pending') {
          step.state = 'waiting';
          await persist(run, 'Waiting for a matching external event.');
          await log(
            run.workspace_id,
            principal.name,
            'Workflow waiting for event',
            run.id,
            step.input.correlationKey,
          );
          return;
        }
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
        // Compensation (F-WF-01): once the failing step has exhausted its retry budget, run
        // compensating actions for every already-completed step that declared one, in reverse
        // completion order, instead of leaving the workspace with partial, un-reconciled effects.
        // A run with nothing to compensate (no step declared compensateToolId) keeps today's
        // plain 'failed' outcome unchanged — 'compensated' only applies when something real ran.
        const toCompensate = run.steps.filter((s) => s.state === 'completed' && s.compensateToolId).reverse();
        if (step && step.attempts >= 3 && toCompensate.length > 0) {
          try {
            const principal = await principalFor(run);
            const objective = await objectiveFor(run);
            for (const s of toCompensate) {
              const compTool = tools[s.compensateToolId];
              const compOutput = await compTool.execute(
                { store, run, objective, principal },
                compTool.input.parse(s.compensateInput || {}),
              );
              await db
                .prepare('INSERT INTO tool_invocations VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                .run(
                  randomUUID(),
                  run.id,
                  `${s.id}:compensate`,
                  s.compensateToolId,
                  '1.0.0',
                  run.principal_id,
                  run.workspace_id,
                  JSON.stringify(s.compensateInput || {}),
                  JSON.stringify({
                    result: compOutput,
                    observedAt: new Date(now()).toISOString(),
                    method: 'compensation',
                  }),
                  new Date(now()).toISOString(),
                );
            }
            run.state = 'compensated';
            await persist(
              run,
              `Retry budget exhausted; ${toCompensate.length} compensating action(s) executed.`,
            );
            await log(run.workspace_id, run.principal_id, 'Workflow compensated', run.id, run.reason);
            return;
          } catch {
            // Compensation itself failed (e.g. the principal or objective is no longer
            // available) — fall through to the plain 'failed' state below rather than losing the
            // original failure or crashing the scheduler tick.
          }
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
  // Event waits, resolved (F-WF-01): the external counterpart to advance()'s 'waiting' parking —
  // finds the matching step within this one run and completes it with the supplied payload as
  // its real output, then lets a subsequent tick()/advance() continue the run.
  async function resolveEvent(id, workspace, actor, body) {
    const input = eventSchema.parse(body);
    return transaction(async () => {
      const run = await readForUpdate(id, workspace);
      if (!run) fail('Workflow not found.', 404);
      if (terminal.has(run.state)) fail('This workflow has ended.');
      const step = run.steps.find(
        (s) => s.toolId === 'event.wait' && s.state === 'waiting' && s.input.correlationKey === input.correlationKey,
      );
      if (!step) fail('No step on this workflow is waiting for that event.', 404);
      const evidence = {
        result: { payload: input.payload },
        observedAt: new Date(now()).toISOString(),
        method: 'event',
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
      await persist(run, `Event resolved: ${input.correlationKey}`);
      await log(workspace, actor, 'Workflow event resolved', run.id, input.correlationKey);
      return run;
    });
  }
  return {
    create,
    command,
    read,
    remove,
    tick,
    resolveEvent,
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
  app.post('/api/workflows/:id/events', requirePermission('workspace:manage'), async (req, res) =>
    res.json(await runtime.resolveEvent(req.params.id, req.workspace.id, req.user.id, req.body)),
  );
  // Reusable templates (F-WF-01): a named, versioned step-sequence a workspace can reuse across
  // many runs instead of re-supplying the same steps JSON every time. Same MAX(version)+1
  // versioning pattern used throughout this app (scope_versions, intelligence_result_versions).
  app.post('/api/workflow-definitions', requirePermission('workspace:manage'), async (req, res) => {
    const input = definitionSchema.parse(req.body);
    const id =
      (
        await store.db
          .prepare('SELECT definition_id FROM workflow_definitions WHERE workspace_id = ? AND name = ? LIMIT 1')
          .get(req.workspace.id, input.name)
      )?.definition_id ?? randomUUID();
    const versionRow = await store.db
      .prepare('SELECT COALESCE(MAX(version), 0) AS max_version FROM workflow_definitions WHERE definition_id = ?')
      .get(id);
    const version = versionRow.max_version + 1;
    const createdAt = new Date().toISOString();
    await store.transaction(async () => {
      await store.db
        .prepare('INSERT INTO workflow_definitions VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(randomUUID(), req.workspace.id, input.name, version, id, JSON.stringify(input.steps), createdAt);
      await store.log(req.workspace.id, req.user.name, 'Workflow template saved', id, `${input.name} v${version}`);
    });
    res.status(201).json({ id, name: input.name, version, steps: input.steps, createdAt });
  });
  app.get('/api/workflow-definitions', async (req, res) => {
    const rows = await store.db
      .prepare(
        `SELECT DISTINCT ON (definition_id) definition_id AS id, name, version, steps, created_at FROM workflow_definitions
         WHERE workspace_id = ? ORDER BY definition_id, version DESC`,
      )
      .all(req.workspace.id);
    res.json(rows.map((row) => ({ ...row, steps: JSON.parse(row.steps) })));
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
