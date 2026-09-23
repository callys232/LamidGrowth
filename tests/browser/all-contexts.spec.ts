import { verifySignup } from './auth-helpers';
import { test, expect } from '@playwright/test';

const contexts = [
  'Individual',
  'Professional',
  'Creator',
  'Founder',
  'Team',
  'SME',
  'Enterprise',
  'Institution',
];

// One test per context, not a single test looping over all 8: under load, a slow moment in any
// one signup cycle used to consume the whole shared 120s budget and fail every remaining context
// with it. Isolating them means a slow/flaky context only fails itself, and each gets its own
// timeout headroom instead of splitting one budget 8 ways.
for (const context of contexts) {
  test(`${context}: can create and load a workspace`, async ({ page }) => {
    test.setTimeout(45000);
    await page.goto('/start');
    await page.getByRole('button', { name: context, exact: true }).click();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByLabel('Your name').fill(`${context} Test User`);
    await page
      .getByLabel('Email address')
      .fill(`${context.toLowerCase()}-${Date.now()}@example.test`);
    await page.getByLabel('Password', { exact: true }).fill('secure-context-test-password');
    await page.getByRole('button', { name: 'Create your workspace', exact: true }).click();
    await verifySignup(page);
    await expect(page).toHaveURL('/os');
    await expect(page.locator('.workspace-switch')).toContainText(`${context} workspace`);
    await page.getByRole('link', { name: 'Settings', exact: true }).click();
    await expect(page.getByText(context, { exact: true }).last()).toBeVisible();
  });
}
