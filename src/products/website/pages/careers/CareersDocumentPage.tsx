import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  CareersHeroSlide,
  HowWeWorkSlide1,
  WhatWeBuildSlide2,
  BuildTechnologyPeopleCanUseWithConfidenceSlide3,
} from './slides';

/** /careers — sections in reading order. */
export function CareersDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<CareersHeroSlide embedded={embedded} />}
    >
      <HowWeWorkSlide1 embedded={embedded} />
      <WhatWeBuildSlide2 embedded={embedded} />
      <BuildTechnologyPeopleCanUseWithConfidenceSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
