# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: journey.spec.ts >> public experience and workspace complete a connected operating cycle
- Location: tests\browser\journey.spec.ts:4:1

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/verify\?/
Received string:  "http://127.0.0.1:3107/start"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    14 × locator resolved to <html lang="en">…</html>
       - unexpected value "http://127.0.0.1:3107/start"

```

```yaml
- banner:
  - link "LAMID ONE home":
    - /url: /
    - text: LAMID ONE HUMAN JUDGMENT. INFINITE POSSIBILITY.
  - navigation "Main navigation":
    - link "Home":
      - /url: /
    - button "Product":
      - text: Product
      - img
    - button "Solutions":
      - text: Solutions
      - img
    - button "Experts":
      - text: Experts
      - img
    - button "Resources":
      - text: Resources
      - img
    - link "Pricing":
      - /url: /pricing
  - button "Switch to dark mode"
  - link "Sign in":
    - /url: /login
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
  - text: YOUR FIRST STEP · 2 OF 2
  - heading "A space to make progress." [level=2]:
    - text: A space to
    - emphasis: make progress.
  - paragraph: Create your account to begin in a founder context.
  - text: Your name
  - textbox "Your name":
    - /placeholder: How should we call you?
    - text: Journey Test User
  - text: Email address
  - textbox "Email address":
    - /placeholder: you@example.com
    - text: journey-1790204107491@example.test
  - text: Password
  - textbox "Password":
    - /placeholder: Create a strong password
    - text: secure-journey-test-password
  - button "Show password":
    - img
  - text: Use at least 12 characters.
  - button "One moment…" [disabled]:
    - text: One moment…
    - img
  - button "Change starting context":
    - img
    - text: Change starting context
  - paragraph: Local development edition. Account data is saved on this computer.
  - paragraph:
    - text: Already have a workspace?
    - link "Sign in":
      - /url: /login
  - text: © 2026 LAMID ONE
  - complementary:
    - text: PROGRESS, WITH INTENTION.
    - img "Context, intelligence, and authorized work connected around human judgment": CONTEXT IN MOTION HUMAN JUDGMENT AT THE CENTER Clarity Understand what matters Capability Build what comes next Consistency Keep progress moving 01 — 03 ONE CONTINUOUS CYCLE ↗
    - blockquote:
      - text: “A clearer view. A stronger next step.
      - emphasis: A continuous journey.
      - text: ”
    - text: HUMAN JUDGMENT AT THE CENTER
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
  1  | import { expect, type Page } from '@playwright/test';
  2  | 
  3  | /** Exercise the real signup verification flow using the isolated server's development code. */
  4  | export async function verifySignup(page: Page) {
> 5  |   await expect(page).toHaveURL(/\/verify\?/);
     |                      ^ Error: expect(page).toHaveURL(expected) failed
  6  |   const code = await page.getByTestId('development-otp').innerText();
  7  |   await page.getByLabel('Verification code', { exact: true }).fill(code);
  8  |   await page.getByRole('button', { name: 'Verify account', exact: true }).click();
  9  |   await page.getByRole('link', { name: 'Continue to workspace', exact: true }).click();
  10 | }
  11 | 
```