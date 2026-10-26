import { UpdatedDocumentPage } from '../../../../shared/content/UpdatedDocumentPage';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { HowItWorksPage, howItWorks } from './HowItWorksPage';

export function HowItWorksDocumentPage({ embedded = false }: DocumentPageProps) {
  if (!embedded) return <HowItWorksPage content={howItWorks.overview} />;
  return <UpdatedDocumentPage content={content} embedded={embedded} />;
}
