# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: all-contexts.spec.ts >> Individual: can create and load a workspace
- Location: tests\browser\all-contexts.spec.ts:20:3

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('.workspace-switch')
Expected substring: "Individual workspace"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" locator('.workspace-switch') with timeout 5000ms
  - waiting for locator('.workspace-switch')

```

```yaml
- status:
  - img
  - text: Bringing your context together…
- button "Ask Companion"
```

# Test source

```ts
  1  | import { verifySignup } from './auth-helpers';
  2  | import { test, expect } from '@playwright/test';
  3  | 
  4  | const contexts = [
  5  |   'Individual',
  6  |   'Professional',
  7  |   'Creator',
  8  |   'Founder',
  9  |   'Team',
  10 |   'SME',
  11 |   'Enterprise',
  12 |   'Institution',
  13 | ];
  14 | 
  15 | // One test per context, not a single test looping over all 8: under load, a slow moment in any
  16 | // one signup cycle used to consume the whole shared 120s budget and fail every remaining context
  17 | // with it. Isolating them means a slow/flaky context only fails itself, and each gets its own
  18 | // timeout headroom instead of splitting one budget 8 ways.
  19 | for (const context of contexts) {
  20 |   test(`${context}: can create and load a workspace`, async ({ page }) => {
  21 |     test.setTimeout(45000);
  22 |     await page.goto('/start');
  23 |     await page.getByRole('button', { name: context, exact: true }).click();
  24 |     await page.getByRole('button', { name: 'Continue', exact: true }).click();
  25 |     await page.getByLabel('Your name').fill(`${context} Test User`);
  26 |     await page
  27 |       .getByLabel('Email address')
  28 |       .fill(`${context.toLowerCase()}-${Date.now()}@example.test`);
  29 |     await page.getByLabel('Password', { exact: true }).fill('secure-context-test-password');
  30 |     await page.getByRole('button', { name: 'Create your workspace', exact: true }).click();
  31 |     await verifySignup(page);
  32 |     await expect(page).toHaveURL('/os');
> 33 |     await expect(page.locator('.workspace-switch')).toContainText(`${context} workspace`);
     |                                                     ^ Error: expect(locator).toContainText(expected) failed
  34 |     await page.getByRole('link', { name: 'Settings', exact: true }).click();
  35 |     await expect(page.getByText(context, { exact: true }).last()).toBeVisible();
  36 |   });
  37 | }
  38 | 
```