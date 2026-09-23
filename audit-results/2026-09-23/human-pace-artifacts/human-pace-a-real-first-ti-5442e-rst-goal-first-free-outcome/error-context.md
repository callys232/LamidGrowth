# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: human-pace.spec.ts >> a real first-time visitor: homepage, signup, first goal, first free outcome
- Location: tests\browser\human-pace.spec.ts:20:1

# Error details

```
TimeoutError: locator.scrollIntoViewIfNeeded: Timeout 30000ms exceeded.
Call log:
  - waiting for getByText('Coordinate a task across specialists', { exact: true })

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
        - generic [ref=e17]: J
        - generic [ref=e18]:
          - strong [ref=e19]: Jordan's workspace
          - generic [ref=e20]: Founder workspace
        - combobox "Switch workspace" [ref=e21] [cursor=pointer]:
          - option "Jordan's workspace" [selected]
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
        - link "Companion GUIDED" [active] [ref=e102] [cursor=pointer]:
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
          - generic [ref=e127]: JR
          - generic [ref=e128]:
            - strong [ref=e129]: Jordan Rivera
            - generic [ref=e130]: Workspace owner
          - button "Sign out" [ref=e131] [cursor=pointer]
    - generic [ref=e135]:
      - banner [ref=e136]:
        - generic [ref=e137]:
          - generic [ref=e138]: Workspace
          - generic [ref=e139]: /
          - generic [ref=e140]: Companion
        - generic [ref=e141]:
          - button "Search your workspace K" [ref=e142] [cursor=pointer]:
            - generic [ref=e146]: Search your workspace
            - generic [ref=e147]: K
          - link "0 actions need review" [ref=e150] [cursor=pointer]:
            - /url: /os/today
          - generic [ref=e155]: J
      - main [ref=e156]:
        - generic [ref=e158]:
          - generic [ref=e159]: COMPANION · SPACE TO THINK
          - heading "What Are You Working Through?" [level=1] [ref=e160]
          - paragraph [ref=e161]: Describe the decision, challenge, opportunity, or objective. Add the context that matters and set what may continue progressing between interactions. You remain able to review, redirect, pause, revoke, or override what happens next.
        - paragraph [ref=e162]:
          - link "Review an existing objective with AI" [ref=e163] [cursor=pointer]:
            - /url: /os/insights
          - text: ", or use guided planning below."
        - generic [ref=e164]:
          - generic [ref=e165]:
            - generic [ref=e166]:
              - generic [ref=e170]:
                - strong [ref=e171]: Your thinking partner
                - generic [ref=e172]: Guided planning · based on your inputs
              - generic [ref=e173]: YOU LEAD
            - generic [ref=e174]:
              - generic [ref=e175]:
                - heading "Let’s start with what’s on your mind." [level=2] [ref=e176]
                - paragraph [ref=e177]: A decision, an opportunity, a challenge. It doesn’t have to be perfectly formed.
              - generic [ref=e178]:
                - generic [ref=e179]:
                  - generic [ref=e180]: What do you want to move forward?
                  - textbox "What do you want to move forward?" [ref=e181]:
                    - /placeholder: I want to…
                - generic [ref=e182]:
                  - button "Bring a business idea into focus" [ref=e183] [cursor=pointer]
                  - button "Make a difficult decision" [ref=e185] [cursor=pointer]
                  - button "Build a more intentional week" [ref=e187] [cursor=pointer]
                - button "Bring it into focus" [disabled] [ref=e189]
          - complementary [ref=e192]:
            - generic [ref=e193]: YOUR CONTEXT, IN VIEW
            - heading "A continuous thread." [level=3] [ref=e194]
            - paragraph [ref=e195]: What you bring into this conversation stays connected to the work you choose to create.
            - generic [ref=e196]:
              - generic [ref=e197]: "01"
              - generic [ref=e198]:
                - strong [ref=e199]: Clarify the objective
                - generic [ref=e200]: What matters now?
            - generic [ref=e201]:
              - generic [ref=e202]: "02"
              - generic [ref=e203]:
                - strong [ref=e204]: Understand the situation
                - generic [ref=e205]: What shapes your decision?
            - generic [ref=e206]:
              - generic [ref=e207]: "03"
              - generic [ref=e208]:
                - strong [ref=e209]: Make the next move
                - generic [ref=e210]: What will you do next?
            - generic [ref=e211]:
              - strong [ref=e215]: Your judgment comes first.
              - paragraph [ref=e216]: Nothing is saved until you choose. External AI runs only when you request it and consent, within your AI rules. Suggestions do not execute work.
        - region "Saved goal progress" [ref=e217]:
          - heading "Continue your pathway" [level=2] [ref=e218]
          - generic [ref=e219]:
            - text: Saved goal
            - combobox "Saved goal" [ref=e220]:
              - option "Get my freelance design business off the ground" [selected]
          - heading "Get my freelance design business off the ground" [level=3] [ref=e221]
          - paragraph [ref=e222]: I want steady income doing work I actually like.
          - generic [ref=e223]:
            - term [ref=e224]: Success
            - definition [ref=e225]: Three paying clients within two months.
            - term [ref=e226]: Constraints
            - definition [ref=e227]: No constraints recorded.
          - paragraph [ref=e228]: "Goal: Active. 0 of 0 actions complete."
          - paragraph [ref=e229]: No actions yet. Add a first step to begin following this goal.
          - list
          - generic [ref=e230]:
            - link "Manage pathway actions" [ref=e231] [cursor=pointer]:
              - /url: /os/consistency?objective=d3cf390e-351d-4b22-b568-6cb44fef0e5e
            - link "Review goal in Clarity" [ref=e232] [cursor=pointer]:
              - /url: /os/clarity
            - button "Add a step" [ref=e233] [cursor=pointer]
          - button "Delete goal" [ref=e235] [cursor=pointer]
        - group [ref=e236]:
          - generic "▸ Getting started" [ref=e237] [cursor=pointer]
      - contentinfo [ref=e238]:
        - generic [ref=e239]: Context connected. Judgment stays human.
        - generic [ref=e241]: LAMID ONE · Development edition
  - button "Ask Companion" [ref=e242] [cursor=pointer]
```

# Test source

```ts
  18  | }
  19  | 
  20  | test('a real first-time visitor: homepage, signup, first goal, first free outcome', async ({ page }) => {
  21  |   const result: Record<string, unknown> = { stage: 'homepage', completed: [] as string[], timings: {} as Record<string, number> };
  22  |   const completed = result.completed as string[];
  23  |   const timings = result.timings as Record<string, number>;
  24  |   const out = 'artifacts/human-pace';
  25  |   mkdirSync(out, { recursive: true });
  26  |   const started = Date.now();
  27  |   const mark = (label: string) => { timings[label] = Math.round((Date.now() - started) / 1000); };
  28  | 
  29  |   try {
  30  |     // Arrive at the actual homepage, not /start — a real visitor doesn't know the shortcut URL.
  31  |     result.stage = 'homepage';
  32  |     await page.goto('/');
  33  |     await page.waitForTimeout(pause(READ.medium)); // a human looks at the page before doing anything
  34  |     await page.screenshot({ path: `${out}/01-homepage.png` });
  35  |     completed.push('landed on homepage');
  36  | 
  37  |     // Find and click through to start, the way a real visitor would — not a direct URL.
  38  |     const ctaLink = page.getByRole('link', { name: 'Experience LAMID ONE', exact: true }).first();
  39  |     await ctaLink.scrollIntoViewIfNeeded();
  40  |     await page.waitForTimeout(pause(READ.short));
  41  |     await ctaLink.click();
  42  |     await page.waitForTimeout(pause(READ.short));
  43  |     mark('reached start page');
  44  |     completed.push('clicked through to start');
  45  | 
  46  |     // Pick a context — a human reads the options first.
  47  |     result.stage = 'context selection';
  48  |     await page.waitForTimeout(pause(READ.medium));
  49  |     await page.getByRole('button', { name: 'Founder', exact: true }).click();
  50  |     await page.waitForTimeout(pause(READ.short));
  51  |     await page.getByRole('button', { name: 'Continue', exact: true }).click();
  52  |     await page.waitForTimeout(pause(READ.short));
  53  |     completed.push('selected context');
  54  | 
  55  |     // Sign up — real typing speed, not an instant paste.
  56  |     result.stage = 'signup';
  57  |     const email = `human-pace-${Date.now()}@example.test`;
  58  |     await humanType(page.getByLabel('Your name'), 'Jordan Rivera');
  59  |     await page.waitForTimeout(pause(READ.short));
  60  |     await humanType(page.getByLabel('Email address'), email);
  61  |     await page.waitForTimeout(pause(READ.short));
  62  |     await humanType(page.getByLabel('Password', { exact: true }), 'a-real-feeling-password-42');
  63  |     await page.waitForTimeout(pause(READ.short)); // a human glances back over the form before submitting
  64  |     await page.getByRole('button', { name: 'Create your workspace', exact: true }).click();
  65  |     await expect(page).toHaveURL(/\/verify\?/, { timeout: 30000 });
  66  |     mark('reached verification');
  67  |     completed.push('submitted signup');
  68  | 
  69  |     // Verification — a real user has to actually go check their email and copy a code; the
  70  |     // closest honest simulation is reading the dev-mode code and typing it, not injecting it.
  71  |     result.stage = 'verification';
  72  |     await page.waitForTimeout(pause(READ.long)); // "switching to email, finding the code"
  73  |     const code = await page.getByTestId('development-otp').innerText();
  74  |     await humanType(page.getByLabel('Verification code', { exact: true }), code);
  75  |     await page.waitForTimeout(pause(READ.short));
  76  |     await page.getByRole('button', { name: 'Verify account', exact: true }).click();
  77  |     await page.waitForTimeout(pause(READ.short));
  78  |     await page.getByRole('link', { name: 'Continue to workspace', exact: true }).click();
  79  |     await expect(page).toHaveURL(/\/os$/, { timeout: 30000 });
  80  |     mark('reached workspace');
  81  |     completed.push('verified account, entered workspace');
  82  |     await page.screenshot({ path: `${out}/02-workspace-first-look.png` });
  83  | 
  84  |     // A human looks around the empty dashboard before doing anything.
  85  |     await page.waitForTimeout(pause(READ.long));
  86  | 
  87  |     // First goal — a real user thinks about what to type, not instant-fills a canned string.
  88  |     result.stage = 'first goal';
  89  |     await page.getByRole('button', { name: 'New objective', exact: true }).click();
  90  |     await page.waitForTimeout(pause(READ.medium)); // reading the form before starting to type
  91  |     await humanType(page.getByLabel('Your objective', { exact: true }), 'Get my freelance design business off the ground');
  92  |     await page.waitForTimeout(pause(READ.short));
  93  |     await humanType(page.getByLabel('Why it matters'), 'I want steady income doing work I actually like.');
  94  |     await page.waitForTimeout(pause(READ.short));
  95  |     await humanType(page.getByLabel('What does success look like?'), 'Three paying clients within two months.');
  96  |     await page.waitForTimeout(pause(READ.medium)); // reviewing before submitting
  97  |     await page.getByRole('button', { name: 'Create objective', exact: true }).click();
  98  |     await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 30000 });
  99  |     mark('created first goal');
  100 |     completed.push('created first goal');
  101 | 
  102 |     // A human notices the toast and reads it before moving on.
  103 |     await page.waitForTimeout(pause(READ.medium));
  104 |     await page.screenshot({ path: `${out}/03-goal-created.png` });
  105 | 
  106 |     // Navigate to the Companion by clicking the real sidebar link, not a URL jump.
  107 |     result.stage = 'navigate to companion';
  108 |     await page
  109 |       .getByRole('navigation', { name: 'Workspace navigation' })
  110 |       .getByRole('link', { name: 'Companion', exact: false })
  111 |       .click();
  112 |     await page.waitForTimeout(pause(READ.medium));
  113 |     completed.push('navigated to Companion via sidebar');
  114 | 
  115 |     // Find and try the free coordinated task — a real user reads the copy first.
  116 |     result.stage = 'first free outcome';
  117 |     const coordinateSection = page.getByText('Coordinate a task across specialists', { exact: true });
> 118 |     await coordinateSection.scrollIntoViewIfNeeded();
      |                             ^ TimeoutError: locator.scrollIntoViewIfNeeded: Timeout 30000ms exceeded.
  119 |     await page.waitForTimeout(pause(READ.medium));
  120 |     await coordinateSection.click();
  121 |     await page.waitForTimeout(pause(READ.short));
  122 |     await humanType(page.getByLabel('Task description'), 'Get my freelance design business off the ground');
  123 |     await page.waitForTimeout(pause(READ.short));
  124 |     await page.getByRole('button', { name: 'Preview specialist plan' }).click();
  125 |     await page.waitForTimeout(pause(READ.medium)); // reading the plan before approving anything
  126 |     const card = page.locator('.companion-task-card').first();
  127 |     await expect(card).toBeVisible({ timeout: 30000 });
  128 |     await card.scrollIntoViewIfNeeded();
  129 |     await page.screenshot({ path: `${out}/04-plan-preview.png` });
  130 |     await page.waitForTimeout(pause(READ.long)); // deciding whether to actually approve it
  131 |     await card.getByRole('button', { name: /^Approve /, exact: false }).click();
  132 |     await expect(card).toContainText('Your free worksheet is ready.', { timeout: 60000 });
  133 |     mark('completed first free outcome');
  134 |     completed.push('ran and read the free starter worksheet');
  135 | 
  136 |     // A human actually reads the result, not just checks it exists.
  137 |     await page.waitForTimeout(pause(READ.long));
  138 |     result.finalWorksheetText = await card.innerText();
  139 |     await page.screenshot({ path: `${out}/05-first-outcome.png`, fullPage: true });
  140 | 
  141 |     result.stage = 'completed evaluation';
  142 |     result.totalSeconds = Math.round((Date.now() - started) / 1000);
  143 |   } catch (error) {
  144 |     result.failure = (error as Error).message;
  145 |     await page.screenshot({ path: `${out}/failure.png`, fullPage: true }).catch(() => {});
  146 |     throw error;
  147 |   } finally {
  148 |     writeFileSync(`${out}/result.json`, JSON.stringify(result, null, 2));
  149 |   }
  150 | });
  151 | 
```