import { randomUUID, randomBytes, createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import express from 'express';
import { chromium } from '@playwright/test';
import { createApp } from '../src/app/app.mjs';

if (!process.env.TEST_DATABASE_URL || process.env.TEST_DATABASE_URL === process.env.DATABASE_URL)
  throw new Error('Dedicated test database required.');
const report = {
  started: new Date().toISOString(),
  boundary:
    'Real Express API and disposable test-database schema. Seeded verified accounts/enterprise access. Payment adapter is a fake: no actual provider, webhooks, money or email.',
  cases: [],
  errors: [],
  providerCalls: [],
};
const prereqOnly = process.argv.includes('--invoice-prereq-only');
const refundOnly = process.argv.includes('--refund-browser-only');
const apiOnly = process.argv.includes('--api-only') || prereqOnly;
const raceOnly = process.argv.includes('--funding-race-only');
let holdInitialization = null;
mkdirSync('test-results/full-ui', { recursive: true });
const save = () =>
  writeFileSync(
    `test-results/full-ui/server-commerce${refundOnly ? '-refund-browser' : prereqOnly ? '-invoice-prereq' : raceOnly ? '-funding-race' : apiOnly ? '-api-only' : ''}.json`,
    JSON.stringify(report, null, 2),
  );
const provider = {
  async initializeTransaction(input) {
    report.providerCalls.push({
      operation: 'initialize',
      amountMinor: input.amountMinor,
      currency: input.currency,
    });
    if (holdInitialization) await holdInitialization.promise;
    return { authorizationUrl: 'https://example.test/audit-checkout' };
  },
  async initiateTransfer(input) {
    report.providerCalls.push({
      operation: 'transfer',
      amountMinor: input.amountMinor,
      currency: input.currency,
    });
    return { providerReference: `audit-transfer-${randomUUID()}` };
  },
  async refundTransaction(input) {
    report.providerCalls.push({ operation: 'refund', amountMinor: input.amountMinor });
    return {};
  },
};
const system = await createApp({
  filename: ':memory:',
  poolMax: 4,
  aiProvider: null,
  mailProvider: {
    async send() {
      throw new Error('Audit must not send mail');
    },
  },
  paymentProvider: () => provider,
  securityKey: Buffer.alloc(32, 3).toString('hex'),
  publicOrigin: 'http://localhost:3000',
  rateLimits: { api: { max: 100000 }, mutation: { max: 10000 }, auth: { max: 10000 } },
  errorLogger(event, fields) {
    report.errors.push({ event, status: fields.status, path: fields.path, error: fields.error });
  },
});
system.app.use(express.static(resolve('dist')));
system.app.get(/.*/, (_req, res) => res.sendFile(resolve('dist/index.html')));
const server = system.app.listen(0, '127.0.0.1');
report.schema = system.store.schema;
await new Promise((done) => server.once('listening', done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const { db } = system.store;
async function account(name) {
  const id = randomUUID(),
    workspace = randomUUID(),
    token = randomBytes(32).toString('hex'),
    now = new Date().toISOString();
  await db
    .prepare(
      'INSERT INTO users (id,email,name,demo,created_at,verified_at,points_balance) VALUES (?,?,?,0,?,?,10000)',
    )
    .run(id, `${name}@example.test`, `Audit ${name}`, now, Date.now());
  await db
    .prepare(
      "INSERT INTO workspaces (id,user_id,name,context,tier,member_limit,plan,plan_status) VALUES (?,?,?,?,?,200,'enterprise','active')",
    )
    .run(workspace, id, `Audit ${name}`, 'Professional', 'enterprise');
  await db
    .prepare("INSERT INTO workspace_members VALUES (?,?,'owner','active',?)")
    .run(workspace, id, Date.now());
  await db
    .prepare('INSERT INTO sessions VALUES (?,?,?,?)')
    .run(createHash('sha256').update(token).digest('hex'), id, Date.now() + 3600000, workspace);
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  context.setDefaultTimeout(120000);
  await context.addCookies([{ name: 'lamid_session', value: token, url: origin }]);
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin === origin ? route.continue() : route.abort(),
  );
  const page = await context.newPage();
  page.on('response', async (response) => {
    if (/\/milestones\/[^/]+\/funding$/.test(new URL(response.url()).pathname)) {
      (report.fundingReads ||= []).push({
        role: name,
        path: new URL(response.url()).pathname,
        status: response.status(),
        body: await response.json().catch(() => null),
      });
    }
  });
  return { id, workspace, context, page };
}
async function testCase(name, run) {
  if (refundOnly && name !== 'Refund disputed held escrow') return;
  if (prereqOnly && name !== 'Invoice request on an unapproved milestone') return;
  if (raceOnly && name !== 'Concurrent funding initialization') return;
  const row = { name, outcome: 'unconfirmed' };
  report.cases.push(row);
  save();
  console.log(`Server commerce: ${name}`);
  try {
    Object.assign(row, await run());
  } catch (error) {
    row.outcome = 'failed-or-unconfirmed';
    row.error = error.message;
    row.pages = [];
    for (const context of browser.contexts())
      for (const page of context.pages()) {
        if (page.url() === 'about:blank') continue;
        row.pages.push({
          url: page.url().replace(origin, ''),
          text: await page
            .locator('body')
            .innerText({ timeout: 2000 })
            .catch(() => 'Unavailable'),
        });
      }
  }
  save();
}
try {
  const client = await account('client'),
    freelancer = await account('freelancer');
  const job = randomUUID(),
    project = randomUUID(),
    invoiceMilestone = randomUUID(),
    pending = randomUUID(),
    release = randomUUID(),
    refund = randomUUID(),
    now = new Date().toISOString();
  await db
    .prepare(
      "INSERT INTO job_posts (id,workspace_id,client_user_id,title,category,project_type,description,deliverables,budget_min,budget_max,currency,timeline,status,created_at) VALUES (?,?,?,'Audit scoped work','Software engineering','Fixed-scope project','A scoped audit task with explicit evidence.','Document and tested output',1000,2000,'NGN','Two weeks','open',?)",
    )
    .run(job, client.workspace, client.id, Date.now());
  for (let i = 0; i < 2; i++)
    await db
      .prepare(
        'INSERT INTO job_posts (id,workspace_id,client_user_id,title,category,project_type,description,deliverables,budget_min,budget_max,currency,timeline,status,created_at,tags) SELECT ?,workspace_id,client_user_id,title,category,project_type,description,deliverables,budget_min,budget_max,currency,timeline,status,created_at,tags FROM job_posts WHERE id = ?',
      )
      .run(randomUUID(), job);
  await db
    .prepare(
      "INSERT INTO projects (id,workspace_id,job_id,title,status,created_at,freelancer_user_id) VALUES (?,?,?,'Audit project','active',?,?)",
    )
    .run(project, client.workspace, job, now, freelancer.id);
  for (const [id, title, status] of [
    [invoiceMilestone, 'Approved invoice milestone', 'approved'],
    [pending, 'Fundable milestone', 'planned'],
    [release, 'Release milestone', 'approved'],
    [refund, 'Refund milestone', 'disputed'],
  ])
    await db
      .prepare(
        'INSERT INTO milestones (id,project_id,title,amount,currency,status,created_at) VALUES (?,?,?,1200,?,?,?)',
      )
      .run(id, project, title, 'NGN', status, now);
  for (const id of [release, refund])
    await db
      .prepare(
        "INSERT INTO milestone_fundings (id,milestone_id,workspace_id,provider,amount_minor,currency,provider_reference,status,created_at,held_at,provider_amount_minor,provider_currency) VALUES (?,?,?,'paystack',120000,'NGN',?,'held',?,?,120000,'NGN')",
      )
      .run(randomUUID(), id, client.workspace, `audit-${randomUUID()}`, now, now);
  // Refund dispatch now requires both project parties to have accepted a refund resolution.
  const refundDispute = randomUUID();
  await db
    .prepare(
      "INSERT INTO disputes (id,subject_type,subject_id,opened_by,reason,status,created_at) VALUES (?,'milestone',?,?,'Audit agreement','resolved_refund',?)",
    )
    .run(refundDispute, refund, client.id, now);
  await db
    .prepare(
      "INSERT INTO records (id,workspace_id,kind,data,created_at) VALUES (?,?,'dispute_resolution',?,?)",
    )
    .run(
      randomUUID(),
      client.workspace,
      JSON.stringify({
        disputeId: refundDispute,
        outcome: 'refund',
        status: 'accepted',
        proposedBy: client.id,
        respondedBy: freelancer.id,
      }),
      now,
    );
  await db
    .prepare(
      "INSERT INTO payment_accounts (id,user_id,provider,account_name,account_number,bank_code,recipient_code,created_at) VALUES (?,?,'paystack','Audit recipient','audit-encrypted-placeholder','audit-bank','audit-recipient',?)",
    )
    .run(randomUUID(), freelancer.id, now);
  await testCase('Browser invoice generation', async () => {
    if (apiOnly) {
      const generated = await freelancer.context.request.post(`${origin}/api/companion/messages`, {
        data: {
          message: 'Generate invoice from this approved milestone',
          agentId: 'invoice-generator',
          milestoneId: invoiceMilestone,
        },
        timeout: 90000,
      });
      const body = await generated.json();
      if (!generated.ok()) return { outcome: 'http-error', status: generated.status(), body };
      const pdf = await freelancer.context.request.get(
        `${origin}/api/agent-runs/${body.runId}/pdf`,
        { timeout: 90000 },
      );
      const bytes = await pdf.body();
      return {
        outcome:
          pdf.ok() && bytes.subarray(0, 5).toString() === '%PDF-'
            ? 'invoice-and-pdf-api-confirmed-ui-not-tested'
            : 'pdf-failed',
        status: generated.status(),
        body,
        pdfStatus: pdf.status(),
        pdfType: pdf.headers()['content-type'],
        pdfBytes: bytes.length,
        magic: bytes.subarray(0, 5).toString(),
      };
    }
    const page = freelancer.page;
    page.setDefaultTimeout(60000);
    await page.goto(`${origin}/os/commercial/projects/${project}`);
    const card = page
      .locator('li.activity-feed-row')
      .filter({ has: page.getByText('Approved invoice milestone', { exact: true }) });
    const response = page
      .waitForResponse((response) => response.url().endsWith('/api/companion/messages'), {
        timeout: 90000,
      })
      .catch(() => null);
    await card.getByRole('button', { name: 'Generate invoice', exact: true }).click();
    const generated = await response;
    if (!generated) throw new Error('No invoice response observed.');
    const body = await generated.json();
    const link = card.getByRole('link', { name: 'Download invoice PDF', exact: true });
    if (!generated.ok()) return { outcome: 'http-error', status: generated.status(), body };
    await link.waitFor();
    const pdf = await freelancer.context.request.get(`${origin}${await link.getAttribute('href')}`);
    const bytes = await pdf.body();
    const downloadEvent = page.waitForEvent('download', { timeout: 12000 }).catch(() => null);
    await link.click();
    const download = await downloadEvent;
    return {
      outcome:
        bytes.subarray(0, 5).toString() === '%PDF-' && download
          ? 'browser-generation-and-pdf-download-confirmed'
          : 'partial',
      status: generated.status(),
      runId: body.runId,
      response: body.response,
      pdfStatus: pdf.status(),
      pdfType: pdf.headers()['content-type'],
      pdfBytes: bytes.length,
      magic: bytes.subarray(0, 5).toString(),
      browserDownload: download?.suggestedFilename(),
      errors: await page.locator('.form-error,.activity-feed-error').allTextContents(),
    };
  });
  await testCase('Recorded-budget estimate agent', async () => {
    const response = await client.context.request.post(`${origin}/api/companion/messages`, {
      data: { message: 'Estimate this recorded job', agentId: 'estimate-generator', jobId: job },
      timeout: 45000,
    });
    return {
      outcome: response.ok() ? 'real-api-result' : 'http-error',
      status: response.status(),
      body: await response.json(),
    };
  });
  await testCase('History-based budget estimator API', async () => {
    const response = await client.context.request.post(`${origin}/api/jobs/estimate`, {
      data: {
        category: 'Software engineering',
        projectType: 'Fixed-scope project',
        tags: [],
        currency: 'NGN',
      },
    });
    return {
      outcome: response.ok() ? 'real-api-result' : 'http-error',
      status: response.status(),
      body: await response.json(),
    };
  });
  await testCase('Fund milestone browser button', async () => {
    if (apiOnly) {
      const response = await client.context.request.post(
        `${origin}/api/milestones/${pending}/fund`,
        { data: {}, timeout: 90000 },
      );
      return {
        outcome: response.ok()
          ? 'api-fake-provider-checkout-initiated-ui-not-tested'
          : 'http-error',
        status: response.status(),
        body: await response.json(),
        funding: await db
          .prepare(
            'SELECT status,amount_minor,currency FROM milestone_fundings WHERE milestone_id = ?',
          )
          .get(pending),
      };
    }
    const page = client.page;
    page.setDefaultTimeout(60000);
    await page.goto(`${origin}/os/commercial/projects/${project}`);
    const response = page
      .waitForResponse((response) => response.url().endsWith(`/milestones/${pending}/fund`), {
        timeout: 90000,
      })
      .catch(() => null);
    const card = page
      .locator('li.activity-feed-row')
      .filter({ has: page.getByText('Fundable milestone', { exact: true }) });
    await card.getByRole('button', { name: 'Fund milestone', exact: true }).click();
    const result = await response;
    if (!result) throw new Error('No funding response observed.');
    return {
      outcome: result.ok() ? 'fake-provider-checkout-initiated' : 'http-error',
      status: result.status(),
      body: await result.json(),
      funding: await db
        .prepare(
          'SELECT status,amount_minor,currency FROM milestone_fundings WHERE milestone_id = ?',
        )
        .get(pending),
    };
  });
  for (const [name, id, button, endpoint, table] of [
    ['Release approved held escrow', release, 'Release payment', 'release', 'milestone_fundings'],
    ['Refund disputed held escrow', refund, 'Request refund', 'refund', 'milestone_fundings'],
  ])
    await testCase(name, async () => {
      if (apiOnly) {
        const response = await client.context.request.post(
          `${origin}/api/milestones/${id}/${endpoint}`,
          { data: endpoint === 'release' ? { provider: 'paystack' } : {}, timeout: 90000 },
        );
        return {
          outcome: response.ok()
            ? 'api-fake-provider-request-ui-not-tested'
            : 'http-error-or-safety-guard',
          status: response.status(),
          body: await response.json(),
          funding: await db
            .prepare(`SELECT status,amount_minor,currency FROM ${table} WHERE milestone_id = ?`)
            .get(id),
        };
      }
      const page = client.page;
      await page.goto(`${origin}/os/commercial/projects/${project}`);
      const response = page
        .waitForResponse((response) => response.url().endsWith(`/milestones/${id}/${endpoint}`), {
          timeout: 90000,
        })
        .catch(() => null);
      await page.getByRole('button', { name: button, exact: true }).click();
      const result = await response;
      if (!result) throw new Error('No payment response observed.');
      return {
        outcome: result.ok() ? 'fake-provider-request-recorded' : 'http-error',
        status: result.status(),
        body: await result.json(),
        funding: await db
          .prepare(`SELECT status,amount_minor,currency FROM ${table} WHERE milestone_id = ?`)
          .get(id),
      };
    });
  if (apiOnly) {
    for (const [name, id, endpoint] of [
      ['Duplicate funding', pending, 'fund'],
      ['Duplicate release', release, 'release'],
      ['Duplicate refund', refund, 'refund'],
    ])
      await testCase(name, async () => {
        const before = report.providerCalls.length;
        const response = await client.context.request.post(
          `${origin}/api/milestones/${id}/${endpoint}`,
          { data: endpoint === 'release' ? { provider: 'paystack' } : {}, timeout: 90000 },
        );
        return {
          outcome:
            !response.ok() && report.providerCalls.length === before
              ? 'duplicate-blocked-without-another-provider-call'
              : 'unexpected',
          status: response.status(),
          body: await response.json(),
          additionalProviderCalls: report.providerCalls.length - before,
        };
      });
    await testCase('Invoice request on an unapproved milestone', async () => {
      const before = await db
        .prepare('SELECT points_balance FROM users WHERE id = ?')
        .get(freelancer.id);
      const response = await freelancer.context.request.post(`${origin}/api/companion/messages`, {
        data: {
          message: 'Invoice this milestone',
          agentId: 'invoice-generator',
          milestoneId: pending,
        },
        timeout: 90000,
      });
      const after = await db
        .prepare('SELECT points_balance FROM users WHERE id = ?')
        .get(freelancer.id);
      assert.equal(response.status(), 422);
      assert.equal(before.points_balance, after.points_balance);
      return {
        outcome: 'unapproved-invoice-rejected-without-charge',
        status: response.status(),
        body: await response.json(),
        pointsDeducted: before.points_balance - after.points_balance,
      };
    });
    await testCase('Unrelated account cannot invoice another project', async () => {
      const outsider = await account('outsider');
      const response = await outsider.context.request.post(`${origin}/api/companion/messages`, {
        data: {
          message: 'Invoice this milestone',
          agentId: 'invoice-generator',
          milestoneId: invoiceMilestone,
        },
        timeout: 90000,
      });
      return {
        outcome: response.status() === 403 ? 'unauthorized-account-blocked' : 'unexpected',
        status: response.status(),
        body: await response.json(),
      };
    });
    await testCase('Concurrent funding initialization', async () => {
      const milestone = randomUUID();
      await db
        .prepare(
          "INSERT INTO milestones (id,project_id,title,amount,currency,status,created_at) VALUES (?,?,'Concurrent funding probe',700,'NGN','planned',?)",
        )
        .run(milestone, project, new Date().toISOString());
      let releaseHold;
      holdInitialization = {
        promise: new Promise((done) => {
          releaseHold = done;
        }),
      };
      const timeout = setTimeout(() => releaseHold(), 30000);
      const before = report.providerCalls.filter((row) => row.operation === 'initialize').length;
      const send = () =>
        client.context.request
          .post(`${origin}/api/milestones/${milestone}/fund`, { data: {}, timeout: 90000 })
          .catch((error) => ({ auditError: error.message }));
      try {
        const first = send();
        const firstDeadline = Date.now() + 20000;
        while (
          report.providerCalls.filter((row) => row.operation === 'initialize').length === before &&
          Date.now() < firstDeadline
        )
          await new Promise((done) => setTimeout(done, 50));
        const firstInFlight = await db
          .prepare('SELECT status FROM milestone_fundings WHERE milestone_id = ?')
          .all(milestone);
        const second = send();
        const deadline = Date.now() + 20000;
        while (
          report.providerCalls.filter((row) => row.operation === 'initialize').length <
            before + 2 &&
          Date.now() < deadline
        )
          await new Promise((done) => setTimeout(done, 50));
        releaseHold();
        holdInitialization = null;
        const responses = await Promise.all([first, second]);
        const results = [];
        for (const response of responses)
          results.push(
            response.auditError
              ? response
              : { status: response.status(), body: await response.json() },
          );
        const fundings = await db
          .prepare(
            'SELECT status,amount_minor,currency FROM milestone_fundings WHERE milestone_id = ?',
          )
          .all(milestone);
        const calls =
          report.providerCalls.filter((row) => row.operation === 'initialize').length - before;
        return {
          outcome:
            calls > 1
              ? 'duplicate-checkout-initialization-confirmed'
              : 'one-provider-initialization',
          firstInFlight,
          results,
          fundings,
          providerInitializations: calls,
        };
      } finally {
        clearTimeout(timeout);
        releaseHold();
        holdInitialization = null;
      }
    });
  }
} finally {
  report.finished = new Date().toISOString();
  save();
  await browser.close();
  await new Promise((done) => server.close(done));
  await system.store.dropSchema();
}
if (prereqOnly || refundOnly) {
  assert.equal(report.cases.length, 1);
  assert.equal(
    report.cases[0].outcome,
    prereqOnly ? 'unapproved-invoice-rejected-without-charge' : 'fake-provider-request-recorded',
  );
}
