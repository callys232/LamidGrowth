import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('mega menus expose options on hover and support keyboard navigation', async ({ page }) => {
  await page.goto('/');
  const product = page.getByRole('button', { name: 'Product', exact: true });
  await product.hover();
  const panel = page.getByRole('region', { name: 'Product', exact: true });
  await expect(panel.getByRole('link')).toHaveCount(6);
  expect((await panel.boundingBox())!.width).toBeGreaterThan(1000);
  await panel.getByRole('link', { name: /^Organizations/ }).hover();
  await expect(product).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('button', { name: 'Solutions', exact: true }).hover();
  await expect(
    page.getByRole('region', { name: 'Solutions', exact: true }).getByRole('link'),
  ).toHaveCount(14);
  await page.getByRole('button', { name: 'Experts', exact: true }).hover();
  await expect(page.locator('.mega-planned')).toHaveCount(5);
  await page.getByRole('button', { name: 'Resources', exact: true }).hover();
  await expect(
    page.getByRole('region', { name: 'Resources', exact: true }).getByRole('link'),
  ).toHaveCount(12);
  await page.waitForFunction(
    () => Number(getComputedStyle(document.querySelector('.mega-panel')!).opacity) === 1,
  );
  const scan = await new AxeBuilder({ page })
    .include('.public-header')
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(scan.violations).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(page.locator('.mega-panel')).toHaveCount(0);
  await product.focus();
  await page.keyboard.press('ArrowDown');
  await expect(panel.getByRole('link', { name: /^Overview/ })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(product).toBeFocused();
  await product.hover();
  await page.mouse.move(5, 850);
  await expect(page.locator('.mega-panel')).toHaveCount(0);
});
