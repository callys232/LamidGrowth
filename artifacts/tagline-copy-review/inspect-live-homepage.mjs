import fs from 'node:fs';
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('https://lamidgworth.vercel.app/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'artifacts/tagline-copy-review/original-live-homepage.png', fullPage: true });
  fs.writeFileSync('artifacts/tagline-copy-review/original-live-homepage.txt', await page.locator('body').innerText());
  const sections = await page.locator('main section').evaluateAll(elements => elements.map(e => ({ className: e.className, headings: [...e.querySelectorAll('h1,h2,h3')].map(h => h.textContent), copy: e.textContent })));
  fs.writeFileSync('artifacts/tagline-copy-review/original-live-homepage-sections.json', JSON.stringify(sections, null, 2));
  console.log(JSON.stringify({ url: page.url(), title: await page.title(), headings: await page.locator('h1,h2').allTextContents(), sections: sections.length }, null, 2));
} finally { await browser.close(); }
