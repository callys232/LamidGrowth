import { UpdatedDocumentPage } from '../../../../shared/content/UpdatedDocumentPage';
import type { DocumentPageProps } from '../../../../shared/content/types';
import { AudiencePage } from '../audience/AudiencePage';
import content from './content.json';

export function WhoItsForEnterprisesDocumentPage({ embedded = false }: DocumentPageProps) {
  if (!embedded) return <AudiencePage content={content} audienceId="organisations" />;
  return <UpdatedDocumentPage content={content} embedded={embedded} />;
}
