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
    .prepare('INSERT INTO workspaces VALUES (?, ?, ?, ?, ?, ?)')
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
        ? (await store.db.prepare('SELECT version FROM records WHERE id = ?').get(objective.id)).version
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
    await f.store.db.prepare('UPDATE records SET version = version + 1 WHERE id = ?').run(f.objective.id);
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
