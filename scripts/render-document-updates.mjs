import fs from 'node:fs';
const pages = [
  ['src/products/website/pages/about/AboutDocumentPage.tsx', 'AboutDocumentPage'],
  ['src/products/website/pages/how-it-works/HowItWorksDocumentPage.tsx', 'HowItWorksDocumentPage'],
  ['src/products/website/pages/product/ProductDocumentPage.tsx', 'ProductDocumentPage'],
  [
    'src/products/experience/pages/product-experience/ProductExperienceDocumentPage.tsx',
    'ProductExperienceDocumentPage',
  ],
  [
    'src/products/intelligence/pages/product-intelligence/ProductIntelligenceDocumentPage.tsx',
    'ProductIntelligenceDocumentPage',
  ],
  ['src/products/website/pages/who-its-for/WhoItsForDocumentPage.tsx', 'WhoItsForDocumentPage'],
];
for (const [file, name] of pages) {
  const extra = name === 'ProductIntelligenceDocumentPage';
  const home = name === 'HomeDocumentPage';
  const code = `import { UpdatedDocumentPage } from '../../../../shared/content/UpdatedDocumentPage';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
${extra ? "import { IntelligenceCatalogSection } from './IntelligenceCatalogSection';\n" : ''}${home ? "import { HomeFooter } from './components/HomeFooter';\n" : ''}
export function ${name}({ embedded = false }: DocumentPageProps) {
  return (
${home ? '    <>\n' : ''}    <UpdatedDocumentPage content={content} embedded={embedded}${extra ? ' extraSection={<IntelligenceCatalogSection />}' : ''} />
${home ? '      {!embedded && <HomeFooter />}\n    </>\n' : ''}  );
}
`;
  fs.writeFileSync(file, code);
}
