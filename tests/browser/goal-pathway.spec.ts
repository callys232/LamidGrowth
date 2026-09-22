import { test, expect as baseExpect } from '@playwright/test';
const expect = baseExpect.configure({ timeout: 30000 });

test('choose a pathway, save it, and follow progress after reloading', async ({ page }) => {
  test.setTimeout(180000);
  expect((await page.request.post('/api/auth/demo', { data: {} })).status()).toBe(201);
  await page.goto('/os/companion');
  await page.getByLabel('What do you want to move forward?').fill('Grow my customer base');
  await page.getByRole('button', { name: 'Bring it into focus' }).click();
  await page.getByLabel('The situation', { exact: true }).fill('I have a small service business.');
  await page.getByLabel('A meaningful outcome').fill('Three new customers');
  await page.getByLabel('Constraints or assumptions').fill('Two hours each week');
  await page.getByRole('button', { name: 'Explore a pathway' }).click();
  const preview = page.getByRole('region', { name: 'Suggested pathway' });
  await expect(preview.getByText('Validate demand before expanding')).toBeVisible();
  await preview
    .getByLabel('Step 1 action', { exact: true })
    .fill('Record my current customer count');
  await preview.getByLabel('Follow step 3', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Save my plan' }).click();
  await expect(page.getByRole('link', { name: 'Follow your actions' })).toBeVisible();
  const progress = page.getByRole('region', { name: 'Saved goal progress' });
  await expect(progress).toContainText('0 of 4 actions complete');
  await expect(progress).not.toContainText('Test the idea with potential customers');
  await page.reload();
  await expect(progress).toContainText('Record my current customer count');
  await progress.getByRole('link', { name: 'Manage pathway actions' }).click();
  await expect(page.locator('.action-row')).toHaveCount(4);
  await page.getByRole('button', { name: /Record my current customer count/ }).click();
  await page.getByRole('button', { name: 'Start action', exact: true }).click();
  await page.getByRole('button', { name: /Record my current customer count/ }).click();
  await page.getByRole('button', { name: 'Mark complete', exact: true }).click();
  await page.goto('/os/companion');
  await progress.getByLabel('Saved goal').selectOption({ label: 'Grow my customer base' });
  await expect(progress).toContainText('1 of 4 actions complete');
  await progress.getByRole('button', { name: 'Delete goal', exact: true }).click();
  await progress.getByRole('button', { name: 'Keep goal', exact: true }).click();
  await expect(progress).toContainText('Grow my customer base');
  await progress.getByRole('button', { name: 'Delete goal', exact: true }).click();
  await progress.getByRole('button', { name: 'Confirm delete goal', exact: true }).click();
  await expect(progress.getByRole('option', { name: 'Grow my customer base' })).toHaveCount(0);
  await page.reload();
  await expect(progress.getByRole('option', { name: 'Grow my customer base' })).toHaveCount(0);
});

test('human AI rules persist and block requests at the API', async ({ page }) => {
  test.setTimeout(180000);
  expect((await page.request.post('/api/auth/demo', { data: {} })).status()).toBe(201);
  await page.goto('/os/settings/ai');
  await page.getByLabel('Suggest goal pathways', { exact: true }).uncheck();
  await page.getByLabel('Goals and their context', { exact: true }).uncheck();
  await page.getByLabel('Create actions', { exact: true }).selectOption('block');
  await page.getByLabel('Maximum points per AI or specialist request').fill('0');
  await page
    .getByLabel('Planning preferences for AI')
    .fill('Keep actions within two hours per week.');
  await page.getByRole('button', { name: 'Save AI rules', exact: true }).click();
  await expect(
    page.getByText('Your AI rules are saved and enforced.', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Suggest goal pathways', { exact: true })).not.toBeChecked();
  await expect(page.getByLabel('Create actions', { exact: true })).toHaveValue('block');
  await expect(page.getByLabel('Planning preferences for AI')).toHaveValue(
    'Keep actions within two hours per week.',
  );
  const response = await page.request.post('/api/plans/preview', {
    data: {
      mode: 'ai',
      consent: true,
      rulesVersion: 1,
      objective: { title: 'A blocked goal', context: 'Individual', priority: 'Medium' },
    },
  });
  expect(response.status()).toBe(403);
  expect((await response.json()).error).toContain('block pathways');
});
