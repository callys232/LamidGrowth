import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createFundedTestApp as createApp } from './support/funded-app.mjs';

let app, store, server, base;
before(async () => {
  ({ app, store } = await createApp({
    filename: ':memory:',
    rateLimits: {
      api: { max: 5000 },
      auth: { max: 5000 },
      mutation: { max: 5000 },
      spend: { max: 5000 },
    },
    // Several tests below drive real companion messages through paid specialists (proposal-drafter,
    // context-curator, etc.), so this needs AI configured the way production would have it — same
    // stub pattern as tests/agents.test.mjs.
    aiProvider: {
      name: 'test',
      model: 'test',
      async review(context) {
        return {
          review: {
            summary: `AI summary: ${context.question}`,
            assumptions: [],
            suggestions: [],
            evidenceIds: (context.sources || []).map((s) => s.id),
          },
        };
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
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return {
    status: response.status,
    data,
    cookie: response.headers.get('set-cookie')?.split(';')[0],
  };
}
let counter = 0;
async function signup(name, context = 'Founder') {
  counter++;
  const email = `sweep-${counter}-${Date.now()}@example.test`;
  const result = await request('/auth/signup', {
    name,
    email,
    password: `a-long-sweep-password-${counter}`,
    context,
  });
  assert.equal(result.status, 201, `signup failed: ${JSON.stringify(result.data)}`);
  const cookie = result.cookie;
  // External AI requires a verified account and workspace opt-in (see aiPolicy.mjs).
  await request('/auth/verify', { token: result.data.verificationToken }, cookie);
  await request('/ai/settings', { enabled: true, dailyLimit: 100, version: 0 }, cookie, 'PATCH');
  return cookie;
}

const categories = [
  'Strategy and consulting',
  'Business operations',
  'Finance and accounting',
  'Marketing and growth',
  'Sales and partnerships',
  'Product management',
  'UX/UI design',
  'Software engineering',
  'Data and analytics',
  'AI and automation',
  'Content and communications',
  'Research',
  'People and recruiting',
  'Legal and compliance',
  'Administration and support',
  'Creative and media',
];

test('full job-to-invoice lifecycle succeeds for every job category', async () => {
  const breaks = [];
  const note = (area, detail) => breaks.push({ area, detail });
  for (const category of categories) {
    const client = await signup('Sweep Client');
    const freelancer = await signup('Sweep Freelancer');
    const freelancerState = (await request('/state', undefined, freelancer, 'GET')).data;

    const job = await request(
      '/jobs',
      {
        title: `${category} sweep job`,
        category,
        projectType: 'Fixed-scope project',
        description: `A sweep test job in the ${category} category, used to exercise the full lifecycle end to end.`,
        deliverables: 'A completed deliverable that satisfies the stated acceptance criteria.',
        budgetMin: 500,
        budgetMax: 2000,
        currency: 'USD',
        timeline: '2 weeks',
        riskConfirmed: true,
      },
      client,
    );
    if (job.status !== 201) {
      note(
        'job creation',
        `${category}: expected 201, got ${job.status} — ${JSON.stringify(job.data)}`,
      );
      continue;
    }

    const bid = await request(
      `/jobs/${job.data.id}/bids`,
      {
        coverLetter: 'I will deliver this work as described.',
        proposedAmount: 1000,
        currency: 'USD',
        timeline: '2 weeks',
      },
      freelancer,
    );
    if (bid.status !== 201) {
      note(
        'bid submission',
        `${category}: expected 201, got ${bid.status} — ${JSON.stringify(bid.data)}`,
      );
      continue;
    }

    const matches = await request(`/jobs/${job.data.id}/matches`, undefined, client, 'GET');
    if (matches.status !== 200)
      note('consultant matcher', `${category}: expected 200, got ${matches.status}`);

    const proposal = await request(
      '/companion/messages',
      { message: 'draft a proposal for this job', jobId: job.data.id, consent: true },
      freelancer,
    );
    if (proposal.status !== 201 || proposal.data.agentId !== 'proposal-drafter')
      note(
        'proposal drafter',
        `${category}: status ${proposal.status}, agentId ${proposal.data?.agentId}`,
      );

    const project = await request(
      '/projects',
      {
        jobId: job.data.id,
        title: `${category} project`,
        freelancerUserId: freelancerState.user.id,
      },
      client,
    );
    if (project.status !== 201) {
      note(
        'project creation',
        `${category}: expected 201, got ${project.status} — ${JSON.stringify(project.data)}`,
      );
      continue;
    }

    const milestone = await request(
      `/projects/${project.data.id}/milestones`,
      { title: 'Phase 1', description: '', amount: 750, currency: 'USD' },
      client,
    );
    if (milestone.status !== 201) {
      note('milestone creation', `${category}: expected 201, got ${milestone.status}`);
      continue;
    }

    const deliverable = await request(
      `/milestones/${milestone.data.id}/deliverables`,
      {
        title: 'Deliverable',
        description: '',
        criteria: ['Work is complete and matches the brief'],
      },
      client,
    );
    if (deliverable.status !== 201)
      note('deliverable creation', `${category}: expected 201, got ${deliverable.status}`);

    const submission = await request(
      `/milestones/${milestone.data.id}/submissions`,
      { notes: 'Work is complete and matches the brief as agreed.' },
      freelancer,
    );
    if (submission.status !== 201) {
      note('submission', `${category}: expected 201, got ${submission.status}`);
      continue;
    }

    const verification = await request(`/submissions/${submission.data.id}/verify`, {}, client);
    if (verification.status !== 201) {
      note('verification', `${category}: expected 201, got ${verification.status}`);
      continue;
    }

    const decision = await request(
      `/verification-cases/${verification.data.id}/decisions`,
      { decision: 'approve', reason: 'Approved.' },
      client,
    );
    if (decision.status !== 201 || decision.data.status !== 'approved')
      note(
        'approval decision',
        `${category}: status ${decision.status}, milestone status ${decision.data?.status}`,
      );

    const invoice = await request(
      '/companion/messages',
      { message: 'generate an invoice for this milestone', milestoneId: milestone.data.id },
      client,
    );
    if (invoice.status !== 201 || invoice.data.evidence?.amount !== 750)
      note(
        'invoice generator',
        `${category}: status ${invoice.status}, evidence ${JSON.stringify(invoice.data?.evidence)}`,
      );
  }
  assert.deepEqual(
    breaks.filter((b) => b.area !== 'REPORT'),
    [],
    `Breaks found across category sweep:\n${breaks.map((b) => `- [${b.area}] ${b.detail}`).join('\n')}`,
  );
});

const routingCases = [
  ['generate a quote for this job', 'quote-generator'],
  ['I need an estimate for this work', 'estimate-generator'],
  ['generate an invoice', 'invoice-generator'],
  ['draft a proposal', 'proposal-drafter'],
  ['what changed recently', 'signal-monitoring'],
  ['what capability gaps do we have', 'capability-mapper'],
  ['show me our kpis and performance metrics', 'performance-analytics'],
  ['analyze our market and competitors', 'market-intelligence'],
  ['run a health diagnostic and risk assessment', 'diagnostic-intelligence'],
  ['build a scope document', 'scope-builder'],
  ['draft a statement of work', 'sow-builder'],
  ['write a client brief', 'brief-builder'],
  ['define the deliverables', 'deliverable-builder'],
  ['what are the acceptance criteria', 'acceptance-builder'],
  ['I need a change order', 'change-order'],
  ['approve the paused workflow', 'workflow-orchestration'],
  ['just checking in, nothing specific', 'context-curator'],
];

// Agents whose execute() rejects (422) before ever reaching routing/AI, unless given the job,
// proposal, or milestone id they document as required — see validatePrerequisites in agents.mjs.
const jobScopedAgents = new Set([
  'quote-generator',
  'estimate-generator',
  'proposal-drafter',
  'scope-builder',
  'sow-builder',
  'brief-builder',
  'deliverable-builder',
  'acceptance-builder',
]);

test('Companion routes every documented phrase to the correct agent (Shared, Clarity, Capability, Growth, Consistency engines)', async () => {
  const breaks = [];
  const note = (area, detail) => breaks.push({ area, detail });
  const owner = await signup('Routing Owner');
  const freelancer = await signup('Routing Freelancer');
  const freelancerState = (await request('/state', undefined, freelancer, 'GET')).data;

  const job = await request(
    '/jobs',
    {
      title: 'Routing sweep job',
      category: 'Software engineering',
      projectType: 'Fixed-scope project',
      description:
        'A job used purely to give job/proposal/milestone-scoped specialists something real to reference.',
      deliverables: 'Nothing real, this is a routing test.',
      budgetMin: 500,
      budgetMax: 2000,
      currency: 'USD',
      timeline: '2 weeks',
    },
    owner,
  );
  assert.equal(job.status, 201, `job creation failed: ${JSON.stringify(job.data)}`);

  await request(
    `/jobs/${job.data.id}/bids`,
    {
      coverLetter: 'I will deliver this work as described.',
      proposedAmount: 1000,
      currency: 'USD',
      timeline: '2 weeks',
    },
    freelancer,
  );

  const proposal = await request(
    `/jobs/${job.data.id}/proposals`,
    {
      title: 'Routing proposal',
      scope: 'Deliver the routing sweep job as described in its brief.',
      deliverables: 'A completed deliverable.',
      amount: 1000,
      currency: 'USD',
      timeline: '2 weeks',
    },
    owner,
  );
  assert.equal(proposal.status, 201, `proposal creation failed: ${JSON.stringify(proposal.data)}`);

  const project = await request(
    '/projects',
    { jobId: job.data.id, title: 'Routing project', freelancerUserId: freelancerState.user.id },
    owner,
  );
  assert.equal(project.status, 201, `project creation failed: ${JSON.stringify(project.data)}`);
  const milestone = await request(
    `/projects/${project.data.id}/milestones`,
    { title: 'Routing milestone', description: '', amount: 500, currency: 'USD' },
    owner,
  );
  assert.equal(
    milestone.status,
    201,
    `milestone creation failed: ${JSON.stringify(milestone.data)}`,
  );

  for (const [message, expectedAgentId] of routingCases) {
    const body = { message, consent: true };
    if (jobScopedAgents.has(expectedAgentId)) body.jobId = job.data.id;
    if (expectedAgentId === 'change-order') body.proposalId = proposal.data.id;
    if (expectedAgentId === 'invoice-generator') body.milestoneId = milestone.data.id;
    const result = await request('/companion/messages', body, owner);
    if (result.status !== 201 || result.data.agentId !== expectedAgentId)
      note(
        'routing',
        `"${message}" → expected ${expectedAgentId}, got status ${result.status} agentId ${result.data?.agentId} (${JSON.stringify(result.data)})`,
      );
  }
  assert.deepEqual(
    breaks,
    [],
    `Routing breaks:\n${breaks.map((b) => `- [${b.area}] ${b.detail}`).join('\n')}`,
  );
});

test('a workspace member is blocked from the Consistency engine (workflow-orchestration, band A2)', async () => {
  const owner = await signup('Enterprise Owner', 'Enterprise');
  const memberAccount = await signup('Enterprise Member');
  const memberState = (await request('/state', undefined, memberAccount, 'GET')).data;

  const added = await request('/admin/members', { email: memberState.user.email }, owner);
  assert.equal(
    added.status,
    201,
    `expected member add to succeed, got ${added.status} — ${JSON.stringify(added.data)}`,
  );

  const ownerState = (await request('/state', undefined, owner, 'GET')).data;
  const switched = await request(
    '/workspace/switch',
    { workspaceId: ownerState.workspace.id },
    memberAccount,
  );
  assert.equal(
    switched.status,
    200,
    `expected workspace switch to succeed, got ${switched.status}`,
  );

  const attempt = await request(
    '/companion/messages',
    { message: 'approve the paused workflow' },
    memberAccount,
  );
  assert.equal(
    attempt.status,
    403,
    `member should be blocked from workflow-orchestration, got ${attempt.status}`,
  );
});

test('boundary and adversarial inputs do not crash the server (500) — they get a clean 4xx', async () => {
  const breaks = [];
  const note = (area, detail) => breaks.push({ area, detail });
  const client = await signup('Edge Client');
  const attempts = [];

  attempts.push([
    'job with min budget over max budget',
    await request(
      '/jobs',
      {
        title: 'Edge case job',
        category: 'Software engineering',
        projectType: 'Fixed-scope project',
        description: 'An edge-case job used to probe boundary validation.',
        deliverables: 'Something.',
        budgetMin: 2000,
        budgetMax: 500,
        currency: 'USD',
        timeline: '1 week',
      },
      client,
    ),
  ]);
  attempts.push([
    'job with an unknown category',
    await request(
      '/jobs',
      {
        title: 'Edge case job',
        category: 'Not a real category',
        projectType: 'Fixed-scope project',
        description: 'An edge-case job used to probe enum validation.',
        deliverables: 'Something.',
        budgetMin: 100,
        budgetMax: 200,
        currency: 'USD',
        timeline: '1 week',
      },
      client,
    ),
  ]);
  attempts.push([
    'companion message that is an empty string',
    await request('/companion/messages', { message: '' }, client),
  ]);
  attempts.push([
    'companion message with a script-injection payload',
    await request(
      '/companion/messages',
      { message: '<script>alert(1)</script> what changed recently' },
      client,
    ),
  ]);
  {
    const freelancer = await signup('Edge Freelancer');
    const freelancerState = (await request('/state', undefined, freelancer, 'GET')).data;
    const job = await request(
      '/jobs',
      {
        title: 'Edge boundary job',
        category: 'Software engineering',
        projectType: 'Fixed-scope project',
        description: 'A job used to probe the milestone amount boundary.',
        deliverables: 'Something.',
        budgetMin: 100,
        budgetMax: 100000000,
        currency: 'USD',
        timeline: '1 week',
      },
      client,
    );
    await request(
      `/jobs/${job.data.id}/bids`,
      { coverLetter: 'Bid.', proposedAmount: 100000000, currency: 'USD', timeline: '1 week' },
      freelancer,
    );
    const project = await request(
      '/projects',
      { jobId: job.data.id, title: 'Boundary project', freelancerUserId: freelancerState.user.id },
      client,
    );
    const milestone = await request(
      `/projects/${project.data.id}/milestones`,
      { title: 'Max amount', description: '', amount: 100000000, currency: 'USD' },
      client,
    );
    attempts.push(['milestone with amount at the schema max boundary', milestone]);
  }

  for (const [label, result] of attempts) {
    if (result.status >= 500)
      note('crash', `${label}: server returned ${result.status} — ${JSON.stringify(result.data)}`);
  }
  assert.deepEqual(
    breaks,
    [],
    `Server crashed on:\n${breaks.map((b) => `- [${b.area}] ${b.detail}`).join('\n')}`,
  );
});
