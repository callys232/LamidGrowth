import { test, expect } from '@playwright/test';

test('a scheduled operating cycle requires each write approval and delivers a reminder', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto('/start');
  await page.getByRole('button', { name: 'Founder', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Your name').fill('Workflows Tester');
  await page.getByLabel('Email address').fill(`workflows-${Date.now()}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill('secure-workflows-test-password');
  await page.getByRole('button', { name: 'Create your workspace', exact: true }).click();
  await expect(page).toHaveURL('/os');
  // A workflow attaches to an open objective, so one must exist before the "Create a workflow"
  // panel appears.
  await page.getByRole('button', { name: 'New objective', exact: true }).click();
  await page.getByLabel('Your objective', { exact: true }).fill('Prepare the weekly decision cycle');
  await page.getByLabel('Why it matters').fill('Keep the weekly review consistent.');
  await page.getByLabel('What does success look like?').fill('A repeatable weekly workflow.');
  await page.getByRole('button', { name: 'Create objective', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('link', { name: 'Workflows', exact: true }).click();
  await page.getByText('Create a workflow', { exact: true }).click();
  await page.getByLabel('Workflow name').fill('Prepare the weekly decision');
  await page.getByLabel('Next action to prepare (optional)').fill('Review the weekly evidence');
  await page
    .getByLabel('Review reminder', { exact: true })
    .fill('Review the recorded weekly outcome');
  await page.getByRole('button', { name: 'Save workflow draft' }).click();
  const run = page
    .locator('section.settings-card')
    .filter({ hasText: 'Prepare the weekly decision' });
  await run.getByRole('button', { name: 'Start workflow', exact: true }).click();
  for (let i = 0; i < 3; i++) {
    await expect(run.getByRole('button', { name: 'Approve next step' })).toBeVisible({
      timeout: 15000,
    });
    const response = page.waitForResponse(
      (response) =>
        response.url().includes('/api/workflows/') && response.request().method() === 'PATCH',
    );
    await run.getByRole('button', { name: 'Approve next step' }).click();
    expect((await response).status()).toBe(200);
    await expect(run.locator('ol > li').nth(i + 2)).toContainText('completed', { timeout: 15000 });
  }
  await expect(run.locator('.status-pill')).toHaveText('completed', { timeout: 15000 });
  await page.goto('/os/settings/notifications');
  await expect(
    page.getByRole('heading', { name: 'Review the recorded weekly outcome' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Mark as read' }).click();
  await expect(page.getByText('Read', { exact: true })).toBeVisible();
  await page.goto('/os/consistency');
  await expect(page.getByRole('button', { name: /Review the weekly evidence/ })).toBeVisible();
});

test('workspace switching discards stale settings and owner controls reflect membership', async ({
  page,
  playwright,
}) => {
  const owner = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:3107' });
  const member = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:3107' });
  try {
    const stamp = Date.now();
    await owner.post('/api/auth/signup', {
      data: {
        name: 'Enterprise owner',
        email: `owner-${stamp}@example.test`,
        password: 'a-long-test-password',
        context: 'Enterprise',
      },
    });
    await member.post('/api/auth/signup', {
      data: {
        name: 'Workspace member',
        email: `member-${stamp}@example.test`,
        password: 'a-long-test-password',
        context: 'Professional',
      },
    });
    const enterprise = await (await owner.get('/api/state')).json();
    const personal = await (await member.get('/api/state')).json();
    await owner.post('/api/admin/members', { data: { email: personal.user.email } });
    await page.context().addCookies((await member.storageState()).cookies);
    await page.goto('/os/settings');
    await page.getByLabel('Workspace name', { exact: true }).fill('Unsaved personal draft');
    await page.getByLabel('Switch workspace').selectOption(enterprise.workspace.id);
    await expect(page.getByLabel('Workspace name', { exact: true })).toHaveValue(
      enterprise.workspace.name,
    );
    await expect(page.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    await page.getByLabel('Switch workspace').selectOption(personal.workspace.id);
    await expect(page.getByLabel('Workspace name', { exact: true })).toHaveValue(
      personal.workspace.name,
    );
    await expect(page.getByRole('button', { name: 'Save changes' })).toBeEnabled();
  } finally {
    await owner.dispose();
    await member.dispose();
  }
});
