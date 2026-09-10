import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  IntegrationsHeroSlide,
  IntegrationCategoriesSlide1,
  ControlTheConnectionSlide2,
  ReduceFragmentationWithoutCreatingANewSiloSlide3,
} from './slides';

/** /integrations — sections in reading order. */
export function IntegrationsDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<IntegrationsHeroSlide embedded={embedded} />}
    >
      <IntegrationCategoriesSlide1 embedded={embedded} />
      <ControlTheConnectionSlide2 embedded={embedded} />
      <ReduceFragmentationWithoutCreatingANewSiloSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
