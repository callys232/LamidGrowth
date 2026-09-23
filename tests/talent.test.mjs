import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createFundedTestApp as createApp } from './support/funded-app.mjs';

let app, store, server, base, adminCookie;
const adminEmail = 'talent-admin@lamidgrowth.test';
before(async () => {
  ({ app, store } = await createApp({
    filename: ':memory:',
    rateLimits: {
      api: { max: 1000 },
      auth: { max: 1000 },
      mutation: { max: 1000 },
      spend: { max: 1000 },
    },
    ecosystemAdminEmails: [adminEmail],
  }));
  server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  base = `http://127.0.0.1:${server.address().port}`;
  adminCookie = await signup('Talent Ecosystem Admin', adminEmail);
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
async function signup(name, email) {
  counter++;
  const result = await request('/auth/signup', {
    name,
    email: email || `talent-${counter}-${Date.now()}@example.test`,
    password: `a-long-talent-password-${counter}`,
    context: 'Founder',
  });
  assert.equal(result.status, 201);
  return result.cookie;
}

test('a profile can be created and re-saved (upsert)', async () => {
  const user = await signup('Profile Owner');
  const created = await request(
    '/talent/profile',
    {
      headline: 'Senior JavaScript engineer',
      skills: ['javascript', 'react'],
      hourlyRate: 8000,
      currency: 'USD',
      languages: ['English'],
    },
    user,
  );
  assert.equal(created.status, 200);
  assert.equal(created.data.vetting_status, 'unverified');

  const updated = await request(
    '/talent/profile',
    {
      headline: 'Lead JavaScript engineer',
      skills: ['javascript', 'react', 'node'],
      languages: [],
    },
    user,
  );
  assert.equal(updated.status, 200);
  assert.equal(updated.data.headline, 'Lead JavaScript engineer');
  assert.equal(updated.data.skills.length, 3);

  const mine = await request('/talent/profile/mine', undefined, user, 'GET');
  assert.equal(mine.data.headline, 'Lead JavaScript engineer');
});

test('Expert Finder ranks a matching profile above a non-matching one', async () => {
  const matching = await signup('Matching Expert');
  const nonMatching = await signup('Unrelated Expert');
  await request(
    '/talent/profile',
    { headline: 'React and JavaScript specialist', skills: ['javascript', 'react'], languages: [] },
    matching,
  );
  await request(
    '/talent/profile',
    { headline: 'Legal contract specialist', skills: ['contracts', 'compliance'], languages: [] },
    nonMatching,
  );

  const results = await request(
    '/talent/experts?skill=javascript%20react',
    undefined,
    matching,
    'GET',
  );
  assert.equal(results.status, 200);
  const matchingResult = results.data.find((r) => r.headline.includes('React'));
  const nonMatchingResult = results.data.find((r) => r.headline.includes('Legal'));
  assert.ok(matchingResult);
  assert.ok(!nonMatchingResult); // filtered out entirely since it has zero skill overlap
  assert.ok(matchingResult.score > 0);
});

test('skills assessments are graded deterministically, and a bogus skill 404s', async () => {
  const user = await signup('Quiz Taker');
  await request(
    '/talent/profile',
    { headline: 'JS dev', skills: ['javascript'], languages: [] },
    user,
  );

  const quiz = await request('/talent/quiz/javascript', undefined, user, 'GET');
  assert.equal(quiz.status, 200);
  assert.equal(quiz.data.length, 5);
  assert.ok(!('correctIndex' in quiz.data[0])); // never leaks the answer key

  const bogus = await request('/talent/quiz/underwater-basket-weaving', undefined, user, 'GET');
  assert.equal(bogus.status, 404);

  // All-correct answer key, derived from the known QUIZ_BANK in src/app/talent.mjs.
  const perfect = await request(
    '/talent/assessments',
    { skill: 'javascript', answers: [2, 0, 1, 1, 2] },
    user,
  );
  assert.equal(perfect.status, 201);
  assert.equal(perfect.data.score, 100);
  assert.equal(perfect.data.passed, true);

  const zero = await request(
    '/talent/assessments',
    { skill: 'javascript', answers: [0, 1, 2, 0, 1] },
    user,
  );
  assert.equal(zero.status, 201);
  assert.equal(zero.data.score, 0);
  assert.equal(zero.data.passed, false);

  const bogusSubmit = await request(
    '/talent/assessments',
    { skill: 'not-a-real-skill', answers: [0] },
    user,
  );
  assert.equal(bogusSubmit.status, 404);
});

test('vetting requires an ecosystem admin decision; a non-admin cannot approve', async () => {
  const admin = adminCookie;
  const applicant = await signup('Vetting Applicant');
  const nonAdmin = await signup('Nosy User');
  await request(
    '/talent/profile',
    { headline: 'Vetted expert', skills: ['javascript'], languages: [] },
    applicant,
  );
  const applicantState = (await request('/state', undefined, applicant, 'GET')).data;

  const submit = await request('/talent/profile/vetting', {}, applicant);
  assert.equal(submit.status, 200);
  assert.equal(submit.data.vetting_status, 'pending');

  const blockedList = await request('/admin/talent/vetting', undefined, nonAdmin, 'GET');
  assert.equal(blockedList.status, 403);
  const blockedDecision = await request(
    `/admin/talent/vetting/${applicantState.user.id}`,
    { decision: 'verified' },
    nonAdmin,
    'PATCH',
  );
  assert.equal(blockedDecision.status, 403);

  const list = await request('/admin/talent/vetting', undefined, admin, 'GET');
  assert.equal(list.status, 200);
  assert.equal(list.data.length, 1);

  const decision = await request(
    `/admin/talent/vetting/${applicantState.user.id}`,
    { decision: 'verified' },
    admin,
    'PATCH',
  );
  assert.equal(decision.status, 200);
  assert.equal(decision.data.vetting_status, 'verified');
});

test('Candidate Screening blends bid score, assessment, vetting, and track record — and only the job owner can view it', async () => {
  const client = await signup('Screening Client');
  const admin = adminCookie;
  const freelancer = await signup('Screening Freelancer');
  const stranger = await signup('Screening Stranger');

  await request(
    '/talent/profile',
    { headline: 'Software engineer', skills: ['javascript'], languages: [] },
    freelancer,
  );
  await request('/talent/profile/vetting', {}, freelancer);
  const freelancerState = (await request('/state', undefined, freelancer, 'GET')).data;
  await request(
    `/admin/talent/vetting/${freelancerState.user.id}`,
    { decision: 'verified' },
    admin,
    'PATCH',
  );
  await request(
    '/talent/assessments',
    { skill: 'javascript', answers: [2, 0, 1, 1, 2] },
    freelancer,
  );

  const job = await request(
    '/jobs',
    {
      title: 'Screening job',
      category: 'Software engineering',
      projectType: 'Fixed-scope project',
      description: 'A job used to exercise candidate screening end to end.',
      deliverables: 'A working feature.',
      budgetMin: 500,
      budgetMax: 2000,
      currency: 'USD',
      timeline: '2 weeks',
    },
    client,
  );
  await request(
    `/jobs/${job.data.id}/bids`,
    {
      coverLetter: 'I will deliver this working feature as described.',
      proposedAmount: 1000,
      currency: 'USD',
      timeline: '2 weeks',
    },
    freelancer,
  );

  const strangerAttempt = await request(
    `/jobs/${job.data.id}/screening`,
    undefined,
    stranger,
    'GET',
  );
  assert.equal(strangerAttempt.status, 403);

  const screening = await request(`/jobs/${job.data.id}/screening`, undefined, client, 'GET');
  assert.equal(screening.status, 200);
  assert.equal(screening.data.length, 1);
  const result = screening.data[0];
  assert.equal(result.assessmentAvg, 100);
  assert.equal(result.vettingStatus, 'verified');
  assert.equal(result.completedMilestones, 0);
  assert.ok(result.blendedTotal > result.bidScore.total * 0.5); // vetting + assessment bonuses pushed it up
});

test('candidate-matches compares freelancer profiles against a project, including non-bidders; only the owner can view it', async () => {
  const client = await signup('CandidateMatch Client');
  const matchingFreelancer = await signup('CandidateMatch Match');
  const nonMatchingFreelancer = await signup('CandidateMatch NoMatch');
  await request(
    '/talent/profile',
    { headline: 'React dashboard specialist', skills: ['react', 'dashboard'], languages: [] },
    matchingFreelancer,
  );
  await request(
    '/talent/profile',
    { headline: 'Legal contract review', skills: ['contracts', 'compliance'], languages: [] },
    nonMatchingFreelancer,
  );

  const job = await request(
    '/jobs',
    {
      title: 'React dashboard build',
      category: 'Software engineering',
      projectType: 'Fixed-scope project',
      description: 'Build a React dashboard with charts and filters.',
      deliverables: 'A working React dashboard.',
      budgetMin: 500,
      budgetMax: 2000,
      currency: 'USD',
      timeline: '2 weeks',
    },
    client,
  );

  const strangerAttempt = await request(
    `/jobs/${job.data.id}/candidate-matches`,
    undefined,
    matchingFreelancer,
    'GET',
  );
  assert.equal(strangerAttempt.status, 403);

  const matches = await request(`/jobs/${job.data.id}/candidate-matches`, undefined, client, 'GET');
  assert.equal(matches.status, 200);
  assert.ok(matches.data.some((m) => m.headline.includes('React')));
  assert.ok(!matches.data.some((m) => m.headline.includes('Legal')));
});

test("job-matches ranks open jobs by fit to the freelancer's own profile", async () => {
  const client = await signup('JobMatch Client');
  const freelancer = await signup('JobMatch Freelancer');
  await request(
    '/talent/profile',
    {
      headline: 'Marketing and growth specialist',
      skills: ['marketing', 'growth', 'campaigns'],
      languages: [],
    },
    freelancer,
  );

  const matchingJob = await request(
    '/jobs',
    {
      title: 'Growth marketing campaign',
      category: 'Marketing and growth',
      projectType: 'Fixed-scope project',
      description: 'Run a growth marketing campaign with paid acquisition.',
      deliverables: 'A campaign report.',
      budgetMin: 500,
      budgetMax: 2000,
      currency: 'USD',
      timeline: '2 weeks',
    },
    client,
  );
  const unrelatedJob = await request(
    '/jobs',
    {
      title: 'Legal compliance audit',
      category: 'Legal and compliance',
      projectType: 'Audit or assessment',
      description: 'Review our data-handling policy for compliance gaps.',
      deliverables: 'A compliance report.',
      budgetMin: 500,
      budgetMax: 2000,
      currency: 'USD',
      timeline: '2 weeks',
    },
    client,
  );

  const noProfile = await signup('No Profile Freelancer');
  const blocked = await request('/talent/job-matches', undefined, noProfile, 'GET');
  assert.equal(blocked.status, 400);

  const matches = await request('/talent/job-matches', undefined, freelancer, 'GET');
  assert.equal(matches.status, 200);
  assert.ok(matches.data.some((m) => m.jobId === matchingJob.data.id));
  assert.ok(!matches.data.some((m) => m.jobId === unrelatedJob.data.id));
});
