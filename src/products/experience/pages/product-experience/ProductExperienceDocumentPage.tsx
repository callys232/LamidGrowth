import { User, Briefcase, Rocket } from 'lucide-react';
import { EngineDocumentPage } from '../../../../shared/content/engine/EngineDocumentPage';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';

/** /product/experience — layout shared with the other 4 engine pages (see EngineDocumentPage). */
export function ProductExperienceDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <EngineDocumentPage content={content} embedded={embedded} icons={[User, Briefcase, Rocket]} />
  );
}
