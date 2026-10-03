import { UpdatedDocumentPage } from '../../../../shared/content/UpdatedDocumentPage';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { HomeFooter } from './components/HomeFooter';
import { HomeVideoHero } from './components/HomeVideoHero';
import { HomeHeroSlide } from './slides/HomeHeroSlide';
import { HomeCompanionSlide } from './slides/HomeCompanionSlide';
import { HomeExperienceSlide } from './slides/HomeExperienceSlide';
import { HomeOutcomesSlide } from './slides/HomeOutcomesSlide';
import { HomeIntelligenceSlide } from './slides/HomeIntelligenceSlide';
import { HomeRhythmSlide } from './slides/HomeRhythmSlide';
import { HomeExpansionSlide } from './slides/HomeExpansionSlide';
import { HomeClosingSlide } from './slides/HomeClosingSlide';
import { HomePillarsSlide } from './slides/HomePillarsSlide';
import { HomeHowItWorksSlide } from './slides/HomeHowItWorksSlide';
import { HomeNarrativeSlide } from './slides/HomeNarrativeSlide';
import {
  HomePhilosophySlide,
  HomePortalExperienceSlide,
  HomeWhySlide,
} from './slides/HomeLongFormSlides';
import './home.css';

/** Preserve the GitHub homepage's original section components and reading order.
 * The approved video hero and document additions use homepage-owned presentation. */
export function HomeDocumentPage({ embedded = false }: DocumentPageProps) {
  if (embedded) return <UpdatedDocumentPage content={content} embedded />;
  return (
    <div className="lamid-home" data-source-page={content.page}>
      <HomeVideoHero />
      <HomeHeroSlide />
      <HomeCompanionSlide />
      <HomeExperienceSlide />
      <HomeOutcomesSlide />
      <HomeIntelligenceSlide />
      <HomeRhythmSlide />
      <HomeExpansionSlide />
      <HomeClosingSlide />
      <HomePillarsSlide />
      <HomeHowItWorksSlide />
      <HomeWhySlide />
      <HomePortalExperienceSlide />
      <HomePhilosophySlide />
      <HomeNarrativeSlide />
      <HomeFooter />
    </div>
  );
}
