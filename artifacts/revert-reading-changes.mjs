import fs from 'node:fs';
import postcss from 'postcss';
const map = JSON.parse(fs.readFileSync('dist/assets/index-B_MXvmQS.js.map', 'utf8'));
const files = [
  'src/shared/content/CopyLine.tsx',
  'src/shared/content/slides/DocumentHeroSlide.tsx',
  'src/shared/content/slides/DocumentSectionSlide.tsx',
  'src/products/website/pages/home/components/WorkspacePreview.tsx',
  'src/products/website/pages/home/slides/HomeHeroSlide.tsx',
  'src/products/website/pages/home/components/HomeSection.tsx',
  'src/products/website/pages/home/slides/HomeOperatingCycleSlide.tsx',
  'src/products/clarity/components/ObjectiveCard.tsx',
  'src/products/commercial/slides/CommercialOpportunitiesSlide.tsx',
  'src/products/knowledge/slides/KnowledgeRecordsSlide.tsx',
];
for (const file of files) {
  const index = map.sources.indexOf('../../' + file);
  if (index < 0 || !map.sourcesContent[index]) throw new Error('Missing original source: ' + file);
  fs.writeFileSync(file, map.sourcesContent[index]);
}
const main = 'src/main.tsx';
fs.writeFileSync(main, fs.readFileSync(main, 'utf8').replace(/import '\.\/shared\/ui\/reading\.css';\r?\n/, ''));
// The last verified build predates the interrupted edits and retains the original homepage styles.
const css = postcss.parse(fs.readFileSync('dist/assets/index-CpWVJTky.css', 'utf8'));
const restored = postcss.root();
for (const node of css.nodes) {
  if (node.type === 'rule' && node.selector.includes('.lamid-home')) restored.append(node.clone());
  else if (node.type === 'atrule' && node.nodes) {
    const selected = node.clone();
    selected.removeAll();
    for (const child of node.nodes) if (child.type === 'rule' && child.selector.includes('.lamid-home')) selected.append(child.clone());
    if (selected.nodes.length) restored.append(selected);
  }
}
if (restored.nodes.length < 100) throw new Error('Incomplete homepage style recovery');
fs.writeFileSync('src/products/website/pages/home/home.css', '/* Homepage-owned presentation. Restored from the last verified build. */\n' + restored.toString());
console.log('Restored the previous components and homepage styles.');
