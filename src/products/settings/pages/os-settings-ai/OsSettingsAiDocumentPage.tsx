import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  OsSettingsAiHeroSlide,
  MemorySlide1,
  RememberedContextSlide2,
  ExplanationPreferencesSlide3,
  CrossResultUseSlide4,
} from './slides';

/** /os/settings/ai — sections in reading order. */
export function OsSettingsAiDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<OsSettingsAiHeroSlide embedded={embedded} />}
    >
      <MemorySlide1 embedded={embedded} />
      <RememberedContextSlide2 embedded={embedded} />
      <ExplanationPreferencesSlide3 embedded={embedded} />
      <CrossResultUseSlide4 embedded={embedded} />
    </DocumentPageLayout>
  );
}
