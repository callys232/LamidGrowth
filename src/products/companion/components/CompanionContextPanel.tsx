import { ShieldCheck } from 'lucide-react';
import { Eyebrow } from '../../../shared/ui/Eyebrow';
import type { useCompanionPage } from '../hooks/useCompanionPage';
export function CompanionContextPanel({ step }: Pick<ReturnType<typeof useCompanionPage>, 'step'>) {
  return (
    <>
      <aside className="companion-context">
        <Eyebrow>YOUR CONTEXT, IN VIEW</Eyebrow>
        <h3>A continuous thread.</h3>
        <p>
          What you bring into this conversation stays connected to the work you choose to create.
        </p>
        <div className="context-step">
          <span className={step >= 0 ? 'current' : ''}>01</span>
          <div>
            <strong>Clarify the objective</strong>
            <small>What matters now?</small>
          </div>
        </div>
        <div className="context-step">
          <span className={step >= 1 ? 'current' : ''}>02</span>
          <div>
            <strong>Understand the situation</strong>
            <small>What shapes your decision?</small>
          </div>
        </div>
        <div className="context-step">
          <span className={step >= 2 ? 'current' : ''}>03</span>
          <div>
            <strong>Make the next move</strong>
            <small>What will you do next?</small>
          </div>
        </div>
        <div className="companion-boundary">
          <ShieldCheck size={20} />
          <strong>Your judgment comes first.</strong>
          <p>
            Nothing is saved until you choose. No external systems are contacted and no work runs in
            the background.
          </p>
        </div>
      </aside>
    </>
  );
}
