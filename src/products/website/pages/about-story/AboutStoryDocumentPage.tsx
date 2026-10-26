import { UpdatedDocumentPage } from '../../../../shared/content/UpdatedDocumentPage';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { InfoPage, fromContent } from '../info/InfoPage';

export function AboutStoryDocumentPage({ embedded = false }: DocumentPageProps) {
  if (!embedded)
    return (
      <InfoPage
        content={fromContent(content, {
          eyebrow: 'Our story',
          primary: { label: 'Get started', to: '/signup' },
          secondary: { label: 'Contact us', to: '/contact' },
        })}
      />
    );
  return <UpdatedDocumentPage content={content} embedded={embedded} />;
}
