# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: enterprise.spec.ts >> enterprise evaluation links and signup journey remain navigable
- Location: tests\browser\enterprise.spec.ts:4:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - navigating to "http://127.0.0.1:3107/enterprise", waiting until "load"

```

# Test source

```ts
  1  | import { verifySignup } from './auth-helpers';
  2  | import { test, expect } from '@playwright/test';
  3  | 
  4  | test('enterprise evaluation links and signup journey remain navigable', async ({ page }) => {
  5  |   await page.goto('/who-its-for/enterprises');
  6  |   await page
  7  |     .getByRole('link', { name: 'Explore LAMID ONE for Enterprise', exact: true })
  8  |     .first()
  9  |     .click();
  10 |   await expect(page).toHaveURL('/enterprise');
  11 |   await expect(page.getByRole('heading', { level: 1 })).toHaveText(
  12 |     'LAMID ONE at Organizational Scale',
  13 |   );
  14 | 
  15 |   for (const destination of [
  16 |     ['/security', 'Security'],
  17 |     ['/responsible-ai', 'Responsible AI'],
  18 |     ['/trust/privacy', 'Privacy & Data'],
  19 |     ['/trust/governance', 'Governance'],
  20 |   ] as const) {
> 21 |     await page.goto('/enterprise');
     |                ^ Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
  22 |     await page.getByRole('link', { name: destination[1], exact: true }).click();
  23 |     await expect(page).toHaveURL(destination[0]);
  24 |     await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('Page not found');
  25 |   }
  26 | 
  27 |   await page.goto('/enterprise');
  28 |   await page
  29 |     .getByRole('link', { name: 'Request an Organizational Demo', exact: true })
  30 |     .first()
  31 |     .click();
  32 |   await expect(page).toHaveURL('/demo/request');
  33 |   await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('Page not found');
  34 | 
  35 |   await page.goto('/enterprise');
  36 |   await page.getByRole('link', { name: 'Talk to Our Team', exact: true }).click();
  37 |   await expect(page).toHaveURL('/enterprise/contact');
  38 |   await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('Page not found');
  39 | 
  40 |   await page.goto('/start');
  41 |   await page.getByRole('button', { name: 'Enterprise', exact: true }).click();
  42 |   await page.getByRole('button', { name: 'Continue', exact: true }).click();
  43 |   await page.getByLabel('Your name').fill('Enterprise Test User');
  44 |   await page.getByLabel('Email address').fill(`enterprise-${Date.now()}@example.test`);
  45 |   await page.getByLabel('Password', { exact: true }).fill('secure-enterprise-test-password');
  46 |   await page.getByRole('button', { name: 'Create your workspace', exact: true }).click();
  47 |   await verifySignup(page);
  48 |   await expect(page).toHaveURL('/os');
  49 |   await expect(page.getByRole('heading', { level: 1 })).toHaveText('What Needs Your Attention?');
  50 | });
  51 | 
```