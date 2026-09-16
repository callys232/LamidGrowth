import { Target, Layers3, ListChecks } from 'lucide-react';
import { EngineDocumentPage } from '../../../../shared/content/engine/EngineDocumentPage';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';

/** /product/companion — layout shared with the other 4 engine pages (see EngineDocumentPage). */
export function ProductCompanionDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <EngineDocumentPage
      content={content}
      embedded={embedded}
      icons={[Target, Layers3, ListChecks]}
    />
  );
}
