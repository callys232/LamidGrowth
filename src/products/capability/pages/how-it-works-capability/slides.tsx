import { DocumentHeroSlide } from '../../../../shared/content/slides/DocumentHeroSlide';
import { DocumentSectionSlide } from '../../../../shared/content/slides/DocumentSectionSlide';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';

export function HowItWorksCapabilityHeroSlide({ embedded = false }: DocumentPageProps) {
  return <DocumentHeroSlide page={content} embedded={embedded} />;
}

/** Capability Is More Than Skill */
export function CapabilityIsMoreThanSkillSlide1({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[0]}
      index={0}
      last={false}
      embedded={embedded}
    />
  );
}

/** Personal Capability */
export function PersonalCapabilitySlide2({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[1]}
      index={1}
      last={false}
      embedded={embedded}
    />
  );
}

/** Organizational Capability */
export function OrganizationalCapabilitySlide3({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide
      section={content.sections[2]}
      index={2}
      last={false}
      embedded={embedded}
    />
  );
}

/** Growth Without Capability Becomes Pressure. */
export function GrowthWithoutCapabilityBecomesPressureSlide4({
  embedded = false,
}: DocumentPageProps) {
  return (
    <DocumentSectionSlide section={content.sections[3]} index={3} last={false} embedded={embedded} />
  );
}

/** Build the Project Even When You Do Not Know the Scope. */
export function BuildTheProjectSlide5({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide section={content.sections[4]} index={4} last={false} embedded={embedded} />
  );
}

/** Not Sure Yet Is a Valid Starting Point */
export function NotSureYetSlide6({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentSectionSlide section={content.sections[5]} index={5} last={true} embedded={embedded} />
  );
}
