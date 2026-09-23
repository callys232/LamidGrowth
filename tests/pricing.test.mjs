import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createFundedTestApp as createApp } from './support/funded-app.mjs';

let app, store, server, base, adminCookie;
const adminEmail = 'pricing-admin@lamidgrowth.test';
before(async () => {
  ({ app, store } = await createApp({
    filename: ':memory:',
    rateLimits: {
      api: { max: 1000 },
      auth: { max: 1000 },
      mutation: { max: 1000 },
      spend: { max: 1000 },
    },
    ecosystemAdminEmails: [adminEmail],
  }));
  server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  base = `http://127.0.0.1:${server.address().port}`;
  adminCookie = await signup('Pricing Ecosystem Admin', adminEmail);
});
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await store.db.close();
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
  return { status: response.status, data: await response.json() };
}
let counter = 0;
async function signup(name, email) {
  counter++;
  const result = await fetch(`${base}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      email: email || `pricing-${counter}-${Date.now()}@example.test`,
      password: `a-long-pricing-password-${counter}`,
      context: 'Founder',
    }),
  });
  assert.equal(result.status, 201);
  return result.headers.get('set-cookie')?.split(';')[0];
}

test('billables list every registered tool/engine with its points cost and the points unit price', async () => {
  const user = await signup('Billables Viewer');
  const result = await request('/billables', undefined, user, 'GET');
  assert.equal(result.status, 200);
  assert.ok(result.data.tools.length > 0);
  assert.ok(result.data.tools.every((t) => typeof t.points_cost === 'number' && t.home_engine));
  assert.equal(typeof result.data.pointsUnitPriceMinor, 'number');
});

test('a non-admin cannot create, list, or manage bundles', async () => {
  const user = await signup('Non Admin Bundler');
  const create = await request(
    '/admin/bundles',
    { name: 'X', priceMinor: 1000, pointsIncluded: 10, agentIds: [] },
    user,
  );
  assert.equal(create.status, 403);
  const list = await request('/admin/bundles', undefined, user, 'GET');
  assert.equal(list.status, 403);
});

test('an admin can create a bundle from real tools, publish it, and it becomes purchasable', async () => {
  const tools = (await request('/billables', undefined, adminCookie, 'GET')).data.tools;
  assert.ok(tools.length >= 2);
  const agentIds = tools.slice(0, 2).map((t) => t.id);

  const create = await request(
    '/admin/bundles',
    {
      name: 'Starter Bundle',
      description: 'Two tools bundled',
      priceMinor: 500000,
      pointsIncluded: 200,
      billingCycle: 'monthly',
      agentIds,
    },
    adminCookie,
  );
  assert.equal(create.status, 201);
  assert.equal(create.data.status, 'draft');
  assert.equal(create.data.items.length, 2);

  // Drafts are not publicly listed.
  const publicListBeforePublish = await request('/bundles', undefined, adminCookie, 'GET');
  assert.ok(!publicListBeforePublish.data.some((b) => b.id === create.data.id));

  const publish = await request(
    `/admin/bundles/${create.data.id}`,
    { status: 'active' },
    adminCookie,
    'PATCH',
  );
  assert.equal(publish.status, 200);
  assert.equal(publish.data.status, 'active');

  const publicList = await request('/bundles', undefined, adminCookie, 'GET');
  assert.ok(publicList.data.some((b) => b.id === create.data.id));
});

test('creating a bundle with an unknown tool id is rejected', async () => {
  const create = await request(
    '/admin/bundles',
    { name: 'Bad Bundle', priceMinor: 1000, pointsIncluded: 5, agentIds: ['does-not-exist'] },
    adminCookie,
  );
  assert.equal(create.status, 400);
});

test('an admin can delete a bundle', async () => {
  const create = await request(
    '/admin/bundles',
    { name: 'Deletable', priceMinor: 1000, pointsIncluded: 5, agentIds: [] },
    adminCookie,
  );
  assert.equal(create.status, 201);
  const del = await request(`/admin/bundles/${create.data.id}`, {}, adminCookie, 'DELETE');
  assert.equal(del.status, 200);
  const list = await request('/admin/bundles', undefined, adminCookie, 'GET');
  assert.ok(!list.data.some((b) => b.id === create.data.id));
});
