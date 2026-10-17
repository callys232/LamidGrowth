import express from 'express';
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadPageManifest } from '../scripts/lib/page-content.mjs';
import { catalogSummary, catalogCoverage, demoEngineDetail } from '../src/app/engines.mjs';
import { PLANS } from '../src/app/plans.mjs';

const app = express(),
  dist = fileURLToPath(new URL('../dist/', import.meta.url));
app.use(express.static(dist));
app.get(/.*/, (_req, res) => res.sendFile(`${dist}/index.html`));
const server = await new Promise((resolve) => {
  const server = app.listen(0, '127.0.0.1', () => resolve(server));
});
const origin = `http://127.0.0.1:${server.address().port}`;
const report = { pages: [], errors: [], requests: [], unknownApi: [], mobileWebglRequests: [] };
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    report.requests.push(path);
    let data = [];
    if (path === '/api/auth/session') data = { user: null };
    else if (path === '/api/engines/catalog') data = catalogSummary();
    else if (path === '/api/engines/catalog/coverage') data = catalogCoverage();
    else if (path.startsWith('/api/engines/')) data = demoEngineDetail(path.split('/').at(-1));
    else if (path === '/api/plans') data = Object.values(PLANS);
    else if (path === '/api/bundles') data = [];
    else if (path === '/api/billables')
      data = {
        pointsUnitPriceMinor: 10,
        currency: 'USD',
        tools: catalogSummary().engines.map((engine) => ({
          id: engine.code,
          name: engine.engineName,
          home_engine: engine.homeEngine,
          points_cost: engine.pointsCost,
          max_authority: 'A1',
          human_gate: 'none',
        })),
        learningPaths: [],
        deepReview: {
          name: 'AI Deep Review',
          description: 'Sample pricing fixture',
          pointsCost: 100,
        },
      };
    else if (path === '/api/client-errors')
      report.errors.push('Frontend reported a caught render or runtime error');
    else {
      report.unknownApi.push(path);
      await route.fulfill({ status: 404, json: { error: 'Missing public browser fixture' } });
      return;
    }
    await route.fulfill({ json: data });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.setDefaultNavigationTimeout(15000);
  page.on('pageerror', (error) => report.errors.push(error.message));
  const entries = loadPageManifest().filter(
    (entry) =>
      !entry.route.startsWith('/os') &&
      !entry.route.startsWith('/workspace') &&
      !entry.route.includes('['),
  );
  for (const entry of entries) {
    const row = { path: entry.route, pass: false };
    try {
      await page.goto(`${origin}${entry.route}`, { waitUntil: 'domcontentloaded' });
      await page.locator('main h1:visible, main h2:visible').first().waitFor();
      await page.waitForTimeout(100);
      const heading = (
        await page.locator('main h1:visible, main h2:visible').first().textContent()
      ).trim();
      if (heading === 'Page not found' || heading.includes('reconnect'))
        throw new Error(`Unexpected heading: ${heading}`);
      row.pass = true;
    } catch (error) {
      row.error = error.message.split('\n')[0];
    }
    report.pages.push(row);
    mkdirSync('test-results', { recursive: true });
    writeFileSync('test-results/public-browser.json', JSON.stringify(report, null, 2));
    if (!row.pass || report.pages.length % 10 === 0)
      console.log(
        `Public pages checked: ${report.pages.length}/${entries.length}${row.pass ? '' : `; failed ${row.path}: ${row.error}`}`,
      );
  }
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await mobile.route('**/api/**', (route) => route.fulfill({ json: { user: null } }));
  const mobilePage = await mobile.newPage();
  mobilePage.on('request', (request) => {
    if (/vendor-three|createOrbitScene/.test(request.url()))
      report.mobileWebglRequests.push('WebGL decoration bundle');
  });
  await mobilePage.goto(origin, { waitUntil: 'networkidle' });
  await mobilePage.locator('h1').first().waitFor();
  await mobilePage.waitForTimeout(300);
  await mobile.close();
} finally {
  mkdirSync('test-results', { recursive: true });
  writeFileSync('test-results/public-browser.json', JSON.stringify(report, null, 2));
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
console.log(
  JSON.stringify(
    {
      pages: report.pages.length,
      failed: report.pages.filter((row) => !row.pass),
      errors: report.errors,
      mobileWebglRequests: report.mobileWebglRequests,
      unknownApi: report.unknownApi,
    },
    null,
    2,
  ),
);
if (
  report.pages.some((row) => !row.pass) ||
  report.errors.length ||
  report.unknownApi.length ||
  report.mobileWebglRequests.length
)
  process.exitCode = 1;
