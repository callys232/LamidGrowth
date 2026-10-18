import express from 'express';
import { chromium } from '@playwright/test';
import { resolve } from 'node:path';
import { demoToolCatalog } from '../src/app/demoAccess.mjs';
import { demoEngineDetail, resolve as resolveEngine, runEngine } from '../src/app/engines.mjs';

export const profiles = [
  'Individual',
  'Professional',
  'Freelancer',
  'Creator',
  'Founder',
  'Team',
  'SME',
  'Enterprise',
  'Institution',
];
export const tiers = ['individual', 'team', 'enterprise'];
export async function auditHarness(report) {
  const app = express();
  app.use(express.static(resolve('dist')));
  app.get(/.*/, (_req, res) => res.sendFile(resolve('dist/index.html')));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((done) => server.once('listening', done));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true });
  let sequence = 0;
  async function session(profile, tier, publicOnly = false, mobile = false) {
    const identity = {
      id: `full-audit-${++sequence}`,
      token: 'a'.repeat(64),
      name: 'Audit Visitor',
      email: 'audit@example.test',
      profile,
      tier,
    };
    const snapshots = new Map();
    const context = await browser.newContext({
      reducedMotion: 'reduce',
      viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
      acceptDownloads: true,
    });
    if (!publicOnly)
      await context.addInitScript(
        ({ identity }) => {
          sessionStorage.setItem('lamid-demo-identity', JSON.stringify(identity));
          sessionStorage.setItem(
            'lamid-demo-session',
            JSON.stringify({ profile: identity.profile, tier: identity.tier }),
          );
        },
        { identity },
      );
    const requests = [],
      errors = [],
      dialogs = [],
      downloads = [],
      popups = [];
    await context.route('**/*', async (route) => {
      const request = route.request(),
        url = new URL(request.url());
      if (url.origin !== origin) {
        requests.push({
          method: request.method(),
          path: `${url.hostname}${url.pathname}`,
          status: 'blocked-external',
        });
        return route.abort();
      }
      if (!url.pathname.startsWith('/api/')) return route.continue();
      const path = url.pathname.slice(4);
      let data,
        status = 200;
      const body = request.method() === 'POST' ? request.postDataJSON() : {};
      try {
        if (path === '/auth/session') data = { user: null };
        else if (!publicOnly && ['/demo/session', '/demo/redeem'].includes(path))
          data = { ...identity, followup: false };
        else if (!publicOnly && path === '/demo/engines/catalog') data = demoToolCatalog(body.tier);
        else if (!publicOnly && path === '/demo/engines/detail') data = demoEngineDetail(body.code);
        else if (!publicOnly && path === '/demo/engines/run') {
          if (!demoToolCatalog(body.tier).engines.some((entry) => entry.code === body.code))
            throw Object.assign(new Error('Tool outside tier'), { status: 403 });
          data = {
            result: runEngine(resolveEngine(body.code).ref, body.input),
            pointsCharged: 0,
            demo: true,
          };
        } else if (!publicOnly && path === '/demo/progress/read')
          data = snapshots.get(`${body.profile}:${body.tier}`) || { data: null, revision: 0 };
        else if (!publicOnly && path === '/demo/progress/save') {
          const key = `${body.profile}:${body.tier}`,
            previous = snapshots.get(key);
          if (previous && previous.revision !== body.revision)
            throw Object.assign(new Error('Stale revision'), { status: 409 });
          data = { revision: (previous?.revision || 0) + 1 };
          snapshots.set(key, { data: body.data, revision: data.revision });
        } else if (!publicOnly && ['/demo/events', '/demo/preferences'].includes(path))
          data = { ok: true };
        else if (path === '/client-errors') data = { ok: true };
        else {
          status = 501;
          data = {
            error: 'Audit blocked this real API operation: no production writes or external sends.',
          };
        }
      } catch (error) {
        status = error.status || 500;
        data = { error: error.message };
      }
      requests.push({ method: request.method(), path, status });
      await route.fulfill({ status, json: data });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(2200);
    page.on('pageerror', (error) =>
      errors.push({ path: page.url().replace(origin, ''), error: error.message }),
    );
    page.on('dialog', async (dialog) => {
      dialogs.push({ type: dialog.type(), message: dialog.message() });
      await dialog.accept();
    });
    page.on('download', async (download) => {
      downloads.push({ name: download.suggestedFilename(), failure: await download.failure() });
    });
    page.on('popup', async (popup) => {
      popups.push(popup);
      await popup.waitForLoadState('domcontentloaded', { timeout: 3000 }).catch(() => {});
    });
    async function go(path) {
      await page.goto(`${origin}${path}`, { waitUntil: 'domcontentloaded' });
      await page
        .locator(publicOnly ? 'main' : '.workspace-main')
        .first()
        .waitFor();
      await page.waitForTimeout(60);
    }
    return { page, context, go, requests, errors, dialogs, downloads, popups, identity, snapshots };
  }
  return {
    origin,
    browser,
    session,
    async close() {
      await browser.close();
      await new Promise((done) => server.close(done));
    },
  };
}

export async function fillFields(scope) {
  const fields = scope.locator('input:visible,textarea:visible,select:visible');
  const filled = [];
  for (let i = 0; i < (await fields.count()); i++) {
    const field = fields.nth(i);
    if (!(await field.isEnabled())) continue;
    const meta = await field.evaluate((el) => ({
      tag: el.tagName,
      type: el.type,
      name: el.name,
      placeholder: el.getAttribute('placeholder'),
      min: el.min,
      max: el.max,
      required: el.required,
      value: el.value,
    }));
    try {
      if (meta.tag === 'SELECT') {
        if (!meta.value) {
          const options = await field
            .locator('option:not([disabled])')
            .evaluateAll((els) => els.map((el) => el.value).filter(Boolean));
          if (options.length) await field.selectOption(options[0]);
        }
      } else if (meta.type === 'checkbox' || meta.type === 'radio') await field.check();
      else if (meta.type === 'file') filled.push({ ...meta, outcome: 'requires-file-fixture' });
      else if (
        !meta.value &&
        !['hidden', 'submit', 'button', 'range', 'color'].includes(meta.type)
      ) {
        let value =
          meta.type === 'email'
            ? 'audit@example.test'
            : meta.type === 'password'
              ? 'Audit-only-password-123!'
              : meta.type === 'number'
                ? String(Math.max(Number(meta.min) || 0, Math.min(Number(meta.max) || 100, 5)))
                : meta.type === 'date'
                  ? '2026-11-20'
                  : meta.type === 'time'
                    ? '10:00'
                    : meta.type === 'url'
                      ? 'https://example.test/evidence'
                      : meta.type === 'tel'
                        ? '2025550100'
                        : 'Audit sample: test evidence and a specific intended outcome.';
        if (/account.?number/i.test(`${meta.name} ${meta.placeholder}`)) value = '1234567890';
        await field.fill(value);
      }
    } catch (error) {
      filled.push({ name: meta.name, outcome: 'fill-failed', error: error.message.split('\n')[0] });
    }
  }
  return filled;
}
