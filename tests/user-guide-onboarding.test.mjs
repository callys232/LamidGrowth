import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { mountUserGuideOnboarding } from '../src/app/onboarding.mjs';
import { openDemoTestStore } from './demo-test-store.mjs';

test(
  'guide is offered once per verified new account across concurrent requests, never to existing accounts or demos',
  { timeout: 120000 },
  async (t) => {
    if (!process.env.TEST_DATABASE_URL) return t.skip('Dedicated test database required.');
    const store = await openDemoTestStore();
    t.after(() => store.dropSchema());
    const fresh = randomUUID(),
      old = randomUUID(),
      demo = randomUUID();
    for (const id of [fresh, old, demo])
      await store.db
        .prepare(
          'INSERT INTO users (id, name, demo, created_at, verified_at) VALUES (?, ?, ?, ?, ?)',
        )
        .run(
          id,
          'Guide Test',
          id === demo ? 1 : 0,
          new Date().toISOString(),
          id === fresh ? null : Date.now(),
        );
    for (const id of [fresh, demo])
      await store.db.prepare('INSERT INTO user_guide_onboarding (user_id) VALUES (?)').run(id);
    const app = express();
    app.use((req, res, next) => {
      const id = req.get('x-test-user');
      if (!id) return res.sendStatus(401);
      req.user = { id, demo: id === demo };
      next();
    });
    mountUserGuideOnboarding(app, store);
    const server = app.listen(0, '127.0.0.1');
    await new Promise((done) => server.once('listening', done));
    t.after(() => new Promise((done) => server.close(done)));
    const url = `http://127.0.0.1:${server.address().port}/api/onboarding/user-guide/claim`;
    const claim = async (id) =>
      (await fetch(url, { method: 'POST', headers: { 'x-test-user': id } })).json();
    assert.equal((await fetch(url, { method: 'POST' })).status, 401);
    assert.equal((await claim(fresh)).showGuide, false, 'Wait for email verification');
    assert.equal((await claim(old)).showGuide, false);
    assert.equal((await claim(demo)).showGuide, false);
    await store.db.prepare('UPDATE users SET verified_at = ? WHERE id = ?').run(Date.now(), fresh);
    const claims = await Promise.all([claim(fresh), claim(fresh)]);
    assert.equal(claims.filter((result) => result.showGuide).length, 1);
    assert.equal(
      (await claim(fresh)).showGuide,
      false,
      'Later visits/devices must not show it again',
    );
    assert.ok(
      (
        await store.db
          .prepare('SELECT first_shown_at FROM user_guide_onboarding WHERE user_id = ?')
          .get(fresh)
      ).first_shown_at,
    );
  },
);
