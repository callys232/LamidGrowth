import { UpdatedDocumentPage } from '../../../../shared/content/UpdatedDocumentPage';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { HomeFooter } from './components/HomeFooter';
import { HomeVideoHero } from './components/HomeVideoHero';
import { HomeHeroSlide } from './slides/HomeHeroSlide';
import { HomeExperienceSlide } from './slides/HomeExperienceSlide';
import { HomeOutcomesSlide } from './slides/HomeOutcomesSlide';
import { HomeRhythmSlide } from './slides/HomeRhythmSlide';
import { HomeExpansionSlide } from './slides/HomeExpansionSlide';
import { HomePillarsSlide } from './slides/HomePillarsSlide';
import { HomeHowItWorksSlide } from './slides/HomeHowItWorksSlide';
import { HomeNarrativeSlide } from './slides/HomeNarrativeSlide';
import { HomeLongFormSlide } from './slides/HomeLongFormSlide';
import './home.css';

/** Preserve the GitHub homepage's original section components and reading order.
 * The approved video hero and document additions use homepage-owned presentation. Three original
 * slides that the document additions now cover (the companion steps, Continuous Intelligence and
 * the first closing call to action) moved to /about — see movedFromHome in AboutDocumentPage. */
export function HomeDocumentPage({ embedded = false }: DocumentPageProps) {
  if (embedded) return <UpdatedDocumentPage content={content} embedded />;
  return (
    <div className="lamid-home" data-source-page={content.page}>
      <HomeVideoHero />
      <HomeHeroSlide />
      <HomeExperienceSlide />
      <HomeOutcomesSlide />
      <HomeRhythmSlide />
      <HomeExpansionSlide />
      <HomePillarsSlide />
      <HomeHowItWorksSlide />
      <HomeLongFormSlide />
      <HomeNarrativeSlide />
      <HomeFooter />
    </div>
  );
}
