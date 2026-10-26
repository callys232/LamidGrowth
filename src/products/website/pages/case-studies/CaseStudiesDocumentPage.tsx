import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { InfoPage, fromContent } from '../info/InfoPage';
import {
  CaseStudiesHeroSlide,
  WhatEachCaseStudyShowsSlide1,
  EvidenceByOutcomeSlide2,
  FromEvidenceToActionSlide3,
} from './slides';

/** /case-studies — sections in reading order. */
export function CaseStudiesDocumentPage({ embedded = false }: DocumentPageProps) {
  if (!embedded)
    return (
      <InfoPage
        content={fromContent(content, {
          eyebrow: 'Case studies',
          primary: { label: 'Get started', to: '/signup' },
          secondary: { label: 'Contact us', to: '/contact' },
        })}
      />
    );
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<CaseStudiesHeroSlide embedded={embedded} />}
    >
      <WhatEachCaseStudyShowsSlide1 embedded={embedded} />
      <EvidenceByOutcomeSlide2 embedded={embedded} />
      <FromEvidenceToActionSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
