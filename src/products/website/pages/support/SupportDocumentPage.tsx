import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { SupportHeroSlide } from './slides';
import { SupportForm } from './SupportForm';

/** /support — hero, then the contact form (which covers the topic → describe → submit steps). */
export function SupportDocumentPage({ embedded = false }: DocumentPageProps) {
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
