import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  OsProfileHeroSlide,
  PersonalInformationSlide1,
  ProfessionalContextSlide2,
  PreferencesSlide3,
} from './slides';

/** /os/profile — sections in reading order. */
export function OsProfileDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<OsProfileHeroSlide embedded={embedded} />}
    >
      <PersonalInformationSlide1 embedded={embedded} />
      <ProfessionalContextSlide2 embedded={embedded} />
      <PreferencesSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
