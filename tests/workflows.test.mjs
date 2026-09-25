import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { openStore } from '../server/store.mjs';
import { createWorkflowRuntime } from '../src/app/workflows.mjs';

async function setup(filename = ':memory:') {
  const store = await openStore(filename);
  const user = randomUUID(),
    workspace = randomUUID();
  await store.db
    .prepare('INSERT INTO users (id, name, created_at) VALUES (?, ?, ?)')
    .run(user, 'Owner', new Date().toISOString());
  await store.db
    .prepare('INSERT INTO workspaces (id, user_id, name, context, tier, member_limit) VALUES (?, ?, ?, ?, ?, ?)')
    .run(workspace, user, 'Test', 'Professional', 'individual', 1);
  await store.db
    .prepare('INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)')
    .run(workspace, user, 'owner', 'active', Date.now());
  const objective = await store.insert(workspace, 'objective', {
    title: 'Outcome',
    status: 'Active',
    success: 'A report',
    constraints: 'One week',
  });
  let time = Date.now();
  const runtime = createWorkflowRuntime(store, () => time);
  const spec = (steps) => ({
    title: 'Scoped process',
    objectiveId: objective.id,
    steps,
    expiresAt: new Date(time + 86400000).toISOString(),
  });
  const read = (run) => runtime.read(run.id, workspace);
  const command = async (run, command) => {
    const objectiveVersion =
      command === 'approve'
        ? (await store.db.prepare('SELECT version FROM records WHERE id = ?').get(objective.id))
            .version
        : undefined;
    return runtime.command(run.id, workspace, user, {
      command,
      version: (await read(run)).version,
      ...(objectiveVersion !== undefined ? { objectiveVersion } : {}),
    });
  };
  return {
    store,
    user,
    workspace,
    objective,
    runtime,
    spec,
    read,
    command,
    advanceTime: (ms) => {
      time += ms;
    },
  };
}
const write = { id: 'action', toolId: 'action.prepare', input: { title: 'Prepare report' } };

test('human workflow rules block writes and allow only explicitly authorized workflow steps', async () => {
  const f = await setup();
  try {
    const policy = await f.store.insert(f.workspace, 'ai_policy', {
      enabled: false,
      dailyLimit: 10,
      rules: { workflowCommands: false, changes: { 'action.prepare': 'block' } },
    });
    const run = await f.runtime.create(f.workspace, f.user, f.spec([write]));
    await assert.rejects(
      () =>
        f.runtime.command(
          run.id,
          f.workspace,
          f.user,
          { command: 'start', version: run.version },
          { fromCompanion: true },
        ),
      /block workflowCommands/,
    );
    assert.equal((await f.read(run)).state, 'draft');
    await f.command(run, 'start');
    await f.runtime.tick();
    assert.equal((await f.read(run)).state, 'paused');
    assert.equal((await f.store.records(f.workspace, 'action')).length, 0);
    await f.store.db.prepare('UPDATE records SET data = ?, version = version + 1 WHERE id = ?').run(
      JSON.stringify({
        enabled: false,
        dailyLimit: 10,
        rules: { changes: { 'action.prepare': 'allow' } },
      }),
      policy.id,
    );
    await f.command(run, 'resume');
    await f.runtime.tick();
    assert.equal((await f.read(run)).state, 'completed');
    assert.equal((await f.store.records(f.workspace, 'action')).length, 1);
  } finally {
    await f.store.db.close();
  }
});

test('workflow changes wait for exact versioned approval and execute once', async () => {
  const f = await setup();
  try {
    const run = await f.runtime.create(
      f.workspace,
      f.user,
      f.spec([
        { id: 'context', toolId: 'context.snapshot' },
        { ...write, dependsOn: ['context'] },
      ]),
    );
    await f.command(run, 'start');
    await f.runtime.tick();
    assert.equal((await f.read(run)).steps[0].state, 'completed');
    await f.runtime.tick();
    assert.equal((await f.read(run)).state, 'needs_approval');
    assert.equal((await f.store.records(f.workspace, 'action')).length, 0);
    await assert.rejects(
      () => f.runtime.command(run.id, f.workspace, f.user, { version: 1, command: 'approve' }),
      /changed/,
    );
    await f.command(run, 'approve');
    // A material objective revision invalidates the approval before execution.
    await f.store.db
      .prepare('UPDATE records SET version = version + 1 WHERE id = ?')
      .run(f.objective.id);
    await f.runtime.tick();
    assert.equal((await f.read(run)).state, 'needs_approval');
    await f.command(run, 'approve');
    await f.runtime.tick();
    await f.runtime.tick();
    assert.equal((await f.read(run)).state, 'completed');
    assert.equal((await f.store.records(f.workspace, 'action')).length, 1);
    assert.equal(
      (await f.store.db.prepare('SELECT COUNT(*) AS count FROM tool_invocations').get()).count,
      2,
    );
    await assert.rejects(() => f.command(run, 'start'), /ended/);
  } finally {
    await f.store.dropSchema();
  }
});

test('workflow authority is bounded by principal, tenant, schedule, pause and expiry', async () => {
  const f = await setup();
  try {
    await assert.rejects(
      () =>
        f.runtime.create(
          f.workspace,
          f.user,
          f.spec([{ id: 'unknown', toolId: 'external.publish' }]),
        ),
      /Unknown/,
    );
    await assert.rejects(
      () => f.runtime.create(f.workspace, f.user, f.spec([{ ...write, dependsOn: ['later'] }])),
      /dependencies/,
    );
    await assert.rejects(
      () =>
        f.runtime.create(
          f.workspace,
          f.user,
          f.spec([{ ...write, input: { title: 'Bad', workspaceId: 'other' } }]),
        ),
      /Unrecognized/,
    );
    const run = await f.runtime.create(f.workspace, f.user, {
      ...f.spec([write]),
      startAt: new Date(Date.now() + 60000).toISOString(),
    });
    assert.equal(await f.runtime.read(run.id, randomUUID()), undefined);
    await assert.rejects(
      () => f.runtime.command(run.id, f.workspace, randomUUID(), { version: 1, command: 'start' }),
      /authorizing/,
    );
    await f.command(run, 'start');
    await f.runtime.tick();
    assert.equal((await f.read(run)).state, 'running');
    f.advanceTime(61000);
    await f.runtime.tick();
    assert.equal((await f.read(run)).state, 'needs_approval');
    await f.command(run, 'approve');
    await f.command(run, 'pause');
    await f.runtime.tick();
    assert.equal((await f.store.records(f.workspace, 'action')).length, 0);
    await f.command(run, 'resume');
    await f.runtime.tick();
    assert.equal((await f.read(run)).state, 'needs_approval');
    await f.command(run, 'approve');
    await f.store.db
      .prepare("UPDATE workspace_members SET status = 'disabled' WHERE workspace_id = ?")
      .run(f.workspace);
    await f.runtime.tick();
    assert.equal((await f.read(run)).state, 'paused');
    assert.equal((await f.store.records(f.workspace, 'action')).length, 0);
    f.advanceTime(86400000);
    await f.runtime.tick();
    assert.equal((await f.read(run)).state, 'expired');
  } finally {
    await f.store.dropSchema();
  }
});

test('failed workflow tool mutation rolls back and can be retried only within its budget', async () => {
  const f = await setup();
  try {
    const run = await f.runtime.create(f.workspace, f.user, f.spec([write]));
    await f.command(run, 'start');
    await f.runtime.tick();
    await f.command(run, 'approve');
    await f.store.db.exec(`
      CREATE OR REPLACE FUNCTION reject_action() RETURNS trigger AS $$
      BEGIN
        IF NEW.kind = 'action' THEN
          RAISE EXCEPTION 'simulated storage rejection';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER reject_action BEFORE INSERT ON records FOR EACH ROW EXECUTE FUNCTION reject_action();
    `);
    for (let i = 0; i < 3; i++) {
      await f.runtime.tick();
      assert.equal((await f.read(run)).state, 'failed');
      assert.equal((await f.store.records(f.workspace, 'action')).length, 0);
      if (i < 2) {
        await f.command(run, 'retry');
        await f.runtime.tick();
        await f.command(run, 'approve');
      }
    }
    await assert.rejects(() => f.command(run, 'retry'), /retry limit/);
    assert.equal(
      (await f.store.db.prepare('SELECT COUNT(*) AS count FROM tool_invocations').get()).count,
      0,
    );
    await f.command(run, 'cancel');
    assert.equal((await f.read(run)).state, 'cancelled');
  } finally {
    await f.store.dropSchema();
  }
});

test('unfinished authorized work survives reopening the database without repeating completed steps', async () => {
  // Named exception to the ":memory:"-per-test-file pattern: a real (sanitized) schema name is
  // reused across two separate openStore() calls to prove in-flight work survives a reconnect.
  const schemaName = `workflows_reopen_${randomUUID().replace(/-/g, '_')}`;
  const f = await setup(schemaName);
  let reopened;
  try {
    const run = await f.runtime.create(
      f.workspace,
      f.user,
      f.spec([
        { id: 'context', toolId: 'context.snapshot' },
        { ...write, dependsOn: ['context'] },
      ]),
    );
    await f.command(run, 'start');
    await f.runtime.tick();
    await f.runtime.tick();
    await f.command(run, 'approve');
    await f.store.db.close();
    reopened = await openStore(schemaName);
    const runtime = createWorkflowRuntime(reopened);
    await runtime.tick();
    await runtime.tick();
    assert.equal((await runtime.read(run.id, f.workspace)).state, 'completed');
    assert.equal((await reopened.records(f.workspace, 'action')).length, 1);
    assert.equal(
      (await reopened.db.prepare('SELECT COUNT(*) AS count FROM tool_invocations').get()).count,
      2,
    );
  } finally {
    await (reopened || f.store).dropSchema();
  }
});

test('F-WF-01: a workflow definition template is versioned and snapshotted into each run created from it', async () => {
  const f = await setup();
  try {
    const definitionId = randomUUID();
    await f.store.db
      .prepare('INSERT INTO workflow_definitions VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(
        randomUUID(),
        f.workspace,
        'Standard review',
        1,
        definitionId,
        JSON.stringify([{ id: 'context', toolId: 'context.snapshot', input: {}, dependsOn: [] }]),
        new Date().toISOString(),
      );
    const run = await f.runtime.create(f.workspace, f.user, {
      title: 'From template',
      objectiveId: f.objective.id,
      definitionId,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
    assert.equal(run.steps.length, 1);
    assert.equal(run.steps[0].toolId, 'context.snapshot');

    // A later template version must not reach back and mutate the already-created run.
    await f.store.db
      .prepare('INSERT INTO workflow_definitions VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(
        randomUUID(),
        f.workspace,
        'Standard review',
        2,
        definitionId,
        JSON.stringify([write]),
        new Date().toISOString(),
      );
    assert.equal((await f.read(run)).steps[0].toolId, 'context.snapshot');

    const runV2 = await f.runtime.create(f.workspace, f.user, {
      title: 'From v2',
      objectiveId: f.objective.id,
      definitionId,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
    assert.equal(runV2.steps[0].toolId, 'action.prepare');

    await assert.rejects(
      () =>
        f.runtime.create(f.workspace, f.user, {
          title: 'Both',
          objectiveId: f.objective.id,
          definitionId,
          steps: [write],
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      /either steps or definitionId/,
    );
  } finally {
    await f.store.dropSchema();
  }
});

test('F-WF-01: a step with a condition only runs when its dependency output matches, and downstream skips cascade', async () => {
  const f = await setup();
  try {
    const run = await f.runtime.create(
      f.workspace,
      f.user,
      f.spec([
        { id: 'review', toolId: 'capability.review' },
        {
          id: 'takenBranch',
          toolId: 'review.reminder',
          input: { message: 'taken' },
          dependsOn: ['review'],
          condition: {
            dependsOnStepId: 'review',
            field: 'method',
            equals: 'Recorded user inputs; no automated assessment',
          },
        },
        {
          id: 'untakenBranch',
          toolId: 'review.reminder',
          input: { message: 'untaken' },
          dependsOn: ['review'],
          condition: { dependsOnStepId: 'review', field: 'method', equals: 'something-else' },
        },
        {
          id: 'afterUntaken',
          toolId: 'action.prepare',
          input: { title: 'downstream of untaken' },
          dependsOn: ['untakenBranch'],
        },
      ]),
    );
    await f.command(run, 'start');
    await f.runtime.tick(); // 'review' (writes: false) executes immediately
    assert.equal((await f.read(run)).steps[0].state, 'completed');
    await f.runtime.tick(); // resolveSkips: untakenBranch skipped; takenBranch -> needs_approval
    const afterResolve = await f.read(run);
    assert.equal(afterResolve.state, 'needs_approval');
    assert.equal(afterResolve.steps.find((s) => s.id === 'untakenBranch').state, 'skipped');
    assert.equal(afterResolve.steps.find((s) => s.id === 'takenBranch').state, 'pending');
    await f.command(run, 'approve');
    await f.runtime.tick(); // takenBranch executes
    await f.runtime.tick(); // resolveSkips: afterUntaken cascades to skipped (its dependency never ran)
    const final = await f.read(run);
    assert.equal(final.steps.find((s) => s.id === 'takenBranch').state, 'completed');
    assert.equal(final.steps.find((s) => s.id === 'afterUntaken').state, 'skipped');
    assert.equal(final.state, 'completed');
  } finally {
    await f.store.dropSchema();
  }
});

test('F-WF-01: an event.wait step blocks the run until a matching event is posted', async () => {
  const f = await setup();
  try {
    const run = await f.runtime.create(
      f.workspace,
      f.user,
      f.spec([
        { id: 'wait', toolId: 'event.wait', input: { correlationKey: 'external-approval-123' } },
        { id: 'after', toolId: 'context.snapshot', dependsOn: ['wait'] },
      ]),
    );
    await f.command(run, 'start');
    await f.runtime.tick();
    assert.equal((await f.read(run)).steps[0].state, 'waiting');
    assert.equal((await f.read(run)).state, 'running', 'a waiting step must not be mistaken for run failure');
    await f.runtime.tick();
    assert.equal((await f.read(run)).state, 'running', 'a waiting step must not falsely complete the run');
    assert.equal((await f.read(run)).steps[1].state, 'pending');

    await assert.rejects(
      () => f.runtime.resolveEvent(run.id, f.workspace, f.user, { correlationKey: 'wrong-key' }),
      /waiting for that event/,
    );
    const resolved = await f.runtime.resolveEvent(run.id, f.workspace, f.user, {
      correlationKey: 'external-approval-123',
      payload: { approved: true },
    });
    assert.equal(resolved.steps[0].state, 'completed');
    assert.deepEqual(resolved.steps[0].output.result.payload, { approved: true });
    await f.runtime.tick();
    assert.equal((await f.read(run)).state, 'completed');
  } finally {
    await f.store.dropSchema();
  }
});

test('F-WF-01: exhausting the retry budget runs compensating actions for already-completed steps', async () => {
  const f = await setup();
  try {
    const run = await f.runtime.create(
      f.workspace,
      f.user,
      f.spec([
        {
          id: 'prep',
          toolId: 'action.prepare',
          input: { title: 'Prepare report' },
          compensateToolId: 'review.reminder',
          compensateInput: { message: 'Undo: report prep' },
        },
        { id: 'progress', toolId: 'progress.snapshot', dependsOn: ['prep'] },
      ]),
    );
    await f.command(run, 'start');
    await f.runtime.tick(); // 'prep' -> needs_approval
    await f.command(run, 'approve');
    await f.runtime.tick(); // 'prep' executes and completes
    assert.equal((await f.read(run)).steps[0].state, 'completed');

    await f.store.db.exec(`
      CREATE OR REPLACE FUNCTION reject_progress() RETURNS trigger AS $$
      BEGIN
        IF NEW.kind = 'progress' THEN
          RAISE EXCEPTION 'simulated storage rejection';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER reject_progress BEFORE INSERT ON records FOR EACH ROW EXECUTE FUNCTION reject_progress();
    `);
    await f.runtime.tick(); // 'progress' -> needs_approval
    await f.command(run, 'approve');
    for (let i = 0; i < 3; i++) {
      await f.runtime.tick();
      if (i < 2) {
        assert.equal((await f.read(run)).state, 'failed');
        await f.command(run, 'retry');
        await f.runtime.tick();
        await f.command(run, 'approve');
      }
    }
    const final = await f.read(run);
    assert.equal(final.state, 'compensated');
    assert.equal(final.steps[1].attempts, 3);
    // The compensating action (review.reminder) actually ran, recorded with a distinct
    // step_id so it never collides with the original step's own tool_invocations row.
    const invocation = await f.store.db
      .prepare("SELECT * FROM tool_invocations WHERE run_id = ? AND step_id = 'prep:compensate'")
      .get(run.id);
    assert.ok(invocation, 'the compensating action must be recorded as a real tool invocation');
    assert.equal(invocation.tool_id, 'review.reminder');
  } finally {
    await f.store.dropSchema();
  }
});

test('a workflow can only be deleted once it has actually finished, and only by its own authorizing owner', async () => {
  const f = await setup();
  try {
    const run = await f.runtime.create(f.workspace, f.user, f.spec([write]));
    await assert.rejects(
      () => f.runtime.remove(run.id, f.workspace, f.user),
      /completed, cancelled or expired/,
    );
    await f.command(run, 'start');
    await f.runtime.tick();
    await f.command(run, 'approve');
    await f.runtime.tick();
    assert.equal((await f.read(run)).state, 'completed');
    await assert.rejects(() => f.runtime.remove(run.id, f.workspace, randomUUID()), /authorizing/);
    assert.ok(await f.read(run));
    await f.runtime.remove(run.id, f.workspace, f.user);
    assert.equal(await f.read(run), undefined);
    await assert.rejects(() => f.runtime.remove(run.id, f.workspace, f.user), /not found/i);
  } finally {
    await f.store.dropSchema();
  }
});
