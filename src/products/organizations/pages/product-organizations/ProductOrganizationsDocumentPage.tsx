import { Share2, Activity, Landmark } from 'lucide-react';
import { EngineDocumentPage } from '../../../../shared/content/engine/EngineDocumentPage';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { HowItWorksPage, howItWorks } from '../../../website/pages/how-it-works/HowItWorksPage';

/** /product/organizations — layout shared with the other 4 engine pages (see EngineDocumentPage). */
export function ProductOrganizationsDocumentPage({ embedded = false }: DocumentPageProps) {
  if (!embedded) return <HowItWorksPage content={howItWorks.organizations} />;
  return (
    <EngineDocumentPage
      content={content}
      embedded={embedded}
      icons={[Share2, Activity, Landmark]}
    />
  );
}
