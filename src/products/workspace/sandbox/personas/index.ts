import type { Credential } from '../../../talent/hooks/useTalentPage';
import type {
  Bid,
  JobWatch,
  Reputation,
  ScreeningResult,
  WatchMatch,
} from '../../../talent/talentTypes';
import { skillFit, wordSet } from '../matchScore';
import type { Job } from '../../../commercial/types';
import type { MilestoneFunding, Project } from '../../../commercial/hooks/useProjectsPage';
import type { ExpertResult, JobMatch } from '../../../talent/hooks/useTalentPage';
import type { ActivityItem } from '../../hooks/useActivityFeed';
import type { Dispute } from '../../../commercial/pages/DisputesPage';
import { createDemoScenario, type DemoProfile, type DemoTier } from '../../demo/scenarios';
import { SANDBOX_SCHEMA_VERSION, type SandboxData } from '../types';
import { PERSONA_WORK, type CandidateSeed, type JobSeed } from './catalogue';

const DAY = 86400000;
/** Budget and rate multipliers so team and enterprise examples read at their scale. */
const TIER_SCALE: Record<DemoTier, number> = { individual: 1, team: 4, enterprise: 15 };
const PROJECT_TYPE = 'Fixed-scope project';

/** Same shape of score the server computes: skill fit (≤70, src/app/matchScore.mjs) plus rate fit
 * and a bonus. */
function scoreFit(
  profileWords: Set<string>,
  jobWords: Set<string>,
  rateFits: boolean,
  bonus: boolean,
) {
  return {
    skillFit: skillFit(profileWords, jobWords),
    rateFit: rateFits ? 15 : 0,
    bonus: bonus ? 15 : 0,
  };
}

const jobText = (j: JobSeed) => `${j.title} ${j.category} ${j.description} ${j.deliverables}`;

/** Seed one persona's sandbox. Deterministic for the same profile, tier and day; every date is
 * relative to `today`. */
export function seedPersona(profile: DemoProfile, tier: DemoTier, today: Date): SandboxData {
  const scenario = createDemoScenario(profile, tier, '', today);
  const work = PERSONA_WORK[profile];
  const scale = TIER_SCALE[tier];
  const key = `${profile}-${tier}`.toLowerCase();
  const at = (offsetDays: number) => new Date(today.getTime() + offsetDays * DAY).toISOString();
  const { projects: demoProjects, escrows, ...rest } = scenario;
  const state = {
    user: rest.user,
    workspace: rest.workspace,
    permissions: rest.permissions,
    workspaces: rest.workspaces,
    objectives: rest.objectives,
    actions: rest.actions,
    reviews: rest.reviews,
    audit: rest.audit,
  };

  // Projects and milestone escrow, adapted from the scenario's projects and fundings.
  const fundings: SandboxData['fundings'] = {};
  const projects: Project[] = demoProjects.map((demo, p) => ({
    isClient: true,
    id: demo.id,
    workspace_id: state.workspace.id,
    job_id: `${demo.id}-job`,
    title: demo.title,
    status: demo.status === 'Complete' ? 'closed' : 'active',
    freelancer_user_id: `demo-freelancer-${key}-${p}`,
    assigned_team_id: null,
    assignedTeam: null,
    milestones: demo.milestones.map((milestone, m) => {
      const escrow = escrows.find((e) => e.milestoneId === milestone.id);
      if (escrow) {
        const heldAt = escrow.status === 'pending' ? null : at(-10 + m);
        fundings[milestone.id] = {
          id: escrow.id,
          status: escrow.status,
          amount_minor: escrow.amountMinor,
          currency: escrow.currency,
          created_at: at(-12 + m),
          held_at: heldAt,
          released_at: escrow.status === 'released' ? at(-3 + m) : null,
          refunded_at: escrow.status === 'refunded' ? at(-3 + m) : null,
        } satisfies MilestoneFunding;
      }
      return {
        id: milestone.id,
        project_id: demo.id,
        title: milestone.title,
        description: demo.description,
        amount: (escrow?.amountMinor ?? 0) / 100,
        currency: escrow?.currency ?? 'USD',
        status:
          escrow?.status === 'released'
            ? 'approved'
            : escrow?.status === 'refunded'
              ? 'disputed'
              : escrow?.delivery === 'in_review'
                ? 'in_review'
                : escrow?.status === 'held'
                  ? 'funded'
                  : 'planned',
        deliverables: [],
        submissions: [],
        pendingVerification: null,
        domains: [],
        functions: [],
        industries: [],
      };
    }),
  }));

  // Client side: jobs this persona posted, each with ranked consultant matches.
  const jobs: Job[] = work.jobs.map((seed, j) => ({
    id: `demo-job-${key}-${j}`,
    title: seed.title,
    category: seed.category,
    project_type: PROJECT_TYPE,
    description: seed.description,
    deliverables: seed.deliverables,
    budget_min: seed.budget[0] * scale,
    budget_max: seed.budget[1] * scale,
    currency: 'USD',
    timeline: seed.timeline,
    client_user_id: state.user.id,
  }));
  const candidates: SandboxData['candidates'] = {};
  jobs.forEach((job, j) => {
    const jw = wordSet(jobText(work.jobs[j]));
    candidates[job.id] = work.candidates
      .map((c: CandidateSeed, i) => {
        const profileWords = wordSet(`${c.headline} ${c.skills.join(' ')}`);
        const fit = scoreFit(profileWords, jw, c.rate * scale <= job.budget_max, c.verified);
        return {
          userId: `demo-talent-${key}-${i}`,
          headline: c.headline,
          skills: c.skills,
          domains: c.domains,
          functions: c.functions,
          industries: c.industries,
          hourlyRate: c.rate * scale,
          currency: 'USD',
          jurisdiction: c.jurisdiction,
          vettingStatus: c.verified ? 'verified' : 'unverified',
          // Keep every sample candidate visible even when its overlap with this job is small.
          score: Math.max(1, fit.skillFit) + fit.rateFit + fit.bonus,
          breakdown: {
            skillFit: Math.max(1, fit.skillFit),
            rateFit: fit.rateFit,
            vettingBonus: fit.bonus,
          },
        } satisfies ExpertResult;
      })
      .sort((a, b) => b.score - a.score);
  });

  // Freelancer side: the persona's talent profile and the open jobs it matches.
  const talent = work.talent;
  const talentProfile: SandboxData['talentProfile'] = {
    id: `demo-profile-${key}`,
    headline: talent.headline,
    skills: talent.skills,
    experience_years: 6 + TIER_SCALE[tier],
    availability: 'Available from next week',
    hourly_rate: talent.rate * scale,
    currency: 'USD',
    location: talent.location,
    languages: talent.languages,
    portfolio_url: null,
    vetting_status: 'verified',
    domains: talent.domains,
    functions: talent.functions,
    industries: talent.industries,
  };
  const profileWords = wordSet(`${talent.headline} ${talent.skills.join(' ')}`);
  const jobMatches: JobMatch[] = work.openJobs
    .map((seed, j) => {
      const budgetMin = seed.budget[0] * scale;
      const budgetMax = seed.budget[1] * scale;
      const jw = wordSet(jobText(seed));
      const fit = scoreFit(
        profileWords,
        jw,
        talent.rate * scale <= budgetMax,
        talent.rate * scale <= budgetMin,
      );
      const job: Job = {
        id: `demo-open-job-${key}-${j}`,
        title: seed.title,
        category: seed.category,
        project_type: PROJECT_TYPE,
        description: seed.description,
        deliverables: seed.deliverables,
        budget_min: budgetMin,
        budget_max: budgetMax,
        currency: 'USD',
        timeline: seed.timeline,
        client_user_id: `demo-client-${key}-${j}`,
      };
      const skillFit = Math.max(1, fit.skillFit);
      return {
        job,
        jobId: job.id,
        title: job.title,
        category: job.category,
        budgetMin,
        budgetMax,
        currency: 'USD',
        score: Math.min(100, skillFit + fit.rateFit + fit.bonus),
        breakdown: { skillFit, rateFit: fit.rateFit, budgetFit: fit.bonus },
      };
    })
    .sort((a, b) => b.score - a.score);

  // One dispute, on the project whose milestone funding was refunded.
  const disputed = projects.find((p) =>
    p.milestones.some((m) => fundings[m.id]?.status === 'refunded'),
  );
  const disputedMilestone = disputed?.milestones.find((m) => fundings[m.id]?.status === 'refunded');
  const disputes: Dispute[] =
    disputed && disputedMilestone
      ? [
          {
            id: `demo-dispute-${key}`,
            reason: work.dispute.reason,
            status: 'open',
            milestone_title: disputedMilestone.title,
            project_title: disputed.title,
            project_id: disputed.id,
            // You opened it; the freelancer proposed the refund, so the answer is yours.
            opened_by: 'demo-user',
            created_at: at(-6),
            resolution: {
              outcome: 'refund',
              note: work.dispute.note,
              proposedBy: disputed.freelancer_user_id,
              status: 'proposed',
              version: 1,
              proposedAt: at(-4),
            },
          },
        ]
      : [];

  const activity: ActivityItem[] = [
    {
      id: `demo-act-${key}-0`,
      type: 'objective',
      title: state.objectives[0].title,
      status: 'Active',
      createdAt: at(-14),
    },
    {
      id: `demo-act-${key}-1`,
      type: 'job',
      title: jobs[0].title,
      status: 'open',
      createdAt: at(-9),
    },
    {
      id: `demo-act-${key}-2`,
      type: 'bid',
      title: `New bid on ${jobs[0].title}`,
      status: 'received',
      createdAt: at(-7),
    },
    {
      id: `demo-act-${key}-3`,
      type: 'proposal',
      title: `Proposal accepted for ${projects[0].title}`,
      status: 'accepted',
      createdAt: at(-5),
    },
    {
      id: `demo-act-${key}-4`,
      type: 'action',
      title: state.actions[0].title,
      status: state.actions[0].status,
      createdAt: at(-2),
    },
    {
      id: `demo-act-${key}-5`,
      type: 'job',
      title: jobs[1].title,
      status: 'open',
      createdAt: at(-1),
    },
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) as ActivityItem[];

  // Freelancer marketplace: other clients' open jobs, two bids, one saved search.
  const marketplace = work.openJobs.map(
    (_, j) => jobMatches.find((m) => m.jobId === `demo-open-job-${key}-${j}`)!.job!,
  );
  const bids: Bid[] = marketplace.slice(0, 2).map((job, b) => ({
    id: `demo-bid-${key}-${b}`,
    job_id: job.id,
    freelancer_user_id: state.user.id,
    cover_letter: `I can deliver ${job.deliverables.toLowerCase()} within ${job.timeline}.`,
    proposed_amount: Math.round((job.budget_min + job.budget_max) / 2),
    currency: job.currency,
    timeline: job.timeline,
    status: 'submitted',
    created_at: new Date(at(-3 + b)).getTime(),
    job_title: job.title,
    job_status: 'open',
  }));
  const watchId = `demo-watch-${key}`;
  const watches: JobWatch[] = [
    { id: watchId, categories: [marketplace[0].category], keywords: '', createdAt: at(-9) },
  ];
  const watchMatches: Record<string, WatchMatch[]> = {
    [watchId]: [
      {
        id: `demo-watch-match-${key}-0`,
        jobId: marketplace[0].id,
        title: marketplace[0].title,
        category: marketplace[0].category,
        budgetMin: marketplace[0].budget_min,
        budgetMax: marketplace[0].budget_max,
        currency: marketplace[0].currency,
        matchedAt: at(-2),
        seen: false,
      },
    ],
  };

  // Client side: reputation for every sample candidate and screened bids on the first posted job.
  const reputation: Record<string, Reputation> = {};
  for (const ranked of Object.values(candidates))
    ranked.forEach((c, i) => {
      const verified = c.vettingStatus === 'verified';
      reputation[c.userId] = {
        userId: c.userId,
        reviewCount: verified ? 6 + i * 4 : 0,
        averageRating: verified ? Math.round((4.9 - i * 0.2) * 10) / 10 : null,
        completedMilestones: verified ? 8 + i * 3 : i,
      };
    });
  // The persona's own track record as a freelancer.
  reputation[state.user.id] = {
    userId: state.user.id,
    reviewCount: 9,
    averageRating: 4.8,
    completedMilestones: 14,
  };
  const screening: Record<string, ScreeningResult[]> = {};
  if (jobs[0])
    screening[jobs[0].id] = candidates[jobs[0].id]
      .slice(0, 3)
      .map((c, i) => {
        const breakdown = {
          budgetFit: 40 - i * 10,
          currencyMatch: 10,
          relevance: 26 - i * 6,
          timeline: 20 - i * 5,
        };
        const total =
          breakdown.budgetFit + breakdown.currencyMatch + breakdown.relevance + breakdown.timeline;
        const assessmentAvg = c.vettingStatus === 'verified' ? 88 - i * 6 : 0;
        const vettingBonus = c.vettingStatus === 'verified' ? 10 : 0;
        const completedMilestones = reputation[c.userId].completedMilestones;
        return {
          bidId: `demo-received-bid-${key}-${i}`,
          freelancerUserId: c.userId,
          bidScore: { total, breakdown },
          assessmentAvg,
          vettingStatus: c.vettingStatus,
          completedMilestones,
          // Same blend as GET /api/jobs/:id/screening.
          blendedTotal: Math.round(
            total * 0.5 +
              assessmentAvg * 0.2 +
              vettingBonus +
              Math.min(20, completedMilestones * 5),
          ),
        };
      })
      .sort((a, b) => b.blendedTotal - a.blendedTotal);

  const credentials: Credential[] = [
    {
      id: 'demo-credential-' + key + '-0',
      type: 'certification',
      title: talent.domains[0] + ' practitioner certificate',
      issuer: 'Professional standards body (sample)',
      issued_at: at(-400),
      expires_at: at(330),
      evidence_url: null,
      verification_status: 'verified',
      created_at: at(-60),
    },
    {
      id: 'demo-credential-' + key + '-1',
      type: 'portfolio',
      title: 'Case study: ' + (work.openJobs[0]?.title ?? 'recent engagement'),
      issuer: 'Self-declared',
      issued_at: at(-90),
      expires_at: null,
      evidence_url: null,
      verification_status: 'pending',
      created_at: at(-20),
    },
  ];

  return {
    version: SANDBOX_SCHEMA_VERSION,
    state,
    projects,
    fundings,
    internalProjects: [],
    talentProfile,
    jobMatches,
    jobs,
    candidates,
    invitations: {},
    disputes,
    activity,
    marketplace,
    bids,
    watches,
    watchMatches,
    reputation,
    screening,
    credentials,
  };
}
