import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { readProductPages } from './lib/page-content.mjs';

const authRoutes = [
  '/login',
  '/signup',
  '/verify',
  '/forgot-password',
  '/reset-password',
  '/onboarding',
];
const pages = readProductPages().filter(
  (page) => !page.route.startsWith('/os') && !authRoutes.includes(page.route),
);
const output = 'artifacts/public-page-render-audit.json';
const normalize = (text) => text.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
const start = Number(process.argv[2] || 0);
const end = Math.min(pages.length, Number(process.argv[3] || pages.length));
const routeFilter = process.argv[4]?.split(',');
const results = start || routeFilter ? JSON.parse(readFileSync(output, 'utf8')) : [];
const browser = await chromium.launch();
try {
  for (const source of pages
    .slice(start, end)
    .filter((page) => !routeFilter || routeFilter.includes(page.route))) {
    const page = await browser.newPage();
    page.setDefaultTimeout(8000);
    const result = { route: source.route, missing: [] };
    try {
      await page.goto('http://127.0.0.1:3100' + source.route, { waitUntil: 'domcontentloaded' });
      await page.locator('main').waitFor();
      const seen = new Set();
      let text = '';
      const collect = async () => {
        const value = await page.locator('main').evaluate((element) => ({
          ids: [...element.querySelectorAll('[data-source-paragraph]')].map((node) =>
            Number(node.getAttribute('data-source-paragraph')),
          ),
          text: element.textContent,
        }));
        value.ids.forEach((id) => seen.add(id));
        text += ' ' + value.text;
      };
      await collect();
      const toggles = page.locator(
        '.flow-longform-trigger,.content-hero-more-toggle,.copy-line-more-toggle,.list-toggle,.doc-more-toggle',
      );
      for (let index = 0; index < (await toggles.count()); index++) {
        await toggles.nth(index).evaluate((element) => element.click());
        await page.waitForTimeout(30);
        await collect();
      }
      const contexts = page.locator('.home-context-selector button');
      for (let index = 0; index < (await contexts.count()); index++) {
        await contexts.nth(index).evaluate((element) => element.click());
        await page.waitForTimeout(30);
        await collect();
      }
      const expected = [
        ...source.hero.paragraphs,
        ...source.sections.flatMap((section) => section.paragraphs),
      ].filter((line) => !/^(CTA:|Links?:)/.test(line.text));
      const rendered = normalize(text);
      const movedLabels = [
        "Start With What You're Trying to Achieve",
        'Intelligence That Stays Current With the Work',
        'See LAMID ONE in Your Context',
      ];
      const relocated =
        source.route === '/'
          ? source.sections
              .filter((section) => movedLabels.includes(section.label))
              .flatMap((section) => section.paragraphs)
          : [];
      result.relocatedToAbout = relocated.map((line) => line.sourceParagraph);
      result.missing = expected.filter(
        (line) =>
          !relocated.some((moved) => moved.sourceParagraph === line.sourceParagraph) &&
          !seen.has(line.sourceParagraph) &&
          !rendered.includes(normalize(line.text)),
      );
      result.horizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      );
    } catch (error) {
      result.error = error.message;
    }
    const existing = results.findIndex((item) => item.route === result.route);
    if (existing >= 0) results[existing] = result;
    else results.push(result);
    writeFileSync(output, JSON.stringify(results, null, 2) + '\n');
    console.log(
      `${result.route}: ${result.error ? 'ERROR' : result.missing.length + ' unmatched paragraphs'}`,
    );
    await page.close();
  }
} finally {
  await browser.close();
}
