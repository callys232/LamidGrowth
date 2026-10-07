import fs from 'node:fs';
import path from 'node:path';

const source = fs
  .readFileSync('C:/Users/TechBuddy/Downloads/Tagline_Review_and_Refinement.md', 'utf8')
  .split(/\r?\n/);
const manifest = JSON.parse(fs.readFileSync('src/content/page-manifest.json', 'utf8'));
const out = 'artifacts/tagline-copy-review';
fs.mkdirSync(out, { recursive: true });
const escape = (value) =>
  String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, '<br>');
const table = (head, rows) =>
  [
    '| ' + head.join(' | ') + ' |',
    '| ' + head.map(() => '---').join(' | ') + ' |',
    ...rows.map((row) => '| ' + row.map(escape).join(' | ') + ' |'),
  ].join('\n');
const inventory = [];
const current = [];
for (const entry of manifest) {
  const page = JSON.parse(fs.readFileSync(entry.content, 'utf8'));
  inventory.push([
    entry.route,
    page.name,
    entry.content,
    page.hero.paragraphs.length,
    page.sections.length,
    page.sections.reduce((n, section) => n + section.paragraphs.length, 0),
    'Source mapping pending',
  ]);
  for (const field of ['name', 'seo_title', 'meta_description', 'title', 'description'])
    current.push([entry.route, field, page[field], entry.content]);
  current.push([entry.route, 'hero.title', page.hero.title, entry.content]);
  page.hero.paragraphs.forEach((p, i) =>
    current.push([entry.route, `hero.paragraphs[${i}]`, p.text, entry.content]),
  );
  page.sections.forEach((s, i) => {
    current.push([entry.route, `sections[${i}].label`, s.label, entry.content]);
    current.push([entry.route, `sections[${i}].title`, s.title, entry.content]);
    s.paragraphs.forEach((p, j) =>
      current.push([entry.route, `sections[${i}].paragraphs[${j}]`, p.text, entry.content]),
    );
  });
}
const replacement = [];
let page = '',
  section = '',
  active = false;
source.forEach((line, i) => {
  const match = line.match(/^\*\*⭐ (.+?) — SECTION (\d+): (.+?) \(Long.Form Copy\)\*\*$/);
  if (match) {
    page = match[1];
    section = `${match[2]}: ${match[3]}`;
    active = true;
    return;
  }
  if (/^\*\*Richard —/.test(line) || /^\*\*⭐ HOMEPAGE LONG.FORM — COMPLETE/.test(line))
    active = false;
  if (active && line.trim()) replacement.push([page, section, i + 1, line.replace(/\*\*/g, '')]);
});
fs.writeFileSync(
  path.join(out, 'page-inventory.md'),
  '# Page inventory\n\nEvery page in the existing page manifest is listed. No replacement has been applied. Route mappings and source precedence require resolution.\n\n' +
    table(
      ['Route', 'Page', 'Content file', 'Hero lines', 'Sections', 'Section lines', 'Status'],
      inventory,
    ) +
    '\n',
);
fs.writeFileSync(
  path.join(out, 'current-content-table.md'),
  '# Current content, field by field\n\nThis covers all manifest content fields. Additional rendered copy in components requires a separate audit.\n\n' +
    table(['Route', 'Field', 'Current content', 'File'], current) +
    '\n',
);
fs.writeFileSync(
  path.join(out, 'source-copy-table.md'),
  '# Later long-form source copy\n\nVerbatim nonblank copy lines under complete long-form section headings, with Markdown bold markers removed. These are source candidates, not approved updates. Chat directions outside the copy blocks are excluded.\n\n' +
    table(['Source page', 'Section', 'Document line', 'Copy'], replacement) +
    '\n',
);
console.log(
  JSON.stringify(
    {
      pages: inventory.length,
      currentFields: current.length,
      sourceCopyLines: replacement.length,
      sourcePages: [...new Set(replacement.map((row) => row[0]))],
      output: out,
    },
    null,
    2,
  ),
);
