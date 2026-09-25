import { test, expect as baseExpect } from '@playwright/test';

const expect = baseExpect.configure({ timeout: 30000 });

test.setTimeout(120000);
test.use({ actionTimeout: 30000 });
const ready = { timeout: 30000 };

test('dashboard attention opens real work and remains usable without AI on mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const response = await page.request.post('/api/auth/demo', { data: {} });
  expect(response.status()).toBe(201);
  const policy = await (await page.request.get('/api/ai/settings')).json();
  const denied = await page.request.post('/api/dashboard/briefing', {
    data: { consent: true, rulesVersion: policy.version, today: '2026-09-25' },
  });
  expect([403, 503]).toContain(denied.status());
  await page.goto('/os');
  const briefing = page.getByRole('region', { name: 'Your daily briefing' });
  await expect(briefing).toBeVisible(ready);
  await expect(briefing).toContainText('Your next visit will show changes');
  await expect(briefing.getByRole('button', { name: 'Prepare my briefing' })).toBeDisabled();
  await page.screenshot({ path: test.info().outputPath('briefing-mobile.png'), fullPage: true });
  const state = await (await page.request.get('/api/state')).json();
  const action = state.actions.find((item: { status: string }) => item.status === 'Needs review');
  expect(action).toBeTruthy();
  await briefing
    .getByRole('button', { name: new RegExp(action.title) })
    .first()
    .click();
  await expect(page.getByRole('dialog')).toContainText(action.title);
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.reload();
  await expect(briefing).toContainText('Since your last visit on this browser');
});

test('AI briefing requires consent, opens evidence, becomes stale and preserves facts on failure', async ({
  page,
}) => {
  await page.request.post('/api/auth/demo', { data: {} });
  const state = await (await page.request.get('/api/state')).json();
  const action = state.actions.find((item: { status: string }) => item.status === 'Planned');
  await page.route('**/api/ai/settings', async (route) => {
    const response = await route.fetch();
    const policy = await response.json();
    await route.fulfill({
      json: { ...policy, configured: true, enabled: true, accountEligible: true },
    });
  });
  let calls = 0;
  await page.route('**/api/dashboard/briefing', async (route) => {
    expect(route.request().postDataJSON().consent).toBe(true);
    calls++;
    if (calls > 1) return route.fulfill({ status: 503, json: { error: 'Provider unavailable.' } });
    await route.fulfill({
      json: {
        generatedAt: new Date().toISOString(),
        summary: 'Start the planned action.',
        recommendation: {
          title: 'Make the first move',
          rationale: 'This action is ready to start.',
        },
        assumptions: ['Confirm the plan is still relevant.'],
        sources: [{ id: action.id, title: action.title, kind: 'action', version: action.version }],
      },
    });
  });
  await page.goto('/os');
  const briefing = page.getByRole('region', { name: 'Your daily briefing' });
  await expect(briefing).toBeVisible(ready);
  const button = briefing.getByRole('button', { name: 'Prepare my briefing' });
  await expect(button).toBeDisabled();
  await briefing.getByRole('checkbox').check();
  await button.click();
  await expect(briefing).toContainText('Make the first move');
  await expect(briefing).toContainText('AI suggestion · Prepared');
  await page.screenshot({ path: test.info().outputPath('briefing-desktop.png'), fullPage: true });
  await briefing.getByRole('button', { name: `Open ${action.title}`, exact: true }).click();
  await page.getByRole('button', { name: 'Start action', exact: true }).click();
  await expect(briefing).toContainText('Workspace data or the date has changed');
  await briefing.getByRole('button', { name: 'Refresh my briefing' }).click();
  await expect(briefing.getByRole('alert')).toContainText('Provider unavailable.');
  await expect(briefing.getByRole('heading', { name: /Needs attention/ })).toBeVisible();
  expect(calls).toBe(2);
});
