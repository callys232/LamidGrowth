import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createFundedTestApp } from './support/funded-app.mjs';

test(
  'lost completion recovers without another charge; pagination and cancellation preserve ownership',
  { timeout: 300000 },
  async (t) => {
    const instance = await createFundedTestApp({
      filename: ':memory:',
      aiProvider: null,
      mailProvider: null,
      ecosystemAdminEmails: ['task-recovery@example.test'],
    });
    const server = instance.app.listen(0, '127.0.0.1');
    await new Promise((r) => server.once('listening', r));
    t.after(async () => {
      await new Promise((r) => server.close(r));
      await instance.store.dropSchema();
    });
    let cookie;
    async function call(path, body) {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        signal: AbortSignal.timeout(60000),
        headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!cookie)
        cookie = response.headers
          .getSetCookie()
          .map((c) => c.split(';')[0])
          .join('; ');
      return { status: response.status, data: await response.json() };
    }
    assert.equal(
      (
        await call('/auth/signup', {
          name: 'Task recovery',
          email: 'task-recovery@example.test',
          password: 'safe-test-password-123',
          context: 'Founder',
        })
      ).status,
      201,
    );
    const first = (await call('/companion/tasks', { message: 'Improve personal goal planning' }))
      .data;
    const second = (await call('/companion/tasks', { message: 'Another goal for later' })).data;
    const page = await call('/companion/tasks?limit=1');
    assert.equal(page.data.length, 1);
    assert.equal(page.data[0].id, second.id);
    assert.equal(
      (await call(`/companion/tasks?limit=1&before=${page.data[0].cursor}`)).data[0].id,
      first.id,
    );
  assert.equal((await call('/companion/tasks?limit=0')).status, 400);
  assert.equal((await call('/companion/tasks?before=invalid')).status, 400);
  assert.equal((await call('/companion/tasks?before=9999999999999999999')).status, 400);
    assert.equal((await call(`/companion/tasks/${second.id}/cancel`, { version: 2 })).status, 409);
    const cancelled = await call(`/companion/tasks/${second.id}/cancel`, { version: 1 });
    assert.equal(cancelled.data.status, 'cancelled');
    assert.equal(
      (
        await call(`/companion/tasks/${second.id}/next`, {
          version: cancelled.data.version,
          consent: false,
        })
      ).status,
      409,
    );

    const original = instance.agentRuntime.send;
    let executions = 0;
    instance.agentRuntime.send = async (...args) => {
      executions++;
      await original(...args);
      throw new Error('Simulated response loss after durable completion');
    };
    const recovered = await call(`/companion/tasks/${first.id}/next`, {
      version: 1,
      consent: false,
    });
    assert.equal(recovered.status, 200);
    assert.equal(recovered.data.steps[0].status, 'completed', JSON.stringify(recovered.data));
    assert.equal(executions, 1);
    assert.equal((await call('/ready')).status, 200);
    const state = (await call('/state')).data;
    const reference = randomUUID();
    for (let i = 0; i < 2; i++) {
      await instance.store.db
        .prepare('INSERT INTO points_ledger VALUES (?, ?, ?, 1, ?, ?, ?)')
        .run(
          randomUUID(),
          state.user.id,
          state.workspace.id,
          'agent_run_refund',
          reference,
          Date.now(),
        );
    }
    const operations = await call('/admin/operations');
    assert.equal(operations.status, 200);
    assert.equal(operations.data.ledger.requiresReview, true);
    assert.ok(
      operations.data.ledger.duplicateRefunds.some((row) => row.reference_id === reference),
    );
    assert.ok(
      operations.data.ledger.balanceMismatches.some((row) => row.user_id === state.user.id),
    );
    // /companion/tasks defaults to mode: 'starter', which only runs the free starter-planner
    // agent (0 points) — this test exercises recovery after a lost response, not billing, so it
    // charges nothing. A separately authorized mode: 'specialists' task would charge and is not
    // covered here.
    const ledger = await instance.store.db
      .prepare("SELECT COUNT(*) AS n FROM points_ledger WHERE reason = 'agent_run'")
      .get();
    assert.equal(Number(ledger.n), 0);
    assert.equal(
      (await call(`/companion/tasks/${first.id}/next`, { version: 1, consent: false })).status,
      409,
    );
    assert.equal(executions, 1);
  },
);
