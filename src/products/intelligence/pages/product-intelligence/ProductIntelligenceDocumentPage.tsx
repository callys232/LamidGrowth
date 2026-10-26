import { UpdatedDocumentPage } from '../../../../shared/content/UpdatedDocumentPage';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { IntelligenceCatalogSection } from './IntelligenceCatalogSection';
import { HowItWorksPage, howItWorks } from '../../../website/pages/how-it-works/HowItWorksPage';

export function ProductIntelligenceDocumentPage({ embedded = false }: DocumentPageProps) {
  if (!embedded) return <HowItWorksPage content={howItWorks.intelligence} />;
  return (
    <UpdatedDocumentPage
      content={content}
      embedded={embedded}
      extraSection={<IntelligenceCatalogSection />}
    />
  );
}
