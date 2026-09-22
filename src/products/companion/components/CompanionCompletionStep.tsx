import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { useCompanionPage } from '../hooks/useCompanionPage';
import { Button } from '../../../shared/ui/Button';
export function CompanionCompletionStep({
  step,
  savedId,
  error,
  reset,
}: Pick<ReturnType<typeof useCompanionPage>, 'step' | 'savedId' | 'error' | 'reset'>) {
  return (
    <>
      {step === 3 && (
        <div className="companion-complete">
          <CheckCircle2 size={40} strokeWidth={1.2} />
          <h2>
            A clearer direction.
            <br />A concrete next step.
          </h2>
          <p>
            Your goal is saved in Clarity. Your chosen steps are linked actions. Follow their
            progress below, now or when you return.
          </p>
          {error && <p role="alert">{error}</p>}
          <Link className="button button-primary" to={`/os/consistency?objective=${savedId}`}>
            Follow your actions <ArrowUpRight size={16} />
          </Link>
          <Button variant="ghost" onClick={reset}>
            Plan another goal
          </Button>
        </div>
      )}
    </>
  );
}
