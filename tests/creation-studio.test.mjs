import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createFundedTestApp as createApp } from './support/funded-app.mjs';

let app, store, server, base;
before(async () => {
  ({ app, store } = await createApp({
    filename: ':memory:',
    rateLimits: { api: { max: 1000 }, auth: { max: 1000 }, mutation: { max: 1000 } },
    aiProvider: {
      name: 'test',
      model: 'test',
      async review(context) {
        return { review: { summary: `Drafted: ${context.question.slice(0, 40)}`, assumptions: [], suggestions: [], evidenceIds: [] } };
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
  };
}
let counter = 0;
async function signup() {
  counter++;
  const result = await request('/auth/signup', {
    name: 'Studio Owner',
    email: `studio-${counter}-${Date.now()}@example.test`,
    password: `a-long-studio-password-${counter}`,
    context: 'Founder',
  });
  assert.equal(result.status, 201);
  return result.cookie;
}
async function enableAI(cookie) {
  const state = (await request('/state', undefined, cookie, 'GET')).data;
  await store.db.prepare('UPDATE users SET verified_at = ? WHERE id = ?').run(Date.now(), state.user.id);
  const settings = (await request('/ai/settings', undefined, cookie, 'GET')).data;
  assert.equal(
    (await request('/ai/settings', { enabled: true, dailyLimit: 100, version: settings.version }, cookie, 'PATCH')).status,
    200,
  );
  return cookie;
}
async function postJob(cookie) {
  const job = await request(
    '/jobs',
    {
      title: 'Website redesign project',
      category: 'UX/UI design',
      projectType: 'Fixed-scope project',
      description: 'Redesign the marketing website end to end.',
      deliverables: 'Redesigned homepage and product pages.',
      budgetMin: 3000,
      budgetMax: 5000,
      currency: 'USD',
      timeline: '6 weeks',
    },
    cookie,
  );
  assert.equal(job.status, 201);
  return job.data;
}

test('a proposal-drafter run persists a real, listable creation asset instead of returning prose only', async () => {
  const cookie = await enableAI(await signup());
  const job = await postJob(cookie);

  const drafted = await request('/companion/messages', { message: 'draft a proposal for this job', jobId: job.id, consent: true }, cookie);
  assert.equal(drafted.status, 201);
  const assetId = drafted.data.evidence.assetId;
  assert.ok(assetId);

  const listed = await request('/creation-assets', undefined, cookie, 'GET');
  assert.equal(listed.status, 200);
  assert.equal(listed.data.length, 1);
  assert.equal(listed.data[0].id, assetId);
  assert.equal(listed.data[0].kind, 'proposal-drafter');
  assert.equal(listed.data[0].version, 1);

  const stranger = await signup();
  assert.equal((await request(`/creation-assets/${assetId}`, undefined, stranger, 'GET')).status, 404);
});

test('a creation asset can be revised, producing a new version while listing only shows the latest', async () => {
  const cookie = await enableAI(await signup());
  const job = await postJob(cookie);
  const drafted = await request('/companion/messages', { message: 'build a scope of work for this job', jobId: job.id, consent: true }, cookie);
  const assetId = drafted.data.evidence.assetId;

  const revised = await request(`/creation-assets/${assetId}/revise`, { content: 'A manually edited, sharper scope of work.' }, cookie);
  assert.equal(revised.status, 201);
  assert.equal(revised.data.version, 2);

  const versions = await request(`/creation-assets/${assetId}/versions`, undefined, cookie, 'GET');
  assert.equal(versions.status, 200);
  assert.equal(versions.data.length, 2);
  assert.equal(versions.data[0].version, 1);
  assert.equal(versions.data[1].version, 2);

  const listed = await request('/creation-assets?kind=scope-builder', undefined, cookie, 'GET');
  assert.equal(listed.data.length, 1, 'listing shows only the latest version of the document, not every revision');
  assert.equal(listed.data[0].version, 2);
  assert.equal(listed.data[0].content, 'A manually edited, sharper scope of work.');

  const stranger = await signup();
  assert.equal((await request(`/creation-assets/${assetId}/revise`, { content: 'hijack attempt' }, stranger)).status, 404);
});

test('deleting a creation asset removes its whole version chain', async () => {
  const cookie = await enableAI(await signup());
  const job = await postJob(cookie);
  const drafted = await request('/companion/messages', { message: 'draft a contract for this job', jobId: job.id, consent: true }, cookie);
  const assetId = drafted.data.evidence.assetId;
  await request(`/creation-assets/${assetId}/revise`, { content: 'v2 content' }, cookie);

  const deleted = await request(`/creation-assets/${assetId}`, {}, cookie, 'DELETE');
  assert.equal(deleted.status, 204);

  const listed = await request('/creation-assets', undefined, cookie, 'GET');
  assert.equal(listed.data.length, 0);
});
