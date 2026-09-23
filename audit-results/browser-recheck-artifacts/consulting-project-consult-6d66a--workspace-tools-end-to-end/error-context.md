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
  - waiting for getByRole('button', { name: 'Choose the next step' })

```

# Page snapshot

```yaml
- generic [ref=f2e2]:
  - generic [ref=f2e3]:
    - link "Skip to workspace" [ref=f2e4] [cursor=pointer]:
      - /url: "#workspace-main"
    - complementary [ref=f2e5]:
      - link "LAMID ONE home" [ref=f2e7] [cursor=pointer]:
        - /url: /
        - generic [ref=f2e15]: LAMID ONE
      - generic [ref=f2e16]:
        - generic [ref=f2e17]: C
        - generic [ref=f2e18]:
          - strong [ref=f2e19]: Consulting's workspace
          - generic [ref=f2e20]: Professional workspace
        - combobox "Switch workspace" [ref=f2e21] [cursor=pointer]:
          - option "Consulting's workspace" [selected]
      - generic [ref=f2e24]: YOUR OPERATING SPACE
      - navigation "Workspace navigation" [ref=f2e25]:
        - link "Overview" [ref=f2e26] [cursor=pointer]:
          - /url: /os
        - link "AI Settings" [ref=f2e32] [cursor=pointer]:
          - /url: /os/settings/ai
        - link "Today" [ref=f2e36] [cursor=pointer]:
          - /url: /os/today
        - link "Clarity" [ref=f2e43] [cursor=pointer]:
          - /url: /os/clarity
        - link "Capability" [ref=f2e47] [cursor=pointer]:
          - /url: /os/capability
        - link "Consistency" [ref=f2e52] [cursor=pointer]:
          - /url: /os/consistency
        - link "Progress" [ref=f2e56] [cursor=pointer]:
          - /url: /os/progress
        - link "Rhythm" [ref=f2e60] [cursor=pointer]:
          - /url: /os/rhythm
        - link "Commercial" [ref=f2e63] [cursor=pointer]:
          - /url: /os/commercial
        - link "Knowledge" [ref=f2e68] [cursor=pointer]:
          - /url: /os/knowledge
        - link "Talent" [ref=f2e73] [cursor=pointer]:
          - /url: /os/talent
        - link "Finance" [ref=f2e79] [cursor=pointer]:
          - /url: /os/finance
        - link "People" [ref=f2e83] [cursor=pointer]:
          - /url: /os/people
        - link "Engines" [ref=f2e89] [cursor=pointer]:
          - /url: /os/engines
        - link "Guided Scoping" [ref=f2e93] [cursor=pointer]:
          - /url: /os/scoping/new
        - link "Learning" [ref=f2e97] [cursor=pointer]:
          - /url: /os/learning
        - link "Companion GUIDED" [ref=f2e102] [cursor=pointer]:
          - /url: /os/companion
          - text: Companion
          - generic [ref=f2e105]: GUIDED
        - link "Workflows" [ref=f2e106] [cursor=pointer]:
          - /url: /os/workflows
        - link "Governance" [ref=f2e111] [cursor=pointer]:
          - /url: /os/governance
      - generic [ref=f2e115]:
        - generic [ref=f2e120]:
          - text: Your work. Your judgment.
          - generic [ref=f2e121]: You decide what happens next.
        - link "Settings" [ref=f2e122] [cursor=pointer]:
          - /url: /os/settings
        - generic [ref=f2e126]:
          - generic [ref=f2e127]: CP
          - generic [ref=f2e128]:
            - strong [ref=f2e129]: Consulting Project Lead
            - generic [ref=f2e130]: Workspace owner
          - button "Sign out" [ref=f2e131] [cursor=pointer]
    - generic [ref=f2e135]:
      - banner [ref=f2e136]:
        - generic [ref=f2e137]:
          - generic [ref=f2e138]: Workspace
          - generic [ref=f2e139]: /
          - generic [ref=f2e140]: Companion
        - generic [ref=f2e141]:
          - button "Search your workspace K" [ref=f2e142] [cursor=pointer]:
            - generic [ref=f2e146]: Search your workspace
            - generic [ref=f2e147]: K
          - link "0 actions need review" [ref=f2e150] [cursor=pointer]:
            - /url: /os/today
          - generic [ref=f2e155]: C
      - main [ref=f2e156]:
        - generic [ref=f2e158]:
          - generic [ref=f2e159]: COMPANION · SPACE TO THINK
          - heading "What Are You Working Through?" [level=1] [ref=f2e160]
          - paragraph [ref=f2e161]: Describe the decision, challenge, opportunity, or objective. Add the context that matters and set what may continue progressing between interactions. You remain able to review, redirect, pause, revoke, or override what happens next.
        - paragraph [ref=f2e162]:
          - link "Review an existing objective with AI" [ref=f2e163] [cursor=pointer]:
            - /url: /os/insights
          - text: ", or use guided planning below."
        - generic [ref=f2e164]:
          - generic [ref=f2e165]:
            - generic [ref=f2e166]:
              - generic [ref=f2e170]:
                - strong [ref=f2e171]: Your thinking partner
                - generic [ref=f2e172]: Guided planning · based on your inputs
              - generic [ref=f2e173]: YOU LEAD
            - generic [ref=f2e174]:
              - generic [ref=f2e175]:
                - heading "Let’s start with what’s on your mind." [level=2] [ref=f2e176]
                - paragraph [ref=f2e177]: A decision, an opportunity, a challenge. It doesn’t have to be perfectly formed.
              - generic [ref=f2e178]:
                - generic [ref=f2e179]:
                  - generic [ref=f2e180]: What do you want to move forward?
                  - textbox "What do you want to move forward?" [ref=f2e181]:
                    - /placeholder: I want to…
                - generic [ref=f2e182]:
                  - button "Bring a business idea into focus" [ref=f2e183] [cursor=pointer]
                  - button "Make a difficult decision" [ref=f2e185] [cursor=pointer]
                  - button "Build a more intentional week" [ref=f2e187] [cursor=pointer]
                - button "Bring it into focus" [disabled] [ref=f2e189]
          - complementary [ref=f2e192]:
            - generic [ref=f2e193]: YOUR CONTEXT, IN VIEW
            - heading "A continuous thread." [level=3] [ref=f2e194]
            - paragraph [ref=f2e195]: What you bring into this conversation stays connected to the work you choose to create.
            - generic [ref=f2e196]:
              - generic [ref=f2e197]: "01"
              - generic [ref=f2e198]:
                - strong [ref=f2e199]: Clarify the objective
                - generic [ref=f2e200]: What matters now?
            - generic [ref=f2e201]:
              - generic [ref=f2e202]: "02"
              - generic [ref=f2e203]:
                - strong [ref=f2e204]: Understand the situation
                - generic [ref=f2e205]: What shapes your decision?
            - generic [ref=f2e206]:
              - generic [ref=f2e207]: "03"
              - generic [ref=f2e208]:
                - strong [ref=f2e209]: Make the next move
                - generic [ref=f2e210]: What will you do next?
            - generic [ref=f2e211]:
              - strong [ref=f2e215]: Your judgment comes first.
              - paragraph [ref=f2e216]: Nothing is saved until you choose. External AI runs only when you request it and consent, within your AI rules. Suggestions do not execute work.
        - region "Saved goal progress" [ref=f2e217]:
          - heading "Continue your pathway" [level=2] [ref=f2e218]
          - generic [ref=f2e219]:
            - text: Saved goal
            - combobox "Saved goal" [ref=f2e220]:
              - option "Deliver the operating model assessment" [selected]
          - heading "Deliver the operating model assessment" [level=3] [ref=f2e221]
          - paragraph [ref=f2e222]: Give the client a clear transformation sequence.
          - generic [ref=f2e223]:
            - term [ref=f2e224]: Success
            - definition [ref=f2e225]: A prioritized roadmap accepted by the client.
            - term [ref=f2e226]: Constraints
            - definition [ref=f2e227]: No constraints recorded.
          - paragraph [ref=f2e228]: "Goal: Active. 0 of 1 actions complete."
          - progressbar "Pathway completion" [ref=f2e229]
          - paragraph [ref=f2e230]:
            - strong [ref=f2e231]: "Next to follow:"
            - text: Interview the three stakeholder groups
          - list [ref=f2e232]:
            - listitem [ref=f2e233]:
              - strong [ref=f2e234]: Interview the three stakeholder groups
              - text: In progress
              - paragraph [ref=f2e235]: Capture constraints, decision rights, and evidence gaps.
          - generic [ref=f2e236]:
            - link "Manage pathway actions" [ref=f2e237] [cursor=pointer]:
              - /url: /os/consistency?objective=c0bd2e3a-2e93-41bc-849e-0d31d231a178
            - link "Review goal in Clarity" [ref=f2e238] [cursor=pointer]:
              - /url: /os/clarity
            - button "Add a step" [ref=f2e239] [cursor=pointer]
          - button "Delete goal" [ref=f2e241] [cursor=pointer]
        - group [ref=f2e242]:
          - generic "▸ Getting started" [ref=f2e243] [cursor=pointer]
      - contentinfo [ref=f2e244]:
        - generic [ref=f2e245]: Context connected. Judgment stays human.
        - generic [ref=f2e247]: LAMID ONE · Development edition
  - button "Ask Companion" [ref=f2e248] [cursor=pointer]
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
  40  |   await page.getByRole('button', { name: 'Add next action', exact: true }).click();
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
> 75  |   await page.getByRole('button', { name: 'Choose the next step' }).click();
      |                                                                    ^ Error: locator.click: Test timeout of 30000ms exceeded.
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