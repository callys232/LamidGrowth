import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  DemoRequestHeroSlide,
  WhatAreYouWorkingTowardSlide1,
  WhatShouldWeUnderstandSlide2,
  ChooseTheConversationSlide3,
} from './slides';

/** /demo/request — sections in reading order. */
export function DemoRequestDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<DemoRequestHeroSlide embedded={embedded} />}
    >
      <WhatAreYouWorkingTowardSlide1 embedded={embedded} />
      <WhatShouldWeUnderstandSlide2 embedded={embedded} />
      <ChooseTheConversationSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
