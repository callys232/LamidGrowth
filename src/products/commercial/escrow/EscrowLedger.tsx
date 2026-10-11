import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Domain } from '../../../shared/workspace/domains';
import { StatusPill } from '../../../shared/workspace/ui/StatusPill';
import type { SummaryMilestone, SummaryProject } from '../escrowSummary';
import {
  currencyTotals,
  matchesFilter,
  milestoneTimeline,
  money,
  type CurrencyTotal,
  type EscrowFilter,
} from './escrowModel';

const FUNDING_TONE: Record<string, Domain | 'neutral'> = {
  held: 'money',
  released: 'work',
  refunded: 'risk',
  pending: 'opportunities',
};
const FUNDING_LABEL: Record<string, string> = {
  held: 'Held',
  released: 'Released',
  refunded: 'Refunded',
  pending: 'Awaiting payment',
};
const SEGMENTS = ['held', 'released', 'refunded', 'pending'] as const;
const when = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(
        new Date(iso),
      )
    : '';

/** One currency's funds split by status, with a legend. */
export function CurrencyBar({ total }: { total: CurrencyTotal }) {
  return (
    <div className="ws-currency">
      <div className="ws-currency-head">
        <strong>{total.currency}</strong>
        <span>{money(total.total, total.currency)} across all milestones</span>
      </div>
      <div className="ws-currency-bar" role="img" aria-label={`${total.currency} funds by status`}>
        {SEGMENTS.filter((key) => total[key] > 0).map((key) => (
          <span
            key={key}
            data-status={key}
            style={{ width: `${(total[key] / total.total) * 100}%` }}
            title={`${FUNDING_LABEL[key]}: ${money(total[key], total.currency)}`}
          />
        ))}
      </div>
      <ul className="ws-currency-legend">
        {SEGMENTS.map((key) => (
          <li key={key} data-status={key}>
            <i aria-hidden="true" />
            <span>{FUNDING_LABEL[key]}</span>
            <strong>{money(total[key], total.currency)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LedgerRow({ milestone }: { milestone: SummaryMilestone }) {
  const [open, setOpen] = useState(false);
  const status = milestone.funding?.status;
  const steps = milestoneTimeline(milestone);
  const id = `timeline-${milestone.id}`;
  return (
    <li className="ws-ledger-row" data-open={open || undefined}>
      <div className="ws-ledger-line">
        <span className="ws-ledger-title">
          <strong>{milestone.title}</strong>
          <small>Milestone · {milestone.status.replaceAll('_', ' ')}</small>
        </span>
        <StatusPill tone={status ? FUNDING_TONE[status] : 'neutral'}>
          {status ? FUNDING_LABEL[status] : 'Not funded'}
        </StatusPill>
        <span className="ws-ledger-amount">
          {milestone.funding
            ? money(Number(milestone.funding.amount_minor), milestone.funding.currency)
            : money(Math.round(milestone.amount * 100), milestone.currency)}
        </span>
        <button
          type="button"
          className="ws-ledger-toggle"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((value) => !value)}
        >
          <span>Timeline</span>
          <ChevronDown size={15} aria-hidden="true" />
        </button>
      </div>
      {open && (
        <ol className="ws-timeline" id={id}>
          {steps.map((step) => (
            <li key={step.key} data-domain={step.tone === 'neutral' ? undefined : step.tone}>
              <span className="ws-timeline-dot" aria-hidden="true" />
              <span>{step.label}</span>
              {step.at && <time dateTime={step.at}>{when(step.at)}</time>}
            </li>
          ))}
        </ol>
      )}
    </li>
  );
}

/** Milestone funding grouped by project, filtered by status. Team-member projects carry no money
 * and are left out. */
export function EscrowLedger({
  projects,
  filter,
}: {
  projects: SummaryProject[];
  filter: EscrowFilter;
}) {
  const groups = projects
    .filter((p) => !p.isTeamMember)
    .map((project) => ({
      project,
      milestones: project.milestones.filter((m) => matchesFilter(m, filter)),
    }))
    .filter((group) => group.milestones.length > 0);
  if (!groups.length) return <p className="ws-ledger-none">No milestones match this filter.</p>;
  return (
    <div className="ws-ledger">
      {groups.map(({ project, milestones }) => {
        const held = currencyTotals([project]).filter((t) => t.held > 0);
        return (
          <section className="ws-ledger-project" key={project.id}>
            <header>
              <div>
                <Link to={`/os/commercial/projects/${project.id}`}>{project.title}</Link>
                <span>
                  {project.isClient ? 'You fund this project' : 'You deliver this project'} ·{' '}
                  {project.status}
                </span>
              </div>
              {held.length > 0 && (
                <span className="ws-ledger-held">
                  {held.map((t) => money(t.held, t.currency)).join(' · ')} held
                </span>
              )}
            </header>
            <ul>
              {milestones.map((milestone) => (
                <LedgerRow milestone={milestone} key={milestone.id} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
