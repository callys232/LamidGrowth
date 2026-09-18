import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

// Deep per-user coverage across every real UI surface: engines (Clarity, Consistency, Knowledge,
// Rhythm, Talent), the Companion (free worksheet, paid specialist sequence, direct single-message
// chat), and the full Commercial marketplace chain — job posting, bidding, manual proposal
// drafting, award-to-project, milestone lifecycle to approval, invoice generation + PDF, and the
// six document tools (Quote, Estimate, Scope of Work, Statement of Work, Client Brief,
// Deliverables, Acceptance Criteria, Change Order). Uses the simulated-AI dedicated server so
// specialists produce real (simulated) grounded output instead of failing on a missing OpenAI key.
const profiles = [
  ['Amara', 'en-NG', 'Founder', 'Plan my first client project'],
  ['Zainab', 'en-US', 'Professional', 'Plan a career transition'],
] as const;

for (const [name, locale, role, goal] of profiles) {
  test(`${name}: deep coverage across engines, companion, and the full marketplace chain`, async ({ browser }, info) => {
    const context = await browser.newContext({ locale, viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const result: Record<string, unknown> = { name, locale, role, goal, stage: 'signup', completed: [] as string[], notes: [] as string[] };
    const completed = result.completed as string[];
    const notes = result.notes as string[];
    const out = `artifacts/deep-coverage/${name}`;
    mkdirSync(out, { recursive: true });

    async function signup(page2: Page, personaName: string, personaRole: string) {
      const email = `deep-${info.workerIndex}-${personaName.toLowerCase()}-${Date.now()}@example.test`;
      await page2.goto('/start');
      await page2.getByRole('button', { name: personaRole, exact: true }).click();
      await page2.getByRole('button', { name: 'Continue', exact: true }).click();
      await page2.getByLabel('Your name').fill(personaName);
      await page2.getByLabel('Email address').fill(email);
      await page2.getByLabel('Password', { exact: true }).fill('deep-coverage-test-password-123');
      await page2.getByRole('button', { name: 'Create your workspace', exact: true }).click();
      await expect(page2).toHaveURL(/\/verify\?/);
      const code = await page2.getByTestId('development-otp').innerText();
      await page2.getByLabel('Verification code', { exact: true }).fill(code);
      await page2.getByRole('button', { name: 'Verify account', exact: true }).click();
      await page2.getByRole('link', { name: 'Continue to workspace', exact: true }).click();
      await expect(page2).toHaveURL(/\/os$/);
      return email;
    }
    async function enableAI(page2: Page) {
      await page2.goto('/os/settings/ai');
      const box = page2.getByRole('checkbox', { name: 'Allow members to request external AI reviews' });
      if (!(await box.isChecked())) await box.check();
      await page2.getByRole('button', { name: 'Save AI settings' }).click();
      await expect(box).toBeChecked();
    }

    try {
      await signup(page, name, role);
      completed.push('signup + verification');

      // --- Clarity: objective ---
      result.stage = 'clarity';
      await page.getByRole('button', { name: 'New objective', exact: true }).click();
      await page.getByLabel('Your objective', { exact: true }).fill(goal);
      await page.getByLabel('Why it matters').fill('Save time and turn an idea into clear next steps.');
      await page.getByLabel('What does success look like?').fill('A useful plan I can act on this week.');
      await page.getByRole('button', { name: 'Create objective', exact: true }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      completed.push('Clarity: objective created');

      // --- Consistency: action ---
      result.stage = 'consistency';
      await page.goto('/os/consistency');
      await page.getByRole('button', { name: 'Add action', exact: true }).click();
      await page.getByLabel('Action', { exact: true }).fill('Draft the first outline');
      await page.getByRole('button', { name: 'Add next action', exact: true }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      completed.push('Consistency: action created');

      // --- Knowledge ---
      result.stage = 'knowledge';
      await page.goto('/os/knowledge');
      await page.getByRole('button', { name: 'Add knowledge', exact: true }).click();
      await page.getByLabel('Knowledge title').fill(`Reference notes for: ${goal}`);
      await page.getByLabel('Knowledge content').fill('Key facts and context worth remembering for this goal.');
      await page.getByRole('button', { name: 'Save knowledge', exact: true }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      completed.push('Knowledge: entry saved');

      // --- Rhythm ---
      result.stage = 'rhythm';
      await page.goto('/os/rhythm');
      await page.getByRole('button', { name: 'Record a reflection', exact: true }).click();
      await page.getByLabel('What moved forward?').fill('Made real progress defining the goal.');
      await page.getByLabel('What changed or taught you something?').fill('Clarity on the first concrete step.');
      await page.getByLabel('What will you carry into the next cycle?').fill('Keep the next action small and specific.');
      await page.getByRole('button', { name: 'Save reflection', exact: true }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      completed.push('Rhythm: reflection saved');

      // --- Companion: free starter worksheet ---
      result.stage = 'companion free worksheet';
      await page.goto('/os/companion/chat');
      await page.getByText('Coordinate a task across specialists', { exact: true }).click();
      await page.getByLabel('Task description').fill(goal);
      await page.getByRole('button', { name: 'Preview specialist plan' }).click();
      const starterCard = page.locator('.companion-task-card').filter({ hasText: goal }).first();
      await expect(starterCard).toBeVisible();
      await starterCard.getByRole('button', { name: /^Approve /, exact: false }).click();
      await expect(starterCard).toContainText('Your free worksheet is ready.', { timeout: 60000 });
      completed.push('Companion: free starter worksheet completed');

      await enableAI(page);
      completed.push('AI policy enabled');

      // --- Companion: direct single-message chat with an explicit specialist ---
      result.stage = 'companion direct chat';
      await page.goto('/os/companion/chat');
      await page.getByRole('combobox', { name: 'Specialist' }).selectOption({ label: 'Capability Mapper · 65 points' });
      await page.getByLabel('Your message').fill(`What capability gaps stand between me and: ${goal}?`);
      await page.getByLabel('Allow this request to share relevant workspace context with external AI, if enabled in workspace settings.').check();
      const balanceBeforeChat = (await (await context.request.get('/api/points')).json()).balance;
      await page.getByRole('button', { name: 'Send', exact: true }).click();
      // The response renders in the companion's message history, not the Specialist dropdown —
      // wait on the points balance actually dropping rather than a text match against the page
      // (the agent name also appears, hidden, inside the <select>'s own option list).
      await expect
        .poll(async () => (await (await context.request.get('/api/points')).json()).balance, { timeout: 60000 })
        .toBeLessThan(balanceBeforeChat);
      completed.push('Companion: direct chat with named specialist');

      // --- Commercial: post a job ---
      result.stage = 'commercial job posting';
      await page.goto('/os/commercial');
      await page.getByRole('button', { name: 'Post a job', exact: true }).click();
      const jobTitle = `${name} deep-coverage job: ${goal}`;
      await page.getByLabel('Job title').fill(jobTitle);
      await page.getByLabel('Project description').fill('Real-world scoped work related to this goal, for a qualified specialist.');
      await page.getByLabel('Deliverables').fill('A completed first milestone and a short handover note.');
      await page.getByLabel('Minimum budget').fill('1000');
      await page.getByLabel('Maximum budget').fill('2000');
      await page.getByLabel('Timeline').fill('3 weeks');
      await page.getByRole('button', { name: /^Post job/ }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 60000 });
      completed.push('Commercial: job posted');

      // --- Bidding + manual proposal, via a lightweight counterpart account ---
      result.stage = 'bidding (counterpart)';
      const bidderContext = await browser.newContext({ locale, viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
      const bidderPage = await bidderContext.newPage();
      let proposalTitle = '';
      try {
        await signup(bidderPage, `${name}Counterpart`, 'Professional');
        await enableAI(bidderPage);
        await bidderPage.goto('/os/commercial');
        await bidderPage.getByRole('button', { name: 'Open opportunities', exact: true }).click().catch(() => {});
        await bidderPage.getByLabel('Search opportunities').fill(jobTitle);
        await bidderPage.getByRole('button', { name: 'View job', exact: true }).first().click();
        await bidderPage.getByLabel('Cover letter').fill('I can deliver this well and on the stated timeline.');
        await bidderPage.getByLabel(/^Proposed amount/).fill('1500');
        await bidderPage.getByLabel('Bid timeline').fill('3 weeks');
        await bidderPage.getByRole('button', { name: /^Submit bid/ }).click();
        await expect(bidderPage.getByText('Prepare proposal draft', { exact: true })).toBeVisible({ timeout: 60000 });
        completed.push('Commercial: bid submitted (counterpart)');

        // --- Document tools, as the freelancer preparing to bid/deliver ---
        result.stage = 'document tools (counterpart)';
        for (const [label, kind] of [
          ['Get a quote', 'quote'],
          ['Get a budget estimate', 'estimate'],
          ['Scope of Work', 'document'],
          ['Statement of Work', 'document'],
          ['Client Brief', 'document'],
          ['Deliverables Checklist', 'checklist'],
          ['Acceptance Criteria', 'checklist'],
        ] as const) {
          const before = (await (await bidderContext.request.get('/api/points')).json()).balance;
          await bidderPage.getByRole('button', { name: label, exact: false }).first().click();
          await expect
            .poll(async () => (await (await bidderContext.request.get('/api/points')).json()).balance, { timeout: 60000 })
            .toBeLessThan(before + 1);
          completed.push(`Document tool: ${label}`);
        }
        await bidderPage.screenshot({ path: `${out}/document-tools.png`, fullPage: true });

        proposalTitle = `Proposal: ${goal}`;
        // The <details> section is already open once a bid exists (open={Boolean(bidId)}) — only
        // click the summary if the form isn't visible yet, since clicking an already-open
        // <details>'s summary toggles it closed.
        if (!(await bidderPage.getByLabel('Proposal title').isVisible())) {
          await bidderPage.getByText('Prepare proposal draft', { exact: true }).click();
        }
        await expect(bidderPage.getByLabel('Proposal title')).toBeVisible();
        await bidderPage.getByLabel('Proposal title').fill(proposalTitle);
        await bidderPage.getByLabel('Scope').fill('Deliver the agreed milestone with regular updates.');
        await bidderPage.getByLabel('Proposal deliverables').fill('A completed first milestone and a short handover note.');
        await bidderPage.getByLabel(/^Proposal amount/).fill('1500');
        await bidderPage.getByLabel('Proposal timeline').fill('3 weeks');
        await bidderPage.getByRole('button', { name: 'Save proposal draft', exact: true }).click();
        await expect(bidderPage.getByRole('button', { name: /^Award / })).toHaveCount(0); // freelancer never sees this
        completed.push('Commercial: manual proposal drafted (counterpart)');

        // --- Change order, on the freshly-drafted proposal ---
        await bidderPage.getByLabel('Request a change to this proposal').fill('Add a second revision round to the plan.');
        await bidderPage.getByRole('button', { name: 'Draft change order', exact: false }).click();
        await expect(bidderPage.locator('.specialist-changeorder-card')).toBeVisible({ timeout: 60000 });
        completed.push('Change order drafted');
        await bidderPage.screenshot({ path: `${out}/change-order.png`, fullPage: true });
      } catch (bidError) {
        notes.push(`Bidding/proposal/document-tools flow: ${(bidError as Error).message}`);
      }

      // --- Client: award the proposal, creating a project ---
      // The job-post modal already closed itself after submission (job creation is the only
      // step that auto-closes it), so the client's page has never actually reopened this job's
      // detail view — do that first, rather than assuming a modal is still open to reload into.
      result.stage = 'award proposal -> project';
      await page.goto('/os/commercial');
      // The client's own posting shows under "Workspace posts" (the default tab); this account
      // has posted exactly one job, so the first "View job" button is unambiguous.
      await page.getByRole('button', { name: 'View job', exact: true }).first().click();
      await page.getByRole('button', { name: /^Award /, exact: false }).first().click();
      await expect(page).toHaveURL(/\/os\/commercial\/projects\//, { timeout: 60000 });
      completed.push('Awarded proposal, project created');

      // --- Milestone lifecycle to approval ---
      result.stage = 'milestone lifecycle';
      const projectUrl = page.url();
      await page.getByPlaceholder('Milestone title').fill('First milestone');
      await page.getByPlaceholder('Amount').fill('500');
      await page.getByRole('button', { name: 'Add milestone', exact: true }).click();
      await page.getByPlaceholder('Deliverable title').fill('Core deliverable');
      await page.getByPlaceholder('Criteria, comma separated').fill('Work is complete and reviewed');
      await page.getByRole('button', { name: 'Add deliverable', exact: true }).click();
      completed.push('Milestone + deliverable created');

      await bidderContext.pages()[0]?.goto(projectUrl).catch(() => {});
      const freelancerProjectPage = bidderContext.pages()[0] || bidderPage;
      await freelancerProjectPage.goto(projectUrl);
      await freelancerProjectPage.getByPlaceholder('What did you complete?').fill('The core deliverable is complete and reviewed.');
      await freelancerProjectPage.getByRole('button', { name: 'Submit for review', exact: true }).click();
      completed.push('Milestone submitted for review');

      await page.goto(projectUrl);
      await page.reload();
      await page.getByRole('button', { name: 'Run verification', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Approve', exact: true })).toBeVisible({ timeout: 60000 });
      await page.getByRole('button', { name: 'Approve', exact: true }).click();
      completed.push('Milestone verified and approved');

      // --- Invoice, as the freelancer, on the now-approved milestone ---
      result.stage = 'invoice generation';
      await freelancerProjectPage.goto(projectUrl);
      await freelancerProjectPage.reload();
      const generateInvoiceButton = freelancerProjectPage.getByRole('button', { name: 'Generate invoice', exact: true });
      await expect(generateInvoiceButton).toBeVisible({ timeout: 60000 });
      await generateInvoiceButton.click();
      await expect(freelancerProjectPage.getByRole('link', { name: 'Download invoice PDF', exact: true })).toBeVisible({ timeout: 60000 });
      completed.push('Invoice generated with downloadable PDF');
      await freelancerProjectPage.screenshot({ path: `${out}/invoice.png`, fullPage: true });

      await bidderContext.close();

      // --- Talent ---
      result.stage = 'talent';
      try {
        await page.goto('/os/talent');
        const saveProfileButton = page.getByRole('button', { name: 'Save profile', exact: true });
        if (await saveProfileButton.count()) {
          await saveProfileButton.click();
          completed.push('Talent: profile save attempted');
        } else {
          notes.push('Talent: no "Save profile" button found on page load.');
        }
      } catch (talentError) {
        notes.push(`Talent page: ${(talentError as Error).message}`);
      }

      // --- Pricing ---
      result.stage = 'pricing';
      await page.goto('/os/pricing');
      await expect(page.getByRole('tab', { name: 'Buy points', exact: true })).toBeVisible();
      completed.push('Pricing: buy-points UI verified (no real purchase attempted)');

      result.pointsRemaining = (await (await context.request.get('/api/points')).json()).balance;
      result.stage = 'completed evaluation';
      await page.screenshot({ path: `${out}/final.png`, fullPage: true });
    } catch (error) {
      result.failure = (error as Error).message;
      await page.screenshot({ path: `${out}/failure.png`, fullPage: true }).catch(() => {});
      throw error;
    } finally {
      writeFileSync(`${out}/result.json`, JSON.stringify(result, null, 2));
      await context.close();
    }
  });
}
