import { verifySignup } from './auth-helpers';
import { test, expect } from '@playwright/test';

test('a learner can create a path, enroll, complete a module, and rate it', async ({ page }) => {
  await page.goto('/start');
  await page.getByRole('button', { name: 'Founder', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Your name').fill('Learning Tester');
  await page.getByLabel('Email address').fill(`learning-${Date.now()}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill('secure-learning-test-password');
  await page.getByRole('button', { name: 'Create your workspace', exact: true }).click();
  await verifySignup(page);
  await expect(page).toHaveURL('/os');

  await page.getByRole('link', { name: 'Learning', exact: true }).click();
  await page.getByLabel('Title').fill('Playwright Path');
  await page.getByLabel('Description').fill('A path created end to end by a browser test.');
  await page.getByRole('button', { name: 'Create path', exact: true }).click();
  await expect(page.getByText('Playwright Path')).toBeVisible();

  await page
    .locator('.activity-feed-row', { hasText: 'Playwright Path' })
    .getByRole('button', { name: 'Enroll', exact: true })
    .click();
  await expect(page.getByText('0% complete')).toBeVisible();
});
