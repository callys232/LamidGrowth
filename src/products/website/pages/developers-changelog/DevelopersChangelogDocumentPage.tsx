import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  DevelopersChangelogHeroSlide,
  EachEntryIncludesSlide1,
  BreakingChangesSlide2,
} from './slides';

/** /developers/changelog — sections in reading order. */
export function DevelopersChangelogDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<DevelopersChangelogHeroSlide embedded={embedded} />}
    >
      <EachEntryIncludesSlide1 embedded={embedded} />
      <BreakingChangesSlide2 embedded={embedded} />
    </DocumentPageLayout>
  );
}
