import { verifySignup } from './auth-helpers';
import { test, expect } from '@playwright/test';

test('local account recovery resets the password and returns to sign in', async ({ page }) => {
  const email = `recovery-${Date.now()}@example.test`;
  await page.goto('/start');
  await page.getByRole('button', { name: 'Professional', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Your name').fill('Recovery Browser User');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('secure-recovery-browser-password');
  await page.getByRole('button', { name: 'Create your workspace', exact: true }).click();
  await verifySignup(page);
  await expect(page).toHaveURL('/os');
  await page.getByRole('button', { name: 'Sign out' }).click();

  await page.goto('/forgot-password');
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: 'Send recovery instructions' }).click();
  await page.getByRole('link', { name: 'Continue to password reset' }).click();
  await page.getByLabel('New password').fill('a-new-browser-recovery-password');
  await page.getByLabel('Confirm password').fill('a-new-browser-recovery-password');
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page.getByText('Your password was changed')).toBeVisible();

  await page.getByRole('link', { name: 'Return to sign in' }).click();
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('a-new-browser-recovery-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL('/os');
});
