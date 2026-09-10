import { readFileSync, writeFileSync } from 'node:fs';

export function loadPageManifest() {
  return JSON.parse(readFileSync('src/content/page-manifest.json', 'utf8'));
}

export function readProductPages() {
  return loadPageManifest().map((entry) => JSON.parse(readFileSync(entry.content, 'utf8')));
}

// Used only by the explicit document-import command. Never rewrites page components.
export function writeProductContent(pages) {
  const manifest = loadPageManifest();
  if (
    manifest.length !== pages.length ||
    pages.some((page) => !manifest.some((entry) => entry.route === page.route))
  ) {
    throw new Error(
      'Register new document routes in page-manifest.json before importing their content.',
    );
  }
  for (const page of pages) {
    const entry = manifest.find((entry) => entry.route === page.route);
    const section = ({ body, ...value }) => value;
    const { blocks, ...value } = page;
    writeFileSync(
      entry.content,
      JSON.stringify(
        { ...value, hero: section(page.hero), sections: page.sections.map(section) },
        null,
        2,
      ) + '\n',
    );
  }
}
