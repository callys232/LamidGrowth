# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation.spec.ts >> mega menus expose options on hover and support keyboard navigation
- Location: tests\browser\navigation.spec.ts:4:1

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  getByRole('region', { name: 'Experts', exact: true }).getByRole('link').first()
Expected: "/experts"
Received: "/experts#finding-engaging-expertise"
Timeout:  5000ms

Call log:
  - Expect "toHaveAttribute" getByRole('region', { name: 'Experts', exact: true }).getByRole('link').first() with timeout 5000ms
  - waiting for getByRole('region', { name: 'Experts', exact: true }).getByRole('link').first()
    14 × locator resolved to <a data-discover="true" href="/experts#finding-engaging-expertise">…</a>
       - unexpected value "/experts#finding-engaging-expertise"

```

```yaml
- link "Expert Network Discover specialist support.":
  - /url: /experts#finding-engaging-expertise
  - text: Expert Network
  - img
  - text: Discover specialist support.
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import AxeBuilder from '@axe-core/playwright';
  3  | 
  4  | test('mega menus expose options on hover and support keyboard navigation', async ({ page }) => {
  5  |   await page.goto('/');
  6  |   const product = page.getByRole('button', { name: 'Product', exact: true });
  7  |   // A dropdown never opens on a bare hover — a click arms hover-switching between tabs first.
  8  |   await product.hover();
  9  |   await expect(page.getByRole('region', { name: 'Product', exact: true })).toHaveCount(0);
  10 |   await product.click();
  11 |   const panel = page.getByRole('region', { name: 'Product', exact: true });
  12 |   await expect(panel.getByRole('link')).toHaveCount(6);
  13 |   expect((await panel.boundingBox())!.width).toBeGreaterThan(1000);
  14 |   await panel.getByRole('link', { name: /^Organizations/ }).hover();
  15 |   await expect(product).toHaveAttribute('aria-expanded', 'true');
  16 |   // Now that a tab has been clicked, hovering other tabs switches between them.
  17 |   await page.getByRole('button', { name: 'Solutions', exact: true }).hover();
  18 |   await expect(
  19 |     page.getByRole('region', { name: 'Solutions', exact: true }).getByRole('link'),
  20 |   ).toHaveCount(14);
  21 |   await page.getByRole('button', { name: 'Experts', exact: true }).hover();
  22 |   // All five Experts entries link to the live consolidated /experts page now — none are
  23 |   // "planned, not yet available" placeholders anymore.
  24 |   await expect(page.locator('.mega-planned')).toHaveCount(0);
  25 |   const expertsLinks = page.getByRole('region', { name: 'Experts', exact: true }).getByRole('link');
  26 |   await expect(expertsLinks).toHaveCount(5);
> 27 |   for (const link of await expertsLinks.all()) await expect(link).toHaveAttribute('href', '/experts');
     |                                                                   ^ Error: expect(locator).toHaveAttribute(expected) failed
  28 |   await page.getByRole('button', { name: 'Resources', exact: true }).hover();
  29 |   await expect(
  30 |     page.getByRole('region', { name: 'Resources', exact: true }).getByRole('link'),
  31 |   ).toHaveCount(12);
  32 |   await page.waitForFunction(
  33 |     () => Number(getComputedStyle(document.querySelector('.mega-panel')!).opacity) === 1,
  34 |   );
  35 |   const scan = await new AxeBuilder({ page })
  36 |     .include('.public-header')
  37 |     .withTags(['wcag2a', 'wcag2aa'])
  38 |     .analyze();
  39 |   expect(scan.violations).toEqual([]);
  40 |   await page.keyboard.press('Escape');
  41 |   await expect(page.locator('.mega-panel')).toHaveCount(0);
  42 |   await product.focus();
  43 |   await page.keyboard.press('ArrowDown');
  44 |   await expect(panel.getByRole('link', { name: /^Overview/ })).toBeFocused();
  45 |   await page.keyboard.press('Escape');
  46 |   await expect(product).toBeFocused();
  47 |   // Escape disarms hover-switching too, so re-opening here needs another click.
  48 |   await product.click();
  49 |   await expect(page.locator('.mega-panel')).toHaveCount(1);
  50 |   await page.mouse.move(5, 850);
  51 |   await expect(page.locator('.mega-panel')).toHaveCount(0);
  52 | });
  53 | 
```