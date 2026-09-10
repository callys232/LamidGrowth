import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  OsSettingsMembersHeroSlide,
  MembersSlide1,
  RolesSlide2,
  InvitationsSlide3,
} from './slides';

/** /os/settings/members — sections in reading order. */
export function OsSettingsMembersDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<OsSettingsMembersHeroSlide embedded={embedded} />}
    >
      <MembersSlide1 embedded={embedded} />
      <RolesSlide2 embedded={embedded} />
      <InvitationsSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
