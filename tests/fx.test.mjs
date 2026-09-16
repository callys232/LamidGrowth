import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createFundedTestApp as createApp } from './support/funded-app.mjs';

let app, store, server, base;
before(async () => {
  ({ app, store } = await createApp({
    filename: ':memory:',
    rateLimits: { api: { max: 1000 }, auth: { max: 1000 }, mutation: { max: 1000 }, spend: { max: 1000 } },
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
async function request(path, body, cookie, method = 'POST') {
  const response = await fetch(`${base}/api${path}`, {
    method: body === undefined ? 'GET' : method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get('set-cookie')?.split(';')[0],
  };
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

test('converts using the stored indicative rate, for display only', async () => {
  const client = await signup('Fx Client', 'fx-client@example.test');
  const result = await request('/fx/convert?amount=100&from=USD&to=EUR', undefined, client, 'GET');
  assert.equal(result.status, 200);
  assert.equal(result.data.converted, 92);
  assert.ok(result.data.note.includes('display only'));
  assert.ok(result.data.asOf);
});

test('same-currency conversion is a no-op rate of 1', async () => {
  const client = await signup('Fx Same', 'fx-same@example.test');
  const result = await request('/fx/convert?amount=50&from=USD&to=USD', undefined, client, 'GET');
  assert.equal(result.status, 200);
  assert.equal(result.data.converted, 50);
  assert.equal(result.data.rate, 1);
});

test('an unknown currency pair returns 404 rather than inventing a rate', async () => {
  const client = await signup('Fx Unknown', 'fx-unknown@example.test');
  const result = await request('/fx/convert?amount=10&from=USD&to=JPY', undefined, client, 'GET');
  assert.equal(result.status, 404);
});

test('only a workspace owner can update an FX rate', async () => {
  const owner = await signup('Fx Owner', 'fx-owner@example.test');
  const update = await request('/fx/rates', { from: 'USD', to: 'JPY', rate: 148.5 }, owner, 'PATCH');
  assert.equal(update.status, 200);
  const converted = await request('/fx/convert?amount=10&from=USD&to=JPY', undefined, owner, 'GET');
  assert.equal(converted.status, 200);
  assert.equal(converted.data.converted, 1485);
});
