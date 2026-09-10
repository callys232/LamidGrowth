import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { OsSettingsHeroSlide, PrivacySlide1, WorkspaceSlide2, PlanUsageSlide3 } from './slides';

/** /os/settings — sections in reading order. */
export function OsSettingsDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<OsSettingsHeroSlide embedded={embedded} />}
    >
      <PrivacySlide1 embedded={embedded} />
      <WorkspaceSlide2 embedded={embedded} />
      <PlanUsageSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
