import { verifySignup } from './auth-helpers';
import { test, expect } from '@playwright/test';

test('consulting project uses the implemented workspace tools end to end', async ({ page }) => {
  await page.goto('/start');
  await page.getByRole('button', { name: 'Professional', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Your name').fill('Consulting Project Lead');
  await page.getByLabel('Email address').fill(`consulting-${Date.now()}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill('secure-consulting-project-password');
  await page.getByRole('button', { name: 'Create your workspace', exact: true }).click();
  await verifySignup(page);
  await expect(page).toHaveURL('/os');

  await page.getByRole('button', { name: 'New objective', exact: true }).click();
  await page
    .getByLabel('Your objective', { exact: true })
    .fill('Deliver the operating model assessment');
  await page.getByLabel('Why it matters').fill('Give the client a clear transformation sequence.');
  await page
    .getByLabel('What does success look like?')
    .fill('A prioritized roadmap accepted by the client.');
  await page.getByRole('button', { name: 'Create objective', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.getByRole('link', { name: 'Clarity', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Deliver the operating model assessment' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'View context & success criteria' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();

  await page.getByRole('link', { name: 'Capability', exact: true }).click();
  await page.getByRole('button', { name: 'Add a capability-building action' }).click();
  await page.getByLabel('Action', { exact: true }).fill('Interview the three stakeholder groups');
  await page
    .getByLabel('Notes and acceptance criteria')
    .fill('Capture constraints, decision rights, and evidence gaps.');
  await page.getByRole('button', { name: 'Add next action', exact: true }).click();

  await page.getByRole('link', { name: 'Consistency', exact: true }).click();
  await expect(
    page.getByRole('button', { name: /Interview the three stakeholder groups/ }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Board', exact: true }).click();
  await expect(page.locator('.kanban-column')).toHaveCount(5);
  await page.getByRole('button', { name: /Interview the three stakeholder groups/ }).click();
  await page.getByRole('button', { name: 'Start action' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.getByRole('link', { name: 'Today', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Start With What Matters Today.',
  );
  await page.getByRole('link', { name: 'Governance', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Define How LAMID ONE Operates in Your Organization.',
  );
  await expect(page.locator('.audit-event').filter({ hasText: 'Action created' })).toContainText(
    'Interview the three stakeholder groups',
  );

  await page.getByRole('link', { name: 'Companion', exact: false }).click();
  await page
    .getByLabel('What do you want to move forward?')
    .fill('Prepare the client steering committee');
  await page.getByRole('button', { name: 'Bring it into focus' }).click();
  await page
    .getByLabel('The situation', { exact: true })
    .fill('The client needs a decision-ready synthesis.');
  await page
    .getByLabel('A meaningful outcome')
    .fill('A concise steering pack with decisions and owners.');
  await page.getByRole('button', { name: 'Explore a pathway' }).click();
  const preview = page.getByRole('region', { name: 'Suggested pathway' });
  await expect(preview).toBeVisible();
  await page.getByLabel('Your next action (optional)').fill('Draft the decision log');
  await expect(page.getByRole('button', { name: 'Save my plan' })).toBeEnabled();
  await page.getByRole('button', { name: 'Save my plan' }).click();
  await expect(page.getByRole('heading', { name: /A clearer direction/ })).toBeVisible();

  await page.getByRole('link', { name: 'Rhythm', exact: true }).click();
  await page.getByRole('button', { name: 'Record a reflection' }).click();
  await page
    .getByLabel('What moved forward?')
    .fill('Stakeholder interviews created a shared baseline.');
  await page
    .getByLabel('What will you carry into the next cycle?')
    .fill('Turn evidence into the steering pack.');
  await page.getByRole('button', { name: 'Save reflection' }).click();
  await expect(page.locator('.review-card')).toContainText(
    'Stakeholder interviews created a shared baseline.',
  );

  await page.getByRole('link', { name: 'Progress', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'See What Is Changing Over Time.',
  );
  await page.getByRole('button', { name: /Search your workspace/ }).click();
  await page.getByLabel('Search objectives, actions, and pages').fill('assessment');
  await expect(page.locator('.search-results')).toContainText(
    'Deliver the operating model assessment',
  );
  await page.getByRole('button', { name: 'Close dialog' }).click();

  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await page.getByRole('link', { name: /Export workspace data/ }).click();
});
