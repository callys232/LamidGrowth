import { Sparkles } from 'lucide-react';
import { CompanionCompletionStep } from '../components/CompanionCompletionStep';
import { CompanionContextPanel } from '../components/CompanionContextPanel';
import { CompanionContextStep } from '../components/CompanionContextStep';
import { CompanionObjectiveStep } from '../components/CompanionObjectiveStep';
import { CompanionPlanReviewStep } from '../components/CompanionPlanReviewStep';
import type { useCompanionPage } from '../hooks/useCompanionPage';

export function CompanionGuidedPlanningSlide({
  step,
  setStep,
  title,
  setTitle,
  context,
  setContext,
  success,
  setSuccess,
  constraints,
  setConstraints,
  next,
  setNext,
  error,
  busy,
  save,
}: Pick<
  ReturnType<typeof useCompanionPage>,
  | 'step'
  | 'setStep'
  | 'title'
  | 'setTitle'
  | 'context'
  | 'setContext'
  | 'success'
  | 'setSuccess'
  | 'constraints'
  | 'setConstraints'
  | 'next'
  | 'setNext'
  | 'error'
  | 'busy'
  | 'save'
>) {
  return (
    <>
      <div className="companion-layout">
        <section className="companion-panel">
          <div className="companion-top">
            <span className="companion-symbol">
              <Sparkles size={21} />
            </span>
            <div>
              <strong>Your thinking partner</strong>
              <small>Guided planning · based on your inputs</small>
            </div>
            <span className="tag">YOU LEAD</span>
          </div>
          <div className="companion-conversation">
            <CompanionObjectiveStep
              step={step}
              setStep={setStep}
              title={title}
              setTitle={setTitle}
            />
            <CompanionContextStep
              step={step}
              title={title}
              setStep={setStep}
              context={context}
              setContext={setContext}
              success={success}
              setSuccess={setSuccess}
              constraints={constraints}
              setConstraints={setConstraints}
            />
            <CompanionPlanReviewStep
              step={step}
              title={title}
              context={context}
              success={success}
              constraints={constraints}
              next={next}
              setNext={setNext}
              error={error}
              setStep={setStep}
              busy={busy}
              save={save}
            />
            <CompanionCompletionStep step={step} />
          </div>
        </section>
        <CompanionContextPanel step={step} />
      </div>
    </>
  );
}
