import type { Domain } from '../../../shared/workspace/domains';
import { isOpenDispute } from '../../../shared/workspace/disputeStatus';
import type { Kpi } from '../../workspace/overview/overviewModel';

/** A dispute resolution record (records.kind = 'dispute_resolution' in src/app/projects.mjs). */
export type DisputeResolution = {
  outcome: string;
  note: string;
  proposedBy: string;
  status: string;
  version: number;
  proposedAt?: string;
  respondedBy?: string;
  respondedAt?: string;
};
/** A row of GET /api/disputes. */
export type Dispute = {
  id: string;
  reason: string;
  status: string;
  milestone_title: string;
  project_title: string;
  project_id: string;
  opened_by?: string;
  created_at?: string;
  resolution: null | DisputeResolution;
};
export type DisputeStep = {
  key: 'opened' | 'proposal' | 'response' | 'resolved' | 'waiting';
  label: string;
  detail?: string;
  at: string | null;
  side: 'you' | 'them' | null;
  tone: Domain | 'neutral';
};

export const OUTCOME_LABEL: Record<string, string> = {
  revision: 'Revised work',
  refund: 'A refund',
  release: 'Payment for the work',
};
const outcomeOf = (status: string) => status.replace(/^resolved_/, '');
export const isResolved = (item: Dispute) => item.status.startsWith('resolved');

/** The other party proposed a resolution that you have not answered yet. */
export function awaitingYou(item: Dispute, userId: string) {
  return (
    isOpenDispute(item.status) &&
    item.resolution?.status === 'proposed' &&
    item.resolution.proposedBy !== userId
  );
}

/** Card state: awaiting your answer, your proposal pending, open without a proposal, or resolved. */
export function disputeState(item: Dispute, userId: string) {
  if (!isOpenDispute(item.status)) return 'resolved';
  if (awaitingYou(item, userId)) return 'awaiting';
  if (item.resolution?.status === 'proposed') return 'proposed';
  return 'open';
}

export function disputeKpis(items: Dispute[], userId: string): Kpi[] {
  const open = items.filter((item) => isOpenDispute(item.status));
  const waiting = open.filter((item) => awaitingYou(item, userId));
  const resolved = items.filter(isResolved);
  return [
    {
      domain: 'risk',
      label: 'Open',
      value: String(open.length),
      hint: open.length ? 'Being worked out with the other party' : 'Nothing in dispute',
      to: '/os/disputes',
    },
    {
      domain: 'opportunities',
      label: 'Awaiting your response',
      value: String(waiting.length),
      hint: waiting.length ? 'A proposal needs your answer' : 'No proposals waiting on you',
      to: '/os/disputes',
    },
    {
      domain: 'money',
      label: 'Resolved',
      value: String(resolved.length),
      hint: 'Agreed by both parties',
      to: '/os/disputes?tab=resolved',
    },
  ];
}

/** Both parties' steps, oldest first: opened → proposal → response → resolved, ending on a
 * waiting step while the dispute is open. Only recorded steps appear. */
export function disputeTimeline(item: Dispute, userId: string): DisputeStep[] {
  const side = (who?: string) => (who ? (who === userId ? 'you' : 'them') : null);
  const steps: DisputeStep[] = [
    {
      key: 'opened',
      label: 'Dispute opened',
      detail: item.reason,
      at: item.created_at ?? null,
      side: side(item.opened_by),
      tone: 'risk',
    },
  ];
  const resolution = item.resolution;
  if (resolution) {
    steps.push({
      key: 'proposal',
      label: `Proposed: ${OUTCOME_LABEL[resolution.outcome] ?? resolution.outcome}`,
      detail: resolution.note,
      at: resolution.proposedAt ?? null,
      side: side(resolution.proposedBy),
      tone: 'opportunities',
    });
    if (resolution.status === 'accepted' || resolution.status === 'rejected')
      steps.push({
        key: 'response',
        label: resolution.status === 'accepted' ? 'Proposal accepted' : 'Proposal rejected',
        at: resolution.respondedAt ?? null,
        side: side(resolution.respondedBy),
        tone: resolution.status === 'accepted' ? 'money' : 'risk',
      });
  }
  if (isResolved(item))
    steps.push({
      key: 'resolved',
      label: `Resolved — ${OUTCOME_LABEL[outcomeOf(item.status)] ?? outcomeOf(item.status)}`,
      detail: 'Any payment action happens on the project.',
      at: resolution?.respondedAt ?? null,
      side: null,
      tone: 'money',
    });
  else if (isOpenDispute(item.status))
    steps.push({
      key: 'waiting',
      label:
        resolution?.status === 'proposed'
          ? awaitingYou(item, userId)
            ? 'Waiting for your response'
            : 'Waiting for the other party to respond'
          : 'Waiting for a proposal',
      at: null,
      side: null,
      tone: 'neutral',
    });
  return steps;
}
