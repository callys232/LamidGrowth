import { test, expect } from '@playwright/test';

test('enterprise evaluation links and signup journey remain navigable', async ({ page }) => {
  await page.goto('/who-its-for/enterprises');
  await page
    .getByRole('link', { name: 'Explore LAMID ONE for Enterprise', exact: true })
    .first()
    .click();
  await expect(page).toHaveURL('/enterprise');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'LAMID ONE at Organizational Scale',
  );
  await expect(page.getByText('Document preview', { exact: false })).toBeVisible();

  for (const destination of [
    ['/security', 'Security'],
    ['/responsible-ai', 'Responsible AI'],
    ['/trust/privacy', 'Privacy & Data'],
    ['/trust/governance', 'Governance'],
  ] as const) {
    await page.goto('/enterprise');
    await page.getByRole('link', { name: destination[1], exact: true }).click();
    await expect(page).toHaveURL(destination[0]);
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('Page not found');
  }

  await page.goto('/enterprise');
  await page
    .getByRole('link', { name: 'Request an Organizational Demo', exact: true })
    .first()
    .click();
  await expect(page).toHaveURL('/demo/request');
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('Page not found');

  await page.goto('/enterprise');
  await page.getByRole('link', { name: 'Talk to Our Team', exact: true }).click();
  await expect(page).toHaveURL('/enterprise/contact');
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('Page not found');

  await page.goto('/start');
  await page.getByRole('button', { name: 'Enterprise', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Your name').fill('Enterprise Test User');
  await page.getByLabel('Email address').fill(`enterprise-${Date.now()}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill('secure-enterprise-test-password');
  await page.getByRole('button', { name: 'Create your workspace', exact: true }).click();
  await expect(page).toHaveURL('/os');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('What Needs Your Attention?');
});
