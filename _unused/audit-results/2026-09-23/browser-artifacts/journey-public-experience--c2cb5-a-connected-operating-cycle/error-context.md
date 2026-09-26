# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: journey.spec.ts >> public experience and workspace complete a connected operating cycle
- Location: tests\browser\journey.spec.ts:4:1

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator: getByRole('heading', { level: 1 })
Expected: "What Needs Your Attention?"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveText" getByRole('heading', { level: 1 }) with timeout 5000ms
  - waiting for getByRole('heading', { level: 1 })

```

```yaml
- status:
    - img
    - text: Bringing your context together…
- button "Ask Companion"
```

# Test source

```ts
  1   | import { verifySignup } from './auth-helpers';
  2   | import { test, expect } from '@playwright/test';
  3   | import AxeBuilder from '@axe-core/playwright';
  4   | test('public experience and workspace complete a connected operating cycle', async ({ page }) => {
  5   |   const errors: string[] = [];
  6   |   page.on('pageerror', (error) => errors.push(error.message));
  7   |   await page.goto('/');
  8   |   await expect(page.getByRole('heading', { level: 1 })).toHaveText(
  9   |     'The Human-AI Growth Operating System',
  10  |   );
  11  |   await page.getByRole('link', { name: 'Experience LAMID ONE', exact: true }).first().click();
  12  |   await expect(page).toHaveURL('/start');
  13  |   await page.getByRole('button', { name: 'Founder', exact: true }).click();
  14  |   await page.getByRole('button', { name: 'Continue', exact: true }).click();
  15  |   await page.getByLabel('Your name').fill('Journey Test User');
  16  |   await page.getByLabel('Email address').fill(`journey-${Date.now()}@example.test`);
  17  |   await page.getByLabel('Password', { exact: true }).fill('secure-journey-test-password');
  18  |   await page.getByRole('button', { name: 'Create your workspace', exact: true }).click();
  19  |   await verifySignup(page);
  20  |   await expect(page).toHaveURL('/os');
> 21  |   await expect(page.getByRole('heading', { level: 1 })).toHaveText('What Needs Your Attention?');
      |                                                         ^ Error: expect(locator).toHaveText(expected) failed
  22  |   await page.getByRole('button', { name: 'New objective', exact: true }).click();
  23  |   await page.getByLabel('Your objective', { exact: true }).fill('Launch a focused service');
  24  |   await page.getByLabel('Why it matters').fill('Make client onboarding clearer.');
  25  |   await page.getByLabel('What does success look like?').fill('Three successful client interviews.');
  26  |   await page.getByRole('button', { name: 'Create objective', exact: true }).click();
  27  |   await expect(page.getByRole('dialog')).toHaveCount(0);
  28  |   await page.getByRole('link', { name: 'Clarity', exact: true }).click();
  29  |   await expect(
  30  |     page.getByRole('heading', { name: 'Launch a focused service', exact: true }),
  31  |   ).toBeVisible();
  32  |   const card = page.locator('.objective-card').filter({ hasText: 'Launch a focused service' });
  33  |   await card.getByRole('button', { name: 'Next action' }).click();
  34  |   await page.getByLabel('Action', { exact: true }).fill('Review the new service draft');
  35  |   await page
  36  |     .getByLabel('Notes and acceptance criteria')
  37  |     .fill('Ensure the offer has a clear audience and measurable outcome.');
  38  |   await page.getByRole('checkbox').check();
  39  |   await page.getByRole('button', { name: 'Add next action', exact: true }).click();
  40  |   await expect(page.getByRole('dialog')).toHaveCount(0);
  41  |   await page.getByRole('link', { name: 'Consistency', exact: true }).click();
  42  |   await page.getByRole('button', { name: /Review the new service draft/ }).click();
  43  |   await page.getByRole('button', { name: 'Start action' }).click();
  44  |   await expect(page.getByRole('dialog')).toHaveCount(0);
  45  |   await page.getByRole('button', { name: /Review the new service draft/ }).click();
  46  |   await page.getByRole('button', { name: 'Submit for review' }).click();
  47  |   await expect(page.getByRole('dialog')).toHaveCount(0);
  48  |   await page.getByRole('link', { name: 'Governance', exact: true }).click();
  49  |   await page.getByRole('button', { name: /Review the new service draft/ }).click();
  50  |   await page.getByRole('button', { name: 'Approve completion' }).click();
  51  |   await expect(page.getByRole('dialog')).toHaveCount(0);
  52  |   await expect(
  53  |     page.locator('.audit-event').filter({ hasText: 'Action approved' }).first(),
  54  |   ).toContainText('Review the new service draft');
  55  |   await page.getByRole('link', { name: 'Rhythm', exact: true }).click();
  56  |   await page.getByRole('button', { name: 'Record a reflection' }).click();
  57  |   await page.getByLabel('What moved forward?').fill('The service offer is reviewed.');
  58  |   await page
  59  |     .getByLabel('What will you carry into the next cycle?')
  60  |     .fill('Run the first customer interview.');
  61  |   await page.getByRole('button', { name: 'Save reflection' }).click();
  62  |   await expect(page.getByRole('dialog')).toHaveCount(0);
  63  |   await page.reload();
  64  |   await expect(page.locator('.review-card')).toContainText('The service offer is reviewed.');
  65  |   expect(errors).toEqual([]);
  66  | });
  67  | test('mobile navigation and onboarding work without horizontal overflow', async ({ page }) => {
  68  |   await page.setViewportSize({ width: 390, height: 844 });
  69  |   await page.goto('/');
  70  |   expect(
  71  |     await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  72  |   ).toBeTruthy();
  73  |   await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  74  |   await page.getByRole('button', { name: 'Solutions', exact: true }).click();
  75  |   await page
  76  |     .locator('.mega-panel')
  77  |     .getByRole('link', { name: /^How it works/ })
  78  |     .click();
  79  |   await expect(page).toHaveURL('/how-it-works');
  80  |   await page.goto('/start');
  81  |   await page.getByRole('button', { name: 'Founder', exact: true }).click();
  82  |   await page.getByRole('button', { name: 'Continue', exact: true }).click();
  83  |   await page.getByLabel('Your name').fill('Jordan Test');
  84  |   await page.getByLabel('Email address').fill(`jordan-${Date.now()}@example.test`);
  85  |   await page.getByLabel('Password', { exact: true }).fill('secure-browser-test-password');
  86  |   await page.getByRole('button', { name: 'Create your workspace' }).click();
  87  |   await verifySignup(page);
  88  |   await expect(page).toHaveURL('/os');
  89  |   await expect(page.getByRole('heading', { level: 1 })).toHaveText('What Needs Your Attention?');
  90  |   expect(
  91  |     await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  92  |   ).toBeTruthy();
  93  |   await page.getByRole('button', { name: 'Open workspace navigation' }).click();
  94  |   await page
  95  |     .getByRole('navigation', { name: 'Workspace navigation' })
  96  |     .getByRole('link', { name: 'Companion', exact: false })
  97  |     .click();
  98  |   await page
  99  |     .getByLabel('What do you want to move forward?')
  100 |     .fill('Build a sustainable daily practice');
  101 |   await page.getByRole('button', { name: 'Bring it into focus' }).click();
  102 |   await page.getByLabel('The situation', { exact: true }).fill('I need time for focused work.');
  103 |   await page.getByLabel('A meaningful outcome').fill('Two hours of focused work per day.');
  104 |   await page.getByRole('button', { name: 'Explore a pathway' }).click();
  105 |   await expect(page.getByRole('region', { name: 'Suggested pathway' })).toBeVisible();
  106 |   await page.getByLabel('Your next action (optional)').fill('Reserve a morning work block');
  107 |   await expect(page.getByRole('button', { name: 'Save my plan' })).toBeEnabled();
  108 |   await page.getByRole('button', { name: 'Save my plan' }).click();
  109 |   await expect(
  110 |     page.getByRole('heading', { name: 'A clearer direction. A concrete next step.' }),
  111 |   ).toBeVisible();
  112 |   expect(
  113 |     await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  114 |   ).toBeTruthy();
  115 | });
  116 | test('keyboard search, dialogs, and accessibility semantics', async ({ page }) => {
  117 |   // This test needs the pre-seeded demo workspace ("Launch our advisory practice") for its
  118 |   // search assertion below, so it signs into a demo account directly rather than through the
  119 |   // real signup flow (which starts from an empty workspace).
  120 |   await page.goto('/');
  121 |   await page.request.post('/api/auth/demo', { data: {} });
```
