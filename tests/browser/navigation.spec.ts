import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('mega menus expose options on hover and support keyboard navigation', async ({ page }) => {
  await page.goto('/');
  const product = page.getByRole('button', { name: 'Product', exact: true });
  // A dropdown never opens on a bare hover — a click arms hover-switching between tabs first.
  await product.hover();
  await expect(page.getByRole('region', { name: 'Product', exact: true })).toHaveCount(0);
  await product.click();
  const panel = page.getByRole('region', { name: 'Product', exact: true });
  await expect(panel.getByRole('link')).toHaveCount(6);
  expect((await panel.boundingBox())!.width).toBeGreaterThan(1000);
  await panel.getByRole('link', { name: /^Organizations/ }).hover();
  await expect(product).toHaveAttribute('aria-expanded', 'true');
  // Now that a tab has been clicked, hovering other tabs switches between them.
  await page.getByRole('button', { name: 'Solutions', exact: true }).hover();
  await expect(
    page.getByRole('region', { name: 'Solutions', exact: true }).getByRole('link'),
  ).toHaveCount(14);
  await page.getByRole('button', { name: 'Experts', exact: true }).hover();
  // All five Experts entries link to the live consolidated /experts page now — none are
  // "planned, not yet available" placeholders anymore. Each jumps to its own band on that page
  // rather than the bare /experts URL (see PublicHeader.tsx / expertGroupSlug).
  await expect(page.locator('.mega-planned')).toHaveCount(0);
  const expertsLinks = page.getByRole('region', { name: 'Experts', exact: true }).getByRole('link');
  await expect(expertsLinks).toHaveCount(5);
  const expertAnchors = [
    '/experts#finding-engaging-expertise',
    '/experts#expert-matching',
    '/experts#verification',
    '/experts#capability-strategy',
    '/experts#become-an-expert',
  ];
  // Each anchor target's existence is verified on /experts itself, in expert-network.spec.ts.
  const hrefs = await expertsLinks.evaluateAll((links) =>
    links.map((link) => link.getAttribute('href')),
  );
  expect(hrefs).toEqual(expertAnchors);
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
  // Escape disarms hover-switching too, so re-opening here needs another click.
  await product.click();
  await expect(page.locator('.mega-panel')).toHaveCount(1);
  await page.mouse.move(5, 850);
  await expect(page.locator('.mega-panel')).toHaveCount(0);
});
