import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  HelpAccountHeroSlide,
  WorkspacesSlide1,
  PlansBillingSlide2,
  ResolveAnAccessIssueSlide3,
} from './slides';

/** /help/account — sections in reading order. */
export function HelpAccountDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<HelpAccountHeroSlide embedded={embedded} />}
    >
      <WorkspacesSlide1 embedded={embedded} />
      <PlansBillingSlide2 embedded={embedded} />
      <ResolveAnAccessIssueSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
