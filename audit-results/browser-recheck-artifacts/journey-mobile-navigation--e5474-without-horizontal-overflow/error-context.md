# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: journey.spec.ts >> mobile navigation and onboarding work without horizontal overflow
- Location: tests\browser\journey.spec.ts:67:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Choose the next step' })

```

# Page snapshot

```yaml
- generic [ref=f1e2]:
  - generic [ref=f1e3]:
    - link "Skip to workspace" [ref=f1e4] [cursor=pointer]:
      - /url: "#workspace-main"
    - complementary [ref=f1e5]:
      - generic [ref=f1e6]:
        - link "LAMID ONE home" [ref=f1e7] [cursor=pointer]:
          - /url: /
          - generic [ref=f1e15]: LAMID ONE
        - button "Close navigation" [ref=f1e16] [cursor=pointer]
      - generic [ref=f1e20]:
        - generic [ref=f1e21]: J
        - generic [ref=f1e22]:
          - strong [ref=f1e23]: Jordan's workspace
          - generic [ref=f1e24]: Founder workspace
        - combobox "Switch workspace" [ref=f1e25] [cursor=pointer]:
          - option "Jordan's workspace" [selected]
      - generic [ref=f1e28]: YOUR OPERATING SPACE
      - navigation "Workspace navigation" [ref=f1e29]:
        - link "Overview" [ref=f1e30] [cursor=pointer]:
          - /url: /os
        - link "AI Settings" [ref=f1e36] [cursor=pointer]:
          - /url: /os/settings/ai
        - link "Today" [ref=f1e40] [cursor=pointer]:
          - /url: /os/today
        - link "Clarity" [ref=f1e47] [cursor=pointer]:
          - /url: /os/clarity
        - link "Capability" [ref=f1e51] [cursor=pointer]:
          - /url: /os/capability
        - link "Consistency" [ref=f1e56] [cursor=pointer]:
          - /url: /os/consistency
        - link "Progress" [ref=f1e60] [cursor=pointer]:
          - /url: /os/progress
        - link "Rhythm" [ref=f1e64] [cursor=pointer]:
          - /url: /os/rhythm
        - link "Commercial" [ref=f1e67] [cursor=pointer]:
          - /url: /os/commercial
        - link "Knowledge" [ref=f1e72] [cursor=pointer]:
          - /url: /os/knowledge
        - link "Talent" [ref=f1e77] [cursor=pointer]:
          - /url: /os/talent
        - link "Finance" [ref=f1e83] [cursor=pointer]:
          - /url: /os/finance
        - link "People" [ref=f1e87] [cursor=pointer]:
          - /url: /os/people
        - link "Engines" [ref=f1e93] [cursor=pointer]:
          - /url: /os/engines
        - link "Guided Scoping" [ref=f1e97] [cursor=pointer]:
          - /url: /os/scoping/new
        - link "Learning" [ref=f1e101] [cursor=pointer]:
          - /url: /os/learning
        - link "Companion GUIDED" [ref=f1e106] [cursor=pointer]:
          - /url: /os/companion
          - text: Companion
          - generic [ref=f1e109]: GUIDED
        - link "Workflows" [ref=f1e110] [cursor=pointer]:
          - /url: /os/workflows
        - link "Governance" [ref=f1e115] [cursor=pointer]:
          - /url: /os/governance
      - generic [ref=f1e119]:
        - generic [ref=f1e124]:
          - text: Your work. Your judgment.
          - generic [ref=f1e125]: You decide what happens next.
        - link "Settings" [ref=f1e126] [cursor=pointer]:
          - /url: /os/settings
        - generic [ref=f1e130]:
          - generic [ref=f1e131]: JT
          - generic [ref=f1e132]:
            - strong [ref=f1e133]: Jordan Test
            - generic [ref=f1e134]: Workspace owner
          - button "Sign out" [ref=f1e135] [cursor=pointer]
    - generic [ref=f1e139]:
      - banner [ref=f1e140]:
        - generic [ref=f1e141]:
          - button "Open workspace navigation" [ref=f1e142] [cursor=pointer]
          - generic [ref=f1e144]: Workspace
          - generic [ref=f1e145]: /
          - generic [ref=f1e146]: Companion
        - generic [ref=f1e147]:
          - button [ref=f1e148] [cursor=pointer]
          - link "0 actions need review" [ref=f1e152] [cursor=pointer]:
            - /url: /os/today
          - generic [ref=f1e156]: J
      - main [ref=f1e157]:
        - generic [ref=f1e159]:
          - generic [ref=f1e160]: COMPANION · SPACE TO THINK
          - heading "What Are You Working Through?" [level=1] [ref=f1e161]
          - paragraph [ref=f1e162]: Describe the decision, challenge, opportunity, or objective. Add the context that matters and set what may continue progressing between interactions. You remain able to review, redirect, pause, revoke, or override what happens next.
        - paragraph [ref=f1e163]:
          - link "Review an existing objective with AI" [ref=f1e164] [cursor=pointer]:
            - /url: /os/insights
          - text: ", or use guided planning below."
        - generic [ref=f1e165]:
          - generic [ref=f1e166]:
            - generic [ref=f1e171]:
              - strong [ref=f1e172]: Your thinking partner
              - generic [ref=f1e173]: Guided planning · based on your inputs
            - generic [ref=f1e174]:
              - generic [ref=f1e175]: Build a sustainable daily practice
              - generic [ref=f1e176]:
                - heading "Give the objective some context." [level=2] [ref=f1e177]
                - paragraph [ref=f1e178]: What is happening, what would success look like, and what boundaries should stay in view?
              - generic [ref=f1e179]:
                - generic [ref=f1e180]:
                  - generic [ref=f1e181]: The situation
                  - textbox "The situation" [ref=f1e182]:
                    - /placeholder: What makes this important now?
                    - text: I need time for focused work.
                - generic [ref=f1e183]:
                  - generic [ref=f1e184]: A meaningful outcome
                  - textbox "A meaningful outcome" [active] [ref=f1e185]:
                    - /placeholder: I’ll know I’ve made progress when…
                    - text: Two hours of focused work per day.
                - generic [ref=f1e186]:
                  - generic [ref=f1e187]: Constraints or assumptions
                  - textbox "Constraints or assumptions" [ref=f1e188]:
                    - /placeholder: Time, budget, people, or things to validate
                - generic [ref=f1e189]:
                  - button "Back" [ref=f1e190] [cursor=pointer]
                  - button "Explore a pathway" [ref=f1e193] [cursor=pointer]
          - complementary [ref=f1e196]:
            - generic [ref=f1e197]: YOUR CONTEXT, IN VIEW
            - heading "A continuous thread." [level=3] [ref=f1e198]
            - paragraph [ref=f1e199]: What you bring into this conversation stays connected to the work you choose to create.
            - generic [ref=f1e200]:
              - generic [ref=f1e201]: "01"
              - generic [ref=f1e202]:
                - strong [ref=f1e203]: Clarify the objective
                - generic [ref=f1e204]: What matters now?
            - generic [ref=f1e205]:
              - generic [ref=f1e206]: "02"
              - generic [ref=f1e207]:
                - strong [ref=f1e208]: Understand the situation
                - generic [ref=f1e209]: What shapes your decision?
            - generic [ref=f1e210]:
              - generic [ref=f1e211]: "03"
              - generic [ref=f1e212]:
                - strong [ref=f1e213]: Make the next move
                - generic [ref=f1e214]: What will you do next?
            - generic [ref=f1e215]:
              - strong [ref=f1e219]: Your judgment comes first.
              - paragraph [ref=f1e220]: Nothing is saved until you choose. External AI runs only when you request it and consent, within your AI rules. Suggestions do not execute work.
        - group [ref=f1e221]:
          - generic "▸ Getting started" [ref=f1e222] [cursor=pointer]
      - contentinfo [ref=f1e223]:
        - generic [ref=f1e224]: Context connected. Judgment stays human.
  - button "Ask Companion" [ref=f1e226] [cursor=pointer]
```

# Test source

```ts
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
  21  |   await expect(page.getByRole('heading', { level: 1 })).toHaveText('What Needs Your Attention?');
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
> 104 |   await page.getByRole('button', { name: 'Choose the next step' }).click();
      |                                                                    ^ Error: locator.click: Test timeout of 30000ms exceeded.
  105 |   await page.getByLabel('Your next action (optional)').fill('Reserve a morning work block');
  106 |   await page.getByRole('button', { name: 'Save my plan' }).click();
  107 |   await expect(
  108 |     page.getByRole('heading', { name: 'A clearer direction. A concrete next step.' }),
  109 |   ).toBeVisible();
  110 |   expect(
  111 |     await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  112 |   ).toBeTruthy();
  113 | });
  114 | test('keyboard search, dialogs, and accessibility semantics', async ({ page }) => {
  115 |   // This test needs the pre-seeded demo workspace ("Launch our advisory practice") for its
  116 |   // search assertion below, so it signs into a demo account directly rather than through the
  117 |   // real signup flow (which starts from an empty workspace).
  118 |   await page.goto('/');
  119 |   await page.request.post('/api/auth/demo', { data: {} });
  120 |   await page.goto('/os');
  121 |   await expect(page).toHaveURL('/os');
  122 |   await page.keyboard.press('Control+k');
  123 |   await expect(page.getByRole('dialog')).toBeVisible();
  124 |   await page.getByLabel('Search objectives, actions, and pages').fill('advisory');
  125 |   await expect(page.locator('.search-results')).toContainText('Launch our advisory practice');
  126 |   await page.keyboard.press('Escape');
  127 |   await expect(page.getByRole('dialog')).toHaveCount(0);
  128 |   const result = await new AxeBuilder({ page })
  129 |     .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
  130 |     .analyze();
  131 |   expect(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual(
  132 |     [],
  133 |   );
  134 | });
  135 | 
```