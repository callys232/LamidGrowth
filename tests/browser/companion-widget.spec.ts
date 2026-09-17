import { test, expect as baseExpect } from '@playwright/test';
const expect = baseExpect.configure({ timeout: 30000 });
test.use({ actionTimeout: 60000 });
test.setTimeout(180000);

test('visitor guidance works on mobile in both themes and restores keyboard focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await page.goto('/');
  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => (document.documentElement.dataset.theme = value), theme);
    await page.getByRole('button', { name: 'Ask Companion', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Your Companion' });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Ask Companion', { exact: true }).fill("I can't sign in");
    await dialog.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(dialog.getByRole('link', { name: 'Open this page' }).last()).toHaveAttribute(
      'href',
      '/forgot-password',
    );
    const box = await dialog.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(375);
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Ask Companion', exact: true })).toBeFocused();
  }
});

test('specialist selection persists history and a coordinated plan survives reload', async ({
  page,
}) => {
  test.setTimeout(180000);
  const response = await page.request.post('/api/auth/demo', { data: {} });
  expect(response.status()).toBe(201);
  await page.goto('/os/companion/chat');
  await page.getByLabel('Specialist', { exact: true }).selectOption('pricing');
  await page.getByLabel('Your message', { exact: true }).fill('Explain points');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(
    page.locator('.companion-chat-turn-agent').filter({ hasText: 'Review current plans' }),
  ).toBeVisible();
  await page.getByText('Coordinate a task across specialists', { exact: true }).click();
  await page.getByLabel('Task description').fill('Improve my personal goal planning');
  await page.getByRole('button', { name: 'Preview specialist plan' }).click();
  await expect(
    page.getByRole('heading', { name: 'Improve my personal goal planning' }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.locator('.companion-chat-turn-agent').filter({ hasText: 'Review current plans' }),
  ).toBeVisible();
  await page.getByText('Coordinate a task across specialists', { exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Improve my personal goal planning' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cancel remaining steps' }).click();
  await expect(page.locator('.companion-task-status')).toContainText('cancelled');
  await expect(page.getByRole('button', { name: /^Approve / })).toHaveCount(0);
});
