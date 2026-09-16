import { verifySignup } from './auth-helpers';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('public experience and workspace complete a connected operating cycle', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'The Human-AI Growth Operating System',
  );
  await page.getByRole('link', { name: 'Experience LAMID ONE', exact: true }).first().click();
  await expect(page).toHaveURL('/start');
  await page.getByRole('button', { name: 'Founder', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Your name').fill('Journey Test User');
  await page.getByLabel('Email address').fill(`journey-${Date.now()}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill('secure-journey-test-password');
  await page.getByRole('button', { name: 'Create your workspace', exact: true }).click();
  await verifySignup(page);
  await expect(page).toHaveURL('/os');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('What Needs Your Attention?');
  await page.getByRole('button', { name: 'New objective', exact: true }).click();
  await page.getByLabel('Your objective', { exact: true }).fill('Launch a focused service');
  await page.getByLabel('Why it matters').fill('Make client onboarding clearer.');
  await page.getByLabel('What does success look like?').fill('Three successful client interviews.');
  await page.getByRole('button', { name: 'Create objective', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('link', { name: 'Clarity', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Launch a focused service', exact: true }),
  ).toBeVisible();
  const card = page.locator('.objective-card').filter({ hasText: 'Launch a focused service' });
  await card.getByRole('button', { name: 'Next action' }).click();
  await page.getByLabel('Action', { exact: true }).fill('Review the new service draft');
  await page
    .getByLabel('Notes and acceptance criteria')
    .fill('Ensure the offer has a clear audience and measurable outcome.');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Add next action', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('link', { name: 'Consistency', exact: true }).click();
  await page.getByRole('button', { name: /Review the new service draft/ }).click();
  await page.getByRole('button', { name: 'Start action' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: /Review the new service draft/ }).click();
  await page.getByRole('button', { name: 'Submit for review' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('link', { name: 'Governance', exact: true }).click();
  await page.getByRole('button', { name: /Review the new service draft/ }).click();
  await page.getByRole('button', { name: 'Approve completion' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    page.locator('.audit-event').filter({ hasText: 'Action approved' }).first(),
  ).toContainText('Review the new service draft');
  await page.getByRole('link', { name: 'Rhythm', exact: true }).click();
  await page.getByRole('button', { name: 'Record a reflection' }).click();
  await page.getByLabel('What moved forward?').fill('The service offer is reviewed.');
  await page
    .getByLabel('What will you carry into the next cycle?')
    .fill('Run the first customer interview.');
  await page.getByRole('button', { name: 'Save reflection' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.review-card')).toContainText('The service offer is reviewed.');
  expect(errors).toEqual([]);
});
test('mobile navigation and onboarding work without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page.getByRole('button', { name: 'Solutions', exact: true }).click();
  await page
    .locator('.mega-panel')
    .getByRole('link', { name: /^How it works/ })
    .click();
  await expect(page).toHaveURL('/how-it-works');
  await page.goto('/start');
  await page.getByRole('button', { name: 'Founder', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Your name').fill('Jordan Test');
  await page.getByLabel('Email address').fill(`jordan-${Date.now()}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill('secure-browser-test-password');
  await page.getByRole('button', { name: 'Create your workspace' }).click();
  await verifySignup(page);
  await expect(page).toHaveURL('/os');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('What Needs Your Attention?');
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.getByRole('button', { name: 'Open workspace navigation' }).click();
  await page
    .getByRole('navigation', { name: 'Workspace navigation' })
    .getByRole('link', { name: 'Companion', exact: false })
    .click();
  await page
    .getByLabel('What do you want to move forward?')
    .fill('Build a sustainable daily practice');
  await page.getByRole('button', { name: 'Bring it into focus' }).click();
  await page.getByLabel('The situation', { exact: true }).fill('I need time for focused work.');
  await page.getByLabel('A meaningful outcome').fill('Two hours of focused work per day.');
  await page.getByRole('button', { name: 'Choose the next step' }).click();
  await page.getByLabel('Your next action (optional)').fill('Reserve a morning work block');
  await page.getByRole('button', { name: 'Save my plan' }).click();
  await expect(
    page.getByRole('heading', { name: 'A clearer direction. A concrete next step.' }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
});
test('keyboard search, dialogs, and accessibility semantics', async ({ page }) => {
  // This test needs the pre-seeded demo workspace ("Launch our advisory practice") for its
  // search assertion below, so it signs into a demo account directly rather than through the
  // real signup flow (which starts from an empty workspace).
  await page.goto('/');
  await page.request.post('/api/auth/demo', { data: {} });
  await page.goto('/os');
  await expect(page).toHaveURL('/os');
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Search objectives, actions, and pages').fill('advisory');
  await expect(page.locator('.search-results')).toContainText('Launch our advisory practice');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual(
    [],
  );
});
