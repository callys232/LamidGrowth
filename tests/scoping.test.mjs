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

test('a scoping case can start from only an objective, with no scope known yet', async () => {
  const client = await signup('Scoping Client', 'scoping-client@example.test');
  const created = await request(
    '/scoping-cases',
    { objective: 'Improve customer retention', problemStatement: '' },
    client,
  );
  assert.equal(created.status, 201);
  assert.equal(created.data.status, 'draft');
  // Missing category/deliverables/budget/timeline -> amber, not a validation failure.
  assert.equal(created.data.risk_band, 'amber');
});

test('a regulated-sounding objective is flagged red even with everything else filled in', async () => {
  const client = await signup('Red Client', 'red-client@example.test');
  const created = await request(
    '/scoping-cases',
    { objective: 'Review our healthcare data-handling policy', problemStatement: '' },
    client,
  );
  assert.equal(created.data.risk_band, 'red');
  const filled = await request(
    `/scoping-cases/${created.data.id}`,
    {
      deliverables: 'A written policy review',
      category: 'Legal and compliance',
      budgetContext: '$2000',
      timelineContext: '2 weeks',
    },
    client,
    'PATCH',
  );
  assert.equal(filled.status, 200);
  assert.equal(filled.data.risk_band, 'red');
});

test('a fully-specified, non-regulated case becomes green after PATCH', async () => {
  const client = await signup('Green Client', 'green-client@example.test');
  const created = await request(
    '/scoping-cases',
    {
      objective: 'Build a marketing dashboard',
      problemStatement: 'No visibility into campaign performance.',
    },
    client,
  );
  const filled = await request(
    `/scoping-cases/${created.data.id}`,
    {
      deliverables: 'A working dashboard',
      category: 'Marketing and growth',
      budgetContext: '$3000',
      timelineContext: '3 weeks',
    },
    client,
    'PATCH',
  );
  assert.equal(filled.data.risk_band, 'green');
  assert.equal(filled.data.status, 'user_review');
});

test('suggest returns editable suggestions without changing the stored case', async () => {
  const client = await signup('Suggest Client', 'suggest-client@example.test');
  const created = await request(
    '/scoping-cases',
    { objective: 'Launch a referral program', problemStatement: '' },
    client,
  );
  const suggest = await request(`/scoping-cases/${created.data.id}/suggest`, {}, client);
  assert.equal(suggest.status, 200);
  assert.ok(suggest.data.suggestions.deliverables);
  const reread = await request(`/scoping-cases/${created.data.id}`, undefined, client, 'GET');
  assert.equal(reread.data.deliverables, '');
});

test('a red-band case cannot publish without explicit confirmation, and only over a job the user owns', async () => {
  const client = await signup('Publish Client', 'publish-client@example.test');
  const stranger = await signup('Publish Stranger', 'publish-stranger@example.test');
  const created = await request(
    '/scoping-cases',
    { objective: 'Provide financial advice to clients', problemStatement: '' },
    client,
  );
  assert.equal(created.data.risk_band, 'red');

  const job = await request(
    '/jobs',
    {
      title: 'Financial advisory project',
      category: 'Finance and accounting',
      projectType: 'Advisory engagement',
      description: 'A project used to test the scoping-case publish linkage.',
      deliverables: 'Advisory memo.',
      budgetMin: 500,
      budgetMax: 1000,
      currency: 'USD',
      timeline: '2 weeks',
    },
    client,
  );
  assert.equal(job.status, 201);

  const withoutConfirm = await request(
    `/scoping-cases/${created.data.id}/publish`,
    { publishedJobId: job.data.id },
    client,
    'PATCH',
  );
  assert.equal(withoutConfirm.status, 400);

  const notOwner = await request(
    `/scoping-cases/${created.data.id}/publish`,
    { publishedJobId: job.data.id, confirmed: true },
    stranger,
    'PATCH',
  );
  assert.equal(notOwner.status, 403);

  const published = await request(
    `/scoping-cases/${created.data.id}/publish`,
    { publishedJobId: job.data.id, confirmed: true },
    client,
    'PATCH',
  );
  assert.equal(published.status, 200);
  assert.equal(published.data.status, 'published');
  assert.equal(published.data.published_job_id, job.data.id);

  const editAfterPublish = await request(
    `/scoping-cases/${created.data.id}`,
    { objective: 'Changed' },
    client,
    'PATCH',
  );
  assert.equal(editAfterPublish.status, 400);
});

test('a job posted directly (skipping the guided scoping pre-flow) is still risk-gated', async () => {
  const client = await signup('DirectPoster', `direct-poster-${Date.now()}@example.test`);
  const regulatedBody = {
    title: 'Need licensed medical advice for a product',
    category: 'Legal and compliance',
    projectType: 'Advisory engagement',
    description: 'We need someone to give clinical guidance on our new health product.',
    deliverables: 'A written opinion.',
    budgetMin: 500,
    budgetMax: 1000,
    currency: 'USD',
    timeline: '2 weeks',
  };

  const blocked = await request('/jobs', regulatedBody, client);
  assert.equal(blocked.status, 409, 'a regulated job post must be blocked without confirmation');
  assert.equal(blocked.data.riskBand, 'red');

  const confirmed = await request('/jobs', { ...regulatedBody, riskConfirmed: true }, client);
  assert.equal(confirmed.status, 201);
  assert.equal(confirmed.data.riskBand, 'red');

  // Self-confirmation unblocks posting but does not skip human review — an independent expert
  // review queue entry must exist for it, same queue the guided scoping pre-flow uses.
  const expert = await signup('QueueExpert', `queue-expert-${Date.now()}@example.test`);
  const profile = await request('/talent/profile', { headline: 'Reviewer', skills: ['Compliance'] }, expert);
  assert.equal(profile.status, 200);
  const queue = await request('/review-queue', undefined, expert, 'GET');
  assert.equal(queue.status, 200);
  assert.ok(
    queue.data.some((entry) => entry.category === 'Legal and compliance' && entry.risk_band === 'red'),
    'the directly-posted regulated job must appear in the same expert review queue as guided scoping cases',
  );

  const unregulatedBody = { ...regulatedBody, title: 'Redesign our marketing website', category: 'Creative and media', description: 'A straightforward website redesign with no regulated content.' };
  const clean = await request('/jobs', unregulatedBody, client);
  assert.equal(clean.status, 201);
  assert.equal(clean.data.riskBand, 'green');
});
