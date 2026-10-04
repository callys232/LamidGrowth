import fs from 'node:fs';

const documentPath = 'C:/Users/TechBuddy/Downloads/Tagline_Review_and_Refinement.md';
const lines = fs.readFileSync(documentPath, 'utf8').split(/\r?\n/);
const blocks = [];
let block;
for (let i = 0; i < lines.length; i++) {
  const match = lines[i].match(/^\*\*⭐ (.+?) — SECTION (\d+): (.+?) \(Long.Form Copy\)\*\*$/);
  if (match) {
    block = { page: match[1], number: Number(match[2]), label: match[3], paragraphs: [] };
    blocks.push(block);
    continue;
  }
  if (/^\*\*Richard —/.test(lines[i]) || /^\*\*⭐ HOMEPAGE LONG.FORM — COMPLETE/.test(lines[i]))
    block = undefined;
  if (!block || !lines[i].trim()) continue;
  let text = lines[i].replace(/\*/g, '').trim();
  if (text.startsWith('CTA Row ')) text = 'CTA: ' + text.slice(8).replace(/ • /g, ' | ');
  else text = text.replace(/^(Headline |Subheadline |Section Header |Body Copy )/, '');
  block.paragraphs.push({ text, sourceParagraph: i + 1 });
}
const manifest = JSON.parse(fs.readFileSync('src/content/page-manifest.json', 'utf8'));
const applied = [];
const mappings = [
  ['ABOUT', '/about'],
  ['METHOD', '/how-it-works'],
  ['PORTAL ARCHITECTURE', '/product'],
  ['PORTAL EXPERIENCE', '/product/experience'],
  ['PORTAL INTELLIGENCE', '/product/intelligence'],
];
for (const [sourceName, route] of mappings) {
  const entry = manifest.find((p) => p.route === route);
  const page = JSON.parse(fs.readFileSync(entry.content, 'utf8'));
  const sourceBlocks = blocks.filter((b) => b.page === sourceName);
  if (!sourceBlocks.length || sourceBlocks.some((b) => !b.paragraphs.length))
    throw new Error(`Incomplete copy: ${sourceName}`);
  const hero = sourceBlocks.find((b) => b.number === 1);
  page.title = hero.paragraphs[0].text;
  page.description = hero.paragraphs[1].text;
  page.hero = { title: page.title, paragraphs: hero.paragraphs };
  page.sections = sourceBlocks
    .filter((b) => b !== hero)
    .map((b) => ({
      label: b.label,
      title: b.paragraphs[0].text,
      paragraphs: b.paragraphs,
      longForm: true,
    }));
  fs.writeFileSync(entry.content, JSON.stringify(page, null, 2) + '\n');
  for (const b of sourceBlocks)
    for (const p of b.paragraphs) applied.push([route, b.label, p.sourceParagraph, p.text]);
}
function paragraph(index) {
  return { text: lines[index].replace(/\*/g, '').trim(), sourceParagraph: index + 1 };
}
function nonblank(start, end) {
  return lines
    .slice(start, end)
    .flatMap((line, offset) => (line.trim() ? [paragraph(start + offset)] : []));
}
function commit(route, hero, sections, recordedSections = sections) {
  const entry = manifest.find((p) => p.route === route);
  const page = JSON.parse(fs.readFileSync(entry.content, 'utf8'));
  page.title = hero[0].text;
  page.description = hero[1].text;
  page.hero = { title: page.title, paragraphs: hero };
  page.sections = sections;
  fs.writeFileSync(entry.content, JSON.stringify(page, null, 2) + '\n');
  for (const p of hero) applied.push([route, 'Hero', p.sourceParagraph, p.text]);
  for (const s of recordedSections)
    for (const p of s.paragraphs) applied.push([route, s.label, p.sourceParagraph, p.text]);
}
function section(label, paragraphs) {
  return { label, title: paragraphs[0].text, paragraphs };
}
const homeStart = lines.findIndex((l) =>
  l.includes('FULL HOMEPAGE FLOW (Final, Corrected Version)'),
);
const find = (text) => {
  const index = lines.findIndex((l, i) => i > homeStart && l.replace(/\*/g, '').trim() === text);
  if (index < 0) throw new Error(`Missing document line: ${text}`);
  return index;
};
const nextCopy = (label) => {
  let index = find(label) + 1;
  while (!lines[index].trim()) index++;
  return paragraph(index);
};
const homeHero = ['Tagline', 'Hero Line', 'Sub‑Tag', 'Audience Line'].map(nextCopy);
const pillars = nonblank(
  find('Value Pillars'),
  find('3. HOW IT WORKS SECTION (Corrected, No Repetition)'),
);
const mechanics = nonblank(find('How It Works'), find('4. NARRATIVE SECTION'));
const narrative = nonblank(find('Narrative'), find('5. CTA SECTION'));
const primary = nextCopy('Primary CTA');
const secondary = nextCopy('Secondary CTA');
const actions = {
  text: `CTA: ${primary.text} | ${secondary.text}`,
  sourceParagraph: primary.sourceParagraph,
};
// Long-form copy is published collapsed (`longForm: true` renders as an expandable section).
// The homepage's Why LAMID ONE, Portal Experience and Philosophy sections sit ahead of the closing
// Narrative; its long-form hero, audience and CTA sections are not used (the approved hero stays,
// /who-its-for carries the audience copy and Narrative closes the page) and are recorded in
// report-pending-document-copy.mjs.
const longFormHome = [2, 4, 5].map((number) => {
  const b = blocks.find((x) => x.page === 'HOMEPAGE' && x.number === number);
  if (!b?.paragraphs.length) throw new Error(`Incomplete copy: HOMEPAGE ${number}`);
  return { label: b.label, title: b.paragraphs[0].text, paragraphs: b.paragraphs, longForm: true };
});
const homeUpdates = [
  section('Value Pillars', pillars),
  section('How It Works', mechanics),
  ...longFormHome,
  section('Narrative', [
    ...narrative,
    { text: actions.text, sourceParagraph: secondary.sourceParagraph },
  ]),
];
const originalHomeSections = JSON.parse(
  fs.readFileSync('document-study/homepage-original-sections.json', 'utf8'),
);
commit('/', [...homeHero, actions], [...originalHomeSections, ...homeUpdates], homeUpdates);
// Both CTA labels have individual source rows even though the hero combines them for display.
applied.push(['/', 'Hero secondary CTA', secondary.sourceParagraph, secondary.text]);
const footerStart = find('Footer');
const footerEnd = lines.findIndex(
  (l, i) => i > footerStart && l.startsWith('A clean, premium footer'),
);
const footer = nonblank(footerStart + 1, footerEnd).map((p) => ({
  ...p,
  text: p.text.replace(/^- /, ''),
}));
fs.writeFileSync(
  'src/products/website/pages/home/footer-copy.json',
  JSON.stringify(footer, null, 2) + '\n',
);
for (const p of footer) applied.push(['/', 'Footer', p.sourceParagraph, p.text]);
// The dedicated audience draft has no later standalone replacement.
const audienceStart = lines.findIndex((l) => l === '**⭐ WHO IT’S FOR**');
const audienceEnd = lines.findIndex(
  (l, i) => i > audienceStart && l === '**⭐ Why this section works**',
);
const audience = nonblank(audienceStart + 1, audienceEnd);
const audienceSections = [];
for (let i = 2; i < audience.length; i += 2)
  audienceSections.push(section(audience[i].text, audience.slice(i, i + 2)));
commit('/who-its-for', audience.slice(0, 2), audienceSections);
// The original Pithy copy of the pages above is kept after the document copy, unchanged.
// document-study/pithy-replaced-pages.json holds it as it was before the document was applied.
const PITHY = 'Pithy';
const pithyKept = JSON.parse(fs.readFileSync('document-study/pithy-replaced-pages.json', 'utf8'));
for (const [route, original] of Object.entries(pithyKept)) {
  const entry = manifest.find((p) => p.route === route);
  const page = JSON.parse(fs.readFileSync(entry.content, 'utf8'));
  const opening = original.hero.paragraphs;
  page.sections = [
    ...page.sections.filter((s) => s.addedFrom !== PITHY),
    { label: opening[0].text, title: opening[0].text, paragraphs: opening, addedFrom: PITHY },
    ...original.sections.map((s) => ({ ...s, addedFrom: PITHY })),
  ];
  fs.writeFileSync(entry.content, JSON.stringify(page, null, 2) + '\n');
}
// Standalone drafts are added after the existing page copy. The page keeps its own heading,
// summary, SEO metadata and every original section; only the document's copy is added.
const SOURCE = 'Tagline_Review_and_Refinement.md';
const additiveRoutes = [];
function append(route, sections) {
  const entry = manifest.find((p) => p.route === route);
  const page = JSON.parse(fs.readFileSync(entry.content, 'utf8'));
  page.sections = [
    ...page.sections.filter((s) => s.addedFrom !== SOURCE),
    ...sections.map((s) => ({ ...s, addedFrom: SOURCE, longForm: true })),
  ];
  fs.writeFileSync(entry.content, JSON.stringify(page, null, 2) + '\n');
  additiveRoutes.push(route);
  for (const s of sections)
    for (const p of s.paragraphs) applied.push([route, s.label, p.sourceParagraph, p.text]);
}
function draft(heading) {
  const start = lines.findIndex((l) => l === `**⭐ ${heading}**`);
  const end = lines.findIndex((l, i) => i > start && l.startsWith('**⭐ Why this'));
  if (start < 0 || end < 0) throw new Error(`Missing source draft: ${heading}`);
  // Italic document annotations such as "(Definitive Narrative • Publication‑Ready)" are not copy.
  return nonblank(start + 1, end).filter((p) => !/^\(.*\)$/.test(p.text));
}
// Overviews: the title and intro open the addition; each heading and its paragraph follow.
function overview(heading, route) {
  const [title, intro, ...rest] = draft(heading);
  const sections = [section(title.text, [title, intro])];
  for (let i = 0; i < rest.length; i += 2)
    sections.push(section(rest[i].text, rest.slice(i, i + 2)));
  append(route, sections);
}
overview('ENTERPRISE OVERVIEW', '/who-its-for/enterprises');
overview('SOCIAL IMPACT OVERVIEW', '/who-its-for/institutions');
// The Founder's Letter has no headings: it is added as one section.
const letter = draft('FOUNDER’S LETTER');
append('/about/leadership', [section(letter[0].text, letter)]);
// The long-form Founder's Message: its introduction, then one section per heading.
const messageHeadings = [
  'The Journey That Led Here',
  'Why LAMID ONE Exists',
  'The Principles Behind the Portal',
  'What LAMID ONE Represents',
  'A Future Built on Coherence',
  'An Invitation',
];
const message = draft('FOUNDER’S MESSAGE (LONG‑FORM)');
const messageParts = [[]];
for (const p of message) {
  if (messageHeadings.includes(p.text)) messageParts.push([]);
  messageParts.at(-1).push(p);
}
if (messageParts.length !== messageHeadings.length + 1)
  throw new Error('Founder’s Message headings not found');
// The original story already has "Why We Call It an Operating System" and similar headings, so
// the message's own labels are prefixed to keep every section label unique on the page.
append(
  '/about/story',
  messageParts.map((paragraphs) => ({
    ...section(paragraphs[0].text, paragraphs),
    label: `Founder’s Message: ${paragraphs[0].text}`,
  })),
);
const escape = (s) => String(s).replace(/\|/g, '\\|');
const updatedRoutes = [...new Set(applied.map((row) => row[0]))].filter(
  (route) => !additiveRoutes.includes(route),
);
const rawLines = Object.fromEntries(applied.map((row) => [row[2], lines[row[2] - 1]]));
fs.writeFileSync(
  'document-study/tagline-refinement-source.json',
  JSON.stringify(
    {
      document: SOURCE,
      routes: updatedRoutes,
      additiveRoutes,
      pithyRetained: Object.keys(pithyKept),
      lines: rawLines,
    },
    null,
    2,
  ) + '\n',
);
fs.writeFileSync(
  'artifacts/tagline-copy-review/updated-content-table.md',
  '# Applied document updates\n\nSource: Tagline_Review_and_Refinement.md. Document line numbers identify every applied copy line. Markdown styling and copy labels are removed; CTA separators use the existing renderer format. Unprovided metadata and other pages are unchanged.\n\n| Route | Section | Document line | Updated copy |\n| --- | --- | --- | --- |\n' +
    applied.map((row) => '| ' + row.map(escape).join(' | ') + ' |').join('\n') +
    '\n',
);
console.log(
  `Recorded ${applied.length} copy rows across ${new Set(applied.map((row) => row[0])).size} pages.`,
);
