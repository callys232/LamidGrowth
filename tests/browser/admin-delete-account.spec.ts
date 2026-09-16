import { verifySignup } from './auth-helpers';
import { test, expect } from '@playwright/test';

test('workspace administrators do not receive a permanent-delete control', async ({ page }) => {
  await page.goto('/start');
  await page.getByRole('button', { name: 'Professional', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Your name').fill('Admin Delete Test');
  await page.getByLabel('Email address').fill(`admin-delete-${Date.now()}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill('secure-admin-delete-password');
  await page.getByRole('button', { name: 'Create your workspace', exact: true }).click();
  await verifySignup(page);
  await expect(page).toHaveURL('/os');

  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Delete account permanently', exact: true }),
  ).toHaveCount(0);
});
