# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: commercial-knowledge.spec.ts >> workspace job posting charges once and knowledge can be edited and deleted
- Location: tests\browser\commercial-knowledge.spec.ts:4:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Read and edit' })

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - link "Skip to workspace" [ref=e4] [cursor=pointer]:
      - /url: "#workspace-main"
    - complementary [ref=e5]:
      - link "LAMID ONE home" [ref=e7] [cursor=pointer]:
        - /url: /
        - generic [ref=e15]: LAMID ONE
      - generic [ref=e16]:
        - generic [ref=e17]: C
        - generic [ref=e18]:
          - strong [ref=e19]: Commercial's workspace
          - generic [ref=e20]: Founder workspace
        - combobox "Switch workspace" [ref=e21] [cursor=pointer]:
          - option "Commercial's workspace" [selected]
      - generic [ref=e24]: YOUR OPERATING SPACE
      - navigation "Workspace navigation" [ref=e25]:
        - link "Overview" [ref=e26] [cursor=pointer]:
          - /url: /os
        - link "AI Settings" [ref=e32] [cursor=pointer]:
          - /url: /os/settings/ai
        - link "Today" [ref=e36] [cursor=pointer]:
          - /url: /os/today
        - link "Clarity" [ref=e43] [cursor=pointer]:
          - /url: /os/clarity
        - link "Capability" [ref=e47] [cursor=pointer]:
          - /url: /os/capability
        - link "Consistency" [ref=e52] [cursor=pointer]:
          - /url: /os/consistency
        - link "Progress" [ref=e56] [cursor=pointer]:
          - /url: /os/progress
        - link "Rhythm" [ref=e60] [cursor=pointer]:
          - /url: /os/rhythm
        - link "Commercial" [ref=e63] [cursor=pointer]:
          - /url: /os/commercial
        - link "Knowledge" [ref=e68] [cursor=pointer]:
          - /url: /os/knowledge
        - link "Talent" [ref=e73] [cursor=pointer]:
          - /url: /os/talent
        - link "Finance" [ref=e79] [cursor=pointer]:
          - /url: /os/finance
        - link "People" [ref=e83] [cursor=pointer]:
          - /url: /os/people
        - link "Engines" [ref=e89] [cursor=pointer]:
          - /url: /os/engines
        - link "Guided Scoping" [ref=e93] [cursor=pointer]:
          - /url: /os/scoping/new
        - link "Learning" [ref=e97] [cursor=pointer]:
          - /url: /os/learning
        - link "Companion GUIDED" [ref=e102] [cursor=pointer]:
          - /url: /os/companion
          - text: Companion
          - generic [ref=e105]: GUIDED
        - link "Workflows" [ref=e106] [cursor=pointer]:
          - /url: /os/workflows
        - link "Governance" [ref=e111] [cursor=pointer]:
          - /url: /os/governance
      - generic [ref=e115]:
        - generic [ref=e120]:
          - text: Your work. Your judgment.
          - generic [ref=e121]: You decide what happens next.
        - link "Settings" [ref=e122] [cursor=pointer]:
          - /url: /os/settings
        - generic [ref=e126]:
          - generic [ref=e127]: CK
          - generic [ref=e128]:
            - strong [ref=e129]: Commercial Knowledge Tester
            - generic [ref=e130]: Workspace owner
          - button "Sign out" [ref=e131] [cursor=pointer]
    - generic [ref=e135]:
      - banner [ref=e136]:
        - generic [ref=e137]:
          - generic [ref=e138]: Workspace
          - generic [ref=e139]: /
          - generic [ref=e140]: Knowledge
        - generic [ref=e141]:
          - button "Search your workspace K" [ref=e142] [cursor=pointer]:
            - generic [ref=e146]: Search your workspace
            - generic [ref=e147]: K
          - link "0 actions need review" [ref=e150] [cursor=pointer]:
            - /url: /os/today
          - generic [ref=e155]: C
      - main [ref=e156]:
        - generic [ref=e157]:
          - generic [ref=e158]:
            - generic [ref=e159]: KNOWLEDGE
            - heading "Context you can inspect" [level=1] [ref=e160]
            - paragraph [ref=e161]: Keep source notes and text documents connected to your objectives.
          - button "Add knowledge" [ref=e162] [cursor=pointer]
        - paragraph [ref=e163]: Knowledge is shared with active members of this workspace. Classification labels describe sensitivity; they do not create separate access permissions.
        - generic [ref=e164]:
          - generic [ref=e165]: Search knowledge
          - textbox "Search knowledge" [active] [ref=e166]: human
        - generic [ref=e167]:
          - heading "No matching knowledge" [level=3] [ref=e174]
          - paragraph [ref=e175]: Add a note or import a small text document.
        - generic [ref=e176]:
          - button "Previous" [disabled] [ref=e177]
          - generic [ref=e178]: 0 records
          - button "Next" [disabled] [ref=e179]
        - group [ref=e180]:
          - generic "▸ Getting started" [ref=e181] [cursor=pointer]
      - contentinfo [ref=e182]:
        - generic [ref=e183]: Context connected. Judgment stays human.
        - generic [ref=e185]: LAMID ONE · Development edition
  - button "Ask Companion" [ref=e186] [cursor=pointer]
```

# Test source

```ts
  1  | import { verifySignup } from './auth-helpers';
  2  | import { test, expect } from '@playwright/test';
  3  | 
  4  | test('workspace job posting charges once and knowledge can be edited and deleted', async ({
  5  |   page,
  6  | }) => {
  7  |   await page.goto('/start');
  8  |   await page.getByRole('button', { name: 'Founder', exact: true }).click();
  9  |   await page.getByRole('button', { name: 'Continue', exact: true }).click();
  10 |   await page.getByLabel('Your name').fill('Commercial Knowledge Tester');
  11 |   await page.getByLabel('Email address').fill(`commercial-knowledge-${Date.now()}@example.test`);
  12 |   await page.getByLabel('Password', { exact: true }).fill('secure-commercial-knowledge-password');
  13 |   await page.getByRole('button', { name: 'Create your workspace', exact: true }).click();
  14 |   await verifySignup(page);
  15 |   await expect(page).toHaveURL('/os');
  16 |   await page.getByRole('link', { name: 'Commercial', exact: true }).click();
  17 |   await page.getByRole('button', { name: 'Post a job', exact: true }).click();
  18 |   await page.getByLabel('Job title', { exact: true }).fill('Evaluate the service offer');
  19 |   await page
  20 |     .getByLabel('Project description')
  21 |     .fill('Evaluate the scope and document a clear service offer.');
  22 |   await page.getByLabel('Deliverables', { exact: true }).fill('A written service brief');
  23 |   await page.getByLabel('Minimum budget').fill('50');
  24 |   await page.getByLabel('Maximum budget').fill('100');
  25 |   await page.getByLabel('Timeline', { exact: true }).fill('One week');
  26 |   await page.getByRole('button', { name: 'Post job · 40 points' }).click();
  27 |   await expect(page.getByRole('dialog')).toHaveCount(0);
  28 |   await expect(page.getByText(/60 development points available/)).toBeVisible();
  29 |   await expect(page.getByRole('heading', { name: 'Evaluate the service offer' })).toBeVisible();
  30 |   await page.getByRole('link', { name: 'Knowledge', exact: true }).click();
  31 |   await page.getByRole('button', { name: 'Add knowledge' }).click();
  32 |   await page.getByLabel('Knowledge title').fill('Service research');
  33 |   await page
  34 |     .getByLabel('Knowledge content')
  35 |     .fill('Interview evidence and human review requirements.');
  36 |   await page.getByRole('button', { name: 'Save knowledge' }).click();
  37 |   await expect(page.getByRole('dialog')).toHaveCount(0);
  38 |   await page.getByLabel('Search knowledge').fill('human');
> 39 |   await page.getByRole('button', { name: 'Read and edit' }).click();
     |                                                             ^ Error: locator.click: Test timeout of 30000ms exceeded.
  40 |   await page.getByLabel('Knowledge content').fill('Updated human review requirements.');
  41 |   await page.getByRole('button', { name: 'Save knowledge' }).click();
  42 |   await expect(page.getByRole('dialog')).toHaveCount(0);
  43 |   await expect(page.getByText(/Version 2/)).toBeVisible();
  44 |   await page.getByRole('button', { name: 'Read and edit' }).click();
  45 |   await page.getByRole('button', { name: 'Delete knowledge', exact: true }).click();
  46 |   await page.getByRole('button', { name: 'Confirm deletion' }).click();
  47 |   await expect(page.getByRole('heading', { name: 'No matching knowledge' })).toBeVisible();
  48 | });
  49 | 
```