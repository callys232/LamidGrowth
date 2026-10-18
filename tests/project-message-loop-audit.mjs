import express from 'express';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { resolve } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';
const app = express();
app.use(express.static(resolve('dist')));
app.get(/.*/, (_req, res) => res.sendFile(resolve('dist/index.html')));
const server = app.listen(0, '127.0.0.1');
await new Promise((done) => server.once('listening', done));
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  const workspace = {
    id: 'audit-w',
    name: 'Audit workspace',
    context: 'Professional',
    tier: 'Team',
    member_limit: 5,
    role: 'owner',
  };
  const user = { id: 'audit-u', name: 'Audit user', email: 'audit@example.test', demo: false };
  let messages = 0;
  await context.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data = [];
    if (path === '/api/state')
      data = {
        user,
        workspace,
        workspaces: [{ ...workspace, status: 'active' }],
        permissions: ['workspace:read', 'work:write'],
        objectives: [],
        actions: [],
        reviews: [],
        audit: [],
      };
    else if (path === '/api/projects/audit-project')
      data = {
        id: 'audit-project',
        title: 'Loop probe',
        status: 'active',
        isClient: true,
        assignedTeam: null,
        milestones: [],
      };
    else if (path === '/api/projects/audit-project/messages') {
      messages++;
      data = [];
    } else if (path === '/api/auth/session') data = { user, workspace };
    else if (path === '/api/onboarding/user-guide/claim') data = { showGuide: false };
    await route.fulfill({ json: data });
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/os/commercial/projects/audit-project`);
  await page.getByRole('heading', { name: 'Loop probe', exact: true }).waitFor();
  const before = messages;
  await page.waitForTimeout(2000);
  const report = {
    recorded: new Date().toISOString(),
    boundary:
      'Production frontend with simulated local account/project API responses; no database or external calls. Measures browser request behavior, not production throughput.',
    before,
    after: messages,
    additionalMessageFetchesInTwoSeconds: messages - before,
    outcome: messages - before > 2 ? 'repeated-idle-fetch-confirmed' : 'not-reproduced',
  };
  mkdirSync('lamiddoc/test-results/full-ui', { recursive: true });
  writeFileSync('lamiddoc/test-results/full-ui/message-loop.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  assert.ok(
    report.additionalMessageFetchesInTwoSeconds <= 2,
    'Idle project repeatedly fetches messages',
  );
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
