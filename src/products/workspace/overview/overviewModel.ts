import type { WorkspaceState } from '../../../types';
import type { Milestone, MilestoneFunding } from '../../commercial/hooks/useProjectsPage';
import type { Dispute } from '../../commercial/pages/DisputesPage';
import type { JobMatch } from '../../talent/hooks/useTalentPage';
import type { Domain } from '../../../shared/workspace/domains';
import { isOpenDispute } from '../../../shared/workspace/disputeStatus';

/** What the Overview needs of a project; both project details and escrow-summary rows fit. */
export type OverviewProject = {
  id: string;
  title: string;
  status: string;
  isClient?: boolean;
  milestones: Pick<Milestone, 'id' | 'title' | 'amount' | 'currency'>[];
};
export type OverviewInput = {
  state: WorkspaceState;
  projects: OverviewProject[];
  /** Keyed by milestone id; null or missing means no funding yet. */
  fundings: Record<string, MilestoneFunding | null>;
  disputes: Dispute[];
  /** null when the user has no talent profile. */
  jobMatches: JobMatch[] | null;
};
export type Kpi = { domain: Domain; label: string; value: string; hint: string; to: string };
export type NeedsYouItem = {
  id: string;
  domain: Domain;
  title: string;
  detail: string;
  to: string;
};

const money = (minor: number, currency: string) =>
  new Intl.NumberFormat('en', { style: 'currency', currency }).format(minor / 100);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const isOpen = (d: Dispute) => isOpenDispute(d.status);
const activeProjects = (input: OverviewInput) =>
  input.projects.filter((p) => p.status === 'active');
/** Milestones the user funds (they are the client) on active projects, with no funding yet or
 * funding still pending. Freelancers and team members never fund, so they are never prompted. */
function unfunded(input: OverviewInput) {
  return activeProjects(input)
    .filter((project) => project.isClient === true)
    .flatMap((project) =>
      project.milestones
        .filter((m) => {
          const funding = input.fundings[m.id];
          return !funding || funding.status === 'pending';
        })
        .map((milestone) => ({ project, milestone })),
    );
}

/** The Overview's KPI strip: work, money, risk and talent, from backend data only. */
export function overviewKpis(input: OverviewInput): Kpi[] {
  const goals = input.state.objectives.filter((o) => o.status === 'Active');
  const moving = input.state.actions.filter(
    (a) => a.status === 'In progress' || a.status === 'Needs review',
  );
  // Held funds per currency; amounts in different currencies are never added together.
  const held = new Map<string, number>();
  for (const f of Object.values(input.fundings))
    if (f?.status === 'held') held.set(f.currency, (held.get(f.currency) ?? 0) + f.amount_minor);
  const byAmount = [...held.entries()].sort((a, b) => b[1] - a[1]);
  const [primary, ...others] = byAmount;
  const awaiting = unfunded(input);
  const open = input.disputes.filter(isOpen);

  const kpis: Kpi[] = [
    {
      domain: 'work',
      label: 'Active goals',
      value: String(goals.length),
      hint: 'Directions you are moving toward',
      to: '/os/clarity',
    },
    {
      domain: 'work',
      label: 'Actions in motion',
      value: String(moving.length),
      hint: `${input.state.actions.filter((a) => a.status === 'Needs review').length} awaiting review`,
      to: '/os/today',
    },
    {
      domain: 'money',
      label: 'Held in escrow',
      value: primary ? money(primary[1], primary[0]) : money(0, 'USD'),
      hint: others.length
        ? `Also ${others.map(([c, v]) => `${money(v, c)} ${c}`).join(' · ')} held`
        : primary
          ? `Funds held for delivery in ${primary[0]}`
          : 'No funds held yet',
      to: '/os/escrows',
    },
    {
      domain: 'money',
      label: 'Awaiting funding',
      value: String(awaiting.length),
      hint: plural(awaiting.length, 'milestone') + ' not yet funded',
      to: '/os/commercial/projects',
    },
    {
      domain: 'risk',
      label: 'Open disputes',
      value: String(open.length),
      hint: open.length ? 'Needs a response or decision' : 'Nothing in dispute',
      to: '/os/disputes',
    },
  ];
  if (input.jobMatches)
    kpis.push({
      domain: 'talent',
      label: 'Job matches',
      value: String(input.jobMatches.length),
      hint: 'Open work that fits your profile',
      to: '/os/job-matcher',
    });
  return kpis;
}

/** What needs the user now, most urgent first: disputes, reviews, funding, then new matches. */
export function needsYou(input: OverviewInput): NeedsYouItem[] {
  const disputes = input.disputes.filter(isOpen).map((d) => ({
    id: `dispute-${d.id}`,
    domain: 'risk' as const,
    title: `Dispute on ${d.milestone_title}`,
    detail: d.resolution?.status === 'proposed' ? 'A resolution is proposed' : d.reason,
    to: '/os/disputes',
  }));
  const reviews = input.state.actions
    .filter((a) => a.status === 'Needs review')
    .map((a) => ({
      id: `review-${a.id}`,
      domain: 'work' as const,
      title: a.title,
      detail: 'Waiting for your review',
      to: '/os/today',
    }));
  const funding = unfunded(input).map(({ project, milestone }) => ({
    id: `fund-${milestone.id}`,
    domain: 'money' as const,
    title: `Fund “${milestone.title}”`,
    detail: `${project.title} · ${money(Math.round(milestone.amount * 100), milestone.currency)}`,
    to: `/os/commercial/projects/${project.id}`,
  }));
  const matches = [...(input.jobMatches ?? [])]
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((m) => ({
      id: `match-${m.jobId}`,
      domain: 'talent' as const,
      title: m.title,
      detail: `${m.score}% match · ${m.category}`,
      to: '/os/job-matcher',
    }));
  return [...disputes, ...reviews, ...funding, ...matches];
}
