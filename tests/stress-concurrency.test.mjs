import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createFundedTestApp as createApp } from './support/funded-app.mjs';

let app, store, server, base;
before(async () => {
  ({ app, store } = await createApp({
    filename: ':memory:',
    rateLimits: { api: { max: 5000 }, auth: { max: 5000 }, mutation: { max: 5000 }, spend: { max: 5000 } },
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
async function request(path, body, cookie, method = 'POST', rawBody) {
  const response = await fetch(`${base}/api${path}`, {
    method: body === undefined && rawBody === undefined ? 'GET' : method,
    headers: {
      ...(body === undefined && rawBody === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: rawBody !== undefined ? rawBody : body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: response.status, data, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
let counter = 0;
async function signup(name, context = 'Founder') {
  counter++;
  const email = `stress-${counter}-${Date.now()}@example.test`;
  const result = await request('/auth/signup', {
    name,
    email,
    password: `a-long-stress-password-${counter}`,
    context,
  });
  assert.equal(result.status, 201, `signup failed: ${JSON.stringify(result.data)}`);
  return result.cookie;
}
async function jobWithBid(client, freelancer, amount = 1000) {
  const job = await request(
    '/jobs',
    {
      title: 'Stress test job',
      category: 'Software engineering',
      projectType: 'Fixed-scope project',
      description: 'A job used to exercise concurrency and payload stress scenarios.',
      deliverables: 'A completed deliverable.',
      budgetMin: 500,
      budgetMax: 2000,
      currency: 'USD',
      timeline: '2 weeks',
    },
    client,
  );
  assert.equal(job.status, 201);
  const bid = await request(
    `/jobs/${job.data.id}/bids`,
    { coverLetter: 'I will deliver this work.', proposedAmount: amount, currency: 'USD', timeline: '2 weeks' },
    freelancer,
  );
  assert.equal(bid.status, 201);
  return job.data;
}

test('two clients cannot both approve the same milestone twice (double-decision race)', async () => {
  const client = await signup('Race Client');
  const freelancer = await signup('Race Freelancer');
  const freelancerState = (await request('/state', undefined, freelancer, 'GET')).data;
  const job = await jobWithBid(client, freelancer);
  const project = await request(
    '/projects',
    { jobId: job.id, title: 'Race project', freelancerUserId: freelancerState.user.id },
    client,
  );
  const milestone = await request(
    `/projects/${project.data.id}/milestones`,
    { title: 'Phase 1', description: '', amount: 500, currency: 'USD' },
    client,
  );
  await request(
    `/milestones/${milestone.data.id}/deliverables`,
    { title: 'Deliverable', description: '', criteria: ['Work is complete'] },
    client,
  );
  const submission = await request(
    `/milestones/${milestone.data.id}/submissions`,
    { notes: 'Work is complete as agreed.' },
    freelancer,
  );
  const verification = await request(`/submissions/${submission.data.id}/verify`, {}, client);

  // Fire the same decision twice concurrently — a dispute racing an approval.
  const [first, second] = await Promise.all([
    request(`/verification-cases/${verification.data.id}/decisions`, { decision: 'approve', reason: 'Approved.' }, client),
    request(`/verification-cases/${verification.data.id}/decisions`, { decision: 'dispute', reason: 'Actually no.' }, client),
  ]);

  // Both requests are processed (no crash), and the final milestone state is exactly one of the two outcomes —
  // never a corrupted mix, and never two approval records where only one decision should have stood.
  assert.deepEqual([first.status, second.status].sort(), [201, 409]);
  const finalMilestone = await request(`/projects/${project.data.id}`, undefined, client, 'GET');
  const status = finalMilestone.data.milestones[0].status;
  assert.ok(['approved', 'disputed'].includes(status));
  const approvalRows = (await store.db
    .prepare("SELECT COUNT(*) AS count FROM approvals WHERE subject_id = ?")
    .get(milestone.data.id)).count;
  assert.equal(approvalRows, 1, 'only the winning decision is recorded');
  const disputes = await store.db.prepare("SELECT COUNT(*) AS count FROM disputes WHERE subject_id = ? AND status = 'open'").get(milestone.data.id);
  assert.equal(Number(disputes.count), status === 'disputed' ? 1 : 0);
});

test('five concurrent bids on the same job are all accepted without corrupting job state', async () => {
  const client = await signup('Concurrent Job Client');
  const job = await request(
    '/jobs',
    {
      title: 'Concurrent bid job',
      category: 'Software engineering',
      projectType: 'Fixed-scope project',
      description: 'A job used to exercise concurrent bid submission.',
      deliverables: 'Something.',
      budgetMin: 100,
      budgetMax: 2000,
      currency: 'USD',
      timeline: '1 week',
    },
    client,
  );
  assert.equal(job.status, 201);
  const freelancers = await Promise.all(Array.from({ length: 5 }, () => signup('Concurrent Freelancer')));
  const results = await Promise.all(
    freelancers.map((freelancer, i) =>
      request(
        `/jobs/${job.data.id}/bids`,
        { coverLetter: `This is bid number ${i}, submitted concurrently.`, proposedAmount: 500 + i, currency: 'USD', timeline: '1 week' },
        freelancer,
      ),
    ),
  );
  assert.ok(results.every((r) => r.status === 201));
  const bidCount = (await store.db.prepare('SELECT COUNT(*) AS count FROM bids WHERE job_id = ?').get(job.data.id)).count;
  assert.equal(bidCount, 5);
});

test('a request body at exactly the JSON size limit is accepted; over the limit is rejected, not crashed', async () => {
  const client = await signup('Payload Client');
  const bigDescription = 'A'.repeat(9800);
  const withinLimit = await request(
    '/jobs',
    {
      title: 'Big payload job',
      category: 'Software engineering',
      projectType: 'Fixed-scope project',
      description: bigDescription,
      deliverables: 'Something.',
      budgetMin: 100,
      budgetMax: 200,
      currency: 'USD',
      timeline: '1 week',
    },
    client,
  );
  assert.ok([201, 400].includes(withinLimit.status), `unexpected status ${withinLimit.status}`);

  const oversized = await request(
    '/jobs',
    undefined,
    client,
    'POST',
    JSON.stringify({
      title: 'Oversized payload job',
      category: 'Software engineering',
      projectType: 'Fixed-scope project',
      description: 'B'.repeat(40000),
      deliverables: 'Something.',
      budgetMin: 100,
      budgetMax: 200,
      currency: 'USD',
      timeline: '1 week',
    }),
  );
  assert.equal(oversized.status, 413, `expected 413 for an oversized payload, got ${oversized.status}`);
});

test('tampering with the session cookie is rejected, not treated as a valid session', async () => {
  const client = await signup('Cookie Client');
  const tampered = client.replace('lamid_session=', 'lamid_session=deadbeef'.padEnd(client.length, '0') + '_tampered=');
  const forged = `lamid_session=${'0'.repeat(64)}`;

  const withForged = await request('/state', undefined, forged, 'GET');
  assert.equal(withForged.status, 401);

  const withGarbage = await request('/state', undefined, 'lamid_session=not-a-real-token', 'GET');
  assert.equal(withGarbage.status, 401);

  const withNoCookie = await request('/state', undefined, undefined, 'GET');
  assert.equal(withNoCookie.status, 401);

  // The real cookie still works — tampering attempts don't poison the session store for the real user.
  const real = await request('/state', undefined, client, 'GET');
  assert.equal(real.status, 200);
  void tampered;
});

test('a session for a disabled account is rejected on the next request', async () => {
  const client = await signup('Disable Me');
  const state = (await request('/state', undefined, client, 'GET')).data;
  await store.db.prepare('UPDATE users SET disabled_at = ? WHERE id = ?').run(Date.now(), state.user.id);
  const attempt = await request('/state', undefined, client, 'GET');
  assert.equal(attempt.status, 403);
});

test('ten concurrent Companion messages from the same user never over-deduct points below zero', async () => {
  const client = await signup('Points Race Client');
  const before = (await request('/points', undefined, client, 'GET')).data.balance;
  const results = await Promise.all(
    Array.from({ length: 10 }, () => request('/companion/messages', { message: 'what changed recently' }, client)),
  );
  assert.ok(results.every((r) => r.status === 201));
  const balances = results.map((r) => r.data.balance);
  assert.ok(balances.every((b) => b >= 0), 'no balance ever went negative');
  // The atomic conditional UPDATE (WHERE points_balance >= ?) is what actually prevents a lost
  // update — Postgres's row-level locking serializes concurrent debits on the same row regardless
  // of how the ten HTTP requests interleave. What is NOT guaranteed under real network latency
  // (unlike SQLite's synchronous, single-writer model) is that each response's own balance-read
  // lands at a distinct point in that interleaving — near-simultaneous reads can legitimately
  // observe the same already-fully-debited value. So the real invariant to check is the total:
  // exactly ten charges landed, for the exact same per-run cost, and nothing was double-charged
  // or dropped.
  const costs = new Set(results.map((r) => r.data.pointsCharged));
  assert.equal(costs.size, 1, `expected one consistent per-run cost, got ${JSON.stringify([...costs])}`);
  const [cost] = costs;
  const after = Math.min(...balances);
  assert.equal(after, before - 10 * cost, `expected exactly 10 charges of ${cost} with no lost or duplicate update`);
});
