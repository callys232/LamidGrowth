import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createFundedTestApp as createApp } from './support/funded-app.mjs';

let app, store, server, base;
const adminEmail = 'extensions-admin@lamidgrowth.test';
before(async () => {
  ({ app, store } = await createApp({
    filename: ':memory:',
    rateLimits: { api: { max: 1000 }, auth: { max: 1000 }, mutation: { max: 1000 }, spend: { max: 1000 } },
    ecosystemAdminEmails: [adminEmail],
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
async function signup(name, email) {
  const result = await request('/auth/signup', { name, email, password: `a-long-${name.toLowerCase()}-password`, context: 'Founder' });
  assert.equal(result.status, 201);
  return result.cookie;
}
async function makeExpert(name, email) {
  const cookie = await signup(name, email);
  const profile = await request('/talent/profile', { headline: `${name} — consultant`, skills: ['strategy'] }, cookie);
  assert.equal(profile.status, 200);
  return cookie;
}
async function userId(cookie) {
  return (await request('/state', undefined, cookie, 'GET')).data.user.id;
}

test('booking: an expert publishes availability and a client books it', async () => {
  const expert = await makeExpert('Booking Expert', 'booking-expert@example.test');
  const client = await signup('Booking Client', 'booking-client@example.test');

  const slot = await request(
    '/booking/availability',
    { startAt: '2027-01-10T10:00:00.000Z', endAt: '2027-01-10T11:00:00.000Z', format: 'advisory_session' },
    expert,
  );
  assert.equal(slot.status, 201);
  assert.equal(slot.data.status, 'open');

  const expertUserId = await userId(expert);

  const open = await request(`/booking/availability/${expertUserId}`, undefined, client, 'GET');
  assert.equal(open.data.length, 1);

  const booked = await request(`/booking/slots/${slot.data.id}/book`, { notes: 'Looking forward to it' }, client);
  assert.equal(booked.status, 201);
  assert.equal(booked.data.status, 'confirmed');

  const doubleBook = await request(`/booking/slots/${slot.data.id}/book`, {}, client);
  assert.equal(doubleBook.status, 400);

  const cancelled = await request(`/booking/${booked.data.id}/cancel`, {}, client, 'PATCH');
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.data.status, 'cancelled');

  const reopened = await request(`/booking/availability/${expertUserId}`, undefined, client, 'GET');
  assert.equal(reopened.data.length, 1);
});

test('expert teams: a lead creates a team, adds a member, and only the lead can manage it', async () => {
  const lead = await makeExpert('Team Lead', 'team-lead@example.test');
  const member = await makeExpert('Team Member', 'team-member@example.test');
  const outsider = await signup('Team Outsider', 'team-outsider@example.test');

  const created = await request('/expert-teams', { name: 'Growth Pod', description: 'Cross-functional growth team' }, lead);
  assert.equal(created.status, 201);
  assert.equal(created.data.members.length, 1);

  const memberUserId = await userId(member);

  const deniedAdd = await request(`/expert-teams/${created.data.id}/members`, { userId: memberUserId }, outsider);
  assert.equal(deniedAdd.status, 403);

  const added = await request(`/expert-teams/${created.data.id}/members`, { userId: memberUserId, role: 'Analyst' }, lead);
  assert.equal(added.status, 201);
  assert.equal(added.data.members.length, 2);

  const removed = await request(`/expert-teams/${created.data.id}/members/${memberUserId}`, {}, lead, 'DELETE');
  assert.equal(removed.status, 200);
  assert.equal(removed.data.members.length, 1);
});

test('expert teams: a team led by the engaged freelancer can be assigned to their project as a unit', async () => {
  const client = await signup('Team Assign Client', 'team-assign-client@example.test');
  const freelancer = await makeExpert('Team Assign Freelancer', 'team-assign-freelancer@example.test');
  const otherLead = await makeExpert('Other Team Lead', 'team-assign-other@example.test');

  const job = await request(
    '/jobs',
    {
      title: 'Team assignment test project',
      category: 'Marketing and growth',
      projectType: 'Advisory engagement',
      description: 'A project used to test assigning an expert team as a unit.',
      deliverables: 'A summary report.',
      budgetMin: 500,
      budgetMax: 1000,
      currency: 'USD',
      timeline: '1 week',
    },
    client,
  );
  await request(
    `/jobs/${job.data.id}/bids`,
    { coverLetter: 'I lead a small team that can deliver this quickly and well.', proposedAmount: 750, currency: 'USD', timeline: '1 week' },
    freelancer,
  );
  const freelancerUserId = await userId(freelancer);
  const project = await request('/projects', { jobId: job.data.id, title: 'Team assignment test project', freelancerUserId }, client);
  assert.equal(project.status, 201);

  const freelancerTeam = await request('/expert-teams', { name: 'Freelancer Pod' }, freelancer);
  const otherTeam = await request('/expert-teams', { name: 'Other Pod' }, otherLead);

  const wrongTeam = await request(`/projects/${project.data.id}/team`, { teamId: otherTeam.data.id }, client, 'PATCH');
  assert.equal(wrongTeam.status, 400);

  const notOwner = await request(`/projects/${project.data.id}/team`, { teamId: freelancerTeam.data.id }, freelancer, 'PATCH');
  assert.equal(notOwner.status, 403);

  const assigned = await request(`/projects/${project.data.id}/team`, { teamId: freelancerTeam.data.id }, client, 'PATCH');
  assert.equal(assigned.status, 200);
  assert.equal(assigned.data.assignedTeam.id, freelancerTeam.data.id);

  const detail = await request(`/projects/${project.data.id}`, undefined, client, 'GET');
  assert.equal(detail.data.assignedTeam.id, freelancerTeam.data.id);

  const unassigned = await request(`/projects/${project.data.id}/team`, { teamId: null }, client, 'PATCH');
  assert.equal(unassigned.status, 200);
  assert.equal(unassigned.data.assignedTeam, null);
});

test('AI-human handoff: the Companion agent automatically raises a handoff for a regulated-sounding message', async () => {
  const client = await signup('Auto Handoff Client', 'auto-handoff-client@example.test');
  const expert = await makeExpert('Auto Handoff Expert', 'auto-handoff-expert@example.test');

  const plain = await request('/companion/messages', { message: 'What is going on right now?' }, client);
  assert.equal(plain.status, 201);
  assert.equal(plain.data.humanHandoffRequested, undefined);

  const regulated = await request(
    '/companion/messages',
    { message: 'I need licensed legal review of this vendor contract before signing.' },
    client,
  );
  assert.equal(regulated.status, 201);
  assert.equal(regulated.data.humanHandoffRequested, true);
  assert.ok(regulated.data.handoffId);

  const inbox = await request('/handoffs/inbox', undefined, expert, 'GET');
  assert.ok(inbox.data.some((h) => h.id === regulated.data.handoffId));

  const mine = await request('/handoffs/mine', undefined, client, 'GET');
  assert.ok(mine.data.some((h) => h.id === regulated.data.handoffId && h.source.startsWith('companion.')));
});

test('AI-human handoff: an agent-raised handoff can be accepted and completed by an expert', async () => {
  const client = await signup('Handoff Client', 'handoff-client@example.test');
  const expert = await makeExpert('Handoff Expert', 'handoff-expert@example.test');

  const created = await request(
    '/handoffs',
    { source: 'companion-agent', contextSummary: 'User needs a licensed review of a contract clause.', contextSnapshot: { thread: 'abc' } },
    client,
  );
  assert.equal(created.status, 201);
  assert.equal(created.data.status, 'pending');

  const inbox = await request('/handoffs/inbox', undefined, expert, 'GET');
  assert.ok(inbox.data.some((h) => h.id === created.data.id));

  const accepted = await request(`/handoffs/${created.data.id}/accept`, {}, expert);
  assert.equal(accepted.status, 200);
  assert.equal(accepted.data.status, 'accepted');

  const completed = await request(`/handoffs/${created.data.id}/complete`, {}, expert);
  assert.equal(completed.status, 200);
  assert.equal(completed.data.status, 'completed');
});

test('return-to-OS: an outcome can be recorded once per project and read back from the workspace feed', async () => {
  const client = await signup('Outcome Client', 'outcome-client@example.test');
  const freelancer = await signup('Outcome Freelancer', 'outcome-freelancer@example.test');

  const job = await request(
    '/jobs',
    {
      title: 'Outcome test project',
      category: 'Marketing and growth',
      projectType: 'Advisory engagement',
      description: 'A project used to test the return-to-OS outcome endpoint.',
      deliverables: 'A summary report.',
      budgetMin: 500,
      budgetMax: 1000,
      currency: 'USD',
      timeline: '1 week',
    },
    client,
  );
  const bidResult = await request(
    `/jobs/${job.data.id}/bids`,
    { coverLetter: 'I have delivered similar summary reports before and can start immediately.', proposedAmount: 750, currency: 'USD', timeline: '1 week' },
    freelancer,
  );
  assert.equal(bidResult.status, 201);
  const freelancerUserId = await userId(freelancer);
  const project = await request(
    '/projects',
    { jobId: job.data.id, title: 'Outcome test project', freelancerUserId },
    client,
  );
  assert.equal(project.status, 201);

  const missing = await request(`/projects/${project.data.id}/outcome`, undefined, client, 'GET');
  assert.equal(missing.data, null);

  const recorded = await request(
    `/projects/${project.data.id}/outcome`,
    { summary: 'Delivered the summary report on time.', learnings: 'Scope was clear from the start.' },
    client,
  );
  assert.equal(recorded.status, 201);

  const duplicate = await request(
    `/projects/${project.data.id}/outcome`,
    { summary: 'Second attempt', learnings: '' },
    client,
  );
  assert.equal(duplicate.status, 400);

  const feed = await request('/workspace/outcomes', undefined, client, 'GET');
  assert.ok(feed.data.some((o) => o.project_id === project.data.id));
});

test('governance: a jurisdiction rule forces a scoping case to red, and the review queue can be claimed', async () => {
  const admin = await signup('Extensions Admin', adminEmail);
  const client = await signup('Governance Client', 'governance-client@example.test');
  const expert = await makeExpert('Governance Expert', 'governance-expert@example.test');

  const rule = await request(
    '/admin/jurisdiction-rules',
    { jurisdiction: 'Germany', category: 'Legal and compliance', requiresLicense: true, notes: 'Requires a licensed local reviewer.' },
    admin,
  );
  assert.equal(rule.status, 201);

  const deniedRule = await request(
    '/admin/jurisdiction-rules',
    { jurisdiction: 'France', category: 'Legal and compliance', requiresLicense: true },
    client,
  );
  assert.equal(deniedRule.status, 403);

  const created = await request('/scoping-cases', { objective: 'Draft a data processing agreement', problemStatement: '' }, client);
  const flagged = await request(
    `/scoping-cases/${created.data.id}`,
    {
      deliverables: 'A signed DPA',
      category: 'Legal and compliance',
      budgetContext: '$2000',
      timelineContext: '2 weeks',
      jurisdiction: 'Germany',
    },
    client,
    'PATCH',
  );
  assert.equal(flagged.data.risk_band, 'red');

  const queued = await request(`/scoping-cases/${created.data.id}/request-review`, {}, client);
  assert.equal(queued.status, 201);
  assert.equal(queued.data.status, 'pending');

  const duplicateQueue = await request(`/scoping-cases/${created.data.id}/request-review`, {}, client);
  assert.equal(duplicateQueue.status, 400);

  const notExpert = await request('/review-queue', undefined, client, 'GET');
  assert.equal(notExpert.status, 403);

  const queue = await request('/review-queue', undefined, expert, 'GET');
  assert.ok(queue.data.some((entry) => entry.id === queued.data.id));

  const claimed = await request(`/review-queue/${queued.data.id}/claim`, {}, expert);
  assert.equal(claimed.status, 200);
  assert.equal(claimed.data.status, 'claimed');

  const completed = await request(`/review-queue/${queued.data.id}/complete`, { notes: 'Reviewed and cleared for a licensed local reviewer.' }, expert);
  assert.equal(completed.status, 200);
  assert.equal(completed.data.status, 'completed');
});
