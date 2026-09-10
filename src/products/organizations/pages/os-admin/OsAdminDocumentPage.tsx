import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { OsAdminHeroSlide, MembersSlide1, TeamsSlide2, PlansSlide3 } from './slides';

/** /os/admin — sections in reading order. */
export function OsAdminDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<OsAdminHeroSlide embedded={embedded} />}
    >
      <MembersSlide1 embedded={embedded} />
      <TeamsSlide2 embedded={embedded} />
      <PlansSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
