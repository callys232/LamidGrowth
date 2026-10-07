import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const output = 'audit-results/ui-heroes-2026-10-06';
fs.mkdirSync(path.join(output, 'screenshots'), { recursive: true });
const manifest = JSON.parse(fs.readFileSync('src/content/page-manifest.json', 'utf8'));
const app = fs.readFileSync('src/App.tsx', 'utf8');
const split = app.indexOf('<Route path="/os"');
const extra = [...app.slice(split).matchAll(/<Route path="([^"*]+)"/g)].map((match) =>
  match[1].startsWith('/') ? match[1] : `/os/${match[1]}`,
);
const routes = [
  ...new Set([
    ...manifest.map((p) => p.route.replace('[id]', 'audit-workflow')),
    ...extra.map((r) =>
      r.replace(':id', r.includes('projects') ? 'audit-project' : 'audit-workflow'),
    ),
  ]),
];
const selected = process.env.AUDIT_ROUTES?.split(',');
const widths = (process.env.AUDIT_WIDTHS || '360,390,768,1024,1440').split(',').map(Number);
const state = {
  user: { id: 'audit-user', name: 'Layout Audit', email: null, demo: true },
  workspace: {
    id: 'audit-workspace',
    name: 'Layout audit fixture',
    context: 'Enterprise',
    tier: 'enterprise',
    member_limit: 200,
    role: 'owner',
  },
  permissions: ['work:read', 'work:write', 'members:manage', 'workspace:manage'],
  workspaces: [
    {
      id: 'audit-workspace',
      name: 'Layout audit fixture',
      context: 'Enterprise',
      tier: 'enterprise',
      member_limit: 200,
      role: 'owner',
      status: 'active',
    },
  ],
  objectives: [],
  actions: [],
  reviews: [],
  audit: [],
};
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ reducedMotion: 'reduce', colorScheme: 'light' });
await context.addInitScript(() => {
  localStorage.setItem('lamid-theme', 'light');
  sessionStorage.setItem('lamid-companion-offered', 'true');
});
await context.route('**/api/**', async (route) => {
  const endpoint = new URL(route.request().url()).pathname.slice(4);
  if (endpoint === '/state') return route.fulfill({ json: state });
  if (
    [
      '/activity',
      '/notifications',
      '/progress',
      '/workflows',
      '/opportunities',
      '/kpis',
      '/experiments',
      '/connectors',
      '/expert-teams/mine',
      '/admin/members',
      '/companion/agents',
      '/projects',
      '/handoffs/mine',
      '/ai/reviews',
      '/talent/credentials/mine',
      '/talent/invitations/mine',
      '/learning/paths',
      '/learning/enrollments/mine',
      '/learning/compliance/mine',
    ].includes(endpoint)
  )
    return route.fulfill({ json: [] });
  if (endpoint === '/knowledge') return route.fulfill({ json: { items: [], total: 0 } });
  if (endpoint === '/talent/profile/mine') return route.fulfill({ json: null });
  if (endpoint === '/points') return route.fulfill({ json: { balance: 0 } });
  return route.fulfill({
    status: 503,
    json: { error: 'Layout audit: domain API is not connected in this fixture.' },
  });
});
const results = fs.existsSync(path.join(output, 'measurements.json'))
  ? JSON.parse(fs.readFileSync(path.join(output, 'measurements.json'), 'utf8'))
  : [];
for (const width of widths) {
  const page = await context.newPage();
  await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
  await page.goto('http://127.0.0.1:5183/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  let errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const route of routes.filter((r) => !selected || selected.includes(r))) {
    if (
      results.some(
        (item) =>
          item.route === route &&
          item.width === width &&
          (item.title || item.primaryHeadingChecked),
      )
    )
      continue;
    errors = [];
    try {
      await page.evaluate((route) => {
        history.pushState({}, '', route);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }, route);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(180);
      const metrics = await page.evaluate(() => {
        const visible = (el) =>
          Boolean(el.getClientRects().length) && getComputedStyle(el).visibility !== 'hidden';
        const h1 =
          [...document.querySelectorAll('h1')].find(visible) ||
          [...document.querySelectorAll('main h2')].find(visible);
        const data = {
          primaryHeadingChecked: true,
          headingTag: h1?.tagName,
          headingCount: [...document.querySelectorAll('h1')].filter(visible).length,
          pageOverflow: document.documentElement.scrollWidth - innerWidth,
          design: document.querySelector('[data-design]')?.getAttribute('data-design'),
          fixtureErrors: [...document.querySelectorAll('[role="alert"], .error-message')]
            .filter(visible)
            .map((el) => el.textContent),
        };
        if (!h1) return data;
        const words = [];
        const walker = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          for (const match of node.textContent.matchAll(/\S+/g)) {
            const range = document.createRange();
            range.setStart(node, match.index);
            range.setEnd(node, match.index + match[0].length);
            for (const rect of range.getClientRects())
              if (rect.width && rect.height)
                words.push({
                  text: match[0],
                  x: rect.x,
                  y: rect.y,
                  width: rect.width,
                  height: rect.height,
                });
          }
        }
        const lines = [];
        words.forEach((word) => {
          const line = lines.find((l) => Math.abs(l.y - word.y) < 10);
          if (line) {
            line.text += ' ' + word.text;
            line.right = Math.max(line.right, word.x + word.width);
            line.left = Math.min(line.left, word.x);
          } else
            lines.push({ y: word.y, left: word.x, right: word.x + word.width, text: word.text });
        });
        const box = h1.getBoundingClientRect();
        const hero =
          h1.closest('section, .page-heading, .engine-hero, .expert-hero') || h1.parentElement;
        const hb = hero.getBoundingClientRect();
        const style = getComputedStyle(h1);
        const ctas = [...hero.querySelectorAll('a.button, button.button, .canonical-ctas a')]
          .filter(visible)
          .map((el) => ({
            text: el.textContent.trim(),
            top: el.getBoundingClientRect().top,
            bottom: el.getBoundingClientRect().bottom,
            width: el.getBoundingClientRect().width,
          }));
        const overflow = [...document.querySelectorAll('main *')]
          .filter(visible)
          .filter((el) => {
            const b = el.getBoundingClientRect();
            return b.width > 0 && (b.right > innerWidth + 2 || b.left < -2);
          })
          .slice(0, 8)
          .map((el) => ({ tag: el.tagName, class: String(el.className).slice(0, 100) }));
        return {
          ...data,
          title: h1.textContent.trim(),
          lines,
          lineCount: lines.length,
          heading: { x: box.x, y: box.y, width: box.width, height: box.height },
          fontSize: style.fontSize,
          fontFamily: style.fontFamily,
          hero: { class: hero.className, top: hb.top, height: hb.height },
          ctas,
          titleOverflow: lines.some((l) => l.right > innerWidth + 1 || l.left < -1),
          overflowElements: overflow,
        };
      });
      const item = {
        route,
        width,
        ...metrics,
        pageErrors: [...errors],
        mode: route.startsWith('/os')
          ? 'isolated empty workspace fixture; domain APIs may be unavailable'
          : 'public frontend',
      };
      if ([390, 1440].includes(width)) {
        item.screenshot = `screenshots/${route.replaceAll('/', '_') || 'home'}-${width}.png`;
        await page.screenshot({ path: path.join(output, item.screenshot) });
      }
      const existing = results.findIndex((row) => row.route === route && row.width === width);
      if (existing >= 0) results[existing] = item;
      else results.push(item);
    } catch (error) {
      results.push({ route, width, error: error.message, pageErrors: [...errors] });
    }
    if (results.length % 20 === 0)
      console.log(`Measured ${results.length} views; current ${width}px ${route}`);
    fs.writeFileSync(path.join(output, 'measurements.json'), JSON.stringify(results, null, 2));
  }
  await page.close();
}
await browser.close();
console.log(`Completed ${results.length} views across ${widths.length} viewport widths.`);
