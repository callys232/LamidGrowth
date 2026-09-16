import { Play, Repeat, ShieldCheck } from 'lucide-react';
import { EngineDocumentPage } from '../../../../shared/content/engine/EngineDocumentPage';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';

/** /product/workflows — layout shared with the other 4 engine pages (see EngineDocumentPage). */
export function ProductWorkflowsDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <EngineDocumentPage content={content} embedded={embedded} icons={[Play, Repeat, ShieldCheck]} />
  );
}
