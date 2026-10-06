import fs from 'node:fs';
import { chromium } from '@playwright/test';
const output = 'audit-results/ui-heroes-2026-10-06';
const routes = [
  '/',
  '/product',
  '/product/experience',
  '/product/intelligence',
  '/how-it-works',
  '/how-it-works/consistency',
  '/who-its-for/founders',
  '/who-its-for/smes',
  '/who-its-for/enterprises',
  '/who-its-for/institutions',
  '/resources',
  '/research',
  '/developers/webhooks',
  '/about',
  '/responsible-ai',
];
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ reducedMotion: 'reduce', colorScheme: 'light' });
await page.route('**/api/**', (route) =>
  route.fulfill({ status: 503, json: { error: 'Isolated layout preview' } }),
);
await page.goto('http://127.0.0.1:5183/', { waitUntil: 'networkidle' });
await page.addStyleTag({
  content: '* { transition: none !important; animation: none !important; }',
});
const results = [];
for (const width of [390, 1440]) {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
  for (const route of routes) {
    await page.evaluate((route) => {
      history.pushState({}, '', route);
      dispatchEvent(new PopStateEvent('popstate'));
    }, route);
    await page.waitForTimeout(180);
    await page.evaluate(() => document.fonts.ready);
    const result = await page.evaluate(() => {
      const h = document.querySelector('h1');
      const original = h.textContent.replace(/\s+/g, ' ').trim();
      const hero = h.closest('section');
      const mobile = innerWidth < 600;
      if (hero.classList.contains('content-hero')) {
        hero.style.setProperty(
          'grid-template-columns',
          mobile ? 'minmax(0, 1fr)' : 'minmax(0, 2fr) minmax(0, 1fr)',
          'important',
        );
        hero.style.setProperty('gap', mobile ? '24px' : '32px', 'important');
        hero.style.setProperty('padding-inline', mobile ? '20px' : '64px', 'important');
        hero.style.setProperty('padding-block', mobile ? '48px' : '72px', 'important');
        if (mobile && hero.closest('[data-design]')?.dataset.design === 'bento')
          hero.style.setProperty('padding-bottom', '300px', 'important');
        const first = hero.firstElementChild;
        first.style.setProperty('max-width', 'none', 'important');
        first.style.setProperty('width', '100%', 'important');
        // Centered layouts without a visible secondary column keep their full width.
        if (
          ['cards', 'editorial', 'gallery'].includes(hero.closest('[data-design]')?.dataset.design)
        )
          hero.style.setProperty('grid-template-columns', 'minmax(0, 1fr)', 'important');
      }
      h.style.setProperty('max-width', 'none', 'important');
      h.style.setProperty('width', '100%', 'important');
      h.style.setProperty('line-height', '1.1', 'important');
      h.style.setProperty('letter-spacing', '-0.025em', 'important');
      h.style.setProperty('text-wrap', 'balance', 'important');
      const style = getComputedStyle(h);
      const canvas = document.createElement('canvas').getContext('2d');
      const titleWidth = h.getBoundingClientRect().width;
      const floor = mobile ? 30 : 44;
      const ceiling = mobile ? 36 : 64;
      const candidates = [...original.matchAll(/\s+/g)].map((m) => {
        const a = original.slice(0, m.index),
          b = original.slice(m.index).trim();
        canvas.font = `${style.fontWeight} ${ceiling}px ${style.fontFamily}`;
        const required = Math.max(canvas.measureText(a).width, canvas.measureText(b).width);
        return {
          a,
          b,
          size: Math.min(ceiling, (titleWidth / required) * ceiling * 0.96),
          balance: Math.abs(a.length - b.length),
          punctuation: /[.,;:]$/.test(a),
        };
      });
      const fitting = candidates
        .filter((c) => c.size >= floor)
        .sort((a, b) => b.punctuation - a.punctuation || b.size - a.size);
      h.replaceChildren();
      if (fitting.length) {
        const chosen = fitting[0];
        h.style.setProperty('font-size', `${chosen.size}px`, 'important');
        const first = document.createElement('span');
        first.textContent = chosen.a;
        first.style.display = 'block';
        first.style.whiteSpace = 'nowrap';
        const second = document.createElement('span');
        second.textContent = chosen.b;
        second.style.display = 'block';
        second.style.whiteSpace = 'nowrap';
        h.append(first, document.createTextNode(' '), second);
      } else {
        h.textContent = original;
        h.style.setProperty('font-size', `${floor}px`, 'important');
      }
      const tops = [];
      const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode())
        for (const m of n.textContent.matchAll(/\S+/g)) {
          const r = document.createRange();
          r.setStart(n, m.index);
          r.setEnd(n, m.index + m[0].length);
          for (const box of r.getClientRects())
            if (!tops.some((y) => Math.abs(y - box.y) < 8)) tops.push(box.y);
        }
      const now = h.textContent.replace(/\s+/g, ' ').trim();
      return {
        original,
        title: now,
        contentUnchanged: now === original,
        lineCount: tops.length,
        fontSize: getComputedStyle(h).fontSize,
        width: titleWidth,
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
      };
    });
    const file = `screenshots/preview${route.replaceAll('/', '_')}-${width}.png`;
    await page.screenshot({ path: `${output}/${file}` });
    results.push({ route, viewport: width, ...result, screenshot: file });
  }
}
await browser.close();
fs.writeFileSync(`${output}/previews.json`, JSON.stringify(results, null, 2));
console.log(
  `Saved ${results.length} presentation-only previews; exact headline content preserved: ${results.every((r) => r.contentUnchanged)}.`,
);
