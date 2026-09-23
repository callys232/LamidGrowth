import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

// Simulates an actual first-time visitor, not an automation script: real per-character typing
// speed, pauses to "read" a page before acting, navigation via clicking real links/buttons
// (never page.goto() as a shortcut past the UI), and motion left on rather than disabled. This
// intentionally covers less ground than deep-coverage.spec.ts — the goal here isn't functional
// coverage, it's whether the highest-stakes first few minutes actually feel good at human speed.

const READ = { short: [800, 1600], medium: [1800, 3200], long: [3000, 5000] } as const;
function pause(range: readonly [number, number]) {
  const [min, max] = range;
  return Math.round(min + Math.random() * (max - min));
}
async function humanType(locator: import('@playwright/test').Locator, text: string) {
  await locator.click();
  await locator.pressSequentially(text, { delay: 55 + Math.random() * 70 });
}

test('a real first-time visitor: homepage, signup, first goal, first free outcome', async ({
  page,
}) => {
  const result: Record<string, unknown> = {
    stage: 'homepage',
    completed: [] as string[],
    timings: {} as Record<string, number>,
  };
  const completed = result.completed as string[];
  const timings = result.timings as Record<string, number>;
  const out = 'artifacts/human-pace';
  mkdirSync(out, { recursive: true });
  const started = Date.now();
  const mark = (label: string) => {
    timings[label] = Math.round((Date.now() - started) / 1000);
  };

  try {
    // Arrive at the actual homepage, not /start — a real visitor doesn't know the shortcut URL.
    result.stage = 'homepage';
    await page.goto('/');
    await page.waitForTimeout(pause(READ.medium)); // a human looks at the page before doing anything
    await page.screenshot({ path: `${out}/01-homepage.png` });
    completed.push('landed on homepage');

    // Find and click through to start, the way a real visitor would — not a direct URL.
    const ctaLink = page.getByRole('link', { name: 'Experience LAMID ONE', exact: true }).first();
    await ctaLink.scrollIntoViewIfNeeded();
    await page.waitForTimeout(pause(READ.short));
    await ctaLink.click();
    await page.waitForTimeout(pause(READ.short));
    mark('reached start page');
    completed.push('clicked through to start');

    // Pick a context — a human reads the options first.
    result.stage = 'context selection';
    await page.waitForTimeout(pause(READ.medium));
    await page.getByRole('button', { name: 'Founder', exact: true }).click();
    await page.waitForTimeout(pause(READ.short));
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.waitForTimeout(pause(READ.short));
    completed.push('selected context');

    // Sign up — real typing speed, not an instant paste.
    result.stage = 'signup';
    const email = `human-pace-${Date.now()}@example.test`;
    await humanType(page.getByLabel('Your name'), 'Jordan Rivera');
    await page.waitForTimeout(pause(READ.short));
    await humanType(page.getByLabel('Email address'), email);
    await page.waitForTimeout(pause(READ.short));
    await humanType(page.getByLabel('Password', { exact: true }), 'a-real-feeling-password-42');
    await page.waitForTimeout(pause(READ.short)); // a human glances back over the form before submitting
    await page.getByRole('button', { name: 'Create your workspace', exact: true }).click();
    await expect(page).toHaveURL(/\/verify\?/, { timeout: 30000 });
    mark('reached verification');
    completed.push('submitted signup');

    // Verification — a real user has to actually go check their email and copy a code; the
    // closest honest simulation is reading the dev-mode code and typing it, not injecting it.
    result.stage = 'verification';
    await page.waitForTimeout(pause(READ.long)); // "switching to email, finding the code"
    const code = await page.getByTestId('development-otp').innerText();
    await humanType(page.getByLabel('Verification code', { exact: true }), code);
    await page.waitForTimeout(pause(READ.short));
    await page.getByRole('button', { name: 'Verify account', exact: true }).click();
    await page.waitForTimeout(pause(READ.short));
    await page.getByRole('link', { name: 'Continue to workspace', exact: true }).click();
    await expect(page).toHaveURL(/\/os$/, { timeout: 30000 });
    mark('reached workspace');
    completed.push('verified account, entered workspace');
    await page.screenshot({ path: `${out}/02-workspace-first-look.png` });

    // A human looks around the empty dashboard before doing anything.
    await page.waitForTimeout(pause(READ.long));

    // First goal — a real user thinks about what to type, not instant-fills a canned string.
    result.stage = 'first goal';
    await page.getByRole('button', { name: 'New objective', exact: true }).click();
    await page.waitForTimeout(pause(READ.medium)); // reading the form before starting to type
    await humanType(
      page.getByLabel('Your objective', { exact: true }),
      'Get my freelance design business off the ground',
    );
    await page.waitForTimeout(pause(READ.short));
    await humanType(
      page.getByLabel('Why it matters'),
      'I want steady income doing work I actually like.',
    );
    await page.waitForTimeout(pause(READ.short));
    await humanType(
      page.getByLabel('What does success look like?'),
      'Three paying clients within two months.',
    );
    await page.waitForTimeout(pause(READ.medium)); // reviewing before submitting
    await page.getByRole('button', { name: 'Create objective', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 30000 });
    mark('created first goal');
    completed.push('created first goal');

    // A human notices the toast and reads it before moving on.
    await page.waitForTimeout(pause(READ.medium));
    await page.screenshot({ path: `${out}/03-goal-created.png` });

    // Navigate to the Companion by clicking the real sidebar link, not a URL jump.
    result.stage = 'navigate to companion';
    await page
      .getByRole('navigation', { name: 'Workspace navigation' })
      .getByRole('link', { name: 'Companion', exact: false })
      .click();
    await page.waitForTimeout(pause(READ.medium));
    completed.push('navigated to Companion via sidebar');

    // Find and try the free coordinated task — a real user reads the copy first.
    result.stage = 'first free outcome';
    const coordinateSection = page.getByText('Coordinate a task across specialists', {
      exact: true,
    });
    await coordinateSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(pause(READ.medium));
    await coordinateSection.click();
    await page.waitForTimeout(pause(READ.short));
    await humanType(
      page.getByLabel('Task description'),
      'Get my freelance design business off the ground',
    );
    await page.waitForTimeout(pause(READ.short));
    await page.getByRole('button', { name: 'Preview specialist plan' }).click();
    await page.waitForTimeout(pause(READ.medium)); // reading the plan before approving anything
    const card = page.locator('.companion-task-card').first();
    await expect(card).toBeVisible({ timeout: 30000 });
    await card.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${out}/04-plan-preview.png` });
    await page.waitForTimeout(pause(READ.long)); // deciding whether to actually approve it
    await card.getByRole('button', { name: /^Approve /, exact: false }).click();
    await expect(card).toContainText('Your free worksheet is ready.', { timeout: 60000 });
    mark('completed first free outcome');
    completed.push('ran and read the free starter worksheet');

    // A human actually reads the result, not just checks it exists.
    await page.waitForTimeout(pause(READ.long));
    result.finalWorksheetText = await card.innerText();
    await page.screenshot({ path: `${out}/05-first-outcome.png`, fullPage: true });

    result.stage = 'completed evaluation';
    result.totalSeconds = Math.round((Date.now() - started) / 1000);
  } catch (error) {
    result.failure = (error as Error).message;
    await page.screenshot({ path: `${out}/failure.png`, fullPage: true }).catch(() => {});
    throw error;
  } finally {
    writeFileSync(`${out}/result.json`, JSON.stringify(result, null, 2));
  }
});
