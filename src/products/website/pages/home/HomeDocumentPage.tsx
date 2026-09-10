import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import { DocumentHeroSlide } from '../../../../shared/content/slides/DocumentHeroSlide';
import { DocumentSectionSlide } from '../../../../shared/content/slides/DocumentSectionSlide';
import type { DocumentPageProps } from '../../../../shared/content/types';
import { HomeFooter } from './components/HomeFooter';
import content from './content.json';
import { HomeHeroSlide } from './slides/HomeHeroSlide';
import { HomeCompanionSlide } from './slides/HomeCompanionSlide';
import { HomeExperienceSlide } from './slides/HomeExperienceSlide';
import { HomeOutcomesSlide } from './slides/HomeOutcomesSlide';
import { HomeIntelligenceSlide } from './slides/HomeIntelligenceSlide';
import { HomeRhythmSlide } from './slides/HomeRhythmSlide';
import { HomeExpansionSlide } from './slides/HomeExpansionSlide';
import { HomeClosingSlide } from './slides/HomeClosingSlide';
import './home.css';

/** Homepage sections in reading order. All homepage styling is scoped in home.css. */
export function HomeDocumentPage({ embedded = false }: DocumentPageProps) {
  if (embedded)
    return (
      <DocumentPageLayout
        page={content}
        embedded
        hero={<DocumentHeroSlide page={content} embedded />}
      >
        {content.sections.map((section, index) => (
          <DocumentSectionSlide
            key={section.label}
            section={section}
            index={index}
            last={index === content.sections.length - 1}
            embedded
          />
        ))}
      </DocumentPageLayout>
    );
  return (
    <div className="lamid-home" data-source-page={content.page}>
      <HomeHeroSlide />
      <HomeCompanionSlide />
      <HomeExperienceSlide />
      <HomeOutcomesSlide />
      <HomeIntelligenceSlide />
      <HomeRhythmSlide />
      <HomeExpansionSlide />
      <HomeClosingSlide />
      <HomeFooter />
    </div>
  );
}
