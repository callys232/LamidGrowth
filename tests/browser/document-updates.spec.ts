import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const update = JSON.parse(readFileSync('document-study/tagline-refinement-source.json', 'utf8'));
const pages = JSON.parse(readFileSync('src/content/pages.json', 'utf8'));

for (const route of update.routes as string[]) {
  test(`document copy renders completely: ${route}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(route);
    const source = pages.find((p: { route: string }) => p.route === route);
    const copy = page.locator(`[data-source-page="${source.page}"]`);
    await expect(copy).toHaveCount(1);
    const captured: Record<string, string> = {};
    async function captureHomepage() {
      const lines = await copy.locator('[data-source-paragraph]').evaluateAll((elements) => {
        const text = (node: Node): string =>
          [...node.childNodes]
            .map((child) =>
              child.nodeType === Node.TEXT_NODE ? child.textContent : ` ${text(child)} `,
            )
            .join('');
        return elements.map((element) => [
          element.getAttribute('data-source-paragraph')!,
          text(element),
        ]);
      });
      for (const [key, text] of lines) captured[key] = `${captured[key] ?? ''} ${text}`;
    }
    if (route === '/') {
      await captureHomepage();
      for (const name of ['Personal', 'Founder', 'Team', 'Enterprise']) {
        await page
          .getByRole('group', { name: 'Choose an audience context' })
          .getByRole('button', { name, exact: true })
          .click();
        await captureHomepage();
      }
    }
    for (const paragraph of [source.hero, ...source.sections].flatMap((s) => s.paragraphs)) {
      const expected = paragraph.text
        .replace(/^(CTA:|Links?:)\s*/, '')
        .split('|')
        .map((s: string) => s.trim())
        .join(' ');
      const actual =
        route === '/'
          ? (captured[String(paragraph.sourceParagraph)] ?? '')
          : (
              await copy
                .locator(`[data-source-paragraph="${paragraph.sourceParagraph}"]`)
                .allInnerTexts()
            ).join(' ');
      if (route === '/') {
        const words = (value: string) =>
          value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .trim()
            .split(/\s+/);
        const rendered = new Set(words(actual));
        for (const word of words(expected))
          expect(
            rendered.has(word),
            `${route}: document line ${paragraph.sourceParagraph}, missing ${word}`,
          ).toBeTruthy();
        continue;
      }
      expect(
        actual.replace(/\s+/g, ' ').trim(),
        `${route}: document line ${paragraph.sourceParagraph}`,
      ).toContain(expected.replace(/\s+/g, ' ').trim());
    }
    if (route === '/') {
      const footer = JSON.parse(
        readFileSync('src/products/website/pages/home/footer-copy.json', 'utf8'),
      );
      for (const line of footer)
        await expect(
          page.locator(`footer [data-source-paragraph="${line.sourceParagraph}"]`),
        ).toHaveText(line.text);
    }
    expect(errors).toEqual([]);
  });
}

test('restored homepage preserves the original layout and interactive sections', async ({
  page,
}) => {
  await page.goto('/');
  const original = JSON.parse(
    readFileSync('document-study/homepage-original-sections.json', 'utf8'),
  );
  const headings = await page.locator('.lamid-home > .home-section h2').allTextContents();
  expect(headings.slice(0, 7).map((text) => text.replace(/\s+/g, ' ').trim())).toEqual(
    original.map((section) => section.title),
  );
  await expect(page.locator('.home-companion-example')).toBeVisible();
  await expect(page.locator('.home-cycle')).toHaveCount(1);
  await page.locator('.home-permissions summary').click();
  await expect(page.locator('.home-permissions-lanes li')).toHaveCount(3);
  const choices = page.locator('.home-outcome-choices > button');
  for (let index = 0; index < 4; index++) {
    await choices.nth(index).click();
    await expect(choices.nth(index)).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.locator('.home-outcome-pane').nth(index).locator('.home-outcome-diagram'),
    ).toBeVisible();
  }
  await choices.first().click();
  await expect(page.locator('.home-rhythm-reviews details')).toHaveCount(4);
  await expect(page.locator('.home-expansion-path li')).toHaveCount(5);
  for (const section of await page.locator('.lamid-home > .home-section').all()) {
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(120);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: 'artifacts/tagline-copy-review/restored-homepage-desktop.png',
    fullPage: true,
  });
  await page
    .locator('.home-objective-section')
    .first()
    .screenshot({ path: 'artifacts/tagline-copy-review/restored-objective-section.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  const geometry = await page.evaluate(() => ({
    gap:
      document.querySelector('.homepage-video-hero')!.getBoundingClientRect().top -
      document.querySelector('.public-header')!.getBoundingClientRect().bottom,
    heroOverflow:
      document.querySelector('.homepage-video-hero')!.scrollWidth >
      document.querySelector('.homepage-video-hero')!.clientWidth,
  }));
  expect(geometry.gap).toBe(0);
  expect(geometry.heroOverflow).toBe(false);
  await expect(page.locator('.homepage-video-control')).toHaveCount(0);
  await expect(page.locator('.public-header img[src="/brand/lamid-logo.png"]')).toBeVisible();
  await page.screenshot({
    path: 'artifacts/tagline-copy-review/restored-homepage-mobile.png',
    fullPage: true,
  });
});
