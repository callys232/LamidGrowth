import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { InfoPage, info } from '../../../website/pages/info/InfoPage';
import {
  TrustPrivacyHeroSlide,
  WhatInformationIsUsedSlide1,
  WhyItIsUsedSlide2,
  PersonalAndOrganizationalContextSlide3,
  ReviewYourDataFootprintSlide4,
} from './slides';

/** /trust/privacy — sections in reading order. */
export function TrustPrivacyDocumentPage({ embedded = false }: DocumentPageProps) {
  if (!embedded) return <InfoPage content={info.privacy} />;
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<TrustPrivacyHeroSlide embedded={embedded} />}
    >
      <WhatInformationIsUsedSlide1 embedded={embedded} />
      <WhyItIsUsedSlide2 embedded={embedded} />
      <PersonalAndOrganizationalContextSlide3 embedded={embedded} />
      <ReviewYourDataFootprintSlide4 embedded={embedded} />
    </DocumentPageLayout>
  );
}
