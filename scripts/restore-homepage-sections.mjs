import fs from 'node:fs';

const previous = JSON.parse(
  fs
    .readFileSync('artifacts/tagline-copy-review/previous-homepage-content.json', 'utf8')
    .replace(/^\uFEFF/, ''),
);
const file = 'src/products/website/pages/home/content.json';
const current = JSON.parse(fs.readFileSync(file, 'utf8'));
const document = JSON.parse(
  fs.readFileSync('document-study/tagline-refinement-source.json', 'utf8'),
);
const updates = current.sections.filter((section) =>
  section.paragraphs.every((paragraph) => document.lines[paragraph.sourceParagraph]),
);
if (previous.sections.length !== 7 || updates.length !== 3)
  throw new Error('Unexpected homepage section inventory');
current.sections = [...previous.sections, ...updates];
fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n');
fs.writeFileSync(
  'document-study/homepage-original-sections.json',
  JSON.stringify(previous.sections, null, 2) + '\n',
);
const escape = (value) => String(value).replace(/\|/g, '\\|');
const rows = current.sections.flatMap((section, index) =>
  section.paragraphs.map((paragraph) => [
    index < previous.sections.length ? 'Restored original' : 'Document update',
    section.title,
    paragraph.sourceParagraph,
    paragraph.text,
  ]),
);
fs.writeFileSync(
  'artifacts/tagline-copy-review/restored-homepage-content-table.md',
  '# Restored homepage body copy\n\nThe seven original sections are restored verbatim and in their original order. The four supplied document sections follow them. The approved document hero and footer remain. Original and document source paragraph numbers refer to their respective source documents.\n\n| Origin | Section | Source paragraph | Content |\n| --- | --- | --- | --- |\n' +
    rows.map((row) => '| ' + row.map(escape).join(' | ') + ' |').join('\n') +
    '\n',
);
console.log(
  `Restored ${previous.sections.length} original sections (${previous.sections.reduce((n, s) => n + s.paragraphs.length, 0)} lines); retained ${updates.length} supplied sections.`,
);
