import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFundedTestApp } from './support/funded-app.mjs';

test(
  'guidance, manual selection, private history and resumable approved specialist tasks',
  { timeout: 300000 },
  async (t) => {
    const instance = await createFundedTestApp({
      filename: ':memory:',
      aiProvider: null,
      mailProvider: null,
    });
    const server = instance.app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    t.after(async () => {
      await new Promise((resolve) => server.close(resolve));
      await instance.store.dropSchema();
    });
    const base = `http://127.0.0.1:${server.address().port}/api`;
    async function call(path, body, cookie) {
      const response = await fetch(base + path, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return {
        status: response.status,
        data: await response.json(),
        cookie: response.headers
          .getSetCookie()
          .map((c) => c.split(';')[0])
          .join('; '),
      };
    }
    const publicGuide = await call('/companion/guide', { message: "I can't sign in, forgot my password" });
    assert.equal(publicGuide.status, 200);
    assert.equal(publicGuide.data.topic, 'support');
    assert.equal(publicGuide.data.href, '/forgot-password');
    assert.equal((await call('/companion/history')).status, 401);
    async function signup(name) {
      const result = await call('/auth/signup', {
        name,
        email: `${name}@example.test`,
        password: 'safe-testing-password-123',
        context: 'Founder',
      });
      assert.equal(result.status, 201);
      return result.cookie;
    }
    const owner = await signup('coord-owner');
    const stranger = await signup('coord-stranger');
    const selected = await call(
      '/companion/messages',
      { message: 'hello', agentId: 'pricing' },
      owner,
    );
    assert.equal(selected.status, 201);
    assert.equal(selected.data.agentId, 'pricing');
    assert.equal(selected.data.pointsCharged, 0);
    assert.equal(
      (await call('/companion/messages', { message: 'hello', agentId: 'invented' }, owner)).status,
      404,
    );
    assert.equal((await call('/companion/history', undefined, owner)).data.length, 1);
    assert.equal((await call('/companion/history', undefined, stranger)).data.length, 0);
    const initialBalance = (await call('/points', undefined, owner)).data.balance;
    const missingJob = await call('/companion/messages', { message: 'Build my client brief', agentId: 'brief-builder' }, owner);
    assert.equal(missingJob.status, 422);
    const offline = await call('/companion/messages', { message: 'Review my context', agentId: 'context-curator' }, owner);
    assert.equal(offline.status, 503);
    assert.equal((await call('/points', undefined, owner)).data.balance, initialBalance);
    assert.equal((await call('/companion/history', undefined, owner)).data.length, 1);
    const preview = await call(
      '/companion/tasks',
      { message: 'Improve my personal goal planning' },
      owner,
    );
    assert.equal(preview.status, 201);
    assert.equal(preview.data.steps.length, 1);
    assert.equal(preview.data.estimatedPoints, 0);
    assert.equal(preview.data.status, 'awaiting_approval');
    assert.equal(
      (
        await call(
          `/companion/tasks/${preview.data.id}/next`,
          { version: 1, consent: false },
          stranger,
        )
      ).status,
      404,
    );
    const raced = await Promise.all(
      [1, 2].map(() =>
        call(`/companion/tasks/${preview.data.id}/next`, { version: 1, consent: false }, owner),
      ),
    );
    assert.deepEqual(raced.map((r) => r.status).sort(), [200, 409]);
    let task = (await call('/companion/tasks', undefined, owner)).data[0];
    assert.equal(task.steps[0].status, 'completed');
    for (let i = 1; i < task.steps.length; i++) {
      const result = await call(
        `/companion/tasks/${task.id}/next`,
        { version: task.version, consent: false },
        owner,
      );
      assert.equal(result.status, 200);
      task = result.data;
      assert.equal(task.steps[i].status, 'completed', JSON.stringify(task));
    }
    assert.equal(task.status, 'completed');
    assert.equal((await call('/points', undefined, owner)).data.balance, initialBalance);
    const before = (await call('/companion/history', undefined, owner)).data.length;
    await call(
      `/companion/tasks/${task.id}/next`,
      { version: task.version, consent: false },
      owner,
    );
    assert.equal((await call('/companion/history', undefined, owner)).data.length, before);
  },
);
