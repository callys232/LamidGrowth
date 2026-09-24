# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: expert-network.spec.ts >> an expert can publish availability, see it on the week calendar, and create a team
- Location: tests\browser\expert-network.spec.ts:38:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: Test timeout of 30000ms exceeded.
Call log:
  - navigating to "http://127.0.0.1:3107/start", waiting until "load"

```

# Test source

```ts
  1  | import { verifySignup } from './auth-helpers';
  2  | import { test, expect } from '@playwright/test';
  3  | 
  4  | async function signUp(page: import('@playwright/test').Page, name: string, email: string) {
> 5  |   await page.goto('/start');
     |              ^ Error: page.goto: Test timeout of 30000ms exceeded.
  6  |   await page.getByRole('button', { name: 'Founder', exact: true }).click();
  7  |   await page.getByRole('button', { name: 'Continue', exact: true }).click();
  8  |   await page.getByLabel('Your name').fill(name);
  9  |   await page.getByLabel('Email address').fill(email);
  10 |   await page.getByLabel('Password', { exact: true }).fill('secure-expert-network-password');
  11 |   await page.getByRole('button', { name: 'Create your workspace', exact: true }).click();
  12 |   await verifySignup(page);
  13 |   await expect(page).toHaveURL('/os');
  14 | }
  15 | 
  16 | test('the consolidated /experts page renders every group with its own heading', async ({
  17 |   page,
  18 | }) => {
  19 |   await page.goto('/experts');
  20 |   await expect(
  21 |     page.getByRole('heading', { name: 'Bring the Right Human Expertise Into the Work.' }),
  22 |   ).toBeVisible();
  23 |   const groups: Array<[name: string, slug: string]> = [
  24 |     ['Finding & Engaging Expertise', 'finding-engaging-expertise'],
  25 |     ['Expert Matching', 'expert-matching'],
  26 |     ['Verification', 'verification'],
  27 |     ['Capability Strategy', 'capability-strategy'],
  28 |     ['Become an Expert', 'become-an-expert'],
  29 |   ];
  30 |   for (const [name, slug] of groups) {
  31 |     const band = page.locator(`#${slug}`);
  32 |     await expect(band).toBeVisible();
  33 |     await expect(band.getByRole('heading', { level: 2 })).toBeVisible();
  34 |     await expect(band).toContainText(name);
  35 |   }
  36 | });
  37 | 
  38 | test('an expert can publish availability, see it on the week calendar, and create a team', async ({
  39 |   page,
  40 | }) => {
  41 |   const email = `expert-network-${Date.now()}@example.test`;
  42 |   await signUp(page, 'Expert Network Tester', email);
  43 | 
  44 |   await page.getByRole('link', { name: 'Talent', exact: true }).click();
  45 |   await page.getByLabel('Headline').fill('Operations consultant');
  46 |   await page.getByLabel('Skills').fill('operations, strategy');
  47 |   await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  48 | 
  49 |   const now = new Date();
  50 |   now.setDate(now.getDate() + 1);
  51 |   const later = new Date(now.getTime() + 60 * 60 * 1000);
  52 |   const toLocal = (d: Date) => d.toISOString().slice(0, 16);
  53 |   await page.getByLabel('Starts').fill(toLocal(now));
  54 |   await page.getByLabel('Ends').fill(toLocal(later));
  55 |   await page.getByRole('button', { name: 'Publish slot', exact: true }).click();
  56 |   await expect(page.locator('.week-calendar-event').first()).toBeVisible();
  57 | 
  58 |   await page.getByLabel('Team name').fill('Playwright Pod');
  59 |   await page.getByRole('button', { name: 'Create team', exact: true }).click();
  60 |   await expect(page.getByText('Playwright Pod')).toBeVisible();
  61 | });
  62 | 
  63 | test('guided scoping wizard flags a regulated objective and offers expert review', async ({
  64 |   page,
  65 | }) => {
  66 |   const email = `scoping-network-${Date.now()}@example.test`;
  67 |   await signUp(page, 'Scoping Network Tester', email);
  68 | 
  69 |   await page.getByRole('link', { name: 'Guided Scoping', exact: true }).click();
  70 |   await page.getByLabel('Objective').fill('Review our healthcare data-handling policy');
  71 |   await page.getByRole('button', { name: 'Continue', exact: true }).click();
  72 |   await page.getByLabel('Category').selectOption('Legal and compliance');
  73 |   await page.getByLabel('Deliverables').fill('A written policy review');
  74 |   await page.getByLabel('Budget context').fill('$2000');
  75 |   await page.getByLabel('Timeline context').fill('2 weeks');
  76 |   await page.getByRole('button', { name: 'Continue to review', exact: true }).click();
  77 |   await expect(
  78 |     page.getByRole('button', { name: 'Request expert review instead', exact: true }),
  79 |   ).toBeVisible();
  80 |   await page.getByRole('button', { name: 'Request expert review instead', exact: true }).click();
  81 |   await expect(page.getByText(/Sent to the expert review queue/)).toBeVisible();
  82 | });
  83 | 
```