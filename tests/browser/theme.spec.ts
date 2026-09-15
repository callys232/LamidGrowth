import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const colorScheme of ['light', 'dark'] as const) {
  test(`public pages have readable text in ${colorScheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    for (const route of ['/', '/start', '/login', '/product', '/pricing']) {
      await page.goto(route);
      await page.locator('main').first().waitFor();
      // Reveal sections animated into view before checking their text.
      for (const section of await page.locator('.home-section, .editorial-section').all()) {
        await section.scrollIntoViewIfNeeded();
      }
      const scan = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
      expect(
        scan.violations.flatMap((v) =>
          v.nodes.map((n) => ({ target: n.target, detail: n.failureSummary })),
        ),
        `${colorScheme} ${route}`,
      ).toEqual([]);
    }
  });
}

test('navbar theme choice overrides the system, persists, and fits mobile', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to light mode', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.setViewportSize({ width: 320, height: 812 });
  const toggle = page.getByRole('button', { name: 'Switch to dark mode', exact: true });
  await expect(toggle).toBeInViewport();
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
