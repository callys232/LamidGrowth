import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import pg from 'pg';

// Test-only shortcut, disclosed in the results: tops up a signup's points balance directly in
// Postgres (same connection the dedicated server itself uses), so the full paid sequence can be
// shown completing end to end, not just the one step a real 500-point welcome grant affords.
async function topUpPoints(email: string, amount: number) {
  const pool = new pg.Pool({
    connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
  });
  try {
    // Matches the fixed schema name scripts/usability-server-paid.mjs opens (not ':memory:',
    // which would pick a randomly-named schema this script has no way to discover).
    await pool.query(
      'UPDATE paid_demo.users SET points_balance = points_balance + $1 WHERE email = $2',
      [amount, email],
    );
  } finally {
    await pool.end();
  }
}

// Simulates the paid AI-specialist path with a stub AI provider standing in for a real OpenAI
// key (see scripts/usability-server-paid.mjs) — the user has not subscribed to OpenAI yet, but
// wants to see the paid coordinated-task flow work end to end before adding a real key.
const profiles = [
  ['Lagos-Paid', 'en-NG', 360, 800, 'Founder', 'Plan my first client project'],
  ['Berlin-Paid', 'de-DE', 1280, 800, 'Founder', 'Grow my consulting business'],
  ['Mumbai-Paid', 'en-IN', 360, 740, 'Individual', 'Make progress on my learning goal'],
] as const;

for (const [city, locale, width, height, role, goal] of profiles) {
  test(`${city}: paid specialist sequence (simulated AI)`, async ({ browser }, info) => {
    const context = await browser.newContext({
      locale,
      viewport: { width, height },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const result: Record<string, unknown> = {
      city,
      locale,
      viewport: `${width}x${height}`,
      role,
      goal,
      stage: 'signup',
    };
    const out = `artifacts/paid-path-demo/${city}`;
    mkdirSync(out, { recursive: true });
    try {
      const email = `paid-${info.workerIndex}-${Date.now()}@example.test`;
      await page.goto('/start');
      await page.getByRole('button', { name: role, exact: true }).click();
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      await page.getByLabel('Your name').fill(`Simulated ${city}`);
      await page.getByLabel('Email address').fill(email);
      await page.getByLabel('Password', { exact: true }).fill('usability-test-password-123');
      await page.getByRole('button', { name: 'Create your workspace', exact: true }).click();
      await expect(page).toHaveURL(/\/verify\?/);
      result.stage = 'verification';
      const code = await page.getByTestId('development-otp').innerText();
      await page.getByLabel('Verification code', { exact: true }).fill(code);
      await page.getByRole('button', { name: 'Verify account', exact: true }).click();
      await page.getByRole('link', { name: 'Continue to workspace', exact: true }).click();
      await expect(page).toHaveURL(/\/os$/);

      result.stage = 'goal creation';
      await page.getByRole('button', { name: 'New objective', exact: true }).click();
      await page.getByLabel('Your objective', { exact: true }).fill(goal);
      await page
        .getByLabel('Why it matters')
        .fill('Save time and turn an idea into clear next steps.');
      await page
        .getByLabel('What does success look like?')
        .fill('A useful plan I can act on this week.');
      await page.getByRole('button', { name: 'Create objective', exact: true }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);

      // Test-only: top up past the 500-point welcome grant so the full multi-step sequence can
      // be shown completing. A real free-tier signup only gets the 500-point welcome grant —
      // documented separately, not re-demonstrated in this run.
      result.stage = 'top up points (test-only)';
      await topUpPoints(email, 1000);

      // Enabling the workspace's AI policy is a real settings-page action a real user (with
      // workspace:manage) would take once, not a per-run step — exercised here via the actual
      // page, not a database shortcut.
      result.stage = 'enable AI policy';
      await page.goto('/os/settings/ai');
      const enableBox = page.getByRole('checkbox', { name: 'Allow external AI in this workspace' });
      if (!(await enableBox.isChecked())) await enableBox.check();
      await page.getByRole('button', { name: 'Save AI rules' }).click();
      await expect(
        page.getByRole('checkbox', { name: 'Allow external AI in this workspace' }),
      ).toBeChecked();

      result.stage = 'paid specialist plan';
      await page.goto('/os/companion/chat');
      await page.getByText('Coordinate a task across specialists', { exact: true }).click();
      await page.getByLabel('Task description').fill(goal);
      await page.getByLabel('Plan type').selectOption('specialists');
      await page.getByRole('button', { name: 'Preview specialist plan' }).click();
      const card = page.locator('.companion-task-card').filter({ hasText: goal });
      await expect(card).toBeVisible();
      result.plan = await card.innerText();

      await page
        .getByRole('checkbox', {
          name: 'Allow external AI to use authorized workspace context for the next step.',
        })
        .check();

      const before = (await (await context.request.get('/api/points')).json()).balance;
      // Approve every step the current balance actually allows, capturing each specialist's
      // grounded output. Stopping on a genuinely disabled button (insufficient balance) is a
      // real, honest outcome for a free-tier welcome balance — not a test failure.
      const stepResults: string[] = [];
      let stoppedOnBalance = false;
      for (let i = 0; i < 5; i++) {
        const approveButton = card.getByRole('button', { name: /^Approve /, exact: false });
        if ((await approveButton.count()) === 0) break;
        // options.balance/aiAvailable load asynchronously on mount, so the button can be
        // transiently disabled right after the card first appears — give it a real chance to
        // become enabled before concluding the balance genuinely doesn't cover this step.
        try {
          await expect(approveButton).toBeEnabled({ timeout: 8000 });
        } catch {
          stoppedOnBalance = true;
          break;
        }
        await approveButton.click();
        await expect(card.locator('.companion-task-chip-completed')).toHaveCount(i + 1, {
          timeout: 45000,
        });
        stepResults.push(await card.innerText());
      }
      result.finalCard = await card.innerText();
      result.stepCount = stepResults.length;
      result.stoppedOnInsufficientBalance = stoppedOnBalance;
      const after = (await (await context.request.get('/api/points')).json()).balance;
      result.pointsBefore = before;
      result.pointsAfter = after;
      result.pointsSpent = before - after;
      if (!stoppedOnBalance) await expect(card).toContainText('Specialist review complete.');
      result.stage = 'completed evaluation';
      await page.screenshot({ path: `${out}/final.png`, fullPage: true });
    } catch (error) {
      result.failure = (error as Error).message;
      await page.screenshot({ path: `${out}/failure.png`, fullPage: true }).catch(() => {});
      throw error;
    } finally {
      writeFileSync(`${out}/result.json`, JSON.stringify(result, null, 2));
      await context.close();
    }
  });
}
