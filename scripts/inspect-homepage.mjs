import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
mkdirSync('artifacts/homepage-study', { recursive: true });
try {
  const results = [];
  for (const [name, width, height] of [
    ['desktop', 1440, 1000],
    ['mobile', 390, 844],
    ['small-mobile', 320, 740],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:3107', { waitUntil: 'networkidle' });
    await page.screenshot({
      path: `artifacts/homepage-study/lamid-after-${name}.png`,
      fullPage: false,
    });
    if (name !== 'small-mobile')
      await page.screenshot({
        path: `artifacts/homepage-study/lamid-after-${name}-full.png`,
        fullPage: true,
      });
    const geometry = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      heading: document.querySelector('h1').getBoundingClientRect().toJSON(),
      primaryAction: document
        .querySelector('.home-premium-hero .canonical-ctas a')
        .getBoundingClientRect()
        .toJSON(),
      pageHeight: document.documentElement.scrollHeight,
    }));
    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    results.push({
      name,
      geometry,
      violations: scan.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
      })),
    });
    await context.close();
  }
  writeFileSync('artifacts/homepage-study/validation.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
