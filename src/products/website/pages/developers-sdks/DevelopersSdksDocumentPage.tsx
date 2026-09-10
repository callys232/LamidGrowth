import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  DevelopersSdksHeroSlide,
  SdkAreasSlide1,
  ListenForWorkflowCompletionSlide2,
  SupportedVersionsSlide3,
} from './slides';

/** /developers/sdks — sections in reading order. */
export function DevelopersSdksDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<DevelopersSdksHeroSlide embedded={embedded} />}
    >
      <SdkAreasSlide1 embedded={embedded} />
      <ListenForWorkflowCompletionSlide2 embedded={embedded} />
      <SupportedVersionsSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
