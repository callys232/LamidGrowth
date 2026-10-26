import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { InfoPage, info } from '../info/InfoPage';
import { ContactHeroSlide, ChooseATopicSlide1, TellUsTheOutcomeSlide2 } from './slides';

/** /contact — sections in reading order. */
export function ContactDocumentPage({ embedded = false }: DocumentPageProps) {
  if (!embedded) return <InfoPage content={info.contact} />;
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
