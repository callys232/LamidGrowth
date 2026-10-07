import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
const routes = JSON.parse(readFileSync('src/content/page-manifest.json', 'utf8')).map((e) => e.route)
  .filter((r) => r !== '/' && !r.includes('[') && !/^\/(os|login|signup|forgot|reset|verify|onboarding|start|demo)/.test(r));
const b = await chromium.launch(); const bad = []; let folds = 0, before = 0, after = 0;
for (const w of [1440, 390]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce' });
  p.on('pageerror', (e) => bad.push(`${w} ${p.url()} ${e.message}`));
  for (const r of routes) {
    await p.goto('http://127.0.0.1:3431' + r, { waitUntil: 'domcontentloaded' });
    await p.locator('h1').first().waitFor({ timeout: 30000 }).catch(() => bad.push(`${w} ${r} h1 not visible`));
    await p.waitForTimeout(200);
    const o = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (o > 0) bad.push(`${w} ${r} overflow ${o}`);
    if (w === 1440) {
      folds += await p.locator('.doc-more-toggle,.clamp-toggle,.list-toggle,.flow-accordion-trigger,.content-hero-more-toggle').count();
      // every toggle opens without error
      for (const t of await p.locator(':is(.doc-more-toggle,.clamp-toggle,.list-toggle,.flow-accordion-trigger):not(.doc-more:not(.is-open) *)').all()) { await t.click(); if (await t.getAttribute('aria-expanded') !== 'true') bad.push(`${r} toggle did not open`); }
    }
  }
}
console.log('toggles on desktop:', folds); console.log(bad.join('\n') || 'no problems'); await b.close();
