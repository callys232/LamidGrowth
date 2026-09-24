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
  57  |     async function enableAI(page2: Page) {
  58  |       await page2.goto('/os/settings/ai');
  59  |       const box = page2.getByRole('checkbox', { name: 'Allow external AI in this workspace' });
  60  |       if (!(await box.isChecked())) await box.check();
  61  |       await page2.getByRole('button', { name: 'Save AI rules' }).click();
  62  |       await expect(box).toBeChecked();
  63  |     }
  64  | 
  65  |     try {
  66  |       await signup(page, name, role);
  67  |       completed.push('signup + verification');
  68  | 
  69  |       // --- Clarity: objective ---
  70  |       result.stage = 'clarity';
  71  |       await page.getByRole('button', { name: 'New objective', exact: true }).click();
  72  |       await page.getByLabel('Your objective', { exact: true }).fill(goal);
  73  |       await page
  74  |         .getByLabel('Why it matters')
  75  |         .fill('Save time and turn an idea into clear next steps.');
  76  |       await page
  77  |         .getByLabel('What does success look like?')
  78  |         .fill('A useful plan I can act on this week.');
  79  |       await page.getByRole('button', { name: 'Create objective', exact: true }).click();
  80  |       await expect(page.getByRole('dialog')).toHaveCount(0);
  81  |       completed.push('Clarity: objective created');
  82  | 
  83  |       // --- Consistency: action ---
  84  |       result.stage = 'consistency';
  85  |       await page.goto('/os/consistency');
  86  |       await page.getByRole('button', { name: 'Add action', exact: true }).click();
  87  |       await page.getByLabel('Action', { exact: true }).fill('Draft the first outline');
  88  |       await page.getByRole('button', { name: 'Add next action', exact: true }).click();
  89  |       await expect(page.getByRole('dialog')).toHaveCount(0);
  90  |       completed.push('Consistency: action created');
  91  | 
  92  |       // --- Knowledge ---
  93  |       result.stage = 'knowledge';
  94  |       await page.goto('/os/knowledge');
  95  |       await page.getByRole('button', { name: 'Add knowledge', exact: true }).click();
  96  |       await page.getByLabel('Knowledge title').fill(`Reference notes for: ${goal}`);
  97  |       await page
  98  |         .getByLabel('Knowledge content')
  99  |         .fill('Key facts and context worth remembering for this goal.');
  100 |       await page.getByRole('button', { name: 'Save knowledge', exact: true }).click();
  101 |       await expect(page.getByRole('dialog')).toHaveCount(0);
  102 |       completed.push('Knowledge: entry saved');
  103 | 
  104 |       // --- Rhythm ---
  105 |       result.stage = 'rhythm';
  106 |       await page.goto('/os/rhythm');
  107 |       await page.getByRole('button', { name: 'Record a reflection', exact: true }).click();
  108 |       await page.getByLabel('What moved forward?').fill('Made real progress defining the goal.');
  109 |       await page
  110 |         .getByLabel('What changed or taught you something?')
  111 |         .fill('Clarity on the first concrete step.');
  112 |       await page
  113 |         .getByLabel('What will you carry into the next cycle?')
  114 |         .fill('Keep the next action small and specific.');
  115 |       await page.getByRole('button', { name: 'Save reflection', exact: true }).click();
  116 |       await expect(page.getByRole('dialog')).toHaveCount(0);
  117 |       completed.push('Rhythm: reflection saved');
  118 | 
  119 |       // --- Companion: free starter worksheet ---
  120 |       result.stage = 'companion free worksheet';
  121 |       await page.goto('/os/companion/chat');
  122 |       await page.getByText('Coordinate a task across specialists', { exact: true }).click();
  123 |       await page.getByLabel('Task description').fill(goal);
  124 |       await page.getByRole('button', { name: 'Preview specialist plan' }).click();
  125 |       const starterCard = page.locator('.companion-task-card').filter({ hasText: goal }).first();
  126 |       await expect(starterCard).toBeVisible();
  127 |       await starterCard.getByRole('button', { name: /^Approve /, exact: false }).click();
  128 |       await expect(starterCard).toContainText('Your free worksheet is ready.', { timeout: 60000 });
  129 |       completed.push('Companion: free starter worksheet completed');
  130 | 
  131 |       await enableAI(page);
  132 |       completed.push('AI policy enabled');
  133 | 
  134 |       // --- Companion: direct single-message chat with an explicit specialist ---
  135 |       result.stage = 'companion direct chat';
  136 |       await page.goto('/os/companion/chat');
  137 |       await page
  138 |         .getByRole('combobox', { name: 'Specialist' })
  139 |         .selectOption({ label: 'Capability Mapper · 65 points' });
  140 |       await page
  141 |         .getByLabel('Your message')
  142 |         .fill(`What capability gaps stand between me and: ${goal}?`);
  143 |       await page
  144 |         .getByLabel(
  145 |           'Allow this request to share relevant workspace context with external AI, if enabled in workspace settings.',
  146 |         )
  147 |         .check();
  148 |       const balanceBeforeChat = (await (await context.request.get('/api/points')).json()).balance;
  149 |       await page.getByRole('button', { name: 'Send', exact: true }).click();
  150 |       // The response renders in the companion's message history, not the Specialist dropdown —
  151 |       // wait on the points balance actually dropping rather than a text match against the page
  152 |       // (the agent name also appears, hidden, inside the <select>'s own option list).
  153 |       await expect
  154 |         .poll(async () => (await (await context.request.get('/api/points')).json()).balance, {
  155 |           timeout: 60000,
  156 |         })
> 157 |         .toBeLessThan(balanceBeforeChat);
      |          ^ Error: expect(received).toBeLessThan(expected)
  158 |       completed.push('Companion: direct chat with named specialist');
  159 | 
  160 |       // --- Commercial: post a job ---
  161 |       result.stage = 'commercial job posting';
  162 |       await page.goto('/os/commercial');
  163 |       await page.getByRole('button', { name: 'Post a job', exact: true }).click();
  164 |       const jobTitle = `${name} deep-coverage job: ${goal}`;
  165 |       await page.getByLabel('Job title').fill(jobTitle);
  166 |       await page
  167 |         .getByLabel('Project description')
  168 |         .fill('Real-world scoped work related to this goal, for a qualified specialist.');
  169 |       await page
  170 |         .getByLabel('Deliverables')
  171 |         .fill('A completed first milestone and a short handover note.');
  172 |       await page.getByLabel('Minimum budget').fill('1000');
  173 |       await page.getByLabel('Maximum budget').fill('2000');
  174 |       await page.getByLabel('Timeline').fill('3 weeks');
  175 |       await page.getByRole('button', { name: /^Post job/ }).click();
  176 |       await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 60000 });
  177 |       completed.push('Commercial: job posted');
  178 | 
  179 |       // --- Bidding + manual proposal, via a lightweight counterpart account ---
  180 |       result.stage = 'bidding (counterpart)';
  181 |       const bidderContext = await browser.newContext({
  182 |         locale,
  183 |         viewport: { width: 1280, height: 1000 },
  184 |         reducedMotion: 'reduce',
  185 |       });
  186 |       const bidderPage = await bidderContext.newPage();
  187 |       let proposalTitle = '';
  188 |       try {
  189 |         await signup(bidderPage, `${name}Counterpart`, 'Professional');
  190 |         await enableAI(bidderPage);
  191 |         await bidderPage.goto('/os/commercial');
  192 |         await bidderPage
  193 |           .getByRole('button', { name: 'Open opportunities', exact: true })
  194 |           .click()
  195 |           .catch(() => {});
  196 |         await bidderPage.getByLabel('Search opportunities').fill(jobTitle);
  197 |         await bidderPage.getByRole('button', { name: 'View job', exact: true }).first().click();
  198 |         await bidderPage
  199 |           .getByLabel('Cover letter')
  200 |           .fill('I can deliver this well and on the stated timeline.');
  201 |         await bidderPage.getByLabel(/^Proposed amount/).fill('1500');
  202 |         await bidderPage.getByLabel('Bid timeline').fill('3 weeks');
  203 |         await bidderPage.getByRole('button', { name: /^Submit bid/ }).click();
  204 |         await expect(bidderPage.getByText('Prepare proposal draft', { exact: true })).toBeVisible({
  205 |           timeout: 60000,
  206 |         });
  207 |         completed.push('Commercial: bid submitted (counterpart)');
  208 | 
  209 |         // --- Document tools, as the freelancer preparing to bid/deliver ---
  210 |         result.stage = 'document tools (counterpart)';
  211 |         for (const [label, kind] of [
  212 |           ['Get a quote', 'quote'],
  213 |           ['Get a budget estimate', 'estimate'],
  214 |           ['Scope of Work', 'document'],
  215 |           ['Statement of Work', 'document'],
  216 |           ['Client Brief', 'document'],
  217 |           ['Deliverables Checklist', 'checklist'],
  218 |           ['Acceptance Criteria', 'checklist'],
  219 |         ] as const) {
  220 |           const before = (await (await bidderContext.request.get('/api/points')).json()).balance;
  221 |           await bidderPage.getByRole('button', { name: label, exact: false }).first().click();
  222 |           await expect
  223 |             .poll(
  224 |               async () => (await (await bidderContext.request.get('/api/points')).json()).balance,
  225 |               { timeout: 60000 },
  226 |             )
  227 |             .toBeLessThan(before + 1);
  228 |           completed.push(`Document tool: ${label}`);
  229 |         }
  230 |         await bidderPage.screenshot({ path: `${out}/document-tools.png`, fullPage: true });
  231 | 
  232 |         proposalTitle = `Proposal: ${goal}`;
  233 |         // The <details> section is already open once a bid exists (open={Boolean(bidId)}) — only
  234 |         // click the summary if the form isn't visible yet, since clicking an already-open
  235 |         // <details>'s summary toggles it closed.
  236 |         if (!(await bidderPage.getByLabel('Proposal title').isVisible())) {
  237 |           await bidderPage.getByText('Prepare proposal draft', { exact: true }).click();
  238 |         }
  239 |         await expect(bidderPage.getByLabel('Proposal title')).toBeVisible();
  240 |         await bidderPage.getByLabel('Proposal title').fill(proposalTitle);
  241 |         await bidderPage
  242 |           .getByLabel('Scope')
  243 |           .fill('Deliver the agreed milestone with regular updates.');
  244 |         await bidderPage
  245 |           .getByLabel('Proposal deliverables')
  246 |           .fill('A completed first milestone and a short handover note.');
  247 |         await bidderPage.getByLabel(/^Proposal amount/).fill('1500');
  248 |         await bidderPage.getByLabel('Proposal timeline').fill('3 weeks');
  249 |         await bidderPage.getByRole('button', { name: 'Save proposal draft', exact: true }).click();
  250 |         await expect(bidderPage.getByRole('button', { name: /^Award / })).toHaveCount(0); // freelancer never sees this
  251 |         completed.push('Commercial: manual proposal drafted (counterpart)');
  252 | 
  253 |         // --- Change order, on the freshly-drafted proposal ---
  254 |         await bidderPage
  255 |           .getByLabel('Request a change to this proposal')
  256 |           .fill('Add a second revision round to the plan.');
  257 |         await bidderPage.getByRole('button', { name: 'Draft change order', exact: false }).click();
```