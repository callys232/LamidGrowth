import { useCompanionPage } from '../hooks/useCompanionPage';
import { CompanionGuidedPlanningSlide } from '../slides/CompanionGuidedPlanningSlide';
import { CompanionHeadingSlide } from '../slides/CompanionHeadingSlide';

/** Compose the page in reading order. Edit each section in ../slides. */
export function Companion() {
  const page = useCompanionPage();
  return (
    <>
      <CompanionHeadingSlide />
      <CompanionGuidedPlanningSlide
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
    </>
  );
}
