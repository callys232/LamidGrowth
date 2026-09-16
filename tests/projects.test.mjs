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
async function jobWithBid(client, freelancer) {
  const job = await request(
    '/jobs',
    {
      title: 'Milestone lifecycle job',
      category: 'Software engineering',
      projectType: 'Fixed-scope project',
      description: 'A job used to exercise the full milestone/verification/approval lifecycle.',
      deliverables: 'A working dashboard with export and login.',
      budgetMin: 1000,
      budgetMax: 2000,
      currency: 'USD',
      timeline: '4 weeks',
    },
    client,
  );
  assert.equal(job.status, 201);
  const bid = await request(
    `/jobs/${job.data.id}/bids`,
    {
      coverLetter: 'I will build the dashboard with export and login as described.',
      proposedAmount: 1500,
      currency: 'USD',
      timeline: '4 weeks',
    },
    freelancer,
  );
  assert.equal(bid.status, 201);
  return job.data;
}

test('the full milestone lifecycle: project, milestone, deliverable, submission, verification, approval', async () => {
  const client = await signup('Lifecycle Client', 'lifecycle-client@example.test');
  const freelancer = await signup('Lifecycle Freelancer', 'lifecycle-freelancer@example.test');
  const freelancerState = (await request('/state', undefined, freelancer, 'GET')).data;
  const job = await jobWithBid(client, freelancer);

  const project = await request(
    '/projects',
    { jobId: job.id, title: 'Dashboard build', freelancerUserId: freelancerState.user.id },
    client,
  );
  assert.equal(project.status, 201);
  assert.equal(project.data.status, 'active');

  const milestone = await request(
    `/projects/${project.data.id}/milestones`,
    { title: 'Phase 1', description: 'Core dashboard', amount: 750, currency: 'USD' },
    client,
  );
  assert.equal(milestone.status, 201);
  assert.equal(milestone.data.status, 'planned');

  const deliverable = await request(
    `/milestones/${milestone.data.id}/deliverables`,
    {
      title: 'Dashboard export',
      description: 'Export feature',
      criteria: ['Dashboard supports export to CSV', 'Login works with email and password'],
    },
    client,
  );
  assert.equal(deliverable.status, 201);
  assert.equal(deliverable.data.criteria.length, 2);

  const submission = await request(
    `/milestones/${milestone.data.id}/submissions`,
    { notes: 'Implemented export to CSV and login with email and password as requested.', assets: [] },
    freelancer,
  );
  assert.equal(submission.status, 201);
  const afterSubmission = await request(`/projects/${project.data.id}`, undefined, client, 'GET');
  assert.equal(afterSubmission.data.milestones[0].status, 'submitted');

  const verification = await request(`/submissions/${submission.data.id}/verify`, {}, client);
  assert.equal(verification.status, 201);
  assert.equal(verification.data.method, 'deterministic');
  assert.equal(verification.data.results.length, 2);
  assert.ok(verification.data.results.every((r) => r.result === 'satisfied'));

  // Verification alone must never approve the milestone.
  const afterVerification = await request(`/projects/${project.data.id}`, undefined, client, 'GET');
  assert.equal(afterVerification.data.milestones[0].status, 'in_review');

  const decision = await request(
    `/verification-cases/${verification.data.id}/decisions`,
    { decision: 'approve', reason: 'Looks good.' },
    client,
  );
  assert.equal(decision.status, 201);
  assert.equal(decision.data.status, 'approved');
});

test('only the assigned freelancer can submit, and only the client can decide', async () => {
  const client = await signup('Auth Client', 'auth-client@example.test');
  const freelancer = await signup('Auth Freelancer', 'auth-freelancer@example.test');
  const stranger = await signup('Auth Stranger', 'auth-stranger@example.test');
  const freelancerState = (await request('/state', undefined, freelancer, 'GET')).data;
  const job = await jobWithBid(client, freelancer);

  const project = await request(
    '/projects',
    { jobId: job.id, title: 'Auth project', freelancerUserId: freelancerState.user.id },
    client,
  );
  const milestone = await request(
    `/projects/${project.data.id}/milestones`,
    { title: 'Phase 1', description: '', amount: 500, currency: 'USD' },
    client,
  );

  // A stranger cannot submit.
  const strangerSubmit = await request(
    `/milestones/${milestone.data.id}/submissions`,
    { notes: 'not my milestone' },
    stranger,
  );
  assert.equal(strangerSubmit.status, 403);

  // The client (not the freelancer) cannot submit either.
  const clientSubmit = await request(
    `/milestones/${milestone.data.id}/submissions`,
    { notes: 'clients do not submit their own work' },
    client,
  );
  assert.equal(clientSubmit.status, 403);

  const submission = await request(
    `/milestones/${milestone.data.id}/submissions`,
    { notes: 'Done.' },
    freelancer,
  );
  assert.equal(submission.status, 201);
  const verification = await request(`/submissions/${submission.data.id}/verify`, {}, freelancer);
  assert.equal(verification.status, 201);

  // The freelancer cannot approve their own work.
  const freelancerDecision = await request(
    `/verification-cases/${verification.data.id}/decisions`,
    { decision: 'approve', reason: '' },
    freelancer,
  );
  assert.equal(freelancerDecision.status, 403);

  // A stranger cannot decide either.
  const strangerDecision = await request(
    `/verification-cases/${verification.data.id}/decisions`,
    { decision: 'approve', reason: '' },
    stranger,
  );
  assert.equal(strangerDecision.status, 403);
});

test('a project cannot be created assigning a freelancer with no bid on the job', async () => {
  const client = await signup('NoBid Client', 'nobid-client@example.test');
  const outsider = await signup('NoBid Outsider', 'nobid-outsider@example.test');
  const outsiderState = (await request('/state', undefined, outsider, 'GET')).data;
  const job = await request(
    '/jobs',
    {
      title: 'No-bid job',
      category: 'Software engineering',
      projectType: 'Fixed-scope project',
      description: 'A job with no accepted bid, used to test project-creation validation.',
      deliverables: 'Nothing real.',
      budgetMin: 100,
      budgetMax: 200,
      currency: 'USD',
      timeline: '1 week',
    },
    client,
  );
  assert.equal(job.status, 201);
  const project = await request(
    '/projects',
    { jobId: job.data.id, title: 'Invalid project', freelancerUserId: outsiderState.user.id },
    client,
  );
  assert.equal(project.status, 400);
});

test('disputing a milestone opens a dispute record and moves the milestone to disputed', async () => {
  const client = await signup('Dispute Client', 'dispute-client@example.test');
  const freelancer = await signup('Dispute Freelancer', 'dispute-freelancer@example.test');
  const freelancerState = (await request('/state', undefined, freelancer, 'GET')).data;
  const job = await jobWithBid(client, freelancer);
  const project = await request(
    '/projects',
    { jobId: job.id, title: 'Dispute project', freelancerUserId: freelancerState.user.id },
    client,
  );
  const milestone = await request(
    `/projects/${project.data.id}/milestones`,
    { title: 'Phase 1', description: '', amount: 500, currency: 'USD' },
    client,
  );
  const submission = await request(
    `/milestones/${milestone.data.id}/submissions`,
    { notes: 'Completely unrelated work.' },
    freelancer,
  );
  const verification = await request(`/submissions/${submission.data.id}/verify`, {}, client);
  const decision = await request(
    `/verification-cases/${verification.data.id}/decisions`,
    { decision: 'dispute', reason: 'This does not match what was agreed.' },
    client,
  );
  assert.equal(decision.status, 201);
  assert.equal(decision.data.status, 'disputed');
  const dispute = await store.db
    .prepare("SELECT * FROM disputes WHERE subject_type = 'milestone' AND subject_id = ?")
    .get(milestone.data.id);
  assert.ok(dispute);
  assert.equal(dispute.status, 'open');
});

test('the invoice generator only invoices approved milestones, with an exact deterministic amount', async () => {
  const client = await signup('Invoice Client', 'invoice-client@example.test');
  const freelancer = await signup('Invoice Freelancer', 'invoice-freelancer@example.test');
  const freelancerState = (await request('/state', undefined, freelancer, 'GET')).data;
  const job = await jobWithBid(client, freelancer);
  const project = await request(
    '/projects',
    { jobId: job.id, title: 'Invoice project', freelancerUserId: freelancerState.user.id },
    client,
  );
  const milestone = await request(
    `/projects/${project.data.id}/milestones`,
    { title: 'Phase 1', description: '', amount: 750, currency: 'USD' },
    client,
  );

  // Before approval: the invoice generator must refuse, not invent an amount.
  const tooEarly = await request(
    '/companion/messages',
    { message: 'generate an invoice for this milestone', milestoneId: milestone.data.id },
    client,
  );
  assert.equal(tooEarly.status, 201);
  assert.equal(tooEarly.data.agentId, 'invoice-generator');
  assert.ok(tooEarly.data.response.includes('not yet approved'));
  assert.equal(tooEarly.data.evidence.status, 'planned');

  const deliverable = await request(
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
  await request(
    `/verification-cases/${verification.data.id}/decisions`,
    { decision: 'approve', reason: 'Approved.' },
    client,
  );

  const invoice = await request(
    '/companion/messages',
    { message: 'generate an invoice for this milestone', milestoneId: milestone.data.id },
    client,
  );
  assert.equal(invoice.status, 201);
  assert.equal(invoice.data.agentId, 'invoice-generator');
  assert.equal(invoice.data.evidence.method, 'deterministic-calculation');
  assert.equal(invoice.data.evidence.amount, 750);
  assert.equal(invoice.data.evidence.currency, 'USD');
  assert.ok(invoice.data.response.includes('750 USD'));
  assert.ok(/INV-\d{4}-\d{4}/.test(invoice.data.evidence.invoiceNumber));

  // A stranger cannot invoice someone else's milestone.
  const stranger = await signup('Invoice Stranger', 'invoice-stranger@example.test');
  const strangerAttempt = await request(
    '/companion/messages',
    { message: 'generate an invoice for this milestone', milestoneId: milestone.data.id },
    stranger,
  );
  assert.equal(strangerAttempt.status, 403);
  void deliverable;
});
