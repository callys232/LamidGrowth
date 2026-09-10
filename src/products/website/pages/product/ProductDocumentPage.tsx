import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { WorkspacePreview } from '../home/components/WorkspacePreview';
import '../home/home.css';
import {
  ProductHeroSlide,
  StartWithYourObjectiveSlide1,
  ContinuousIntelligenceKeepsTheOperatingContextCurrentSlide2,
  PersistentProgressionSlide3,
  OneOsDifferentRelevantDepthSlide4,
} from './slides';

/** /product — sections in reading order. */
export function ProductDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<ProductHeroSlide embedded={embedded} />}
    >
      <StartWithYourObjectiveSlide1 embedded={embedded} />
      {!embedded && (
        <section
          className="lamid-home product-workspace-example"
          aria-label="Explore the workspace"
        >
          <WorkspacePreview />
        </section>
      )}
      <ContinuousIntelligenceKeepsTheOperatingContextCurrentSlide2 embedded={embedded} />
      <PersistentProgressionSlide3 embedded={embedded} />
      <OneOsDifferentRelevantDepthSlide4 embedded={embedded} />
    </DocumentPageLayout>
  );
}
