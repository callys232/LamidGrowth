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

test('each supported account context can create and load a workspace', async ({ page }) => {
  test.setTimeout(120000);
  for (const context of contexts) {
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
  }
});
