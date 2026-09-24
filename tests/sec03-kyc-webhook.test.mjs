import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { createApp } from '../src/app/app.mjs';
import { genericKycProvider } from '../src/app/kyc.mjs';

const KYC_SECRET = 'sec03_test_webhook_secret';

let app, store;
before(async () => {
  ({ app, store } = await createApp({
    filename: ':memory:',
    securityKey: 'ac'.repeat(32),
    publicOrigin: 'https://test.example',
    mailProvider: null,
    rateLimits: { api: { max: 1000 }, auth: { max: 1000 }, mutation: { max: 1000 } },
    ecosystemAdminEmails: ['sec03-admin@example.test'],
    kycProvider: () => genericKycProvider({ secretKey: KYC_SECRET }),
  }));
});
after(async () => {
  await store.dropSchema();
});
async function request(path, body, cookie, method) {
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const verb = method || (body === undefined ? 'GET' : 'POST');
  const response = await fetch(`${base}/api${path}`, {
    method: verb,
    headers: {
      ...(['GET', 'HEAD', 'OPTIONS'].includes(verb) ? {} : { 'Content-Type': 'application/json' }),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = {
    status: response.status,
    data: response.status === 204 ? null : await response.json(),
    cookie: response.headers.get('set-cookie')?.split(';')[0],
  };
  await new Promise((resolve) => server.close(resolve));
  return result;
}
let counter = 0;
async function signup() {
  counter++;
  const result = await request('/auth/signup', {
    name: 'SEC03 User',
    email: `sec03-${counter}-${Date.now()}@example.test`,
    password: `a-long-sec03-password-${counter}`,
    context: 'Founder',
  });
  assert.equal(result.status, 201);
  return result.cookie;
}
async function fireWebhook(body, secret = KYC_SECRET) {
  const rawBody = Buffer.from(JSON.stringify(body));
  const signature = createHmac('sha256', secret).update(rawBody).digest('hex');
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(`${base}/api/webhooks/kyc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-kyc-signature': signature },
    body: rawBody,
  });
  const result = { status: response.status, data: await response.json() };
  await new Promise((resolve) => server.close(resolve));
  return result;
}

test('SEC-03: a webhook with an invalid signature is rejected outright', async () => {
  const rawBody = Buffer.from(JSON.stringify({ event: 'verification.decided', data: { reference: 'x', decision: 'verified' } }));
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(`${base}/api/webhooks/kyc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-kyc-signature': 'forged' },
    body: rawBody,
  });
  assert.equal(response.status, 401);
  await new Promise((resolve) => server.close(resolve));
});

test('SEC-03: a signed webhook decides exactly the case its reference was issued for, by reference — not by a client-suppliable case id', async () => {
  const cookie = await signup();
  const reference = `sumsub-session-${randomUUID()}`;
  const openCase = await request('/kyc/cases', { provider: 'sumsub', providerReference: reference }, cookie);
  assert.equal(openCase.status, 201);
  assert.equal(openCase.data.status, 'pending');

  const result = await fireWebhook({
    event: 'verification.decided',
    eventId: randomUUID(),
    data: { reference, decision: 'verified' },
  });
  assert.equal(result.status, 200);

  const cases = await request('/kyc/cases/mine', undefined, cookie, 'GET');
  assert.equal(cases.data[0].status, 'verified');
  const state = await request('/state', undefined, cookie, 'GET');
  assert.ok(state.data.user); // sanity: session still valid
  const userRow = await store.db.prepare('SELECT kyc_verified_at FROM users WHERE id = ?').get(state.data.user.id);
  assert.ok(userRow.kyc_verified_at, 'a verified decision marks the user kyc_verified_at');
});

test('SEC-03: a webhook whose reference matches no pending case changes nothing', async () => {
  const result = await fireWebhook({
    event: 'verification.decided',
    eventId: randomUUID(),
    data: { reference: 'no-such-reference', decision: 'verified' },
  });
  assert.equal(result.status, 200);
});

test('SEC-03: replaying the exact same webhook event is deduplicated and cannot flip a case twice', async () => {
  const cookie = await signup();
  const reference = `sumsub-session-${randomUUID()}`;
  await request('/kyc/cases', { provider: 'sumsub', providerReference: reference }, cookie);
  const eventId = randomUUID();

  const first = await fireWebhook({ event: 'verification.decided', eventId, data: { reference, decision: 'rejected' } });
  assert.equal(first.status, 200);
  assert.equal(first.data.deduplicated, undefined);

  const replay = await fireWebhook({ event: 'verification.decided', eventId, data: { reference, decision: 'verified' } });
  assert.equal(replay.status, 200);
  assert.equal(replay.data.deduplicated, true);

  const cases = await request('/kyc/cases/mine', undefined, cookie, 'GET');
  assert.equal(cases.data[0].status, 'rejected', 'the replayed event must not overwrite the original decision');
});

test('SEC-03: a webhook cannot re-decide a case that a human admin already decided', async () => {
  const adminCookie = await request('/auth/signup', {
    name: 'SEC03 Admin',
    email: 'sec03-admin@example.test',
    password: 'a-long-sec03-admin-password',
    context: 'Founder',
  }).then((r) => r.cookie);
  const cookie = await signup();
  const reference = `sumsub-session-${randomUUID()}`;
  const openCase = await request('/kyc/cases', { provider: 'sumsub', providerReference: reference }, cookie);

  const adminDecision = await request(
    `/admin/kyc/cases/${openCase.data.id}/decision`,
    { decision: 'rejected', notes: 'Manual review found an issue.' },
    adminCookie,
    'PATCH',
  );
  assert.equal(adminDecision.status, 200);

  const webhookAttempt = await fireWebhook({
    event: 'verification.decided',
    eventId: randomUUID(),
    data: { reference, decision: 'verified' },
  });
  assert.equal(webhookAttempt.status, 200);

  const cases = await request('/kyc/cases/mine', undefined, cookie, 'GET');
  assert.equal(cases.data[0].status, 'rejected', 'the admin decision is final; the webhook cannot override it');
});

test('SEC-03: with no KYC provider configured, the webhook is inert rather than silently accepting anything', async () => {
  const { app: unconfiguredApp, store: unconfiguredStore } = await createApp({
    filename: ':memory:',
    securityKey: 'bd'.repeat(32),
    publicOrigin: 'https://test.example',
    mailProvider: null,
    rateLimits: { api: { max: 1000 }, auth: { max: 1000 }, mutation: { max: 1000 } },
  });
  const server = await new Promise((resolve) => {
    const listening = unconfiguredApp.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(`${base}/api/webhooks/kyc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-kyc-signature': 'anything' },
    body: JSON.stringify({ event: 'verification.decided', data: { reference: 'x', decision: 'verified' } }),
  });
  assert.equal(response.status, 503);
  await new Promise((resolve) => server.close(resolve));
  await unconfiguredStore.dropSchema();
});
