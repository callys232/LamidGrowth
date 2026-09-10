import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  WhoItsForIndividualsHeroSlide,
  SetTheFocusSlide1,
  StrengthenCapabilitySlide2,
  KeepProgressMovingSlide3,
  YourPersonalContextStaysPersonalSlide4,
} from './slides';

/** /who-its-for/individuals — sections in reading order. */
export function WhoItsForIndividualsDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<WhoItsForIndividualsHeroSlide embedded={embedded} />}
    >
      <SetTheFocusSlide1 embedded={embedded} />
      <StrengthenCapabilitySlide2 embedded={embedded} />
      <KeepProgressMovingSlide3 embedded={embedded} />
      <YourPersonalContextStaysPersonalSlide4 embedded={embedded} />
    </DocumentPageLayout>
  );
}
