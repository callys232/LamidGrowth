# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: journey.spec.ts >> keyboard search, dialogs, and accessibility semantics
- Location: tests\browser\journey.spec.ts:114:1

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 13

- Array []
+ Array [
+   Object {
+     "id": "color-contrast",
+     "nodes": Array [
+       Array [
+         ".tag",
+       ],
+       Array [
+         ".judgment-panel > p",
+       ],
+     ],
+   },
+ ]
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
                - generic [ref=f1e17]: T
                - generic [ref=f1e18]:
                    - strong [ref=f1e19]: The next chapter
                    - generic [ref=f1e20]: Founder workspace
                - combobox "Switch workspace" [ref=f1e21] [cursor=pointer]:
                    - option "The next chapter" [selected]
            - generic [ref=f1e24]: YOUR OPERATING SPACE
            - navigation "Workspace navigation" [ref=f1e25]:
                - link "Overview" [ref=f1e26] [cursor=pointer]:
                    - /url: /os
                - link "AI Settings" [ref=f1e32] [cursor=pointer]:
                    - /url: /os/settings/ai
                - link "Today 1" [ref=f1e36] [cursor=pointer]:
                    - /url: /os/today
                    - text: Today
                    - generic [ref=f1e43]: '1'
                - link "Clarity" [ref=f1e44] [cursor=pointer]:
                    - /url: /os/clarity
                - link "Capability" [ref=f1e48] [cursor=pointer]:
                    - /url: /os/capability
                - link "Consistency" [ref=f1e53] [cursor=pointer]:
                    - /url: /os/consistency
                - link "Progress" [ref=f1e57] [cursor=pointer]:
                    - /url: /os/progress
                - link "Rhythm" [ref=f1e61] [cursor=pointer]:
                    - /url: /os/rhythm
                - link "Commercial" [ref=f1e64] [cursor=pointer]:
                    - /url: /os/commercial
                - link "Knowledge" [ref=f1e69] [cursor=pointer]:
                    - /url: /os/knowledge
                - link "Talent" [ref=f1e74] [cursor=pointer]:
                    - /url: /os/talent
                - link "Finance" [ref=f1e80] [cursor=pointer]:
                    - /url: /os/finance
                - link "People" [ref=f1e84] [cursor=pointer]:
                    - /url: /os/people
                - link "Engines" [ref=f1e90] [cursor=pointer]:
                    - /url: /os/engines
                - link "Guided Scoping" [ref=f1e94] [cursor=pointer]:
                    - /url: /os/scoping/new
                - link "Learning" [ref=f1e98] [cursor=pointer]:
                    - /url: /os/learning
                - link "Companion GUIDED" [ref=f1e103] [cursor=pointer]:
                    - /url: /os/companion
                    - text: Companion
                    - generic [ref=f1e106]: GUIDED
                - link "Workflows" [ref=f1e107] [cursor=pointer]:
                    - /url: /os/workflows
                - link "Governance" [ref=f1e112] [cursor=pointer]:
                    - /url: /os/governance
            - generic [ref=f1e116]:
                - generic [ref=f1e121]:
                    - text: Your work. Your judgment.
                    - generic [ref=f1e122]: You decide what happens next.
                - link "Settings" [ref=f1e123] [cursor=pointer]:
                    - /url: /os/settings
                - generic [ref=f1e127]:
                    - generic [ref=f1e128]: AM
                    - generic [ref=f1e129]:
                        - strong [ref=f1e130]: Alex Morgan
                        - generic [ref=f1e131]: Sample workspace
                    - button "Sign out" [ref=f1e132] [cursor=pointer]
        - generic [ref=f1e136]:
            - banner [ref=f1e137]:
                - generic [ref=f1e138]:
                    - generic [ref=f1e139]: Workspace
                    - generic [ref=f1e140]: /
                    - generic [ref=f1e141]: Overview
                - generic [ref=f1e142]:
                    - button "Search your workspace K" [ref=f1e143] [cursor=pointer]:
                        - generic [ref=f1e147]: Search your workspace
                        - generic [ref=f1e148]: K
                    - link "1 actions need review" [ref=f1e151] [cursor=pointer]:
                        - /url: /os/today
                    - generic [ref=f1e157]: A
            - generic [ref=f1e158]:
                - generic [ref=f1e159]: Your own sample workspace. Explore freely; changes are saved in this session.
                - link "Create your workspace" [ref=f1e161] [cursor=pointer]:
                    - /url: /signup
            - main [ref=f1e165]:
                - generic [ref=f1e166]:
                    - generic [ref=f1e167]:
                        - generic [ref=f1e168]: TUESDAY, SEPTEMBER 22
                        - heading "What Needs Your Attention?" [level=1] [ref=f1e169]
                        - paragraph [ref=f1e170]: Return to what progressed, what changed, what improved, what needs approval, and the priorities and active work relevant now.
                    - button "New objective" [ref=f1e171] [cursor=pointer]
                - generic [ref=f1e173]:
                    - generic [ref=f1e174]:
                        - generic [ref=f1e175]:
                            - generic [ref=f1e176]: YOUR NEXT CHAPTER
                            - heading "Meaningful progress. One clear step at a time." [level=2] [ref=f1e178]
                            - paragraph [ref=f1e179]: You’re working toward 2 objectives. Keep your priorities close, and your next action closer.
                            - link "Think it through with Companion" [ref=f1e180] [cursor=pointer]:
                                - /url: /os/companion
                        - generic [ref=f1e190]: ONE
                        - generic [ref=f1e192]: YOUR CONTEXT. YOUR DIRECTION.
                    - generic [ref=f1e193]:
                        - generic [ref=f1e194]: HUMAN JUDGMENT
                        - heading "Your perspective makes the difference." [level=3] [ref=f1e200]
                        - paragraph [ref=f1e201]: 1 action is ready for your review. A small decision can unlock the next step.
                        - link "Review what needs you" [ref=f1e202] [cursor=pointer]:
                            - /url: /os/governance
                - generic [ref=f1e205]:
                    - generic [ref=f1e206]:
                        - generic [ref=f1e207]: Active objectives
                        - strong [ref=f1e213]: '02'
                        - text: A direction worth moving toward
                    - generic [ref=f1e214]:
                        - generic [ref=f1e215]: Actions in motion
                        - strong [ref=f1e221]: '01'
                        - text: Intent, turning into execution
                    - generic [ref=f1e222]:
                        - generic [ref=f1e223]: Actions completed
                        - strong [ref=f1e228]: '01'
                        - text: Each step builds on the last
                    - generic [ref=f1e229]:
                        - generic [ref=f1e230]: Reflections recorded
                        - strong [ref=f1e234]: '00'
                        - text: Learning that carries forward
                - generic [ref=f1e235]:
                    - generic [ref=f1e236]:
                        - generic [ref=f1e237]:
                            - heading "Your focus" [level=2] [ref=f1e238]
                            - generic [ref=f1e239]: The outcomes behind your work.
                        - link "All objectives" [ref=f1e240] [cursor=pointer]:
                            - /url: /os/clarity
                    - generic [ref=f1e244]:
                        - article [ref=f1e245]:
                            - generic [ref=f1e246]:
                                - generic [ref=f1e247]: Medium priority
                                - generic [ref=f1e248]: Professional
                            - heading "Build a more intentional week" [level=3] [ref=f1e249]
                            - paragraph [ref=f1e250]: Make space for deep work and a meaningful weekly review.
                            - generic [ref=f1e251]:
                                - generic [ref=f1e252]: 1 of 2 actions complete
                                - strong [ref=f1e253]: 50%
                            - 'progressbar "Build a more intentional week: 50% complete" [ref=f1e254]'
                            - generic [ref=f1e255]:
                                - generic [ref=f1e256]: Oct 6
                                - button "Next action" [ref=f1e259] [cursor=pointer]
                        - article [ref=f1e261]:
                            - generic [ref=f1e262]:
                                - generic [ref=f1e263]: High priority
                                - generic [ref=f1e264]: Founder
                            - heading "Launch our advisory practice" [level=3] [ref=f1e265]
                            - paragraph [ref=f1e266]: Build a focused service for growing businesses. Validate the offer with three potential customers before investing in a full launch.
                            - generic [ref=f1e267]:
                                - generic [ref=f1e268]: 0 of 3 actions complete
                                - strong [ref=f1e269]: 0%
                            - 'progressbar "Launch our advisory practice: 0% complete" [ref=f1e270]'
                            - generic [ref=f1e271]:
                                - generic [ref=f1e272]: Oct 20
                                - button "Next action" [ref=f1e275] [cursor=pointer]
                - generic [ref=f1e277]:
                    - generic [ref=f1e278]:
                        - generic [ref=f1e279]:
                            - generic [ref=f1e280]:
                                - heading "Make your next move" [level=2] [ref=f1e281]
                                - generic [ref=f1e282]: Small steps. Connected to the bigger picture.
                            - button "Add action" [ref=f1e283] [cursor=pointer]
                        - button "Write a Friday reflection Build a more intentional week Sep 26" [ref=f1e285] [cursor=pointer]:
                            - generic [ref=f1e287]:
                                - strong [ref=f1e288]: Write a Friday reflection
                                - generic [ref=f1e289]: Build a more intentional week
                            - generic [ref=f1e290]: Sep 26
                        - button "Schedule three discovery conversations Launch our advisory practice Sep 25" [ref=f1e293] [cursor=pointer]:
                            - generic [ref=f1e295]:
                                - strong [ref=f1e296]: Schedule three discovery conversations
                                - generic [ref=f1e297]: Launch our advisory practice
                            - generic [ref=f1e298]: Sep 25
                        - button "Review customer interview questions Launch our advisory practice Sep 22" [ref=f1e301] [cursor=pointer]:
                            - generic [ref=f1e303]:
                                - strong [ref=f1e304]: Review customer interview questions
                                - generic [ref=f1e305]: Launch our advisory practice
                            - generic [ref=f1e306]: Sep 22
                        - button "Draft the service offer Launch our advisory practice Sep 23" [ref=f1e309] [cursor=pointer]:
                            - generic [ref=f1e312]:
                                - strong [ref=f1e313]: Draft the service offer
                                - generic [ref=f1e314]: Launch our advisory practice
                            - generic [ref=f1e315]: Sep 23
                        - link "See all your actions" [ref=f1e318] [cursor=pointer]:
                            - /url: /os/consistency
                    - generic [ref=f1e321]:
                        - generic [ref=f1e325]: BUILD YOUR RHYTHM
                        - heading [level=3] [ref=f1e326]:
                            - text: A moment to reflect.
                            - emphasis [ref=f1e327]: A better next week.
                        - paragraph [ref=f1e328]: What moved forward? What did you learn? Carry the useful parts into your next cycle.
                        - link "Start a reflection" [ref=f1e329] [cursor=pointer]:
                            - /url: /os/rhythm
                - generic [ref=f1e332]:
                    - generic [ref=f1e334]:
                        - heading "Everything happening in your workspace" [level=2] [ref=f1e335]
                        - generic [ref=f1e336]: Objectives, marketplace activity, workflows, and Companion agents in one place.
                    - list [ref=f1e337]:
                        - listitem [ref=f1e338]:
                            - generic [ref=f1e344]: Write a Friday reflection
                            - generic [ref=f1e345]: Planned
                            - generic [ref=f1e347]: Sep 22, 9:38 AM
                        - listitem [ref=f1e348]:
                            - generic [ref=f1e354]: Protect two deep-work blocks
                            - generic [ref=f1e355]: Done
                            - generic [ref=f1e357]: Sep 22, 9:38 AM
                        - listitem [ref=f1e358]:
                            - generic [ref=f1e364]: Schedule three discovery conversations
                            - generic [ref=f1e365]: Planned
                            - generic [ref=f1e367]: Sep 22, 9:38 AM
                        - listitem [ref=f1e368]:
                            - generic [ref=f1e374]: Review customer interview questions
                            - generic [ref=f1e375]: Needs review
                            - generic [ref=f1e377]: Sep 22, 9:38 AM
                        - listitem [ref=f1e378]:
                            - generic [ref=f1e384]: Draft the service offer
                            - generic [ref=f1e385]: In progress
                            - generic [ref=f1e387]: Sep 22, 9:38 AM
                        - listitem [ref=f1e388]:
                            - generic [ref=f1e394]: Build a more intentional week
                            - generic [ref=f1e395]: Active
                            - generic [ref=f1e397]: Sep 22, 9:38 AM
                        - listitem [ref=f1e398]:
                            - generic [ref=f1e404]: Launch our advisory practice
                            - generic [ref=f1e405]: Active
                            - generic [ref=f1e407]: Sep 22, 9:38 AM
                - group [ref=f1e408]:
                    - generic "▸ Getting started" [ref=f1e409] [cursor=pointer]
            - contentinfo [ref=f1e410]:
                - generic [ref=f1e411]: Context connected. Judgment stays human.
                - generic [ref=f1e413]: LAMID ONE · Development edition
    - button "Ask Companion" [ref=f1e414] [cursor=pointer]
```

# Test source

```ts
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
  104 |   await page.getByRole('button', { name: 'Choose the next step' }).click();
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
> 131 |   expect(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual(
      |                                                                                             ^ Error: expect(received).toEqual(expected) // deep equality
  132 |     [],
  133 |   );
  134 | });
  135 |
```
