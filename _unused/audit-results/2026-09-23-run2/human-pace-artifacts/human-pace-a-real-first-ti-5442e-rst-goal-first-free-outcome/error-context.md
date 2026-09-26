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
- generic [ref=f1e2]:
  - generic [ref=f1e3]:
    - link "Skip to workspace" [ref=f1e4] [cursor=pointer]:
      - /url: "#workspace-main"
    - complementary [ref=f1e5]:
      - link "LAMID ONE home" [ref=f1e7] [cursor=pointer]:
        - /url: /
        - generic [ref=f1e15]: LAMID ONE
      - generic [ref=f1e16]:
        - generic [ref=f1e17]: J
        - generic [ref=f1e18]:
          - strong [ref=f1e19]: Jordan's workspace
          - generic [ref=f1e20]: Founder workspace
        - combobox "Switch workspace" [ref=f1e21] [cursor=pointer]:
          - option "Jordan's workspace" [selected]
      - generic [ref=f1e24]: YOUR OPERATING SPACE
      - navigation "Workspace navigation" [ref=f1e25]:
        - link "Overview" [ref=f1e26] [cursor=pointer]:
          - /url: /os
        - link "AI Settings" [ref=f1e32] [cursor=pointer]:
          - /url: /os/settings/ai
        - link "Today" [ref=f1e36] [cursor=pointer]:
          - /url: /os/today
        - link "Clarity" [ref=f1e43] [cursor=pointer]:
          - /url: /os/clarity
        - link "Capability" [ref=f1e47] [cursor=pointer]:
          - /url: /os/capability
        - link "Consistency" [ref=f1e52] [cursor=pointer]:
          - /url: /os/consistency
        - link "Progress" [ref=f1e56] [cursor=pointer]:
          - /url: /os/progress
        - link "Rhythm" [ref=f1e60] [cursor=pointer]:
          - /url: /os/rhythm
        - link "Commercial" [ref=f1e63] [cursor=pointer]:
          - /url: /os/commercial
        - link "Knowledge" [ref=f1e68] [cursor=pointer]:
          - /url: /os/knowledge
        - link "Talent" [ref=f1e73] [cursor=pointer]:
          - /url: /os/talent
        - link "Finance" [ref=f1e79] [cursor=pointer]:
          - /url: /os/finance
        - link "People" [ref=f1e83] [cursor=pointer]:
          - /url: /os/people
        - link "Engines" [ref=f1e89] [cursor=pointer]:
          - /url: /os/engines
        - link "Guided Scoping" [ref=f1e93] [cursor=pointer]:
          - /url: /os/scoping/new
        - link "Learning" [ref=f1e97] [cursor=pointer]:
          - /url: /os/learning
        - link "Companion GUIDED" [active] [ref=f1e102] [cursor=pointer]:
          - /url: /os/companion
          - text: Companion
          - generic [ref=f1e105]: GUIDED
        - link "Workflows" [ref=f1e106] [cursor=pointer]:
          - /url: /os/workflows
        - link "Governance" [ref=f1e111] [cursor=pointer]:
          - /url: /os/governance
      - generic [ref=f1e115]:
        - generic [ref=f1e120]:
          - text: Your work. Your judgment.
          - generic [ref=f1e121]: You decide what happens next.
        - link "Settings" [ref=f1e122] [cursor=pointer]:
          - /url: /os/settings
        - generic [ref=f1e126]:
          - generic [ref=f1e127]: JR
          - generic [ref=f1e128]:
            - strong [ref=f1e129]: Jordan Rivera
            - generic [ref=f1e130]: Workspace owner
          - button "Sign out" [ref=f1e131] [cursor=pointer]
    - generic [ref=f1e135]:
      - banner [ref=f1e136]:
        - generic [ref=f1e137]:
          - generic [ref=f1e138]: Workspace
          - generic [ref=f1e139]: /
          - generic [ref=f1e140]: Companion
        - generic [ref=f1e141]:
          - button "Search your workspace K" [ref=f1e142] [cursor=pointer]:
            - generic [ref=f1e146]: Search your workspace
            - generic [ref=f1e147]: K
          - link "0 actions need review" [ref=f1e150] [cursor=pointer]:
            - /url: /os/today
          - generic [ref=f1e155]: J
      - main [ref=f1e156]:
        - generic [ref=f1e158]:
          - generic [ref=f1e159]: COMPANION · SPACE TO THINK
          - heading "What Are You Working Through?" [level=1] [ref=f1e160]
          - paragraph [ref=f1e161]: Describe the decision, challenge, opportunity, or objective. Add the context that matters and set what may continue progressing between interactions. You remain able to review, redirect, pause, revoke, or override what happens next.
        - paragraph [ref=f1e162]:
          - link "Review an existing objective with AI" [ref=f1e163] [cursor=pointer]:
            - /url: /os/insights
          - text: ", or use guided planning below."
        - generic [ref=f1e164]:
          - generic [ref=f1e165]:
            - generic [ref=f1e166]:
              - generic [ref=f1e170]:
                - strong [ref=f1e171]: Your thinking partner
                - generic [ref=f1e172]: Guided planning · based on your inputs
              - generic [ref=f1e173]: YOU LEAD
            - generic [ref=f1e174]:
              - generic [ref=f1e175]:
                - heading "Let’s start with what’s on your mind." [level=2] [ref=f1e176]
                - paragraph [ref=f1e177]: A decision, an opportunity, a challenge. It doesn’t have to be perfectly formed.
              - generic [ref=f1e178]:
                - generic [ref=f1e179]:
                  - generic [ref=f1e180]: What do you want to move forward?
                  - textbox "What do you want to move forward?" [ref=f1e181]:
                    - /placeholder: I want to…
                - generic [ref=f1e182]:
                  - button "Bring a business idea into focus" [ref=f1e183] [cursor=pointer]
                  - button "Make a difficult decision" [ref=f1e185] [cursor=pointer]
                  - button "Build a more intentional week" [ref=f1e187] [cursor=pointer]
                - button "Bring it into focus" [disabled] [ref=f1e189]
          - complementary [ref=f1e192]:
            - generic [ref=f1e193]: YOUR CONTEXT, IN VIEW
            - heading "A continuous thread." [level=3] [ref=f1e194]
            - paragraph [ref=f1e195]: What you bring into this conversation stays connected to the work you choose to create.
            - generic [ref=f1e196]:
              - generic [ref=f1e197]: "01"
              - generic [ref=f1e198]:
                - strong [ref=f1e199]: Clarify the objective
                - generic [ref=f1e200]: What matters now?
            - generic [ref=f1e201]:
              - generic [ref=f1e202]: "02"
              - generic [ref=f1e203]:
                - strong [ref=f1e204]: Understand the situation
                - generic [ref=f1e205]: What shapes your decision?
            - generic [ref=f1e206]:
              - generic [ref=f1e207]: "03"
              - generic [ref=f1e208]:
                - strong [ref=f1e209]: Make the next move
                - generic [ref=f1e210]: What will you do next?
            - generic [ref=f1e211]:
              - strong [ref=f1e215]: Your judgment comes first.
              - paragraph [ref=f1e216]: Nothing is saved until you choose. External AI runs only when you request it and consent, within your AI rules. Suggestions do not execute work.
        - region "Saved goal progress" [ref=f1e217]:
          - heading "Continue your pathway" [level=2] [ref=f1e218]
          - generic [ref=f1e219]:
            - text: Saved goal
            - combobox "Saved goal" [ref=f1e220]:
              - option "Get my freelance design business off the ground" [selected]
          - heading "Get my freelance design business off the ground" [level=3] [ref=f1e221]
          - paragraph [ref=f1e222]: I want steady income doing work I actually like.
          - generic [ref=f1e223]:
            - term [ref=f1e224]: Success
            - definition [ref=f1e225]: Three paying clients within two months.
            - term [ref=f1e226]: Constraints
            - definition [ref=f1e227]: No constraints recorded.
          - paragraph [ref=f1e228]: "Goal: Active. 0 of 0 actions complete."
          - paragraph [ref=f1e229]: No actions yet. Add a first step to begin following this goal.
          - list
          - generic [ref=f1e230]:
            - link "Manage pathway actions" [ref=f1e231] [cursor=pointer]:
              - /url: /os/consistency?objective=0429cb69-c132-44d1-bd94-e560b61f5abc
            - link "Review goal in Clarity" [ref=f1e232] [cursor=pointer]:
              - /url: /os/clarity
            - button "Add a step" [ref=f1e233] [cursor=pointer]
          - button "Delete goal" [ref=f1e235] [cursor=pointer]
        - group [ref=f1e236]:
          - generic "▸ Getting started" [ref=f1e237] [cursor=pointer]
      - contentinfo [ref=f1e238]:
        - generic [ref=f1e239]: Context connected. Judgment stays human.
        - generic [ref=f1e241]: LAMID ONE · Development edition
  - button "Ask Companion" [ref=f1e242] [cursor=pointer]
```

# Test source

```ts
  37  |   try {
  38  |     // Arrive at the actual homepage, not /start — a real visitor doesn't know the shortcut URL.
  39  |     result.stage = 'homepage';
  40  |     await page.goto('/');
  41  |     await page.waitForTimeout(pause(READ.medium)); // a human looks at the page before doing anything
  42  |     await page.screenshot({ path: `${out}/01-homepage.png` });
  43  |     completed.push('landed on homepage');
  44  | 
  45  |     // Find and click through to start, the way a real visitor would — not a direct URL.
  46  |     const ctaLink = page.getByRole('link', { name: 'Experience LAMID ONE', exact: true }).first();
  47  |     await ctaLink.scrollIntoViewIfNeeded();
  48  |     await page.waitForTimeout(pause(READ.short));
  49  |     await ctaLink.click();
  50  |     await page.waitForTimeout(pause(READ.short));
  51  |     mark('reached start page');
  52  |     completed.push('clicked through to start');
  53  | 
  54  |     // Pick a context — a human reads the options first.
  55  |     result.stage = 'context selection';
  56  |     await page.waitForTimeout(pause(READ.medium));
  57  |     await page.getByRole('button', { name: 'Founder', exact: true }).click();
  58  |     await page.waitForTimeout(pause(READ.short));
  59  |     await page.getByRole('button', { name: 'Continue', exact: true }).click();
  60  |     await page.waitForTimeout(pause(READ.short));
  61  |     completed.push('selected context');
  62  | 
  63  |     // Sign up — real typing speed, not an instant paste.
  64  |     result.stage = 'signup';
  65  |     const email = `human-pace-${Date.now()}@example.test`;
  66  |     await humanType(page.getByLabel('Your name'), 'Jordan Rivera');
  67  |     await page.waitForTimeout(pause(READ.short));
  68  |     await humanType(page.getByLabel('Email address'), email);
  69  |     await page.waitForTimeout(pause(READ.short));
  70  |     await humanType(page.getByLabel('Password', { exact: true }), 'a-real-feeling-password-42');
  71  |     await page.waitForTimeout(pause(READ.short)); // a human glances back over the form before submitting
  72  |     await page.getByRole('button', { name: 'Create your workspace', exact: true }).click();
  73  |     await expect(page).toHaveURL(/\/verify\?/, { timeout: 30000 });
  74  |     mark('reached verification');
  75  |     completed.push('submitted signup');
  76  | 
  77  |     // Verification — a real user has to actually go check their email and copy a code; the
  78  |     // closest honest simulation is reading the dev-mode code and typing it, not injecting it.
  79  |     result.stage = 'verification';
  80  |     await page.waitForTimeout(pause(READ.long)); // "switching to email, finding the code"
  81  |     const code = await page.getByTestId('development-otp').innerText();
  82  |     await humanType(page.getByLabel('Verification code', { exact: true }), code);
  83  |     await page.waitForTimeout(pause(READ.short));
  84  |     await page.getByRole('button', { name: 'Verify account', exact: true }).click();
  85  |     await page.waitForTimeout(pause(READ.short));
  86  |     await page.getByRole('link', { name: 'Continue to workspace', exact: true }).click();
  87  |     await expect(page).toHaveURL(/\/os$/, { timeout: 30000 });
  88  |     mark('reached workspace');
  89  |     completed.push('verified account, entered workspace');
  90  |     await page.screenshot({ path: `${out}/02-workspace-first-look.png` });
  91  | 
  92  |     // A human looks around the empty dashboard before doing anything.
  93  |     await page.waitForTimeout(pause(READ.long));
  94  | 
  95  |     // First goal — a real user thinks about what to type, not instant-fills a canned string.
  96  |     result.stage = 'first goal';
  97  |     await page.getByRole('button', { name: 'New objective', exact: true }).click();
  98  |     await page.waitForTimeout(pause(READ.medium)); // reading the form before starting to type
  99  |     await humanType(
  100 |       page.getByLabel('Your objective', { exact: true }),
  101 |       'Get my freelance design business off the ground',
  102 |     );
  103 |     await page.waitForTimeout(pause(READ.short));
  104 |     await humanType(
  105 |       page.getByLabel('Why it matters'),
  106 |       'I want steady income doing work I actually like.',
  107 |     );
  108 |     await page.waitForTimeout(pause(READ.short));
  109 |     await humanType(
  110 |       page.getByLabel('What does success look like?'),
  111 |       'Three paying clients within two months.',
  112 |     );
  113 |     await page.waitForTimeout(pause(READ.medium)); // reviewing before submitting
  114 |     await page.getByRole('button', { name: 'Create objective', exact: true }).click();
  115 |     await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 30000 });
  116 |     mark('created first goal');
  117 |     completed.push('created first goal');
  118 | 
  119 |     // A human notices the toast and reads it before moving on.
  120 |     await page.waitForTimeout(pause(READ.medium));
  121 |     await page.screenshot({ path: `${out}/03-goal-created.png` });
  122 | 
  123 |     // Navigate to the Companion by clicking the real sidebar link, not a URL jump.
  124 |     result.stage = 'navigate to companion';
  125 |     await page
  126 |       .getByRole('navigation', { name: 'Workspace navigation' })
  127 |       .getByRole('link', { name: 'Companion', exact: false })
  128 |       .click();
  129 |     await page.waitForTimeout(pause(READ.medium));
  130 |     completed.push('navigated to Companion via sidebar');
  131 | 
  132 |     // Find and try the free coordinated task — a real user reads the copy first.
  133 |     result.stage = 'first free outcome';
  134 |     const coordinateSection = page.getByText('Coordinate a task across specialists', {
  135 |       exact: true,
  136 |     });
> 137 |     await coordinateSection.scrollIntoViewIfNeeded();
      |                             ^ TimeoutError: locator.scrollIntoViewIfNeeded: Timeout 30000ms exceeded.
  138 |     await page.waitForTimeout(pause(READ.medium));
  139 |     await coordinateSection.click();
  140 |     await page.waitForTimeout(pause(READ.short));
  141 |     await humanType(
  142 |       page.getByLabel('Task description'),
  143 |       'Get my freelance design business off the ground',
  144 |     );
  145 |     await page.waitForTimeout(pause(READ.short));
  146 |     await page.getByRole('button', { name: 'Preview specialist plan' }).click();
  147 |     await page.waitForTimeout(pause(READ.medium)); // reading the plan before approving anything
  148 |     const card = page.locator('.companion-task-card').first();
  149 |     await expect(card).toBeVisible({ timeout: 30000 });
  150 |     await card.scrollIntoViewIfNeeded();
  151 |     await page.screenshot({ path: `${out}/04-plan-preview.png` });
  152 |     await page.waitForTimeout(pause(READ.long)); // deciding whether to actually approve it
  153 |     await card.getByRole('button', { name: /^Approve /, exact: false }).click();
  154 |     await expect(card).toContainText('Your free worksheet is ready.', { timeout: 60000 });
  155 |     mark('completed first free outcome');
  156 |     completed.push('ran and read the free starter worksheet');
  157 | 
  158 |     // A human actually reads the result, not just checks it exists.
  159 |     await page.waitForTimeout(pause(READ.long));
  160 |     result.finalWorksheetText = await card.innerText();
  161 |     await page.screenshot({ path: `${out}/05-first-outcome.png`, fullPage: true });
  162 | 
  163 |     result.stage = 'completed evaluation';
  164 |     result.totalSeconds = Math.round((Date.now() - started) / 1000);
  165 |   } catch (error) {
  166 |     result.failure = (error as Error).message;
  167 |     await page.screenshot({ path: `${out}/failure.png`, fullPage: true }).catch(() => {});
  168 |     throw error;
  169 |   } finally {
  170 |     writeFileSync(`${out}/result.json`, JSON.stringify(result, null, 2));
  171 |   }
  172 | });
  173 | 
```