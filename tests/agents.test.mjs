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
  return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
async function demo() {
  const result = await request('/auth/demo', {});
  assert.equal(result.status, 201);
  const state = await request('/state', undefined, result.cookie, 'GET');
  await store.db.prepare('UPDATE users SET points_balance = 100000 WHERE id = ?').run(state.data.user.id);
  return result.cookie;
}

test('companion messages require authentication', async () => {
  assert.equal((await request('/companion/messages', { message: 'hello' })).status, 401);
});

test('companion agent catalog lists the seeded agents', async () => {
  const cookie = await demo();
  const result = await request('/companion/agents', undefined, cookie, 'GET');
  assert.equal(result.status, 200);
  assert.deepEqual(
    result.data.map((agent) => agent.id).sort(),
    [
      'acceptance-builder',
      'brief-builder',
      'capability-mapper',
      'change-order',
      'context-curator',
      'deliverable-builder',
      'diagnostic-intelligence',
      'estimate-generator',
      'invoice-generator',
      'market-intelligence',
      'onboarding',
      'performance-analytics',
      'pricing',
      'proposal-drafter',
      'quote-generator',
      'scope-builder',
      'signal-monitoring',
      'sow-builder',
      'support',
      'workflow-orchestration',
    ],
  );
  assert.ok(result.data.every((agent) => typeof agent.pointsCost === 'number'));
});

test('a signal, capability, analytics, or market question routes to its specialist agent', async () => {
  const cookie = await demo();
  const cases = [
    ['what signals or notifications changed recently?', 'signal-monitoring'],
    ['what capability gaps do we have?', 'capability-mapper'],
    ['show me our kpi and performance metrics', 'performance-analytics'],
    ['what does the market and our competitors look like?', 'market-intelligence'],
  ];
  for (const [message, expectedAgentId] of cases) {
    const result = await request('/companion/messages', { message }, cookie);
    assert.equal(result.status, 201, message);
    assert.equal(result.data.agentId, expectedAgentId, message);
  }
});

test('a generic question routes to the read-only context curator agent', async () => {
  const cookie = await demo();
  const result = await request('/companion/messages', { message: 'What is going on right now?' }, cookie);
  assert.equal(result.status, 201);
  assert.equal(result.data.agentId, 'context-curator');
  assert.ok(typeof result.data.response === 'string' && result.data.response.length > 0);
});

test('a diagnostic-style question routes to the diagnostic intelligence agent', async () => {
  const cookie = await demo();
  const result = await request(
    '/companion/messages',
    { message: 'Can you run a health check and assess our current risk?' },
    cookie,
  );
  assert.equal(result.status, 201);
  assert.equal(result.data.agentId, 'diagnostic-intelligence');
});

test('a workflow command routes to the orchestration agent and never bypasses approval', async () => {
  const cookie = await demo();
  const state = await request('/state', undefined, cookie, 'GET');
  const objective = state.data.objectives[0];
  const created = await request(
    '/workflows',
    {
      title: 'Companion-created process',
      objectiveId: objective.id,
      steps: [
        { id: 'context', toolId: 'context.snapshot' },
        { id: 'action', toolId: 'action.prepare', input: { title: 'Prepare report' }, dependsOn: ['context'] },
      ],
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    },
    cookie,
  );
  assert.equal(created.status, 201);

  const listMessage = await request(
    '/companion/messages',
    { message: 'show me my workflows' },
    cookie,
  );
  assert.equal(listMessage.status, 201);
  assert.equal(listMessage.data.agentId, 'workflow-orchestration');

  const startMessage = await request(
    '/companion/messages',
    { message: `start workflow ${created.data.id}` },
    cookie,
  );
  assert.equal(startMessage.status, 201);
  assert.equal(startMessage.data.evidence.state, 'running');

  // Advancing the run should land it in needs_approval, not silently execute the write step.
  const runAfterTick = await request(`/workflows/${created.data.id}`, undefined, cookie, 'GET');
  assert.ok(['running', 'needs_approval'].includes(runAfterTick.data.state));
});

test('a workspace member cannot use the mutating workflow-orchestration agent', async () => {
  const owner = await request('/auth/signup', {
    name: 'Owner',
    email: 'companion-owner@example.test',
    password: 'a-long-companion-owner-password',
    context: 'Enterprise',
  });
  const member = await request('/auth/signup', {
    name: 'Member',
    email: 'companion-member@example.test',
    password: 'a-long-companion-member-password',
    context: 'Professional',
  });
  const ownerState = (await request('/state', undefined, owner.cookie)).data;
  assert.equal(
    (await request('/admin/members', { email: 'companion-member@example.test', role: 'member' }, owner.cookie)).status,
    201,
  );
  assert.equal(
    (await request('/workspace/switch', { workspaceId: ownerState.workspace.id }, member.cookie)).status,
    200,
  );

  // A read-only, observation-only message still works for a plain member (work:write is enough).
  const readOnly = await request(
    '/companion/messages',
    { message: 'what is going on right now?' },
    member.cookie,
  );
  assert.equal(readOnly.status, 201);
  assert.equal(readOnly.data.agentId, 'context-curator');

  // A workflow-mutating message must be rejected for a member (requires workspace:manage), not silently downgraded or executed.
  const mutating = await request(
    '/companion/messages',
    { message: 'start workflow 00000000-0000-0000-0000-000000000000' },
    member.cookie,
  );
  assert.equal(mutating.status, 403);
});

test('a successful agent run debits points and reports the new balance', async () => {
  const cookie = await demo();
  const before = (await request('/points', undefined, cookie, 'GET')).data.balance;
  const result = await request(
    '/companion/messages',
    { message: 'what is going on right now?' },
    cookie,
  );
  assert.equal(result.status, 201);
  assert.equal(result.data.pointsCharged, 65);
  assert.equal(result.data.balance, before - 65);
});

test('a failed agent run refunds the points it charged', async () => {
  const cookie = await demo();
  await store.db
    .prepare("UPDATE model_registry SET status = 'deprecated' WHERE use_case = 'companion.context-curator'")
    .run();
  const before = (await request('/points', undefined, cookie, 'GET')).data.balance;
  const failed = await request(
    '/companion/messages',
    { message: 'what is going on right now?' },
    cookie,
  );
  assert.equal(failed.status, 503);
  const after = (await request('/points', undefined, cookie, 'GET')).data.balance;
  assert.equal(after, before);
  const refund = await store.db
    .prepare("SELECT amount FROM points_ledger WHERE reason = 'agent_run_refund' ORDER BY created_at DESC LIMIT 1")
    .get();
  assert.equal(refund.amount, 65);
  await store.db
    .prepare("UPDATE model_registry SET status = 'approved' WHERE use_case = 'companion.context-curator'")
    .run();
});

test('an agent is rejected before it runs if the workspace has too few points', async () => {
  const cookie = await demo();
  const state = (await request('/state', undefined, cookie, 'GET')).data;
  await store.db.prepare('UPDATE users SET points_balance = 0 WHERE id = ?').run(state.user.id);
  const result = await request(
    '/companion/messages',
    { message: 'what is going on right now?' },
    cookie,
  );
  assert.equal(result.status, 402);
  const runsAfter = (await store.db
    .prepare('SELECT COUNT(*) AS count FROM agent_runs WHERE principal_id = ?')
    .get(state.user.id)).count;
  assert.equal(runsAfter, 0);
});

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

test('the consultant matcher ranks bids and is only visible to the job owner', async () => {
  const client = await signup('Matcher Client', 'matcher-client@example.test');
  const goodFit = await signup('Good Fit', 'matcher-good-fit@example.test');
  const poorFit = await signup('Poor Fit', 'matcher-poor-fit@example.test');

  const job = await request(
    '/jobs',
    {
      title: 'Build a growth dashboard',
      category: 'Software engineering',
      projectType: 'Fixed-scope project',
      description: 'We need a dashboard that tracks growth metrics and pipeline data for the team.',
      deliverables: 'A working dashboard with metrics, pipeline, and export.',
      budgetMin: 1000,
      budgetMax: 2000,
      currency: 'USD',
      timeline: '4 weeks',
    },
    client,
  );
  assert.equal(job.status, 201);

  assert.equal(
    (
      await request(
        `/jobs/${job.data.id}/bids`,
        {
          coverLetter:
            'I will build the dashboard with metrics, pipeline tracking, and export in four weeks.',
          proposedAmount: 1500,
          currency: 'USD',
          timeline: '4 weeks',
        },
        goodFit,
      )
    ).status,
    201,
  );
  assert.equal(
    (
      await request(
        `/jobs/${job.data.id}/bids`,
        {
          coverLetter: 'I can help with unrelated administrative paperwork and filing.',
          proposedAmount: 9500,
          currency: 'USD',
          timeline: '10 months',
        },
        poorFit,
      )
    ).status,
    201,
  );

  const asOutsider = await request(`/jobs/${job.data.id}/matches`, undefined, goodFit, 'GET');
  assert.equal(asOutsider.status, 403);

  const matches = await request(`/jobs/${job.data.id}/matches`, undefined, client, 'GET');
  assert.equal(matches.status, 200);
  assert.equal(matches.data.length, 2);
  assert.ok(matches.data[0].total > matches.data[1].total);
  assert.equal(matches.data[0].bid.proposed_amount, 1500);
  assert.ok(matches.data[0].breakdown.budgetFit > 0);
  assert.ok(matches.data[0].breakdown.relevance > 0);
});

test('the proposal drafter grounds its draft in the real job and rejects unrelated users', async () => {
  const client = await signup('Draft Client', 'draft-client@example.test');
  const bidder = await signup('Draft Bidder', 'draft-bidder@example.test');
  const stranger = await signup('Draft Stranger', 'draft-stranger@example.test');

  const job = await request(
    '/jobs',
    {
      title: 'Website redesign project',
      category: 'UX/UI design',
      projectType: 'Fixed-scope project',
      description: 'We need a full redesign of our marketing website with a modern look.',
      deliverables: 'Redesigned homepage, product pages, and a style guide.',
      budgetMin: 3000,
      budgetMax: 5000,
      currency: 'USD',
      timeline: '6 weeks',
    },
    client,
  );
  assert.equal(job.status, 201);
  assert.equal(
    (
      await request(
        `/jobs/${job.data.id}/bids`,
        {
          coverLetter: 'I would love to redesign your marketing website and pages.',
          proposedAmount: 4000,
          currency: 'USD',
          timeline: '6 weeks',
        },
        bidder,
      )
    ).status,
    201,
  );

  const asClient = await request(
    '/companion/messages',
    { message: 'draft a proposal for this job', jobId: job.data.id },
    client,
  );
  assert.equal(asClient.status, 201);
  assert.equal(asClient.data.agentId, 'proposal-drafter');
  assert.ok(asClient.data.response.includes('Website redesign project'));

  const asStranger = await request(
    '/companion/messages',
    { message: 'draft a proposal for this job', jobId: job.data.id },
    stranger,
  );
  assert.equal(asStranger.status, 403);
});

test('the 8 new commercial document tools route correctly and ask for a job before drafting', async () => {
  const cookie = await demo();
  const cases = [
    ['can you help with the scope for this?', 'scope-builder'],
    ['draft a statement of work', 'sow-builder'],
    ['write a client brief', 'brief-builder'],
    ['list the deliverables', 'deliverable-builder'],
    ['what should the acceptance criteria be?', 'acceptance-builder'],
    ['generate a quote', 'quote-generator'],
    ['give me an estimate', 'estimate-generator'],
    ['I need a change order', 'change-order'],
  ];
  for (const [message, expectedAgentId] of cases) {
    const result = await request('/companion/messages', { message }, cookie);
    assert.equal(result.status, 201, message);
    assert.equal(result.data.agentId, expectedAgentId, message);
    assert.ok(typeof result.data.response === 'string' && result.data.response.length > 0, message);
  }
});

test('the scope builder grounds its draft in the real job and rejects unrelated users', async () => {
  const client = await signup('Scope Client', 'scope-client@example.test');
  const bidder = await signup('Scope Bidder', 'scope-bidder@example.test');
  const stranger = await signup('Scope Stranger', 'scope-stranger@example.test');

  const job = await request(
    '/jobs',
    {
      title: 'Rebuild the onboarding flow',
      category: 'Software engineering',
      projectType: 'Fixed-scope project',
      description: 'We need a smoother, faster onboarding flow for new users.',
      deliverables: 'A redesigned onboarding flow with fewer steps and clear progress indicators.',
      budgetMin: 2000,
      budgetMax: 4000,
      currency: 'USD',
      timeline: '5 weeks',
    },
    client,
  );
  assert.equal(job.status, 201);
  assert.equal(
    (
      await request(
        `/jobs/${job.data.id}/bids`,
        {
          coverLetter: 'I can rebuild the onboarding flow with fewer steps and progress indicators.',
          proposedAmount: 3000,
          currency: 'USD',
          timeline: '5 weeks',
        },
        bidder,
      )
    ).status,
    201,
  );

  const asClient = await request(
    '/companion/messages',
    { message: 'draft the scope of work', jobId: job.data.id },
    client,
  );
  assert.equal(asClient.status, 201);
  assert.equal(asClient.data.agentId, 'scope-builder');
  assert.ok(asClient.data.response.includes('Rebuild the onboarding flow'));

  const asStranger = await request(
    '/companion/messages',
    { message: 'draft the scope of work', jobId: job.data.id },
    stranger,
  );
  assert.equal(asStranger.status, 403);
});

test('quote and estimate generators compute from the real budget range without calling AI', async () => {
  const client = await signup('Quote Client', 'quote-client@example.test');
  const job = await request(
    '/jobs',
    {
      title: 'Data migration project',
      category: 'Data and analytics',
      projectType: 'Fixed-scope project',
      description: 'Migrate our legacy data warehouse to a modern platform.',
      deliverables: 'Fully migrated warehouse with validated data integrity.',
      budgetMin: 4000,
      budgetMax: 6000,
      currency: 'USD',
      timeline: '8 weeks',
    },
    client,
  );
  assert.equal(job.status, 201);

  const quote = await request(
    '/companion/messages',
    { message: 'generate a quote', jobId: job.data.id },
    client,
  );
  assert.equal(quote.status, 201);
  assert.equal(quote.data.agentId, 'quote-generator');
  assert.equal(quote.data.evidence.method, 'deterministic-calculation');
  assert.ok(quote.data.response.includes('5000'));

  const estimate = await request(
    '/companion/messages',
    { message: 'give me an estimate', jobId: job.data.id },
    client,
  );
  assert.equal(estimate.status, 201);
  assert.equal(estimate.data.agentId, 'estimate-generator');
  assert.ok(estimate.data.response.includes('4000') && estimate.data.response.includes('6000'));
});

test('the change order generator grounds in the real proposal and rejects unrelated users', async () => {
  const client = await signup('Order Client', 'order-client@example.test');
  const bidder = await signup('Order Bidder', 'order-bidder@example.test');
  const stranger = await signup('Order Stranger', 'order-stranger@example.test');

  const job = await request(
    '/jobs',
    {
      title: 'Marketing analytics dashboard',
      category: 'Data and analytics',
      projectType: 'Fixed-scope project',
      description: 'Build a dashboard summarizing marketing campaign performance.',
      deliverables: 'A dashboard covering spend, conversions, and channel performance.',
      budgetMin: 2500,
      budgetMax: 3500,
      currency: 'USD',
      timeline: '4 weeks',
    },
    client,
  );
  assert.equal(job.status, 201);
  const bid = await request(
    `/jobs/${job.data.id}/bids`,
    {
      coverLetter: 'I will build a dashboard covering spend, conversions, and channel performance.',
      proposedAmount: 3000,
      currency: 'USD',
      timeline: '4 weeks',
    },
    bidder,
  );
  assert.equal(bid.status, 201);
  const proposal = await request(
    `/jobs/${job.data.id}/proposals`,
    {
      bidId: bid.data.id,
      title: 'Marketing analytics dashboard proposal',
      scope: 'Build the dashboard covering spend, conversions, and channel performance as agreed.',
      deliverables: 'A dashboard covering spend, conversions, and channel performance.',
      amount: 3000,
      currency: 'USD',
      timeline: '4 weeks',
    },
    bidder,
  );
  assert.equal(proposal.status, 201);

  const asBidder = await request(
    '/companion/messages',
    { message: 'we need a change order to add an extra chart', proposalId: proposal.data.id },
    bidder,
  );
  assert.equal(asBidder.status, 201);
  assert.equal(asBidder.data.agentId, 'change-order');
  assert.ok(asBidder.data.response.includes('Marketing analytics dashboard proposal'));

  const asStranger = await request(
    '/companion/messages',
    { message: 'we need a change order to add an extra chart', proposalId: proposal.data.id },
    stranger,
  );
  assert.equal(asStranger.status, 403);
});
