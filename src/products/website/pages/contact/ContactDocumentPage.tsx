import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { ContactHeroSlide, ChooseATopicSlide1, TellUsTheOutcomeSlide2 } from './slides';

/** /contact — sections in reading order. */
export function ContactDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<ContactHeroSlide embedded={embedded} />}
    >
      <ChooseATopicSlide1 embedded={embedded} />
      <TellUsTheOutcomeSlide2 embedded={embedded} />
    </DocumentPageLayout>
  );
}
