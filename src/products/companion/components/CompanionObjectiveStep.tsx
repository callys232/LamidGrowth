import { ArrowRight, Plus } from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { Field } from '../../../shared/ui/Field';
import type { useCompanionPage } from '../hooks/useCompanionPage';
export function CompanionObjectiveStep({
  step,
  setStep,
  title,
  setTitle,
}: Pick<ReturnType<typeof useCompanionPage>, 'step' | 'setStep' | 'title' | 'setTitle'>) {
  return (
    <>
      {step === 0 && (
        <>
          <div className="companion-message">
            <h2>Let’s start with what’s on your mind.</h2>
            <p>A decision, an opportunity, a challenge. It doesn’t have to be perfectly formed.</p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setStep(1);
            }}
          >
            <Field label="What do you want to move forward?">
              <textarea
                rows={4}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={500}
                required
                placeholder="I want to…"
              />
            </Field>
            <div className="suggestion-chips">
              {[
                'Bring a business idea into focus',
                'Make a difficult decision',
                'Build a more intentional week',
              ].map((x) => (
                <button key={x} type="button" onClick={() => setTitle(x)}>
                  {x}
                  <Plus size={12} />
                </button>
              ))}
            </div>
            <Button type="submit" disabled={!title.trim()}>
              Bring it into focus <ArrowRight size={16} />
            </Button>
          </form>
        </>
      )}
    </>
  );
}
