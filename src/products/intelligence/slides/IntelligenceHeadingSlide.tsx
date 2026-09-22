import { PageHeading } from '../../../shared/workspace/PageHeading';
import type { useIntelligencePage } from '../hooks/useIntelligencePage';

export function IntelligenceHeadingSlide({
  settings,
}: Pick<ReturnType<typeof useIntelligencePage>, 'settings'>) {
  return (
    <>
      <PageHeading
        eyebrow={settings ? 'AI & CONTEXT CONTROLS' : 'INTELLIGENCE'}
        title={settings ? 'Set the rules for your AI' : 'Review an objective with AI'}
        description="Choose the context to share and keep decisions in your hands."
      />
    </>
  );
}
