import type { Context, WorkspaceState } from '../../../types';
import { PROFESSIONAL_GOALS, TIER_CONSTRAINTS } from './professionalGoals';

import { PROFILES, TIERS, type DemoProfile, type DemoTier } from './personaList';
export { PROFILES, TIERS, type DemoProfile, type DemoTier };
export type DemoPlan = {
  id: string;
  name: string;
  summary: string;
  seats: string[];
  members: { min?: number; max: number };
  monthlyPoints: number | null;
};
export type DemoProject = {
  id: string;
  title: string;
  goalId: string;
  owner: string;
  description: string;
  dueDate: string;
  status: 'Planned' | 'In progress' | 'Paused' | 'Complete';
  milestones: { id: string; title: string; done: boolean }[];
};
export type DemoEscrow = {
  id: string;
  projectId: string;
  projectTitle: string;
  milestoneId: string;
  milestoneTitle: string;
  amountMinor: number;
  currency: 'USD' | 'NGN';
  status: 'pending' | 'held' | 'released' | 'refunded';
  delivery: 'pending' | 'submitted' | 'in_review' | 'approved' | 'disputed';
  history: { id: string; detail: string; at: string }[];
};
export type DemoWorkspace = WorkspaceState & {
  projects: DemoProject[];
  escrows: DemoEscrow[];
  matching?: { applications: string[]; invitations: string[] };
  accountServices?: {
    profile?: { name: string; role: string; bio: string };
    payoutReady?: boolean;
    deletionStatus?: 'pending';
    dispute?: {
      outcome: string;
      note: string;
      proposedBy: 'client' | 'freelancer';
      status: 'proposed' | 'accepted' | 'rejected';
    };
  };
};
export function createDemoEscrows(projects: DemoProject[], tier: DemoTier): DemoEscrow[] {
  return projects.flatMap((project, p) =>
    project.milestones.map((milestone, m) => {
      const status: DemoEscrow['status'] =
        p === 2 ? (m === 0 ? 'released' : 'refunded') : m === 0 ? 'held' : 'pending';
      return {
        id: `${milestone.id}-escrow`,
        projectId: project.id,
        projectTitle: project.title,
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
        amountMinor: (tier === 'individual' ? 35000 : tier === 'team' ? 150000 : 750000) * (m + 1),
        currency: 'USD',
        status,
        delivery:
          status === 'released'
            ? 'approved'
            : status === 'refunded'
              ? 'disputed'
              : p === 0 && m === 0
                ? 'in_review'
                : 'pending',
        history: [
          {
            id: `${milestone.id}-seed-event`,
            detail: `Sample funding ${status}.`,
            at: new Date().toISOString(),
          },
        ],
      };
    }),
  );
}
export const scenarioKey = (profile: DemoProfile, tier: DemoTier, plan: string) =>
  `${profile}:${tier}:${plan}`;

/** Refresh untouched seeded copy while preserving edited, added and deleted demo records. */
export function refreshDemoSeed(
  sample: WorkspaceState & { projects?: DemoProject[]; escrows?: DemoEscrow[] },
  key: string,
): DemoWorkspace {
  const [profile, tier, plan] = key.split(':');
  if (!PROFILES.includes(profile as DemoProfile) || !TIERS.includes(tier as DemoTier))
    return { ...sample, projects: sample.projects ?? [], escrows: sample.escrows ?? [] };
  const seed = createDemoScenario(profile as DemoProfile, tier as DemoTier, plan);
  return {
    ...sample,
    escrows:
      sample.escrows ??
      createDemoEscrows(
        sample.projects ??
          seed.projects.filter((project) =>
            sample.objectives.some((goal) => goal.id === project.goalId),
          ),
        tier as DemoTier,
      ),
    projects:
      sample.projects ??
      seed.projects.filter((project) =>
        sample.objectives.some((goal) => goal.id === project.goalId),
      ),
    objectives: sample.objectives.map((goal) =>
      goal.version === 1 ? (seed.objectives.find((g) => g.id === goal.id) ?? goal) : goal,
    ),
    actions: sample.actions.map((action) =>
      action.version === 1 ? (seed.actions.find((a) => a.id === action.id) ?? action) : action,
    ),
    reviews: sample.reviews.map((review) =>
      review.id === 'demo-review' ? seed.reviews[0] : review,
    ),
  };
}
export function createDemoScenario(
  profile: DemoProfile,
  tier: DemoTier,
  plan: string,
  // Anchor for every seeded date; the sandbox passes a fixed day so seeds are deterministic.
  now: Date = new Date(),
): DemoWorkspace {
  const context: Context = profile === 'Freelancer' ? 'Professional' : profile;
  const key = scenarioKey(profile, tier, plan);
  const date = (offset: number) =>
    new Date(now.getTime() + offset * 86400000).toISOString().slice(0, 10);
  const briefs = PROFESSIONAL_GOALS[profile][tier];
  const objectives: WorkspaceState['objectives'] = briefs.map((brief, i) => ({
    id: `demo-${key}-goal-${i}`,
    title: brief.title.toUpperCase(),
    description: `${brief.actions[0]}. ${brief.actions[1]}.`,
    context,
    priority: i === 0 ? 'High' : 'Medium',
    status: i === 2 ? 'Complete' : 'Active',
    targetDate: date(i === 2 ? -2 : 21 + i * 7),
    success: brief.success,
    constraints: TIER_CONSTRAINTS[tier],
    version: 1,
    createdAt: date(-14),
  }));
  const actions: WorkspaceState['actions'] = objectives.flatMap((goal, i) => [
    {
      id: `${goal.id}-a`,
      title: briefs[i].actions[0],
      objectiveId: goal.id,
      status: 'Done' as const,
      dueDate: date(-3),
      owner: 'Alex Morgan (sample)',
      requiresApproval: false,
      notes: `Success criterion: ${briefs[i].success}`,
      version: 1,
      createdAt: date(-10),
    },
    {
      id: `${goal.id}-b`,
      title: briefs[i].actions[1],
      objectiveId: goal.id,
      status:
        i === 2
          ? ('Done' as const)
          : i === 0
            ? ('In progress' as const)
            : ('Needs review' as const),
      dueDate: date(i === 2 ? -2 : i + 2),
      owner: tier === 'individual' ? 'Alex Morgan (sample)' : 'Jordan Lee (sample)',
      requiresApproval: i === 1,
      notes: TIER_CONSTRAINTS[tier],
      version: 1,
      createdAt: date(-7),
    },
  ]);
  const projects: DemoProject[] = objectives.map((objective, i) => ({
    id: `${objective.id}-project`,
    title: briefs[i].title,
    goalId: objective.id,
    owner: tier === 'individual' ? 'Alex Morgan (sample)' : 'Jordan Lee (sample)',
    description: briefs[i].success,
    dueDate: objective.targetDate,
    status: i === 2 ? 'Complete' : i === 0 ? 'In progress' : 'Planned',
    milestones: briefs[i].actions.map((title, index) => ({
      id: `${objective.id}-milestone-${index}`,
      title,
      done: i === 2 || (i === 0 && index === 0),
    })),
  }));
  return {
    user: { id: 'demo-user', name: 'Alex Morgan (sample)', email: null, demo: true },
    workspace: {
      id: `demo-${key}`,
      name: `${profile} demo`,
      context,
      tier,
      role: 'owner',
      member_limit: tier === 'individual' ? 1 : tier === 'team' ? 10 : 200,
    },
    permissions: ['work:write'],
    workspaces: [],
    objectives,
    projects,
    escrows: createDemoEscrows(projects, tier),
    actions,
    reviews: [
      {
        id: 'demo-review',
        progressed: `${briefs[2].title}: ${briefs[2].success}`,
        learned: `The next cycle must account for: ${TIER_CONSTRAINTS[tier]}`,
        next: briefs[0].actions[1],
        createdAt: date(-3),
      },
    ],
    audit: [
      {
        id: 'demo-seeded',
        actor: 'Demo',
        action: 'Sample workspace prepared',
        objectId: '',
        detail: `${profile} / ${tier} / ${plan}`,
        createdAt: now.toISOString(),
      },
    ],
  };
}
