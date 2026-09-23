import { writeFileSync } from 'node:fs';
import { loadPageManifest, readProductPages } from './page-content.mjs';

// Rebuilds src/content/pages.json and src/content/routes.json directly from the current
// product content.json files (the live source of truth), instead of the one-time v1.4 import
// fixture. Run this after any edit to a product content.json so the copy-fidelity browser test
// (tests/browser/copy.spec.ts) checks against what the app actually ships, not a stale snapshot.
export function buildPagesCatalog() {
  const manifest = loadPageManifest();
  const pages = readProductPages();
  const content = pages.map((page) => {
    const { hero, sections, ...rest } = page;
    return { ...rest, hero, sections, blocks: [hero, ...sections] };
  });
  writeFileSync('src/content/pages.json', JSON.stringify(content, null, 2) + '\n');
  writeFileSync(
    'src/content/routes.json',
    JSON.stringify(
      manifest.map((entry, index) => ({
        route: entry.route,
        page: content[index].page,
        name: content[index].name,
        gated: content[index].gates.length > 0,
      })),
      null,
      2,
    ) + '\n',
  );
  console.log(
    'Rebuilt pages.json and routes.json from ' + content.length + ' product content.json files.',
  );
}
