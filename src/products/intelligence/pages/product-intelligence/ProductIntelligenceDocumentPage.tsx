import { Compass, TrendingUp, Users } from 'lucide-react';
import { EngineDocumentPage } from '../../../../shared/content/engine/EngineDocumentPage';
import type { DocumentPageProps } from '../../../../shared/content/types';
import { IntelligenceCatalogSection } from './IntelligenceCatalogSection';
import content from './content.json';

/** /product/intelligence — layout shared with the other 4 engine pages (see EngineDocumentPage).
 * Also the one of the 5 with a live catalog showcase (IntelligenceCatalogSection) — the best
 * narrative fit, since this page's own copy is already about combining specialist depth for an
 * outcome, which is what the 248-engine catalog actually does. */
export function ProductIntelligenceDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <EngineDocumentPage
      content={content}
      embedded={embedded}
      icons={[Compass, TrendingUp, Users]}
      extraSection={!embedded && <IntelligenceCatalogSection />}
    />
  );
}
