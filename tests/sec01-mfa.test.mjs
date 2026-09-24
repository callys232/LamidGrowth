import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app/app.mjs';
import { totp } from '../src/app/mfa.mjs';

let app, store;
before(async () => {
  ({ app, store } = await createApp({
    filename: ':memory:',
    securityKey: 'ac'.repeat(32),
    publicOrigin: 'https://test.example',
    mailProvider: null,
    rateLimits: { api: { max: 1000 }, auth: { max: 1000 }, mutation: { max: 1000 } },
    ecosystemAdminEmails: ['sec01-admin@example.test'],
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
async function signup(email) {
  counter++;
  const password = `a-long-sec01-password-${counter}`;
  const result = await request('/auth/signup', {
    name: 'SEC01 User',
    email: email || `sec01-${counter}-${Date.now()}@example.test`,
    password,
    context: 'Founder',
  });
  assert.equal(result.status, 201);
  return { cookie: result.cookie, password };
}

test('SEC-01: a normal login without MFA enrolled works exactly as before', async () => {
  const { cookie: signupCookie, password } = await signup();
  const email = (await request('/state', undefined, signupCookie, 'GET')).data.user.email;
  const login = await request('/auth/login', { email, password }, undefined, 'POST');
  assert.equal(login.status, 200);
  assert.equal(login.data.mfaRequired, undefined);
  assert.ok(login.cookie);
});

test('SEC-01: enrollment requires the correct TOTP code to confirm, then issues one-time recovery codes', async () => {
  const { cookie } = await signup();
  const statusBefore = await request('/mfa/status', undefined, cookie, 'GET');
  assert.equal(statusBefore.data.enabled, false);

  const enroll = await request('/mfa/enroll', {}, cookie, 'POST');
  assert.equal(enroll.status, 200);
  assert.ok(enroll.data.secret);

  const wrongConfirm = await request('/mfa/confirm', { code: '000000' }, cookie, 'POST');
  assert.equal(wrongConfirm.status, 400);

  const code = totp(enroll.data.secret);
  const confirm = await request('/mfa/confirm', { code }, cookie, 'POST');
  assert.equal(confirm.status, 200);
  assert.equal(confirm.data.recoveryCodes.length, 10);

  const statusAfter = await request('/mfa/status', undefined, cookie, 'GET');
  assert.equal(statusAfter.data.enabled, true);
});

test('SEC-01: once enrolled, login halts on a step-up challenge instead of issuing a session, and a wrong code is rejected', async () => {
  const { cookie: signupCookie, password } = await signup();
  const email = (await request('/state', undefined, signupCookie, 'GET')).data.user.email;
  const enroll = await request('/mfa/enroll', {}, signupCookie, 'POST');
  const code = totp(enroll.data.secret);
  await request('/mfa/confirm', { code }, signupCookie, 'POST');

  const login = await request('/auth/login', { email, password }, undefined, 'POST');
  assert.equal(login.status, 200);
  assert.equal(login.data.mfaRequired, true);
  assert.ok(login.data.challengeToken);
  assert.equal(login.cookie, undefined, 'no session cookie until the second factor is verified');

  const wrongVerify = await request(
    '/auth/mfa/verify',
    { challengeToken: login.data.challengeToken, code: '000000' },
    undefined,
    'POST',
  );
  assert.equal(wrongVerify.status, 401);

  const rightCode = totp(enroll.data.secret);
  const verify = await request(
    '/auth/mfa/verify',
    { challengeToken: login.data.challengeToken, code: rightCode },
    undefined,
    'POST',
  );
  assert.equal(verify.status, 200);
  assert.ok(verify.cookie, 'a valid second factor finally issues the session');

  const replay = await request(
    '/auth/mfa/verify',
    { challengeToken: login.data.challengeToken, code: rightCode },
    undefined,
    'POST',
  );
  assert.equal(replay.status, 400, 'the same challenge token cannot be reused');
});

test('SEC-01: a recovery code can complete step-up exactly once', async () => {
  const { cookie: signupCookie, password } = await signup();
  const email = (await request('/state', undefined, signupCookie, 'GET')).data.user.email;
  const enroll = await request('/mfa/enroll', {}, signupCookie, 'POST');
  const confirm = await request(
    '/mfa/confirm',
    { code: totp(enroll.data.secret) },
    signupCookie,
    'POST',
  );
  const recoveryCode = confirm.data.recoveryCodes[0];

  const login1 = await request('/auth/login', { email, password }, undefined, 'POST');
  const verify1 = await request(
    '/auth/mfa/verify',
    { challengeToken: login1.data.challengeToken, code: recoveryCode },
    undefined,
    'POST',
  );
  assert.equal(verify1.status, 200);

  const login2 = await request('/auth/login', { email, password }, undefined, 'POST');
  const verify2 = await request(
    '/auth/mfa/verify',
    { challengeToken: login2.data.challengeToken, code: recoveryCode },
    undefined,
    'POST',
  );
  assert.equal(verify2.status, 401, 'a recovery code is single-use');
});

test('SEC-01: disabling MFA requires the account password and restores normal login', async () => {
  const { cookie, password } = await signup();
  const email = (await request('/state', undefined, cookie, 'GET')).data.user.email;
  const enroll = await request('/mfa/enroll', {}, cookie, 'POST');
  await request('/mfa/confirm', { code: totp(enroll.data.secret) }, cookie, 'POST');

  const wrongPassword = await request('/mfa/disable', { password: 'not-the-password' }, cookie, 'POST');
  assert.equal(wrongPassword.status, 403);

  const disable = await request('/mfa/disable', { password }, cookie, 'POST');
  assert.equal(disable.status, 200);

  const login = await request('/auth/login', { email, password }, undefined, 'POST');
  assert.equal(login.status, 200);
  assert.equal(login.data.mfaRequired, undefined);
  assert.ok(login.cookie);
});

test('SEC-01 step-up: an ecosystem admin with MFA enrolled cannot grant a workspace tier without a valid code', async () => {
  const adminSignup = await request('/auth/signup', {
    name: 'SEC01 Admin',
    email: 'sec01-admin@example.test',
    password: 'a-long-sec01-admin-password',
    context: 'Founder',
  });
  const adminCookie = adminSignup.cookie;
  const enroll = await request('/mfa/enroll', {}, adminCookie, 'POST');
  await request('/mfa/confirm', { code: totp(enroll.data.secret) }, adminCookie, 'POST');

  const target = await signup();
  const workspaceId = (await request('/state', undefined, target.cookie, 'GET')).data.workspace.id;

  const withoutCode = await request(
    `/admin/workspaces/${workspaceId}/tier`,
    { tier: 'enterprise' },
    adminCookie,
    'POST',
  );
  assert.equal(withoutCode.status, 401);

  const withCode = await request(
    `/admin/workspaces/${workspaceId}/tier`,
    { tier: 'enterprise', mfaCode: totp(enroll.data.secret) },
    adminCookie,
    'POST',
  );
  assert.equal(withCode.status, 200);
});
