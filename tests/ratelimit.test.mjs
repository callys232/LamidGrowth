import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createFundedTestApp as createApp } from './support/funded-app.mjs';

async function boot(schemaName, rateLimits, options = {}) {
  const { app, store } = await createApp({ filename: schemaName, rateLimits, ...options });
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  return { app, store, server, base: `http://127.0.0.1:${server.address().port}` };
}
// Closes only the HTTP server. Pool teardown is the caller's job via store.dropSchema() (which
// drops the schema AND ends the pool in one step) or store.db.close() (ends the pool without
// dropping) — never both on the same instance, since dropSchema() needs its pool still open to
// run the DROP itself.
async function stop(instance) {
  await new Promise((resolve) => instance.server.close(resolve));
}

test('a shared database rate-limit bucket caps the same key across two separate app instances (simulated cluster workers)', async () => {
  // Named exception to the ":memory:"-per-test-file pattern: two createApp() instances share one
  // real schema name, the same topology two cluster worker processes share in production against
  // one Postgres database (replacing the old "two workers, one SQLite file" simulation).
  const schemaName = `ratelimit_shared_${randomUUID().replace(/-/g, '_')}`;
  let workerA, workerB;
  try {
    workerA = await boot(schemaName, { api: { max: 5, windowMs: 60_000 } });
    workerB = await boot(schemaName, { api: { max: 5, windowMs: 60_000 } });

    const results = [];
    for (let i = 0; i < 4; i++) results.push((await fetch(`${workerA.base}/api/health`)).status);
    for (let i = 0; i < 4; i++) results.push((await fetch(`${workerB.base}/api/health`)).status);

    // 8 requests total against a shared max of 5: the first 5 succeed, the rest are capped —
    // proving the ceiling is shared across "workers", not 5 per worker (which would be 10 total).
    const succeeded = results.filter((s) => s === 200).length;
    const limited = results.filter((s) => s === 429).length;
    assert.equal(succeeded, 5, `expected exactly 5 successes across both workers, got ${succeeded} (${JSON.stringify(results)})`);
    assert.equal(limited, 3);
  } finally {
    if (workerA) await stop(workerA);
    if (workerB) await stop(workerB);
    // Drop the shared schema exactly once (whichever worker booted); the other worker's pool
    // still needs its own explicit close since dropSchema() only ends the pool it's called on.
    if (workerA) {
      await workerA.store.dropSchema();
      if (workerB) await workerB.store.db.close();
    } else if (workerB) {
      await workerB.store.dropSchema();
    }
  }
});

test('per-account spend limiting tracks independent keys — one user hitting their cap does not affect another', async () => {
  const schemaName = `ratelimit_keys_${randomUUID().replace(/-/g, '_')}`;
  let instance;
  try {
    instance = await boot(schemaName, { spend: { max: 1, windowMs: 60_000 } }, {
      // The spend limiter sits in front of a real companion message through signal-monitoring (a
      // paid specialist), so it needs AI configured the way production would have it — same stub
      // pattern as tests/agents.test.mjs.
      aiProvider: {
        name: 'test',
        model: 'test',
        async review(context) {
          return {
            review: { summary: `AI summary: ${context.question}`, assumptions: [], suggestions: [], evidenceIds: (context.sources || []).map((s) => s.id) },
          };
        },
      },
    });
    async function signup(email) {
      const response = await fetch(`${instance.base}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Rate Limit User', email, password: 'a-long-ratelimit-password', context: 'Founder' }),
      });
      const data = await response.json();
      const cookie = response.headers.get('set-cookie')?.split(';')[0];
      // External AI requires a verified account and workspace opt-in (see aiPolicy.mjs).
      await fetch(`${instance.base}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ token: data.verificationToken }),
      });
      await fetch(`${instance.base}/api/ai/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ enabled: true, dailyLimit: 10, version: 0 }),
      });
      return cookie;
    }
    async function sendMessage(cookie) {
      return fetch(`${instance.base}/api/companion/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ message: 'what changed recently', consent: true }),
      });
    }
    const userA = await signup(`ratelimit-a-${Date.now()}@example.test`);
    const userB = await signup(`ratelimit-b-${Date.now()}@example.test`);

    const firstA = await sendMessage(userA);
    assert.equal(firstA.status, 201);
    const secondA = await sendMessage(userA);
    assert.equal(secondA.status, 429); // user A hit their own cap of 1

    // User B's own bucket is untouched by user A's usage.
    const firstB = await sendMessage(userB);
    assert.equal(firstB.status, 201);
  } finally {
    if (instance) {
      await stop(instance);
      await instance.store.dropSchema();
    }
  }
});

test('the window resets after it elapses, and Retry-After is set on a 429', async () => {
  const schemaName = `ratelimit_window_${randomUUID().replace(/-/g, '_')}`;
  let instance;
  try {
    // windowMs must comfortably exceed real network round-trip latency to Postgres (each request
    // here is at least one round trip to the database) — a 200ms window, fine against SQLite's
    // effectively-zero latency, is otherwise indistinguishable from the window itself elapsing
    // between the first and second request.
    instance = await boot(schemaName, { api: { max: 1, windowMs: 3000 } });
    const first = await fetch(`${instance.base}/api/health`);
    assert.equal(first.status, 200);
    const second = await fetch(`${instance.base}/api/health`);
    assert.equal(second.status, 429);
    assert.ok(second.headers.get('retry-after'));
    await new Promise((resolve) => setTimeout(resolve, 3200));
    const third = await fetch(`${instance.base}/api/health`);
    assert.equal(third.status, 200);
  } finally {
    if (instance) {
      await stop(instance);
      await instance.store.dropSchema();
    }
  }
});
