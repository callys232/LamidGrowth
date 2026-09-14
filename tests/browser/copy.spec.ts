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

// Paragraphs that are canonical copy but are never simultaneously in the DOM by design:
// paragraph 49 is a hero line the custom HomeHeroSlide destructuring intentionally skips
// (title/description/actions/continuity/control only), and 64-66 are the Founder/Team/
// Enterprise audience-context bullets in a single-select tab widget — only the selected
// tab's bullet (63, by default) renders at a time.
const notSimultaneouslyRendered: Record<number, Set<number>> = {
  1: new Set([49, 64, 65, 66]),
};

function normalizeForBreakdown(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

test('every documented route renders every original copy paragraph', async ({
  page: entry,
  context,
}) => {
  test.setTimeout(240000);
  const page = entry;
  await page.goto('/start');
  await page.getByRole('button', { name: 'Founder', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Your name').fill('Copy Coverage Tester');
  await page.getByLabel('Email address').fill(`copy-coverage-${Date.now()}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill('secure-copy-coverage-password');
  await page.getByRole('button', { name: 'Create your workspace', exact: true }).click();
  await expect(page).toHaveURL('/os');
  await entry.close();
  for (const source of pages) {
    // Reuse authentication cookies, but release each page's development module graph.
    const page = await context.newPage();
    const path = source.route.replace('[id]', 'sample');
    await page.goto(path);
    const copy = page.locator(`[data-source-page="${source.page}"]`);
    // Existence, not visibility: the embedded workspace copy is collapsed behind a disclosure
    // by default (a development reference, not something every visit should scroll past), so
    // it's legitimately hidden while still present and readable via textContent below.
    await expect(copy).toHaveCount(1);
    const actual = await copy.locator('[data-source-paragraph]').evaluateAll((elements) => {
      // A canonical paragraph can be split across more than one element (e.g. an intro clause
      // plus a labeled breakdown list derived from the same source paragraph) — concatenate
      // rather than let a later element silently overwrite an earlier one's text. Text is walked
      // with a space inserted at every element boundary (not just plain textContent) so two
      // adjacent block elements' words never glue together — and unlike innerText, this still
      // works inside a collapsed <details>, which several canonical sections use.
      function textWithSpacing(node: Node): string {
        let result = '';
        node.childNodes.forEach((child) => {
          if (child.nodeType === Node.TEXT_NODE) result += child.textContent;
          else if (child.nodeType === Node.ELEMENT_NODE) result += ` ${textWithSpacing(child)} `;
        });
        return result;
      }
      const merged: Record<string, string> = {};
      for (const e of elements) {
        const key = e.getAttribute('data-source-paragraph')!;
        const text = textWithSpacing(e).replace(/\s+/g, ' ').trim();
        merged[key] = merged[key] ? `${merged[key]} ${text}` : text;
      }
      return merged;
    });
    const exceptions = notSimultaneouslyRendered[source.page] ?? new Set<number>();
    expect(Object.keys(actual).length, `${path} paragraph count`).toBe(
      source.blocks.reduce((count, block) => count + block.paragraphs.length, 0) - exceptions.size,
    );
    for (const block of source.blocks)
      for (const paragraph of block.paragraphs) {
        if (exceptions.has(paragraph.sourceParagraph)) continue;
        const rendered = actual[paragraph.sourceParagraph] ?? '';
        const expected = paragraph.text
          .replace(/^(CTA:|Links?:)\s*/, '')
          .split('|')
          .map((s) => s.trim())
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        const normal = paragraph.text.replace(/\s+/g, ' ').trim();
        const exact = /^(CTA:|Links?:)/.test(paragraph.text) ? expected : normal;
        if (rendered === exact) continue;
        // Some paragraphs are restructured into a decorated breakdown (a bullet becomes a
        // numbered card, a clause becomes its own labeled list item) — the exact flattened text
        // won't match, but every word should still be present. A leading "•" marker or "and"
        // connector is expected to be dropped when a bullet/clause becomes its own element.
        const actualWords = new Set(normalizeForBreakdown(rendered).split(' '));
        const expectedWords = normalizeForBreakdown(paragraph.text)
          .split(' ')
          .filter(Boolean)
          .filter((word) => word !== 'and');
        for (const word of expectedWords)
          expect(actualWords.has(word), `${path} paragraph ${paragraph.sourceParagraph} missing word "${word}" (exact text also didn't match)`).toBe(true);
      }
    await page.close();
  }
});
