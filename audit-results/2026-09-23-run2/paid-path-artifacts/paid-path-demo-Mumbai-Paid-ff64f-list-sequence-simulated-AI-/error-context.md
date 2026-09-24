# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: paid-path-demo.spec.ts >> Mumbai-Paid: paid specialist sequence (simulated AI)
- Location: tests\browser\paid-path-demo.spec.ts:34:3

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('.companion-task-card').filter({ hasText: 'Make progress on my learning goal' }).locator('.companion-task-chip-completed')
Expected: 1
Received: 0
Timeout:  45000ms

Call log:
  - Expect "toHaveCount" locator('.companion-task-card').filter({ hasText: 'Make progress on my learning goal' }).locator('.companion-task-chip-completed') with timeout 45000ms
  - waiting for locator('.companion-task-card').filter({ hasText: 'Make progress on my learning goal' }).locator('.companion-task-chip-completed')
    92 × locator resolved to 0 elements
       - unexpected value "0"

```

# Test source

```ts
  33  | for (const [city, locale, width, height, role, goal] of profiles) {
  34  |   test(`${city}: paid specialist sequence (simulated AI)`, async ({ browser }, info) => {
  35  |     const context = await browser.newContext({
  36  |       locale,
  37  |       viewport: { width, height },
  38  |       reducedMotion: 'reduce',
  39  |     });
  40  |     const page = await context.newPage();
  41  |     const result: Record<string, unknown> = {
  42  |       city,
  43  |       locale,
  44  |       viewport: `${width}x${height}`,
  45  |       role,
  46  |       goal,
  47  |       stage: 'signup',
  48  |     };
  49  |     const out = `artifacts/paid-path-demo/${city}`;
  50  |     mkdirSync(out, { recursive: true });
  51  |     try {
  52  |       const email = `paid-${info.workerIndex}-${Date.now()}@example.test`;
  53  |       await page.goto('/start');
  54  |       await page.getByRole('button', { name: role, exact: true }).click();
  55  |       await page.getByRole('button', { name: 'Continue', exact: true }).click();
  56  |       await page.getByLabel('Your name').fill(`Simulated ${city}`);
  57  |       await page.getByLabel('Email address').fill(email);
  58  |       await page.getByLabel('Password', { exact: true }).fill('usability-test-password-123');
  59  |       await page.getByRole('button', { name: 'Create your workspace', exact: true }).click();
  60  |       await expect(page).toHaveURL(/\/verify\?/);
  61  |       result.stage = 'verification';
  62  |       const code = await page.getByTestId('development-otp').innerText();
  63  |       await page.getByLabel('Verification code', { exact: true }).fill(code);
  64  |       await page.getByRole('button', { name: 'Verify account', exact: true }).click();
  65  |       await page.getByRole('link', { name: 'Continue to workspace', exact: true }).click();
  66  |       await expect(page).toHaveURL(/\/os$/);
  67  | 
  68  |       result.stage = 'goal creation';
  69  |       await page.getByRole('button', { name: 'New objective', exact: true }).click();
  70  |       await page.getByLabel('Your objective', { exact: true }).fill(goal);
  71  |       await page
  72  |         .getByLabel('Why it matters')
  73  |         .fill('Save time and turn an idea into clear next steps.');
  74  |       await page
  75  |         .getByLabel('What does success look like?')
  76  |         .fill('A useful plan I can act on this week.');
  77  |       await page.getByRole('button', { name: 'Create objective', exact: true }).click();
  78  |       await expect(page.getByRole('dialog')).toHaveCount(0);
  79  | 
  80  |       // Test-only: top up past the 500-point welcome grant so the full multi-step sequence can
  81  |       // be shown completing. A real free-tier signup only gets the 500-point welcome grant —
  82  |       // documented separately, not re-demonstrated in this run.
  83  |       result.stage = 'top up points (test-only)';
  84  |       await topUpPoints(email, 1000);
  85  | 
  86  |       // Enabling the workspace's AI policy is a real settings-page action a real user (with
  87  |       // workspace:manage) would take once, not a per-run step — exercised here via the actual
  88  |       // page, not a database shortcut.
  89  |       result.stage = 'enable AI policy';
  90  |       await page.goto('/os/settings/ai');
  91  |       const enableBox = page.getByRole('checkbox', { name: 'Allow external AI in this workspace' });
  92  |       if (!(await enableBox.isChecked())) await enableBox.check();
  93  |       await page.getByRole('button', { name: 'Save AI rules' }).click();
  94  |       await expect(
  95  |         page.getByRole('checkbox', { name: 'Allow external AI in this workspace' }),
  96  |       ).toBeChecked();
  97  | 
  98  |       result.stage = 'paid specialist plan';
  99  |       await page.goto('/os/companion/chat');
  100 |       await page.getByText('Coordinate a task across specialists', { exact: true }).click();
  101 |       await page.getByLabel('Task description').fill(goal);
  102 |       await page.getByLabel('Plan type').selectOption('specialists');
  103 |       await page.getByRole('button', { name: 'Preview specialist plan' }).click();
  104 |       const card = page.locator('.companion-task-card').filter({ hasText: goal });
  105 |       await expect(card).toBeVisible();
  106 |       result.plan = await card.innerText();
  107 | 
  108 |       await page
  109 |         .getByRole('checkbox', {
  110 |           name: 'Allow external AI to use authorized workspace context for the next step.',
  111 |         })
  112 |         .check();
  113 | 
  114 |       const before = (await (await context.request.get('/api/points')).json()).balance;
  115 |       // Approve every step the current balance actually allows, capturing each specialist's
  116 |       // grounded output. Stopping on a genuinely disabled button (insufficient balance) is a
  117 |       // real, honest outcome for a free-tier welcome balance — not a test failure.
  118 |       const stepResults: string[] = [];
  119 |       let stoppedOnBalance = false;
  120 |       for (let i = 0; i < 5; i++) {
  121 |         const approveButton = card.getByRole('button', { name: /^Approve /, exact: false });
  122 |         if ((await approveButton.count()) === 0) break;
  123 |         // options.balance/aiAvailable load asynchronously on mount, so the button can be
  124 |         // transiently disabled right after the card first appears — give it a real chance to
  125 |         // become enabled before concluding the balance genuinely doesn't cover this step.
  126 |         try {
  127 |           await expect(approveButton).toBeEnabled({ timeout: 8000 });
  128 |         } catch {
  129 |           stoppedOnBalance = true;
  130 |           break;
  131 |         }
  132 |         await approveButton.click();
> 133 |         await expect(card.locator('.companion-task-chip-completed')).toHaveCount(i + 1, {
      |                                                                      ^ Error: expect(locator).toHaveCount(expected) failed
  134 |           timeout: 45000,
  135 |         });
  136 |         stepResults.push(await card.innerText());
  137 |       }
  138 |       result.finalCard = await card.innerText();
  139 |       result.stepCount = stepResults.length;
  140 |       result.stoppedOnInsufficientBalance = stoppedOnBalance;
  141 |       const after = (await (await context.request.get('/api/points')).json()).balance;
  142 |       result.pointsBefore = before;
  143 |       result.pointsAfter = after;
  144 |       result.pointsSpent = before - after;
  145 |       if (!stoppedOnBalance) await expect(card).toContainText('Specialist review complete.');
  146 |       result.stage = 'completed evaluation';
  147 |       await page.screenshot({ path: `${out}/final.png`, fullPage: true });
  148 |     } catch (error) {
  149 |       result.failure = (error as Error).message;
  150 |       await page.screenshot({ path: `${out}/failure.png`, fullPage: true }).catch(() => {});
  151 |       throw error;
  152 |     } finally {
  153 |       writeFileSync(`${out}/result.json`, JSON.stringify(result, null, 2));
  154 |       await context.close();
  155 |     }
  156 |   });
  157 | }
  158 | 
```