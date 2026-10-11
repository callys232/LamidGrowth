import { ApiError } from '../../../../api';
import type { SandboxRoute } from '../router';
import type { MilestoneFunding } from '../../../commercial/hooks/useProjectsPage';
import { JOB_CATEGORIES, PROJECT_TYPES } from '../jobTaxonomy';

/** Points prices the server quotes with its job options (src/app/app.mjs). */
const JOB_POST_COST = 40;
const BID_COST = 20;

/** A released funding is paid out to the freelancer; the server records that as a succeeded
 * transfer (payments.mjs). Sandbox fundings derive the same record. */
function payouts(funding: MilestoneFunding | undefined) {
  if (!funding || funding.status !== 'released' || !funding.released_at) return [];
  return [
    {
      id: `transfer-${funding.id}`,
      status: 'succeeded',
      amount_minor: funding.amount_minor,
      currency: funding.currency,
      failure_reason: null,
      created_at: funding.released_at,
    },
  ];
}

/** Projects, milestone escrow, talent, jobs, candidates, invitations and disputes. */
export const workRoutes: SandboxRoute[] = [
  {
    method: 'GET',
    pattern: '/projects',
    // The list carries project rows only, like the server; milestones come from the detail.
    handler: ({ store }) =>
      store.read().projects.map((p) => ({
        id: p.id,
        workspace_id: p.workspace_id,
        job_id: p.job_id,
        title: p.title,
        status: p.status,
        freelancer_user_id: p.freelancer_user_id,
        assigned_team_id: p.assigned_team_id,
      })),
  },
  {
    method: 'GET',
    pattern: '/projects/:id',
    handler: ({ store, params }) => {
      const project = store.read().projects.find((p) => p.id === params.id);
      if (!project) throw new ApiError('Project not found.', 404);
      return project;
    },
  },
  {
    method: 'GET',
    pattern: '/internal-projects',
    handler: ({ store }) => store.read().internalProjects,
  },
  {
    method: 'GET',
    pattern: '/milestones/:id/funding',
    handler: ({ store, params }) => store.read().fundings[params.id] ?? null,
  },
  {
    method: 'GET',
    pattern: '/workspace/escrow-summary',
    // Mirrors the server: party projects with milestones, latest funding and transfers.
    handler: ({ store }) => {
      const data = store.read();
      return {
        projects: data.projects.map((p) => {
          const isClient = p.isClient === true;
          const isFreelancer = p.isFreelancer === true;
          const party = isClient || isFreelancer;
          return {
            id: p.id,
            title: p.title,
            status: p.status,
            isClient,
            isFreelancer,
            isTeamMember: !party,
            milestones: p.milestones.map((m) => ({
              id: m.id,
              project_id: m.project_id,
              title: m.title,
              description: m.description,
              amount: m.amount,
              currency: m.currency,
              status: m.status,
              funding: party ? (data.fundings[m.id] ?? null) : null,
              transfers: party ? payouts(data.fundings[m.id]) : [],
            })),
          };
        }),
      };
    },
  },
  {
    method: 'GET',
    pattern: '/talent/profile/mine',
    handler: ({ store }) => store.read().talentProfile,
  },
  {
    method: 'GET',
    pattern: '/talent/job-matches',
    handler: ({ store }) => [...store.read().jobMatches].sort((a, b) => b.score - a.score),
  },
  {
    method: 'GET',
    pattern: '/job-options',
    handler: () => ({
      categories: JOB_CATEGORIES,
      projectTypes: PROJECT_TYPES,
      jobPostCost: JOB_POST_COST,
      bidCost: BID_COST,
    }),
  },
  { method: 'GET', pattern: '/jobs', handler: ({ store }) => store.read().jobs },
  {
    method: 'GET',
    pattern: '/jobs/:id/candidate-matches',
    handler: ({ store, params }) => {
      const data = store.read();
      if (!data.jobs.some((j) => j.id === params.id)) throw new ApiError('Job not found.', 404);
      return data.candidates[params.id] ?? [];
    },
  },
  {
    method: 'GET',
    pattern: '/jobs/:id/invitations',
    handler: ({ store, params }) => store.read().invitations[params.id] ?? [],
  },
  {
    method: 'POST',
    pattern: '/jobs/:id/invitations',
    handler: ({ store, params, body }) => {
      const { freelancerUserId } = body as { freelancerUserId: string };
      const data = store.read();
      if (!data.jobs.some((j) => j.id === params.id))
        throw new ApiError('Job post not found.', 404);
      const list = (data.invitations[params.id] ??= []);
      if (list.some((i) => i.freelancer_user_id === freelancerUserId))
        throw new ApiError(
          'This freelancer already has a pending or accepted invitation for this job.',
          409,
        );
      const invitation = { freelancer_user_id: freelancerUserId, status: 'pending' };
      list.push(invitation);
      store.write(data);
      return invitation;
    },
  },
  { method: 'GET', pattern: '/disputes', handler: ({ store }) => store.read().disputes },
  {
    method: 'POST',
    pattern: '/disputes/:id/resolution',
    // Mirrors POST /api/disputes/:id/resolution: a new proposal replaces the previous one.
    handler: ({ store, params, body }) => {
      const input = body as { outcome?: string; note?: string };
      if (!['revision', 'refund', 'release'].includes(input?.outcome ?? '') || !input.note?.trim())
        throw new ApiError('Choose an outcome and describe your proposal.', 400);
      const data = store.read();
      const dispute = data.disputes.find((d) => d.id === params.id);
      if (!dispute) throw new ApiError('Dispute not found.', 404);
      if (dispute.status !== 'open')
        throw new ApiError('This dispute has already been resolved.', 409);
      const resolution = {
        outcome: input.outcome!,
        note: input.note.trim(),
        proposedBy: data.state.user.id,
        status: 'proposed',
        proposedAt: new Date().toISOString(),
      };
      dispute.resolution = { ...resolution, version: (dispute.resolution?.version ?? 0) + 1 };
      store.write(data);
      return resolution;
    },
  },
  {
    method: 'POST',
    pattern: '/disputes/:id/respond',
    // Mirrors POST /api/disputes/:id/respond, including its conflict and permission messages.
    handler: ({ store, params, body }) => {
      const input = body as { decision?: string; version?: number };
      const data = store.read();
      const dispute = data.disputes.find((d) => d.id === params.id);
      if (!dispute) throw new ApiError('Dispute not found.', 404);
      const record = dispute.resolution;
      if (!record || dispute.status !== 'open' || record.version !== input?.version)
        throw new ApiError('This proposal changed or is no longer available. Refresh first.', 409);
      if (record.proposedBy === data.state.user.id || record.status !== 'proposed')
        throw new ApiError('Only the other party can respond to a pending proposal.', 403);
      const accepted = input.decision === 'accept';
      dispute.resolution = {
        ...record,
        status: accepted ? 'accepted' : 'rejected',
        respondedBy: data.state.user.id,
        respondedAt: new Date().toISOString(),
        version: record.version + 1,
      };
      if (accepted) {
        dispute.status = `resolved_${record.outcome}`;
        if (record.outcome !== 'refund')
          for (const project of data.projects)
            for (const milestone of project.milestones)
              if (milestone.title === dispute.milestone_title && project.id === dispute.project_id)
                milestone.status = record.outcome === 'release' ? 'approved' : 'revision_requested';
      }
      store.write(data);
      return { ok: true };
    },
  },
  // Demo personas have no expert handoffs; the Projects page reads this list on load.
  { method: 'GET', pattern: '/handoffs/mine', handler: () => [] },
  // Project messages are private conversations; the sample workspace has none.
  { method: 'GET', pattern: '/projects/:id/messages', handler: () => [] },
];
