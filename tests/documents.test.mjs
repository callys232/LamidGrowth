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
    data: response.headers.get('content-type')?.includes('application/json') ? await response.json() : null,
    buffer: response.headers.get('content-type')?.includes('application/pdf') ? Buffer.from(await response.arrayBuffer()) : null,
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

async function generateQuote(client) {
  const job = await request(
    '/jobs',
    {
      title: 'Document export job',
      category: 'Software engineering',
      projectType: 'Fixed-scope project',
      description: 'A job used to exercise PDF export and signatures.',
      deliverables: 'A quote document.',
      budgetMin: 500,
      budgetMax: 2000,
      currency: 'USD',
      timeline: '2 weeks',
    },
    client,
  );
  assert.equal(job.status, 201);
  const quote = await request(
    '/companion/messages',
    { message: 'generate a quote for this job', jobId: job.data.id },
    client,
  );
  assert.equal(quote.status, 201);
  assert.equal(quote.data.agentId, 'quote-generator');
  return quote.data.runId;
}

test('a completed document run can be exported as a PDF with a valid header', async () => {
  const client = await signup('Doc Client', 'doc-client@example.test');
  const runId = await generateQuote(client);
  const pdf = await request(`/agent-runs/${runId}/pdf`, undefined, client, 'GET');
  assert.equal(pdf.status, 200);
  assert.ok(pdf.buffer.subarray(0, 5).toString() === '%PDF-');
});

test('a stranger in a different workspace cannot export or sign someone else\'s document', async () => {
  const client = await signup('Doc Owner', 'doc-owner@example.test');
  const stranger = await signup('Doc Stranger', 'doc-stranger@example.test');
  const runId = await generateQuote(client);
  const pdf = await request(`/agent-runs/${runId}/pdf`, undefined, stranger, 'GET');
  assert.equal(pdf.status, 404);
  const signature = await request(`/agent-runs/${runId}/signatures`, { signerName: 'Stranger' }, stranger);
  assert.equal(signature.status, 404);
});

test('signing a document records an attestation bound to the current content hash', async () => {
  const client = await signup('Sign Client', 'sign-client@example.test');
  const runId = await generateQuote(client);
  const signature = await request(`/agent-runs/${runId}/signatures`, { signerName: 'Sign Client' }, client);
  assert.equal(signature.status, 201);
  assert.ok(signature.data.document_hash);
  assert.ok(signature.data.note.includes('not a qualified electronic signature'));

  const list = await request(`/agent-runs/${runId}/signatures`, undefined, client, 'GET');
  assert.equal(list.status, 200);
  assert.equal(list.data.length, 1);
  assert.equal(list.data[0].valid, true);
});
