import { Fragment } from 'react';
import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import { DocumentSectionSlide } from '../../../../shared/content/slides/DocumentSectionSlide';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { ExpertNetworkHeroSlide } from './slides';
import { ExpertHero } from './components/ExpertHero';
import { ExpertPhaseBand, groupExpertSections } from './components/ExpertPhaseBand';
import './experts.css';

const TONES = ['plain', 'tint', 'plain', 'tint', 'dark'] as const;

/** /experts — the consolidated Expert Network page: discovery, matching, verification,
 * capability strategy and joining as an expert, all in one page rather than five near-empty ones.
 * Bespoke layout groups the page's real content.json `group` tags into banded phases; embedded
 * rendering (the collapsed "Full page copy" reference) falls back to the generic document
 * template, same as every other document page. */
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
  return (
    <div className="expert-page" data-source-page={content.page}>
      <ExpertHero />
      {groups.map((group, index) => (
        <ExpertPhaseBand
          key={group.name}
          index={index}
          group={group}
          tone={TONES[index % TONES.length]}
        />
      ))}
    </div>
  );
}
