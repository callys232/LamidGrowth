import { UpdatedDocumentPage } from '../../../../shared/content/UpdatedDocumentPage';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { IntelligenceCatalogSection } from './IntelligenceCatalogSection';

export function ProductIntelligenceDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <UpdatedDocumentPage
      content={content}
      embedded={embedded}
      extraSection={<IntelligenceCatalogSection />}
    />
  );
}
