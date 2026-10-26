import { UpdatedDocumentPage } from '../../../../shared/content/UpdatedDocumentPage';
import type { DocumentPageProps } from '../../../../shared/content/types';
import { AudiencePage } from '../audience/AudiencePage';
import content from './content.json';

export function WhoItsForInstitutionsDocumentPage({ embedded = false }: DocumentPageProps) {
  if (!embedded) return <AudiencePage content={content} audienceId="social" />;
  return <UpdatedDocumentPage content={content} embedded={embedded} />;
}
