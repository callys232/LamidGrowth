# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: deep-coverage.spec.ts >> Zainab: deep coverage across engines, companion, and the full marketplace chain
- Location: tests\browser\deep-coverage.spec.ts:17:3

# Error details

```
Error: expect(received).toBeLessThan(expected)

Expected: < 500
Received:   500

Call Log:
- Timeout 60000ms exceeded while waiting on the predicate
```

# Test source

```ts
  23  |     const out = `artifacts/deep-coverage/${name}`;
  24  |     mkdirSync(out, { recursive: true });
  25  |
  26  |     async function signup(page2: Page, personaName: string, personaRole: string) {
  27  |       const email = `deep-${info.workerIndex}-${personaName.toLowerCase()}-${Date.now()}@example.test`;
  28  |       await page2.goto('/start');
  29  |       await page2.getByRole('button', { name: personaRole, exact: true }).click();
  30  |       await page2.getByRole('button', { name: 'Continue', exact: true }).click();
  31  |       await page2.getByLabel('Your name').fill(personaName);
  32  |       await page2.getByLabel('Email address').fill(email);
  33  |       await page2.getByLabel('Password', { exact: true }).fill('deep-coverage-test-password-123');
  34  |       await page2.getByRole('button', { name: 'Create your workspace', exact: true }).click();
  35  |       await expect(page2).toHaveURL(/\/verify\?/);
  36  |       const code = await page2.getByTestId('development-otp').innerText();
  37  |       await page2.getByLabel('Verification code', { exact: true }).fill(code);
  38  |       await page2.getByRole('button', { name: 'Verify account', exact: true }).click();
  39  |       await page2.getByRole('link', { name: 'Continue to workspace', exact: true }).click();
  40  |       await expect(page2).toHaveURL(/\/os$/);
  41  |       return email;
  42  |     }
  43  |     async function enableAI(page2: Page) {
  44  |       await page2.goto('/os/settings/ai');
  45  |       const box = page2.getByRole('checkbox', { name: 'Allow external AI in this workspace' });
  46  |       if (!(await box.isChecked())) await box.check();
  47  |       await page2.getByRole('button', { name: 'Save AI rules' }).click();
  48  |       await expect(box).toBeChecked();
  49  |     }
  50  |
  51  |     try {
  52  |       await signup(page, name, role);
  53  |       completed.push('signup + verification');
  54  |
  55  |       // --- Clarity: objective ---
  56  |       result.stage = 'clarity';
  57  |       await page.getByRole('button', { name: 'New objective', exact: true }).click();
  58  |       await page.getByLabel('Your objective', { exact: true }).fill(goal);
  59  |       await page.getByLabel('Why it matters').fill('Save time and turn an idea into clear next steps.');
  60  |       await page.getByLabel('What does success look like?').fill('A useful plan I can act on this week.');
  61  |       await page.getByRole('button', { name: 'Create objective', exact: true }).click();
  62  |       await expect(page.getByRole('dialog')).toHaveCount(0);
  63  |       completed.push('Clarity: objective created');
  64  |
  65  |       // --- Consistency: action ---
  66  |       result.stage = 'consistency';
  67  |       await page.goto('/os/consistency');
  68  |       await page.getByRole('button', { name: 'Add action', exact: true }).click();
  69  |       await page.getByLabel('Action', { exact: true }).fill('Draft the first outline');
  70  |       await page.getByRole('button', { name: 'Add next action', exact: true }).click();
  71  |       await expect(page.getByRole('dialog')).toHaveCount(0);
  72  |       completed.push('Consistency: action created');
  73  |
  74  |       // --- Knowledge ---
  75  |       result.stage = 'knowledge';
  76  |       await page.goto('/os/knowledge');
  77  |       await page.getByRole('button', { name: 'Add knowledge', exact: true }).click();
  78  |       await page.getByLabel('Knowledge title').fill(`Reference notes for: ${goal}`);
  79  |       await page.getByLabel('Knowledge content').fill('Key facts and context worth remembering for this goal.');
  80  |       await page.getByRole('button', { name: 'Save knowledge', exact: true }).click();
  81  |       await expect(page.getByRole('dialog')).toHaveCount(0);
  82  |       completed.push('Knowledge: entry saved');
  83  |
  84  |       // --- Rhythm ---
  85  |       result.stage = 'rhythm';
  86  |       await page.goto('/os/rhythm');
  87  |       await page.getByRole('button', { name: 'Record a reflection', exact: true }).click();
  88  |       await page.getByLabel('What moved forward?').fill('Made real progress defining the goal.');
  89  |       await page.getByLabel('What changed or taught you something?').fill('Clarity on the first concrete step.');
  90  |       await page.getByLabel('What will you carry into the next cycle?').fill('Keep the next action small and specific.');
  91  |       await page.getByRole('button', { name: 'Save reflection', exact: true }).click();
  92  |       await expect(page.getByRole('dialog')).toHaveCount(0);
  93  |       completed.push('Rhythm: reflection saved');
  94  |
  95  |       // --- Companion: free starter worksheet ---
  96  |       result.stage = 'companion free worksheet';
  97  |       await page.goto('/os/companion/chat');
  98  |       await page.getByText('Coordinate a task across specialists', { exact: true }).click();
  99  |       await page.getByLabel('Task description').fill(goal);
  100 |       await page.getByRole('button', { name: 'Preview specialist plan' }).click();
  101 |       const starterCard = page.locator('.companion-task-card').filter({ hasText: goal }).first();
  102 |       await expect(starterCard).toBeVisible();
  103 |       await starterCard.getByRole('button', { name: /^Approve /, exact: false }).click();
  104 |       await expect(starterCard).toContainText('Your free worksheet is ready.', { timeout: 60000 });
  105 |       completed.push('Companion: free starter worksheet completed');
  106 |
  107 |       await enableAI(page);
  108 |       completed.push('AI policy enabled');
  109 |
  110 |       // --- Companion: direct single-message chat with an explicit specialist ---
  111 |       result.stage = 'companion direct chat';
  112 |       await page.goto('/os/companion/chat');
  113 |       await page.getByRole('combobox', { name: 'Specialist' }).selectOption({ label: 'Capability Mapper · 65 points' });
  114 |       await page.getByLabel('Your message').fill(`What capability gaps stand between me and: ${goal}?`);
  115 |       await page.getByLabel('Allow this request to share relevant workspace context with external AI, if enabled in workspace settings.').check();
  116 |       const balanceBeforeChat = (await (await context.request.get('/api/points')).json()).balance;
  117 |       await page.getByRole('button', { name: 'Send', exact: true }).click();
  118 |       // The response renders in the companion's message history, not the Specialist dropdown —
  119 |       // wait on the points balance actually dropping rather than a text match against the page
  120 |       // (the agent name also appears, hidden, inside the <select>'s own option list).
  121 |       await expect
  122 |         .poll(async () => (await (await context.request.get('/api/points')).json()).balance, { timeout: 60000 })
> 123 |         .toBeLessThan(balanceBeforeChat);
      |          ^ Error: expect(received).toBeLessThan(expected)
  124 |       completed.push('Companion: direct chat with named specialist');
  125 |
  126 |       // --- Commercial: post a job ---
  127 |       result.stage = 'commercial job posting';
  128 |       await page.goto('/os/commercial');
  129 |       await page.getByRole('button', { name: 'Post a job', exact: true }).click();
  130 |       const jobTitle = `${name} deep-coverage job: ${goal}`;
  131 |       await page.getByLabel('Job title').fill(jobTitle);
  132 |       await page.getByLabel('Project description').fill('Real-world scoped work related to this goal, for a qualified specialist.');
  133 |       await page.getByLabel('Deliverables').fill('A completed first milestone and a short handover note.');
  134 |       await page.getByLabel('Minimum budget').fill('1000');
  135 |       await page.getByLabel('Maximum budget').fill('2000');
  136 |       await page.getByLabel('Timeline').fill('3 weeks');
  137 |       await page.getByRole('button', { name: /^Post job/ }).click();
  138 |       await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 60000 });
  139 |       completed.push('Commercial: job posted');
  140 |
  141 |       // --- Bidding + manual proposal, via a lightweight counterpart account ---
  142 |       result.stage = 'bidding (counterpart)';
  143 |       const bidderContext = await browser.newContext({ locale, viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
  144 |       const bidderPage = await bidderContext.newPage();
  145 |       let proposalTitle = '';
  146 |       try {
  147 |         await signup(bidderPage, `${name}Counterpart`, 'Professional');
  148 |         await enableAI(bidderPage);
  149 |         await bidderPage.goto('/os/commercial');
  150 |         await bidderPage.getByRole('button', { name: 'Open opportunities', exact: true }).click().catch(() => {});
  151 |         await bidderPage.getByLabel('Search opportunities').fill(jobTitle);
  152 |         await bidderPage.getByRole('button', { name: 'View job', exact: true }).first().click();
  153 |         await bidderPage.getByLabel('Cover letter').fill('I can deliver this well and on the stated timeline.');
  154 |         await bidderPage.getByLabel(/^Proposed amount/).fill('1500');
  155 |         await bidderPage.getByLabel('Bid timeline').fill('3 weeks');
  156 |         await bidderPage.getByRole('button', { name: /^Submit bid/ }).click();
  157 |         await expect(bidderPage.getByText('Prepare proposal draft', { exact: true })).toBeVisible({ timeout: 60000 });
  158 |         completed.push('Commercial: bid submitted (counterpart)');
  159 |
  160 |         // --- Document tools, as the freelancer preparing to bid/deliver ---
  161 |         result.stage = 'document tools (counterpart)';
  162 |         for (const [label, kind] of [
  163 |           ['Get a quote', 'quote'],
  164 |           ['Get a budget estimate', 'estimate'],
  165 |           ['Scope of Work', 'document'],
  166 |           ['Statement of Work', 'document'],
  167 |           ['Client Brief', 'document'],
  168 |           ['Deliverables Checklist', 'checklist'],
  169 |           ['Acceptance Criteria', 'checklist'],
  170 |         ] as const) {
  171 |           const before = (await (await bidderContext.request.get('/api/points')).json()).balance;
  172 |           await bidderPage.getByRole('button', { name: label, exact: false }).first().click();
  173 |           await expect
  174 |             .poll(async () => (await (await bidderContext.request.get('/api/points')).json()).balance, { timeout: 60000 })
  175 |             .toBeLessThan(before + 1);
  176 |           completed.push(`Document tool: ${label}`);
  177 |         }
  178 |         await bidderPage.screenshot({ path: `${out}/document-tools.png`, fullPage: true });
  179 |
  180 |         proposalTitle = `Proposal: ${goal}`;
  181 |         // The <details> section is already open once a bid exists (open={Boolean(bidId)}) — only
  182 |         // click the summary if the form isn't visible yet, since clicking an already-open
  183 |         // <details>'s summary toggles it closed.
  184 |         if (!(await bidderPage.getByLabel('Proposal title').isVisible())) {
  185 |           await bidderPage.getByText('Prepare proposal draft', { exact: true }).click();
  186 |         }
  187 |         await expect(bidderPage.getByLabel('Proposal title')).toBeVisible();
  188 |         await bidderPage.getByLabel('Proposal title').fill(proposalTitle);
  189 |         await bidderPage.getByLabel('Scope').fill('Deliver the agreed milestone with regular updates.');
  190 |         await bidderPage.getByLabel('Proposal deliverables').fill('A completed first milestone and a short handover note.');
  191 |         await bidderPage.getByLabel(/^Proposal amount/).fill('1500');
  192 |         await bidderPage.getByLabel('Proposal timeline').fill('3 weeks');
  193 |         await bidderPage.getByRole('button', { name: 'Save proposal draft', exact: true }).click();
  194 |         await expect(bidderPage.getByRole('button', { name: /^Award / })).toHaveCount(0); // freelancer never sees this
  195 |         completed.push('Commercial: manual proposal drafted (counterpart)');
  196 |
  197 |         // --- Change order, on the freshly-drafted proposal ---
  198 |         await bidderPage.getByLabel('Request a change to this proposal').fill('Add a second revision round to the plan.');
  199 |         await bidderPage.getByRole('button', { name: 'Draft change order', exact: false }).click();
  200 |         await expect(bidderPage.locator('.specialist-changeorder-card')).toBeVisible({ timeout: 60000 });
  201 |         completed.push('Change order drafted');
  202 |         await bidderPage.screenshot({ path: `${out}/change-order.png`, fullPage: true });
  203 |       } catch (bidError) {
  204 |         notes.push(`Bidding/proposal/document-tools flow: ${(bidError as Error).message}`);
  205 |       }
  206 |
  207 |       // --- Client: award the proposal, creating a project ---
  208 |       // The job-post modal already closed itself after submission (job creation is the only
  209 |       // step that auto-closes it), so the client's page has never actually reopened this job's
  210 |       // detail view — do that first, rather than assuming a modal is still open to reload into.
  211 |       result.stage = 'award proposal -> project';
  212 |       await page.goto('/os/commercial');
  213 |       // The client's own posting shows under "Workspace posts" (the default tab); this account
  214 |       // has posted exactly one job, so the first "View job" button is unambiguous.
  215 |       await page.getByRole('button', { name: 'View job', exact: true }).first().click();
  216 |       await page.getByRole('button', { name: /^Award /, exact: false }).first().click();
  217 |       await expect(page).toHaveURL(/\/os\/commercial\/projects\//, { timeout: 60000 });
  218 |       completed.push('Awarded proposal, project created');
  219 |
  220 |       // --- Milestone lifecycle to approval ---
  221 |       result.stage = 'milestone lifecycle';
  222 |       const projectUrl = page.url();
  223 |       await page.getByPlaceholder('Milestone title').fill('First milestone');
```
