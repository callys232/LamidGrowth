import { UpdatedDocumentPage } from '../../../../shared/content/UpdatedDocumentPage';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { HomeFooter } from './components/HomeFooter';
import {
  LandingAi,
  LandingClose,
  LandingHero,
  LandingProducts,
  LandingResults,
  LandingTiles,
  LandingTrust,
  LandingWhatIs,
} from './landing/Landing';
import './home.css';

/** Preserve the GitHub homepage's original section components and reading order.
 * The approved video hero and document additions use homepage-owned presentation. Three original
 * slides that the document additions now cover (the companion steps, Continuous Intelligence and
 * the first closing call to action) moved to /about — see movedFromHome in AboutDocumentPage. */
export function HomeDocumentPage({ embedded = false }: DocumentPageProps) {
  if (embedded) return <UpdatedDocumentPage content={content} embedded />;
  return (
    <div className="lamid-home" data-source-page={content.page}>
      <LandingHero />
      <LandingTiles />
      <LandingWhatIs />
      <LandingTrust />
      <LandingProducts />
      <LandingAi />
      <LandingResults />
      <LandingClose />
      <HomeFooter />
    </div>
  );
}
