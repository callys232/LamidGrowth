import { DocumentHeroSlide } from '../../../../shared/content/slides/DocumentHeroSlide';
import { DocumentSectionSlide } from '../../../../shared/content/slides/DocumentSectionSlide';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';

export function VerifyHeroSlide({ embedded = false }: DocumentPageProps) {
  return <DocumentHeroSlide page={content} embedded={embedded} />;
}

/** Verification Status */
export function VerificationStatusSlide1({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[0]}
      index={0}
      last={false}
      embedded={embedded}
    />
  );
}

/** Resend Verification */
export function ResendVerificationSlide2({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[1]}
      index={1}
      last={false}
      embedded={embedded}
    />
  );
}

/** Continue */
export function ContinueSlide3({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide section={content.sections[2]} index={2} last={true} embedded={embedded} />
  );
}
