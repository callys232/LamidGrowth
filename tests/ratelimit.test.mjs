import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../src/app/app.mjs';

async function boot(filename, rateLimits) {
  const { app, store } = createApp({ filename, rateLimits });
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  return { app, store, server, base: `http://127.0.0.1:${server.address().port}` };
}
async function stop(instance) {
  await new Promise((resolve) => instance.server.close(resolve));
}

test('a shared on-disk rate-limit bucket caps the same key across two separate app instances (simulated cluster workers)', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'lamid-ratelimit-'));
  const dbFile = path.join(dir, 'shared.db');
  try {
    // Two independent createApp() instances pointed at the SAME file — this is exactly the
    // topology two cluster worker processes would share in production.
    const workerA = await boot(dbFile, { api: { max: 5, windowMs: 60_000 } });
    const workerB = await boot(dbFile, { api: { max: 5, windowMs: 60_000 } });

    const results = [];
    for (let i = 0; i < 4; i++) results.push((await fetch(`${workerA.base}/api/health`)).status);
    for (let i = 0; i < 4; i++) results.push((await fetch(`${workerB.base}/api/health`)).status);

    // 8 requests total against a shared max of 5: the first 5 succeed, the rest are capped —
    // proving the ceiling is shared across "workers", not 5 per worker (which would be 10 total).
    const succeeded = results.filter((s) => s === 200).length;
    const limited = results.filter((s) => s === 429).length;
    assert.equal(succeeded, 5, `expected exactly 5 successes across both workers, got ${succeeded} (${JSON.stringify(results)})`);
    assert.equal(limited, 3);

    await stop(workerA);
    await stop(workerB);
  } finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  }
});

test('per-account spend limiting tracks independent keys — one user hitting their cap does not affect another', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'lamid-ratelimit-keys-'));
  const dbFile = path.join(dir, 'shared.db');
  try {
    const instance = await boot(dbFile, { spend: { max: 1, windowMs: 60_000 } });
    async function signup(email) {
      const response = await fetch(`${instance.base}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Rate Limit User', email, password: 'a-long-ratelimit-password', context: 'Founder' }),
      });
      return response.headers.get('set-cookie')?.split(';')[0];
    }
    async function sendMessage(cookie) {
      return fetch(`${instance.base}/api/companion/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ message: 'what changed recently' }),
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

    await stop(instance);
  } finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  }
});

test('the window resets after it elapses, and Retry-After is set on a 429', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'lamid-ratelimit-window-'));
  const dbFile = path.join(dir, 'shared.db');
  try {
    const instance = await boot(dbFile, { api: { max: 1, windowMs: 200 } });
    const first = await fetch(`${instance.base}/api/health`);
    assert.equal(first.status, 200);
    const second = await fetch(`${instance.base}/api/health`);
    assert.equal(second.status, 429);
    assert.ok(second.headers.get('retry-after'));
    await new Promise((resolve) => setTimeout(resolve, 250));
    const third = await fetch(`${instance.base}/api/health`);
    assert.equal(third.status, 200);
    await stop(instance);
  } finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  }
});
