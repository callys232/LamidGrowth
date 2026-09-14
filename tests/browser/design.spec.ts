import { test, expect } from '@playwright/test';

test('canonical palette and Three.js scene respond and settle without an idle loop', async ({
  page,
}) => {
  // The orbit visual lives on the account entry pages (/start, /login), not the marketing
  // homepage — it accompanies the signup/login form, not the hero.
  await page.goto('/start');
  const orbit = page.locator('.orbit-visual').first();
  await orbit.scrollIntoViewIfNeeded();
  await expect(orbit).toHaveAttribute('data-renderer', 'three', { timeout: 15000 });
  await expect(orbit.locator('canvas')).toBeVisible();
  const tokens = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return ['--midnight', '--graphite', '--sandstone', '--signature-red'].map((token) =>
      style.getPropertyValue(token).trim().toUpperCase(),
    );
  });
  expect(tokens).toEqual(['#0D1A2B', '#5A5F66', '#D8CFC4', '#C12129']);
  const box = (await orbit.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.6);
  await expect(orbit).toHaveAttribute('data-motion', 'idle');
  await orbit
    .locator('canvas')
    .evaluate((canvas) =>
      canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })),
    );
  await expect(orbit).toHaveAttribute('data-renderer', 'fallback');
  await expect(orbit.locator('.orbit-sphere')).toBeVisible();
});

test('reduced motion keeps the Three.js scene static and interface usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/start');
  const orbit = page.locator('.orbit-visual').first();
  await orbit.scrollIntoViewIfNeeded();
  await expect(orbit).toHaveAttribute('data-renderer', 'three', { timeout: 15000 });
  await expect(orbit).toHaveAttribute('data-motion', 'reduced');
  await orbit.hover();
  await expect(orbit).toHaveAttribute('data-motion', 'reduced');

  await page.goto('/');
  await page
    .locator('.canonical-ctas')
    .getByRole('link', { name: 'See How It Works', exact: true })
    .first()
    .click();
  await expect(page).toHaveURL('/how-it-works');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
