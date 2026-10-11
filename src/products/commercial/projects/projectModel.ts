import type { Kpi } from '../../workspace/overview/overviewModel';
import { currencyTotals, money } from '../escrow/escrowModel';
import type { SummaryProject } from '../escrowSummary';

/** What lifecycle logic needs; project details and escrow-summary rows both fit. */
export type LifecycleProject = {
  status: string;
  milestones: { id: string; title: string; status: string }[];
};
export type ProjectStage = 'setup' | 'delivery' | 'review' | 'closed';

/** Milestone statuses after approval (approved → releasing → paid, src/app/payments.mjs). */
const DONE = new Set(['approved', 'releasing', 'paid']);
/** Delivered work awaiting a decision, or contested. */
const REVIEW = new Set(['submitted', 'in_review', 'disputed']);

export const STAGES: { key: ProjectStage; label: string; hint: string }[] = [
  { key: 'setup', label: 'Set up', hint: 'Milestones agreed' },
  { key: 'delivery', label: 'Delivery', hint: 'Work under way' },
  { key: 'review', label: 'Review', hint: 'Deliverables being approved' },
  { key: 'closed', label: 'Closed', hint: 'Outcome recorded' },
];

export function projectProgress(project: LifecycleProject) {
  const total = project.milestones.length;
  const done = project.milestones.filter((m) => DONE.has(m.status)).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

export function projectStage(project: LifecycleProject): ProjectStage {
  if (project.status === 'closed' || project.status === 'completed') return 'closed';
  const { milestones } = project;
  if (milestones.some((m) => REVIEW.has(m.status))) return 'review';
  if (!milestones.length || milestones.every((m) => m.status === 'planned')) return 'setup';
  return 'delivery';
}

export function nextMilestone<M extends { status: string }>(project: { milestones: M[] }) {
  return project.milestones.find((m) => !DONE.has(m.status)) ?? null;
}

export function projectKpis(projects: SummaryProject[]): Kpi[] {
  const active = projects.filter((p) => p.status === 'active');
  const inReview = active.flatMap((p) => p.milestones).filter((m) => REVIEW.has(m.status));
  const closed = projects.filter((p) => projectStage(p) === 'closed');
  const [primary, ...others] = currencyTotals(projects);
  const otherHeld = others.filter((t) => t.held > 0);
  return [
    {
      domain: 'work',
      label: 'Active projects',
      value: String(active.length),
      hint: 'Awarded work in progress',
      to: '/os/commercial/projects',
    },
    {
      domain: 'work',
      label: 'Milestones in review',
      value: String(inReview.length),
      hint: inReview.length ? 'Delivered and awaiting a decision' : 'Nothing waiting for review',
      to: '/os/commercial/projects',
    },
    {
      domain: 'money',
      label: 'Held in escrow',
      value: money(primary?.held ?? 0, primary?.currency ?? 'USD'),
      hint: otherHeld.length
        ? `Also ${otherHeld.map((t) => `${money(t.held, t.currency)} ${t.currency}`).join(' · ')}`
        : 'Secured until delivery is approved',
      to: '/os/escrows?status=held',
    },
    {
      domain: 'work',
      label: 'Completed',
      value: String(closed.length),
      hint: 'Closed with an outcome',
      to: '/os/commercial/projects',
    },
  ];
}
