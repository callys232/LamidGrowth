import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const profiles = [
  ['Lagos', 'en-NG', 'Africa/Lagos', 360, 800, 'Founder', 'Plan my first client project'],
  ['Nairobi', 'en-KE', 'Africa/Nairobi', 390, 844, 'Professional', 'Build my professional skills'],
  ['London', 'en-GB', 'Europe/London', 1440, 900, 'Founder', 'Prepare a client proposal'],
  ['New York', 'en-US', 'America/New_York', 1366, 768, 'Professional', 'Plan a career transition'],
  ['Toronto', 'en-CA', 'America/Toronto', 768, 1024, 'Creator', 'Launch a weekly content series'],
  ['Berlin', 'de-DE', 'Europe/Berlin', 1280, 800, 'Founder', 'Grow my consulting business'],
  ['Mumbai', 'en-IN', 'Asia/Kolkata', 360, 740, 'Individual', 'Make progress on my learning goal'],
  ['Dubai', 'ar-AE', 'Asia/Dubai', 390, 844, 'Founder', 'Plan a new service launch'],
  ['Sao Paulo', 'pt-BR', 'America/Sao_Paulo', 375, 812, 'Creator', 'Prepare a creative project'],
  ['Sydney', 'en-AU', 'Australia/Sydney', 1440, 900, 'Professional', 'Improve my weekly planning'],
] as const;

for (const [city, locale, timezoneId, width, height, role, goal] of profiles) {
  test(`${city}: onboarding, goal and specialist value`, async ({ browser }, info) => {
    const context = await browser.newContext({
      locale,
      timezoneId,
      viewport: { width, height },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const result: Record<string, unknown> = {
      city,
      locale,
      timezoneId,
      viewport: `${width}x${height}`,
      role,
      goal,
      simulated: true,
      stage: 'homepage',
      completed: [],
    };
    const completed = result.completed as string[];
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const start = Date.now();
    const out = `artifacts/usability-10-retest/${city.replaceAll(' ', '-')}`;
    mkdirSync(out, { recursive: true });
    try {
      await page.goto('/');
      await expect(page.getByRole('button', { name: 'Ask Companion', exact: true })).toBeVisible();
      result.homeOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      );
      result.documentLanguage = await page.locator('html').getAttribute('lang');
      const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      result.accessibility = audit.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        count: v.nodes.length,
        description: v.help,
      }));
      await page.screenshot({ path: `${out}/home.png`, fullPage: false });
      completed.push('homepage');
      result.stage = 'signup';
      await page.goto('/start');
      await page.getByRole('button', { name: role, exact: true }).click();
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      await page.getByLabel('Your name').fill(`Simulated ${city}`);
      await page
        .getByLabel('Email address')
        .fill(`regional-${info.workerIndex}-${Date.now()}@example.test`);
      await page.getByLabel('Password', { exact: true }).fill('usability-test-password-123');
      await page.getByRole('button', { name: 'Create your workspace', exact: true }).click();
      await expect(page).toHaveURL(/\/verify\?/);
      result.stage = 'verification';
      const code = await page.getByTestId('development-otp').innerText();
      await page.getByLabel('Verification code', { exact: true }).fill(code);
      await page.getByRole('button', { name: 'Verify account', exact: true }).click();
      await page.getByRole('link', { name: 'Continue to workspace', exact: true }).click();
      await expect(page).toHaveURL(/\/os$/);
      completed.push('signup and development OTP');
      result.welcomeBalance = (
        await (await context.request.get('http://127.0.0.1:3129/api/points')).json()
      ).balance;
      result.stage = 'goal';
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
      completed.push('goal creation');
      result.stage = 'specialist plan';
      await page.goto('/os/companion/chat');
      await page.getByText('Coordinate a task across specialists', { exact: true }).click();
      await page.getByLabel('Task description').fill(goal);
      await page.getByRole('button', { name: 'Preview specialist plan' }).click();
      const card = page.locator('.companion-task-card').filter({ hasText: goal });
      await expect(card).toBeVisible();
      result.plan = await card.innerText();
      await card.getByRole('button', { name: /^Approve / }).click();
      await expect(card.locator('.companion-task-chip').first()).toHaveText('completed', {
        timeout: 45000,
      });
      result.firstResult = await card.innerText();
      result.remainingBalance = (
        await (await context.request.get('http://127.0.0.1:3129/api/points')).json()
      ).balance;
      expect(result.remainingBalance).toBe(500);
      await expect(card).toContainText('Your free worksheet is ready.');
      await expect(card.getByRole('button', { name: /^Approve / })).toHaveCount(0);
      completed.push('free starter worksheet without charge');
      await page.reload();
      await page.getByText('Coordinate a task across specialists', { exact: true }).click();
      await expect(card).toContainText('Your free worksheet is ready.');
      completed.push('saved worksheet survives reload');
      result.workspaceOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      );
      result.stage = 'completed evaluation';
      await page.screenshot({ path: `${out}/workspace.png`, fullPage: false });
    } catch (error) {
      result.failure = (error as Error).message;
      await page.screenshot({ path: `${out}/failure.png`, fullPage: false }).catch(() => {});
      throw error;
    } finally {
      result.elapsedSeconds = Math.round((Date.now() - start) / 1000);
      result.browserErrors = errors;
      result.url = page.url();
      writeFileSync(`${out}/result.json`, JSON.stringify(result, null, 2));
      await context.close();
    }
  });
}
