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
async function signup(name) {
  counter++;
  const result = await request('/auth/signup', {
    name,
    email: `handoff-${counter}-${Date.now()}@example.test`,
    password: `a-long-handoff-password-${counter}`,
    context: 'Founder',
  });
  assert.equal(result.status, 201);
  return result.cookie;
}
async function userId(cookie) {
  return (await request('/state', undefined, cookie, 'GET')).data.user.id;
}

async function setupEngagedProject(client, freelancer) {
  const job = await request(
    '/jobs',
    {
      title: 'Confidential strategy review',
      category: 'Strategy and consulting',
      projectType: 'Advisory engagement',
      description: 'A project used to test expert context handoff.',
      deliverables: 'A written strategy review.',
      budgetMin: 500,
      budgetMax: 1500,
      currency: 'USD',
      timeline: '2 weeks',
    },
    client,
  );
  assert.equal(job.status, 201);
  const bid = await request(
    `/jobs/${job.data.id}/bids`,
    { coverLetter: 'I can deliver this strategy review quickly and well.', proposedAmount: 1000, currency: 'USD', timeline: '2 weeks' },
    freelancer,
  );
  assert.equal(bid.status, 201);
  const freelancerUserId = await userId(freelancer);
  const project = await request('/projects', { jobId: job.data.id, title: 'Strategy review', freelancerUserId }, client);
  assert.equal(project.status, 201);
  return project.data;
}

test('a client can grant a scoped, revocable context package to the engaged expert, who can resolve it until revoked', async () => {
  const client = await signup('Handoff Client');
  const freelancer = await signup('Handoff Freelancer');
  const project = await setupEngagedProject(client, freelancer);

  const objective = await request(
    '/objectives',
    { title: 'Confidential internal goal', description: '', context: 'Founder', priority: 'High', status: 'Active', targetDate: '', constraints: '', success: '' },
    client,
  );
  assert.equal(objective.status, 201);

  const granted = await request(`/projects/${project.id}/context-package`, { scope: [{ kind: 'objective', id: objective.data.id }] }, client);
  assert.equal(granted.status, 201);
  assert.equal(granted.data.status, 'active');

  const strangerAttempt = await request(`/projects/${project.id}/context-package`, { scope: [{ kind: 'objective', id: objective.data.id }] }, freelancer);
  assert.equal(strangerAttempt.status, 403, 'only the project owner can grant a context package');

  const resolved = await request(`/context-packages/${granted.data.id}/resolve`, undefined, freelancer, 'GET');
  assert.equal(resolved.status, 200);
  assert.equal(resolved.data.items.length, 1);
  assert.equal(resolved.data.items[0].data.title, 'Confidential internal goal');

  const clientCannotResolve = await request(`/context-packages/${granted.data.id}/resolve`, undefined, client, 'GET');
  assert.equal(clientCannotResolve.status, 403, 'resolve is only for the granted expert, not the granter');

  const revoked = await request(`/context-packages/${granted.data.id}/revoke`, {}, client);
  assert.equal(revoked.status, 200);
  assert.equal(revoked.data.status, 'revoked');

  const afterRevoke = await request(`/context-packages/${granted.data.id}/resolve`, undefined, freelancer, 'GET');
  assert.equal(afterRevoke.status, 403, 'revocation must take effect on the next resolve attempt');
});

test('a package cannot reference an object outside the workspace', async () => {
  const client = await signup('Handoff Client 2');
  const freelancer = await signup('Handoff Freelancer 2');
  const project = await setupEngagedProject(client, freelancer);

  const fakeId = '00000000-0000-0000-0000-000000000000';
  const attempt = await request(`/projects/${project.id}/context-package`, { scope: [{ kind: 'objective', id: fakeId }] }, client);
  assert.equal(attempt.status, 404);
});
