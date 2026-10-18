import { mkdirSync, writeFileSync } from 'node:fs';
import { auditHarness, profiles, tiers, fillFields } from './full-ui-harness.mjs';

const report = {
  started: new Date().toISOString(),
  boundary:
    'Actual demo UI and sandbox; fake identity/cloud-save only. No external calls or payments.',
  cases: [],
};
const summaryOnly = process.argv.includes('--summary-only');
mkdirSync('test-results/full-ui', { recursive: true });
const save = () =>
  writeFileSync(
    `test-results/full-ui/commerce${summaryOnly ? '-summary' : ''}.json`,
    JSON.stringify(report, null, 2),
  );
const harness = await auditHarness(report);
const textErrors = async (page) =>
  (await page.locator('.form-error,[role="alert"],.activity-feed-error').allTextContents())
    .map((text) => text.trim())
    .filter(Boolean);
async function record(session, name, run) {
  const row = {
    profile: session.identity.profile,
    tier: session.identity.tier,
    name,
    outcome: 'unconfirmed',
  };
  report.cases.push(row);
  save();
  console.log(`Start ${row.profile}/${row.tier}: ${name}`);
  const watchdog = setTimeout(() => {
    row.watchdog = 'Case exceeded 15 seconds; browser closed to keep the audit moving.';
    void session.page.close().catch(() => {});
  }, 15000);
  try {
    Object.assign(row, await run());
  } catch (error) {
    row.outcome = 'test-or-ui-failure';
    row.error = error.message;
    row.alerts = await textErrors(session.page).catch(() => []);
  } finally {
    clearTimeout(watchdog);
  }
  save();
}
try {
  for (const profile of profiles)
    for (const tier of tiers) {
      let session = await harness.session(profile, tier);
      let { page } = session;
      try {
        await record(session, 'Budget estimator', async () => {
          await session.go('/os/commercial');
          await page.getByRole('button', { name: 'Post a job', exact: true }).click();
          const dialog = page.getByRole('dialog', { name: 'Post a scoped job' });
          await dialog.waitFor();
          await page
            .getByRole('button', { name: 'Estimate budget from real platform data', exact: true })
            .click();
          await page.waitForTimeout(180);
          const errors = await textErrors(page);
          return {
            outcome: errors.length ? 'visible-error' : 'response-without-visible-error',
            errors,
            text: (await dialog.innerText()).slice(-1000),
          };
        });
        await record(session, 'Post valid scoped job', async () => {
          await session.go('/os/commercial');
          await page.getByRole('button', { name: 'Post a job', exact: true }).click();
          const dialog = page.getByRole('dialog', { name: 'Post a scoped job' });
          await fillFields(dialog);
          const submit = dialog.locator('button[type="submit"]');
          const invalid = await dialog
            .locator('input,textarea,select')
            .evaluateAll((els) =>
              els
                .filter((el) => !el.checkValidity())
                .map((el) => ({ name: el.name, message: el.validationMessage })),
            );
          if (invalid.length) return { outcome: 'audit-fixture-invalid', invalid };
          await submit.click();
          await page.waitForTimeout(150);
          const errors = await textErrors(page);
          return {
            outcome: errors.length ? 'visible-error' : 'needs-business-result-review',
            errors,
            text: (await dialog.innerText().catch(() => '')).slice(-500),
          };
        });
        await session.go('/os/commercial/projects');
        const projectPaths = [
          ...new Set(
            await page
              .locator('a[href^="/os/commercial/projects/"]')
              .evaluateAll((els) => els.map((el) => el.getAttribute('href'))),
          ),
        ];
        await record(session, 'Invoice reachability in all sample projects', async () => {
          const projects = [];
          for (const path of projectPaths) {
            await session.go(path);
            projects.push({
              path,
              invoices: await page
                .getByRole('button', { name: 'Generate invoice', exact: true })
                .count(),
              submissionControls: await page
                .getByRole('button', { name: 'Submit for review', exact: true })
                .count(),
              approveControls: await page
                .getByRole('button', { name: 'Approve', exact: true })
                .count(),
              errors: await textErrors(page),
            });
          }
          return {
            outcome: projects.some((entry) => entry.invoices)
              ? 'invoice-control-present'
              : 'no-invoice-control-in-any-sample-project',
            projects,
          };
        });
        for (const path of summaryOnly ? [] : projectPaths) {
          if (page.isClosed()) {
            await session.context.close();
            session = await harness.session(profile, tier);
            page = session.page;
          }
          await record(session, `Project controls ${path}`, async () => {
            const actions = [];
            for (const label of [
              'Fund milestone',
              'Release payment',
              'Request refund',
              'Generate invoice',
              'Run verification',
            ]) {
              console.log(`  ${path} ${label}`);
              await session.go(path);
              const buttons = page.getByRole('button', { name: label, exact: true });
              const count = await buttons.count();
              if (!count) {
                actions.push({ label, outcome: 'not-exposed-in-seeded-state' });
                continue;
              }
              for (let i = 0; i < count; i++) {
                await session.go(path);
                await page.getByRole('button', { name: label, exact: true }).nth(i).click();
                await page.waitForTimeout(140);
                actions.push({
                  label,
                  index: i,
                  outcome: 'clicked',
                  errors: await textErrors(page),
                  body: (await page.locator('.workspace-main').innerText()).slice(0, 350),
                });
              }
            }
            // Operations with local input fields rather than forms.
            for (const [label, fields] of [
              [
                'Add milestone',
                [
                  ['Milestone title', 'Audit milestone'],
                  ['Amount', '120'],
                ],
              ],
              [
                'Add deliverable',
                [
                  ['Deliverable title', 'Audit deliverable'],
                  ['Criteria, comma separated', 'Evidence supplied, scope met'],
                ],
              ],
              ['Send', [['Write a message…', 'Audit project message']]],
            ]) {
              await session.go(path);
              if (!(await page.getByRole('button', { name: label, exact: true }).count())) {
                actions.push({ label, outcome: 'not-exposed-in-seeded-state' });
                continue;
              }
              let matched = true;
              for (const [placeholder, value] of fields) {
                const input = page.getByPlaceholder(placeholder, { exact: true }).first();
                if (!(await input.count())) {
                  matched = false;
                  break;
                }
                await input.fill(value);
              }
              if (!matched) {
                actions.push({ label, outcome: 'input-selector-unconfirmed' });
                continue;
              }
              const button = page.getByRole('button', { name: label, exact: true }).first();
              if (!(await button.isEnabled())) {
                actions.push({ label, outcome: 'disabled-after-input' });
                continue;
              }
              await button.click();
              await page.waitForTimeout(140);
              actions.push({
                label,
                outcome: 'clicked',
                errors: await textErrors(page),
                body: (await page.locator('.workspace-main').innerText()).slice(0, 350),
              });
            }
            return { outcome: 'actions-recorded', actions };
          });
        }
        if (page.isClosed()) {
          await session.context.close();
          session = await harness.session(profile, tier);
          page = session.page;
        }
        await record(session, 'AI invoice and estimate agents', async () => {
          if (page.isClosed())
            throw new Error(
              'Prior project case stalled the browser; no claim of AI-flow confirmation.',
            );
          await session.go('/os/companion/chat');
          return {
            outcome: 'ui-inspected',
            text: await page.locator('.workspace-main').innerText(),
            inputs: await page.locator('.workspace-main textarea,.workspace-main input').count(),
          };
        });
        console.log(`Commerce ${profile}/${tier}: ${projectPaths.length} sample projects`);
      } finally {
        await session.context.close();
      }
    }
} finally {
  report.finished = new Date().toISOString();
  save();
  await harness.close();
}
