import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import { expect } from '@playwright/test';
import { auditHarness, profiles, tiers, fillFields } from './full-ui-harness.mjs';
const report = {
  started: new Date().toISOString(),
  boundary:
    'Production browser build with real sample handlers and isolated identity/save fixtures. No provider, email or real money.',
  cases: [],
};
mkdirSync('lamiddoc/test-results/full-ui', { recursive: true });
const harness = await auditHarness(report);
const output = `lamiddoc/test-results/full-ui/audit-fixes-browser${process.env.AUDIT_PROFILE ? '-' + process.env.AUDIT_PROFILE : ''}.json`;
try {
  for (const profile of profiles.filter(
    (p) => !process.env.AUDIT_PROFILE || p === process.env.AUDIT_PROFILE,
  ))
    for (const tier of tiers) {
      const s = await harness.session(profile, tier),
        page = s.page;
      page.setDefaultTimeout(10000);
      const snapshot = () => s.snapshots.get(`${profile}:${tier}`)?.data;
      try {
        await s.go('/os/teams');
        await page.getByPlaceholder('Team name', { exact: true }).fill('Regression sample team');
        await page.getByPlaceholder('Description (optional)', { exact: true }).fill('Sample only');
        await page.getByRole('button', { name: 'Create team', exact: true }).click();
        await expect
          .poll(() => snapshot()?.teams?.some((t) => t.name === 'Regression sample team'))
          .toBe(true);
        await s.go('/os/scoping/new');
        await page
          .getByPlaceholder('What outcome do you want?', { exact: true })
          .fill('Deliver a documented customer onboarding plan');
        await page.getByRole('button', { name: 'Continue', exact: true }).click();
        await expect.poll(() => snapshot()?.scopes?.length || 0).toBe(1);
        assert.equal(await page.locator('.form-error').count(), 0);
        await s.go('/os/commercial');
        await page.getByRole('button', { name: 'Post a job', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: 'Post a scoped job' });
        await fillFields(dialog);
        await dialog.locator('[name="budgetMin"]').fill('100');
        await dialog.locator('[name="budgetMax"]').fill('200');
        await dialog
          .getByRole('button', { name: /Estimate budget from real platform data/ })
          .click();
        await expect(
          dialog.getByText(/Illustrative demo records|No matching sample budgets/),
        ).toBeVisible();
        const before = snapshot().jobs.length;
        await dialog.locator('button[type="submit"]').click();
        await expect.poll(() => snapshot()?.jobs.length).toBe(before + 1);
        // Force the real "committed, acknowledgement lost" state rather than relying on timing.
        await page.evaluate(() => {
          for (const key of Object.keys(sessionStorage).filter(
            (k) => k.startsWith('lamid-sandbox-v1:') && k.endsWith(':sync'),
          )) {
            const sync = JSON.parse(sessionStorage.getItem(key));
            sessionStorage.setItem(
              key,
              JSON.stringify({ revision: Math.max(0, sync.revision - 1), dirty: true }),
            );
          }
        });
        const contractor = snapshot().projects.find((p) => p.isFreelancer);
        assert.ok(contractor, 'A contractor example must be available');
        await s.go(`/os/commercial/projects/${contractor.id}`);
        const card = page
          .locator('li.activity-feed-row')
          .filter({ has: page.getByText('Approved sample handover', { exact: true }) });
        await card.getByRole('button', { name: 'Generate invoice', exact: true }).click();
        const link = card.getByRole('link', { name: 'Download invoice PDF', exact: true });
        await expect(link).toBeVisible();
        const href = await link.getAttribute('href');
        assert.ok(href.startsWith('data:application/pdf;base64,'));
        const bytes = Buffer.from(href.split(',')[1], 'base64');
        assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
        assert.ok(bytes.includes(Buffer.from('NOT PAYABLE')));
        const download = page.waitForEvent('download');
        await link.click();
        assert.equal((await download).suggestedFilename(), 'sample-invoice.pdf');
        await s.go('/os/teams');
        await expect(page.getByText('Regression sample team', { exact: true })).toBeVisible();
        assert.deepEqual(s.errors, []);
        report.cases.push({
          profile,
          tier,
          outcome: 'passed',
          verified: [
            'team-create-and-reload',
            'scoping-start',
            'estimator-response',
            'job-persisted',
            'contractor-invoice-and-pdf-download',
            'lost-save-acknowledgement-recovery',
          ],
        });
        console.log(`${profile}/${tier}: passed`);
      } catch (error) {
        report.cases.push({
          profile,
          tier,
          outcome: 'failed',
          error: error.message,
          alerts: await page.locator('.form-error,[role="alert"]').allTextContents(),
          text: await page
            .locator('.workspace-main')
            .innerText()
            .catch(() => ''),
          requests: s.requests,
          errors: s.errors,
        });
        console.error(`${profile}/${tier}: ${error.message}`);
      } finally {
        await s.context.close();
        writeFileSync(output, JSON.stringify(report, null, 2));
      }
    }
} finally {
  report.finished = new Date().toISOString();
  writeFileSync(output, JSON.stringify(report, null, 2));
  await harness.close();
}
assert.equal(
  report.cases.filter((c) => c.outcome === 'failed').length,
  0,
  'Some demo regression cases failed',
);
