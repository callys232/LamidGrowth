import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
// This visits 98 complete module graphs; retain targeted traces in the journey
// tests instead of duplicating every development module on every navigation.
test.use({ trace: 'off' });
const pages = JSON.parse(readFileSync('src/content/pages.json', 'utf8')) as {
  page: number;
  route: string;
  blocks: { paragraphs: { text: string; sourceParagraph: number }[] }[];
}[];

test('every documented route renders every original copy paragraph', async ({
  page: entry,
  context,
}) => {
  test.setTimeout(240000);
  const page = entry;
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore the workspace', exact: true }).click();
  await expect(page).toHaveURL('/os');
  await entry.close();
  for (const source of pages) {
    // Reuse authentication cookies, but release each page's development module graph.
    const page = await context.newPage();
    const path = source.route.replace('[id]', 'sample');
    await page.goto(path);
    const copy = page.locator(`[data-source-page="${source.page}"]`);
    await expect(copy).toBeVisible();
    const actual = await copy
      .locator('[data-source-paragraph]')
      .evaluateAll((elements) =>
        Object.fromEntries(
          elements.map((e) => [
            e.getAttribute('data-source-paragraph'),
            e.textContent?.replace(/\s+/g, ' ').trim(),
          ]),
        ),
      );
    expect(Object.keys(actual).length, `${path} paragraph count`).toBe(
      source.blocks.reduce((count, block) => count + block.paragraphs.length, 0),
    );
    for (const block of source.blocks)
      for (const paragraph of block.paragraphs) {
        const expected = paragraph.text
          .replace(/^(CTA:|Links?:)\s*/, '')
          .split('|')
          .map((s) => s.trim())
          .join('')
          .replace(/\s+/g, ' ')
          .trim();
        const normal = paragraph.text.replace(/\s+/g, ' ').trim();
        expect(
          actual[paragraph.sourceParagraph],
          `${path} paragraph ${paragraph.sourceParagraph}`,
        ).toBe(/^(CTA:|Links?:)/.test(paragraph.text) ? expected : normal);
      }
    await page.close();
  }
});
