import { UpdatedDocumentPage } from '../../../../shared/content/UpdatedDocumentPage';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { HowItWorksPage, howItWorks } from '../../../website/pages/how-it-works/HowItWorksPage';

export function ProductExperienceDocumentPage({ embedded = false }: DocumentPageProps) {
  if (!embedded) return <HowItWorksPage content={howItWorks.experience} />;
  return <UpdatedDocumentPage content={content} embedded={embedded} />;
}
