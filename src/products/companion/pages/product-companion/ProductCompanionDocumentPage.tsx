import { Target, Layers3, ListChecks } from 'lucide-react';
import { EngineDocumentPage } from '../../../../shared/content/engine/EngineDocumentPage';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { HowItWorksPage, howItWorks } from '../../../website/pages/how-it-works/HowItWorksPage';

/** /product/companion — layout shared with the other 4 engine pages (see EngineDocumentPage). */
export function ProductCompanionDocumentPage({ embedded = false }: DocumentPageProps) {
  if (!embedded) return <HowItWorksPage content={howItWorks.companion} />;
  return (
    <EngineDocumentPage
      content={content}
      embedded={embedded}
      icons={[Target, Layers3, ListChecks]}
    />
  );
}
