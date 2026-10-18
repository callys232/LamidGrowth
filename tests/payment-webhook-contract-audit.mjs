import express from 'express';
import { randomUUID, createHmac } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { openDemoTestStore } from './demo-test-store.mjs';
import { mountPaystackWebhook, paystackProvider } from '../src/app/payments.mjs';
const report = {
  started: new Date().toISOString(),
  boundary:
    'Actual webhook handler, real signature verifier, isolated test database, synthetic signed events. No provider API or money. Documented refund.pending payload fields verified against https://paystack.com/docs/payments/refunds/; transfer.reversed is a documented event type.',
  cases: [],
};
const store = await openDemoTestStore();
const app = express();
app.use(
  express.json({
    verify(req, _res, buffer) {
      req.rawBody = buffer;
    },
  }),
);
const secret = 'audit-only-signing-secret';
const provider = paystackProvider({
  secretKey: secret,
  fetchImpl: () => {
    throw new Error('No provider API calls allowed');
  },
});
mountPaystackWebhook(app, store, { paymentProvider: () => provider });
app.use((error, _req, res, _next) =>
  res.status(error.status || 500).json({ error: error.message }),
);
const server = app.listen(0, '127.0.0.1');
await new Promise((done) => server.once('listening', done));
try {
  const user = randomUUID(),
    workspace = randomUUID(),
    project = randomUUID(),
    refund = randomUUID(),
    paid = randomUUID(),
    now = new Date().toISOString(),
    refundRef = `audit-refund-${randomUUID()}`,
    transferRef = `audit-transfer-${randomUUID()}`;
  await store.db
    .prepare('INSERT INTO users (id,name,demo,created_at) VALUES (?,?,0,?)')
    .run(user, 'Webhook audit', now);
  await store.db
    .prepare(
      'INSERT INTO workspaces (id,user_id,name,context,tier,member_limit) VALUES (?,?,?,?,?,1)',
    )
    .run(workspace, user, 'Webhook audit', 'Professional', 'enterprise');
  await store.db
    .prepare('INSERT INTO projects (id,workspace_id,title,status,created_at) VALUES (?,?,?,?,?)')
    .run(project, workspace, 'Webhook audit project', 'active', now);
  for (const [id, status] of [
    [refund, 'disputed'],
    [paid, 'paid'],
  ])
    await store.db
      .prepare(
        'INSERT INTO milestones (id,project_id,title,amount,currency,status,created_at) VALUES (?,?,?,1200,?,?,?)',
      )
      .run(id, project, 'Webhook audit milestone', 'NGN', status, now);
  for (const [id, status, ref] of [
    [refund, 'refund_pending', refundRef],
    [paid, 'released', `audit-funding-${randomUUID()}`],
  ])
    await store.db
      .prepare(
        "INSERT INTO milestone_fundings (id,milestone_id,workspace_id,provider,amount_minor,currency,provider_reference,status,created_at) VALUES (?,?,?,'paystack',120000,'NGN',?,?,?)",
      )
      .run(randomUUID(), id, workspace, ref, status, now);
  await store.db
    .prepare(
      "INSERT INTO payment_transfers (id,workspace_id,milestone_id,provider,amount_minor,currency,status,provider_reference,created_at,updated_at) VALUES (?,?,?,'paystack',120000,'NGN','succeeded',?,?,?)",
    )
    .run(randomUUID(), workspace, paid, transferRef, now, now);
  async function send(event, valid = true) {
    const body = JSON.stringify(event);
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/api/webhooks/paystack`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-paystack-signature': valid
            ? createHmac('sha512', secret).update(body).digest('hex')
            : 'invalid',
        },
        body,
      },
    );
    return { status: response.status, body: await response.json() };
  }
  const documented = {
    event: 'refund.pending',
    data: {
      status: 'pending',
      transaction_reference: refundRef,
      refund_reference: null,
      amount: '120000',
      currency: 'NGN',
      processor: 'instant-transfer',
      customer: { first_name: 'Audit', last_name: 'Visitor', email: 'audit@example.test' },
      domain: 'test',
    },
  };
  report.cases.push({ name: 'Invalid signature', response: await send(documented, false) });
  report.cases.push({
    name: 'Documented refund.pending correlation field',
    response: await send(documented),
    funding: await store.db
      .prepare('SELECT status FROM milestone_fundings WHERE milestone_id = ?')
      .get(refund),
  });
  const reversed = {
    event: 'transfer.reversed',
    data: { reference: transferRef, amount: 120000, currency: 'NGN', status: 'reversed' },
  };
  const before = await store.db
    .prepare('SELECT status FROM payment_transfers WHERE provider_reference = ?')
    .get(transferRef);
  const response = await send(reversed);
  const after = await store.db
    .prepare('SELECT status FROM payment_transfers WHERE provider_reference = ?')
    .get(transferRef);
  report.cases.push({
    name: 'Signed transfer.reversed',
    before,
    response,
    after,
    milestone: await store.db.prepare('SELECT status FROM milestones WHERE id = ?').get(paid),
    funding: await store.db
      .prepare('SELECT status FROM milestone_fundings WHERE milestone_id = ?')
      .get(paid),
  });
  report.cases.push({ name: 'Duplicate reversal event', response: await send(reversed) });
  report.cases.push({
    name: 'Reference-shaped processed refund with partial amount',
    boundary:
      'Synthetic diagnostic shape expected by the handler, not a claim that this is the documented processor payload.',
    response: await send({
      event: 'refund.processed',
      data: { reference: refundRef, amount: 1, currency: 'NGN' },
    }),
    funding: await store.db
      .prepare('SELECT status,amount_minor FROM milestone_fundings WHERE milestone_id = ?')
      .get(refund),
  });
} finally {
  report.finished = new Date().toISOString();
  writeFileSync(
    'lamiddoc/test-results/full-ui/payment-webhook-contract.json',
    JSON.stringify(report, null, 2),
  );
  await new Promise((done) => server.close(done));
  await store.dropSchema();
}
console.log(JSON.stringify(report, null, 2));
