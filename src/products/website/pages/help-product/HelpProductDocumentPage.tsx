import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  HelpProductHeroSlide,
  CoreExperienceSlide1,
  DeeperCapabilitySlide2,
  OutcomeCollectionsSlide3,
} from './slides';

/** /help/product — sections in reading order. */
export function HelpProductDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<HelpProductHeroSlide embedded={embedded} />}
    >
      <CoreExperienceSlide1 embedded={embedded} />
      <DeeperCapabilitySlide2 embedded={embedded} />
      <OutcomeCollectionsSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
