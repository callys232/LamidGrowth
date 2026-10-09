import {
  LongFormGroup,
  LongFormSection,
} from '../../../../../shared/content/slides/DocumentSectionSlide';
import content from '../content.json';
import { LongFormContent } from '../components/LongFormContent';

const sections = content.sections.filter((s) => 'longForm' in s && s.longForm);

/** The homepage's long-form copy (Why LAMID ONE, Portal Experience, Philosophy), collapsed: each
 * shows its title and a teaser and opens in place, so the page itself stays Pithy and taglines.
 * They form one accordion — opening a card closes the one that was open — on a dark band, and each
 * opens into its own layout (LongFormContent) with an animated illustration in a product window. */
export function HomeLongFormSlide() {
  return (
    <section
      className="home-section home-longform"
      aria-label="In depth"
      data-scroll-feedback="off"
    >
      <div className="home-container canonical-copy">
        <LongFormGroup>
          <div className="page-flow">
            {sections.map((section, index) => {
              const [heading, teaser] = section.paragraphs;
              return (
                <div key={section.label} className="home-longform-card">
                  <article
                    className="flow-section flow-longform"
                    id={`section-${heading.sourceParagraph}`}
                    data-section-anchor=""
                  >
                    <LongFormSection heading={heading} title={section.title} teaser={teaser.text}>
                      <LongFormContent section={section} index={index} />
                    </LongFormSection>
                  </article>
                </div>
              );
            })}
          </div>
        </LongFormGroup>
      </div>
    </section>
  );
}
