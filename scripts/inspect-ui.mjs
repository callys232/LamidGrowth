import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync } from 'node:fs';
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
await page.goto('http://127.0.0.1:3000/');
await page.evaluate(() => document.fonts.ready);
console.log(
  'Overflow',
  JSON.stringify(
    await page.evaluate(() =>
      [...document.querySelectorAll('body *')]
        .filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
        .map((e) => ({
          element: e.tagName,
          class: e.className,
          width: e.getBoundingClientRect().width,
          right: e.getBoundingClientRect().right,
        }))
        .slice(0, 20),
    ),
  ),
);
const results = [];
for (const path of ['/', '/start', '/login', '/how-it-works', '/trust/governance']) {
  await page.goto(`http://127.0.0.1:3000${path}`);
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  results.push({
    path,
    issues: result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
  });
}
writeFileSync('artifacts/accessibility-review.json', JSON.stringify(results, null, 2));
console.log(
  JSON.stringify(
    results.map((r) => ({
      path: r.path,
      issues: r.issues.map((x) => ({
        id: x.id,
        count: x.nodes.length,
        targets: x.nodes.slice(0, 3).map((n) => n.target),
      })),
    })),
    null,
    2,
  ),
);
await browser.close();
