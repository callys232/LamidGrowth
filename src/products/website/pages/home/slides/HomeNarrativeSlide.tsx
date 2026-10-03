import { CopyLine } from '../../../../../shared/content/CopyLine';
import { homeSection } from './HomeLongFormSlides';

/** Narrative: the closing statement and the homepage's final call to action. */
export function HomeNarrativeSlide() {
  const [title, story, refrain, actions] = homeSection('Narrative').paragraphs;
  return (
    <section
      className="home-section home-closing-section"
      id={`section-${title.sourceParagraph}`}
      aria-labelledby="home-heading-narrative"
    >
      <div className="home-container">
        <header className="home-section-heading">
          <span className="home-eyebrow">
            <span className="home-red-dot" aria-hidden="true" />
            <span id="home-heading-narrative" data-source-paragraph={title.sourceParagraph}>
              {title.text}
            </span>
          </span>
        </header>
        <p className="home-narrative-story" data-source-paragraph={story.sourceParagraph}>
          {story.text}
        </p>
        <h2 className="home-narrative-refrain" data-source-paragraph={refrain.sourceParagraph}>
          {refrain.text}
        </h2>
        <CopyLine text={actions.text} paragraph={actions.sourceParagraph} />
      </div>
    </section>
  );
}
