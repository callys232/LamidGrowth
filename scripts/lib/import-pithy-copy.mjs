import { readFileSync, writeFileSync } from 'node:fs';
import { writeProductContent, readProductPages } from './page-content.mjs';

export function importPithyCopy() {
  const source = JSON.parse(readFileSync('document-study/pithy-v1.4-source.json', 'utf8'));
  const paragraphs = source.paragraphs;
  const previous = readProductPages();
  const starts = paragraphs.flatMap((p, i) => (p.style === 'RouteMeta' ? [i] : []));
  // Three trailing acceptance-criteria bullets belong to editorial review, not Plan & Usage.
  const editorialStart = 1852;
  const content = starts.map((start, index) => {
    const end = starts[index + 1] ? starts[index + 1] - 1 : paragraphs.length;
    const raw = paragraphs.slice(start, end).filter((p) => p.sourceParagraph < editorialStart);
    const [, route, indexing, canonical] = raw[0].text.match(
      /^Route: (.*?)\s*\|\s*Indexing: (.*?)\s*\|\s*Canonical: (.*)$/,
    );
    const old = previous.find((p) => p.route === route);
    if (!old) throw new Error('Unregistered route: ' + route);
    const blocks = [];
    for (const p of raw.slice(raw.findIndex((p) => p.text === 'PRIMARY MESSAGE') + 1)) {
      if (!p.text || /^\u2014+$/.test(p.text) || p.text.startsWith('Publication note:')) continue;
      if (p.style === 'Heading2')
        blocks.push({
          label: blocks.length ? p.text : 'PRIMARY MESSAGE',
          title: p.text,
          paragraphs: [],
        });
      if (!blocks.length) throw new Error('Missing hero: ' + route);
      blocks.at(-1).paragraphs.push({ text: p.text, sourceParagraph: p.sourceParagraph });
    }
    for (const block of blocks) block.body = block.paragraphs.slice(1).map((p) => p.text);
    return {
      page: index + 1,
      name: paragraphs[start - 1].text.replace(/^\d+\s+/, ''),
      source_paragraph: paragraphs[start - 1].sourceParagraph,
      gates: old.gates,
      route,
      indexing,
      canonical,
      seo_title: raw.find((p) => p.text.startsWith('SEO: ')).text.slice(5),
      meta_description: raw.find((p) => p.text.startsWith('Meta: ')).text.slice(6),
      title: blocks[0].title,
      description: blocks[0].body[0] || '',
      hero: blocks[0],
      sections: blocks.slice(1),
      blocks,
    };
  });
  writeProductContent(content);
  writeFileSync('src/content/pages.json', JSON.stringify(content, null, 2) + '\n');
  writeFileSync(
    'src/content/routes.json',
    JSON.stringify(
      content.map(({ route, page, name, gates }) => ({
        route,
        page,
        name,
        gated: gates.length > 0,
      })),
      null,
      2,
    ) + '\n',
  );
  console.log('Imported ' + content.length + ' pages verbatim from ' + source.file);
}
