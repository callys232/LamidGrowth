import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
mkdirSync('artifacts', { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});
const settle = () =>
  page.waitForFunction(() =>
    [...document.querySelectorAll('.page-heading, .hero-copy')].every(
      (element) => Number(getComputedStyle(element).opacity) > 0.999,
    ),
  );
await page.goto('http://127.0.0.1:3000/');
await page.evaluate(() => document.fonts.ready);
await page.locator('.orbit-visual[data-renderer]').first().waitFor();
await settle();
await page.screenshot({ path: 'artifacts/home-desktop.png', fullPage: true });
await page.getByRole('button', { name: 'Explore the workspace', exact: true }).click();
await page.waitForURL('**/os');
await page.getByRole('heading', { level: 1 }).waitFor();
await page.evaluate(() => document.fonts.ready);
await settle();
await page.screenshot({ path: 'artifacts/workspace-desktop.png', fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await page.reload();
await page.getByRole('heading', { level: 1 }).waitFor();
await page.evaluate(() => document.fonts.ready);
await settle();
await page.screenshot({ path: 'artifacts/workspace-mobile.png', fullPage: true });
await page.goto('http://127.0.0.1:3000/');
await page.evaluate(() => document.fonts.ready);
await page.locator('.orbit-visual[data-renderer]').first().waitFor();
await settle();
await page.screenshot({ path: 'artifacts/home-mobile.png', fullPage: true });
await browser.close();
console.log('Saved four desktop and mobile screenshots to artifacts/.');
