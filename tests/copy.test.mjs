import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadPageManifest, readProductPages } from '../scripts/lib/page-content.mjs';
test('product-owned pages preserve every original paragraph without clipping or prefix filtering', () => {
  const source = JSON.parse(readFileSync('document-study/pithy-v1.4-source.json', 'utf8'));
  const lines = source.paragraphs;
  // /experts is a later addition (consolidating the five Expert Network pages from the v1.8
  // pithy update) and has no corresponding block in the frozen v1.4 source doc, so it's excluded
  // from this verbatim-against-source check but still covered by the route/manifest test below.
  const pages = readProductPages().filter((page) => page.route !== '/experts');
  assert.equal(pages.length, 98);
  for (const [index, page] of pages.entries()) {
    const start = page.source_paragraph - 1;
    const end = pages[index + 1] ? pages[index + 1].source_paragraph - 1 : 1851;
    const block = lines.slice(start, end);
    const expected = block
      .slice(block.findIndex((p) => p.text === 'PRIMARY MESSAGE') + 1)
      .filter((p) => p.text && !/^\u2014+$/.test(p.text) && !p.text.startsWith('Publication note:'))
      .map(({ text, sourceParagraph }) => ({ text, sourceParagraph }));
    // Pages may carry later additive content (e.g. the v1.8 pithy update appended new trailing
    // sections to several pages) that has no counterpart in this frozen v1.4 source — so the
    // guarantee this test enforces is "every original paragraph survives, in order," i.e. the
    // source block must appear as a subsequence of the page's paragraphs, not an exact match.
    const actual = [page.hero, ...page.sections].flatMap((b) => b.paragraphs);
    let cursor = 0;
    for (const line of expected) {
      while (cursor < actual.length && !(actual[cursor].text === line.text && actual[cursor].sourceParagraph === line.sourceParagraph))
        cursor += 1;
      assert.ok(cursor < actual.length, `${page.route}: missing original paragraph ${JSON.stringify(line)}`);
      cursor += 1;
    }
    assert.equal(page.seo_title, block.find((p) => p.text.startsWith('SEO: ')).text.slice(5));
    assert.equal(
      page.meta_description,
      block.find((p) => p.text.startsWith('Meta: ')).text.slice(6),
    );
  }
});

test('every document route resolves to a unique named product page and matching content', () => {
  const manifest = loadPageManifest();
  const original = JSON.parse(readFileSync('src/content/routes.json', 'utf8'));
  assert.deepEqual(
    manifest.map((entry) => entry.route),
    original.map((entry) => entry.route),
  );
  assert.equal(new Set(manifest.map((entry) => entry.component)).size, manifest.length);
  for (const entry of manifest) {
    const page = JSON.parse(readFileSync(entry.content, 'utf8'));
    assert.equal(page.route, entry.route);
    assert.ok(entry.component.startsWith(`src/products/${entry.product}/pages/`));
    assert.ok(readFileSync(entry.component, 'utf8').includes(`function ${entry.exportName}(`));
  }
});
