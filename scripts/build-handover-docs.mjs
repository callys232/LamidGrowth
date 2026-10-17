import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import PDFDocument from 'pdfkit';
import { TOOLS, PRIMARY, homeEngineFor, disclosureFor } from '../src/app/toolCatalog/catalog.mjs';
import { MAP } from '../src/app/toolCatalog/migration.mjs';
import { PLANS } from '../src/app/plans.mjs';

// Read source, never .env or live services. Run from the repository root.
const root = process.cwd();
const out = path.join(root, 'docs/handover');
fs.mkdirSync(out, { recursive: true });
const files = [];
function walk(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, item.name);
    if (item.isDirectory()) walk(p);
    else if (/\.(mjs|tsx|ts)$/.test(item.name)) files.push(p);
  }
}
walk(path.join(root, 'src/app'));
walk(path.join(root, 'server'));
let revision = 'unknown';
try {
  revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
} catch {}
const cell = (s) =>
  String(s ?? '')
    .replace(/\|/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
const table = (heads, rows) =>
  `| ${heads.join(' | ')} |\n| ${heads.map(() => '---').join(' | ')} |\n${rows.map((r) => `| ${r.map(cell).join(' | ')} |`).join('\n')}\n`;
const relative = (p) => path.relative(root, p).replaceAll('\\', '/');
const routes = [];
const env = new Map();
for (const p of files) {
  const source = fs.readFileSync(p, 'utf8');
  for (const match of source.matchAll(/app\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g)) {
    routes.push([
      match[1].toUpperCase(),
      match[2],
      relative(p),
      source.slice(0, match.index).split('\n').length,
    ]);
  }
  for (const match of source.matchAll(/(?:process\.env|\benv)\.([A-Z][A-Z0-9_]+)/g)) {
    if (!env.has(match[1])) env.set(match[1], new Set());
    env.get(match[1]).add(relative(p));
  }
}
const app = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
const osBlock = app.slice(app.indexOf('<Route path="/os" element='));
const osRoutes = [...osBlock.matchAll(/<Route path="([^"]+)" element=/g)]
  .map((m) => m[1])
  .filter((p) => p !== '*')
  .map((p) => `/os/${p}`);
const tools = Object.entries(TOOLS).map(([id, t]) => ({
  id,
  code: PRIMARY[id],
  name: t.name,
  area: t.area,
  seat: homeEngineFor(id),
  standard: t.standard,
  engine: t.engine,
  disclosure: disclosureFor(id),
}));
const snapshot = {
  revision,
  tools,
  plans: PLANS,
  osRoutes: ['/os', ...osRoutes],
  routes,
  environmentKeys: [...env.keys()].sort(),
  migrationCounts: Object.values(MAP).reduce(
    (a, v) => ({ ...a, [v.verdict]: (a[v.verdict] || 0) + 1 }),
    {},
  ),
};
fs.writeFileSync(path.join(out, 'source-inventory.json'), JSON.stringify(snapshot, null, 2) + '\n');
fs.writeFileSync(
  path.join(out, 'SOURCE_INVENTORY.md'),
  `# Source inventory\n\nGenerated from checked-out source at revision ${revision}. This inventories declarations, not deployment or successful execution. API declarations may be mounted before or after authentication; consult middleware and the handler for authority. Dynamic routes and computed environment-key names require manual review. No secret values are read.\n\n## Workspace screens\n\n${snapshot.osRoutes.map((r) => `- ${r}`).join('\n')}\n\n## API declarations\n\n${table(['Method', 'Path', 'Source', 'Line'], routes)}\n## Configuration names\n\n${table(
    ['Name', 'Source'],
    [...env].sort().map(([key, refs]) => [key, [...refs].join('; ')]),
  )}\n## Current diagnostic tools\n\n${table(
    ['Tool', 'Primary code', 'Name', 'Seat', 'Method', 'Compute type'],
    tools.map((t) => [t.id, t.code, t.name, t.seat, t.standard, t.engine]),
  )}\n## Migration classifications\n\n${table(['Classification', 'Legacy codes'], Object.entries(snapshot.migrationCounts))}\n`,
);
const marker = '<!-- generated-tool-catalogue -->';
const masterPath = path.join(out, 'DocumentationLamiddoc.md');
if (fs.existsSync(masterPath)) {
  const body = fs.readFileSync(masterPath, 'utf8').split(marker)[0].trimEnd();
  const catalogue = table(
    ['Tool / code', 'Current name', 'Seat', 'Method'],
    tools.map((t) => [`${t.id} / ${t.code}`, t.name, t.seat, t.standard]),
  );
  const details = tools
    .map(
      (t) =>
        `### ${t.id} — ${t.name}\n\nPrimary code: ${t.code}. Suite seat: ${t.seat}. Computation: ${t.engine}.\n\nMethod: ${t.standard}.\n\nComputes: ${t.disclosure?.computes || 'Uses the retained deterministic archetype; consult the engine input and result disclosure.'}\n\nLimits: ${t.disclosure?.limits || 'Consult engines.mjs and the displayed result limits for this retained archetype; a method label alone does not validate a result.'}\n`,
    )
    .join('\n');
  fs.writeFileSync(
    masterPath,
    `${body}\n\n${marker}\n\n${catalogue}\n## Per-tool computation and limitations\n\n${details}`,
  );
}

// Render portable PDFs directly from the maintained Markdown. Tables retain columns;
// oversized rows continue as labeled cell blocks to prevent clipped content.
const plain = (s) =>
  s
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*|`/g, '')
    .replaceAll('→', ' -> ')
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
async function render(name) {
  const input = fs.readFileSync(path.join(out, `${name}.md`), 'utf8');
  const pdf = new PDFDocument({
    size: 'A4',
    margins: { top: 52, bottom: 52, left: 44, right: 44 },
    bufferPages: true,
    info: {
      Title: `LAMID ONE - ${name}`,
      Author: 'LAMID ONE',
      Subject: 'Repository-based documentation',
    },
  });
  const stream = fs.createWriteStream(path.join(out, `${name}.pdf`));
  pdf.pipe(stream);
  const width = pdf.page.width - 88;
  const limit = () => pdf.page.height - 62;
  function room(h) {
    if (pdf.y + h > limit()) pdf.addPage();
  }
  function para(s, size = 10, bold = false) {
    pdf
      .font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(size)
      .fillColor('#243241');
    room(Math.min(90, pdf.heightOfString(plain(s), { width }) + 8));
    pdf.text(plain(s), 44, pdf.y, { width, lineGap: 3 });
    pdf.moveDown(0.55);
  }
  const lines = input.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        const cells = lines[i]
          .slice(1, lines[i].lastIndexOf('|'))
          .split('|')
          .map((x) => plain(x.trim()));
        if (!cells.every((x) => /^:?-+:?$/.test(x))) rows.push(cells);
        i++;
      }
      i--;
      const heads = rows[0];
      const cw = width / heads.length;
      function row(cells, header = false) {
        pdf.font(header ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
        const height =
          Math.max(...cells.map((c) => pdf.heightOfString(c, { width: cw - 12, lineGap: 2 }))) + 14;
        if (height > pdf.page.height - 130) {
          for (let c = 0; c < cells.length; c++) para(`${heads[c]}: ${cells[c]}`, 9);
          return;
        }
        if (pdf.y + height > limit()) {
          pdf.addPage();
          if (!header) row(heads, true);
        }
        const y = pdf.y;
        cells.forEach((c, n) => {
          const x = 44 + cw * n;
          pdf.rect(x, y, cw, height).fillAndStroke(header ? '#e6edf2' : '#ffffff', '#cbd5df');
          pdf.fillColor('#243241').text(c, x + 6, y + 6, { width: cw - 12, lineGap: 2 });
        });
        pdf.x = 44;
        pdf.y = y + height;
      }
      rows.forEach((r, n) => row(r, n === 0));
      pdf.moveDown(0.7);
    } else if (/^#{1,6} /.test(line)) {
      const level = line.match(/^#+/)[0].length;
      room(65);
      para(line.replace(/^#+ /, ''), level === 1 ? 22 : level === 2 ? 15 : 12, true);
    } else if (line.startsWith('```')) {
      while (++i < lines.length && !lines[i].startsWith('```')) para(lines[i], 9);
    } else para(line);
  }
  const range = pdf.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    pdf.switchToPage(i);
    // Footer is outside the content margin; disable that margin while drawing it.
    pdf.page.margins.bottom = 0;
    pdf
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#64748b')
      .text(`LAMID ONE | ${name} | ${i + 1} / ${range.count}`, 44, pdf.page.height - 35, {
        width,
        align: 'center',
        lineBreak: false,
      });
  }
  pdf.end();
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
  console.log(`${name}.pdf: ${range.count} pages`);
}
for (const name of [
  'digitalization',
  'documentation',
  'DocumentationLamiddoc',
  'modules',
  'proposal',
  'invoice',
]) {
  if (fs.existsSync(path.join(out, `${name}.md`))) await render(name);
}
console.log(`Source inventory: ${tools.length} current tools, ${routes.length} API declarations.`);
