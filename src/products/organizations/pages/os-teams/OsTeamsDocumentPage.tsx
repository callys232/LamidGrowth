import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { OsTeamsHeroSlide, TeamOverviewSlide1, CapabilitySlide2, RhythmSlide3 } from './slides';

/** /os/teams — sections in reading order. */
export function OsTeamsDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<OsTeamsHeroSlide embedded={embedded} />}
    >
      <TeamOverviewSlide1 embedded={embedded} />
      <CapabilitySlide2 embedded={embedded} />
      <RhythmSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
