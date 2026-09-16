// Full end-to-end user acceptance test: 5 personas across 5 different categories,
// each exercising the complete stack (signup -> job -> bid -> matcher -> proposal ->
// project -> milestone -> deliverable/criteria -> submission -> verification ->
// decision -> Companion agents -> activity feed), including manufacturing and a
// wedding/marriage planning business.
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
  };
}
const slugify = (name) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents for a safe email local-part/password
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '.');

async function signup(name, email) {
  const result = await request('/auth/signup', {
    name,
    email,
    password: `a-long-${slugify(name)}-password`,
    context: 'Founder',
  });
  assert.equal(result.status, 201, `signup failed for ${name}: ${JSON.stringify(result.data)}`);
  return result.cookie;
}

/**
 * Runs one full scenario end to end and returns a report object so the test
 * output doubles as a readable acceptance report, not just pass/fail.
 */
async function runScenario({
  label,
  category,
  projectType,
  clientName,
  freelancerName,
  jobTitle,
  description,
  deliverables,
  budgetMin,
  budgetMax,
  currency,
  timeline,
  bidCoverLetter,
  bidAmount,
  milestoneTitle,
  criteria,
  submissionNotes,
  finalDecision,
  companionMessage,
  specialistMessage,
}) {
  const report = { label, category, steps: [] };
  const record = (name, ok, detail) => {
    report.steps.push({ name, ok, detail });
    assert.ok(ok, `[${label}] ${name} failed: ${detail}`);
  };

  const client = await signup(clientName, `${slugify(clientName)}@example.test`);
  const freelancer = await signup(freelancerName, `${slugify(freelancerName)}@example.test`);
  record('client and freelancer accounts created', true);

  const freelancerState = await request('/state', undefined, freelancer, 'GET');
  record('freelancer state loaded', freelancerState.status === 200, JSON.stringify(freelancerState.data));

  const job = await request(
    '/jobs',
    { title: jobTitle, category, projectType, description, deliverables, budgetMin, budgetMax, currency, timeline },
    client,
  );
  record('job posted', job.status === 201, JSON.stringify(job.data));

  const bid = await request(
    `/jobs/${job.data.id}/bids`,
    { coverLetter: bidCoverLetter, proposedAmount: bidAmount, currency, timeline },
    freelancer,
  );
  record('bid submitted', bid.status === 201, JSON.stringify(bid.data));

  const matches = await request(`/jobs/${job.data.id}/matches`, undefined, client, 'GET');
  record(
    'consultant matcher scored the bid',
    matches.status === 200 && matches.data.length === 1 && typeof matches.data[0].total === 'number',
    JSON.stringify(matches.data),
  );

  const proposal = await request(
    `/jobs/${job.data.id}/proposals`,
    {
      bidId: bid.data.id,
      title: `${jobTitle} proposal`,
      scope: description,
      deliverables,
      amount: bidAmount,
      currency,
      timeline,
    },
    freelancer,
  );
  record('proposal drafted', proposal.status === 201, JSON.stringify(proposal.data));

  const project = await request(
    '/projects',
    { jobId: job.data.id, title: jobTitle, freelancerUserId: freelancerState.data.user.id },
    client,
  );
  record('project created from the awarded job', project.status === 201, JSON.stringify(project.data));

  const milestone = await request(
    `/projects/${project.data.id}/milestones`,
    { title: milestoneTitle, description: '', amount: bidAmount, currency },
    client,
  );
  record('milestone created', milestone.status === 201, JSON.stringify(milestone.data));

  const deliverable = await request(
    `/milestones/${milestone.data.id}/deliverables`,
    { title: 'Primary deliverable', description: '', criteria },
    client,
  );
  record(
    'deliverable + acceptance criteria defined',
    deliverable.status === 201 && deliverable.data.criteria.length === criteria.length,
    JSON.stringify(deliverable.data),
  );

  const submission = await request(
    `/milestones/${milestone.data.id}/submissions`,
    { notes: submissionNotes, assets: [] },
    freelancer,
  );
  record('freelancer submitted the milestone', submission.status === 201, JSON.stringify(submission.data));

  const verification = await request(`/submissions/${submission.data.id}/verify`, {}, client);
  record(
    'deliverable verification ran (deterministic)',
    verification.status === 201 && verification.data.method === 'deterministic',
    JSON.stringify(verification.data),
  );

  const stillInReview = await request(`/projects/${project.data.id}`, undefined, client, 'GET');
  record(
    'verification alone did not auto-approve the milestone',
    stillInReview.data.milestones[0].status === 'in_review',
    stillInReview.data.milestones[0].status,
  );

  const decision = await request(
    `/verification-cases/${verification.data.id}/decisions`,
    { decision: finalDecision, reason: `${label}: recorded via acceptance test` },
    client,
  );
  record(
    `client recorded decision "${finalDecision}"`,
    decision.status === 201 && decision.data.status === (finalDecision === 'approve' ? 'approved' : 'disputed'),
    JSON.stringify(decision.data),
  );

  const companionAsClient = await request('/companion/messages', { message: companionMessage }, client);
  record(
    'companion agent (context) responded to the client',
    companionAsClient.status === 201 && typeof companionAsClient.data.response === 'string',
    JSON.stringify(companionAsClient.data),
  );

  const companionSpecialist = await request('/companion/messages', { message: specialistMessage }, client);
  record(
    'companion routed a specialist-worded message to a non-default agent',
    companionSpecialist.status === 201 && companionSpecialist.data.agentId !== 'context-curator',
    companionSpecialist.data.agentId,
  );

  const activity = await request('/activity', undefined, client, 'GET');
  const types = new Set(activity.data.map((item) => item.type));
  record(
    'activity feed reflects the job, workflow-free agent runs, and points spend',
    activity.status === 200 && types.has('job') && types.has('agent_run') && types.has('points'),
    JSON.stringify([...types]),
  );

  return report;
}

const scenarios = [
  {
    label: 'Manufacturing — production line efficiency audit',
    category: 'Business operations',
    projectType: 'Audit or assessment',
    clientName: 'Kenji Sato',
    freelancerName: 'Priya Raman',
    jobTitle: 'Production line efficiency audit for electronics assembly plant',
    description:
      'We run a mid-size electronics assembly plant and need an operations consultant to audit our production line, identify bottlenecks, and recommend efficiency improvements across staffing, layout, and scheduling.',
    deliverables:
      'A written efficiency audit covering bottleneck analysis, staffing recommendations, and a layout improvement plan.',
    budgetMin: 4000,
    budgetMax: 7000,
    currency: 'USD',
    timeline: '6 weeks',
    bidCoverLetter:
      'I specialize in manufacturing operations audits and can deliver a bottleneck analysis, staffing recommendations, and a layout improvement plan within 6 weeks.',
    bidAmount: 5500,
    milestoneTitle: 'Phase 1 — Floor audit and bottleneck analysis',
    criteria: [
      'Bottleneck analysis identifies at least 3 constraint points',
      'Staffing recommendations are included with rationale',
    ],
    submissionNotes:
      'Completed the bottleneck analysis identifying 4 constraint points, with staffing recommendations and rationale for each.',
    finalDecision: 'approve',
    companionMessage: 'what is going on right now with this engagement?',
    specialistMessage: 'can you run a health check and assess our current operational risk?',
  },
  {
    label: 'Wedding & marriage planning — full-service coordination',
    category: 'Creative and media',
    projectType: 'Fixed-scope project',
    clientName: 'Amara Chen',
    freelancerName: 'Diego Alvarez',
    jobTitle: 'Full-service wedding coordination for a 150-guest ceremony and reception',
    description:
      'We are planning our wedding for 150 guests and need a full-service coordinator to manage vendor selection, timeline coordination, and day-of logistics for the ceremony and reception.',
    deliverables:
      'A complete vendor list, a detailed day-of timeline, and on-site coordination for the ceremony and reception.',
    budgetMin: 2000,
    budgetMax: 3500,
    currency: 'USD',
    timeline: '5 months',
    bidCoverLetter:
      'I have coordinated over 40 weddings of similar size and can deliver a full vendor list, a detailed day-of timeline, and on-site coordination for your ceremony and reception.',
    bidAmount: 2800,
    milestoneTitle: 'Phase 1 — Vendor selection and timeline',
    criteria: [
      'Vendor list covers catering, photography, florals, and venue',
      'Day-of timeline is hour-by-hour from ceremony to reception close',
    ],
    submissionNotes:
      'Delivered the vendor list covering catering, photography, florals, and venue, plus an hour-by-hour day-of timeline from ceremony through reception close.',
    finalDecision: 'approve',
    companionMessage: 'what is going on right now with our wedding planning?',
    specialistMessage: 'what capability gaps do we still have before the big day?',
  },
  {
    label: 'Software engineering — SaaS analytics dashboard build',
    category: 'Software engineering',
    projectType: 'Fixed-scope project',
    clientName: 'Lena Fischer',
    freelancerName: 'Tomás Silva',
    jobTitle: 'Build a customer analytics dashboard for our SaaS product',
    description:
      'We need a customer-facing analytics dashboard for our SaaS product covering usage metrics, retention charts, and CSV export for our enterprise customers.',
    deliverables: 'A working dashboard with usage metrics, retention charts, and CSV export.',
    budgetMin: 3000,
    budgetMax: 5000,
    currency: 'USD',
    timeline: '4 weeks',
    bidCoverLetter:
      'I have built several SaaS analytics dashboards and can deliver usage metrics, retention charts, and CSV export within 4 weeks.',
    bidAmount: 4200,
    milestoneTitle: 'Phase 1 — Core dashboard build',
    criteria: [
      'Dashboard displays usage metrics and retention charts',
      'CSV export works for enterprise customers',
    ],
    submissionNotes: 'Implemented usage metrics, retention charts, and CSV export, tested with enterprise accounts.',
    finalDecision: 'approve',
    companionMessage: 'what is going on right now with this build?',
    specialistMessage: 'show me our kpi and performance metrics for this project',
  },
  {
    label: 'Marketing & growth — DTC skincare launch campaign',
    category: 'Marketing and growth',
    projectType: 'Short-term contract',
    clientName: 'Bianca Rossi',
    freelancerName: 'Marcus Webb',
    jobTitle: 'Launch campaign strategy for a direct-to-consumer skincare brand',
    description:
      'We are launching a new direct-to-consumer skincare line and need a growth marketer to design a launch campaign covering paid social, influencer outreach, and email sequencing.',
    deliverables: 'A launch campaign plan covering paid social, influencer outreach, and an email sequence.',
    budgetMin: 1500,
    budgetMax: 2500,
    currency: 'USD',
    timeline: '3 weeks',
    bidCoverLetter:
      'I have launched several DTC skincare brands and can deliver a paid social plan, influencer outreach strategy, and email sequence within 3 weeks.',
    bidAmount: 2000,
    milestoneTitle: 'Phase 1 — Campaign strategy',
    criteria: [
      'Campaign plan includes a paid social strategy',
      'Campaign plan includes an influencer outreach plan and email sequence',
    ],
    submissionNotes:
      'Delivered the paid social strategy plus an influencer outreach plan and full email sequence for the launch.',
    finalDecision: 'dispute',
    companionMessage: 'what is going on right now with the launch?',
    specialistMessage: 'what does the market and our competitors look like for this launch?',
  },
  {
    label: 'Legal & compliance — healthcare data-handling policy review',
    category: 'Legal and compliance',
    projectType: 'Advisory engagement',
    clientName: 'Farah Haddad',
    freelancerName: 'Owen Bennett',
    jobTitle: 'Review our patient data-handling policy for compliance gaps',
    description:
      'We are a healthcare startup and need a compliance advisor to review our patient data-handling policy, identify gaps, and recommend a remediation plan.',
    deliverables: 'A written compliance gap analysis and a prioritized remediation plan.',
    budgetMin: 2500,
    budgetMax: 4000,
    currency: 'USD',
    timeline: '3 weeks',
    bidCoverLetter:
      'I have reviewed data-handling policies for several healthcare startups and can deliver a gap analysis and remediation plan within 3 weeks.',
    bidAmount: 3200,
    milestoneTitle: 'Phase 1 — Gap analysis',
    criteria: [
      'Gap analysis identifies specific policy weaknesses',
      'Remediation plan is prioritized by risk',
    ],
    submissionNotes:
      'Completed the gap analysis identifying specific policy weaknesses and a remediation plan prioritized by risk.',
    finalDecision: 'approve',
    companionMessage: 'what is going on right now with this compliance review?',
    specialistMessage: 'can you run a health check and assess our current risk?',
  },
];

const reports = [];

for (const scenario of scenarios) {
  test(scenario.label, async () => {
    const report = await runScenario(scenario);
    reports.push(report);
  });
}

test('acceptance report summary', () => {
  for (const report of reports) {
    const passed = report.steps.filter((s) => s.ok).length;
    console.log(`\n=== ${report.label} (${report.category}) — ${passed}/${report.steps.length} steps passed ===`);
    for (const step of report.steps) console.log(`  ${step.ok ? '✔' : '✘'} ${step.name}`);
  }
  assert.equal(reports.length, scenarios.length);
});
