import fs from 'node:fs';

const lines = fs
  .readFileSync('C:/Users/TechBuddy/Downloads/Tagline_Review_and_Refinement.md', 'utf8')
  .split(/\r?\n/);
const drafts = ['ENTERPRISE OVERVIEW', 'SOCIAL IMPACT OVERVIEW', 'FOUNDER’S LETTER'];
const rows = [];
for (const name of drafts) {
  const start = lines.findIndex((line) => line === `**⭐ ${name}**`);
  const end = lines.findIndex((line, index) => index > start && line.startsWith('**⭐ Why this'));
  if (start < 0 || end < 0) throw new Error(`Missing source draft: ${name}`);
  for (let i = start + 1; i < end; i++) {
    if (lines[i].trim()) rows.push([name, i + 1, lines[i].replace(/\*/g, '').trim()]);
  }
}
const escape = (value) => String(value).replace(/\|/g, '\\|');
fs.writeFileSync(
  'artifacts/tagline-copy-review/pending-content-table.md',
  '# Document copy awaiting destination confirmation\n\nThese drafts are recorded in full. They have not been applied because their page destinations are unresolved. Enterprise Overview explicitly says it is distinct from the existing deep enterprise page. Social Impact has no existing route. The Founder’s Letter has no page with that exact name.\n\n| Draft | Document line | Supplied copy |\n| --- | --- | --- |\n' +
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
    '\n\nThe homepage footer additionally contains all nine supplied labels. Philosophy and Terms & Privacy remain labels because the document supplies no destinations; no destination has been invented. Other footer labels link to their existing matching pages. SEO titles and meta descriptions remain unchanged because the document supplies no replacements. Existing interactive catalog and workspace preview are retained.\n\nThe three additional drafts awaiting route confirmation are captured line by line in pending-content-table.md. Source chat instructions, design specifications, proposed future pages, and superseded alternative copy are not treated as approved website updates.\n',
);
console.log(JSON.stringify({ updatedRoutes: summary, pendingDraftLines: rows.length }, null, 2));
