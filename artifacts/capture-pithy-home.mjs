import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    await page.goto('http://127.0.0.1:3107/');
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `artifacts/pithy-home-${width}.png`, fullPage: true });
    console.log(JSON.stringify({ width, overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), headings: await page.locator('main h1, main h2').allTextContents() }));
    await page.close();
  }
} finally { await browser.close(); }
