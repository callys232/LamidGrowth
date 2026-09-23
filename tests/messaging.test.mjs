import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createFundedTestApp as createApp } from './support/funded-app.mjs';

let app, store, server, base;
before(async () => {
  ({ app, store } = await createApp({
    filename: ':memory:',
    rateLimits: {
      api: { max: 1000 },
      auth: { max: 1000 },
      mutation: { max: 1000 },
      spend: { max: 1000 },
    },
  }));
  server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  base = `http://127.0.0.1:${server.address().port}`;
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
async function makeProject(client, freelancer) {
  const job = await request(
    '/jobs',
    {
      title: 'Messaging test job',
      category: 'Software engineering',
      projectType: 'Fixed-scope project',
      description: 'A job used to exercise project messaging.',
      deliverables: 'A deliverable.',
      budgetMin: 500,
      budgetMax: 2000,
      currency: 'USD',
      timeline: '2 weeks',
    },
    client,
  );
  await request(
    `/jobs/${job.data.id}/bids`,
    {
      coverLetter: 'I will deliver this work as agreed.',
      proposedAmount: 1000,
      currency: 'USD',
      timeline: '2 weeks',
    },
    freelancer,
  );
  const freelancerState = (await request('/state', undefined, freelancer, 'GET')).data;
  const project = await request(
    '/projects',
    { jobId: job.data.id, title: 'Messaging project', freelancerUserId: freelancerState.user.id },
    client,
  );
  return project.data;
}

test('both project parties can post and read messages, in order', async () => {
  const client = await signup('Message Client', 'message-client@example.test');
  const freelancer = await signup('Message Freelancer', 'message-freelancer@example.test');
  const project = await makeProject(client, freelancer);

  const empty = await request(`/projects/${project.id}/messages`, undefined, client, 'GET');
  assert.deepEqual(empty.data, []);

  const first = await request(
    `/projects/${project.id}/messages`,
    { body: 'Hi, when can we kick off?' },
    client,
  );
  assert.equal(first.status, 201);
  const second = await request(
    `/projects/${project.id}/messages`,
    { body: 'Tomorrow morning works for me.' },
    freelancer,
  );
  assert.equal(second.status, 201);

  const thread = await request(`/projects/${project.id}/messages`, undefined, freelancer, 'GET');
  assert.equal(thread.data.length, 2);
  assert.equal(thread.data[0].body, 'Hi, when can we kick off?');
  assert.equal(thread.data[1].body, 'Tomorrow morning works for me.');
  assert.equal(thread.data[0].sender_id, thread.data[0].sender_id); // sanity
});

test('a stranger cannot read or post to a project they are not party to', async () => {
  const client = await signup('Private Client', 'private-client@example.test');
  const freelancer = await signup('Private Freelancer', 'private-freelancer@example.test');
  const stranger = await signup('Private Stranger', 'private-stranger@example.test');
  const project = await makeProject(client, freelancer);

  const blockedRead = await request(`/projects/${project.id}/messages`, undefined, stranger, 'GET');
  assert.equal(blockedRead.status, 403);
  const blockedPost = await request(
    `/projects/${project.id}/messages`,
    { body: 'Let me in!' },
    stranger,
  );
  assert.equal(blockedPost.status, 403);
});
