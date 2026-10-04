import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadPageManifest, readProductPages } from '../scripts/lib/page-content.mjs';
const refinement = JSON.parse(
  readFileSync('document-study/tagline-refinement-source.json', 'utf8'),
);
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
    // These page drafts were explicitly superseded by the tagline refinement document.
    // Their complete source fidelity is checked separately below.
    if (
      refinement.routes.includes(page.route) &&
      !(refinement.pithyRetained ?? []).includes(page.route)
    )
      continue;
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
      while (
        cursor < actual.length &&
        !(
          actual[cursor].text === line.text &&
          actual[cursor].sourceParagraph === line.sourceParagraph
        )
      )
        cursor += 1;
      assert.ok(
        cursor < actual.length,
        `${page.route}: missing original paragraph ${JSON.stringify(line)}`,
      );
      cursor += 1;
    }
    assert.equal(page.seo_title, block.find((p) => p.text.startsWith('SEO: ')).text.slice(5));
    assert.equal(
      page.meta_description,
      block.find((p) => p.text.startsWith('Meta: ')).text.slice(6),
    );
  }
});

test('document updates retain every supplied copy line and reference their actual source', () => {
  const seen = new Set();
  const clean = (text) =>
    text
      .replace(/\*/g, '')
      .trim()
      .replace(/^(Headline |Subheadline |Section Header |Body Copy )/, '')
      .replace(/^CTA Row /, 'CTA: ')
      .replace(/ • /g, ' | ');
  const additive = refinement.additiveRoutes ?? [];
  const documentPages = readProductPages().filter(
    (p) => refinement.routes.includes(p.route) || additive.includes(p.route),
  );
  for (const page of documentPages) {
    // Pages that keep their original copy are checked only on the sections the document added;
    // their original paragraphs are covered by the source-fidelity test above.
    const blocks = additive.includes(page.route)
      ? page.sections.filter((s) => s.addedFrom === refinement.document)
      : [page.hero, ...page.sections.filter((s) => s.addedFrom !== 'Pithy')];
    if (additive.includes(page.route)) assert.ok(blocks.length, `${page.route}: no added copy`);
    for (const paragraph of blocks.flatMap((s) => s.paragraphs)) {
      if (page.route === '/' && !refinement.lines[paragraph.sourceParagraph]) continue;
      const raw = refinement.lines[paragraph.sourceParagraph];
      assert.ok(raw, `${page.route}: unknown source line ${paragraph.sourceParagraph}`);
      const expected = clean(raw);
      // The homepage CTA row pairs both supplied actions; each row cites one of them.
      if (
        page.route === '/' &&
        paragraph.text === 'CTA: Start Growing as ONE | Explore the Portal'
      ) {
        assert.ok(['Start Growing as ONE', 'Explore the Portal'].includes(expected));
      } else
        assert.equal(
          paragraph.text,
          expected,
          `${page.route}: source line ${paragraph.sourceParagraph}`,
        );
      seen.add(String(paragraph.sourceParagraph));
    }
  }
  const footer = JSON.parse(
    readFileSync('src/products/website/pages/home/footer-copy.json', 'utf8'),
  );
  for (const paragraph of footer) {
    assert.equal(
      paragraph.text,
      clean(refinement.lines[paragraph.sourceParagraph]).replace(/^- /, ''),
    );
    seen.add(String(paragraph.sourceParagraph));
  }
  assert.deepEqual(
    [...seen].sort(),
    Object.keys(refinement.lines).sort(),
    'Every supplied source line must appear',
  );
});

test('homepage retains all seven original sections, then the final corrected flow (Pithy copy and taglines, with the long-form sections collapsed)', () => {
  const original = JSON.parse(
    readFileSync('document-study/homepage-original-sections.json', 'utf8'),
  );
  const home = readProductPages().find((page) => page.route === '/');
  assert.equal(original.length, 7);
  assert.deepEqual(home.sections.slice(0, original.length), original);
  assert.deepEqual(
    home.sections.slice(original.length).map((section) => section.title),
    [
      'Value Pillars',
      'How It Works',
      'Growth feels complicated. It doesn’t have to.',
      'A guided environment built around how humans grow.',
      'Human‑directed intelligence.',
      'Narrative',
    ],
  );
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
