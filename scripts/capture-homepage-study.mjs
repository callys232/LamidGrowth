import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const dir = 'artifacts/homepage-study';
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  for (const [name, url] of [
    ['lamid-before', 'http://127.0.0.1:3107'],
    ['hubspot', 'https://www.hubspot.com/'],
    ['servicenow', 'https://www.servicenow.com/'],
  ]) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: 'reduce',
    });
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `${dir}/${name}.png`, fullPage: false, timeout: 20000 });
      if (name.startsWith('lamid'))
        await page.screenshot({ path: `${dir}/${name}-full.png`, fullPage: true });
      writeFileSync(
        `${dir}/${name}.json`,
        JSON.stringify(
          await page.evaluate(() => ({
            title: document.title,
            headings: [...document.querySelectorAll('h1,h2')].map((e) => e.textContent?.trim()),
            hero: document.querySelector('h1')
              ? {
                  font: getComputedStyle(document.querySelector('h1')).fontFamily,
                  size: getComputedStyle(document.querySelector('h1')).fontSize,
                }
              : null,
          })),
          null,
          2,
        ),
      );
      console.log(`Captured ${name}`);
    } catch (error) {
      console.log(`${name}: ${error.message}`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
