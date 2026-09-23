import { verifySignup } from './auth-helpers';
import { test, expect } from '@playwright/test';

async function signUp(page: import('@playwright/test').Page, name: string, email: string) {
  await page.goto('/start');
  await page.getByRole('button', { name: 'Founder', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Your name').fill(name);
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('secure-expert-network-password');
  await page.getByRole('button', { name: 'Create your workspace', exact: true }).click();
  await verifySignup(page);
  await expect(page).toHaveURL('/os');
}

test('the consolidated /experts page renders every group with its own heading', async ({ page }) => {
  await page.goto('/experts');
  await expect(page.getByRole('heading', { name: 'Bring the Right Human Expertise Into the Work.' })).toBeVisible();
  const groups: Array<[name: string, slug: string]> = [
    ['Finding & Engaging Expertise', 'finding-engaging-expertise'],
    ['Expert Matching', 'expert-matching'],
    ['Verification', 'verification'],
    ['Capability Strategy', 'capability-strategy'],
    ['Become an Expert', 'become-an-expert'],
  ];
  for (const [name, slug] of groups) {
    const band = page.locator(`#${slug}`);
    await expect(band).toBeVisible();
    await expect(band.getByRole('heading', { level: 2 })).toBeVisible();
    await expect(band).toContainText(name);
  }
});

test('an expert can publish availability, see it on the week calendar, and create a team', async ({ page }) => {
  const email = `expert-network-${Date.now()}@example.test`;
  await signUp(page, 'Expert Network Tester', email);

  await page.getByRole('link', { name: 'Talent', exact: true }).click();
  await page.getByLabel('Headline').fill('Operations consultant');
  await page.getByLabel('Skills').fill('operations, strategy');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();

  const now = new Date();
  now.setDate(now.getDate() + 1);
  const later = new Date(now.getTime() + 60 * 60 * 1000);
  const toLocal = (d: Date) => d.toISOString().slice(0, 16);
  await page.getByLabel('Starts').fill(toLocal(now));
  await page.getByLabel('Ends').fill(toLocal(later));
  await page.getByRole('button', { name: 'Publish slot', exact: true }).click();
  await expect(page.locator('.week-calendar-event').first()).toBeVisible();

  await page.getByLabel('Team name').fill('Playwright Pod');
  await page.getByRole('button', { name: 'Create team', exact: true }).click();
  await expect(page.getByText('Playwright Pod')).toBeVisible();
});

test('guided scoping wizard flags a regulated objective and offers expert review', async ({ page }) => {
  const email = `scoping-network-${Date.now()}@example.test`;
  await signUp(page, 'Scoping Network Tester', email);

  await page.getByRole('link', { name: 'Guided Scoping', exact: true }).click();
  await page.getByLabel('Objective').fill('Review our healthcare data-handling policy');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Category').selectOption('Legal and compliance');
  await page.getByLabel('Deliverables').fill('A written policy review');
  await page.getByLabel('Budget context').fill('$2000');
  await page.getByLabel('Timeline context').fill('2 weeks');
  await page.getByRole('button', { name: 'Continue to review', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Request expert review instead', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Request expert review instead', exact: true }).click();
  await expect(page.getByText(/Sent to the expert review queue/)).toBeVisible();
});
