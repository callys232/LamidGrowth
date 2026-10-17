import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { openDemoTestStore } from './demo-test-store.mjs';
import { createMailOutbox } from '../src/app/mail.mjs';

test(
  'mail queue recovers exhausted leases and preserves concurrent cancellation/send results',
  { timeout: 120000 },
  async (t) => {
    if (!process.env.TEST_DATABASE_URL) return t.skip('Dedicated TEST_DATABASE_URL required.');
    const store = await openDemoTestStore();
    t.after(() => store.dropSchema());
    const lead = randomUUID();
    await store.db
      .prepare('INSERT INTO demo_registrations (id, email, name, created_at) VALUES (?, ?, ?, ?)')
      .run(lead, 'mail-test@example.test', 'Mail Test', Date.now());
    const sent = [];
    const provider = {
      async send(message, id) {
        sent.push(id);
        if (message.subject === 'cancel while sending')
          await store.db
            .prepare("UPDATE demo_mail_outbox SET status = 'cancelled', payload = '' WHERE id = ?")
            .run(id);
        if (message.subject === 'stale failure') {
          await store.db
            .prepare("UPDATE demo_mail_outbox SET status = 'sent', payload = '' WHERE id = ?")
            .run(id);
          throw new Error('Worker response arrived late');
        }
        if (message.subject === 'invalid sender')
          throw Object.assign(new Error('Mail request rejected'), { retryable: false });
        if (message.subject === 'rate limited')
          throw Object.assign(new Error('Rate limited'), { retryAfterMs: 120000 });
      },
    };
    const outbox = createMailOutbox(
      store,
      provider,
      Buffer.alloc(32, 2),
      () => {},
      'demo_mail_outbox',
    );
    const row = (id) => store.db.prepare('SELECT * FROM demo_mail_outbox WHERE id = ?').get(id);
    async function enqueue(subject) {
      const id = randomUUID();
      await outbox.enqueue(
        id,
        lead,
        { to: 'mail-test@example.test', subject, text: 'Test only' },
        Date.now() + 86400000,
      );
      return id;
    }
    const exhausted = await enqueue('crashed final attempt');
    await store.db
      .prepare(
        "UPDATE demo_mail_outbox SET status = 'sending', attempts = 5, lease_until = ? WHERE id = ?",
      )
      .run(Date.now() - 1000, exhausted);
    await outbox.tick();
    assert.equal(
      (await row(exhausted)).status,
      'delivery_unknown',
      'A crashed final attempt must not remain sending indefinitely or be labelled delivered',
    );
    assert.equal((await row(exhausted)).payload, '');
    assert.ok(!sent.includes(exhausted));
    const cancelled = await enqueue('cancel while sending');
    await outbox.tick();
    assert.equal((await row(cancelled)).status, 'cancelled');
    const stale = await enqueue('stale failure');
    await outbox.tick();
    assert.equal(
      (await row(stale)).status,
      'sent',
      'A late worker error must not revive a completed send',
    );
    const permanent = await enqueue('invalid sender');
    await outbox.tick();
    assert.equal((await row(permanent)).status, 'failed');
    assert.equal((await row(permanent)).attempts, 1);
    const limited = await enqueue('rate limited');
    const before = Date.now();
    await outbox.tick();
    assert.equal((await row(limited)).status, 'pending');
    assert.ok((await row(limited)).next_at >= before + 120000);
  },
);
