# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: consulting-project.spec.ts >> consulting project uses the implemented workspace tools end to end
- Location: tests\browser\consulting-project.spec.ts:4:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Add next action', exact: true })
    - locator resolved to <button tabindex="0" type="submit" class="button button-primary ">…</button>
  - attempting click action
    - waiting for element to be visible, enabled and stable
    - element is not stable
  - retrying click action
    - waiting for "http://127.0.0.1:3107/os/capability" navigation to finish...
    - navigated to "http://127.0.0.1:3107/os/capability"
    - waiting for element to be visible, enabled and stable
  - element was detached from the DOM, retrying

```

# Page snapshot

```yaml
- generic [ref=f4e2]:
    - status [ref=f4e3]:
        - generic [ref=f4e6]: Bringing your context together…
    - button "Ask Companion" [ref=f4e7] [cursor=pointer]
```

# Test source

```ts
  1   | import { verifySignup } from './auth-helpers';
  2   | import { test, expect } from '@playwright/test';
  3   |
  4   | test('consulting project uses the implemented workspace tools end to end', async ({ page }) => {
  5   |   await page.goto('/start');
  6   |   await page.getByRole('button', { name: 'Professional', exact: true }).click();
  7   |   await page.getByRole('button', { name: 'Continue', exact: true }).click();
  8   |   await page.getByLabel('Your name').fill('Consulting Project Lead');
  9   |   await page.getByLabel('Email address').fill(`consulting-${Date.now()}@example.test`);
  10  |   await page.getByLabel('Password', { exact: true }).fill('secure-consulting-project-password');
  11  |   await page.getByRole('button', { name: 'Create your workspace', exact: true }).click();
  12  |   await verifySignup(page);
  13  |   await expect(page).toHaveURL('/os');
  14  |
  15  |   await page.getByRole('button', { name: 'New objective', exact: true }).click();
  16  |   await page
  17  |     .getByLabel('Your objective', { exact: true })
  18  |     .fill('Deliver the operating model assessment');
  19  |   await page.getByLabel('Why it matters').fill('Give the client a clear transformation sequence.');
  20  |   await page
  21  |     .getByLabel('What does success look like?')
  22  |     .fill('A prioritized roadmap accepted by the client.');
  23  |   await page.getByRole('button', { name: 'Create objective', exact: true }).click();
  24  |   await expect(page.getByRole('dialog')).toHaveCount(0);
  25  |
  26  |   await page.getByRole('link', { name: 'Clarity', exact: true }).click();
  27  |   await expect(
  28  |     page.getByRole('heading', { name: 'Deliver the operating model assessment' }),
  29  |   ).toBeVisible();
  30  |   await page.getByRole('button', { name: 'View context & success criteria' }).click();
  31  |   await expect(page.getByRole('dialog')).toBeVisible();
  32  |   await page.getByRole('button', { name: 'Close dialog' }).click();
  33  |
  34  |   await page.getByRole('link', { name: 'Capability', exact: true }).click();
  35  |   await page.getByRole('button', { name: 'Add a capability-building action' }).click();
  36  |   await page.getByLabel('Action', { exact: true }).fill('Interview the three stakeholder groups');
  37  |   await page
  38  |     .getByLabel('Notes and acceptance criteria')
  39  |     .fill('Capture constraints, decision rights, and evidence gaps.');
> 40  |   await page.getByRole('button', { name: 'Add next action', exact: true }).click();
      |                                                                            ^ Error: locator.click: Test timeout of 30000ms exceeded.
  41  |
  42  |   await page.getByRole('link', { name: 'Consistency', exact: true }).click();
  43  |   await expect(
  44  |     page.getByRole('button', { name: /Interview the three stakeholder groups/ }),
  45  |   ).toBeVisible();
  46  |   await page.getByRole('button', { name: 'Board', exact: true }).click();
  47  |   await expect(page.locator('.kanban-column')).toHaveCount(5);
  48  |   await page.getByRole('button', { name: /Interview the three stakeholder groups/ }).click();
  49  |   await page.getByRole('button', { name: 'Start action' }).click();
  50  |   await expect(page.getByRole('dialog')).toHaveCount(0);
  51  |
  52  |   await page.getByRole('link', { name: 'Today', exact: true }).click();
  53  |   await expect(page.getByRole('heading', { level: 1 })).toHaveText(
  54  |     'Start With What Matters Today.',
  55  |   );
  56  |   await page.getByRole('link', { name: 'Governance', exact: true }).click();
  57  |   await expect(page.getByRole('heading', { level: 1 })).toHaveText(
  58  |     'Define How LAMID ONE Operates in Your Organization.',
  59  |   );
  60  |   await expect(page.locator('.audit-event').filter({ hasText: 'Action created' })).toContainText(
  61  |     'Interview the three stakeholder groups',
  62  |   );
  63  |
  64  |   await page.getByRole('link', { name: 'Companion', exact: false }).click();
  65  |   await page
  66  |     .getByLabel('What do you want to move forward?')
  67  |     .fill('Prepare the client steering committee');
  68  |   await page.getByRole('button', { name: 'Bring it into focus' }).click();
  69  |   await page
  70  |     .getByLabel('The situation', { exact: true })
  71  |     .fill('The client needs a decision-ready synthesis.');
  72  |   await page
  73  |     .getByLabel('A meaningful outcome')
  74  |     .fill('A concise steering pack with decisions and owners.');
  75  |   await page.getByRole('button', { name: 'Choose the next step' }).click();
  76  |   await page.getByLabel('Your next action (optional)').fill('Draft the decision log');
  77  |   await page.getByRole('button', { name: 'Save my plan' }).click();
  78  |   await expect(page.getByRole('heading', { name: /A clearer direction/ })).toBeVisible();
  79  |
  80  |   await page.getByRole('link', { name: 'Rhythm', exact: true }).click();
  81  |   await page.getByRole('button', { name: 'Record a reflection' }).click();
  82  |   await page
  83  |     .getByLabel('What moved forward?')
  84  |     .fill('Stakeholder interviews created a shared baseline.');
  85  |   await page
  86  |     .getByLabel('What will you carry into the next cycle?')
  87  |     .fill('Turn evidence into the steering pack.');
  88  |   await page.getByRole('button', { name: 'Save reflection' }).click();
  89  |   await expect(page.locator('.review-card')).toContainText(
  90  |     'Stakeholder interviews created a shared baseline.',
  91  |   );
  92  |
  93  |   await page.getByRole('link', { name: 'Progress', exact: true }).click();
  94  |   await expect(page.getByRole('heading', { level: 1 })).toHaveText(
  95  |     'See What Is Changing Over Time.',
  96  |   );
  97  |   await page.getByRole('button', { name: /Search your workspace/ }).click();
  98  |   await page.getByLabel('Search objectives, actions, and pages').fill('assessment');
  99  |   await expect(page.locator('.search-results')).toContainText(
  100 |     'Deliver the operating model assessment',
  101 |   );
  102 |   await page.getByRole('button', { name: 'Close dialog' }).click();
  103 |
  104 |   await page.getByRole('link', { name: 'Settings', exact: true }).click();
  105 |   await page.getByRole('link', { name: /Export workspace data/ }).click();
  106 | });
  107 |
```
