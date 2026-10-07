import { UpdatedDocumentPage } from '../../../../shared/content/UpdatedDocumentPage';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';

export function WhoItsForInstitutionsDocumentPage({ embedded = false }: DocumentPageProps) {
  return <UpdatedDocumentPage content={content} embedded={embedded} />;
}
