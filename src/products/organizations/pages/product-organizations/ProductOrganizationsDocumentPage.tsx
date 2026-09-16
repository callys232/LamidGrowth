import { Share2, Activity, Landmark } from 'lucide-react';
import { EngineDocumentPage } from '../../../../shared/content/engine/EngineDocumentPage';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';

/** /product/organizations — layout shared with the other 4 engine pages (see EngineDocumentPage). */
export function ProductOrganizationsDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <EngineDocumentPage
      content={content}
      embedded={embedded}
      icons={[Share2, Activity, Landmark]}
    />
  );
}
