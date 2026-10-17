import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import express from 'express';
import { openDemoTestStore } from './demo-test-store.mjs';
import { DEMO_SCHEMA_SQL } from '../server/demoSchema.mjs';
import { mountDemoAccess, mountDemoAdmin } from '../src/app/demoAccess.mjs';
import { demoWelcomeEmail } from '../src/app/emails/demoWelcome.mjs';
import { demoFollowupEmail } from '../src/app/emails/demoFollowup.mjs';
import { decryptSecret } from '../src/app/mfa.mjs';

test('editable email templates include personal access and unsubscribe links', () => {
  const welcome = demoWelcomeEmail({
    name: 'Alex',
    demoUrl: 'https://example.test/demo#return=secret',
  });
  assert.match(welcome.text, /Hi Alex,/);
  assert.match(welcome.text, /Confirm your email/);
  assert.match(welcome.text, /#return=secret/);
  const reminder = demoFollowupEmail({
    name: 'Alex',
    demoUrl: 'return-link',
    signupUrl: 'signup-link',
    unsubscribeUrl: 'stop-link',
  });
  assert.match(reminder.text, /signup-link/);
  assert.match(reminder.text, /Stop demo reminders: stop-link/);
});

test(
  'demo access, cloud progress, mail retries, consent, and admin isolation',
  { timeout: 240000 },
  async (t) => {
    if (!process.env.TEST_DATABASE_URL)
      return t.skip('TEST_DATABASE_URL is required; production databases are never used by tests.');
    const store = await openDemoTestStore();
    let server;
    t.after(async () => {
      if (server) await new Promise((resolve) => server.close(resolve));
      await store.dropSchema();
    });
    const app = express();
    // Only this loopback test app trusts forwarded test addresses. Production uses TRUST_PROXY_HOPS.
    app.set('trust proxy', 'loopback');
    app.use(express.json({ limit: '2mb' }));
    const delivered = [];
    let failures = 1;
    const demo = mountDemoAccess(app, store, {
      key: Buffer.alloc(32, 1),
      origin: 'https://demo.example.test',
      production: false,
      provider: {
        async send(message, id) {
          if (failures-- > 0) throw new Error('temporary provider failure');
          delivered.push({ ...message, id });
        },
      },
      errorLogger() {},
    });
    // This test-only middleware simulates the account middleware which precedes admin routes.
    app.use((req, _res, next) => {
      req.user = req.headers['x-test-admin']
        ? { id: 'test-admin', email: 'admin@example.test' }
        : { email: 'visitor@example.test' };
      next();
    });
    mountDemoAdmin(app, store, ['admin@example.test'], { resendWelcome: demo.resendWelcome });
    app.use((error, _req, res, _next) =>
      res
        .status(error.status || (error.name === 'ZodError' ? 400 : 500))
        .json({ error: error.message }),
    );
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', resolve);
    });
    const base = `http://127.0.0.1:${server.address().port}/api`;
    async function request(path, body, { admin = false, method, ip = '192.0.2.10' } = {}) {
      const response = await fetch(`${base}${path}`, {
        method: method || (body === undefined ? 'GET' : 'POST'),
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': ip,
          ...(admin ? { 'x-test-admin': 'yes' } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: response.status, data: await response.json() };
    }
    const registration = {
      name: 'Alex',
      email: 'Alex@Example.test',
      profile: 'SME',
      tier: 'team',
      followup: true,
    };
    assert.equal(
      (await request('/demo/register', { ...registration, email: 'invalid' })).status,
      400,
    );
    assert.equal((await request('/demo/register', registration)).status, 202);
    assert.equal(
      (await request('/demo/register', { ...registration, email: 'another@example.test' })).status,
      409,
      'one registration per IP',
    );
    const lead = await store.db
      .prepare('SELECT * FROM demo_registrations WHERE email = ?')
      .get('alex@example.test');
    await store.db.exec(DEMO_SCHEMA_SQL);
    assert.equal(
      (
        await store.db
          .prepare('SELECT id FROM demo_registrations WHERE email = ?')
          .get('alex@example.test')
      ).id,
      lead.id,
      'migration is safe to reapply to existing registrations',
    );
    assert.equal(lead.verified_at, null);
    await demo.mail.tick();
    assert.equal(delivered.length, 0);
    const retry = await store.db
      .prepare('SELECT * FROM demo_mail_outbox WHERE user_id = ?')
      .get(lead.id);
    assert.equal(retry.status, 'pending');
    assert.equal(retry.attempts, 1);
    assert.ok(!retry.payload.includes('alex@example.test'), 'queued mail is encrypted');
    await store.db
      .prepare('UPDATE demo_mail_outbox SET next_at = 0 WHERE user_id = ?')
      .run(lead.id);
    await demo.mail.tick();
    assert.equal(delivered.length, 1);
    assert.equal(delivered[0].id, retry.id, 'retries retain the provider idempotency key');
    const token = delivered[0].text.match(/#return=([a-f0-9]{64})/)[1];
    const storedToken = await store.db
      .prepare("SELECT token_hash FROM demo_access_tokens WHERE purpose = 'return'")
      .get();
    assert.equal(storedToken.token_hash, createHash('sha256').update(token).digest('hex'));
    assert.equal((await request('/demo/redeem', { token: 'a'.repeat(64) })).status, 400);
    const first = await request('/demo/redeem', { token });
    assert.equal(first.status, 200);
    assert.equal(first.data.profile, 'SME');
    const session = first.data.token;
    assert.equal((await request('/demo/session', { token: session })).data.followup, true);
    assert.equal((await request('/demo/session', { token: 'b'.repeat(64) })).status, 401);
    const draft = {
      token: session,
      profile: 'SME',
      tier: 'team',
      revision: 0,
      data: { version: 2, goal: 'Sample saved goal' },
    };
    assert.equal((await request('/demo/progress/save', draft)).data.revision, 1);
    const second = (await request('/demo/redeem', { token })).data;
    const loaded = await request('/demo/progress/read', {
      token: second.token,
      profile: 'SME',
      tier: 'team',
    });
    assert.equal(loaded.data.data.goal, 'Sample saved goal');
    assert.equal(loaded.data.revision, 1);
    assert.equal(
      (await request('/demo/progress/save', draft)).status,
      409,
      'stale devices cannot overwrite newer progress',
    );
    const encrypted = await store.db
      .prepare('SELECT payload FROM demo_progress WHERE registration_id = ?')
      .get(lead.id);
    assert.ok(!encrypted.payload.includes('Sample saved goal'));
    assert.equal(
      (
        await request('/demo/events', {
          token: session,
          profile: 'SME',
          tier: 'team',
          event: 'tool_used',
          path: '/os/engines',
        })
      ).status,
      200,
    );
    assert.equal((await request('/admin/demo-leads')).status, 403);
    const adminList = await request('/admin/demo-leads', undefined, { admin: true });
    assert.equal(adminList.data.leads[0].events, 1);
    assert.equal(
      (await request(`/admin/demo-leads/${lead.id}/events`, undefined, { admin: true })).data[0]
        .event,
      'tool_used',
    );
    assert.equal(
      (
        await request('/demo/events', {
          token: session,
          profile: 'SME',
          tier: 'team',
          event: 'save_conflict',
          path: '/os/learning',
        })
      ).status,
      200,
    );
    const diagnostics = (await request('/admin/demo-leads', undefined, { admin: true })).data
      .leads[0];
    assert.equal(diagnostics.failures, 1);
    assert.equal(diagnostics.failed_emails, 0);
    assert.equal((await request(`/admin/demo-leads/${lead.id}/resend`, {})).status, 403);
    const fresh = await request(`/admin/demo-leads/${lead.id}/resend`, {}, { admin: true });
    assert.equal(fresh.status, 202);
    assert.equal(fresh.data.queued, true);
    assert.equal(
      (
        await store.db
          .prepare('SELECT user_id FROM demo_mail_outbox WHERE id = ?')
          .get(fresh.data.messageId)
      ).user_id,
      lead.id,
    );
    assert.equal(
      (
        await request('/demo/events', {
          token: session,
          profile: 'SME',
          tier: 'team',
          event: 'client_failed',
          path: '/os/learning?token=private',
        })
      ).status,
      400,
    );
    const reminder = await store.db
      .prepare('SELECT * FROM demo_mail_outbox WHERE id = ?')
      .get(`demo-followup:${lead.id}`);
    assert.ok(
      reminder.next_at > Date.now() + 86400000,
      'reminder is scheduled, not immediately sent',
    );
    assert.equal(
      (await request('/demo/preferences', { token: session, followup: false })).status,
      200,
    );
    assert.equal(
      (await store.db.prepare('SELECT status FROM demo_mail_outbox WHERE id = ?').get(reminder.id))
        .status,
      'cancelled',
    );
    await request('/demo/redeem', { token });
    assert.equal(
      (
        await store.db
          .prepare('SELECT followup_opt_in FROM demo_registrations WHERE id = ?')
          .get(lead.id)
      ).followup_opt_in,
      0,
      'old return links cannot re-enable reminders',
    );
    await store.db
      .prepare('UPDATE demo_access_tokens SET expires_at = 0 WHERE token_hash = ?')
      .run(storedToken.token_hash);
    assert.equal((await request('/demo/redeem', { token })).status, 400);
    assert.equal(
      (await request(`/admin/demo-leads/${lead.id}`, {}, { admin: true, method: 'DELETE' })).status,
      200,
    );
    assert.equal(
      (await request('/demo/session', { token: session })).status,
      401,
      'deleting a lead revokes its access',
    );
    assert.equal((await store.db.prepare('SELECT COUNT(*) AS n FROM demo_progress').get()).n, 0);
    assert.equal((await store.db.prepare('SELECT COUNT(*) AS n FROM demo_mail_outbox').get()).n, 0);
    assert.equal(
      (await request('/demo/register', { ...registration, email: 'fresh@example.test' })).status,
      409,
      'deleting a lead does not reset its IP allowance',
    );

    // A different email gets a separate demo. Its emailed unsubscribe link cancels its reminder.
    await request(
      '/demo/register',
      { ...registration, email: 'second@example.test' },
      { ip: '192.0.2.20' },
    );
    await demo.mail.tick();
    const secondLink = delivered
      .find((message) => message.to === 'second@example.test')
      .text.match(/#return=([a-f0-9]{64})/)[1];
    const other = (await request('/demo/redeem', { token: secondLink })).data;
    assert.notEqual(other.id, first.data.id);
    assert.equal(
      (await request('/demo/progress/read', { token: other.token, profile: 'SME', tier: 'team' }))
        .data.data,
      null,
    );
    const queuedReminder = await store.db
      .prepare('SELECT payload FROM demo_mail_outbox WHERE id = ?')
      .get(`demo-followup:${other.id}`);
    const reminderMessage = JSON.parse(decryptSecret(Buffer.alloc(32, 1), queuedReminder.payload));
    const stopToken = reminderMessage.text.match(/#unsubscribe=([a-f0-9]{64})/)[1];
    assert.equal((await request('/demo/unsubscribe', { token: stopToken })).status, 200);
    assert.equal(
      (
        await store.db
          .prepare('SELECT status FROM demo_mail_outbox WHERE id = ?')
          .get(`demo-followup:${other.id}`)
      ).status,
      'cancelled',
    );
    // Unchecked consent creates no scheduled follow-up.
    await request(
      '/demo/register',
      {
        ...registration,
        email: 'no-reminder@example.test',
        followup: false,
      },
      { ip: '192.0.2.30' },
    );
    await demo.mail.tick();
    const noReminderLink = delivered
      .find((message) => message.to === 'no-reminder@example.test')
      .text.match(/#return=([a-f0-9]{64})/)[1];
    const noReminder = (await request('/demo/redeem', { token: noReminderLink })).data;
    assert.equal(
      await store.db
        .prepare('SELECT id FROM demo_mail_outbox WHERE id = ?')
        .get(`demo-followup:${noReminder.id}`),
      undefined,
    );
    const concurrent = await Promise.all([
      request(
        '/demo/register',
        { ...registration, email: 'race-one@example.test' },
        { ip: '192.0.2.40' },
      ),
      request(
        '/demo/register',
        { ...registration, email: 'race-two@example.test' },
        { ip: '192.0.2.40' },
      ),
    ]);
    assert.deepEqual(concurrent.map((response) => response.status).sort(), [202, 409]);
  },
);
