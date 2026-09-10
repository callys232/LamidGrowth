import { ArrowRight, ArrowUpRight, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Eyebrow } from '../../../shared/ui/Eyebrow';
import type { useDashboardPage } from '../hooks/useDashboardPage';

export function DashboardFocusSlide({
  active,
  pending,
}: Pick<ReturnType<typeof useDashboardPage>, 'active' | 'pending'>) {
  return (
    <>
      <section className="dashboard-intro">
        <div className="focus-panel">
          <div className="focus-copy">
            <Eyebrow>
              <span className="live-dot" /> YOUR NEXT CHAPTER
            </Eyebrow>
            <h2>
              {active.length
                ? 'Meaningful progress.\nOne clear step at a time.'
                : 'Every next chapter\nstarts with a clear intent.'}
            </h2>
            <p>
              {active.length
                ? `You’re working toward ${active.length} ${active.length === 1 ? 'objective' : 'objectives'}. Keep your priorities close, and your next action closer.`
                : 'Bring an objective into focus. Connect the context, define success, and make your next move.'}
            </p>
            <Link to="/os/companion" className="button button-light">
              <Sparkles size={15} /> Think it through with Companion <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="focus-orbit" aria-hidden="true">
            <div />
            <div />
            <div />
            <span>ONE</span>
            <i />
          </div>
          <span className="focus-footnote">YOUR CONTEXT. YOUR DIRECTION.</span>
        </div>
        <div className="judgment-panel">
          <div>
            <span className="judgment-icon">
              <ShieldCheck size={20} />
            </span>
            <span className="tag">HUMAN JUDGMENT</span>
          </div>
          <h3>
            {pending.length ? 'Your perspective\nmakes the difference.' : 'You’re in control.'}
          </h3>
          <p>
            {pending.length
              ? `${pending.length} ${pending.length === 1 ? 'action is' : 'actions are'} ready for your review. A small decision can unlock the next step.`
              : 'Nothing is waiting for approval. Keep building at your own pace.'}
          </p>
          <Link to="/os/governance">
            {pending.length ? 'Review what needs you' : 'See your activity'}
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </>
  );
}
