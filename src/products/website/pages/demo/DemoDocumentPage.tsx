import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  DemoHeroSlide,
  ChooseAContextSlide1,
  SeeTheCoreOperatingCycleSlide2,
  PlanATeamExpansionSlide3,
  OneDemoDifferentRelevantDepthSlide4,
} from './slides';

/** /demo — sections in reading order. */
export function DemoDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<DemoHeroSlide embedded={embedded} />}
    >
      <ChooseAContextSlide1 embedded={embedded} />
      <SeeTheCoreOperatingCycleSlide2 embedded={embedded} />
      <PlanATeamExpansionSlide3 embedded={embedded} />
      <OneDemoDifferentRelevantDepthSlide4 embedded={embedded} />
    </DocumentPageLayout>
  );
}
