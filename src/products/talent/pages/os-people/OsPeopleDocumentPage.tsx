import { Link } from 'react-router-dom';
import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  OsPeopleHeroSlide,
  CapabilityRequirementsSlide1,
  StrengthsSlide2,
  GapsSlide3,
  CareerAndRolePathwaysSlide4,
  ChooseHowToCloseTheGapSlide5,
} from './slides';

/** /os/people — sections in reading order. The "Getting started" reference panel these render
 * into (see CanonicalCopy, embedded=true) is otherwise pure static copy with no links anywhere —
 * these describe real, reachable features, so they're made real navigation here. Requirements/
 * Strengths/Gaps all live together on the real /os/capability page (per-objective, not as
 * separate sections there), so all three point at it; "Choose How to Close the Gap" names "Tool
 * Fabric support" directly, which is /os/engines. */
export function OsPeopleDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<OsPeopleHeroSlide embedded={embedded} />}
    >
      {embedded ? (
        <Link className="section-reference-link" to="/os/capability">
          <CapabilityRequirementsSlide1 embedded={embedded} />
        </Link>
      ) : (
        <CapabilityRequirementsSlide1 embedded={embedded} />
      )}
      {embedded ? (
        <Link className="section-reference-link" to="/os/capability">
          <StrengthsSlide2 embedded={embedded} />
        </Link>
      ) : (
        <StrengthsSlide2 embedded={embedded} />
      )}
      {embedded ? (
        <Link className="section-reference-link" to="/os/capability">
          <GapsSlide3 embedded={embedded} />
        </Link>
      ) : (
        <GapsSlide3 embedded={embedded} />
      )}
      {embedded ? (
        <Link className="section-reference-link" to="/os/talent">
          <CareerAndRolePathwaysSlide4 embedded={embedded} />
        </Link>
      ) : (
        <CareerAndRolePathwaysSlide4 embedded={embedded} />
      )}
      {embedded ? (
        <Link className="section-reference-link" to="/os/engines">
          <ChooseHowToCloseTheGapSlide5 embedded={embedded} />
        </Link>
      ) : (
        <ChooseHowToCloseTheGapSlide5 embedded={embedded} />
      )}
    </DocumentPageLayout>
  );
}
