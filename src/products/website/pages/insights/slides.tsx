import { DocumentHeroSlide } from '../../../../shared/content/slides/DocumentHeroSlide';
import { DocumentSectionSlide } from '../../../../shared/content/slides/DocumentSectionSlide';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';

export function InsightsHeroSlide({ embedded = false }: DocumentPageProps) {
  const page = embedded
    ? content
    : {
        ...content,
        hero: {
          ...content.hero,
          paragraphs: content.hero.paragraphs.map((p) =>
            p.text.startsWith('CTA:') ? { ...p, text: 'CTA: Browse playbooks' } : p,
          ),
        },
      };
  return <DocumentHeroSlide page={page} embedded={embedded} />;
}

/** Topics */
export function TopicsSlide1({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[0]}
      index={0}
      last={false}
      embedded={embedded}
    />
  );
}

/** Useful by Design */
export function UsefulByDesignSlide2({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[1]}
      index={1}
      last={false}
      embedded={embedded}
    />
  );
}

/** Outcome Collections */
export function OutcomeCollectionsSlide3({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide section={content.sections[2]} index={2} last={true} embedded={embedded} />
  );
}
