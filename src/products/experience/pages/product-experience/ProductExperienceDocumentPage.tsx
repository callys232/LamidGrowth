import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  ProductExperienceHeroSlide,
  PersonalSlide1,
  ProfessionalCreatorSlide2,
  FounderSmeSlide3,
  TheContextChangesTheSystemRemainsOneSlide4,
} from './slides';

/** /product/experience — sections in reading order. */
export function ProductExperienceDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<ProductExperienceHeroSlide embedded={embedded} />}
    >
      <PersonalSlide1 embedded={embedded} />
      <ProfessionalCreatorSlide2 embedded={embedded} />
      <FounderSmeSlide3 embedded={embedded} />
      <TheContextChangesTheSystemRemainsOneSlide4 embedded={embedded} />
    </DocumentPageLayout>
  );
}
