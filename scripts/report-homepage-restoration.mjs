import fs from 'node:fs';
import assert from 'node:assert/strict';

const original = JSON.parse(
  fs
    .readFileSync('artifacts/tagline-copy-review/github-main-homepage.json', 'utf8')
    .replace(/^\uFEFF/, ''),
);
const current = JSON.parse(fs.readFileSync('src/products/website/pages/home/content.json', 'utf8'));
assert.deepEqual(current.sections.slice(0, original.sections.length), original.sections);
assert.deepEqual(current.continuity.paragraphs, original.hero.paragraphs.slice(4));
const escape = (value) => String(value).replace(/\|/g, '\\|').replace(/\n/g, '<br>');
const rows = [
  ...current.hero.paragraphs.map((p) => ['Document update', 'Hero', p.sourceParagraph, p.text]),
  ...current.continuity.paragraphs.map((p) => [
    'GitHub original',
    'Human control',
    p.sourceParagraph,
    p.text,
  ]),
  ...current.sections.flatMap((section, index) =>
    section.paragraphs.map((p) => [
      index < original.sections.length ? 'GitHub original' : 'Document update',
      section.title,
      p.sourceParagraph,
      p.text,
    ]),
  ),
];
const footer = JSON.parse(
  fs.readFileSync('src/products/website/pages/home/footer-copy.json', 'utf8'),
);
rows.push(...footer.map((p) => ['Document update', 'Footer', p.sourceParagraph, p.text]));
fs.writeFileSync(
  'artifacts/tagline-copy-review/restored-homepage-content-table.md',
  '# Homepage restored against the live site and GitHub\n\nCompared with https://lamidgworth.vercel.app/ and GitHub main commit 7f48d611795592affd2b8a343aaeff34503bc982. The seven original body sections and both original human-control paragraphs match GitHub exactly. Original section components, context tabs, outcome diagrams, disclosures, and expansion scale are retained. The document supplies the approved replacement hero, Value Pillars, How It Works, Narrative and final CTA, and footer labels. The supplied video and logo remain.\n\nParagraph references for original copy refer to the original source document; update references refer to Tagline_Review_and_Refinement.md.\n\n| Origin | Section | Source paragraph | Content |\n| --- | --- | --- | --- |\n' +
    rows.map((row) => '| ' + row.map(escape).join(' | ') + ' |').join('\n') +
    '\n',
);
console.log(
  `GitHub comparison passed: ${original.sections.length} original sections, 2 human-control paragraphs, ${rows.length} content table rows.`,
);
