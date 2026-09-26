import { useIntelligencePage } from '../hooks/useIntelligencePage';
import { IntelligenceHeadingSlide } from '../slides/IntelligenceHeadingSlide';
import { IntelligencePolicySlide } from '../slides/IntelligencePolicySlide';
import { IntelligenceProviderStatusSlide } from '../slides/IntelligenceProviderStatusSlide';
import { IntelligenceReviewHistorySlide } from '../slides/IntelligenceReviewHistorySlide';
import { IntelligenceReviewRequestSlide } from '../slides/IntelligenceReviewRequestSlide';
import { IntelligenceModelExecutionsSlide } from '../slides/IntelligenceModelExecutionsSlide';

/** Compose the page in reading order. Edit each section in ../slides. */
export function Intelligence(props: { settings?: boolean }) {
  const page = useIntelligencePage(props);
  return (
    <>
      <IntelligenceHeadingSlide settings={page.settings} />
      <IntelligenceProviderStatusSlide error={page.error} policy={page.policy} />
      <IntelligencePolicySlide
        settings={page.settings}
        policy={page.policy}
        state={page.state}
        configure={page.configure}
        busy={page.busy}
      />
      <IntelligenceReviewRequestSlide
        settings={page.settings}
        policy={page.policy}
        state={page.state}
        review={page.review}
        objectiveId={page.objectiveId}
        setObjectiveId={page.setObjectiveId}
        knowledge={page.knowledge}
        busy={page.busy}
      />
      <IntelligenceReviewHistorySlide
        reviews={page.reviews}
        settings={page.settings}
        state={page.state}
        load={page.load}
        setError={page.setError}
        newAction={page.newAction}
      />
      <IntelligenceModelExecutionsSlide settings={page.settings} />
    </>
  );
}
