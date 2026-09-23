import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createFundedTestApp as createApp } from './support/funded-app.mjs';

let app, store, server, base;
before(async () => {
  ({ app, store } = await createApp({
    filename: ':memory:',
    rateLimits: {
      api: { max: 1000 },
      auth: { max: 1000 },
      mutation: { max: 1000 },
      spend: { max: 1000 }, // overridden per-test below where the limit itself is under test
    },
    // The idempotency-replay test below drives a real companion message through context-curator
    // (a paid specialist), so it needs AI configured the way production would have it — same
    // stub pattern as tests/agents.test.mjs.
    aiProvider: {
      name: 'test',
      model: 'test',
      async review(context) {
        return {
          review: { summary: `AI summary: ${context.question}`, assumptions: [], suggestions: [], evidenceIds: (context.sources || []).map((s) => s.id) },
        };
      },
    },
  }));
  server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  store.db.close();
});
async function request(path, body, cookie, method = 'POST', extra = {}) {
  const response = await fetch(`${base}/api${path}`, {
    method: body === undefined ? 'GET' : method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(cookie ? { Cookie: cookie } : {}),
      ...extra,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
async function signup(name, email) {
  const result = await request('/auth/signup', {
    name,
    email,
    password: `a-long-${name.toLowerCase()}-password`,
    context: 'Founder',
  });
  assert.equal(result.status, 201);
  return result.cookie;
}
function jobBody(overrides = {}) {
  return {
    title: 'Security test job',
    category: 'Software engineering',
    projectType: 'Fixed-scope project',
    description: 'A job created purely to exercise the points economy under attack.',
    deliverables: 'Nothing real, this is an adversarial test.',
    budgetMin: 100,
    budgetMax: 200,
    currency: 'USD',
    timeline: '1 week',
    ...overrides,
  };
}

test('mass assignment cannot credit or alter points balance on job/bid/companion requests', async () => {
  const cookie = await signup('Mass Assign', 'mass-assign@example.test');
  const withExtraField = (base, field) => ({ ...base, [field]: 999999 });

  for (const field of ['pointsBalance', 'balance', 'points_balance']) {
    const result = await request('/jobs', withExtraField(jobBody(), field), cookie);
    assert.equal(result.status, 400, `job.create should reject unknown field "${field}"`);
  }
  const messageResult = await request(
    '/companion/messages',
    { message: 'what is going on right now?', balance: 999999 },
    cookie,
  );
  assert.equal(messageResult.status, 400);
});

test('concurrent requests cannot drive the points balance negative (race-condition double spend)', async () => {
  const cookie = await signup('Race Attacker', 'race-attacker@example.test');
  const state = await request('/state', undefined, cookie, 'GET');
  assert.equal(state.status, 200);
  // Force the balance down to exactly enough for 2 job posts (40 points each).
  await store.db.prepare('UPDATE users SET points_balance = 80 WHERE id = ?').run(state.data.user.id);

  const attempts = await Promise.all(
    Array.from({ length: 5 }, () => request('/jobs', jobBody({ title: `Race job ${randomUUID()}` }), cookie)),
  );
  const succeeded = attempts.filter((r) => r.status === 201).length;
  const rejected = attempts.filter((r) => r.status === 402).length;
  assert.equal(succeeded, 2, 'exactly 2 of 5 concurrent job posts should succeed with 80 points at 40 each');
  assert.equal(rejected, 3);

  const finalBalance = (await request('/points', undefined, cookie, 'GET')).data.balance;
  assert.equal(finalBalance, 0);
  assert.ok(finalBalance >= 0, 'balance must never go negative under concurrent spend attempts');
});

test('idempotency key replays the cached result instead of double-charging, and a new key charges again', async () => {
  const cookie = await signup('Replay Attacker', 'replay-attacker@example.test');
  const key = 'replay-test-key-0001';
  const body = jobBody({ title: 'Replay-protected job' });

  const first = await request('/jobs', body, cookie, 'POST', { 'Idempotency-Key': key });
  assert.equal(first.status, 201);
  const balanceAfterFirst = (await request('/points', undefined, cookie, 'GET')).data.balance;

  const replay = await request('/jobs', body, cookie, 'POST', { 'Idempotency-Key': key });
  assert.equal(replay.status, 201);
  assert.equal(replay.data.id, first.data.id, 'replaying the same key should return the same cached job');
  const balanceAfterReplay = (await request('/points', undefined, cookie, 'GET')).data.balance;
  assert.equal(balanceAfterReplay, balanceAfterFirst, 'the replayed request must not charge points again');

  const newKeyResult = await request('/jobs', body, cookie, 'POST', {
    'Idempotency-Key': 'replay-test-key-0002',
  });
  assert.equal(newKeyResult.status, 201);
  assert.notEqual(newKeyResult.data.id, first.data.id, 'a new key must be treated as a genuinely new operation');
  const balanceAfterNewKey = (await request('/points', undefined, cookie, 'GET')).data.balance;
  assert.equal(balanceAfterNewKey, balanceAfterFirst - 40, 'a new idempotency key legitimately charges again');
});

test('the companion agent endpoint replays cached results under the same idempotency key', async () => {
  const signupResult = await request('/auth/signup', {
    name: 'Companion Replay',
    email: 'companion-replay@example.test',
    password: 'a-long-companion-replay-password',
    context: 'Founder',
  });
  assert.equal(signupResult.status, 201);
  const cookie = signupResult.cookie;
  // External AI requires a verified account and workspace opt-in (see aiPolicy.mjs).
  await request('/auth/verify', { token: signupResult.data.verificationToken }, cookie);
  await request('/ai/settings', { enabled: true, dailyLimit: 10, version: 0 }, cookie, 'PATCH');
  const key = 'companion-replay-key-0001';
  const body = { message: 'what is going on right now?', consent: true };

  const first = await request('/companion/messages', body, cookie, 'POST', { 'Idempotency-Key': key });
  assert.equal(first.status, 201);
  const balanceAfterFirst = first.data.balance;

  const replay = await request('/companion/messages', body, cookie, 'POST', { 'Idempotency-Key': key });
  assert.equal(replay.status, 201);
  assert.equal(replay.data.runId, first.data.runId);
  assert.equal(replay.data.balance, balanceAfterFirst, 'replaying an agent message must not charge points again');

  const noKeyRepeat = await request('/companion/messages', body, cookie);
  assert.equal(noKeyRepeat.status, 201);
  assert.notEqual(noKeyRepeat.data.runId, first.data.runId);
  assert.equal(
    noKeyRepeat.data.balance,
    balanceAfterFirst - noKeyRepeat.data.pointsCharged,
    'omitting the idempotency key is opt-in behavior: each call charges again, by design',
  );
});

test('a mismatched idempotency-key replay with different input is rejected, not silently accepted', async () => {
  const cookie = await signup('Mismatch Attacker', 'mismatch-attacker@example.test');
  const key = 'mismatch-key-0001';
  const first = await request('/jobs', jobBody({ title: 'Original job' }), cookie, 'POST', {
    'Idempotency-Key': key,
  });
  assert.equal(first.status, 201);
  const tampered = await request('/jobs', jobBody({ title: 'Different job entirely' }), cookie, 'POST', {
    'Idempotency-Key': key,
  });
  assert.equal(tampered.status, 409);
});

test('cross-tenant workspace tampering is rejected before any charge occurs', async () => {
  const attacker = await signup('Tenant Attacker', 'tenant-attacker@example.test');
  const victim = await signup('Tenant Victim', 'tenant-victim@example.test');
  const victimState = (await request('/state', undefined, victim, 'GET')).data;

  const balanceBefore = (await request('/points', undefined, attacker, 'GET')).data.balance;
  const result = await request('/jobs', jobBody(), attacker, 'POST', {
    'X-Workspace-Id': victimState.workspace.id,
  });
  assert.equal(result.status, 409);
  const balanceAfter = (await request('/points', undefined, attacker, 'GET')).data.balance;
  assert.equal(balanceAfter, balanceBefore, 'a rejected cross-tenant request must not charge points');
});

test('the dedicated spend rate limiter enforces a per-account ceiling on points-spending routes', async () => {
  const { app: limitedApp, store: limitedStore } = await createApp({
    filename: ':memory:',
    rateLimits: {
      api: { max: 1000 },
      auth: { max: 1000 },
      mutation: { max: 1000 },
      spend: { max: 3 },
    },
  });
  const limitedServer = await new Promise((resolve) => {
    const listening = limitedApp.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const limitedBase = `http://127.0.0.1:${limitedServer.address().port}`;
  try {
    async function limitedRequest(path, body, cookie) {
      const response = await fetch(`${limitedBase}/api${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
        body: JSON.stringify(body),
      });
      return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
    }
    const signupResult = await limitedRequest('/auth/signup', {
      name: 'Spend Limited',
      email: 'spend-limited@example.test',
      password: 'a-long-spend-limited-password',
      context: 'Founder',
    });
    const cookie = signupResult.cookie;
    let rejected = 0;
    for (let i = 0; i < 5; i++) {
      const result = await limitedRequest('/jobs', jobBody({ title: `Limited job ${i}` }), cookie);
      if (result.status === 429) rejected++;
    }
    assert.ok(rejected > 0, 'at least one of 5 rapid spend requests should be rate-limited at max:3');
  } finally {
    await new Promise((resolve) => limitedServer.close(resolve));
    limitedStore.db.close();
  }
});
