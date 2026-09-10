import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  DevelopersHeroSlide,
  ApisSlide1,
  SdksSlide2,
  OnePlatformStableExtensionBoundariesSlide3,
} from './slides';

/** /developers — sections in reading order. */
export function DevelopersDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<DevelopersHeroSlide embedded={embedded} />}
    >
      <ApisSlide1 embedded={embedded} />
      <SdksSlide2 embedded={embedded} />
      <OnePlatformStableExtensionBoundariesSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
