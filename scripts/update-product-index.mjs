import fs from 'node:fs';
const manifest = JSON.parse(fs.readFileSync('src/content/page-manifest.json', 'utf8'));
const products = fs
  .readdirSync('src/products', { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();
let overview =
  '# Products and their pages\n\nSee [the editing guide](../../docs/PAGE_COMPONENT_GUIDE.md) for the page/slide conventions. Each folder owns its product screens and document copy. A document-only folder does not represent an implemented backend capability.\n\n| Product | Interactive screens | Document pages |\n| --- | --- | --- |\n';
for (const name of products) {
  const base = `src/products/${name}`;
  const pages = fs.existsSync(`${base}/pages`)
    ? fs.readdirSync(`${base}/pages`).filter((p) => p.endsWith('.tsx'))
    : [];
  const documents = manifest.filter((p) => p.product === name);
  overview += `| [${name}](./${name}/README.md) | ${pages.map((p) => p.replace('.tsx', '')).join(', ') || 'Document copy only'} | ${documents.length} |\n`;
  let text = `# ${name[0].toUpperCase() + name.slice(1)}\n\nProduct-owned pages and components. [Editing guide](../../../docs/PAGE_COMPONENT_GUIDE.md) · [All products](../README.md)\n\n`;
  if (pages.length)
    text +=
      '## Interactive pages\n\n' + pages.map((p) => `- [${p}](./pages/${p})`).join('\n') + '\n\n';
  for (const dir of ['slides', 'components', 'hooks'])
    if (fs.existsSync(`${base}/${dir}`))
      text +=
        `## ${dir[0].toUpperCase() + dir.slice(1)}\n\n` +
        fs
          .readdirSync(`${base}/${dir}`)
          .filter((p) => /\.tsx?$/.test(p))
          .map((p) => `- [${p}](./${dir}/${p})`)
          .join('\n') +
        '\n\n';
  if (documents.length)
    text +=
      '## Document pages\n\nEach page folder contains its composition, named slides, and editable `content.json`.\n\n| Route | Page composition | Copy |\n| --- | --- | --- |\n' +
      documents
        .map(
          (p) =>
            `| ${p.route} | [${p.exportName}](${p.component.replace(base, '.')}) | [content.json](${p.content.replace(base, '.')}) |`,
        )
        .join('\n') +
      '\n';
  fs.writeFileSync(`${base}/README.md`, text);
}
fs.writeFileSync('src/products/README.md', overview);
console.log(`Updated ${products.length} product indexes.`);
