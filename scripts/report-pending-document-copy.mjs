import fs from 'node:fs';

const lines = fs
  .readFileSync('C:/Users/TechBuddy/Downloads/Tagline_Review_and_Refinement.md', 'utf8')
  .split(/\r?\n/);
const drafts = ['THE FOUNDER KEYNOTE'];
const rows = [];
for (const name of drafts) {
  const start = lines.findIndex((line) => line === `**⭐ ${name}**`);
  const end = lines.findIndex((line, index) => index > start && line.startsWith('**⭐ Why this'));
  if (start < 0 || end < 0) throw new Error(`Missing source draft: ${name}`);
  for (let i = start + 1; i < end; i++) {
    if (lines[i].trim()) rows.push([name, i + 1, lines[i].replace(/\*/g, '').trim()]);
  }
}
// Long-form homepage sections that are not used (2, 4 and 5 are published, collapsed).
for (const number of [1, 3, 6]) {
  const start = lines.findIndex((line) => line.startsWith(`**⭐ HOMEPAGE — SECTION ${number}:`));
  const end = lines.findIndex((line, index) => index > start && line.startsWith('**⭐'));
  if (start < 0 || end < 0) throw new Error(`Missing homepage long-form section ${number}`);
  const name = lines[start].replace(/\*/g, '').replace('⭐ ', '').trim();
  for (let i = start + 1; i < end; i++) {
    if (lines[i].trim()) rows.push([name, i + 1, lines[i].replace(/\*/g, '').trim()]);
  }
}
const escape = (value) => String(value).replace(/\|/g, '\\|');
fs.writeFileSync(
  'artifacts/tagline-copy-review/pending-content-table.md',
  '# Document copy not published\n\nThese drafts are recorded in full but not published. The long-form homepage hero, audience and CTA sections are not used: the homepage keeps its approved hero, /who-its-for carries the audience copy and the Narrative closes the page. (Its Why LAMID ONE, Portal Experience and Philosophy sections are published as collapsed long-form sections.) The Founder Keynote is a stage script; the Founder’s Letter, long-form Founder’s Message, Enterprise Overview and Social Impact Overview are applied to /about/leadership, /about/story, /who-its-for/enterprises and /who-its-for/institutions.\n\n| Draft | Document line | Supplied copy |\n| --- | --- | --- |\n' +
    rows.map((row) => '| ' + row.map(escape).join(' | ') + ' |').join('\n') +
    '\n',
);
const baseline = JSON.parse(
  fs.readFileSync('document-study/tagline-refinement-source.json', 'utf8'),
);
const manifest = JSON.parse(fs.readFileSync('src/content/page-manifest.json', 'utf8'));
const summary = baseline.routes.map((route) => {
  const entry = manifest.find((p) => p.route === route);
  const page = JSON.parse(fs.readFileSync(entry.content, 'utf8'));
  const paragraphCount = [page.hero, ...page.sections].reduce(
    (count, section) => count + section.paragraphs.length,
    0,
  );
  return [route, page.sections.length, paragraphCount];
});
fs.writeFileSync(
  'artifacts/tagline-copy-review/update-summary.md',
  '# Document update summary\n\nOnly supplied replacement drafts have been applied. Homepage uses the consolidated flow chosen by the user; the other complete page drafts use the later long-form source. The dedicated audience draft updates /who-its-for.\n\n| Updated route | Body sections | Copy paragraphs |\n| --- | --- | --- |\n' +
    summary.map((row) => '| ' + row.join(' | ') + ' |').join('\n') +
    '\n\nThe homepage footer additionally contains all nine supplied labels. Philosophy and Terms & Privacy remain labels because the document supplies no destinations; no destination has been invented. Other footer labels link to their existing matching pages. SEO titles and meta descriptions remain unchanged because the document supplies no replacements. Existing interactive catalog and workspace preview are retained.\n\nUnpublished drafts (the Founder Keynote and three long-form homepage sections) are captured line by line in pending-content-table.md. Source chat instructions, design specifications, proposed future pages, and superseded alternative copy are not treated as approved website updates.\n',
);
console.log(JSON.stringify({ updatedRoutes: summary, pendingDraftLines: rows.length }, null, 2));
