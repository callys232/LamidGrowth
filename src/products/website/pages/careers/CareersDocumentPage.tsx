import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { InfoPage, fromContent } from '../info/InfoPage';
import {
  CareersHeroSlide,
  HowWeWorkSlide1,
  WhatWeBuildSlide2,
  BuildTechnologyPeopleCanUseWithConfidenceSlide3,
} from './slides';

/** /careers — sections in reading order. */
export function CareersDocumentPage({ embedded = false }: DocumentPageProps) {
  if (!embedded)
    return (
      <InfoPage
        content={fromContent(content, {
          eyebrow: 'Careers',
          primary: { label: 'Get started', to: '/signup' },
          secondary: { label: 'Contact us', to: '/contact' },
        })}
      />
    );
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
