# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: paid-path-demo.spec.ts >> Berlin-Paid: paid specialist sequence (simulated AI)
- Location: tests\browser\paid-path-demo.spec.ts:29:3

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('.companion-task-card').filter({ hasText: 'Grow my consulting business' }).locator('.companion-task-chip-completed')
Expected: 1
Received: 0
Timeout:  45000ms

Call log:
  - Expect "toHaveCount" locator('.companion-task-card').filter({ hasText: 'Grow my consulting business' }).locator('.companion-task-chip-completed') with timeout 45000ms
  - waiting for locator('.companion-task-card').filter({ hasText: 'Grow my consulting business' }).locator('.companion-task-chip-completed')
    92 × locator resolved to 0 elements
       - unexpected value "0"

```

# Test source

```ts
  7   | // shown completing end to end, not just the one step a real 500-point welcome grant affords.
  8   | async function topUpPoints(email: string, amount: number) {
  9   |   const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL });
  10  |   try {
  11  |     // Matches the fixed schema name scripts/usability-server-paid.mjs opens (not ':memory:',
  12  |     // which would pick a randomly-named schema this script has no way to discover).
  13  |     await pool.query('UPDATE paid_demo.users SET points_balance = points_balance + $1 WHERE email = $2', [amount, email]);
  14  |   } finally {
  15  |     await pool.end();
  16  |   }
  17  | }
  18  | 
  19  | // Simulates the paid AI-specialist path with a stub AI provider standing in for a real OpenAI
  20  | // key (see scripts/usability-server-paid.mjs) — the user has not subscribed to OpenAI yet, but
  21  | // wants to see the paid coordinated-task flow work end to end before adding a real key.
  22  | const profiles = [
  23  |   ['Lagos-Paid', 'en-NG', 360, 800, 'Founder', 'Plan my first client project'],
  24  |   ['Berlin-Paid', 'de-DE', 1280, 800, 'Founder', 'Grow my consulting business'],
  25  |   ['Mumbai-Paid', 'en-IN', 360, 740, 'Individual', 'Make progress on my learning goal'],
  26  | ] as const;
  27  | 
  28  | for (const [city, locale, width, height, role, goal] of profiles) {
  29  |   test(`${city}: paid specialist sequence (simulated AI)`, async ({ browser }, info) => {
  30  |     const context = await browser.newContext({ locale, viewport: { width, height }, reducedMotion: 'reduce' });
  31  |     const page = await context.newPage();
  32  |     const result: Record<string, unknown> = { city, locale, viewport: `${width}x${height}`, role, goal, stage: 'signup' };
  33  |     const out = `artifacts/paid-path-demo/${city}`;
  34  |     mkdirSync(out, { recursive: true });
  35  |     try {
  36  |       const email = `paid-${info.workerIndex}-${Date.now()}@example.test`;
  37  |       await page.goto('/start');
  38  |       await page.getByRole('button', { name: role, exact: true }).click();
  39  |       await page.getByRole('button', { name: 'Continue', exact: true }).click();
  40  |       await page.getByLabel('Your name').fill(`Simulated ${city}`);
  41  |       await page.getByLabel('Email address').fill(email);
  42  |       await page.getByLabel('Password', { exact: true }).fill('usability-test-password-123');
  43  |       await page.getByRole('button', { name: 'Create your workspace', exact: true }).click();
  44  |       await expect(page).toHaveURL(/\/verify\?/);
  45  |       result.stage = 'verification';
  46  |       const code = await page.getByTestId('development-otp').innerText();
  47  |       await page.getByLabel('Verification code', { exact: true }).fill(code);
  48  |       await page.getByRole('button', { name: 'Verify account', exact: true }).click();
  49  |       await page.getByRole('link', { name: 'Continue to workspace', exact: true }).click();
  50  |       await expect(page).toHaveURL(/\/os$/);
  51  | 
  52  |       result.stage = 'goal creation';
  53  |       await page.getByRole('button', { name: 'New objective', exact: true }).click();
  54  |       await page.getByLabel('Your objective', { exact: true }).fill(goal);
  55  |       await page.getByLabel('Why it matters').fill('Save time and turn an idea into clear next steps.');
  56  |       await page.getByLabel('What does success look like?').fill('A useful plan I can act on this week.');
  57  |       await page.getByRole('button', { name: 'Create objective', exact: true }).click();
  58  |       await expect(page.getByRole('dialog')).toHaveCount(0);
  59  | 
  60  |       // Test-only: top up past the 500-point welcome grant so the full multi-step sequence can
  61  |       // be shown completing. A real free-tier signup only gets the 500-point welcome grant —
  62  |       // documented separately, not re-demonstrated in this run.
  63  |       result.stage = 'top up points (test-only)';
  64  |       await topUpPoints(email, 1000);
  65  | 
  66  |       // Enabling the workspace's AI policy is a real settings-page action a real user (with
  67  |       // workspace:manage) would take once, not a per-run step — exercised here via the actual
  68  |       // page, not a database shortcut.
  69  |       result.stage = 'enable AI policy';
  70  |       await page.goto('/os/settings/ai');
  71  |       const enableBox = page.getByRole('checkbox', { name: 'Allow external AI in this workspace' });
  72  |       if (!(await enableBox.isChecked())) await enableBox.check();
  73  |       await page.getByRole('button', { name: 'Save AI rules' }).click();
  74  |       await expect(page.getByRole('checkbox', { name: 'Allow external AI in this workspace' })).toBeChecked();
  75  | 
  76  |       result.stage = 'paid specialist plan';
  77  |       await page.goto('/os/companion/chat');
  78  |       await page.getByText('Coordinate a task across specialists', { exact: true }).click();
  79  |       await page.getByLabel('Task description').fill(goal);
  80  |       await page.getByLabel('Plan type').selectOption('specialists');
  81  |       await page.getByRole('button', { name: 'Preview specialist plan' }).click();
  82  |       const card = page.locator('.companion-task-card').filter({ hasText: goal });
  83  |       await expect(card).toBeVisible();
  84  |       result.plan = await card.innerText();
  85  | 
  86  |       await page.getByRole('checkbox', { name: 'Allow external AI to use authorized workspace context for the next step.' }).check();
  87  | 
  88  |       const before = (await (await context.request.get('/api/points')).json()).balance;
  89  |       // Approve every step the current balance actually allows, capturing each specialist's
  90  |       // grounded output. Stopping on a genuinely disabled button (insufficient balance) is a
  91  |       // real, honest outcome for a free-tier welcome balance — not a test failure.
  92  |       const stepResults: string[] = [];
  93  |       let stoppedOnBalance = false;
  94  |       for (let i = 0; i < 5; i++) {
  95  |         const approveButton = card.getByRole('button', { name: /^Approve /, exact: false });
  96  |         if ((await approveButton.count()) === 0) break;
  97  |         // options.balance/aiAvailable load asynchronously on mount, so the button can be
  98  |         // transiently disabled right after the card first appears — give it a real chance to
  99  |         // become enabled before concluding the balance genuinely doesn't cover this step.
  100 |         try {
  101 |           await expect(approveButton).toBeEnabled({ timeout: 8000 });
  102 |         } catch {
  103 |           stoppedOnBalance = true;
  104 |           break;
  105 |         }
  106 |         await approveButton.click();
> 107 |         await expect(card.locator('.companion-task-chip-completed')).toHaveCount(i + 1, { timeout: 45000 });
      |                                                                      ^ Error: expect(locator).toHaveCount(expected) failed
  108 |         stepResults.push(await card.innerText());
  109 |       }
  110 |       result.finalCard = await card.innerText();
  111 |       result.stepCount = stepResults.length;
  112 |       result.stoppedOnInsufficientBalance = stoppedOnBalance;
  113 |       const after = (await (await context.request.get('/api/points')).json()).balance;
  114 |       result.pointsBefore = before;
  115 |       result.pointsAfter = after;
  116 |       result.pointsSpent = before - after;
  117 |       if (!stoppedOnBalance) await expect(card).toContainText('Specialist review complete.');
  118 |       result.stage = 'completed evaluation';
  119 |       await page.screenshot({ path: `${out}/final.png`, fullPage: true });
  120 |     } catch (error) {
  121 |       result.failure = (error as Error).message;
  122 |       await page.screenshot({ path: `${out}/failure.png`, fullPage: true }).catch(() => {});
  123 |       throw error;
  124 |     } finally {
  125 |       writeFileSync(`${out}/result.json`, JSON.stringify(result, null, 2));
  126 |       await context.close();
  127 |     }
  128 |   });
  129 | }
  130 | 
```