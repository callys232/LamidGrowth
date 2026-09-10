import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  OsSettingsPrivacyHeroSlide,
  ViewDataSlide1,
  ExportDataSlide2,
  DeleteDataSlide3,
} from './slides';

/** /os/settings/privacy — sections in reading order. */
export function OsSettingsPrivacyDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<OsSettingsPrivacyHeroSlide embedded={embedded} />}
    >
      <ViewDataSlide1 embedded={embedded} />
      <ExportDataSlide2 embedded={embedded} />
      <DeleteDataSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
