# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: consulting-project.spec.ts >> consulting project uses the implemented workspace tools end to end
- Location: tests\browser\consulting-project.spec.ts:4:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: /A clearer direction/ })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: /A clearer direction/ }) with timeout 5000ms
  - waiting for getByRole('heading', { name: /A clearer direction/ })

```

```yaml
- link "Skip to workspace":
  - /url: "#workspace-main"
- complementary:
  - link "LAMID ONE home":
    - /url: /
    - text: LAMID ONE
  - text: C
  - strong: Consulting's workspace
  - text: Professional workspace
  - combobox "Switch workspace":
    - option "Consulting's workspace" [selected]
  - img
  - text: YOUR OPERATING SPACE
  - navigation "Workspace navigation":
    - link "Overview":
      - /url: /os
      - img
      - text: Overview
    - link "AI Settings":
      - /url: /os/settings/ai
      - img
      - text: AI Settings
    - link "Today":
      - /url: /os/today
      - img
      - text: Today
    - link "Clarity":
      - /url: /os/clarity
      - img
      - text: Clarity
    - link "Capability":
      - /url: /os/capability
      - img
      - text: Capability
    - link "Consistency":
      - /url: /os/consistency
      - img
      - text: Consistency
    - link "Progress":
      - /url: /os/progress
      - img
      - text: Progress
    - link "Rhythm":
      - /url: /os/rhythm
      - img
      - text: Rhythm
    - link "Commercial":
      - /url: /os/commercial
      - img
      - text: Commercial
    - link "Knowledge":
      - /url: /os/knowledge
      - img
      - text: Knowledge
    - link "Talent":
      - /url: /os/talent
      - img
      - text: Talent
    - link "Finance":
      - /url: /os/finance
      - img
      - text: Finance
    - link "People":
      - /url: /os/people
      - img
      - text: People
    - link "Engines":
      - /url: /os/engines
      - img
      - text: Engines
    - link "Guided Scoping":
      - /url: /os/scoping/new
      - img
      - text: Guided Scoping
    - link "Learning":
      - /url: /os/learning
      - img
      - text: Learning
    - link "Companion GUIDED":
      - /url: /os/companion
      - img
      - text: Companion GUIDED
    - link "Workflows":
      - /url: /os/workflows
      - img
      - text: Workflows
    - link "Governance":
      - /url: /os/governance
      - img
      - text: Governance
  - img
  - text: Your work. Your judgment. You decide what happens next.
  - link "Settings":
    - /url: /os/settings
    - img
    - text: Settings
  - text: CP
  - strong: Consulting Project Lead
  - text: Workspace owner
  - button "Sign out":
    - img
- banner:
  - text: Workspace / Companion
  - button "Search your workspace K":
    - img
    - text: Search your workspace
    - img
    - text: K
  - link "0 actions need review":
    - /url: /os/today
    - img
  - text: C
- main:
  - text: COMPANION · SPACE TO THINK
  - heading "What Are You Working Through?" [level=1]
  - paragraph: Describe the decision, challenge, opportunity, or objective. Add the context that matters and set what may continue progressing between interactions. You remain able to review, redirect, pause, revoke, or override what happens next.
  - paragraph:
    - link "Review an existing objective with AI":
      - /url: /os/insights
    - text: ", or use guided planning below."
  - img
  - strong: Your thinking partner
  - text: Guided planning · based on your inputs YOU LEAD
  - heading "Understanding becomes useful through action." [level=2]
  - paragraph: Choose the parts you want to follow. Edit the suggested steps to fit your situation; only selected steps will become actions.
  - text: YOUR OBJECTIVE
  - heading "Prepare the client steering committee" [level=3]
  - paragraph: The client needs a decision-ready synthesis.
  - term: Success
  - definition: A concise steering pack with decisions and owners.
  - term: Keep in view
  - definition: No constraints recorded.
  - region "Suggested pathway":
    - heading "Compare options and test the key assumption" [level=3]
    - paragraph: Free planning template based on your goal. Review time, budget, and support before committing.
    - heading "Ask AI to refine this pathway" [level=4]
    - paragraph: Shares only this draft goal and its context. Costs 0 points and counts toward your daily AI request limit. Replaces the suggestions below when successful.
    - link "Review your AI rules (opens in a new tab)":
      - /url: /os/settings/ai
    - paragraph: AI pathways require a configured provider, a verified account, and permission in your AI rules. You can continue with the template.
    - list:
      - listitem:
        - checkbox "Follow step 1" [checked] [disabled]
        - text: Follow step 1 Step 1 action
        - textbox "Step 1 action" [disabled]: Define a baseline and success checkpoint
        - text: Step 1 guidance
        - textbox "Step 1 guidance" [disabled]: "Goal: Prepare the client steering committee Success: A concise steering pack with decisions and owners. Record your starting point and choose a date to review progress."
      - listitem:
        - checkbox "Follow step 2" [checked] [disabled]
        - text: Follow step 2 Step 2 action
        - textbox "Step 2 action" [disabled]: List the options and decision criteria
        - text: Step 2 guidance
        - textbox "Step 2 guidance" [disabled]: Identify realistic alternatives and what matters when comparing them.
      - listitem:
        - checkbox "Follow step 3" [checked] [disabled]
        - text: Follow step 3 Step 3 action
        - textbox "Step 3 action" [disabled]: Check the riskiest assumption
        - text: Step 3 guidance
        - textbox "Step 3 guidance" [disabled]: Gather evidence for the assumption most likely to change your decision.
      - listitem:
        - checkbox "Follow step 4" [checked] [disabled]
        - text: Follow step 4 Step 4 action
        - textbox "Step 4 action" [disabled]: Choose a reversible first commitment
        - text: Step 4 guidance
        - textbox "Step 4 guidance" [disabled]: Record your choice, the reasons, and when you will reconsider.
      - listitem:
        - checkbox "Follow step 5" [checked] [disabled]
        - text: Follow step 5 Step 5 action
        - textbox "Step 5 action" [disabled]: Review the outcome and choose what comes next
        - text: Step 5 guidance
        - textbox "Step 5 guidance" [disabled]: "Compare results with your success measure. Record what you learned and decide whether to continue, adapt, or finish. Constraints to review: Confirm available time, budget, and support."
    - paragraph: 5 suggested steps selected. You can also save just your goal and add actions later.
  - text: Your next action (optional)
  - textbox "Your next action (optional)" [disabled]:
    - /placeholder: One action you can take to move this forward
    - text: Draft the decision log
  - button "Refine" [disabled]:
    - img
    - text: Refine
  - button "Saving…" [disabled]:
    - text: Saving…
    - img
  - complementary:
    - text: YOUR CONTEXT, IN VIEW
    - heading "A continuous thread." [level=3]
    - paragraph: What you bring into this conversation stays connected to the work you choose to create.
    - text: "01"
    - strong: Clarify the objective
    - text: What matters now? 02
    - strong: Understand the situation
    - text: What shapes your decision? 03
    - strong: Make the next move
    - text: What will you do next?
    - img
    - strong: Your judgment comes first.
    - paragraph: Nothing is saved until you choose. External AI runs only when you request it and consent, within your AI rules. Suggestions do not execute work.
  - region "Saved goal progress":
    - heading "Continue your pathway" [level=2]
    - text: Saved goal
    - combobox "Saved goal":
      - option "Deliver the operating model assessment" [selected]
    - heading "Deliver the operating model assessment" [level=3]
    - paragraph: Give the client a clear transformation sequence.
    - term: Success
    - definition: A prioritized roadmap accepted by the client.
    - term: Constraints
    - definition: No constraints recorded.
    - paragraph: "Goal: Active. 0 of 1 actions complete."
    - progressbar "Pathway completion"
    - paragraph:
      - strong: "Next to follow:"
      - text: Interview the three stakeholder groups
    - list:
      - listitem:
        - strong: Interview the three stakeholder groups
        - text: In progress
        - paragraph: Capture constraints, decision rights, and evidence gaps.
    - link "Manage pathway actions":
      - /url: /os/consistency?objective=98abdb9b-4675-46f7-ba2d-b3e0d75dcfd5
    - link "Review goal in Clarity":
      - /url: /os/clarity
    - button "Add a step"
    - button "Delete goal"
  - group: ▸ Getting started
- contentinfo: Context connected. Judgment stays human. LAMID ONE · Development edition
- button "Ask Companion"
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
  75  |   await page.getByRole('button', { name: 'Explore a pathway' }).click();
  76  |   const preview = page.getByRole('region', { name: 'Suggested pathway' });
  77  |   await expect(preview).toBeVisible();
  78  |   await page.getByLabel('Your next action (optional)').fill('Draft the decision log');
  79  |   await expect(page.getByRole('button', { name: 'Save my plan' })).toBeEnabled();
  80  |   await page.getByRole('button', { name: 'Save my plan' }).click();
> 81  |   await expect(page.getByRole('heading', { name: /A clearer direction/ })).toBeVisible();
      |                                                                            ^ Error: expect(locator).toBeVisible() failed
  82  | 
  83  |   await page.getByRole('link', { name: 'Rhythm', exact: true }).click();
  84  |   await page.getByRole('button', { name: 'Record a reflection' }).click();
  85  |   await page
  86  |     .getByLabel('What moved forward?')
  87  |     .fill('Stakeholder interviews created a shared baseline.');
  88  |   await page
  89  |     .getByLabel('What will you carry into the next cycle?')
  90  |     .fill('Turn evidence into the steering pack.');
  91  |   await page.getByRole('button', { name: 'Save reflection' }).click();
  92  |   await expect(page.locator('.review-card')).toContainText(
  93  |     'Stakeholder interviews created a shared baseline.',
  94  |   );
  95  | 
  96  |   await page.getByRole('link', { name: 'Progress', exact: true }).click();
  97  |   await expect(page.getByRole('heading', { level: 1 })).toHaveText(
  98  |     'See What Is Changing Over Time.',
  99  |   );
  100 |   await page.getByRole('button', { name: /Search your workspace/ }).click();
  101 |   await page.getByLabel('Search objectives, actions, and pages').fill('assessment');
  102 |   await expect(page.locator('.search-results')).toContainText(
  103 |     'Deliver the operating model assessment',
  104 |   );
  105 |   await page.getByRole('button', { name: 'Close dialog' }).click();
  106 | 
  107 |   await page.getByRole('link', { name: 'Settings', exact: true }).click();
  108 |   await page.getByRole('link', { name: /Export workspace data/ }).click();
  109 | });
  110 | 
```