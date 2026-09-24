import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createFundedTestApp as createApp } from './support/funded-app.mjs';

let app, store, server, base;
before(async () => {
  ({ app, store } = await createApp({
    filename: ':memory:',
    rateLimits: { api: { max: 1000 }, auth: { max: 1000 }, mutation: { max: 1000 } },
    ecosystemAdminEmails: ['admin@example.test'],
  }));
  server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await store.dropSchema();
});
async function request(path, body, cookie, method) {
  const verb = method || (body === undefined ? 'GET' : 'POST');
  const response = await fetch(`${base}/api${path}`, {
    method: verb,
    headers: {
      ...(['GET', 'HEAD', 'OPTIONS'].includes(verb) ? {} : { 'Content-Type': 'application/json' }),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const contentType = response.headers.get('content-type') || '';
  return {
    status: response.status,
    data: response.status === 204 ? null : contentType.includes('json') ? await response.json() : await response.text(),
    cookie: response.headers.get('set-cookie')?.split(';')[0],
  };
}
let counter = 0;
async function signup(email) {
  counter++;
  const result = await request('/auth/signup', {
    name: 'KYC Owner',
    email: email || `kyc-${counter}-${Date.now()}@example.test`,
    password: `a-long-kyc-password-${counter}`,
    context: 'Founder',
  });
  assert.equal(result.status, 201);
  return result.cookie;
}

test('a file can be uploaded, fetched back byte-for-byte, and deleted', async () => {
  const cookie = await signup();
  const content = Buffer.from('hello world, this is a test file').toString('base64');
  const uploaded = await request('/files', { filename: 'note.txt', mimeType: 'text/plain', base64Content: content }, cookie);
  assert.equal(uploaded.status, 201);
  assert.equal(uploaded.data.sizeBytes, Buffer.from('hello world, this is a test file').length);

  const fetched = await request(`/files/${uploaded.data.id}`, undefined, cookie, 'GET');
  assert.equal(fetched.status, 200);
  assert.equal(fetched.data, 'hello world, this is a test file');

  const stranger = await signup();
  assert.equal((await request(`/files/${uploaded.data.id}`, undefined, stranger, 'GET')).status, 404);

  const deleted = await request(`/files/${uploaded.data.id}`, {}, cookie, 'DELETE');
  assert.equal(deleted.status, 204);
  assert.equal((await request(`/files/${uploaded.data.id}`, undefined, cookie, 'GET')).status, 404);
});

test('an empty or invalid upload is rejected', async () => {
  const cookie = await signup();
  const empty = await request('/files', { filename: 'x.txt', mimeType: 'text/plain', base64Content: '' }, cookie);
  assert.equal(empty.status, 400);
});

test('a KYC case moves from pending to verified with attached evidence, and only an admin can decide it', async () => {
  const cookie = await signup();
  const opened = await request('/kyc/cases', { provider: 'manual' }, cookie);
  assert.equal(opened.status, 201);
  assert.equal(opened.data.status, 'pending');

  const duplicate = await request('/kyc/cases', { provider: 'manual' }, cookie);
  assert.equal(duplicate.status, 409, 'cannot open a second pending case');

  const file = await request(
    '/files',
    { filename: 'id.jpg', mimeType: 'image/jpeg', base64Content: Buffer.from('fake id bytes').toString('base64') },
    cookie,
  );
  const evidence = await request(
    `/kyc/cases/${opened.data.id}/evidence`,
    { kind: 'government_id', fileId: file.data.id },
    cookie,
  );
  assert.equal(evidence.status, 201);
  assert.equal(evidence.data.evidence.length, 1);

  const stranger = await signup();
  const strangerFile = await request(
    '/files',
    { filename: 'x.jpg', mimeType: 'image/jpeg', base64Content: Buffer.from('other bytes').toString('base64') },
    stranger,
  );
  const crossAccountAttach = await request(
    `/kyc/cases/${opened.data.id}/evidence`,
    { kind: 'proof_of_address', fileId: strangerFile.data.id },
    cookie,
  );
  assert.equal(crossAccountAttach.status, 404, 'cannot attach a file uploaded by a different user');

  const nonAdminDecision = await request(
    `/admin/kyc/cases/${opened.data.id}/decision`,
    { decision: 'verified' },
    cookie,
    'PATCH',
  );
  assert.equal(nonAdminDecision.status, 403);

  const admin = await signup('admin@example.test');
  const decided = await request(
    `/admin/kyc/cases/${opened.data.id}/decision`,
    { decision: 'verified' },
    admin,
    'PATCH',
  );
  assert.equal(decided.status, 200);
  assert.equal(decided.data.status, 'verified');

  const again = await request(
    `/admin/kyc/cases/${opened.data.id}/decision`,
    { decision: 'rejected' },
    admin,
    'PATCH',
  );
  assert.equal(again.status, 409, 'a decided case cannot be re-decided');
});
