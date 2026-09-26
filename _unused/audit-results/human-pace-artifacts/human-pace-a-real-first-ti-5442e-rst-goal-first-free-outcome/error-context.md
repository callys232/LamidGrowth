# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: human-pace.spec.ts >> a real first-time visitor: homepage, signup, first goal, first free outcome
- Location: tests\browser\human-pace.spec.ts:20:1

# Error details

```
Error: locator.click: Error: strict mode violation: getByRole('link', { name: 'Companion' }) resolved to 2 elements:
    1) <a href="/os/companion" data-discover="true" class="sidebar-link companion-link">…</a> aka getByRole('link', { name: 'Companion GUIDED' })
    2) <a href="/os/companion" data-discover="true" class="button button-light">…</a> aka getByRole('link', { name: 'Think it through with' })

Call log:
  - waiting for getByRole('link', { name: 'Companion' })

```

# Page snapshot

```yaml
- generic [ref=f1e2]:
    - generic [ref=f1e3]:
        - link "Skip to workspace" [ref=f1e4] [cursor=pointer]:
            - /url: '#workspace-main'
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
                - link "Companion GUIDED" [ref=f1e102] [cursor=pointer]:
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
                    - generic [ref=f1e140]: Overview
                - generic [ref=f1e141]:
                    - button "Search your workspace K" [ref=f1e142] [cursor=pointer]:
                        - generic [ref=f1e146]: Search your workspace
                        - generic [ref=f1e147]: K
                    - link "0 actions need review" [ref=f1e150] [cursor=pointer]:
                        - /url: /os/today
                    - generic [ref=f1e155]: J
            - main [ref=f1e156]:
                - generic [ref=f1e157]:
                    - generic [ref=f1e158]:
                        - generic [ref=f1e159]: TUESDAY, SEPTEMBER 22
                        - heading "What Needs Your Attention?" [level=1] [ref=f1e160]
                        - paragraph [ref=f1e161]: Return to what progressed, what changed, what improved, what needs approval, and the priorities and active work relevant now.
                    - button "New objective" [ref=f1e162] [cursor=pointer]
                - generic [ref=f1e164]:
                    - generic [ref=f1e165]:
                        - generic [ref=f1e166]:
                            - generic [ref=f1e167]: YOUR NEXT CHAPTER
                            - heading "Meaningful progress. One clear step at a time." [level=2] [ref=f1e169]
                            - paragraph [ref=f1e170]: You’re working toward 1 objective. Keep your priorities close, and your next action closer.
                            - link "Think it through with Companion" [ref=f1e171] [cursor=pointer]:
                                - /url: /os/companion
                        - generic [ref=f1e181]: ONE
                        - generic [ref=f1e183]: YOUR CONTEXT. YOUR DIRECTION.
                    - generic [ref=f1e184]:
                        - generic [ref=f1e185]: HUMAN JUDGMENT
                        - heading "You’re in control." [level=3] [ref=f1e191]
                        - paragraph [ref=f1e192]: Nothing is waiting for approval. Keep building at your own pace.
                        - link "See your activity" [ref=f1e193] [cursor=pointer]:
                            - /url: /os/governance
                - generic [ref=f1e196]:
                    - generic [ref=f1e197]:
                        - generic [ref=f1e198]: Active objectives
                        - strong [ref=f1e204]: '01'
                        - text: A direction worth moving toward
                    - generic [ref=f1e205]:
                        - generic [ref=f1e206]: Actions in motion
                        - strong [ref=f1e212]: '00'
                        - text: Intent, turning into execution
                    - generic [ref=f1e213]:
                        - generic [ref=f1e214]: Actions completed
                        - strong [ref=f1e219]: '00'
                        - text: Each step builds on the last
                    - generic [ref=f1e220]:
                        - generic [ref=f1e221]: Reflections recorded
                        - strong [ref=f1e225]: '00'
                        - text: Learning that carries forward
                - generic [ref=f1e226]:
                    - generic [ref=f1e227]:
                        - generic [ref=f1e228]:
                            - heading "Your focus" [level=2] [ref=f1e229]
                            - generic [ref=f1e230]: The outcomes behind your work.
                        - link "All objectives" [ref=f1e231] [cursor=pointer]:
                            - /url: /os/clarity
                    - article [ref=f1e236]:
                        - generic [ref=f1e237]:
                            - generic [ref=f1e238]: Medium priority
                            - generic [ref=f1e239]: Founder
                        - heading "Get my freelance design business off the ground" [level=3] [ref=f1e240]
                        - paragraph [ref=f1e241]: I want steady income doing work I actually like.
                        - generic [ref=f1e242]:
                            - generic [ref=f1e243]: 0 of 0 actions complete
                            - strong [ref=f1e244]: 0%
                        - 'progressbar "Get my freelance design business off the ground: 0% complete" [ref=f1e245]'
                        - generic [ref=f1e246]:
                            - generic [ref=f1e247]: No date
                            - button "Next action" [ref=f1e250] [cursor=pointer]
                - generic [ref=f1e252]:
                    - generic [ref=f1e253]:
                        - generic [ref=f1e254]:
                            - generic [ref=f1e255]:
                                - heading "Make your next move" [level=2] [ref=f1e256]
                                - generic [ref=f1e257]: Small steps. Connected to the bigger picture.
                            - button "Add action" [ref=f1e258] [cursor=pointer]
                        - generic [ref=f1e260]:
                            - heading "A little room to begin" [level=3] [ref=f1e267]
                            - paragraph [ref=f1e268]: Add an action to move an objective forward.
                        - link "See all your actions" [ref=f1e269] [cursor=pointer]:
                            - /url: /os/consistency
                    - generic [ref=f1e272]:
                        - generic [ref=f1e276]: BUILD YOUR RHYTHM
                        - heading [level=3] [ref=f1e277]:
                            - text: A moment to reflect.
                            - emphasis [ref=f1e278]: A better next week.
                        - paragraph [ref=f1e279]: What moved forward? What did you learn? Carry the useful parts into your next cycle.
                        - link "Start a reflection" [ref=f1e280] [cursor=pointer]:
                            - /url: /os/rhythm
                - generic [ref=f1e283]:
                    - generic [ref=f1e285]:
                        - heading "Everything happening in your workspace" [level=2] [ref=f1e286]
                        - generic [ref=f1e287]: Objectives, marketplace activity, workflows, and Companion agents in one place.
                    - list [ref=f1e288]:
                        - listitem [ref=f1e289]:
                            - generic [ref=f1e296]: welcome_bonus
                            - generic [ref=f1e297]: credited
                            - generic [ref=f1e299]: Sep 22, 9:40 AM
                - group [ref=f1e300]:
                    - generic "▸ Getting started" [ref=f1e301] [cursor=pointer]
            - contentinfo [ref=f1e302]:
                - generic [ref=f1e303]: Context connected. Judgment stays human.
                - generic [ref=f1e305]: LAMID ONE · Development edition
        - status [ref=f1e306]:
            - text: Your objective is ready. Define the next step.
            - button "Dismiss message" [ref=f1e309] [cursor=pointer]
    - button "Ask Companion" [ref=f1e313] [cursor=pointer]
```

# Test source

```ts
  8   | // coverage, it's whether the highest-stakes first few minutes actually feel good at human speed.
  9   |
  10  | const READ = { short: [800, 1600], medium: [1800, 3200], long: [3000, 5000] } as const;
  11  | function pause(range: readonly [number, number]) {
  12  |   const [min, max] = range;
  13  |   return Math.round(min + Math.random() * (max - min));
  14  | }
  15  | async function humanType(locator: import('@playwright/test').Locator, text: string) {
  16  |   await locator.click();
  17  |   await locator.pressSequentially(text, { delay: 55 + Math.random() * 70 });
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
> 108 |     await page.getByRole('link', { name: 'Companion', exact: false }).click();
      |                                                                       ^ Error: locator.click: Error: strict mode violation: getByRole('link', { name: 'Companion' }) resolved to 2 elements:
  109 |     await page.waitForTimeout(pause(READ.medium));
  110 |     completed.push('navigated to Companion via sidebar');
  111 |
  112 |     // Find and try the free coordinated task — a real user reads the copy first.
  113 |     result.stage = 'first free outcome';
  114 |     const coordinateSection = page.getByText('Coordinate a task across specialists', { exact: true });
  115 |     await coordinateSection.scrollIntoViewIfNeeded();
  116 |     await page.waitForTimeout(pause(READ.medium));
  117 |     await coordinateSection.click();
  118 |     await page.waitForTimeout(pause(READ.short));
  119 |     await humanType(page.getByLabel('Task description'), 'Get my freelance design business off the ground');
  120 |     await page.waitForTimeout(pause(READ.short));
  121 |     await page.getByRole('button', { name: 'Preview specialist plan' }).click();
  122 |     await page.waitForTimeout(pause(READ.medium)); // reading the plan before approving anything
  123 |     const card = page.locator('.companion-task-card').first();
  124 |     await expect(card).toBeVisible({ timeout: 30000 });
  125 |     await card.scrollIntoViewIfNeeded();
  126 |     await page.screenshot({ path: `${out}/04-plan-preview.png` });
  127 |     await page.waitForTimeout(pause(READ.long)); // deciding whether to actually approve it
  128 |     await card.getByRole('button', { name: /^Approve /, exact: false }).click();
  129 |     await expect(card).toContainText('Your free worksheet is ready.', { timeout: 60000 });
  130 |     mark('completed first free outcome');
  131 |     completed.push('ran and read the free starter worksheet');
  132 |
  133 |     // A human actually reads the result, not just checks it exists.
  134 |     await page.waitForTimeout(pause(READ.long));
  135 |     result.finalWorksheetText = await card.innerText();
  136 |     await page.screenshot({ path: `${out}/05-first-outcome.png`, fullPage: true });
  137 |
  138 |     result.stage = 'completed evaluation';
  139 |     result.totalSeconds = Math.round((Date.now() - started) / 1000);
  140 |   } catch (error) {
  141 |     result.failure = (error as Error).message;
  142 |     await page.screenshot({ path: `${out}/failure.png`, fullPage: true }).catch(() => {});
  143 |     throw error;
  144 |   } finally {
  145 |     writeFileSync(`${out}/result.json`, JSON.stringify(result, null, 2));
  146 |   }
  147 | });
  148 |
```
