import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { openDemoTestStore } from './demo-test-store.mjs';
import { mountPaymentOperations } from '../src/app/paymentOperations.mjs';
import { paystackProvider } from '../src/app/payments.mjs';

test('provider inspection correlates refunds using the provider transaction, without sending money', async () => {
  const calls = [];
  const provider = paystackProvider({
    secretKey: 'test-only',
    fetchImpl: async (url, options) => {
      calls.push({ url, method: options.method || 'GET' });
      return {
        ok: true,
        json: async () => ({
          status: true,
          data: url.includes('/refund/')
            ? { transaction: 123, status: 'processed', amount: 10000, currency: 'NGN', id: 456 }
            : { reference: 'funding-ref', status: 'success', amount: 10000, currency: 'NGN' },
        }),
      };
    },
  });
  const result = await provider.inspectPayment({
    kind: 'refund',
    reference: 'funding-ref',
    refundId: '456',
  });
  assert.equal(result.reference, 'funding-ref');
  assert.equal(result.status, 'processed');
  assert.deepEqual(
    calls.map((c) => c.method),
    ['GET', 'GET'],
  );
  assert.ok(calls[1].url.endsWith('/transaction/123'));
  await assert.rejects(() => provider.inspectPayment({ kind: 'refund', refundId: '../../other' }));
});

test(
  'payment reviews enforce tenant and operator boundaries, evidence matching and optimistic concurrency',
  { timeout: 240000 },
  async (t) => {
    const store = await openDemoTestStore(),
      db = store.db;
    t.after(() => store.dropSchema());
    for (const table of ['milestone_fundings', 'payment_transfers'])
      for (const col of ['provider_amount_minor INTEGER', 'provider_currency TEXT'])
        await db.prepare(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col}`).run();
    const owner = randomUUID(),
      operator = randomUUID(),
      other = randomUUID(),
      workspace = randomUUID(),
      outside = randomUUID(),
      project = randomUUID(),
      milestone = randomUUID(),
      refundMilestone = randomUUID(),
      funding = randomUUID(),
      refund = randomUUID(),
      transfer = randomUUID(),
      now = new Date().toISOString();
    for (const id of [owner, operator, other])
      await db
        .prepare('INSERT INTO users (id,name,demo,created_at) VALUES (?, ?,0,?)')
        .run(id, 'Operations test', now);
    for (const [id, user] of [
      [workspace, owner],
      [outside, other],
    ])
      await db
        .prepare(
          "INSERT INTO workspaces (id,user_id,name,context,tier,member_limit) VALUES (?,?,'Operations test','Professional','enterprise',1)",
        )
        .run(id, user);
    await db
      .prepare(
        "INSERT INTO projects (id,workspace_id,title,status,created_at) VALUES (?,?,'Operations test','active',?)",
      )
      .run(project, workspace, now);
    for (const id of [milestone, refundMilestone])
      await db
        .prepare(
          "INSERT INTO milestones (id,project_id,title,amount,currency,status,created_at) VALUES (?,?,'Operations test',100,'NGN','releasing',?)",
        )
        .run(id, project, now);
    for (const [id, mid, status, reference] of [
      [funding, milestone, 'awaiting_provider', 'charge-ref'],
      [refund, refundMilestone, 'refund_pending', 'refund-ref'],
    ])
      await db
        .prepare(
          "INSERT INTO milestone_fundings (id,milestone_id,workspace_id,provider,amount_minor,currency,provider_reference,status,created_at) VALUES (?,?,?,'paystack',10000,'NGN',?,?,?)",
        )
        .run(id, mid, workspace, reference, status, now);
    await db
      .prepare(
        "INSERT INTO payment_transfers (id,workspace_id,milestone_id,provider,amount_minor,currency,provider_reference,status,created_at,updated_at) VALUES (?,?,?,'paystack',10000,'NGN','transfer-ref','unknown',?,?)",
      )
      .run(transfer, workspace, milestone, now, now);
    let evidence = {},
      providerCalls = 0;
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      const role = req.headers['x-audit-role'] || 'owner';
      req.user = {
        id: role === 'operator' ? operator : role === 'other' ? other : owner,
        email: role === 'operator' ? 'operator@example.test' : 'owner@example.test',
        name: 'Operations test',
        demo: false,
      };
      req.workspace = { id: role === 'other' ? outside : workspace, role: 'owner' };
      next();
    });
    await mountPaymentOperations(app, store, {
      ecosystemAdminEmails: ['operator@example.test'],
      paymentProvider: () => ({
        inspectPayment: async () => {
          providerCalls++;
          return evidence;
        },
      }),
    });
    app.use((error, _req, res, _next) =>
      res.status(error.status || 500).json({ error: error.message }),
    );
    const server = app.listen(0, '127.0.0.1');
    await new Promise((done) => server.once('listening', done));
    t.after(() => new Promise((done) => server.close(done)));
    const base = `http://127.0.0.1:${server.address().port}/api/finance/payment-reviews`;
    async function request(path = '', data, role = 'owner', method = 'POST') {
      const response = await fetch(base + path, {
        method: data === undefined ? 'GET' : method,
        headers: { 'Content-Type': 'application/json', 'x-audit-role': role },
        body: data === undefined ? undefined : JSON.stringify(data),
      });
      return { status: response.status, body: await response.json() };
    }
    const note = 'Reviewed the payment reference and requested provider confirmation.';
    assert.equal((await request('', undefined, 'other')).body.items.length, 0);
    assert.equal((await request(`/funding/${funding}/report`, { note }, 'other')).status, 404);
    assert.equal((await request(`/funding/${funding}/report`, { note })).status, 201);
    assert.equal(
      (await request(`/funding/${funding}/verify`, { version: 1, operation: 'charge', note }))
        .status,
      403,
    );
    assert.equal(providerCalls, 0);
    evidence = { reference: 'wrong-ref', amount: 10000, currency: 'NGN', status: 'success' };
    assert.equal(
      (
        await request(
          `/funding/${funding}/verify`,
          { version: 1, operation: 'charge', note },
          'operator',
        )
      ).body.reconciled,
      false,
    );
    assert.equal(
      (await db.prepare('SELECT status FROM milestone_fundings WHERE id=?').get(funding)).status,
      'awaiting_provider',
    );
    assert.equal(
      (
        await request(
          `/funding/${funding}`,
          { version: 2, status: 'resolved', note },
          'operator',
          'PATCH',
        )
      ).status,
      409,
    );
    evidence = { reference: 'charge-ref', amount: 10000, currency: 'NGN', status: 'success' };
    assert.equal(
      (
        await request(
          `/funding/${funding}/verify`,
          { version: 2, operation: 'charge', note },
          'operator',
        )
      ).body.reconciled,
      true,
    );
    assert.equal(
      (await db.prepare('SELECT status FROM milestone_fundings WHERE id=?').get(funding)).status,
      'held',
    );
    assert.equal(
      (
        await request(
          `/funding/${funding}`,
          { version: 2, status: 'resolved', note },
          'operator',
          'PATCH',
        )
      ).status,
      409,
    );
    evidence = { reference: 'transfer-ref', amount: 1, currency: 'NGN', status: 'success' };
    assert.equal(
      (
        await request(
          `/transfer/${transfer}/verify`,
          { version: 0, operation: 'transfer', note },
          'operator',
        )
      ).body.reconciled,
      false,
    );
    evidence.amount = 10000;
    assert.equal(
      (
        await request(
          `/transfer/${transfer}/verify`,
          { version: 1, operation: 'transfer', note },
          'operator',
        )
      ).body.reconciled,
      true,
    );
    assert.equal(
      (await db.prepare('SELECT status FROM milestones WHERE id=?').get(milestone)).status,
      'paid',
    );
    assert.equal(
      (await db.prepare('SELECT status FROM milestone_fundings WHERE id=?').get(funding)).status,
      'released',
    );
    evidence = { reference: 'refund-ref', amount: 10000, currency: 'NGN', status: 'processed' };
    assert.equal(
      (
        await request(
          `/funding/${refund}/verify`,
          { version: 0, operation: 'refund', refundId: '123', note },
          'operator',
        )
      ).body.reconciled,
      true,
    );
    assert.equal(
      (await db.prepare('SELECT status FROM milestone_fundings WHERE id=?').get(refund)).status,
      'refunded',
    );
    const list = await request('', undefined, 'operator');
    assert.equal(list.body.operator, true);
    assert.equal(list.body.items.length, 3);
    assert.ok(
      (
        await db
          .prepare("SELECT COUNT(*)::int AS n FROM audit WHERE action='Payment review updated'")
          .get()
      ).n >= 5,
    );
  },
);
