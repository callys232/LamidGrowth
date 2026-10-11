import type { Domain } from '../../../shared/workspace/domains';
import type { Kpi } from '../../workspace/overview/overviewModel';
import type { SummaryMilestone, SummaryProject } from '../escrowSummary';

export type CurrencyTotal = {
  currency: string;
  held: number;
  released: number;
  refunded: number;
  pending: number;
  total: number;
};
export type TimelineStep = {
  key: string;
  label: string;
  at: string | null;
  tone: Domain | 'neutral';
};
/** Ledger filter, carried in the page URL as ?status=. */
export type EscrowFilter = 'all' | 'held' | 'released' | 'refunded' | 'unfunded';

export const money = (minor: number, currency: string) =>
  new Intl.NumberFormat('en', { style: 'currency', currency }).format(minor / 100);

const partyProjects = (projects: SummaryProject[]) => projects.filter((p) => !p.isTeamMember);

/** Funding totals in minor units per currency and status, largest currency first. Amounts in
 * different currencies are never added together. */
export function currencyTotals(projects: SummaryProject[]): CurrencyTotal[] {
  const totals = new Map<string, CurrencyTotal>();
  for (const project of partyProjects(projects))
    for (const { funding } of project.milestones) {
      if (!funding) continue;
      const row = totals.get(funding.currency) ?? {
        currency: funding.currency,
        held: 0,
        released: 0,
        refunded: 0,
        pending: 0,
        total: 0,
      };
      const amount = Number(funding.amount_minor);
      row[funding.status] += amount;
      row.total += amount;
      totals.set(funding.currency, row);
    }
  return [...totals.values()].sort((a, b) => b.total - a.total);
}

/** Milestones on active party projects with no funding yet, or funding still pending. */
export function unfundedMilestones(projects: SummaryProject[]) {
  return partyProjects(projects)
    .filter((p) => p.status === 'active')
    .flatMap((p) => p.milestones.filter((m) => !m.funding || m.funding.status === 'pending'));
}

/** The Escrows page KPIs, valued in the primary (largest) currency; others listed in the hint. */
export function escrowKpis(projects: SummaryProject[]): Kpi[] {
  const [primary, ...others] = currencyTotals(projects);
  const currency = primary?.currency ?? 'USD';
  const value = (key: 'held' | 'released' | 'refunded') => money(primary?.[key] ?? 0, currency);
  const also = (key: 'held' | 'released' | 'refunded', fallback: string) => {
    const rest = others.filter((t) => t[key] > 0);
    return rest.length
      ? `Also ${rest.map((t) => `${money(t[key], t.currency)} ${t.currency}`).join(' · ')}`
      : fallback;
  };
  const awaiting = unfundedMilestones(projects).length;
  return [
    {
      domain: 'money',
      label: 'Held in escrow',
      value: value('held'),
      hint: also('held', 'Secured until delivery is approved'),
      to: '/os/escrows?status=held',
    },
    {
      domain: 'money',
      label: 'Released',
      value: value('released'),
      hint: also('released', 'Paid out for approved work'),
      to: '/os/escrows?status=released',
    },
    {
      domain: 'risk',
      label: 'Refunded',
      value: value('refunded'),
      hint: also('refunded', 'Returned to the client'),
      to: '/os/escrows?status=refunded',
    },
    {
      domain: 'money',
      label: 'Awaiting funding',
      value: String(awaiting),
      hint: `${awaiting === 1 ? 'Milestone' : 'Milestones'} not yet funded`,
      to: '/os/escrows?status=unfunded',
    },
  ];
}

/** Whether a milestone belongs under a ledger filter. */
export function matchesFilter(milestone: SummaryMilestone, filter: EscrowFilter) {
  if (filter === 'all') return true;
  if (filter === 'unfunded') return !milestone.funding || milestone.funding.status === 'pending';
  return milestone.funding?.status === filter;
}

const PAYOUT_LABEL: Record<string, string> = {
  succeeded: 'Payout completed',
  failed: 'Payout failed',
  amount_mismatch: 'Payout held for review',
  processing: 'Payout processing',
  pending: 'Payout queued',
};

/** A milestone's money story, oldest first: funding started → held → released or refunded,
 * then payouts. Only dates the backend recorded appear. */
export function milestoneTimeline(milestone: SummaryMilestone): TimelineStep[] {
  const { funding } = milestone;
  if (!funding) return [{ key: 'unfunded', label: 'Not funded yet', at: null, tone: 'neutral' }];
  const steps: TimelineStep[] = [
    {
      key: 'created',
      label:
        funding.status === 'pending' ? 'Funding started — awaiting payment' : 'Funding started',
      at: funding.created_at ?? null,
      tone: 'neutral',
    },
  ];
  if (funding.held_at)
    steps.push({ key: 'held', label: 'Held in escrow', at: funding.held_at, tone: 'money' });
  if (funding.released_at)
    steps.push({
      key: 'released',
      label: 'Released for approved work',
      at: funding.released_at,
      tone: 'money',
    });
  if (funding.refunded_at)
    steps.push({
      key: 'refunded',
      label: 'Refunded to the client',
      at: funding.refunded_at,
      tone: 'risk',
    });
  const payouts = [...milestone.transfers].sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const transfer of payouts)
    steps.push({
      key: `transfer-${transfer.id}`,
      label: `${PAYOUT_LABEL[transfer.status] ?? `Payout ${transfer.status}`} · ${money(
        Number(transfer.amount_minor),
        transfer.currency,
      )}`,
      at: transfer.created_at,
      tone:
        transfer.status === 'failed' || transfer.status === 'amount_mismatch' ? 'risk' : 'money',
    });
  return steps;
}
