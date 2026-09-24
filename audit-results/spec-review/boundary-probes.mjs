import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createApp } from '../../data/spec-review-snapshot/code/src/app/app.mjs';
const observations = [];
const instance = await createApp({
  filename: ':memory:',
  securityKey: 'ac'.repeat(32),
  mailProvider: null,
  aiProvider: null,
  paymentProvider: () => null,
  rateLimits: { api: { max: 1000 }, auth: { max: 1000 }, mutation: { max: 1000 } },
});
const server = await new Promise((resolve) => {
  const s = instance.app.listen(0, '127.0.0.1', () => resolve(s));
});
const base = `http://127.0.0.1:${server.address().port}`;
async function request(cookie, path, body, method = body === undefined ? 'GET' : 'POST') {
  const response = await fetch(base + '/api' + path, {
    method,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return {
    status: response.status,
    data,
    cookie: response.headers.get('set-cookie')?.split(';')[0],
  };
}
try {
  const owner = await request(null, '/auth/demo', {});
  const outsider = await request(null, '/auth/demo', {});
  assert.equal(owner.status, 201);
  assert.equal(outsider.status, 201);
  const handoff = await request(owner.cookie, '/handoffs', {
    source: 'audit',
    contextSummary: 'PRIVATE_AUDIT_CONTEXT',
    contextSnapshot: { confidential: 'AUDIT_ONLY' },
  });
  assert.equal(handoff.status, 201);
  const inbox = await request(outsider.cookie, '/handoffs/inbox');
  observations.push({
    finding: 'EX-02',
    probe: 'Unrelated account without expert profile reads unassigned handoff',
    status: inbox.status,
    observed:
      inbox.data.some?.(
        (r) =>
          r.id === handoff.data.id && JSON.parse(r.context_snapshot).confidential === 'AUDIT_ONLY',
      ) === true,
  });
  const decline = await request(outsider.cookie, `/handoffs/${handoff.data.id}/decline`, {});
  observations.push({
    finding: 'EX-02',
    probe: 'Unrelated account declines another workspace handoff',
    status: decline.status,
    observed: decline.status === 200,
  });
  const upload = await request(owner.cookie, '/files', {
    filename: 'audit.html',
    mimeType: 'text/html',
    base64Content: Buffer.from('<!doctype html><title>Audit inert HTML</title>').toString('base64'),
  });
  observations.push({
    finding: 'SEC-UPLOAD',
    probe: 'HTML MIME accepted without quarantine',
    status: upload.status,
    observed: upload.status === 201,
  });
  const download = await fetch(base + '/api/files/' + upload.data.id, {
    headers: { cookie: owner.cookie },
  });
  observations.push({
    finding: 'SEC-UPLOAD',
    probe: 'Uploaded HTML served inline on application origin',
    status: download.status,
    mime: download.headers.get('content-type'),
    disposition: download.headers.get('content-disposition'),
    observed:
      download.status === 200 && download.headers.get('content-type')?.includes('text/html'),
  });
  const state = await request(owner.cookie, '/state');
  const objective = state.data.objectives[0];
  assert.ok(objective);
  const sub = await request(owner.cookie, `/objectives/${objective.id}/goal/subscriptions`, {
    signalClasses: ['training'],
    constraints: { language: 'zz', freeOrPaid: 'free', budget: '0' },
    attentionPolicy: 'silent',
  });
  assert.equal(sub.status, 201);
  const training = await request(outsider.cookie, '/learning/paths', {
    title: 'Audit paid incompatible-language course',
    language: 'fr',
    pointsCost: 100,
  });
  assert.equal(training.status, 201);
  const scan = await request(owner.cookie, `/goal-subscriptions/${sub.data.id}/scan`, {});
  observations.push({
    finding: 'SI-SIGNALS',
    probe: 'Free-only language-constrained subscription matches paid unrelated-language learning',
    status: scan.status,
    observed: scan.data.newMatches?.some((r) => r.sourceId === training.data.id) === true,
  });
  const attributed = await request(owner.cookie, '/outcome-records', {
    subjectKind: 'unverified_subject',
    subjectId: 'does-not-exist',
    description: 'Audit assertion without evidence',
    attributionStrength: 'verified_causal',
  });
  observations.push({
    finding: 'SI-03',
    probe: 'Verified causal outcome accepted without evidence or existing subject',
    status: attributed.status,
    observed: attributed.status === 201,
  });
} finally {
  await new Promise((resolve) => server.close(resolve));
  await instance.store.db.close();
  fs.writeFileSync(
    'audit-results/spec-review/boundary-probes-results.json',
    JSON.stringify(
      {
        at: new Date().toISOString(),
        scope:
          'Frozen snapshot; synthetic records in disposable local PostgreSQL schema; external providers disabled',
        observations,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(observations, null, 2));
}
