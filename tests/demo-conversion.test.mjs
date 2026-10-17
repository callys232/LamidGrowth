import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import express from 'express';
import { z } from 'zod';
import { openDemoTestStore } from './demo-test-store.mjs';
import { mountAccounts } from '../src/app/accounts.mjs';

test(
  'verified account signup converts its demo lead and cancels the reminder',
  { timeout: 120000 },
  async (t) => {
    if (!process.env.TEST_DATABASE_URL) return t.skip('TEST_DATABASE_URL required.');
    const store = await openDemoTestStore();
    let server;
    t.after(async () => {
      if (server) await new Promise((resolve) => server.close(resolve));
      await store.dropSchema();
    });
    const lead = randomUUID();
    await store.db
      .prepare(
        'INSERT INTO demo_registrations (id, email, name, created_at, verified_at, followup_opt_in) VALUES (?, ?, ?, ?, ?, 1)',
      )
      .run(lead, 'conversion@example.test', 'Demo Visitor', Date.now(), Date.now());
    await store.db
      .prepare("INSERT INTO demo_mail_outbox VALUES (?, ?, '', 'pending', 0, ?, NULL, ?, ?)")
      .run(
        `demo-followup:${lead}`,
        lead,
        Date.now() + 86400000,
        Date.now() + 7 * 86400000,
        Date.now(),
      );
    const app = express();
    app.use(express.json());
    const captured = [];
    const accounts = await mountAccounts(app, store, {
      production: false,
      mailProvider: {
        send: async (message) => {
          captured.push(message);
        },
      },
      securityKey: Buffer.alloc(32, 1).toString('hex'),
      publicOrigin: 'https://api.example.test',
      accountPublicOrigin: 'https://app.example.test',
      contexts: z.enum(['Founder', 'SME']),
      session: async () => {},
      enterpriseMemberLimit: 200,
      errorLogger() {},
    });
    app.use((error, _req, res, _next) =>
      res.status(error.status || 500).json({ error: error.message }),
    );
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', resolve);
    });
    async function post(path, body) {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return { status: response.status, data: await response.json() };
    }
    const signup = await post('/auth/signup', {
      name: 'Demo Visitor',
      email: 'conversion@example.test',
      password: 'demo-test-password',
      context: 'SME',
    });
    assert.equal(signup.status, 201, JSON.stringify(signup.data));
    await accounts.mail.tick();
    assert.match(captured[0].text, /https:\/\/app\.example\.test\/verify\?token=/);
    assert.ok(!captured[0].text.includes('https://api.example.test'));
    // A conversion must cancel a reminder already claimed by another worker as well.
    await store.db
      .prepare(
        "UPDATE demo_mail_outbox SET status = 'sending', attempts = 1, lease_until = ? WHERE id = ?",
      )
      .run(Date.now() + 30000, `demo-followup:${lead}`);
    const verified = await post('/auth/verify', {
      challengeId: signup.data.challengeId,
      code: signup.data.developmentCode,
    });
    assert.equal(verified.status, 200, JSON.stringify(verified.data));
    assert.ok(
      (await store.db.prepare('SELECT converted_at FROM demo_registrations WHERE id = ?').get(lead))
        .converted_at,
    );
    assert.equal(
      (
        await store.db
          .prepare('SELECT status FROM demo_mail_outbox WHERE id = ?')
          .get(`demo-followup:${lead}`)
      ).status,
      'cancelled',
    );
    const recovery = await post('/auth/request-recovery', { email: 'conversion@example.test' });
    assert.equal(recovery.status, 200);
    await accounts.mail.tick();
    assert.match(captured.at(-1).text, /https:\/\/app\.example\.test\/reset-password\?token=/);
  },
);
