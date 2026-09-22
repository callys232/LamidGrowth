import { useCompanionPage } from '../hooks/useCompanionPage';
import { CompanionGuidedPlanningSlide } from '../slides/CompanionGuidedPlanningSlide';
import { CompanionHeadingSlide } from '../slides/CompanionHeadingSlide';
import { CompanionPathwayProgress } from '../components/CompanionPathwayProgress';

/** Compose the page in reading order. Edit each section in ../slides. */
export function Companion() {
  const page = useCompanionPage();
  return (
    <>
      <CompanionHeadingSlide />
      <CompanionGuidedPlanningSlide
        aiPolicy={page.aiPolicy}
        consent={page.consent}
        setConsent={page.setConsent}
        source={page.source}
        assumptions={page.assumptions}
        pathway={page.pathway}
        setPathway={page.setPathway}
        approach={page.approach}
        previewing={page.previewing}
        prepareReview={page.prepareReview}
        savedId={page.savedId}
        reset={page.reset}
        step={page.step}
        setStep={page.setStep}
        title={page.title}
        setTitle={page.setTitle}
        context={page.context}
        setContext={page.setContext}
        success={page.success}
        setSuccess={page.setSuccess}
        constraints={page.constraints}
        setConstraints={page.setConstraints}
        next={page.next}
        setNext={page.setNext}
        error={page.error}
        busy={page.busy}
        save={page.save}
      />
      <CompanionPathwayProgress
        onDeleted={(id) => {
          if (id === page.savedId) page.reset();
        }}
      />
    </>
  );
}
