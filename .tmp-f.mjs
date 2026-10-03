import { chromium } from '@playwright/test';
const [S, ...routes] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
for (const r of routes) {
  await p.goto('http://127.0.0.1:3431/' + r, { waitUntil: 'domcontentloaded' });
  await p.locator('.flow-section').first().waitFor({ timeout: 30000 });
  await p.waitForTimeout(600);
  console.log(r, await p.evaluate(() => ({ toggles: document.querySelectorAll('.doc-more-toggle,.clamp-toggle,.list-toggle,.flow-accordion-trigger').length, h: document.documentElement.scrollHeight })));
  await p.screenshot({ path: `${S}/f_${r.replaceAll('/', '_')}.png`, fullPage: true });
}
await b.close();
