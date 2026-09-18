import { existsSync } from 'node:fs';
if (existsSync('.env')) process.loadEnvFile('.env');
import { createApp } from './src/app/app.mjs';

const messages = [];
const { app, store, mail } = await createApp({
  filename: 'changeorder_check',
  aiProvider: { name: 'Stub', model: 'stub', async review(ctx) { return { review: { summary: `stub answer to ${ctx.question}`, assumptions: [], suggestions: [], evidenceIds: [] } }; } },
  mailProvider: { async send(message, id) { messages.push({ ...message, id }); } },
  rateLimits: { api: { max: 10000 }, auth: { max: 10000 }, mutation: { max: 10000 }, spend: { max: 10000 } },
});
const server = app.listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const base = `http://127.0.0.1:${server.address().port}/api`;
async function call(path, body, cookie, method) {
  const res = await fetch(base + path, { method: method || (body === undefined ? 'GET' : 'POST'), headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => null);
  return { status: res.status, data, cookie: res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ') };
}
async function signup(name, email) {
  const r = await call('/auth/signup', { name, email, password: 'changeorder-check-password-123', context: 'Founder' });
  await mail.tick();
  const message = messages.find((m) => m.to === email);
  const code = message?.text?.match(/code is (\d{6})/)?.[1];
  await call('/auth/verify', { challengeId: r.data.challengeId, code }, r.cookie);
  return r.cookie;
}
async function enableAI(cookie) {
  const settings = (await call('/ai/settings', undefined, cookie, 'GET')).data;
  const r = await call('/ai/settings', { enabled: true, dailyLimit: 100, version: settings.version }, cookie, 'PATCH');
  console.log('enableAI:', r.status, r.data);
}

const client = await signup('CO Client', 'co-client@example.test');
const freelancer = await signup('CO Freelancer', 'co-freelancer@example.test');
await enableAI(freelancer);

const job = await call('/jobs', { title: 'CO job', category: 'Software engineering', projectType: 'Fixed-scope project', description: 'x'.repeat(30), deliverables: 'y'.repeat(20), budgetMin: 1000, budgetMax: 2000, currency: 'USD', timeline: '2 weeks' }, client);
console.log('job:', job.status);
const bid = await call(`/jobs/${job.data.id}/bids`, { coverLetter: 'I can do this well and on time.', proposedAmount: 1500, currency: 'USD', timeline: '2 weeks' }, freelancer);
console.log('bid:', bid.status);
const proposal = await call(`/jobs/${job.data.id}/proposals`, { title: 'CO proposal', scope: 'Deliver the feature with tests.', deliverables: 'y'.repeat(20), amount: 1500, currency: 'USD', timeline: '2 weeks', bidId: bid.data.id }, freelancer);
console.log('proposal:', proposal.status, proposal.data);

const changeOrder = await call('/companion/messages', { message: 'Add a second revision round.', agentId: 'change-order', proposalId: proposal.data.id }, freelancer);
console.log('change-order:', changeOrder.status, JSON.stringify(changeOrder.data));

server.close();
await store.dropSchema();
console.log('done');
