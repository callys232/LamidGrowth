import { Link } from 'react-router-dom';
import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  OsInsightsHeroSlide,
  EachMaterialInsightShouldShowSlide1,
  TurnAnInsightIntoActionSlide2,
  WhyNowSlide3,
} from './slides';

/** /os/insights — sections in reading order. "Turn an Insight Into Action" describes the real
 * review-request flow further up this same page (see IntelligenceReviewRequestSlide's
 * id="request-review"), so it's made a real link in the "Getting started" reference panel;
 * "Each Material Insight Should Show" and "Why Now?" describe qualities of a good insight rather
 * than a distinct feature to navigate to, so they stay plain. */
export function OsInsightsDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<OsInsightsHeroSlide embedded={embedded} />}
    >
      <EachMaterialInsightShouldShowSlide1 embedded={embedded} />
      {embedded ? (
        <Link className="section-reference-link" to="/os/insights#request-review">
          <TurnAnInsightIntoActionSlide2 embedded={embedded} />
        </Link>
      ) : (
        <TurnAnInsightIntoActionSlide2 embedded={embedded} />
      )}
      <WhyNowSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
