import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import { DocumentSectionSlide } from '../../../../shared/content/slides/DocumentSectionSlide';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { ExpertNetworkHeroSlide } from './slides';
import { ExpertHero } from './components/ExpertHero';
import {
  ExpertPhaseBand,
  expertGroupSlug,
  groupExpertSections,
} from './components/ExpertPhaseBand';
import './experts.css';

const TONES = ['plain', 'tint', 'plain', 'tint', 'dark'] as const;
const BAND_ACCENTS = ['#7a2f3a', '#126a6a', '#3a4d8f', '#26753f', '#d49b38'] as const;

/** /experts — the consolidated Expert Network page: discovery, matching, verification,
 * capability strategy and joining as an expert, all in one page with working #anchor targets
 * for the navbar's 5 Experts entries. Embedded rendering falls back to the generic document
 * template. */
export function ExpertsDocumentPage({ embedded = false }: DocumentPageProps) {
  if (embedded)
    return (
      <DocumentPageLayout page={content} embedded hero={<ExpertNetworkHeroSlide embedded />}>
        {content.sections.map((section, index) => (
          <Fragment key={section.label}>
            {'group' in section && section.group && (
              <div className="experts-group-header">
                <span>{section.group}</span>
              </div>
            )}
            <DocumentSectionSlide
              section={section}
              index={index}
              last={index === content.sections.length - 1}
              embedded
            />
          </Fragment>
        ))}
      </DocumentPageLayout>
    );
  const groups = groupExpertSections(content.sections);
  const jumpLinks = groups.map((group) => ({
    label: group.name,
    href: `#${expertGroupSlug(group.name)}`,
  }));
  return (
    <div className="expert-page" data-source-page={content.page}>
      <ExpertHero jumpLinks={jumpLinks} />
      {groups.map((group, index) => (
        <ExpertPhaseBand
          key={group.name}
          index={index}
          group={group}
          tone={TONES[index % TONES.length]}
          accent={BAND_ACCENTS[index % BAND_ACCENTS.length]}
        />
      ))}
      <section className="expert-close">
        <div className="expert-container">
          <h2>Ready to bring specialist judgment into the work?</h2>
          <p>
            Start with a brief, compare verified expertise, or apply to join the Expert Network.
          </p>
          <div className="expert-close-actions">
            <Link className="expert-btn expert-btn-light" to="/contact">
              Talk to an adviser
            </Link>
            <Link className="expert-btn expert-btn-ghost" to="/signup">
              Create an account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
