import { Play, Repeat, ShieldCheck } from 'lucide-react';
import { EngineDocumentPage } from '../../../../shared/content/engine/EngineDocumentPage';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { HowItWorksPage, howItWorks } from '../../../website/pages/how-it-works/HowItWorksPage';

/** /product/workflows — layout shared with the other 4 engine pages (see EngineDocumentPage). */
export function ProductWorkflowsDocumentPage({ embedded = false }: DocumentPageProps) {
  if (!embedded) return <HowItWorksPage content={howItWorks.workflows} />;
  return (
    <EngineDocumentPage content={content} embedded={embedded} icons={[Play, Repeat, ShieldCheck]} />
  );
}
