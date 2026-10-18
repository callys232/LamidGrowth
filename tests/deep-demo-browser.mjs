import express from 'express';
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import { catalogSummary, demoEngineDetail, resolve, runEngine } from '../src/app/engines.mjs';
import { demoToolCatalog } from '../src/app/demoAccess.mjs';

const focused = process.argv.includes('--focused');
const report = { engines: [], pages: [], actions: [], errors: [], unknownApi: [] };
const profiles = [
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
const tiers = ['individual', 'team', 'enterprise'];
const corePaths = [
  '/os',
  '/os/clarity',
  '/os/commercial/projects',
  '/os/talent',
  '/os/engines',
  '/os/finance',
  '/os/disputes',
  '/os/analytics',
];
const extraPaths = [
  '/os/today',
  '/os/capability',
  '/os/consistency',
  '/os/companion',
  '/os/companion/chat',
  '/os/workflows',
  '/os/settings/notifications',
  '/os/notifications',
  '/os/teams',
  '/os/opportunities',
  '/os/growth',
  '/os/integrations',
  '/os/whats-new',
  '/os/rhythm',
  '/os/progress',
  '/os/governance',
  '/os/audit',
  '/os/settings',
  '/os/profile',
  '/os/settings/privacy',
  '/os/settings/payouts',
  '/os/settings/members',
  '/os/commercial',
  '/os/escrows',
  '/os/concierge',
  '/os/job-matcher',
  '/os/people',
  '/os/pricing',
  '/os/scoping/new',
  '/os/learning',
  '/os/knowledge',
  '/os/insights',
  '/os/settings/ai',
];
const app = express();
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
app.use(express.static(dist));
app.get(/.*/, (_req, res) => res.sendFile(`${dist}/index.html`));
const server = await new Promise((resolve) => {
  const value = app.listen(0, '127.0.0.1', () => resolve(value));
});
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const snapshots = new Map();
async function session(profile, tier, mobile = false) {
  const identity = {
    id: `audit-${profile}-${tier}`,
    token: 'a'.repeat(64),
    name: 'Audit Visitor',
    email: 'audit@example.test',
    profile,
    tier,
  };
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
  });
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
  await context.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/api/, '');
    let status = 200,
      data = {};
    try {
      const body = request.method() === 'POST' ? request.postDataJSON() : {};
      if (path === '/auth/session') data = { user: null };
      else if (path === '/demo/session' || path === '/demo/redeem')
        data = { ...identity, followup: false };
      else if (path === '/demo/engines/catalog') data = demoToolCatalog(body.tier);
      else if (path === '/demo/engines/detail') data = demoEngineDetail(body.code);
      else if (path === '/demo/engines/run') {
        if (!demoToolCatalog(body.tier).engines.some((engine) => engine.code === body.code)) {
          status = 403;
          data = { error: 'Tool outside selected tier' };
        } else
          data = {
            result: runEngine(resolve(body.code).ref, body.input),
            pointsCharged: 0,
            demo: true,
          };
      } else if (path === '/demo/progress/read')
        data = snapshots.get(`${identity.id}:${body.profile}:${body.tier}`) || {
          data: null,
          revision: 0,
        };
      else if (path === '/demo/progress/save') {
        const key = `${identity.id}:${body.profile}:${body.tier}`;
        const previous = snapshots.get(key);
        if (previous && previous.revision !== body.revision) {
          status = 409;
          data = { error: 'Stale progress' };
        } else {
          data = { revision: (previous?.revision || 0) + 1 };
          snapshots.set(key, { data: body.data, revision: data.revision });
        }
      } else if (
        path === '/demo/events' ||
        path === '/demo/preferences' ||
        path === '/client-errors'
      )
        data = { ok: true };
      else {
        report.unknownApi.push({ profile, tier, path });
        status = 404;
        data = { error: 'No test API fixture for this request' };
      }
    } catch (error) {
      status = error.status || 500;
      data = { error: error.message };
    }
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
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  page.on('pageerror', (error) =>
    report.errors.push({ profile, tier, path: new URL(page.url()).pathname, error: error.message }),
  );
  return { page, context };
}
function save() {
  mkdirSync('lamiddoc/test-results', { recursive: true });
  writeFileSync(
    `lamiddoc/test-results/deep-demo-browser${focused ? '-focused' : ''}.json`,
    JSON.stringify(report, null, 2),
  );
}
try {
  browser = await chromium.launch({ headless: true });
  const { page, context } = await session('Founder', 'team');
  for (const engine of catalogSummary().engines) {
    if (focused && engine.code !== 'F01') continue;
    const row = {
      code: engine.code,
      name: engine.engineName,
      kind: demoEngineDetail(engine.code).inputs.kind,
      pass: false,
    };
    try {
      await page.goto(`${origin}/os/engines?engine=${engine.code}`, {
        waitUntil: 'domcontentloaded',
      });
      const form = page.locator('form.engine-form');
      await form.waitFor();
      const example = form.getByRole('button', { name: 'Load an example', exact: true });
      if (await example.count()) await example.click();
      else {
        const text = form.locator('input[type="text"], textarea');
        for (let i = 0; i < (await text.count()); i++)
          if (!(await text.nth(i).inputValue())) await text.nth(i).fill(`Audit sample ${i + 1}`);
        const numbers = form.locator('input[type="number"]');
        for (let i = 0; i < (await numbers.count()); i++) {
          const field = numbers.nth(i);
          const value = Number(await field.inputValue());
          if (!value) {
            const min = Number((await field.getAttribute('min')) || 0);
            const maxRaw = await field.getAttribute('max');
            const max = maxRaw === null ? Infinity : Number(maxRaw);
            await field.fill(String(Math.min(max, Math.max(min, 1))));
          }
        }
        const selects = form.locator('select');
        for (let i = 0; i < (await selects.count()); i++) {
          const select = selects.nth(i);
          if (!(await select.inputValue())) {
            const values = await select
              .locator('option:not([disabled])')
              .evaluateAll((options) => options.map((option) => option.value).filter(Boolean));
            if (values.length) await select.selectOption(values.at(-1));
          }
        }
      }
      const invalid = await form.locator('input,select,textarea').evaluateAll((fields) =>
        fields
          .filter((field) => !field.checkValidity())
          .map((field) => ({
            label: field.closest('label')?.textContent?.trim().slice(0, 100),
            value: field.value,
            message: field.validationMessage,
          })),
      );
      if (invalid.length) throw new Error(`Invalid form values: ${JSON.stringify(invalid)}`);
      await form.locator('button[type="submit"]').click();
      await page.locator('.engine-result').waitFor();
      const resultText = await page.locator('.engine-result').innerText();
      if (/\bNaN\b|\bInfinity\b/.test(resultText))
        throw new Error('Non-finite text in rendered result');
      row.pass = true;
    } catch (error) {
      row.error = error.message.split('\n')[0];
      row.alerts = await page
        .locator('.form-error,[role="alert"]')
        .allTextContents()
        .catch(() => []);
    }
    report.engines.push(row);
    save();
  }
  await context.close();
  const actionSession = await session('Founder', 'team');
  for (const action of [
    'add action',
    'enroll in learning',
    'create learning path',
    'learning lifecycle',
  ]) {
    const row = { action, pass: false };
    const page = actionSession.page;
    try {
      await page.goto(`${origin}${action === 'add action' ? '/os/consistency' : '/os/learning'}`, {
        waitUntil: 'domcontentloaded',
      });
      await page.locator('.workspace-main').waitFor();
      if (action === 'add action') {
        await page.getByRole('button', { name: 'Add action', exact: true }).first().click();
        await page
          .getByRole('dialog')
          .locator('input[name="title"]')
          .fill('Deep audit next action');
        await page.getByRole('button', { name: 'Add next action', exact: true }).click();
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
        await page.getByText('Deep audit next action', { exact: true }).first().waitFor();
      } else if (action === 'enroll in learning')
        await page.getByRole('button', { name: 'Enroll', exact: true }).first().click();
      else if (action === 'create learning path') {
        await page.locator('input[name="title"]').first().fill('Deep audit learning path');
        await page.getByRole('button', { name: 'Create path', exact: true }).click();
        await page
          .getByRole('option', { name: 'Deep audit learning path', exact: true })
          .waitFor({ state: 'attached' });
      } else {
        const moduleForm = page
          .locator('form')
          .filter({ has: page.getByRole('button', { name: 'Add module', exact: true }) });
        await moduleForm.locator('input[name="title"]').fill('Audit assessment');
        await moduleForm.locator('select[name="format"]').selectOption('assessment');
        await moduleForm.getByRole('button', { name: 'Add module', exact: true }).click();
        const pathRow = page
          .locator('li')
          .filter({ has: page.getByText('Deep audit learning path', { exact: true }) });
        await pathRow.getByRole('button', { name: 'Enroll', exact: true }).click();
        const moduleRow = page
          .locator('li')
          .filter({ has: page.getByText('Audit assessment', { exact: true }) });
        await moduleRow.locator('input[name="score"]').fill('85');
        await moduleRow.getByRole('button', { name: 'Submit', exact: true }).click();
        await page.getByRole('button', { name: 'Create sample certificate', exact: true }).click();
        await page.getByText('Sample certificate created', { exact: true }).waitFor();
        const feedback = page
          .locator('li')
          .filter({ has: page.locator('input[placeholder="Comment (optional)"]') });
        await feedback.locator('select').selectOption('4');
        await feedback.locator('input').fill('Clear and useful');
        await feedback.getByRole('button', { name: 'Submit', exact: true }).click();
        await page.reload();
        await page.getByText('Sample certificate created', { exact: true }).waitFor();
        await page.getByText('Audit assessment', { exact: true }).waitFor({ state: 'hidden' });
        const persisted = await page.evaluate(() => {
          const keys = Object.keys(sessionStorage).filter(
            (key) => key.includes('audit-Founder-team') && !key.endsWith(':sync'),
          );
          return keys
            .map((key) => {
              try {
                return JSON.parse(sessionStorage.getItem(key)).learning;
              } catch {
                return null;
              }
            })
            .find(Boolean);
        });
        if (
          !persisted ||
          !Object.values(persisted.completions).some(
            (row) => row.score === 85 && row.graded === false,
          ) ||
          !Object.values(persisted.feedback).some((row) => row.rating === 4)
        )
          throw new Error('Learning scores or feedback were not persisted');
      }
      await page.waitForTimeout(250);
      row.alerts = (await page.locator('.form-error,[role="alert"]').allTextContents())
        .map((text) => text.trim())
        .filter(Boolean);
      row.pass = !row.alerts.length;
    } catch (error) {
      row.error = error.message.split('\n')[0];
    }
    report.actions.push(row);
    save();
  }
  await actionSession.context.close();
  for (const profile of profiles)
    for (const tier of tiers) {
      if (focused && (profile !== 'Founder' || tier !== 'team')) continue;
      const { page, context } = await session(profile, tier);
      const paths =
        profile === 'Founder' && tier === 'team' ? [...corePaths, ...extraPaths] : corePaths;
      for (const path of paths) {
        const row = { profile, tier, path, pass: false };
        try {
          await page.goto(`${origin}${path}`, { waitUntil: 'domcontentloaded' });
          await page.locator('.workspace-main').waitFor();
          await page.waitForTimeout(140);
          row.alerts = (await page.locator('.form-error,[role="alert"]').allTextContents())
            .map((text) => text.trim())
            .filter(Boolean);
          row.pass = !row.alerts.length;
          if (await page.getByText('Let’s reconnect.', { exact: true }).count())
            throw new Error('React error boundary');
        } catch (error) {
          row.error = error.message.split('\n')[0];
        }
        report.pages.push(row);
        save();
      }
      await context.close();
      console.log(`Audited ${profile}/${tier}: ${paths.length} pages`);
    }
  for (const tier of tiers) {
    const { page, context } = await session('Founder', tier, true);
    await page.goto(`${origin}/os/engines`, { waitUntil: 'domcontentloaded' });
    await page.locator('.workspace-main').waitFor();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2,
    );
    report.pages.push({
      profile: 'Founder',
      tier,
      path: '/os/engines [mobile]',
      pass: !overflow,
      overflow,
    });
    await context.close();
  }
} finally {
  save();
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
console.log(
  JSON.stringify(
    {
      engines: report.engines.length,
      failedEngines: report.engines.filter((row) => !row.pass),
      pages: report.pages.length,
      failedPages: report.pages.filter((row) => !row.pass),
      actions: report.actions,
      errors: report.errors,
      unknownApi: [...new Set(report.unknownApi.map((row) => row.path))],
    },
    null,
    2,
  ),
);
if (
  report.engines.some((row) => !row.pass) ||
  report.pages.some((row) => !row.pass) ||
  report.actions.some((row) => !row.pass) ||
  report.errors.length ||
  report.unknownApi.length
)
  process.exitCode = 1;
