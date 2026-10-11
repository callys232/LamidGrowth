import {
  ArrowRight,
  CheckCircle2,
  Plus,
  ShieldAlert,
  Target,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../../shared/ui/Button';
import type { Domain } from '../../../shared/workspace/domains';
import { StatusPill } from '../../../shared/workspace/ui/StatusPill';
import type { NeedsYouItem } from './overviewModel';

const ICONS: Partial<Record<Domain, LucideIcon>> = {
  risk: ShieldAlert,
  work: CheckCircle2,
  money: Wallet,
  talent: Target,
};
const KIND: Partial<Record<Domain, string>> = {
  risk: 'Dispute',
  work: 'Review',
  money: 'Funding',
  talent: 'Match',
};

/** The Overview's work queue, most urgent first. Each row links to where it is resolved. */
export function NeedsYouPanel({
  items,
  loading,
  error,
  retry,
  newObjective,
}: {
  items: NeedsYouItem[];
  loading: boolean;
  error: string;
  retry: () => void;
  newObjective: () => void;
}) {
  return (
    <section className="ws-panel ws-needs-you" aria-labelledby="needs-you-title">
      <div className="ws-panel-heading">
        <div>
          <h2 id="needs-you-title">Needs you</h2>
          <span>Disputes, reviews, funding and new matches — most urgent first.</span>
        </div>
        {items.length > 0 && <StatusPill tone="neutral">{items.length}</StatusPill>}
      </div>
      {error ? (
        <div className="ws-panel-state" role="alert">
          <p>{error}</p>
          <button className="text-button" onClick={retry}>
            Try again
          </button>
        </div>
      ) : loading ? (
        <div className="ws-needs-skeleton" aria-busy="true" aria-label="Loading what needs you">
          <span />
          <span />
          <span />
        </div>
      ) : items.length === 0 ? (
        <div className="ws-panel-state ws-up-to-date">
          <CheckCircle2 size={28} aria-hidden="true" />
          <h3>You’re up to date</h3>
          <p>Nothing is waiting on you. Set a new objective when you’re ready for the next step.</p>
          <Button onClick={newObjective}>
            <Plus size={16} /> New objective
          </Button>
        </div>
      ) : (
        <ul>
          {items.map((item) => {
            const Icon = ICONS[item.domain] ?? CheckCircle2;
            return (
              <li key={item.id} data-domain={item.domain}>
                <Link to={item.to}>
                  <span className="ws-needs-icon" aria-hidden="true">
                    <Icon size={17} />
                  </span>
                  <span className="ws-needs-copy">
                    <span className="ws-needs-kind">{KIND[item.domain] ?? 'Next'}</span>
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                  </span>
                  <ArrowRight className="ws-needs-go" size={16} aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
