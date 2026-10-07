import { UpdatedDocumentPage } from '../../../../shared/content/UpdatedDocumentPage';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';

export function WhoItsForEnterprisesDocumentPage({ embedded = false }: DocumentPageProps) {
  return <UpdatedDocumentPage content={content} embedded={embedded} />;
}
