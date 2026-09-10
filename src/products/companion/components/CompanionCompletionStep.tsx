import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { useCompanionPage } from '../hooks/useCompanionPage';
export function CompanionCompletionStep({
  step,
}: Pick<ReturnType<typeof useCompanionPage>, 'step'>) {
  return (
    <>
      {step === 3 && (
        <div className="companion-complete">
          <CheckCircle2 size={40} strokeWidth={1.2} />
          <h2>
            A clearer direction.
            <br />A concrete next step.
          </h2>
          <p>Your objective is saved in Clarity. Your context will be here when you return.</p>
          <Link className="button button-primary" to="/os/clarity">
            See your objective <ArrowUpRight size={16} />
          </Link>
        </div>
      )}
    </>
  );
}
