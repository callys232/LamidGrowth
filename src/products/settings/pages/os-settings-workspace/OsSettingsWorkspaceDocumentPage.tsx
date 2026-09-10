import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  OsSettingsWorkspaceHeroSlide,
  NameSlide1,
  TypeSlide2,
  AudienceContextSlide3,
} from './slides';

/** /os/settings/workspace — sections in reading order. */
export function OsSettingsWorkspaceDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<OsSettingsWorkspaceHeroSlide embedded={embedded} />}
    >
      <NameSlide1 embedded={embedded} />
      <TypeSlide2 embedded={embedded} />
      <AudienceContextSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
