import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app/app.mjs';
import { acquireServiceLease, validateProductionConfig } from '../src/app/operations.mjs';
import { randomUUID } from 'node:crypto';

async function waitForProvider(started, request) {
  let timer;
  const deadline = Date.now() + 60000;
  try {
    await Promise.race([
      new Promise((resolve, reject) => {
        timer = setInterval(() => {
          if (started()) resolve();
          else if (Date.now() >= deadline) reject(new Error('Mock provider did not start within 60 seconds.'));
        }, 10);
      }),
      request.then(result => { throw new Error(`Request ended before mock provider started: ${result.status}`); }),
    ]);
  } finally { clearInterval(timer); }
}

async function fixture(t, options = {}) {
  const messages = [];
  const instance = await createApp({ filename: ':memory:', production: true, securityKey: 'ab'.repeat(32), publicOrigin: 'https://lamid.example',
    mailProvider: { async send(message, id) { messages.push({ ...message, id }); } }, aiProvider: null,
    rateLimits: { api: { max: 10000 }, auth: { max: 10000 }, mutation: { max: 10000 }, spend: { max: 10000 } }, ...options });
  const server = instance.app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await instance.store.dropSchema(); });
  async function call(path, body, cookie, method, headers = {}) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, { method: method || (body === undefined ? 'GET' : 'POST'),
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, data: await response.json(), cookies: response.headers.getSetCookie() };
  }
  async function signup(cookie) {
    const email = `${randomUUID()}@example.test`;
    const result = await call('/auth/signup', { name: 'Launch Test', email, password: 'launch-test-password-123', context: 'Founder' }, cookie);
    assert.equal(result.status, 201);
    await instance.mail.tick();
    const message = messages.find(m => m.to === email);
    return { ...result, email, cookie: result.cookies.map(s => s.split(';')[0]).join('; '), code: message.text.match(/code is (\d{6})/)[1], message };
  }
  const verify = account => call('/auth/verify', { challengeId: account.data.challengeId, code: account.code });
  return { ...instance, messages, call, signup, verify };
}

test('production signup issues no secrets, grants exactly 100 once after OTP, and retains login without OTP', async t => {
  const f = await fixture(t), a = await f.signup();
  assert.equal(a.data.verificationToken, undefined);
  assert.equal(a.data.developmentCode, undefined);
  assert.ok(a.cookies.every(cookie => cookie.includes('Secure') && cookie.includes('HttpOnly')));
  assert.equal((await f.call('/points', undefined, a.cookie)).data.balance, 0);
  const outcomes = await Promise.all([f.verify(a), f.verify(a)]);
  assert.deepEqual(outcomes.map(r => r.status).sort(), [200, 400]);
  assert.equal((await f.call('/points', undefined, a.cookie)).data.balance, 100);
  assert.equal((await f.store.db.prepare("SELECT COUNT(*) AS n FROM points_ledger WHERE reason = 'welcome_bonus'").get()).n, 1);
  assert.equal((await f.call('/auth/login', { email: a.email, password: 'launch-test-password-123' })).data.verificationRequired, false);
  assert.equal((await f.call('/auth/demo', {})).status, 403);
});

test('same signed device gets no second reward; shared-network velocity waits for review', async t => {
  const f = await fixture(t), first = await f.signup();
  await f.verify(first);
  const same = await f.signup(first.cookie);
  assert.equal((await f.verify(same)).data.welcomeReward.status, 'ineligible');
  assert.equal((await f.call('/points', undefined, same.cookie)).data.balance, 0);
  for (let i = 0; i < 2; i++) assert.equal((await f.verify(await f.signup())).data.welcomeReward.points, 100);
  assert.equal((await f.verify(await f.signup())).data.welcomeReward.status, 'review');
});

test('OTP expires, locks after five wrong guesses, resends rotate both code and link', async t => {
  const f = await fixture(t), a = await f.signup();
  const wrong = a.code === '111111' ? '222222' : '111111';
  for (let i = 0; i < 5; i++) assert.equal((await f.call('/auth/verify', { challengeId: a.data.challengeId, code: wrong })).status, 400);
  assert.equal((await f.verify(a)).status, 400);
  assert.equal((await f.call('/auth/resend-verification', { email: a.email })).status, 429);
  await f.store.db.prepare('UPDATE otp_challenges SET created_at = created_at - 61000').run();
  const resend = await f.call('/auth/resend-verification', { email: a.email });
  assert.equal(resend.status, 200);
  assert.equal((await f.call('/auth/verify', { token: new URL(a.message.text.match(/https:\/\/\S+/)[0]).searchParams.get('token') })).status, 400);
  await f.store.db.prepare('UPDATE otp_challenges SET expires_at = 0').run();
  assert.equal((await f.call('/auth/verify', { challengeId: resend.data.challengeId, code: a.code })).status, 400);
});

test('production recovery mail resets password once and revokes existing sessions', async t => {
  const f = await fixture(t), a = await f.signup(); await f.verify(a);
  const request = await f.call('/auth/request-recovery', { email: a.email });
  assert.deepEqual(request.data, { ok: true });
  await f.mail.tick();
  const recovery = f.messages.find(m => m.subject.includes('Reset'));
  const token = new URL(recovery.text.match(/https:\/\/\S+/)[0]).searchParams.get('token');
  assert.equal((await f.call('/auth/reset-password', { token, password: 'new-launch-password-123' })).status, 200);
  assert.equal((await f.call('/auth/reset-password', { token, password: 'new-launch-password-456' })).status, 400);
  assert.equal((await f.call('/state', undefined, a.cookie)).status, 401);
  assert.equal((await f.call('/auth/login', { email: a.email, password: 'new-launch-password-123' })).status, 200);
});

test('Companion enforces verification, workspace opt-in and consent, with one provider call for concurrent retries', async t => {
  let calls = 0, release;
  const provider = { name: 'test', model: 'test', async review() { calls++; await new Promise(resolve => { release = resolve; }); return { review: { summary: 'Grounded response', evidenceIds: [], assumptions: [], suggestions: [] } }; } };
  const f = await fixture(t, { aiProvider: provider }), a = await f.signup();
  // Give an unverified account purchased-like test funds: credit availability must not bypass identity gates.
  await f.store.db.prepare('UPDATE users SET points_balance = 1000').run();
  assert.equal((await f.call('/companion/messages', { message: 'Help me', consent: true }, a.cookie)).status, 403);
  await f.verify(a);
  assert.equal((await f.call('/companion/messages', { message: 'Help me', consent: true }, a.cookie)).status, 403);
  assert.equal(calls, 0);
  await f.call('/ai/settings', { enabled: true, dailyLimit: 10, version: 0 }, a.cookie, 'PATCH');
  assert.equal((await f.call('/companion/messages', { message: 'Help me' }, a.cookie)).status, 403);
  const body = { message: 'Help me', consent: true }, headers = { 'Idempotency-Key': 'concurrent-launch-test' };
  const first = f.call('/companion/messages', body, a.cookie, 'POST', headers);
  await waitForProvider(() => release, first);
  const second = await f.call('/companion/messages', body, a.cookie, 'POST', headers);
  assert.equal(second.status, 409); assert.equal(calls, 1);
  release(); const result = await first; assert.equal(result.status, 201);
  const replay = await f.call('/companion/messages', body, a.cookie, 'POST', headers);
  assert.equal(replay.data.runId, result.data.runId); assert.equal(calls, 1);
});

test('revocation during a provider request rejects the late result and refunds once', async t => {
  let release;
  const f = await fixture(t, { aiProvider: { name: 'test', model: 'test', async review() { await new Promise(r => { release = r; }); return { review: { summary: 'late', evidenceIds: [] } }; } } });
  const a = await f.signup(); await f.verify(a);
  // Purchased-like fixture funding is separate from the 100-point signup incentive.
  await f.store.transaction(async () => {
    const user = await f.store.db.prepare('SELECT id FROM users WHERE email = ?').get(a.email);
    await f.store.db.prepare('UPDATE users SET points_balance = points_balance + 100 WHERE id = ?').run(user.id);
    await f.store.db.prepare("INSERT INTO points_ledger VALUES (?, ?, NULL, 100, 'test_fixture_funding', NULL, ?)").run(randomUUID(), user.id, Date.now());
  });
  await f.call('/ai/settings', { enabled: true, dailyLimit: 10, version: 0 }, a.cookie, 'PATCH');
  const result = f.call('/companion/messages', { message: 'Help me', consent: true }, a.cookie);
  await waitForProvider(() => release, result);
  await f.call('/ai/settings', { enabled: false, dailyLimit: 10, version: 1 }, a.cookie, 'PATCH');
  release(); assert.equal((await result).status, 403);
  assert.equal((await f.call('/points', undefined, a.cookie)).data.balance, 200);
});

test('scheduler lease transfers to a replacement owner and stale agent charges refund once', async t => {
  const f = await fixture(t), a = await f.signup(); await f.verify(a);
  assert.equal(await acquireServiceLease(f.store, 'scheduler', 'old-worker', 100, 100), true);
  assert.equal(await acquireServiceLease(f.store, 'scheduler', 'new-worker', 150, 100), false);
  assert.equal(await acquireServiceLease(f.store, 'scheduler', 'new-worker', 201, 100), true);
  const state = (await f.call('/state', undefined, a.cookie)).data, runId = randomUUID();
  await f.store.db.prepare("INSERT INTO agent_runs VALUES (?, ?, ?, 'context-curator', '{}', NULL, 'running', ?, NULL)").run(runId, state.workspace.id, state.user.id, new Date(Date.now() - 180000).toISOString());
  await f.store.db.prepare('UPDATE users SET points_balance = points_balance - 1 WHERE id = ?').run(state.user.id);
  await f.store.db.prepare("INSERT INTO points_ledger VALUES (?, ?, ?, -1, 'agent_run', ?, ?)").run(randomUUID(), state.user.id, state.workspace.id, runId, Date.now());
  assert.equal(await f.agentRuntime.reconcile(), 1); assert.equal(await f.agentRuntime.reconcile(), 0);
  assert.equal((await f.call('/points', undefined, a.cookie)).data.balance, 100);
});

test('production startup requires secure deploy configuration', () => {
  assert.throws(() => validateProductionConfig({}));
  const valid = { ACCOUNT_SECURITY_KEY: 'aa'.repeat(32), PUBLIC_ORIGIN: 'https://example.test', MAIL_FROM: 'accounts@example.test', RESEND_API_KEY: 'test', DATABASE_URL: 'postgresql://user:pass@host:5432/db' };
  assert.doesNotThrow(() => validateProductionConfig(valid));
  assert.throws(() => validateProductionConfig({ ...valid, COOKIE_SECURE: 'false' }));
  assert.throws(() => validateProductionConfig({ ...valid, PUBLIC_ORIGIN: 'http://example.test' }));
  assert.throws(() => validateProductionConfig({ ...valid, DATABASE_URL: undefined }));
});
