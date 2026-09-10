import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  OsSettingsPlanHeroSlide,
  CurrentPlanSlide1,
  AvailableCapabilitiesSlide2,
  OrganizationRequirementsSlide3,
} from './slides';

/** /os/settings/plan — sections in reading order. */
export function OsSettingsPlanDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<OsSettingsPlanHeroSlide embedded={embedded} />}
    >
      <CurrentPlanSlide1 embedded={embedded} />
      <AvailableCapabilitiesSlide2 embedded={embedded} />
      <OrganizationRequirementsSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
