import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createApp } from '../src/app/app.mjs';
import { workspaceStateSchema } from '../src/contracts/workspace.mjs';

test(
  'workspace state and writes remain scoped to the authenticated session workspace',
  { timeout: 240000 },
  async (t) => {
    if (
      !process.env.TEST_DATABASE_URL ||
      process.env.TEST_DATABASE_URL === process.env.DATABASE_URL
    )
      return t.skip(
        'A dedicated TEST_DATABASE_URL is required; production databases are never used.',
      );

    const system = await createApp({
      filename: `test_tenant_state_${randomUUID().replaceAll('-', '')}`,
      errorLogger() {},
    });
    const { app, store } = system;
    let server;
    t.after(async () => {
      if (server) await new Promise((resolve) => server.close(resolve));
      await store.dropSchema();
    });

    const userA = randomUUID();
    const userB = randomUUID();
    const workspaceA = randomUUID();
    const workspaceB = randomUUID();
    const sessionToken = randomBytes(32).toString('hex');
    const now = Date.now();
    for (const [id, email, name] of [
      [userA, 'tenant-a@example.test', 'Tenant A'],
      [userB, 'tenant-b@example.test', 'Tenant B'],
    ]) {
      await store.db
        .prepare('INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)')
        .run(id, email, name, new Date(now).toISOString());
    }
    for (const [id, ownerId, name] of [
      [workspaceA, userA, 'Workspace A'],
      [workspaceB, userB, 'Workspace B'],
    ]) {
      await store.db
        .prepare(
          'INSERT INTO workspaces (id, user_id, name, context, tier, member_limit) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .run(id, ownerId, name, 'Team', 'enterprise', 10);
    }
    for (const [workspaceId, memberId, role] of [
      [workspaceA, userA, 'owner'],
      [workspaceB, userB, 'owner'],
      [workspaceB, userA, 'member'],
    ]) {
      await store.db
        .prepare(
          'INSERT INTO workspace_members (workspace_id, user_id, role, status, created_at) VALUES (?, ?, ?, ?, ?)',
        )
        .run(workspaceId, memberId, role, 'active', now);
    }
    await store.db
      .prepare(
        'INSERT INTO sessions (token, user_id, expires_at, workspace_id) VALUES (?, ?, ?, ?)',
      )
      .run(
        createHash('sha256').update(sessionToken).digest('hex'),
        userA,
        now + 60_000,
        workspaceA,
      );

    const privateA = await store.insert(workspaceA, 'objective', {
      title: 'Private to workspace A',
      description: '',
      context: 'Team',
      priority: 'High',
      status: 'Active',
      targetDate: '',
      constraints: '',
      success: '',
    });
    const privateB = await store.insert(workspaceB, 'objective', {
      title: 'Private to workspace B',
      description: '',
      context: 'Team',
      priority: 'High',
      status: 'Active',
      targetDate: '',
      constraints: '',
      success: '',
    });

    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', resolve);
    });
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const headers = {
      Cookie: `lamid_session=${sessionToken}`,
      'Content-Type': 'application/json',
      'X-Workspace-Id': workspaceB,
    };
    const stateResponse = await fetch(`${base}/state`, { headers });
    assert.equal(stateResponse.status, 200);
    const state = await stateResponse.json();
    const parsedState = workspaceStateSchema.safeParse(state);
    assert.ok(parsedState.success, JSON.stringify(parsedState.error?.issues));
    assert.equal(state.workspace.id, workspaceA);
    assert.deepEqual(
      state.objectives.map(({ id }) => id),
      [privateA.id],
    );
    assert.ok(!JSON.stringify(state).includes(privateB.id));

    const objectiveInput = {
      title: 'Write remains in workspace A',
      description: '',
      context: 'Team',
      priority: 'Medium',
      status: 'Active',
      targetDate: '',
      constraints: '',
      success: '',
    };
    const rejectedMutation = await fetch(`${base}/objectives`, {
      method: 'POST',
      headers,
      body: JSON.stringify(objectiveInput),
    });
    assert.equal(rejectedMutation.status, 409);
    assert.deepEqual(
      (await store.records(workspaceA, 'objective')).map(({ id }) => id),
      [privateA.id],
    );
    assert.deepEqual(
      (await store.records(workspaceB, 'objective')).map(({ id }) => id),
      [privateB.id],
    );

    const createResponse = await fetch(`${base}/objectives`, {
      method: 'POST',
      headers: { ...headers, 'X-Workspace-Id': workspaceA },
      body: JSON.stringify(objectiveInput),
    });
    const created = await createResponse.json();
    assert.equal(createResponse.status, 201, JSON.stringify(created));
    assert.equal(
      (await store.records(workspaceA, 'objective')).some(({ id }) => id === created.id),
      true,
    );
    assert.equal(
      (await store.records(workspaceB, 'objective')).some(({ id }) => id === created.id),
      false,
    );
  },
);
