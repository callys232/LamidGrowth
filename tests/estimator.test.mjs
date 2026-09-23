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
let counter = 0;
async function signup(name) {
  counter++;
  const result = await request('/auth/signup', {
    name,
    email: `estimator-${counter}-${Date.now()}@example.test`,
    password: `a-long-estimator-password-${counter}`,
    context: 'Founder',
  });
  assert.equal(result.status, 201);
  return result.cookie;
}
async function postJob(user, overrides = {}) {
  const job = await request(
    '/jobs',
    {
      title: 'Estimator seed job',
      category: 'Software engineering',
      projectType: 'Fixed-scope project',
      description: 'A job used to seed real historical data for the estimator.',
      deliverables: 'A working deliverable.',
      budgetMin: 1000,
      budgetMax: 2000,
      currency: 'USD',
      timeline: '2 weeks',
      tags: [],
      ...overrides,
    },
    user,
  );
  assert.equal(job.status, 201);
  return job.data;
}

test('with no historical data, the estimate is honestly unavailable rather than invented', async () => {
  const user = await signup('No History');
  const result = await request(
    '/jobs/estimate',
    { category: 'Legal and compliance', tags: [] },
    user,
  );
  assert.equal(result.status, 200);
  assert.equal(result.data.available, false);
  assert.equal(result.data.sampleSize, 0);
  assert.ok(result.data.message.includes('Not enough'));
});

test('once enough real jobs exist in a category, the estimate reflects their actual budgets', async () => {
  const user = await signup('Category History');
  await postJob(user, { category: 'Data and analytics', budgetMin: 1000, budgetMax: 2000 });
  await postJob(user, { category: 'Data and analytics', budgetMin: 2000, budgetMax: 3000 });
  await postJob(user, { category: 'Data and analytics', budgetMin: 3000, budgetMax: 4000 });

  const result = await request(
    '/jobs/estimate',
    { category: 'Data and analytics', tags: [] },
    user,
  );
  assert.equal(result.status, 200);
  assert.equal(result.data.available, true);
  assert.equal(result.data.basis, 'category-wide-history');
  assert.equal(result.data.sampleSize, 3);
  assert.equal(result.data.budgetMin, 2000); // average of 1000, 2000, 3000
  assert.equal(result.data.budgetMax, 3000); // average of 2000, 3000, 4000
});

test('smart tags narrow the estimate to a more specific match within a broad category', async () => {
  const user = await signup('Tag History');
  // Broad-category jobs with no matching tags.
  await postJob(user, {
    category: 'Software engineering',
    budgetMin: 500,
    budgetMax: 1000,
    tags: ['backend'],
  });
  await postJob(user, {
    category: 'Software engineering',
    budgetMin: 500,
    budgetMax: 1000,
    tags: ['backend'],
  });
  await postJob(user, {
    category: 'Software engineering',
    budgetMin: 500,
    budgetMax: 1000,
    tags: ['backend'],
  });
  // Tag-matched jobs with a distinctly different (higher) budget.
  await postJob(user, {
    category: 'Software engineering',
    budgetMin: 5000,
    budgetMax: 8000,
    tags: ['mobile-app', 'react-native'],
  });
  await postJob(user, {
    category: 'Software engineering',
    budgetMin: 6000,
    budgetMax: 9000,
    tags: ['mobile-app'],
  });
  await postJob(user, {
    category: 'Software engineering',
    budgetMin: 7000,
    budgetMax: 10000,
    tags: ['mobile-app'],
  });

  const result = await request(
    '/jobs/estimate',
    { category: 'Software engineering', tags: ['mobile-app'] },
    user,
  );
  assert.equal(result.status, 200);
  assert.equal(result.data.available, true);
  assert.equal(result.data.basis, 'tag-matched-history');
  assert.equal(result.data.sampleSize, 3);
  assert.equal(result.data.budgetMin, 6000); // average of 5000, 6000, 7000 — the tag-matched jobs only
});

test('too few tag matches falls back to category-wide history with an honest note, not a fabricated tag estimate', async () => {
  const user = await signup('Sparse Tag History');
  await postJob(user, {
    category: 'Marketing and growth',
    budgetMin: 1000,
    budgetMax: 2000,
    tags: [],
  });
  await postJob(user, {
    category: 'Marketing and growth',
    budgetMin: 1000,
    budgetMax: 2000,
    tags: [],
  });
  await postJob(user, {
    category: 'Marketing and growth',
    budgetMin: 1000,
    budgetMax: 2000,
    tags: [],
  });
  await postJob(user, {
    category: 'Marketing and growth',
    budgetMin: 9000,
    budgetMax: 9000,
    tags: ['tiktok-ads'],
  }); // only 1 match

  const result = await request(
    '/jobs/estimate',
    { category: 'Marketing and growth', tags: ['tiktok-ads'] },
    user,
  );
  assert.equal(result.status, 200);
  assert.equal(result.data.basis, 'category-wide-history');
  assert.ok(result.data.note.includes('Not enough history for these specific tags'));
});

test('an invalid category is rejected, matching job-posting validation', async () => {
  const user = await signup('Invalid Category');
  const result = await request(
    '/jobs/estimate',
    { category: 'Not a real category', tags: [] },
    user,
  );
  assert.equal(result.status, 400);
});
