// Run after npm run build. Uses a local browser and fake API; no external emails are sent.
import assert from 'node:assert/strict';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { demoToolCatalog } from '../src/app/demoAccess.mjs';
import { demoEngineDetail, resolve, runEngine } from '../src/app/engines.mjs';

const app = express();
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
app.use(express.static(dist));
app.get(/.*/, (_req, res) => res.sendFile(`${dist}/index.html`));
const server = await new Promise((resolve) => {
  const value = app.listen(0, '127.0.0.1', () => resolve(value));
});
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const token = 'a'.repeat(64);
  const identity = {
    token: 'b'.repeat(64),
    id: 'browser-test-lead',
    name: 'Demo Visitor',
    email: 'visitor@example.test',
    profile: 'SME',
    tier: 'team',
  };
  const snapshots = new Map();
  const registrations = [];
  let failSave = false;
  async function context() {
    const value = await browser.newContext();
    await value.route('**/api/**', async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname.replace(/^\/api/, '');
      const body = request.method() === 'POST' ? request.postDataJSON() : {};
      let data = {};
      let status = 200;
      if (path === '/auth/session') data = { user: null };
      else if (path === '/demo/register') {
        registrations.push(body);
        status = 202;
        data = { ok: true };
      } else if (path === '/demo/redeem') data = identity;
      else if (path === '/demo/session') data = { ...identity, followup: false };
      else if (path === '/demo/engines/catalog') data = demoToolCatalog(body.tier);
      else if (path === '/demo/engines/detail') data = demoEngineDetail(body.code);
      else if (path === '/demo/engines/run')
        data = {
          result: runEngine(resolve(body.code).ref, body.input),
          pointsCharged: 0,
          demo: true,
        };
      else if (path === '/demo/progress/read')
        data = snapshots.get(`${body.profile}:${body.tier}`) || { data: null, revision: 0 };
      else if (path === '/demo/progress/save') {
        const key = `${body.profile}:${body.tier}`;
        const existing = snapshots.get(key);
        if (failSave) {
          status = 503;
          data = { error: 'Temporary test failure' };
        } else if (existing && existing.revision !== body.revision) {
          status = 409;
          data = { error: 'Changed on another device' };
        } else {
          data = { revision: (existing?.revision || 0) + 1 };
          snapshots.set(key, { data: body.data, revision: data.revision });
        }
      } else if (path === '/demo/events' || path === '/demo/preferences') data = { ok: true };
      await route.fulfill({
        status,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify(data),
      });
    });
    return value;
  }
  const first = await context();
  const page = await first.newPage();
  page.setDefaultTimeout(15000);
  await page.goto(`${origin}/demo/workspace`);
  await page.getByLabel('Your name', { exact: true }).fill(identity.name);
  await page.getByLabel('Email address', { exact: true }).fill(identity.email);
  assert.equal(await page.locator('select[name="profile"], select[name="tier"]').count(), 0);
  assert.equal(await page.getByRole('checkbox').isChecked(), false);
  await page.getByRole('button', { name: 'Email my demo link' }).click();
  await page.getByRole('heading', { name: 'Check your inbox.' }).waitFor();
  assert.equal(registrations[0].email, identity.email);
  assert.equal(registrations[0].name, identity.name);
  assert.equal('profile' in registrations[0], false);
  assert.equal('tier' in registrations[0], false);
  assert.equal(registrations[0].followup, false);
  await page.goto(`${origin}/demo#return=${token}`);
  await page.getByRole('button', { name: 'Confirm email and open demo' }).click();
  await page.waitForURL(`${origin}/os`);
  await page.getByRole('button', { name: 'New objective', exact: true }).first().click();
  await page.getByRole('dialog').locator('input[name="title"]').fill('Browser persistence check');
  await page.getByRole('button', { name: 'Create objective', exact: true }).click();
  await page
    .getByText(/browser persistence check/i)
    .first()
    .waitFor()
    .catch(async (error) => {
      console.log(
        'Saved objective titles:',
        snapshots.get('SME:team')?.data.state.objectives.map((goal) => goal.title),
      );
      console.log(
        'Form state:',
        await page
          .getByRole('dialog')
          .textContent()
          .catch(() => 'closed'),
      );
      throw error;
    });
  assert.ok(
    snapshots
      .get('SME:team')
      .data.state.objectives.some(
        (goal) => goal.title.toLowerCase() === 'browser persistence check',
      ),
  );
  const second = await context();
  const resumed = await second.newPage();
  resumed.setDefaultTimeout(15000);
  await resumed.goto(`${origin}/demo#return=${token}`);
  await resumed.getByRole('button', { name: 'Confirm email and open demo' }).click();
  await resumed.waitForURL(`${origin}/os`);
  await resumed
    .getByText(/browser persistence check/i)
    .first()
    .waitFor();
  failSave = true;
  await resumed.getByRole('button', { name: 'New objective', exact: true }).first().click();
  await resumed.getByRole('dialog').locator('input[name="title"]').fill('Retry persistence check');
  await resumed.getByRole('button', { name: 'Create objective', exact: true }).click();
  await resumed
    .getByText(/Progress is saved in this tab/)
    .first()
    .waitFor();
  failSave = false;
  await resumed.getByRole('button', { name: 'Retry save', exact: true }).click();
  await resumed.getByText('Demo progress saved', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'New objective', exact: true }).first().click();
  await page.getByRole('dialog').locator('input[name="title"]').fill('Stale device objective');
  await page.getByRole('button', { name: 'Create objective', exact: true }).click();
  await page
    .getByText(/Another device changed this demo/)
    .first()
    .waitFor();
  assert.ok(
    !snapshots
      .get('SME:team')
      .data.state.objectives.some((goal) => goal.title === 'STALE DEVICE OBJECTIVE'),
  );
  await page.getByRole('button', { name: 'Reload latest demo', exact: true }).click();
  await page
    .getByText(/retry persistence check/i)
    .first()
    .waitFor();
  const tool = demoToolCatalog('team').engines.find(
    (engine) => demoEngineDetail(engine.code).inputs.kind === 'schema',
  );
  await resumed.goto(`${origin}/os/engines?engine=${tool.code}`);
  await resumed.getByRole('button', { name: 'Load an example', exact: true }).click();
  await resumed.getByRole('button', { name: 'Run', exact: true }).click();
  await resumed.locator('.engine-result, .engine-result-view, .engines-result').first().waitFor();
  assert.equal(
    await resumed.getByText('Running engines needs your own workspace', { exact: true }).count(),
    0,
  );
  await resumed.getByRole('link', { name: 'Create an account with your own data' }).click();
  await resumed.getByRole('button', { name: 'Continue', exact: true }).click();
  assert.equal(await resumed.locator('input[name="email"]').inputValue(), identity.email);
  assert.equal(await resumed.locator('input[name="name"]').inputValue(), identity.name);
  const signupContext = await context();
  const signupPage = await signupContext.newPage();
  await signupPage.goto(`${origin}/demo#return=${token}&next=signup`);
  await signupPage.getByRole('button', { name: 'Confirm email and create account' }).click();
  await signupPage.waitForURL(`${origin}/signup`);
  await signupPage.getByRole('button', { name: 'Continue', exact: true }).click();
  assert.equal(await signupPage.locator('input[name="email"]').inputValue(), identity.email);
  console.log(
    'Browser checks passed: gated registration, email confirmation, cross-device restore, save retries, and signup prefilling.',
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
