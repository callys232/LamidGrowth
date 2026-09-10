import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/app/app.mjs';

async function fixture(t, options = {}) {
  const { app, store } = createApp({
    filename: ':memory:',
    ecosystemAdminEmails: ['admin@example.test'],
    rateLimits: { api: { max: 10000 }, auth: { max: 10000 }, mutation: { max: 10000 } },
    ...options,
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    store.db.close();
  });
  async function request(path, body, cookie, method = 'POST', headers = {}) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, {
      method: body === undefined ? 'GET' : method,
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: response.status,
      data: await response.json(),
      cookie: response.headers.get('set-cookie')?.split(';')[0],
    };
  }
  async function signup(email, context = 'Professional') {
    const result = await request('/auth/signup', {
      name: email.split('@')[0],
      email,
      context,
      password: 'a-long-test-password',
    });
    assert.equal(result.status, 201);
    return { cookie: result.cookie, ...(await request('/state', undefined, result.cookie)).data };
  }
  return { request, signup, store };
}
const jobInput = {
  title: 'Research project',
  category: 'Strategy and consulting',
  projectType: 'Fixed-scope project',
  description: 'Research the project requirements and document the resulting scope.',
  deliverables: 'A scoped report',
  budgetMin: 10,
  budgetMax: 100,
  currency: 'USD',
  timeline: 'One week',
};
const bidInput = {
  coverLetter: 'I can research and deliver the complete report.',
  proposedAmount: 80,
  currency: 'USD',
  timeline: 'One week',
};
const proposalInput = {
  title: 'Research scope',
  scope: 'Research and write the full scoped report.',
  deliverables: 'A report',
  amount: 80,
  currency: 'USD',
  timeline: 'One week',
};

test('member permissions and suspension stay inside the selected enterprise', async (t) => {
  const { request, signup, store } = await fixture(t);
  const one = await signup('one@example.test', 'Enterprise');
  const two = await signup('two@example.test', 'Enterprise');
  const member = await signup('member@example.test');
  for (const owner of [one, two])
    assert.equal(
      (await request('/admin/members', { email: member.user.email }, owner.cookie)).status,
      201,
    );
  await request('/workspace/switch', { workspaceId: one.workspace.id }, member.cookie);
  assert.equal(
    (await request('/workspace', { name: 'Not allowed', context: 'Team' }, member.cookie, 'PATCH'))
      .status,
    403,
  );
  assert.equal((await request('/export', undefined, member.cookie)).status, 403);
  const objective = await request(
    '/objectives',
    { title: 'Shared work', context: 'Team', priority: 'Medium' },
    member.cookie,
  );
  assert.equal(objective.status, 201);
  const action = await request(
    '/actions',
    {
      title: 'Prepare work',
      objectiveId: objective.data.id,
      owner: 'Member',
      requiresApproval: true,
    },
    member.cookie,
  );
  const actionPath = `/actions/${action.data.id}`;
  await request(actionPath, { version: 1, status: 'In progress' }, member.cookie, 'PATCH');
  await request(actionPath, { version: 2, status: 'Needs review' }, member.cookie, 'PATCH');
  assert.equal(
    (
      await request(
        actionPath,
        { version: 3, status: 'Done', decision: 'approve' },
        member.cookie,
        'PATCH',
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(
        actionPath,
        { version: 3, status: 'Done', decision: 'approve' },
        one.cookie,
        'PATCH',
      )
    ).status,
    200,
  );
  await request(`/admin/members/${member.user.id}`, { status: 'disabled' }, one.cookie, 'PATCH');
  assert.equal(
    store.db.prepare('SELECT disabled_at FROM users WHERE id = ?').get(member.user.id).disabled_at,
    null,
  );
  assert.equal(
    (await request('/state', undefined, member.cookie)).data.workspace.id,
    member.workspace.id,
  );
  assert.equal(
    (await request('/workspace/switch', { workspaceId: one.workspace.id }, member.cookie)).status,
    403,
  );
  assert.equal(
    (await request('/workspace/switch', { workspaceId: two.workspace.id }, member.cookie)).status,
    200,
  );
  assert.equal(
    (await request('/auth/login', { email: member.user.email, password: 'a-long-test-password' }))
      .status,
    200,
  );
});

test('completed objectives and mismatched workspace requests reject new work', async (t) => {
  const { request, signup } = await fixture(t);
  const account = await signup('owner@example.test');
  const input = { title: 'Outcome', context: 'Professional', priority: 'Medium' };
  assert.equal(
    (
      await request(
        '/plans',
        { objective: { ...input, status: 'Complete' }, nextAction: 'Unfinished' },
        account.cookie,
      )
    ).status,
    400,
  );
  const objective = await request('/objectives', input, account.cookie);
  await request(
    `/objectives/${objective.data.id}`,
    { version: 1, status: 'Complete' },
    account.cookie,
    'PATCH',
  );
  assert.equal(
    (
      await request(
        '/actions',
        { title: 'Late child', objectiveId: objective.data.id, owner: 'Owner' },
        account.cookie,
      )
    ).status,
    409,
  );
  assert.equal(
    (await request('/objectives', input, account.cookie, 'POST', { 'X-Workspace-Id': 'different' }))
      .status,
    409,
  );
  assert.equal((await request('/state', undefined, account.cookie)).data.objectives.length, 1);
});

test('charges replay atomically and exports include all workspace domains and audit history', async (t) => {
  const { request, signup, store } = await fixture(t);
  const owner = await signup('owner@example.test');
  const bidder = await signup('bidder@example.test');
  const key = { 'Idempotency-Key': 'job-request-0001' };
  const first = await request('/jobs', jobInput, owner.cookie, 'POST', key);
  assert.equal(first.status, 201);
  assert.deepEqual((await request('/jobs', jobInput, owner.cookie, 'POST', key)).data, first.data);
  assert.equal(
    (await request('/jobs', { ...jobInput, title: 'Different' }, owner.cookie, 'POST', key)).status,
    409,
  );
  const bid = await request(`/jobs/${first.data.id}/bids`, bidInput, bidder.cookie, 'POST', {
    'Idempotency-Key': 'bid-request-0001',
  });
  assert.equal(bid.status, 201);
  assert.equal(
    (
      await request(`/jobs/${first.data.id}/bids`, bidInput, bidder.cookie, 'POST', {
        'Idempotency-Key': 'bid-request-0001',
      })
    ).data.id,
    bid.data.id,
  );
  await request(
    `/jobs/${first.data.id}/proposals`,
    { ...proposalInput, bidId: bid.data.id },
    bidder.cookie,
  );
  for (let i = 0; i < 220; i++)
    store.log(owner.workspace.id, 'Owner', 'Historical event', null, String(i));
  const exported = (await request('/export', undefined, owner.cookie)).data;
  assert.equal(exported.jobs.length, 1);
  assert.equal(exported.bids.length, 1);
  assert.equal(exported.proposals.length, 1);
  assert.equal(exported.pointsLedger.length, 2);
  assert.equal(exported.members.length, 1);
  assert.ok(exported.audit.length > 220);
  assert.equal(exported.workspaces, undefined);
  assert.equal(exported.user, undefined);
  assert.equal(
    store.db.prepare('SELECT points_balance FROM users WHERE id = ?').get(owner.user.id)
      .points_balance,
    90,
  );
  store.db.exec(
    "CREATE TRIGGER fail_job_audit BEFORE INSERT ON audit WHEN NEW.action = 'Job post created' BEGIN SELECT RAISE(ABORT, 'audit unavailable'); END",
  );
  assert.equal(
    (
      await request('/jobs', jobInput, owner.cookie, 'POST', {
        'Idempotency-Key': 'job-request-fails',
      })
    ).status,
    500,
  );
  assert.equal(
    store.db.prepare('SELECT points_balance FROM users WHERE id = ?').get(owner.user.id)
      .points_balance,
    90,
  );
  assert.equal(store.db.prepare('SELECT COUNT(*) AS count FROM job_posts').get().count, 1);
});

test('populated account deletion preserves other accounts and their point ledger', async (t) => {
  const { request, signup, store } = await fixture(t);
  const admin = await signup('admin@example.test', 'Enterprise');
  const owner = await signup('owner@example.test', 'Enterprise');
  const bidder = await signup('bidder@example.test');
  await request('/admin/members', { email: bidder.user.email }, owner.cookie);
  const job = await request('/jobs', jobInput, owner.cookie);
  const bid = await request(`/jobs/${job.data.id}/bids`, bidInput, bidder.cookie);
  await request(
    `/jobs/${job.data.id}/proposals`,
    { ...proposalInput, bidId: bid.data.id },
    owner.cookie,
  );
  await request('/workspace/switch', { workspaceId: owner.workspace.id }, bidder.cookie);
  const deleted = await request(
    `/admin/users/${owner.user.id}`,
    { confirmation: 'DELETE USER ACCOUNT', password: 'a-long-test-password' },
    admin.cookie,
    'DELETE',
  );
  assert.equal(deleted.status, 200);
  assert.equal(
    (await request('/state', undefined, bidder.cookie)).data.workspace.id,
    bidder.workspace.id,
  );
  assert.equal(
    store.db.prepare('SELECT points_balance FROM users WHERE id = ?').get(bidder.user.id)
      .points_balance,
    98,
  );
  assert.equal(
    store.db.prepare('SELECT workspace_id FROM points_ledger WHERE user_id = ?').get(bidder.user.id)
      .workspace_id,
    null,
  );
  assert.deepEqual(store.db.prepare('PRAGMA foreign_key_check').all(), []);
  // Deleting a freelancer also detaches bids from a surviving client's proposal.
  const another = await signup('another@example.test');
  const job2 = await request('/jobs', jobInput, admin.cookie);
  const bid2 = await request(`/jobs/${job2.data.id}/bids`, bidInput, another.cookie);
  await request(
    `/jobs/${job2.data.id}/proposals`,
    { ...proposalInput, bidId: bid2.data.id },
    admin.cookie,
  );
  assert.equal(
    (
      await request(
        `/admin/users/${another.user.id}`,
        { confirmation: 'DELETE USER ACCOUNT', password: 'a-long-test-password' },
        admin.cookie,
        'DELETE',
      )
    ).status,
    200,
  );
  assert.equal(
    store.db.prepare('SELECT bid_id FROM proposals WHERE job_id = ?').get(job2.data.id).bid_id,
    null,
  );
  assert.deepEqual(store.db.prepare('PRAGMA foreign_key_check').all(), []);
});

test('enterprise capacity survives restart and descriptive context never changes tier', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'lamid-migration-'));
  const filename = join(directory, 'test.db');
  try {
    let instance = createApp({ filename });
    instance.store.db
      .prepare('INSERT INTO users (id, name, created_at) VALUES (?, ?, ?)')
      .run('u', 'Owner', new Date().toISOString());
    instance.store.db
      .prepare('INSERT INTO workspaces VALUES (?, ?, ?, ?, ?, ?)')
      .run('w', 'u', 'Enterprise', 'Enterprise', 'enterprise', 50);
    instance.store.db.close();
    instance = createApp({ filename });
    assert.equal(
      instance.store.db.prepare('SELECT member_limit FROM workspaces').get().member_limit,
      50,
    );
    instance.store.db.prepare("UPDATE workspaces SET context = 'Professional'").run();
    instance.store.db.close();
    instance = createApp({ filename });
    assert.equal(instance.store.db.prepare('SELECT tier FROM workspaces').get().tier, 'enterprise');
    assert.equal(
      instance.store.db.prepare('SELECT COUNT(*) AS count FROM migrations WHERE version = 3').get()
        .count,
      1,
    );
    instance.store.db.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('knowledge is tenant scoped, versioned, searchable, exportable and deletable', async (t) => {
  const { request, signup } = await fixture(t);
  const account = await signup('knowledge@example.test');
  const other = await signup('other@example.test');
  const input = {
    title: 'Research source',
    content: 'Documented requirement: preserve human review.',
    sourceType: 'text-file',
    sourceName: 'requirements.txt',
  };
  const created = await request('/knowledge', input, account.cookie);
  assert.equal(created.status, 201);
  assert.equal(created.data.contentHash.length, 64);
  assert.equal((await request('/knowledge?q=human', undefined, account.cookie)).data.total, 1);
  assert.equal((await request('/knowledge?q=human', undefined, other.cookie)).data.total, 0);
  assert.equal(
    (
      await request(
        `/knowledge/${created.data.id}`,
        { ...input, version: 1 },
        other.cookie,
        'PATCH',
      )
    ).status,
    404,
  );
  const updated = await request(
    `/knowledge/${created.data.id}`,
    { ...input, content: 'Revised documented evidence.', version: 1 },
    account.cookie,
    'PATCH',
  );
  assert.equal(updated.data.version, 2);
  assert.notEqual(updated.data.contentHash, created.data.contentHash);
  assert.equal(
    (await request(`/knowledge/${created.data.id}`, { version: 1 }, account.cookie, 'DELETE'))
      .status,
    409,
  );
  assert.equal((await request('/export', undefined, account.cookie)).data.knowledge.length, 1);
  assert.equal(
    (await request(`/knowledge/${created.data.id}`, { version: 2 }, account.cookie, 'DELETE'))
      .status,
    200,
  );
  assert.equal((await request('/knowledge', undefined, account.cookie)).data.total, 0);
});

test('open opportunities exclude samples and bidders can recover their own bid and draft', async (t) => {
  const { request, signup } = await fixture(t);
  const client = await signup('client@example.test');
  const freelancer = await signup('freelancer@example.test');
  const sample = await request('/auth/demo', {});
  await request('/jobs', { ...jobInput, title: 'Sample only' }, sample.cookie);
  const job = await request('/jobs', jobInput, client.cookie);
  assert.equal((await request(`/jobs/${job.data.id}/bids`, bidInput, sample.cookie)).status, 403);
  const market = await request('/marketplace/jobs', undefined, freelancer.cookie);
  assert.equal(market.data.length, 1);
  assert.equal(market.data[0].id, job.data.id);
  assert.deepEqual((await request('/marketplace/jobs', undefined, sample.cookie)).data, []);
  const bid = await request(`/jobs/${job.data.id}/bids`, bidInput, freelancer.cookie);
  assert.equal((await request('/bids/mine', undefined, freelancer.cookie)).data[0].id, bid.data.id);
  assert.deepEqual((await request('/bids/mine', undefined, client.cookie)).data, []);
  const draft = await request(
    `/jobs/${job.data.id}/proposals`,
    { ...proposalInput, bidId: bid.data.id },
    freelancer.cookie,
  );
  assert.equal(
    (await request(`/jobs/${job.data.id}/proposals`, undefined, freelancer.cookie)).data[0].id,
    draft.data.id,
  );
});
