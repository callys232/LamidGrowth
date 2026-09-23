# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: expert-network.spec.ts >> the consolidated /experts page renders every group with its own heading
- Location: tests\browser\expert-network.spec.ts:16:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.experts-group-header').getByText('Finding & Engaging Expertise', { exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('.experts-group-header').getByText('Finding & Engaging Expertise', { exact: true }) with timeout 5000ms
  - waiting for locator('.experts-group-header').getByText('Finding & Engaging Expertise', { exact: true })

```

```yaml
- banner:
    - link "LAMID ONE home":
        - /url: /
        - text: LAMID ONE HUMAN JUDGMENT. INFINITE POSSIBILITY.
    - navigation "Main navigation":
        - link "Home":
            - /url: /
        - button "Product":
            - text: Product
            - img
        - button "Solutions":
            - text: Solutions
            - img
        - button "Experts":
            - text: Experts
            - img
        - button "Resources":
            - text: Resources
            - img
        - link "Pricing":
            - /url: /pricing
    - button "Switch to dark mode"
    - link "Sign in":
        - /url: /login
    - link "Experience LAMID ONE":
        - /url: /start
        - text: Experience LAMID ONE
        - img
- main:
    - text: EXPERT NETWORK
    - heading "Bring the Right Human Expertise Into the Work." [level=1]
    - paragraph: When the next step needs specialist judgment, experience or delivery, bring the right expert into the same operating context.
    - text: Finding & Engaging Expertise
    - heading "Start With the Need" [level=2]
    - paragraph: Describe the decision, capability gap, project, challenge or outcome. LAMID ONE can translate it into an expertise requirement instead of forcing you to guess a category.
    - list:
        - listitem:
            - article:
                - heading "Expertise Across the Work" [level=3]
                - paragraph: Strategy, finance, people, marketing, commercial, operations, technology/data/AI, product/design, legal/risk/compliance, engineering, manufacturing, energy, healthcare, sustainability, research, education, public sector, development/impact, program management, creative and other supported domains.
        - listitem:
            - article:
                - heading "Flexible Engagements" [level=3]
                - paragraph: Use advisory sessions, projects, milestone engagements, retainers, fractional roles, workshops, coaching, assessments or multi-expert teams.
        - listitem:
            - article:
                - heading "Context Stays Connected" [level=3]
                - paragraph: Keep approved briefs, decisions, deliverables, evidence and outcomes connected according to permissions.
        - listitem:
            - article:
                - heading "Human Choice Remains Central" [level=3]
                - paragraph: LAMID ONE can recommend and explain matches. You choose who to engage, what authority they receive, and what work is accepted.
                - link "Find Expertise":
                    - /url: /start
                - link "Become an Expert":
                    - /url: /start
        - listitem:
            - article:
                - heading "Need Help Defining the Work?" [level=3]
                - paragraph: Start with the outcome or problem even if you do not know the scope. LAMID ONE can build a working project brief, explain unfamiliar fields and identify what still needs specialist judgment.
        - listitem:
            - article:
                - heading "No Expert Available Right Now?" [level=3]
                - paragraph: Your work does not stop. Keep the draft, unresolved questions and context intact, then queue the specific parts that need qualified human review. You approve the revised scope before it becomes canonical unless a defined policy says otherwise.
    - text: Expert Matching
    - heading "Match Expertise to the Work - Not Just a Keyword." [level=2]
    - paragraph: Start from the objective, context and capability gap, then compare experts using evidence relevant to the actual work.
    - list:
        - listitem:
            - article:
                - heading "Define the Expertise Requirement" [level=3]
                - paragraph: Capability, domain, function, industry, seniority, jurisdiction, timing and engagement model.
        - listitem:
            - article:
                - heading "Evaluate Fit" [level=3]
                - paragraph: Relevant experience, verified claims, credentials where required, evidence, availability, language, geography, engagement preferences and conflicts.
        - listitem:
            - article:
                - heading "See Why a Match Appears" [level=3]
                - paragraph: Show the factors behind the recommendation and distinguish verified evidence from self-declared profile information.
        - listitem:
            - article:
                - heading "Select the Expert Yourself" [level=3]
                - paragraph: Review the shortlist, compare fit, invite or decline, and approve the final scope.
        - listitem:
            - article:
                - heading "Build an Expert Team" [level=3]
                - paragraph: Compose complementary specialists around a complex objective while preserving responsibilities and access boundaries.
                - link "Start an Expert Match":
                    - /url: /start
    - text: Verification
    - heading "Know What Has Been Verified." [level=2]
    - paragraph: Verification should state exactly what was checked, how, when and what remains self-declared.
    - list:
        - listitem:
            - article:
                - heading "Identity" [level=3]
                - paragraph: Confirm the person or organization behind the expert profile at the appropriate verification level.
        - listitem:
            - article:
                - heading "Expertise Claims" [level=3]
                - paragraph: Support skills, roles, methods and specialist claims with work history, portfolio evidence, assessments, references or other proof.
        - listitem:
            - article:
                - heading "Credentials & Licensing" [level=3]
                - paragraph: Where required, record scope, issuer, jurisdiction, status and expiry. A badge never implies more than was actually verified.
        - listitem:
            - article:
                - heading "Experience & Outcomes" [level=3]
                - paragraph: Show relevant work and permitted outcome evidence without fabricating proof or exposing confidential information.
        - listitem:
            - article:
                - heading "Ongoing Status" [level=3]
                - paragraph: Verification may expire, be revoked, require refresh, or become inapplicable when jurisdiction or scope changes.
                - link "Explore Experts":
                    - /url: /start
                - link "View Verification Principles":
                    - /url: /trust/governance
    - text: Capability Strategy
    - heading "Strengthen Capability - Then Keep Building It." [level=2]
    - paragraph: Not every gap requires the same answer. Use experts, hiring, learning, coaching, tools, role redesign or a blended route according to the need.
    - list:
        - listitem:
            - article:
                - heading "Diagnose the Gap" [level=3]
                - paragraph: Identify missing knowledge, specialist capacity, leadership, methods, tools, funding, data or authority.
        - listitem:
            - article:
                - heading "Choose the Right Route" [level=3]
                - paragraph: Compare expert engagement, recruitment, fractional leadership, upskilling, reskilling, mentoring, coaching, learning and Tool Fabric options.
        - listitem:
            - article:
                - heading "Build Workforce Capability" [level=3]
                - paragraph: Connect role architecture, capability maps, skills gaps, workforce planning, succession and learning where needed.
        - listitem:
            - article:
                - heading "Learn From the Engagement" [level=3]
                - paragraph: With permission, capture reusable methods, evidence, decisions and lessons so external expertise strengthens internal capability.
        - listitem:
            - article:
                - heading "Measure the Change" [level=3]
                - paragraph: Review whether the capability gap narrowed and the intended outcome improved.
                - link "Strengthen Capability":
                    - /url: /how-it-works/capability
    - text: Become an Expert
    - heading "Bring Your Expertise Into Better-Defined Work." [level=2]
    - paragraph: Create a cross-domain expert profile, evidence your capabilities and choose how you want to engage.
    - list:
        - listitem:
            - article:
                - heading "Create Your Expert Profile" [level=3]
                - paragraph: Add domains, functions, industries, specialist capabilities, seniority, languages, geography and engagement preferences.
        - listitem:
            - article:
                - heading "Evidence What You Claim" [level=3]
                - paragraph: Add work history, portfolio evidence, credentials, assessments, references or other proof appropriate to your claims.
        - listitem:
            - article:
                - heading "Set How You Work" [level=3]
                - paragraph: Define availability and supported advisory, project, retainer, fractional, coaching, workshop or assessment models.
        - listitem:
            - article:
                - heading "Receive Relevant Opportunities" [level=3]
                - paragraph: Matching prioritizes fit with the objective and requirements rather than generic visibility.
        - listitem:
            - article:
                - heading "Deliver in Context" [level=3]
                - paragraph: Use structured scope, milestones, evidence, communication and acceptance criteria where the engagement requires them.
        - listitem:
            - article:
                - heading "Build a Traceable Record" [level=3]
                - paragraph: Completed work and permitted outcome signals can strengthen future matching without exposing confidential client information.
                - link "Apply to Join the Expert Network":
                    - /url: /start
- contentinfo:
    - link "LAMID ONE home":
        - /url: /
        - text: LAMID ONE HUMAN JUDGMENT. INFINITE POSSIBILITY.
    - paragraph: Think clearly. Build capability. Make consistent progress.
    - heading "Explore" [level=3]
    - link "The product":
        - /url: /product
    - link "How it works":
        - /url: /how-it-works
    - link "Your context":
        - /url: /who-its-for
    - heading "Learn" [level=3]
    - link "Our story":
        - /url: /about
    - link "Getting started":
        - /url: /help/getting-started
    - link "Help center":
        - /url: /help
    - heading "Trust" [level=3]
    - link "Human control":
        - /url: /trust/governance
    - link "Privacy & data":
        - /url: /trust/privacy
    - link "Accessibility":
        - /url: /accessibility
    - text: © 2026 LAMID ONE Progress keeps moving. Control stays with you.
    - link "Back to top ↑":
        - /url: '#top'
- button "Ask Companion"
```

# Test source

```ts
  1  | import { verifySignup } from './auth-helpers';
  2  | import { test, expect } from '@playwright/test';
  3  |
  4  | async function signUp(page: import('@playwright/test').Page, name: string, email: string) {
  5  |   await page.goto('/start');
  6  |   await page.getByRole('button', { name: 'Founder', exact: true }).click();
  7  |   await page.getByRole('button', { name: 'Continue', exact: true }).click();
  8  |   await page.getByLabel('Your name').fill(name);
  9  |   await page.getByLabel('Email address').fill(email);
  10 |   await page.getByLabel('Password', { exact: true }).fill('secure-expert-network-password');
  11 |   await page.getByRole('button', { name: 'Create your workspace', exact: true }).click();
  12 |   await verifySignup(page);
  13 |   await expect(page).toHaveURL('/os');
  14 | }
  15 |
  16 | test('the consolidated /experts page renders every group with its own heading', async ({ page }) => {
  17 |   await page.goto('/experts');
  18 |   await expect(page.getByRole('heading', { name: 'Bring the Right Human Expertise Into the Work.' })).toBeVisible();
  19 |   for (const group of ['Finding & Engaging Expertise', 'Expert Matching', 'Verification', 'Capability Strategy', 'Become an Expert']) {
> 20 |     await expect(page.locator('.experts-group-header').getByText(group, { exact: true })).toBeVisible();
     |                                                                                           ^ Error: expect(locator).toBeVisible() failed
  21 |   }
  22 | });
  23 |
  24 | test('an expert can publish availability, see it on the week calendar, and create a team', async ({ page }) => {
  25 |   const email = `expert-network-${Date.now()}@example.test`;
  26 |   await signUp(page, 'Expert Network Tester', email);
  27 |
  28 |   await page.getByRole('link', { name: 'Talent', exact: true }).click();
  29 |   await page.getByLabel('Headline').fill('Operations consultant');
  30 |   await page.getByLabel('Skills').fill('operations, strategy');
  31 |   await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  32 |
  33 |   const now = new Date();
  34 |   now.setDate(now.getDate() + 1);
  35 |   const later = new Date(now.getTime() + 60 * 60 * 1000);
  36 |   const toLocal = (d: Date) => d.toISOString().slice(0, 16);
  37 |   await page.getByLabel('Starts').fill(toLocal(now));
  38 |   await page.getByLabel('Ends').fill(toLocal(later));
  39 |   await page.getByRole('button', { name: 'Publish slot', exact: true }).click();
  40 |   await expect(page.locator('.week-calendar-event').first()).toBeVisible();
  41 |
  42 |   await page.getByLabel('Team name').fill('Playwright Pod');
  43 |   await page.getByRole('button', { name: 'Create team', exact: true }).click();
  44 |   await expect(page.getByText('Playwright Pod')).toBeVisible();
  45 | });
  46 |
  47 | test('guided scoping wizard flags a regulated objective and offers expert review', async ({ page }) => {
  48 |   const email = `scoping-network-${Date.now()}@example.test`;
  49 |   await signUp(page, 'Scoping Network Tester', email);
  50 |
  51 |   await page.getByRole('link', { name: 'Guided Scoping', exact: true }).click();
  52 |   await page.getByLabel('Objective').fill('Review our healthcare data-handling policy');
  53 |   await page.getByRole('button', { name: 'Continue', exact: true }).click();
  54 |   await page.getByLabel('Category').selectOption('Legal and compliance');
  55 |   await page.getByLabel('Deliverables').fill('A written policy review');
  56 |   await page.getByLabel('Budget context').fill('$2000');
  57 |   await page.getByLabel('Timeline context').fill('2 weeks');
  58 |   await page.getByRole('button', { name: 'Continue to review', exact: true }).click();
  59 |   await expect(page.getByRole('button', { name: 'Request expert review instead', exact: true })).toBeVisible();
  60 |   await page.getByRole('button', { name: 'Request expert review instead', exact: true }).click();
  61 |   await expect(page.getByText(/Sent to the expert review queue/)).toBeVisible();
  62 | });
  63 |
```
