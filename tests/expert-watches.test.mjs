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
  };
}
let counter = 0;
async function signup() {
  counter++;
  const result = await request('/auth/signup', {
    name: 'Watch Owner',
    email: `watch-${counter}-${Date.now()}@example.test`,
    password: `a-long-watch-password-${counter}`,
    context: 'Founder',
  });
  assert.equal(result.status, 201);
  return result.cookie;
}
async function makeExpert(cookie) {
  const profile = await request('/talent/profile', { headline: 'Designer', skills: ['UX'] }, cookie);
  assert.equal(profile.status, 200);
  return cookie;
}

test('a non-expert cannot create a job watch', async () => {
  const cookie = await signup();
  const attempt = await request('/talent/watches', { categories: ['UX/UI design'], keywords: '' }, cookie);
  assert.equal(attempt.status, 403);
});

test('an expert job watch finds a new matching job by category and does not duplicate on re-scan', async () => {
  const expert = await makeExpert(await signup());
  const watch = await request('/talent/watches', { categories: ['UX/UI design'], keywords: '' }, expert);
  assert.equal(watch.status, 201);

  const client = await signup();
  const job = await request(
    '/jobs',
    {
      title: 'Landing page redesign',
      category: 'UX/UI design',
      projectType: 'Fixed-scope project',
      description: 'Redesign our landing page for conversion.',
      deliverables: 'A redesigned page.',
      budgetMin: 500,
      budgetMax: 1500,
      currency: 'USD',
      timeline: '2 weeks',
    },
    client,
  );
  assert.equal(job.status, 201);

  const unrelatedJob = await request(
    '/jobs',
    {
      title: 'Backend API work',
      category: 'Software engineering',
      projectType: 'Fixed-scope project',
      description: 'Build a backend API.',
      deliverables: 'A working API.',
      budgetMin: 500,
      budgetMax: 1500,
      currency: 'USD',
      timeline: '2 weeks',
    },
    client,
  );
  assert.equal(unrelatedJob.status, 201);

  const firstScan = await request(`/talent/watches/${watch.data.id}/scan`, {}, expert, 'POST');
  assert.equal(firstScan.status, 200);
  assert.equal(firstScan.data.newMatches.length, 1);
  assert.equal(firstScan.data.newMatches[0].jobId, job.data.id);

  const secondScan = await request(`/talent/watches/${watch.data.id}/scan`, {}, expert, 'POST');
  assert.equal(secondScan.data.newMatches.length, 0, 're-scanning must not duplicate a match');

  const matches = await request(`/talent/watches/${watch.data.id}/matches`, undefined, expert, 'GET');
  assert.equal(matches.status, 200);
  assert.equal(matches.data.length, 1);
  assert.equal(matches.data[0].jobId, job.data.id);

  const stranger = await makeExpert(await signup());
  assert.equal((await request(`/talent/watches/${watch.data.id}/scan`, {}, stranger, 'POST')).status, 404);
});

test('a watch can be deleted', async () => {
  const expert = await makeExpert(await signup());
  const watch = await request('/talent/watches', { categories: [], keywords: 'redesign' }, expert);
  assert.equal(watch.status, 201);
  assert.equal((await request(`/talent/watches/${watch.data.id}`, {}, expert, 'DELETE')).status, 204);
  assert.equal((await request('/talent/watches', undefined, expert, 'GET')).data.length, 0);
});
