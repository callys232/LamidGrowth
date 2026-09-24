import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createFundedTestApp as createApp } from './support/funded-app.mjs';

let app, store, server, base;
before(async () => {
  ({ app, store } = await createApp({
    filename: ':memory:',
    rateLimits: { api: { max: 1000 }, auth: { max: 1000 }, mutation: { max: 1000 } },
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
  return {
    status: response.status,
    data: response.status === 204 ? null : await response.json(),
    cookie: response.headers.get('set-cookie')?.split(';')[0],
    headers: response.headers,
  };
}
let counter = 0;
async function signup() {
  counter++;
  const result = await request('/auth/signup', {
    name: 'Files Security Owner',
    email: `files-sec-${counter}-${Date.now()}@example.test`,
    password: `a-long-files-sec-password-${counter}`,
    context: 'Founder',
  });
  assert.equal(result.status, 201);
  return result.cookie;
}

// FILE-01: uploads must not accept an inert HTML document and later serve it inline on the
// application origin — that is stored-content browser-execution risk regardless of whether a
// live exploit payload is used, which is why this test uses a harmless synthetic HTML fixture.
test('an HTML upload is rejected outright, regardless of the declared filename', async () => {
  const cookie = await signup();
  const html = Buffer.from('<html><body>synthetic test fixture, not a real payload</body></html>').toString('base64');
  const attempt = await request('/files', { filename: 'note.txt', mimeType: 'text/html', base64Content: html }, cookie);
  assert.equal(attempt.status, 415);
});

test('SVG and other markup/script-capable declared types are rejected', async () => {
  const cookie = await signup();
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>').toString('base64');
  const attempt = await request('/files', { filename: 'image.svg', mimeType: 'image/svg+xml', base64Content: svg }, cookie);
  assert.equal(attempt.status, 415);
});

test('a text/plain upload whose content is actually markup is rejected even though the extension looks safe', async () => {
  const cookie = await signup();
  const disguised = Buffer.from('<script>void 0;</script>').toString('base64');
  const attempt = await request('/files', { filename: 'notes.txt', mimeType: 'text/plain', base64Content: disguised }, cookie);
  assert.equal(attempt.status, 415);
});

test('a declared type whose bytes do not match its signature is rejected', async () => {
  const cookie = await signup();
  const notReallyAJpeg = Buffer.from('this is plain text, not jpeg bytes').toString('base64');
  const attempt = await request('/files', { filename: 'photo.jpg', mimeType: 'image/jpeg', base64Content: notReallyAJpeg }, cookie);
  assert.equal(attempt.status, 415);
});

test('a genuine allow-listed file is accepted and always served as an attachment, never inline', async () => {
  const cookie = await signup();
  const realPng = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('synthetic fixture bytes')]);
  const uploaded = await request('/files', { filename: 'picture.png', mimeType: 'image/png', base64Content: realPng.toString('base64') }, cookie);
  assert.equal(uploaded.status, 201);

  const downloaded = await fetch(`${base}/api/files/${uploaded.data.id}`, { headers: { Cookie: cookie } });
  assert.equal(downloaded.status, 200);
  assert.ok(downloaded.headers.get('content-disposition').startsWith('attachment'), 'files must never be served inline');
  assert.equal(downloaded.headers.get('x-content-type-options'), 'nosniff');
});
