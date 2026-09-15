import { test, expect } from '@playwright/test';

test('list feedback follows scrolling and supports dynamically loaded items', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const item = page.locator('.home-expansion-path li').first();
  await expect(item).toHaveAttribute('data-scroll-feedback', 'true');
  await item.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  await expect(item).toHaveAttribute('data-scroll-active', 'true');
  await expect(item).not.toHaveCSS('background-image', 'none');
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(item).toHaveAttribute('data-scroll-active', 'false');
  await expect(page.locator('nav [data-scroll-feedback]')).toHaveCount(0);
  await page.evaluate(() => {
    const list = document.createElement('ul');
    list.innerHTML = '<li id="loaded-list-item">Newly loaded content</li>';
    document.querySelector('main')!.append(list);
  });
  const loaded = page.locator('#loaded-list-item');
  await expect(loaded).toHaveAttribute('data-scroll-feedback', 'true');
  await expect(loaded).toHaveCSS('transition-duration', '0s');
  await page.locator('.header-actions a[href="/start"]').click();
  await expect(page).toHaveURL('/start');
  await page.locator('.public-header .brand').click();
  await expect(page.locator('.home-expansion-path li').first()).toHaveAttribute(
    'data-scroll-feedback',
    'true',
  );
});
