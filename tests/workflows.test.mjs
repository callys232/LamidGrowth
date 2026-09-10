import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { openStore } from '../server/store.mjs';
import { createWorkflowRuntime } from '../src/app/workflows.mjs';

function setup(filename = ':memory:') {
  const store = openStore(filename);
  const user = randomUUID(),
    workspace = randomUUID();
  store.db
    .prepare('INSERT INTO users (id, name, created_at) VALUES (?, ?, ?)')
    .run(user, 'Owner', new Date().toISOString());
  store.db
    .prepare('INSERT INTO workspaces VALUES (?, ?, ?, ?, ?, ?)')
    .run(workspace, user, 'Test', 'Professional', 'individual', 1);
  store.db
    .prepare('INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)')
    .run(workspace, user, 'owner', 'active', Date.now());
  const objective = store.insert(workspace, 'objective', {
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
  const command = (run, command) =>
    runtime.command(run.id, workspace, user, {
      command,
      version: read(run).version,
      ...(command === 'approve'
        ? {
            objectiveVersion: store.db
              .prepare('SELECT version FROM records WHERE id = ?')
              .get(objective.id).version,
          }
        : {}),
    });
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

test('workflow changes wait for exact versioned approval and execute once', () => {
  const f = setup();
  try {
    const run = f.runtime.create(
      f.workspace,
      f.user,
      f.spec([
        { id: 'context', toolId: 'context.snapshot' },
        { ...write, dependsOn: ['context'] },
      ]),
    );
    f.command(run, 'start');
    f.runtime.tick();
    assert.equal(f.read(run).steps[0].state, 'completed');
    f.runtime.tick();
    assert.equal(f.read(run).state, 'needs_approval');
    assert.equal(f.store.records(f.workspace, 'action').length, 0);
    assert.throws(
      () => f.runtime.command(run.id, f.workspace, f.user, { version: 1, command: 'approve' }),
      /changed/,
    );
    f.command(run, 'approve');
    // A material objective revision invalidates the approval before execution.
    f.store.db.prepare('UPDATE records SET version = version + 1 WHERE id = ?').run(f.objective.id);
    f.runtime.tick();
    assert.equal(f.read(run).state, 'needs_approval');
    f.command(run, 'approve');
    f.runtime.tick();
    f.runtime.tick();
    assert.equal(f.read(run).state, 'completed');
    assert.equal(f.store.records(f.workspace, 'action').length, 1);
    assert.equal(
      f.store.db.prepare('SELECT COUNT(*) AS count FROM tool_invocations').get().count,
      2,
    );
    assert.throws(() => f.command(run, 'start'), /ended/);
  } finally {
    f.store.db.close();
  }
});

test('workflow authority is bounded by principal, tenant, schedule, pause and expiry', () => {
  const f = setup();
  try {
    assert.throws(
      () =>
        f.runtime.create(
          f.workspace,
          f.user,
          f.spec([{ id: 'unknown', toolId: 'external.publish' }]),
        ),
      /Unknown/,
    );
    assert.throws(
      () => f.runtime.create(f.workspace, f.user, f.spec([{ ...write, dependsOn: ['later'] }])),
      /dependencies/,
    );
    assert.throws(
      () =>
        f.runtime.create(
          f.workspace,
          f.user,
          f.spec([{ ...write, input: { title: 'Bad', workspaceId: 'other' } }]),
        ),
      /Unrecognized/,
    );
    const run = f.runtime.create(f.workspace, f.user, {
      ...f.spec([write]),
      startAt: new Date(Date.now() + 60000).toISOString(),
    });
    assert.equal(f.runtime.read(run.id, randomUUID()), undefined);
    assert.throws(
      () => f.runtime.command(run.id, f.workspace, randomUUID(), { version: 1, command: 'start' }),
      /authorizing/,
    );
    f.command(run, 'start');
    f.runtime.tick();
    assert.equal(f.read(run).state, 'running');
    f.advanceTime(61000);
    f.runtime.tick();
    assert.equal(f.read(run).state, 'needs_approval');
    f.command(run, 'approve');
    f.command(run, 'pause');
    f.runtime.tick();
    assert.equal(f.store.records(f.workspace, 'action').length, 0);
    f.command(run, 'resume');
    f.runtime.tick();
    assert.equal(f.read(run).state, 'needs_approval');
    f.command(run, 'approve');
    f.store.db
      .prepare("UPDATE workspace_members SET status = 'disabled' WHERE workspace_id = ?")
      .run(f.workspace);
    f.runtime.tick();
    assert.equal(f.read(run).state, 'paused');
    assert.equal(f.store.records(f.workspace, 'action').length, 0);
    f.advanceTime(86400000);
    f.runtime.tick();
    assert.equal(f.read(run).state, 'expired');
  } finally {
    f.store.db.close();
  }
});

test('failed workflow tool mutation rolls back and can be retried only within its budget', () => {
  const f = setup();
  try {
    const run = f.runtime.create(f.workspace, f.user, f.spec([write]));
    f.command(run, 'start');
    f.runtime.tick();
    f.command(run, 'approve');
    f.store.db.exec(
      "CREATE TRIGGER reject_action BEFORE INSERT ON records WHEN NEW.kind = 'action' BEGIN SELECT RAISE(ABORT, 'simulated storage rejection'); END",
    );
    for (let i = 0; i < 3; i++) {
      f.runtime.tick();
      assert.equal(f.read(run).state, 'failed');
      assert.equal(f.store.records(f.workspace, 'action').length, 0);
      if (i < 2) {
        f.command(run, 'retry');
        f.runtime.tick();
        f.command(run, 'approve');
      }
    }
    assert.throws(() => f.command(run, 'retry'), /retry limit/);
    assert.equal(
      f.store.db.prepare('SELECT COUNT(*) AS count FROM tool_invocations').get().count,
      0,
    );
    f.command(run, 'cancel');
    assert.equal(f.read(run).state, 'cancelled');
  } finally {
    f.store.db.close();
  }
});

test('unfinished authorized work survives reopening the database without repeating completed steps', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lamid-workflow-'));
  const filename = join(dir, 'workflow.db');
  const f = setup(filename);
  let reopened;
  try {
    const run = f.runtime.create(
      f.workspace,
      f.user,
      f.spec([
        { id: 'context', toolId: 'context.snapshot' },
        { ...write, dependsOn: ['context'] },
      ]),
    );
    f.command(run, 'start');
    f.runtime.tick();
    f.runtime.tick();
    f.command(run, 'approve');
    f.store.db.close();
    reopened = openStore(filename);
    const runtime = createWorkflowRuntime(reopened);
    runtime.tick();
    runtime.tick();
    assert.equal(runtime.read(run.id, f.workspace).state, 'completed');
    assert.equal(reopened.records(f.workspace, 'action').length, 1);
    assert.equal(
      reopened.db.prepare('SELECT COUNT(*) AS count FROM tool_invocations').get().count,
      2,
    );
  } finally {
    (reopened || f.store).db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
