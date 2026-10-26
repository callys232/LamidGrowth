import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { InfoPage, fromContent } from '../info/InfoPage';
import { SupportHeroSlide } from './slides';
import { SupportForm } from './SupportForm';

/** /support — hero, then the contact form (which covers the topic → describe → submit steps). */
export function SupportDocumentPage({ embedded = false }: DocumentPageProps) {
  if (!embedded)
    return (
      <InfoPage
        content={fromContent(content, {
          eyebrow: 'Support',
          primary: { label: 'Get started', to: '/signup' },
          secondary: { label: 'Contact us', to: '/contact' },
        })}
      />
    );
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<SupportHeroSlide embedded={embedded} />}
    >
      <SupportForm />
    </DocumentPageLayout>
  );
}
