import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  EnterpriseHeroSlide,
  EnterpriseArchitectureSlide1,
  GovernanceArchitectureSlide2,
  IntegrationArchitectureSlide3,
  EvaluateTrustControlSlide4,
} from './slides';

/** /enterprise — sections in reading order. */
export function EnterpriseDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<EnterpriseHeroSlide embedded={embedded} />}
    >
      <EnterpriseArchitectureSlide1 embedded={embedded} />
      <GovernanceArchitectureSlide2 embedded={embedded} />
      <IntegrationArchitectureSlide3 embedded={embedded} />
      <EvaluateTrustControlSlide4 embedded={embedded} />
    </DocumentPageLayout>
  );
}
