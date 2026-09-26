# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-delete-account.spec.ts >> workspace administrators do not receive a permanent-delete control
- Location: tests\browser\admin-delete-account.spec.ts:4:1

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
  4  | test('workspace administrators do not receive a permanent-delete control', async ({ page }) => {
> 5  |   await page.goto('/start');
     |              ^ Error: page.goto: Test timeout of 30000ms exceeded.
  6  |   await page.getByRole('button', { name: 'Professional', exact: true }).click();
  7  |   await page.getByRole('button', { name: 'Continue', exact: true }).click();
  8  |   await page.getByLabel('Your name').fill('Admin Delete Test');
  9  |   await page.getByLabel('Email address').fill(`admin-delete-${Date.now()}@example.test`);
  10 |   await page.getByLabel('Password', { exact: true }).fill('secure-admin-delete-password');
  11 |   await page.getByRole('button', { name: 'Create your workspace', exact: true }).click();
  12 |   await verifySignup(page);
  13 |   await expect(page).toHaveURL('/os');
  14 | 
  15 |   await page.getByRole('link', { name: 'Settings', exact: true }).click();
  16 |   await expect(
  17 |     page.getByRole('button', { name: 'Delete account permanently', exact: true }),
  18 |   ).toHaveCount(0);
  19 | });
  20 | 
```