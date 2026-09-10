import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  EnterpriseContactHeroSlide,
  YourOrganizationSlide1,
  YourObjectiveSlide2,
  YourEnvironmentSlide3,
  NextStepSlide4,
} from './slides';

/** /enterprise/contact — sections in reading order. */
export function EnterpriseContactDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<EnterpriseContactHeroSlide embedded={embedded} />}
    >
      <YourOrganizationSlide1 embedded={embedded} />
      <YourObjectiveSlide2 embedded={embedded} />
      <YourEnvironmentSlide3 embedded={embedded} />
      <NextStepSlide4 embedded={embedded} />
    </DocumentPageLayout>
  );
}
