import { PagePlanContext, planPage } from '../../../../../shared/content/pagePlan';
import { DocumentSectionSlide } from '../../../../../shared/content/slides/DocumentSectionSlide';
import content from '../content.json';

const sections = content.sections.filter((s) => 'longForm' in s && s.longForm);
const plan = { plans: planPage(sections) };

/** The homepage's long-form copy (Why LAMID ONE, Portal Experience, Philosophy), collapsed: each
 * shows its title and a teaser and opens in place, so the page itself stays Pithy and taglines. */
export function HomeLongFormSlide() {
  return (
    <section className="home-section home-longform" aria-label="In depth">
      <div className="home-container canonical-copy">
        <PagePlanContext.Provider value={plan}>
          <div className="page-flow">
            {sections.map((section, index) => (
              <DocumentSectionSlide key={section.label} section={section} index={index} />
            ))}
          </div>
        </PagePlanContext.Provider>
      </div>
    </section>
  );
}
