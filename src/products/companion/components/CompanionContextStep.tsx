import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { Field } from '../../../shared/ui/Field';
import type { useCompanionPage } from '../hooks/useCompanionPage';
export function CompanionContextStep({
  step,
  title,
  setStep,
  context,
  setContext,
  success,
  setSuccess,
  constraints,
  setConstraints,
  prepareReview,
}: Pick<
  ReturnType<typeof useCompanionPage>,
  | 'step'
  | 'title'
  | 'setStep'
  | 'context'
  | 'setContext'
  | 'success'
  | 'setSuccess'
  | 'constraints'
  | 'setConstraints'
  | 'prepareReview'
>) {
  return (
    <>
      {step === 1 && (
        <>
          <div className="user-message">{title}</div>
          <div className="companion-message">
            <h2>Give the objective some context.</h2>
            <p>
              What is happening, what would success look like, and what boundaries should stay in
              view?
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void prepareReview();
            }}
          >
            <Field label="The situation">
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={3}
                maxLength={5000}
                required
                placeholder="What makes this important now?"
              />
            </Field>
            <Field label="A meaningful outcome">
              <input
                value={success}
                onChange={(e) => setSuccess(e.target.value)}
                maxLength={5000}
                required
                placeholder="I’ll know I’ve made progress when…"
              />
            </Field>
            <Field label="Constraints or assumptions">
              <input
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                maxLength={5000}
                placeholder="Time, budget, people, or things to validate"
              />
            </Field>
            <div className="modal-actions">
              <Button variant="ghost" onClick={() => setStep(0)}>
                <ArrowLeft size={15} /> Back
              </Button>
              <Button type="submit">
                Explore a pathway <ArrowRight size={16} />
              </Button>
            </div>
          </form>
        </>
      )}
    </>
  );
}
