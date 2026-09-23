# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: homepage.spec.ts >> homepage and product page fit narrow screens and the preview remains usable
- Location: tests\browser\homepage.spec.ts:55:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: 'Explore the workspace', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('button', { name: 'Explore the workspace', exact: true }) with timeout 5000ms
  - waiting for getByRole('button', { name: 'Explore the workspace', exact: true })

```

# Page snapshot

```yaml
- generic [ref=f3e2]:
  - banner [ref=f3e3]:
    - generic [ref=f3e4]:
      - link "LAMID ONE home" [ref=f3e5] [cursor=pointer]:
        - /url: /
        - generic [ref=f3e13]: LAMID ONE
      - button "Open navigation" [ref=f3e14] [cursor=pointer]
      - generic [ref=f3e16]:
        - button "Switch to dark mode" [ref=f3e17] [cursor=pointer]
        - link "Experience LAMID ONE" [ref=f3e20] [cursor=pointer]:
          - /url: /start
  - main [ref=f3e24]:
    - generic [ref=f3e25]:
      - generic [ref=f3e26]:
        - generic [ref=f3e27]:
          - generic [ref=f3e28]: PRODUCT OVERVIEW
          - heading "One Continuous Operating System. Built Around Your Context." [level=1] [ref=f3e29]
          - paragraph [ref=f3e30]: Bring human judgment, AI capability, guidance, execution, and progress into one evolving operating experience. Start with what matters now, carry context forward, and go deeper as your needs grow.
          - generic [ref=f3e31]:
            - link "Experience LAMID ONE" [ref=f3e32] [cursor=pointer]:
              - /url: /start
            - link "See How It Works" [ref=f3e33] [cursor=pointer]:
              - /url: /how-it-works
        - img "Context, intelligence, and authorized work connected around human judgment" [ref=f3e34]:
          - generic [ref=f3e36]: CONTEXT IN MOTION
          - generic [ref=f3e37]: HUMAN JUDGMENT AT THE CENTER
          - generic [aria-hidden]: ONE
          - generic [ref=f3e44]:
            - text: Clarity
            - generic [ref=f3e46]: Understand what matters
          - generic [ref=f3e47]:
            - text: Capability
            - generic [ref=f3e49]: Build what comes next
          - generic [ref=f3e50]:
            - text: Consistency
            - generic [ref=f3e52]: Keep progress moving
          - generic [ref=f3e53]:
            - generic [ref=f3e54]: 01 — 03
            - generic [ref=f3e55]:
              - text: ONE CONTINUOUS CYCLE
              - generic [ref=f3e56]: ↗
      - generic [ref=f3e57]:
        - article [ref=f3e58]:
          - generic [ref=f3e59]:
            - generic [ref=f3e60]: "01"
            - heading "Start With Your Objective" [level=2] [ref=f3e61]
          - generic [ref=f3e62]:
            - paragraph [ref=f3e63]: The LAMID ONE Companion works from the situation in front of you and the relevant context carried forward over time, surfaces what matters now, and guides the next step without making you navigate the architecture underneath.
            - link "Explore the Companion" [ref=f3e65] [cursor=pointer]:
              - /url: /product/companion
        - region "Explore the workspace" [ref=f3e66]:
          - generic "Interactive workspace example" [ref=f3e67]:
            - generic [ref=f3e68]:
              - generic [ref=f3e69]: ◐ LAMID ONE
              - generic [ref=f3e70]: Illustrative content
            - generic [ref=f3e71]:
              - tablist "Explore the operating cycle" [ref=f3e73]:
                - tab "Clarity" [selected] [ref=f3e74] [cursor=pointer]
                - tab "Capability" [ref=f3e78] [cursor=pointer]
                - tab "Consistency" [ref=f3e83] [cursor=pointer]
              - tabpanel "Clarity" [ref=f3e87]:
                - generic [ref=f3e88]: CLARITY
                - heading "See the Situation More Clearly." [level=3] [ref=f3e90]
                - paragraph [ref=f3e91]: Before choosing what to do, understand what matters, what is changing, and what may be getting in the way.
                - generic [ref=f3e92]:
                  - generic [ref=f3e93]: Reduce Noise
                  - generic [ref=f3e98]: Understand Context
                  - generic [ref=f3e101]: Reveal Patterns
                - paragraph [ref=f3e107]: A decision. An opportunity. A challenge. A plan.
            - generic [ref=f3e108]:
              - generic [ref=f3e109]: Sample workspace
              - link "Explore the workspace" [ref=f3e111] [cursor=pointer]:
                - /url: /demo
        - article [ref=f3e112]:
          - generic [ref=f3e113]:
            - generic [ref=f3e114]: "02"
            - heading "Continuous Intelligence Keeps the Operating Context Current" [level=2] [ref=f3e115]
          - paragraph [ref=f3e117]: Permitted signals can be sensed, understood, compared, and carried into recommendations as conditions change. Action remains bounded by authorization, and consequential commitment pauses for human judgment unless that exact authority was explicitly delegated in advance under policy.
        - article [ref=f3e118]:
          - generic [ref=f3e119]:
            - generic [ref=f3e120]: "03"
            - heading "Persistent Progression" [level=2] [ref=f3e121]
          - paragraph [ref=f3e123]: Permitted context, intelligence, and already-authorized work can continue progressing across time. Every progression stays inside defined permissions, can be inspected, and can be redirected, paused, revoked, or overridden by an authorized human.
        - article [ref=f3e124]:
          - generic [ref=f3e125]:
            - generic [ref=f3e126]: "04"
            - heading "One OS. Different Relevant Depth." [level=2] [ref=f3e127]
          - generic [ref=f3e128]:
            - paragraph [ref=f3e129]: Persistent progression underneath. Relevant depth above.
            - link "Experience LAMID ONE" [ref=f3e131] [cursor=pointer]:
              - /url: /start
  - contentinfo [ref=f3e132]:
    - generic [ref=f3e133]:
      - generic [ref=f3e134]:
        - link "LAMID ONE home" [ref=f3e135] [cursor=pointer]:
          - /url: /
          - generic [ref=f3e143]:
            - text: LAMID ONE
            - generic [ref=f3e144]: HUMAN JUDGMENT. INFINITE POSSIBILITY.
        - paragraph [ref=f3e145]: Think clearly. Build capability. Make consistent progress.
      - generic [ref=f3e146]:
        - heading "Explore" [level=3] [ref=f3e147]
        - link "The product" [ref=f3e148] [cursor=pointer]:
          - /url: /product
        - link "How it works" [ref=f3e149] [cursor=pointer]:
          - /url: /how-it-works
        - link "Your context" [ref=f3e150] [cursor=pointer]:
          - /url: /who-its-for
      - generic [ref=f3e151]:
        - heading "Learn" [level=3] [ref=f3e152]
        - link "Our story" [ref=f3e153] [cursor=pointer]:
          - /url: /about
        - link "Getting started" [ref=f3e154] [cursor=pointer]:
          - /url: /help/getting-started
        - link "Help center" [ref=f3e155] [cursor=pointer]:
          - /url: /help
      - generic [ref=f3e156]:
        - heading "Trust" [level=3] [ref=f3e157]
        - link "Human control" [ref=f3e158] [cursor=pointer]:
          - /url: /trust/governance
        - link "Privacy & data" [ref=f3e159] [cursor=pointer]:
          - /url: /trust/privacy
        - link "Accessibility" [ref=f3e160] [cursor=pointer]:
          - /url: /accessibility
    - generic [ref=f3e161]:
      - generic [ref=f3e162]: © 2026 LAMID ONE
      - generic [ref=f3e163]: Progress keeps moving. Control stays with you.
      - link "Back to top ↑" [ref=f3e164] [cursor=pointer]:
        - /url: "#top"
  - button "Ask Companion" [ref=f3e165] [cursor=pointer]
```

# Test source

```ts
  1   | ﻿import { test, expect } from '@playwright/test';
  2   | import AxeBuilder from '@axe-core/playwright';
  3   | 
  4   | test('homepage puts its main actions above the fold and the product page preview supports keyboard use', async ({
  5   |   page,
  6   | }) => {
  7   |   await page.setViewportSize({ width: 1440, height: 900 });
  8   |   await page.goto('/');
  9   |   const primary = page
  10  |     .locator('.home-premium-hero .canonical-ctas')
  11  |     .getByRole('link', { name: 'Experience LAMID ONE', exact: true });
  12  |   const bounds = (await primary.boundingBox())!;
  13  |   expect(bounds.y + bounds.height).toBeLessThan(900);
  14  |   await expect(primary).toHaveAttribute('href', '/start');
  15  |   await expect(page.getByRole('tab', { name: 'Clarity', exact: true })).toHaveCount(0);
  16  |   for (const link of await page.locator('.home-section-nav a').all()) {
  17  |     const target = await link.getAttribute('href');
  18  |     await expect(page.locator(target!)).toHaveCount(1);
  19  |   }
  20  |   await expect(page.locator('.home-objective-card')).toHaveCount(3);
  21  |   await page.goto('/product');
  22  |   const clarity = page.getByRole('tab', { name: 'Clarity', exact: true });
  23  |   await clarity.focus();
  24  |   await page.keyboard.press('ArrowRight');
  25  |   await expect(page.getByRole('tab', { name: 'Capability', exact: true })).toBeFocused();
  26  |   await expect(page.getByRole('tabpanel')).toContainText('Know What the Next Step Requires.');
  27  |   await page.keyboard.press('End');
  28  |   await expect(page.getByRole('tab', { name: 'Consistency', exact: true })).toHaveAttribute(
  29  |     'aria-selected',
  30  |     'true',
  31  |   );
  32  |   await expect(page.getByRole('tabpanel')).toContainText(
  33  |     'Turn Good Decisions Into Reliable Progress.',
  34  |   );
  35  |   await page.keyboard.press('Home');
  36  |   await expect(clarity).toHaveAttribute('aria-selected', 'true');
  37  |   for (const link of await page.locator('.home-section-nav a').all()) {
  38  |     const target = await link.getAttribute('href');
  39  |     await expect(page.locator(target!)).toHaveCount(1);
  40  |   }
  41  |   await page.evaluate(() =>
  42  |     Promise.all(
  43  |       document
  44  |         .getAnimations()
  45  |         .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
  46  |         .map((animation) => animation.finished.catch(() => {})),
  47  |     ),
  48  |   );
  49  |   const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  50  |   expect(scan.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }))).toEqual(
  51  |     [],
  52  |   );
  53  | });
  54  | 
  55  | test('homepage and product page fit narrow screens and the preview remains usable', async ({
  56  |   page,
  57  | }) => {
  58  |   for (const width of [320, 390, 768]) {
  59  |     await page.setViewportSize({ width, height: 844 });
  60  |     await page.goto('/');
  61  |     expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
  62  |       width,
  63  |     );
  64  |     await page.goto('/product');
  65  |     expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
  66  |       width,
  67  |     );
  68  |     await page.getByRole('tab', { name: 'Consistency', exact: true }).click();
  69  |     await expect(page.getByRole('tabpanel')).toContainText(
  70  |       'Turn Good Decisions Into Reliable Progress.',
  71  |     );
  72  |     await expect(
  73  |       page.getByRole('button', { name: 'Explore the workspace', exact: true }),
> 74  |     ).toBeVisible();
      |       ^ Error: expect(locator).toBeVisible() failed
  75  |   }
  76  | });
  77  | 
  78  | test('homepage explains its cycle and changes relevant depth by audience', async ({ page }) => {
  79  |   await page.goto('/');
  80  |   await expect(page.getByRole('link', { name: 'Clarity Think clearly.' })).toHaveAttribute(
  81  |     'href',
  82  |     '/how-it-works/clarity',
  83  |   );
  84  |   const selector = page.getByRole('group', { name: 'Choose an audience context' });
  85  |   await selector.getByRole('button', { name: 'Enterprise', exact: true }).click();
  86  |   const example = page.locator('#home-context-example');
  87  |   await expect(example).toContainText('Governance');
  88  |   await expect(example).toContainText('Are teams aligned for the next launch?');
  89  |   await expect(example).not.toContainText('Companion');
  90  |   await selector.getByRole('button', { name: 'Personal', exact: true }).click();
  91  |   await expect(example).toContainText('Companion');
  92  |   await expect(example).toContainText('Is this role the right next move?');
  93  |   await selector.getByRole('button', { name: 'Founder', exact: true }).focus();
  94  |   await page.keyboard.press('Enter');
  95  |   await expect(example).toContainText('Can we afford the next hire?');
  96  |   await selector.getByRole('button', { name: 'Team', exact: true }).click();
  97  |   await expect(example).toContainText('What should we prioritize this week?');
  98  |   await expect(example).not.toContainText('Governance');
  99  |   await expect(page.locator('.home-expansion-path li')).toHaveCount(5);
  100 |   await expect(page.getByRole('heading', { name: 'A project deadline changes.' })).toBeVisible();
  101 |   await expect(page.getByRole('link', { name: 'Explore the product workspace' })).toHaveAttribute(
  102 |     'href',
  103 |     '/product',
  104 |   );
  105 |   await page.evaluate(() =>
  106 |     Promise.all(
  107 |       document
  108 |         .getAnimations()
  109 |         .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
  110 |         .map((animation) => animation.finished.catch(() => {})),
  111 |     ),
  112 |   );
  113 |   const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  114 |   expect(scan.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }))).toEqual(
  115 |     [],
  116 |   );
  117 |   await page.screenshot({ path: 'artifacts/homepage-content-improvements.png', fullPage: true });
  118 | });
  119 | 
  120 | test('outcome choices change content without moving the viewport or panel', async ({ page }) => {
  121 |   for (const width of [1280, 390]) {
  122 |     await page.setViewportSize({ width, height: 900 });
  123 |     await page.goto('/');
  124 |     const choices = page.getByRole('group', { name: 'Choose an outcome' });
  125 |     await choices.scrollIntoViewIfNeeded();
  126 |     const panel = page.locator('#home-outcome-display');
  127 |     const before = await panel.boundingBox();
  128 |     const scroll = await page.evaluate(() => window.scrollY);
  129 |     await choices.getByRole('button', { name: /Strengthen organizational alignment/ }).click();
  130 |     await expect(
  131 |       panel.getByRole('heading', { name: 'Strengthen organizational alignment' }),
  132 |     ).toBeVisible();
  133 |     await expect(
  134 |       panel.getByRole('img', { name: 'Connect teams and responsibilities to a shared priority.' }),
  135 |     ).toHaveCount(1);
  136 |     expect((await panel.boundingBox())!.height).toBe(before!.height);
  137 |     expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
  138 |     await choices.getByRole('button', { name: /Choose your next professional move/ }).click();
  139 |     await expect(
  140 |       panel.getByRole('heading', { name: 'Choose your next professional move' }),
  141 |     ).toBeVisible();
  142 |   }
  143 | });
  144 | 
  145 | test('supporting homepage details expand and collapse with keyboard access', async ({ page }) => {
  146 |   await page.goto('/');
  147 |   for (const label of [
  148 |     'Explore the three ways progress continues',
  149 |     'Explore the intelligence cycle',
  150 |     'How your workspace grows with you',
  151 |     'This Week',
  152 |   ]) {
  153 |     const summary = page.locator('summary').filter({ hasText: label });
  154 |     const disclosure = summary.locator('..');
  155 |     await expect(disclosure).not.toHaveAttribute('open', '');
  156 |     await summary.focus();
  157 |     await page.keyboard.press('Enter');
  158 |     await expect(disclosure).toHaveAttribute('open', '');
  159 |     await page.keyboard.press('Enter');
  160 |     await expect(disclosure).not.toHaveAttribute('open', '');
  161 |   }
  162 | });
  163 | 
```