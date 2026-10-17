import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import express from 'express';
import { Webhook } from 'svix';
import { mountResendWebhook, recipientHash } from '../src/app/mailDelivery.mjs';
import { mountMailOperations, mailHealth } from '../src/app/mailOperations.mjs';
import { createMailOutbox } from '../src/app/mail.mjs';
import { openDemoTestStore } from './demo-test-store.mjs';
import { pruneRetainedMailAndDemos } from '../src/app/retention.mjs';

test(
  'signed Resend events correlate before acceptance, deduplicate, preserve outcomes and suppress future mail',
  { timeout: 240000 },
  async (t) => {
    if (!process.env.TEST_DATABASE_URL) return t.skip('Dedicated test database required.');
    const store = await openDemoTestStore();
    t.after(() => store.dropSchema());
    const key = Buffer.alloc(32, 7),
      secret = `whsec_${Buffer.alloc(32, 8).toString('base64')}`;
    const lead = randomUUID();
    await store.db
      .prepare('INSERT INTO demo_registrations (id, email, name, created_at) VALUES (?, ?, ?, ?)')
      .run(lead, 'delivery@example.test', 'Delivery Test', Date.now());
    const app = express();
    app.use(
      express.json({
        verify(req, _res, buffer) {
          req.rawBody = buffer;
        },
      }),
    );
    mountResendWebhook(app, store, { key, secret });
    app.use((req, _res, next) => {
      req.user = {
        id: 'test-admin',
        email: req.get('x-admin') ? 'admin@example.test' : 'visitor@example.test',
      };
      next();
    });
    mountMailOperations(app, store, {
      adminEmails: ['admin@example.test'],
      provider: { status: async () => 'delivered' },
    });
    app.use((error, _req, res, _next) =>
      res.status(error.status || 500).json({ error: error.message }),
    );
    const server = await new Promise((resolve) => {
      const value = app.listen(0, '127.0.0.1', () => resolve(value));
    });
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const origin = `http://127.0.0.1:${server.address().port}`;
    async function event(
      type,
      messageId,
      {
        receipt = randomUUID(),
        at = new Date(),
        recipient = 'delivery@example.test',
        headers = {},
        bounce,
        signatureAge = 0,
      } = {},
    ) {
      const payload = JSON.stringify({
        type,
        created_at: at.toISOString(),
        data: {
          email_id: messageId,
          to: [recipient],
          ...(bounce ? { bounce: { type: bounce } } : {}),
        },
      });
      const time = new Date(Date.now() + signatureAge);
      const response = await fetch(`${origin}/api/webhooks/resend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'svix-id': receipt,
          'svix-timestamp': String(Math.floor(time.getTime() / 1000)),
          'svix-signature': new Webhook(secret).sign(receipt, time, payload),
          ...headers,
        },
        body: payload,
      });
      return { status: response.status, body: await response.json() };
    }
    assert.equal(
      (await event('email.delivered', 'invalid', { headers: { 'svix-signature': 'v1,invalid' } }))
        .status,
      401,
    );
    assert.equal((await event('email.delivered', 'old', { signatureAge: -3600000 })).status, 401);
    assert.equal((await event('email.delivered', 'future', { signatureAge: 3600000 })).status, 401);
    const hash = recipientHash('delivery@example.test', key);
    let currentId;
    const provider = {
      async send() {
        // Simulate a fast provider event arriving before the send response is committed.
        const received = await event('email.delivered', currentId);
        assert.equal(received.status, 200);
        assert.ok(!received.body.ignored, JSON.stringify(received.body));
        return { provider: 'resend', messageId: currentId };
      },
    };
    const outbox = createMailOutbox(store, provider, key, () => {}, 'demo_mail_outbox');
    async function enqueue(id = randomUUID(), address = 'delivery@example.test') {
      await outbox.enqueue(
        id,
        lead,
        { to: address, subject: 'Test', text: 'Sample private token, never saved in events' },
        Date.now() + 7 * 86400000,
      );
      return id;
    }
    currentId = randomUUID();
    const queueId = await enqueue();
    await outbox.tick();
    const metadata = () =>
      store.db.prepare('SELECT * FROM mail_messages WHERE queue_id = ?').get(queueId);
    assert.equal((await metadata()).recipient_hash, hash);
    assert.deepEqual(
      (
        await store.db
          .prepare('SELECT event_type FROM mail_provider_events WHERE provider_message_id = ?')
          .all(currentId)
      ).map((row) => row.event_type),
      ['email.delivered'],
    );
    assert.equal((await metadata()).delivery_status, 'delivered');
    assert.equal((await metadata()).provider_message_id, currentId);
    assert.equal((await metadata()).recipient_hash, hash);
    assert.equal(
      (await event('email.sent', currentId, { at: new Date(Date.now() - 1000) })).status,
      200,
    );
    assert.equal((await metadata()).delivery_status, 'delivered');
    const receipt = randomUUID();
    const parallel = await Promise.all([
      event('email.complained', currentId, { receipt }),
      event('email.complained', currentId, { receipt }),
    ]);
    assert.equal(parallel.filter((row) => row.body.duplicate).length, 1);
    assert.equal((await metadata()).delivery_status, 'complained');
    await event('email.delivered', currentId);
    assert.equal((await metadata()).delivery_status, 'complained');
    assert.equal(
      (
        await store.db
          .prepare('SELECT scope FROM mail_suppressions WHERE recipient_hash = ?')
          .get(hash)
      ).scope,
      'all',
    );
    const suppressed = await enqueue();
    await outbox.tick();
    assert.equal(
      (await store.db.prepare('SELECT status FROM demo_mail_outbox WHERE id = ?').get(suppressed))
        .status,
      'suppressed',
    );
    // Transient bounces suppress optional reminders, without blocking account access emails.
    const transient = 'transient@example.test';
    await event('email.bounced', randomUUID(), { recipient: transient, bounce: 'Transient' });
    const optional = await enqueue(`demo-followup:${lead}`, transient);
    await outbox.tick();
    assert.equal(
      (await store.db.prepare('SELECT status FROM demo_mail_outbox WHERE id = ?').get(optional))
        .status,
      'suppressed',
    );
    currentId = randomUUID();
    const allowed = await enqueue(randomUUID(), transient);
    await outbox.tick();
    assert.equal(
      (await store.db.prepare('SELECT status FROM demo_mail_outbox WHERE id = ?').get(allowed))
        .status,
      'sent',
    );
    // Retry after the provider deduplication window is fenced, even for a week-long reminder.
    const expired = await enqueue(randomUUID(), 'late@example.test');
    await store.db
      .prepare(
        'INSERT INTO mail_messages (outbox_table, queue_id, recipient_hash, first_attempt_at, provider, provider_message_id, delivery_status, status_at) VALUES (?, ?, ?, ?, NULL, NULL, ?, ?)',
      )
      .run(
        'demo_mail_outbox',
        expired,
        recipientHash('late@example.test', key),
        Date.now() - 24 * 3600000,
        'pending',
        Date.now(),
      );
    await outbox.tick();
    assert.equal(
      (await store.db.prepare('SELECT status FROM demo_mail_outbox WHERE id = ?').get(expired))
        .status,
      'delivery_unknown',
    );
    assert.equal((await fetch(`${origin}/api/admin/mail/health`)).status, 403);
    const health = await (
      await fetch(`${origin}/api/admin/mail/health`, { headers: { 'x-admin': 'yes' } })
    ).json();
    assert.equal(health.workerHealthy, false);
    assert.ok(health.warnings.length);
    await store.db
      .prepare('INSERT INTO mail_worker_health VALUES (?, ?, ?, NULL)')
      .run('test-worker', Date.now(), Date.now());
    assert.equal((await mailHealth(store)).workerHealthy, true);
    const reconciled = await fetch(`${origin}/api/admin/mail/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin': 'yes' },
      body: JSON.stringify({ table: 'demo_mail_outbox', queueId }),
    });
    assert.equal(reconciled.status, 200, await reconciled.text());
    assert.equal(
      (await metadata()).delivery_status,
      'complained',
      'Reconciliation must not clear a complaint',
    );
    const ack = await fetch(`${origin}/api/admin/mail/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin': 'yes' },
      body: JSON.stringify({
        table: 'demo_mail_outbox',
        queueId: expired,
        reason: 'Provider logs reviewed; recipient will request a fresh link.',
      }),
    });
    assert.equal(ack.status, 200);
    assert.equal((await ack.json()).deliveryConfirmed, false);
    const messages = await (
      await fetch(`${origin}/api/admin/mail/messages`, { headers: { 'x-admin': 'yes' } })
    ).json();
    assert.ok(
      messages.some(
        (message) =>
          message.queue_id === expired && message.queue_status === 'reviewed_delivery_unknown',
      ),
    );
    assert.ok(messages.every((message) => !('payload' in message) && !('email' in message)));
    const reviewed = await fetch(`${origin}/api/admin/mail/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin': 'yes' },
      body: JSON.stringify({
        table: 'demo_mail_outbox',
        queueId,
        reason: 'Complaint reviewed; all sending remains suppressed.',
      }),
    });
    assert.equal(reviewed.status, 200);
    assert.ok((await metadata()).reviewed_at);
    assert.equal(
      (
        await store.db
          .prepare('SELECT scope FROM mail_suppressions WHERE recipient_hash = ?')
          .get(hash)
      ).scope,
      'all',
    );
    assert.equal(
      (await store.db.prepare('SELECT status FROM demo_mail_outbox WHERE id = ?').get(expired))
        .status,
      'reviewed_delivery_unknown',
    );
    // Retention is preview-only unless explicitly applied, and preserves strict IP claims.
    const oldLead = randomUUID(),
      old = Date.now() - 100 * 86400000;
    await store.db
      .prepare('INSERT INTO demo_registrations (id, email, name, created_at) VALUES (?, ?, ?, ?)')
      .run(oldLead, 'old@example.test', 'Old Demo', old);
    await store.db
      .prepare('INSERT INTO demo_ip_claims VALUES (?, ?, ?, ?)')
      .run('old-ip-hash', 'old-email-hash', oldLead, old);
    const preview = await pruneRetainedMailAndDemos(store, { demoDays: 60, mailDays: 90 });
    assert.equal(preview.inactiveLeads, 1);
    assert.equal(preview.applied, false);
    assert.ok(
      await store.db.prepare('SELECT id FROM demo_registrations WHERE id = ?').get(oldLead),
    );
    await pruneRetainedMailAndDemos(store, { apply: true, demoDays: 60, mailDays: 90 });
    assert.equal(
      await store.db.prepare('SELECT id FROM demo_registrations WHERE id = ?').get(oldLead),
      undefined,
    );
    assert.ok(
      await store.db
        .prepare('SELECT ip_hash FROM demo_ip_claims WHERE ip_hash = ?')
        .get('old-ip-hash'),
    );
    assert.ok(
      await store.db
        .prepare('SELECT recipient_hash FROM mail_suppressions WHERE recipient_hash = ?')
        .get(hash),
    );
    // Exhausted shared provider budget must not consume queue attempts in either worker.
    const previousRate = process.env.MAIL_REQUESTS_PER_SECOND;
    process.env.MAIL_REQUESTS_PER_SECOND = '2';
    t.after(() => {
      if (previousRate === undefined) delete process.env.MAIL_REQUESTS_PER_SECOND;
      else process.env.MAIL_REQUESTS_PER_SECOND = previousRate;
    });
    let sends = 0;
    const throttledProvider = {
      provider: 'resend',
      async send() {
        sends++;
        return { provider: 'resend', messageId: randomUUID() };
      },
    };
    const workers = [0, 1].map(() =>
      createMailOutbox(store, throttledProvider, key, () => {}, 'demo_mail_outbox'),
    );
    const queued = [randomUUID(), randomUUID()];
    for (const id of queued)
      await workers[0].enqueue(
        id,
        lead,
        { to: 'budget@example.test', subject: 'Budget test', text: 'Test only' },
        Date.now() + 86400000,
      );
    await store.db
      .prepare(
        "INSERT INTO rate_limit_buckets VALUES ('mail:resend:send', 2, ?) ON CONFLICT (key) DO UPDATE SET count = 2, reset_at = EXCLUDED.reset_at",
      )
      .run(Date.now() + 60000);
    await Promise.all(workers.map((worker) => worker.tick()));
    assert.equal(sends, 0);
    for (const id of queued)
      assert.equal(
        (await store.db.prepare('SELECT attempts FROM demo_mail_outbox WHERE id = ?').get(id))
          .attempts,
        0,
      );
    await store.db
      .prepare("UPDATE rate_limit_buckets SET reset_at = ? WHERE key = 'mail:resend:send'")
      .run(Date.now() - 1000);
    await workers[0].tick();
    assert.equal(sends, 2);
  },
);
