import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createFundedTestApp as createApp } from './support/funded-app.mjs';
import { markDatabaseError } from '../server/databaseErrors.mjs';
let app, store, server, base;
before(async () => {
  ({ app, store } = await createApp({
    filename: ':memory:',
    rateLimits: {
      api: { max: 1000 },
      auth: { max: 1000 },
      mutation: { max: 1000 },
    },
    ecosystemAdminEmails: ['ecosystem-admin@example.test'],
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
async function request(path, body, cookie, method = 'POST', extra = {}) {
  const response = await fetch(`${base}/api${path}`, {
    method: body === undefined ? 'GET' : method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(cookie ? { Cookie: cookie } : {}),
      ...extra,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get('set-cookie')?.split(';')[0],
    headers: response.headers,
  };
}
async function demo() {
  const result = await request('/auth/demo', {});
  assert.equal(result.status, 201);
  return result.cookie;
}
test('private APIs reject unauthenticated requests', async () => {
  assert.equal((await request('/state')).status, 401);
  assert.equal((await request('/objectives', { title: 'unauthorized' })).status, 401);
});

test('database outages return 503 while liveness remains healthy', async () => {
  const prepare = store.db.prepare;
  store.db.prepare = () => ({ get: async () => { throw markDatabaseError(new Error('Connection terminated due to connection timeout')); } });
  try {
    const failed = await request('/state', undefined, 'lamid_session=unavailable');
    assert.equal(failed.status, 503);
    assert.equal(failed.data.code, 'DATABASE_UNAVAILABLE');
    assert.equal(failed.headers.get('retry-after'), '3');
    assert.ok(failed.data.requestId);
    assert.equal((await request('/health')).status, 200);
    assert.equal((await request('/ready')).status, 503);
  } finally { store.db.prepare = prepare; }
});
test('isolated sample workspaces cannot read or change each other’s work', async () => {
  const first = await demo();
  const second = await demo();
  const a = (await request('/state', undefined, first)).data;
  const b = (await request('/state', undefined, second)).data;
  assert.notEqual(a.workspace.id, b.workspace.id);
  assert.equal(a.objectives.length, 2);
  assert.equal(b.objectives.length, 2);
  assert.ok(a.objectives.every((x) => !b.objectives.some((y) => x.id === y.id)));
  const action = a.actions.find((x) => x.status === 'Planned');
  assert.equal(
    (
      await request(
        `/actions/${action.id}`,
        { version: action.version, status: 'In progress' },
        second,
        'PATCH',
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await request(
        '/actions',
        { title: 'foreign objective', objectiveId: a.objectives[0].id, owner: 'B' },
        second,
      )
    ).status,
    404,
  );
});
test('review cannot be bypassed and stale approvals fail atomically', async () => {
  const cookie = await demo();
  const initial = (await request('/state', undefined, cookie)).data;
  const objectiveId = initial.objectives[0].id;
  const created = await request(
    '/actions',
    { title: 'Review a consequential draft', objectiveId, owner: 'Owner', requiresApproval: true },
    cookie,
  );
  assert.equal(created.status, 201);
  const id = created.data.id;
  assert.equal(
    (
      await request(
        `/actions/${id}`,
        { version: 1, status: 'Done', decision: 'approve' },
        cookie,
        'PATCH',
      )
    ).status,
    400,
  );
  assert.equal(
    (await request(`/actions/${id}`, { version: 1, status: 'In progress' }, cookie, 'PATCH'))
      .status,
    200,
  );
  assert.equal(
    (await request(`/actions/${id}`, { version: 2, status: 'Done' }, cookie, 'PATCH')).status,
    403,
  );
  assert.equal(
    (await request(`/actions/${id}`, { version: 2, status: 'Needs review' }, cookie, 'PATCH'))
      .status,
    200,
  );
  assert.equal(
    (
      await request(
        `/actions/${id}`,
        { version: 2, status: 'Done', decision: 'approve' },
        cookie,
        'PATCH',
      )
    ).status,
    409,
  );
  assert.equal(
    (await request(`/actions/${id}`, { version: 3, status: 'Done' }, cookie, 'PATCH')).status,
    403,
  );
  assert.equal(
    (
      await request(
        `/actions/${id}`,
        { version: 3, status: 'Done', decision: 'approve' },
        cookie,
        'PATCH',
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request(
        `/actions/${id}`,
        { version: 3, status: 'Done', decision: 'approve' },
        cookie,
        'PATCH',
      )
    ).status,
    409,
  );
  const after = (await request('/state', undefined, cookie)).data;
  assert.equal(after.actions.find((x) => x.id === id).status, 'Done');
  const approvals = after.audit.filter((x) => x.objectId === id && x.action === 'Action approved');
  assert.equal(approvals.length, 1);
  assert.match(approvals[0].detail, /version 3/);
});
test('state transitions support pause and resume while preserving completed history', async () => {
  const cookie = await demo();
  const state = (await request('/state', undefined, cookie)).data;
  const action = state.actions.find((x) => x.status === 'Planned');
  assert.equal(
    (await request(`/actions/${action.id}`, { version: 1, status: 'Paused' }, cookie, 'PATCH'))
      .status,
    200,
  );
  assert.equal(
    (await request(`/actions/${action.id}`, { version: 2, status: 'Planned' }, cookie, 'PATCH'))
      .status,
    200,
  );
  const done = state.actions.find((x) => x.status === 'Done');
  assert.equal(
    (await request(`/actions/${done.id}`, { version: 1, status: 'Planned' }, cookie, 'PATCH'))
      .status,
    400,
  );
});
test('signup, session, logout, login and data persistence', async () => {
  const credentials = {
    name: 'Taylor',
    email: 'taylor@example.test',
    password: 'a-long-test-password',
    context: 'Professional',
  };
  const signed = await request('/auth/signup', credentials);
  assert.equal(signed.status, 201);
  assert.match(signed.headers.get('set-cookie'), /HttpOnly/i);
  assert.match(signed.headers.get('set-cookie'), /SameSite=Lax/i);
  let cookie = signed.cookie;
  const objective = await request(
    '/objectives',
    {
      title: 'A lasting objective',
      context: 'Professional',
      priority: 'High',
      success: 'An observable outcome',
      targetDate: '2026-10-01',
    },
    cookie,
  );
  assert.equal(objective.status, 201);
  assert.equal((await request('/auth/logout', {}, cookie)).status, 200);
  assert.equal((await request('/state', undefined, cookie)).status, 401);
  const login = await request('/auth/login', {
    email: credentials.email,
    password: credentials.password,
  });
  assert.equal(login.status, 200);
  cookie = login.cookie;
  const state = (await request('/state', undefined, cookie)).data;
  assert.equal(state.objectives.length, 1);
  assert.equal(state.objectives[0].id, objective.data.id);
  assert.equal(state.user.demo, false);
  const row = await store.db.prepare('SELECT password FROM users WHERE email = ?').get(credentials.email);
  assert.notEqual(row.password, credentials.password);
  assert.equal(
    (await request('/auth/login', { email: credentials.email, password: 'wrong-password' })).status,
    401,
  );
});
test('only an ecosystem administrator can permanently delete an account', async () => {
  const credentials = {
    name: 'Delete Me',
    email: 'delete-me@example.test',
    password: 'a-long-delete-password',
    context: 'Professional',
  };
  const signed = await request('/auth/signup', credentials);
  assert.equal(signed.status, 201);
  assert.equal(
    (
      await request(
        '/account',
        { confirmation: 'DELETE USER ACCOUNT', password: credentials.password },
        signed.cookie,
        'DELETE',
      )
    ).status,
    404,
  );
  const target = (await request('/state', undefined, signed.cookie)).data;
  const admin = await request('/auth/signup', {
    name: 'Ecosystem Admin',
    email: 'ecosystem-admin@example.test',
    password: 'a-long-ecosystem-password',
    context: 'Enterprise',
  });
  assert.equal(admin.status, 201);
  assert.equal(
    (
      await request(
        `/admin/users/${target.user.id}`,
        { confirmation: 'DELETE USER ACCOUNT', password: 'a-long-ecosystem-password' },
        admin.cookie,
        'DELETE',
      )
    ).status,
    200,
  );
  assert.equal((await request('/state', undefined, signed.cookie)).status, 401);
  assert.equal(
    await store.db.prepare('SELECT 1 FROM users WHERE email = ?').get(credentials.email),
    undefined,
  );
});
test('enterprise administrators disable workspace membership without disabling accounts', async () => {
  const owner = await request('/auth/signup', {
    name: 'Enterprise Owner',
    email: 'enterprise-owner@example.test',
    password: 'a-long-enterprise-owner-password',
    context: 'Enterprise',
  });
  const member = await request('/auth/signup', {
    name: 'Enterprise Member',
    email: 'enterprise-member@example.test',
    password: 'a-long-enterprise-member-password',
    context: 'Professional',
  });
  const ownerState = (await request('/state', undefined, owner.cookie)).data;
  const memberState = (await request('/state', undefined, member.cookie)).data;
  assert.equal(ownerState.workspace.tier, 'enterprise');
  assert.equal(ownerState.workspace.member_limit, 200);
  assert.equal(
    (
      await request(
        '/admin/members',
        { email: 'enterprise-member@example.test', role: 'member' },
        owner.cookie,
      )
    ).status,
    201,
  );
  const workspaces = await request('/workspaces', undefined, member.cookie);
  assert.equal(workspaces.status, 200);
  assert.ok(workspaces.data.some((workspace) => workspace.id === ownerState.workspace.id));
  assert.equal(
    (await request('/workspace/switch', { workspaceId: ownerState.workspace.id }, member.cookie))
      .status,
    200,
  );
  assert.equal(
    (
      await request(
        `/admin/members/${memberState.user.id}`,
        { status: 'disabled' },
        owner.cookie,
        'PATCH',
      )
    ).status,
    200,
  );
  assert.equal(
    (await request('/state', undefined, member.cookie)).data.workspace.id,
    memberState.workspace.id,
  );
  assert.equal(
    (
      await request('/auth/login', {
        email: 'enterprise-member@example.test',
        password: 'a-long-enterprise-member-password',
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request(
        `/admin/members/${ownerState.user.id}`,
        { status: 'disabled' },
        owner.cookie,
        'PATCH',
      )
    ).status,
    404,
  );
});
test('points are charged once for job posts and bids', async () => {
  const client = await request('/auth/signup', {
    name: 'Points Client',
    email: 'points-client@example.test',
    password: 'a-long-points-client-password',
    context: 'Professional',
  });
  const freelancer = await request('/auth/signup', {
    name: 'Points Freelancer',
    email: 'points-freelancer@example.test',
    password: 'a-long-points-freelancer-password',
    context: 'Professional',
  });
  const post = await request(
    '/jobs',
    {
      title: 'Points test job',
      category: 'Research',
      projectType: 'Research assignment',
      description: 'Conduct a structured research assignment and summarize the findings clearly.',
      deliverables: 'Research summary',
      budgetMin: 100,
      budgetMax: 200,
      currency: 'USD',
      timeline: 'Two weeks',
    },
    client.cookie,
  );
  assert.equal(post.status, 201);
  assert.equal(
    (await store.db
      .prepare('SELECT points_balance FROM users WHERE email = ?')
      .get('points-client@example.test')).points_balance,
    99960,
  );
  const bid = await request(
    `/jobs/${post.data.id}/bids`,
    {
      coverLetter: 'I can conduct this research assignment with a clear evidence trail.',
      proposedAmount: 150,
      currency: 'USD',
      timeline: 'Two weeks',
    },
    freelancer.cookie,
  );
  assert.equal(bid.status, 201);
  assert.equal(
    (await store.db
      .prepare('SELECT points_balance FROM users WHERE email = ?')
      .get('points-freelancer@example.test')).points_balance,
    99980,
  );
});
test('job posts support client and freelancer proposal drafts', async () => {
  const client = await request('/auth/signup', {
    name: 'Proposal Client',
    email: 'proposal-client@example.test',
    password: 'a-long-proposal-client-password',
    context: 'Professional',
  });
  const freelancer = await request('/auth/signup', {
    name: 'Proposal Freelancer',
    email: 'proposal-freelancer@example.test',
    password: 'a-long-proposal-freelancer-password',
    context: 'Professional',
  });
  const job = await request(
    '/jobs',
    {
      title: 'Proposal test assessment',
      category: 'Strategy and consulting',
      projectType: 'Audit or assessment',
      description: 'Assess the operating model and produce an actionable roadmap for the client.',
      deliverables: 'Assessment and roadmap',
      budgetMin: 1000,
      budgetMax: 2000,
      currency: 'USD',
      timeline: 'Three weeks',
    },
    client.cookie,
  );
  const bid = await request(
    `/jobs/${job.data.id}/bids`,
    {
      coverLetter: 'I have relevant assessment experience and a clear delivery approach.',
      proposedAmount: 1500,
      currency: 'USD',
      timeline: 'Three weeks',
    },
    freelancer.cookie,
  );
  const clientDraft = await request(
    `/jobs/${job.data.id}/proposals`,
    {
      bidId: bid.data.id,
      title: 'Client proposal draft',
      scope: 'Review evidence, interview stakeholders, and produce a decision-ready roadmap.',
      deliverables: 'Assessment; roadmap; readout',
      amount: 1500,
      currency: 'USD',
      timeline: 'Three weeks',
    },
    client.cookie,
  );
  assert.equal(clientDraft.status, 201);
  assert.equal(clientDraft.data.sourceType, 'client');
  const freelancerDraft = await request(
    `/jobs/${job.data.id}/proposals`,
    {
      bidId: bid.data.id,
      title: 'Freelancer proposal draft',
      scope: 'Run a structured discovery process with weekly checkpoints and evidence review.',
      deliverables: 'Report; roadmap; presentation',
      amount: 1500,
      currency: 'USD',
      timeline: 'Three weeks',
    },
    freelancer.cookie,
  );
  assert.equal(freelancerDraft.status, 201);
  assert.equal(freelancerDraft.data.sourceType, 'freelancer');
  const ownDrafts = await request(`/jobs/${job.data.id}/proposals`, undefined, freelancer.cookie);
  assert.equal(ownDrafts.status, 200);
  assert.deepEqual(
    ownDrafts.data.map((draft) => draft.id),
    [freelancerDraft.data.id],
  );
  assert.equal(
    (await request(`/jobs/${job.data.id}/proposals`, undefined, client.cookie)).data.length,
    2,
  );
  assert.equal(
    (await request(`/jobs/${job.data.id}/proposals`, undefined, await demo())).status,
    403,
  );
});
test('password recovery is privacy-safe, single-use, and revokes sessions', async () => {
  const credentials = {
    name: 'Recovery User',
    email: 'recovery@example.test',
    password: 'a-long-recovery-password',
    context: 'Professional',
  };
  const signed = await request('/auth/signup', credentials);
  assert.equal(signed.status, 201);
  const unknown = await request('/auth/request-recovery', { email: 'unknown@example.test' });
  assert.deepEqual(unknown.data, { ok: true });
  const requested = await request('/auth/request-recovery', { email: credentials.email });
  assert.equal(requested.status, 200);
  assert.match(requested.data.recoveryToken, /^[a-f0-9]{64}$/);
  const reset = await request('/auth/reset-password', {
    token: requested.data.recoveryToken,
    password: 'a-new-recovery-password',
  });
  assert.equal(reset.status, 200);
  assert.equal((await request('/state', undefined, signed.cookie)).status, 401);
  assert.equal(
    (
      await request('/auth/login', {
        email: credentials.email,
        password: 'a-new-recovery-password',
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request('/auth/reset-password', {
        token: requested.data.recoveryToken,
        password: 'another-recovery-password',
      })
    ).status,
    400,
  );
});
test('account verification uses expiring single-use tokens', async () => {
  const credentials = {
    name: 'Verify User',
    email: 'verify@example.test',
    password: 'a-long-verification-password',
    context: 'Professional',
  };
  const signed = await request('/auth/signup', credentials);
  assert.equal(signed.status, 201);
  assert.match(signed.data.verificationToken, /^[a-f0-9]{64}$/);
  assert.equal(
    (await request('/auth/verify', { token: signed.data.verificationToken })).status,
    200,
  );
  assert.ok(
    (await store.db.prepare('SELECT verified_at FROM users WHERE email = ?').get(credentials.email))
      .verified_at,
  );
  assert.equal(
    (await request('/auth/verify', { token: signed.data.verificationToken })).status,
    400,
  );
  const resend = await request('/auth/resend-verification', { email: credentials.email });
  assert.equal(resend.data.ok, true);
  assert.match(resend.data.challengeId, /^[a-f0-9-]{36}$/);
});
test('strict validation rejects invalid dates, unknown fields, and initial completion', async () => {
  const cookie = await demo();
  const state = (await request('/state', undefined, cookie)).data;
  assert.equal(
    (
      await request(
        '/objectives',
        { title: 'Invalid date', context: 'Founder', priority: 'High', targetDate: '2026-02-31' },
        cookie,
      )
    ).status,
    400,
  );
  assert.equal(
    (await request('/objectives', { title: ' ', context: 'Founder', priority: 'High' }, cookie))
      .status,
    400,
  );
  assert.equal(
    (
      await request(
        '/workspace',
        { name: 'valid', context: 'Founder', userId: 'other' },
        cookie,
        'PATCH',
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        '/actions',
        { title: 'Bypass', objectiveId: state.objectives[0].id, owner: 'Owner', status: 'Done' },
        cookie,
      )
    ).status,
    400,
  );
});
test('cross-origin mutations are rejected', async () => {
  assert.equal(
    (await request('/auth/demo', {}, undefined, 'POST', { Origin: 'https://untrusted.example' }))
      .status,
    403,
  );
});
test('rate limits block bursts and return retry timing', async () => {
  const limited = await createApp({ filename: ':memory:', rateLimits: { api: { max: 2 } } });
  const limitedServer = await new Promise((resolve) => {
    const listening = limited.app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const limitedBase = `http://127.0.0.1:${limitedServer.address().port}`;
  const limitedRequest = () => fetch(`${limitedBase}/api/health`);
  try {
    assert.equal((await limitedRequest()).status, 200);
    assert.equal((await limitedRequest()).status, 200);
    const blocked = await limitedRequest();
    assert.equal(blocked.status, 429);
    assert.match(blocked.headers.get('retry-after'), /^\d+$/);
  } finally {
    await new Promise((resolve) => limitedServer.close(resolve));
    limited.store.db.close();
  }
});
test('guided plans save an objective and first action together', async () => {
  const cookie = await demo();
  const before = (await request('/state', undefined, cookie)).data;
  const rejected = await request(
    '/plans',
    {
      objective: { title: 'New plan', context: 'Founder', priority: 'Medium' },
      nextAction: 'x'.repeat(501),
    },
    cookie,
  );
  assert.equal(rejected.status, 400);
  assert.equal(
    (await request('/state', undefined, cookie)).data.objectives.length,
    before.objectives.length,
  );
  const saved = await request(
    '/plans',
    {
      objective: { title: 'New plan', context: 'Founder', priority: 'Medium' },
      nextAction: 'Validate the first assumption',
    },
    cookie,
  );
  assert.equal(saved.status, 201);
  assert.equal(saved.data.action.objectiveId, saved.data.objective.id);
  const state = (await request('/state', undefined, cookie)).data;
  assert.equal(state.objectives.length, before.objectives.length + 1);
  assert.equal(state.actions.length, before.actions.length + 1);
});
test('goal pathways preview without writes and save selected steps exactly once', async () => {
  const cookie = await demo();
  const before = (await request('/state', undefined, cookie)).data;
  const objective = { title: 'Grow a small business', context: 'Founder', priority: 'Medium', success: 'Three customers', constraints: 'One afternoon per week' };
  assert.equal((await request('/plans/preview', { objective })).status, 401);
  const preview = await request('/plans/preview', { objective }, cookie);
  assert.equal(preview.status, 200);
  assert.equal(preview.data.steps.length, 5);
  const afterPreview = (await request('/state', undefined, cookie)).data;
  assert.equal(afterPreview.objectives.length, before.objectives.length);
  assert.equal(afterPreview.actions.length, before.actions.length);
  for (const pathway of [[{ title: '   ' }], Array(11).fill({ title: 'Too many' }), [{ title: 'Valid', notes: 'x'.repeat(5001) }]]) {
    assert.equal((await request('/plans', { objective, pathway }, cookie)).status, 400);
  }
  const input = { objective, pathway: [preview.data.steps[0], { title: 'Interview two customers', notes: 'Ask about their current workaround.' }] };
  const headers = { 'Idempotency-Key': 'pathway-save-retry' };
  const saved = await request('/plans', input, cookie, 'POST', headers);
  assert.equal(saved.status, 201);
  const replay = await request('/plans', input, cookie, 'POST', headers);
  assert.deepEqual(replay.data, saved.data);
  assert.equal(saved.data.actions.length, 2);
  assert.deepEqual(saved.data.actions.map(action => action.pathwayOrder), [1, 2]);
  assert.ok(saved.data.actions.every(action => action.objectiveId === saved.data.objective.id && action.status === 'Planned'));
  const persisted = (await request('/state', undefined, cookie)).data;
  assert.equal(persisted.objectives.length, before.objectives.length + 1);
  assert.equal(persisted.actions.length, before.actions.length + 2);
  const foreign = (await request('/state', undefined, await demo())).data;
  assert.ok(!foreign.actions.some(action => action.objectiveId === saved.data.objective.id));
  const action = saved.data.actions[0];
  const started = await request(`/actions/${action.id}`, { version: action.version, status: 'In progress' }, cookie, 'PATCH');
  assert.equal(started.status, 200);
  const completed = await request(`/actions/${action.id}`, { version: started.data.version, status: 'Done' }, cookie, 'PATCH');
  assert.equal(completed.status, 200);
  assert.equal(completed.data.pathwayOrder, 1);
});

test('goal deletion requires confirmation, isolates workspaces and removes linked actions', async () => {
  const cookie = await demo();
  const other = await demo();
  const saved = await request('/plans', { objective: { title: 'Delete this goal', context: 'Individual', priority: 'Medium' }, pathway: [{ title: 'Linked action' }] }, cookie);
  const path = `/objectives/${saved.data.objective.id}`;
  assert.equal((await request(path, { version: 1, confirm: true }, other, 'DELETE')).status, 404);
  assert.equal((await request(path, { version: 1 }, cookie, 'DELETE')).status, 400);
  assert.equal((await request(path, { version: 2, confirm: true }, cookie, 'DELETE')).status, 409);
  const workflow = await request('/workflows', { title: 'Unfinished goal work', objectiveId: saved.data.objective.id, expiresAt: new Date(Date.now() + 86400000).toISOString(), steps: [{ id: 'inspect', toolId: 'context.snapshot' }] }, cookie);
  assert.equal(workflow.status, 201);
  assert.equal((await request(path, { version: 1, confirm: true }, cookie, 'DELETE')).status, 409);
  assert.equal((await request(`/workflows/${workflow.data.id}`, { version: workflow.data.version, command: 'cancel' }, cookie, 'PATCH')).status, 200);
  assert.equal((await request(path, { version: 1, confirm: true }, cookie, 'DELETE')).status, 200);
  const state = (await request('/state', undefined, cookie)).data;
  assert.ok(!state.objectives.some(goal => goal.id === saved.data.objective.id));
  assert.ok(!state.actions.some(action => action.objectiveId === saved.data.objective.id));
  assert.equal((await request(`/actions/${saved.data.actions[0].id}`, { version: 1, status: 'In progress' }, cookie, 'PATCH')).status, 404);
  assert.equal((await request('/actions', { title: 'Cannot revive', objectiveId: saved.data.objective.id, owner: 'Owner' }, cookie)).status, 404);
});

test('objective revisions are isolated, versioned, and cannot conceal unfinished actions', async () => {
  const cookie = await demo();
  const other = await demo();
  const state = (await request('/state', undefined, cookie)).data;
  const objective = state.objectives[0];
  assert.equal(
    (
      await request(
        `/objectives/${objective.id}`,
        { version: 1, title: 'Foreign edit' },
        other,
        'PATCH',
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await request(
        `/objectives/${objective.id}`,
        { version: 1, status: 'Complete' },
        cookie,
        'PATCH',
      )
    ).status,
    409,
  );
  const updated = await request(
    `/objectives/${objective.id}`,
    { version: 1, title: 'A clearer objective', status: 'Paused' },
    cookie,
    'PATCH',
  );
  assert.equal(updated.status, 200);
  assert.equal(updated.data.version, 2);
  assert.equal(updated.data.description, objective.description);
  assert.equal(
    (
      await request(
        `/objectives/${objective.id}`,
        { version: 1, title: 'Stale edit' },
        cookie,
        'PATCH',
      )
    ).status,
    409,
  );
});
test('reflections and exports are workspace scoped', async () => {
  const cookie = await demo();
  const other = await demo();
  assert.equal(
    (
      await request(
        '/reviews',
        {
          progressed: 'Validated the offer',
          learned: 'Keep it focused',
          next: 'Test the next assumption',
        },
        cookie,
      )
    ).status,
    201,
  );
  const exported = await request('/export', undefined, cookie);
  assert.equal(exported.data.reviews.length, 1);
  assert.equal(exported.data.reviews[0].next, 'Test the next assumption');
  assert.ok(exported.data.exportedAt);
  assert.equal((await request('/export', undefined, other)).data.reviews.length, 0);
  assert.equal(exported.headers.get('cache-control'), 'no-store');
});
