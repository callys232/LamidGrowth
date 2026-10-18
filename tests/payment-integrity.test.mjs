import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { randomUUID, createHmac } from 'node:crypto';
import { openDemoTestStore } from './demo-test-store.mjs';
import {
  mountPayments,
  mountPointsPurchase,
  mountPaystackWebhook,
  paystackProvider,
} from '../src/app/payments.mjs';

test(
  'payment claims, refund agreement, webhook reconciliation and custom entitlements',
  { timeout: 240000 },
  async (t) => {
    const store = await openDemoTestStore(),
      db = store.db;
    t.after(() => store.dropSchema());
    // The lightweight test store omits unrelated plan migrations; charge hooks still query this table.
    await db
      .prepare('CREATE TABLE IF NOT EXISTS plan_payments (provider_reference TEXT, status TEXT)')
      .run();
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS workspace_agent_entitlements (workspace_id TEXT NOT NULL, agent_id TEXT NOT NULL, source TEXT NOT NULL, granted_at TEXT NOT NULL, PRIMARY KEY (workspace_id,agent_id,source))`,
      )
      .run();
    for (const table of ['milestone_fundings', 'points_purchases', 'payment_transfers']) {
      await db
        .prepare(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS provider_amount_minor INTEGER`)
        .run();
      await db
        .prepare(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS provider_currency TEXT`)
        .run();
    }
    const user = randomUUID(),
      other = randomUUID(),
      workspace = randomUUID(),
      job = randomUUID(),
      project = randomUUID(),
      milestone = randomUUID(),
      now = new Date().toISOString();
    for (const id of [user, other])
      await db
        .prepare('INSERT INTO users (id,name,demo,created_at) VALUES (?, ?, 0, ?)')
        .run(id, 'Payment test', now);
    await db
      .prepare(
        "INSERT INTO workspaces (id,user_id,name,context,tier,member_limit) VALUES (?,?,'Payment test','Professional','individual',1)",
      )
      .run(workspace, user);
    await db
      .prepare(
        "INSERT INTO job_posts (id,workspace_id,client_user_id,title,category,project_type,description,deliverables,budget_min,budget_max,currency,timeline,status,created_at) VALUES (?,?,?,'Test','Software engineering','Fixed-scope project','Test','Test',100,200,'NGN','1 week','open',?)",
      )
      .run(job, workspace, user, Date.now());
    await db
      .prepare(
        "INSERT INTO projects (id,workspace_id,job_id,title,status,freelancer_user_id,created_at) VALUES (?,?,?,'Test','active',?,?)",
      )
      .run(project, workspace, job, other, now);
    await db
      .prepare(
        "INSERT INTO milestones (id,project_id,title,amount,currency,status,created_at) VALUES (?,?,'Test',1200,'NGN','planned',?)",
      )
      .run(milestone, project, now);
    let dispatches = 0,
      refunds = 0,
      releaseProvider,
      enteredProvider;
    const entered = new Promise((resolve) => (enteredProvider = resolve)),
      held = new Promise((resolve) => (releaseProvider = resolve));
    const secret = 'regression-only-secret';
    const verifier = paystackProvider({ secretKey: secret });
    const provider = {
      ...verifier,
      async initializeTransaction() {
        dispatches++;
        enteredProvider();
        await held;
        return { authorizationUrl: 'https://example.test/checkout' };
      },
      async refundTransaction() {
        refunds++;
        return {};
      },
    };
    const deps = { paymentProvider: () => provider };
    const app = express();
    app.use(
      express.json({
        verify(req, _res, b) {
          req.rawBody = b;
        },
      }),
    );
    app.use((req, _res, next) => {
      req.user = { id: user, name: 'Payment test', email: 'audit@example.test' };
      req.workspace = { id: workspace };
      next();
    });
    mountPayments(app, store, deps);
    mountPointsPurchase(app, store, deps);
    mountPaystackWebhook(app, store, deps);
    app.use((error, _req, res, _next) =>
      res.status(error.status || 500).json({ error: error.message }),
    );
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const base = `http://127.0.0.1:${server.address().port}`;
    async function post(path, data, signature) {
      const body = JSON.stringify(data);
      const response = await fetch(base + '/api' + path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(signature
            ? { 'x-paystack-signature': createHmac('sha512', secret).update(body).digest('hex') }
            : {}),
        },
        body,
      });
      return { status: response.status, body: await response.json() };
    }
    const hook = (data) => post('/webhooks/paystack', data, true);
    await t.test('overlapping funding requests dispatch only once', async () => {
      const first = post(`/milestones/${milestone}/fund`, {});
      try {
        await entered;
        const second = await post(`/milestones/${milestone}/fund`, {});
        assert.equal(second.status, 409);
        assert.equal(dispatches, 1);
      } finally {
        releaseProvider();
      }
      assert.equal((await first).status, 201);
      assert.equal(
        (
          await db
            .prepare('SELECT COUNT(*)::int AS n FROM milestone_fundings WHERE milestone_id = ?')
            .get(milestone)
        ).n,
        1,
      );
    });
    const funding = await db
      .prepare('SELECT * FROM milestone_fundings WHERE milestone_id = ?')
      .get(milestone);
    await db.prepare("UPDATE milestone_fundings SET status='held' WHERE id=?").run(funding.id);
    await db.prepare("UPDATE milestones SET status='disputed' WHERE id=?").run(milestone);
    await t.test('refund requires an accepted agreement from the other party', async () => {
      assert.equal((await post(`/milestones/${milestone}/refund`, {})).status, 409);
      assert.equal(refunds, 0);
      const dispute = randomUUID();
      await db
        .prepare(
          "INSERT INTO disputes (id,subject_type,subject_id,opened_by,reason,status,created_at) VALUES (?,'milestone',?,?,'Test','resolved_refund',?)",
        )
        .run(dispute, milestone, user, now);
      await db
        .prepare(
          "INSERT INTO records (id,workspace_id,kind,data,created_at) VALUES (?,?,'dispute_resolution',?,?)",
        )
        .run(
          randomUUID(),
          workspace,
          JSON.stringify({
            disputeId: dispute,
            status: 'accepted',
            outcome: 'refund',
            proposedBy: user,
            respondedBy: other,
          }),
          now,
        );
      assert.equal((await post(`/milestones/${milestone}/refund`, {})).status, 201);
      assert.equal(refunds, 1);
    });
    await t.test(
      'documented refund reference correlates; partial amount cannot mark a full refund',
      async () => {
        assert.equal(
          (
            await hook({
              event: 'refund.pending',
              data: {
                transaction_reference: funding.provider_reference,
                amount: '120000',
                currency: 'NGN',
              },
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await hook({
              event: 'refund.processed',
              data: {
                transaction_reference: funding.provider_reference,
                amount: '1',
                currency: 'NGN',
              },
            })
          ).status,
          200,
        );
        assert.equal(
          (await db.prepare('SELECT status FROM milestone_fundings WHERE id=?').get(funding.id))
            .status,
          'reconciliation_required',
        );
      },
    );
    await t.test('reversal clears paid state and a delayed success cannot restore it', async () => {
      const reference = 'transfer-' + randomUUID();
      await db
        .prepare("UPDATE milestone_fundings SET status='released' WHERE id=?")
        .run(funding.id);
      await db.prepare("UPDATE milestones SET status='paid' WHERE id=?").run(milestone);
      await db
        .prepare(
          "INSERT INTO payment_transfers (id,workspace_id,milestone_id,provider,amount_minor,currency,status,provider_reference,created_at,updated_at) VALUES (?,?,?,'paystack',120000,'NGN','succeeded',?,?,?)",
        )
        .run(randomUUID(), workspace, milestone, reference, now, now);
      const event = {
        event: 'transfer.reversed',
        data: { reference, amount: 120000, currency: 'NGN' },
      };
      assert.equal((await hook(event)).status, 200);
      assert.equal((await hook(event)).body.deduplicated, true);
      await hook({ ...event, event: 'transfer.success' });
      assert.equal(
        (await db.prepare('SELECT status FROM milestones WHERE id=?').get(milestone)).status,
        'payment_review',
      );
      assert.equal(
        (
          await db
            .prepare('SELECT status FROM payment_transfers WHERE provider_reference=?')
            .get(reference)
        ).status,
        'reversed',
      );
    });
    await t.test(
      'custom selection uses catalog prices and grants access only on confirmed payment',
      async () => {
        const tool = 'audit-tool';
        await db
          .prepare(
            "INSERT INTO agent_manifests (id,name,home_engine,max_authority,human_gate,allowed_tool_ids,created_at,points_cost) VALUES (?,'Test','Test','advisory','none','[]',?,35)",
          )
          .run(tool, now);
        await db
          .prepare("INSERT INTO fx_rates (pair,rate,updated_at) VALUES ('USD_NGN',1500,?)")
          .run(now);
        const invalid = await post('/points/purchase', { toolIds: ['unknown'], extraPoints: 50 });
        assert.equal(invalid.status, 400);
        const response = await post('/points/purchase', { toolIds: [tool, tool], extraPoints: 50 });
        assert.equal(response.status, 201);
        assert.equal(response.body.points, 85);
        assert.equal(response.body.amountMinor, 850);
        assert.equal(
          (
            await db
              .prepare(
                'SELECT COUNT(*)::int AS n FROM workspace_agent_entitlements WHERE workspace_id=?',
              )
              .get(workspace)
          ).n,
          0,
        );
        const event = {
          event: 'charge.success',
          data: { reference: response.body.reference, amount: 1275000, currency: 'NGN' },
        };
        assert.equal((await hook(event)).status, 200);
        assert.equal((await hook(event)).body.deduplicated, true);
        assert.equal(
          (
            await db
              .prepare(
                'SELECT COUNT(*)::int AS n FROM workspace_agent_entitlements WHERE workspace_id=? AND agent_id=?',
              )
              .get(workspace, tool)
          ).n,
          1,
        );
        assert.equal(
          (await db.prepare('SELECT points_balance FROM users WHERE id=?').get(user))
            .points_balance,
          85,
        );
      },
    );
  },
);
