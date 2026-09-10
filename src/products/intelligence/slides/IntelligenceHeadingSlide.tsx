import { PageHeading } from '../../../shared/workspace/PageHeading';
import type { useIntelligencePage } from '../hooks/useIntelligencePage';

export function IntelligenceHeadingSlide({
  settings,
}: Pick<ReturnType<typeof useIntelligencePage>, 'settings'>) {
  return (
    <>
      <PageHeading
        eyebrow={settings ? 'AI & CONTEXT CONTROLS' : 'INTELLIGENCE'}
        title={settings ? 'Control external AI reviews' : 'Review an objective with AI'}
        description="Choose the context to share and keep decisions in your hands."
      />
    </>
  );
}
