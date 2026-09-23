# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: regional-usability.spec.ts >> Sao Paulo: onboarding, goal and specialist value
- Location: tests\browser\regional-usability.spec.ts:19:3

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/verify\?/
Received string:  "http://127.0.0.1:3129/start"
Timeout: 25000ms

Call log:
  - Expect "toHaveURL" with timeout 25000ms
    52 × locator resolved to <html lang="en">…</html>
       - unexpected value "http://127.0.0.1:3129/start"

```

```yaml
- banner:
  - link "LAMID ONE home":
    - /url: /
    - text: LAMID ONE
  - button "Open navigation":
    - img
  - button "Switch to dark mode"
  - link "Experience LAMID ONE":
    - /url: /start
    - text: Experience LAMID ONE
    - img
- main:
  - link "LAMID ONE home":
    - /url: /
    - text: LAMID ONE HUMAN JUDGMENT. INFINITE POSSIBILITY.
  - link "Back to LAMID ONE":
    - /url: /
    - img
    - text: Back to LAMID ONE
  - text: YOUR FIRST STEP · 1 OF 2
  - heading "Start with your context." [level=2]:
    - text: Start with
    - emphasis: your context.
  - paragraph: Where are you starting? Choose what fits your work today.
  - button "Individual":
    - img
    - text: Individual
  - button "Professional" [pressed]:
    - img
    - text: Professional
    - img
  - button "Creator":
    - img
    - text: Creator
  - button "Founder":
    - img
    - text: Founder
  - button "Team":
    - img
    - text: Team
  - button "SME":
    - img
    - text: SME
  - button "Enterprise":
    - img
    - text: Enterprise
  - button "Institution":
    - img
    - text: Institution
  - button "Continue":
    - text: Continue
    - img
  - paragraph: Your context can change as your work grows.
  - text: or take a look first
  - button "Explore a sample workspace":
    - text: Explore a sample workspace
    - img
  - paragraph:
    - text: Already have a workspace?
    - link "Sign in":
      - /url: /login
  - text: © 2026 LAMID ONE
  - group: ▸ Getting started
- contentinfo:
  - link "LAMID ONE home":
    - /url: /
    - text: LAMID ONE HUMAN JUDGMENT. INFINITE POSSIBILITY.
  - paragraph: Think clearly. Build capability. Make consistent progress.
  - heading "Explore" [level=3]
  - link "The product":
    - /url: /product
  - link "How it works":
    - /url: /how-it-works
  - link "Your context":
    - /url: /who-its-for
  - heading "Learn" [level=3]
  - link "Our story":
    - /url: /about
  - link "Getting started":
    - /url: /help/getting-started
  - link "Help center":
    - /url: /help
  - heading "Trust" [level=3]
  - link "Human control":
    - /url: /trust/governance
  - link "Privacy & data":
    - /url: /trust/privacy
  - link "Accessibility":
    - /url: /accessibility
  - text: © 2026 LAMID ONE Progress keeps moving. Control stays with you.
  - link "Back to top ↑":
    - /url: "#top"
- button "Ask Companion"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import AxeBuilder from '@axe-core/playwright';
  3   | import { mkdirSync, writeFileSync } from 'node:fs';
  4   | 
  5   | const profiles = [
  6   |   ['Lagos', 'en-NG', 'Africa/Lagos', 360, 800, 'Founder', 'Plan my first client project'],
  7   |   ['Nairobi', 'en-KE', 'Africa/Nairobi', 390, 844, 'Professional', 'Build my professional skills'],
  8   |   ['London', 'en-GB', 'Europe/London', 1440, 900, 'Founder', 'Prepare a client proposal'],
  9   |   ['New York', 'en-US', 'America/New_York', 1366, 768, 'Professional', 'Plan a career transition'],
  10  |   ['Toronto', 'en-CA', 'America/Toronto', 768, 1024, 'Creator', 'Launch a weekly content series'],
  11  |   ['Berlin', 'de-DE', 'Europe/Berlin', 1280, 800, 'Founder', 'Grow my consulting business'],
  12  |   ['Mumbai', 'en-IN', 'Asia/Kolkata', 360, 740, 'Individual', 'Make progress on my learning goal'],
  13  |   ['Dubai', 'ar-AE', 'Asia/Dubai', 390, 844, 'Founder', 'Plan a new service launch'],
  14  |   ['Sao Paulo', 'pt-BR', 'America/Sao_Paulo', 375, 812, 'Creator', 'Prepare a creative project'],
  15  |   ['Sydney', 'en-AU', 'Australia/Sydney', 1440, 900, 'Professional', 'Improve my weekly planning'],
  16  | ] as const;
  17  | 
  18  | for (const [city, locale, timezoneId, width, height, role, goal] of profiles) {
  19  |   test(`${city}: onboarding, goal and specialist value`, async ({ browser }, info) => {
  20  |     const context = await browser.newContext({ locale, timezoneId, viewport: { width, height }, reducedMotion: 'reduce' });
  21  |     const page = await context.newPage();
  22  |     const result: Record<string, unknown> = { city, locale, timezoneId, viewport: `${width}x${height}`, role, goal,
  23  |       simulated: true, stage: 'homepage', completed: [] };
  24  |     const completed = result.completed as string[];
  25  |     const errors: string[] = [];
  26  |     page.on('pageerror', error => errors.push(error.message));
  27  |     const start = Date.now();
  28  |     const out = `artifacts/usability-10-retest/${city.replaceAll(' ', '-')}`;
  29  |     mkdirSync(out, { recursive: true });
  30  |     try {
  31  |       await page.goto('/');
  32  |       await expect(page.getByRole('button', { name: 'Ask Companion', exact: true })).toBeVisible();
  33  |       result.homeOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  34  |       result.documentLanguage = await page.locator('html').getAttribute('lang');
  35  |       const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  36  |       result.accessibility = audit.violations.map(v => ({ id: v.id, impact: v.impact, count: v.nodes.length, description: v.help }));
  37  |       await page.screenshot({ path: `${out}/home.png`, fullPage: false });
  38  |       completed.push('homepage');
  39  |       result.stage = 'signup';
  40  |       await page.goto('/start');
  41  |       await page.getByRole('button', { name: role, exact: true }).click();
  42  |       await page.getByRole('button', { name: 'Continue', exact: true }).click();
  43  |       await page.getByLabel('Your name').fill(`Simulated ${city}`);
  44  |       await page.getByLabel('Email address').fill(`regional-${info.workerIndex}-${Date.now()}@example.test`);
  45  |       await page.getByLabel('Password', { exact: true }).fill('usability-test-password-123');
  46  |       await page.getByRole('button', { name: 'Create your workspace', exact: true }).click();
> 47  |       await expect(page).toHaveURL(/\/verify\?/);
      |                          ^ Error: expect(page).toHaveURL(expected) failed
  48  |       result.stage = 'verification';
  49  |       const code = await page.getByTestId('development-otp').innerText();
  50  |       await page.getByLabel('Verification code', { exact: true }).fill(code);
  51  |       await page.getByRole('button', { name: 'Verify account', exact: true }).click();
  52  |       await page.getByRole('link', { name: 'Continue to workspace', exact: true }).click();
  53  |       await expect(page).toHaveURL(/\/os$/);
  54  |       completed.push('signup and development OTP');
  55  |       result.welcomeBalance = (await (await context.request.get('http://127.0.0.1:3129/api/points')).json()).balance;
  56  |       result.stage = 'goal';
  57  |       await page.getByRole('button', { name: 'New objective', exact: true }).click();
  58  |       await page.getByLabel('Your objective', { exact: true }).fill(goal);
  59  |       await page.getByLabel('Why it matters').fill('Save time and turn an idea into clear next steps.');
  60  |       await page.getByLabel('What does success look like?').fill('A useful plan I can act on this week.');
  61  |       await page.getByRole('button', { name: 'Create objective', exact: true }).click();
  62  |       await expect(page.getByRole('dialog')).toHaveCount(0);
  63  |       completed.push('goal creation');
  64  |       result.stage = 'specialist plan';
  65  |       await page.goto('/os/companion/chat');
  66  |       await page.getByText('Coordinate a task across specialists', { exact: true }).click();
  67  |       await page.getByLabel('Task description').fill(goal);
  68  |       await page.getByRole('button', { name: 'Preview specialist plan' }).click();
  69  |       const card = page.locator('.companion-task-card').filter({ hasText: goal });
  70  |       await expect(card).toBeVisible();
  71  |       result.plan = await card.innerText();
  72  |       await card.getByRole('button', { name: /^Approve / }).click();
  73  |       await expect(card.locator('.companion-task-chip').first()).toHaveText('completed', { timeout: 45000 });
  74  |       result.firstResult = await card.innerText();
  75  |       result.remainingBalance = (await (await context.request.get('http://127.0.0.1:3129/api/points')).json()).balance;
  76  |       expect(result.remainingBalance).toBe(500);
  77  |       await expect(card).toContainText('Your free worksheet is ready.');
  78  |       await expect(card.getByRole('button', { name: /^Approve / })).toHaveCount(0);
  79  |       completed.push('free starter worksheet without charge');
  80  |       await page.reload();
  81  |       await page.getByText('Coordinate a task across specialists', { exact: true }).click();
  82  |       await expect(card).toContainText('Your free worksheet is ready.');
  83  |       completed.push('saved worksheet survives reload');
  84  |       result.workspaceOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  85  |       result.stage = 'completed evaluation';
  86  |       await page.screenshot({ path: `${out}/workspace.png`, fullPage: false });
  87  |     } catch (error) {
  88  |       result.failure = (error as Error).message;
  89  |       await page.screenshot({ path: `${out}/failure.png`, fullPage: false }).catch(() => {});
  90  |       throw error;
  91  |     } finally {
  92  |       result.elapsedSeconds = Math.round((Date.now() - start) / 1000);
  93  |       result.browserErrors = errors;
  94  |       result.url = page.url();
  95  |       writeFileSync(`${out}/result.json`, JSON.stringify(result, null, 2));
  96  |       await context.close();
  97  |     }
  98  |   });
  99  | }
  100 | 
```