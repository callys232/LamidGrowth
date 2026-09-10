import { ArrowLeft, Check } from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { Eyebrow } from '../../../shared/ui/Eyebrow';
import { Field } from '../../../shared/ui/Field';
import type { useCompanionPage } from '../hooks/useCompanionPage';
export function CompanionPlanReviewStep({
  step,
  title,
  context,
  success,
  constraints,
  next,
  setNext,
  error,
  setStep,
  busy,
  save,
}: Pick<
  ReturnType<typeof useCompanionPage>,
  | 'step'
  | 'title'
  | 'context'
  | 'success'
  | 'constraints'
  | 'next'
  | 'setNext'
  | 'error'
  | 'setStep'
  | 'busy'
  | 'save'
>) {
  return (
    <>
      {step === 2 && (
        <>
          <div className="companion-message">
            <h2>Understanding becomes useful through action.</h2>
            <p>
              Choose one small, concrete next step. This plan comes from your own inputs; review it
              before saving.
            </p>
          </div>
          <div className="plan-summary">
            <Eyebrow>YOUR OBJECTIVE</Eyebrow>
            <h3>{title}</h3>
            <p>{context}</p>
            <dl>
              <dt>Success</dt>
              <dd>{success}</dd>
              <dt>Keep in view</dt>
              <dd>{constraints || 'No constraints recorded.'}</dd>
            </dl>
          </div>
          <Field label="Your next action (optional)">
            <input
              value={next}
              onChange={(e) => setNext(e.target.value)}
              maxLength={500}
              placeholder="One action you can take to move this forward"
            />
          </Field>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <Button variant="ghost" onClick={() => setStep(1)}>
              <ArrowLeft size={15} /> Refine
            </Button>
            <Button disabled={busy} onClick={() => void save()}>
              {busy ? 'Saving…' : 'Save my plan'}
              <Check size={16} />
            </Button>
          </div>
        </>
      )}
    </>
  );
}
