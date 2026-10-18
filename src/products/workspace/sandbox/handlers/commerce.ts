import { ApiError } from '../../../../api';
import type { SandboxRoute } from '../router';
import type { SandboxData } from '../types';
import type { ScopingCase } from '../../../scoping/hooks/useScopingPage';
import { JOB_CATEGORIES, PROJECT_TYPES } from '../jobTaxonomy';
import { samplePdf } from '../samplePdf';

const id = () => `demo-${crypto.randomUUID()}`;
const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
function scope(data: SandboxData, key: string) {
  const row = data.scopes?.find((c) => c.id === key);
  if (!row) throw new ApiError('Scoping case not found.', 404);
  return row;
}
const fields: Record<string, keyof ScopingCase> = {
  objective: 'objective',
  problemStatement: 'problem_statement',
  desiredOutcome: 'desired_outcome',
  inScope: 'in_scope',
  outOfScope: 'out_of_scope',
  deliverables: 'deliverables',
  acceptanceCriteria: 'acceptance_criteria',
  assumptions: 'assumptions',
  category: 'category',
  budgetContext: 'budget_context',
  timelineContext: 'timeline_context',
};
function milestoneIn(data: SandboxData, key: string) {
  for (const project of data.projects) {
    const milestone = project.milestones.find((m) => m.id === key);
    if (milestone) return { project, milestone };
  }
  throw new ApiError('Milestone not found.', 404);
}
const clientOnly = (project: SandboxData['projects'][number]) => {
  if (!project.isClient) throw new ApiError('Only the sample project owner can do this.', 403);
};

/** Sample-only mutations. Never dispatch jobs, messages, payments or expert requests externally. */
export const commerceRoutes: SandboxRoute[] = [
  {
    method: 'POST',
    pattern: '/milestones/:id/fund',
    handler: ({ store, params }) => {
      const data = store.read(),
        { project, milestone } = milestoneIn(data, params.id);
      clientOnly(project);
      if (data.fundings[milestone.id])
        throw new ApiError('This sample milestone is already funded.', 409);
      data.fundings[milestone.id] = {
        id: id(),
        status: 'held',
        amount_minor: Math.round(milestone.amount * 100),
        currency: milestone.currency,
        held_at: new Date().toISOString(),
        released_at: null,
      };
      store.write(data);
      return { demo: true };
    },
  },
  {
    method: 'POST',
    pattern: '/milestones/:id/release',
    handler: ({ store, params }) => {
      const data = store.read(),
        { project, milestone } = milestoneIn(data, params.id);
      clientOnly(project);
      const funding = data.fundings[milestone.id];
      if (milestone.status !== 'approved' || funding?.status !== 'held')
        throw new ApiError(
          'Approve the milestone and hold its sample funds before releasing.',
          409,
        );
      funding.status = 'released';
      funding.released_at = new Date().toISOString();
      milestone.status = 'paid';
      store.write(data);
      return { demo: true };
    },
  },
  {
    method: 'POST',
    pattern: '/milestones/:id/refund',
    handler: ({ store, params }) => {
      const data = store.read(),
        { project, milestone } = milestoneIn(data, params.id);
      clientOnly(project);
      const accepted = data.disputes.some(
        (d) =>
          d.project_id === project.id &&
          d.milestone_title === milestone.title &&
          d.status === 'resolved_refund' &&
          d.resolution?.status === 'accepted',
      );
      const funding = data.fundings[milestone.id];
      if (!accepted || funding?.status !== 'held')
        throw new ApiError(
          'Accept a refund resolution in Disputes before refunding held sample funds.',
          409,
        );
      funding.status = 'refunded';
      funding.refunded_at = new Date().toISOString();
      store.write(data);
      return { demo: true };
    },
  },
  {
    method: 'GET',
    pattern: '/projects/:id/messages',
    handler: ({ store, params }) => store.read().messages?.[params.id] || [],
  },
  {
    method: 'POST',
    pattern: '/projects/:id/messages',
    handler: ({ store, params, body }) => {
      const data = store.read();
      if (!data.projects.some((p) => p.id === params.id))
        throw new ApiError('Project not found.', 404);
      const value = text((body as { body?: string }).body);
      if (!value) throw new ApiError('Write a message.', 400);
      const message = {
        id: id(),
        sender_id: data.state.user.id,
        body: value,
        created_at: new Date().toISOString(),
      };
      ((data.messages ||= {})[params.id] ||= []).push(message);
      store.write(data);
      return message;
    },
  },
  {
    method: 'POST',
    pattern: '/projects/:id/milestones',
    handler: ({ store, params, body }) => {
      const data = store.read(),
        project = data.projects.find((p) => p.id === params.id);
      if (!project) throw new ApiError('Project not found.', 404);
      clientOnly(project);
      const input = body as {
        title: string;
        description: string;
        amount: number;
        currency: string;
      };
      if (!text(input.title) || !Number.isFinite(input.amount) || input.amount <= 0)
        throw new ApiError('Provide a title and positive amount.', 400);
      const milestone = {
        id: id(),
        project_id: project.id,
        title: text(input.title),
        description: text(input.description),
        amount: input.amount,
        currency: input.currency || 'USD',
        status: 'planned',
        deliverables: [],
        submissions: [],
        pendingVerification: null,
      };
      project.milestones.push(milestone);
      store.write(data);
      return milestone;
    },
  },
  {
    method: 'POST',
    pattern: '/milestones/:id/deliverables',
    handler: ({ store, params, body }) => {
      const data = store.read(),
        { project, milestone } = milestoneIn(data, params.id);
      clientOnly(project);
      const input = body as { title: string; description: string; criteria: string[] };
      if (!text(input.title)) throw new ApiError('Provide a deliverable title.', 400);
      const deliverable = {
        id: id(),
        title: text(input.title),
        description: text(input.description),
        status: 'pending',
        criteria: (input.criteria || []).map((c) => ({
          id: id(),
          criterion: c,
          status: 'pending' as const,
        })),
      };
      milestone.deliverables.push(deliverable);
      store.write(data);
      return deliverable;
    },
  },
  {
    method: 'POST',
    pattern: '/milestones/:id/submissions',
    handler: ({ store, params, body }) => {
      const data = store.read(),
        { project, milestone } = milestoneIn(data, params.id);
      if (!project.isFreelancer)
        throw new ApiError('Only the sample contractor can submit work.', 403);
      const submission = {
        id: id(),
        milestone_id: milestone.id,
        submitted_by: data.state.user.id,
        notes: text((body as { notes: string }).notes),
        created_at: new Date().toISOString(),
      };
      milestone.submissions.unshift(submission);
      milestone.status = 'submitted';
      store.write(data);
      return submission;
    },
  },
  {
    method: 'POST',
    pattern: '/submissions/:id/verify',
    handler: ({ store, params }) => {
      const data = store.read();
      for (const project of data.projects)
        for (const milestone of project.milestones) {
          if (!milestone.submissions.some((s) => s.id === params.id)) continue;
          const verification = {
            id: id(),
            submission_id: params.id,
            method: 'demo: sample evidence only; no live verification',
            confidence: 0,
            results: milestone.deliverables.flatMap((d) =>
              d.criteria.map((c) => ({
                criterionId: c.id,
                result: 'insufficient_evidence' as const,
                rationale: 'Sample submission; manually review the agreed criteria.',
              })),
            ),
          };
          milestone.pendingVerification = verification;
          milestone.status = 'in_review';
          store.write(data);
          return verification;
        }
      throw new ApiError('Submission not found.', 404);
    },
  },
  {
    method: 'POST',
    pattern: '/verification-cases/:id/decisions',
    handler: ({ store, params, body }) => {
      const data = store.read(),
        input = body as { decision: string; reason: string };
      for (const project of data.projects)
        for (const milestone of project.milestones) {
          if (milestone.pendingVerification?.id !== params.id) continue;
          clientOnly(project);
          const status = (
            {
              approve: 'approved',
              request_revision: 'revision_requested',
              dispute: 'disputed',
            } as Record<string, string>
          )[input.decision];
          if (!status) throw new ApiError('Choose a valid decision.', 400);
          milestone.status = status;
          milestone.pendingVerification = null;
          if (status === 'disputed')
            data.disputes.push({
              id: id(),
              reason: text(input.reason),
              status: 'open',
              milestone_title: milestone.title,
              project_title: project.title,
              project_id: project.id,
              opened_by: data.state.user.id,
              created_at: new Date().toISOString(),
              resolution: null,
            });
          store.write(data);
          return { demo: true };
        }
      throw new ApiError('Verification case not found.', 404);
    },
  },
  {
    method: 'PATCH',
    pattern: '/projects/:id/team',
    handler: ({ store, params, body }) => {
      const data = store.read(),
        project = data.projects.find((p) => p.id === params.id);
      if (!project) throw new ApiError('Project not found.', 404);
      clientOnly(project);
      const teamId = (body as { teamId: string | null }).teamId,
        team = data.teams?.find((t) => t.id === teamId);
      if (teamId && !team) throw new ApiError('Create a sample team first.', 404);
      project.assigned_team_id = teamId;
      project.assignedTeam = team
        ? { ...team, members: team.members.map((m) => ({ ...m, team_id: team.id })) }
        : null;
      store.write(data);
      return project;
    },
  },
  {
    method: 'POST',
    pattern: '/companion/messages',
    handler: ({ store, body }) => {
      const data = store.read(),
        input = body as { agentId?: string; milestoneId?: string; jobId?: string };
      if (input.agentId === 'invoice-generator') {
        const milestone = data.projects
          .flatMap((p) => p.milestones)
          .find((m) => m.id === input.milestoneId);
        if (!milestone) throw new ApiError('Milestone not found.', 404);
        if (milestone.status !== 'approved')
          throw new ApiError(
            'Approve the milestone before generating an invoice. No points have been charged.',
            422,
          );
        const runId = id(),
          response = `SAMPLE INVOICE — ${milestone.title}: ${milestone.amount} ${milestone.currency}. Demo only; no payment is due.`;
        sessionStorage.setItem(
          `lamid-demo-document:${runId}`,
          samplePdf([
            'SAMPLE INVOICE - NOT PAYABLE',
            milestone.title,
            `${milestone.amount} ${milestone.currency}`,
            'Demo data only. No real invoice or payment obligation.',
          ]),
        );
        return { runId, response, agentId: 'invoice-generator', pointsCharged: 0 };
      }
      if (['quote-generator', 'estimate-generator'].includes(input.agentId || '')) {
        const job = data.jobs.find((j) => j.id === input.jobId);
        if (!job) throw new ApiError('Select a sample job first.', 422);
        const runId = id(),
          response = `Sample recorded budget: ${job.budget_min}–${job.budget_max} ${job.currency}. Illustrative only, not a market quote.`;
        sessionStorage.setItem(
          `lamid-demo-document:${runId}`,
          samplePdf([
            'SAMPLE ESTIMATE - NOT A QUOTE',
            job.title,
            `${job.budget_min}-${job.budget_max} ${job.currency}`,
          ]),
        );
        return { runId, response, agentId: input.agentId, pointsCharged: 0 };
      }
      throw new ApiError(
        'Live AI is disabled for sample data. Use the engines or create an account to enable AI.',
        409,
      );
    },
  },
  {
    method: 'POST',
    pattern: '/jobs/estimate',
    handler: ({ store, body }) => {
      const input = body as Record<string, unknown>;
      if (!JOB_CATEGORIES.includes(text(input.category)))
        throw new ApiError('Choose a valid category.', 400);
      const currency = text(input.currency) || 'USD';
      const jobs = [...store.read().jobs, ...store.read().marketplace].filter(
        (j) =>
          j.category === input.category &&
          j.currency === currency &&
          (!input.projectType || j.project_type === input.projectType),
      );
      if (!jobs.length)
        return {
          available: false,
          sampleSize: 0,
          message:
            'No matching sample budgets in this currency. Enter your own budget to continue.',
        };
      return {
        available: true,
        budgetMin: Math.round(jobs.reduce((n, j) => n + j.budget_min, 0) / jobs.length),
        budgetMax: Math.round(jobs.reduce((n, j) => n + j.budget_max, 0) / jobs.length),
        currency,
        basis: 'category-history',
        sampleSize: jobs.length,
        note: 'Illustrative demo records only; these are not live market prices.',
      };
    },
  },
  {
    method: 'POST',
    pattern: '/jobs',
    handler: ({ store, body }) => {
      const input = body as Record<string, unknown>,
        data = store.read();
      if (
        !text(input.title) ||
        !text(input.description) ||
        !text(input.deliverables) ||
        !JOB_CATEGORIES.includes(text(input.category)) ||
        !PROJECT_TYPES.includes(text(input.projectType)) ||
        !Number.isFinite(input.budgetMin) ||
        !Number.isFinite(input.budgetMax) ||
        Number(input.budgetMin) < 0 ||
        Number(input.budgetMax) < Number(input.budgetMin)
      )
        throw new ApiError(
          'Provide a valid title, scope, category, project type and budget range.',
          400,
        );
      const job = {
        id: id(),
        title: text(input.title),
        category: text(input.category),
        project_type: text(input.projectType),
        description: text(input.description),
        deliverables: text(input.deliverables),
        budget_min: Number(input.budgetMin),
        budget_max: Number(input.budgetMax),
        currency: text(input.currency) || 'USD',
        timeline: text(input.timeline),
        client_user_id: data.state.user.id,
      };
      data.jobs.unshift(job);
      store.write(data);
      return job;
    },
  },
  {
    method: 'GET',
    pattern: '/expert-teams/mine',
    handler: ({ store }) => store.read().teams || [],
  },
  {
    method: 'POST',
    pattern: '/expert-teams',
    handler: ({ store, body }) => {
      const input = body as Record<string, unknown>,
        data = store.read();
      if (!text(input.name) || text(input.name).length > 120)
        throw new ApiError('Provide a team name of up to 120 characters.', 400);
      const team = {
        id: id(),
        name: text(input.name),
        description: text(input.description),
        lead_user_id: data.state.user.id,
        created_at: new Date().toISOString(),
        members: [],
      };
      (data.teams ||= []).push(team);
      store.write(data);
      return team;
    },
  },
  {
    method: 'DELETE',
    pattern: '/expert-teams/:id/members/:userId',
    handler: ({ store, params }) => {
      const data = store.read(),
        team = data.teams?.find((t) => t.id === params.id);
      if (!team) throw new ApiError('Team not found.', 404);
      if (params.userId === team.lead_user_id)
        throw new ApiError('The team lead cannot be removed.', 400);
      team.members = team.members.filter((m) => m.user_id !== params.userId);
      store.write(data);
      return team;
    },
  },
  { method: 'GET', pattern: '/scoping-cases', handler: ({ store }) => store.read().scopes || [] },
  {
    method: 'POST',
    pattern: '/scoping-cases',
    handler: ({ store, body }) => {
      const input = body as Record<string, unknown>,
        data = store.read();
      if (!text(input.objective)) throw new ApiError('Describe your objective.', 400);
      const row: ScopingCase = {
        id: id(),
        status: 'draft',
        objective: text(input.objective),
        problem_statement: text(input.problemStatement),
        desired_outcome: '',
        in_scope: '',
        out_of_scope: '',
        deliverables: '',
        acceptance_criteria: '',
        assumptions: '',
        category: null,
        budget_context: '',
        timeline_context: '',
        risk_band: 'amber',
        published_job_id: null,
      };
      (data.scopes ||= []).unshift(row);
      store.write(data);
      return row;
    },
  },
  {
    method: 'GET',
    pattern: '/scoping-cases/:id',
    handler: ({ store, params }) => scope(store.read(), params.id),
  },
  {
    method: 'PATCH',
    pattern: '/scoping-cases/:id',
    handler: ({ store, params, body }) => {
      const data = store.read(),
        row = scope(data, params.id);
      if (row.status === 'published')
        throw new ApiError('A published scoping case cannot be edited.', 400);
      for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
        const field = fields[key];
        if (field) Object.assign(row, { [field]: value === null ? null : text(value) });
      }
      row.status = 'user_review';
      row.risk_band = 'amber';
      store.write(data);
      return row;
    },
  },
  {
    method: 'POST',
    pattern: '/scoping-cases/:id/suggest',
    handler: ({ store, params }) => {
      const row = scope(store.read(), params.id);
      return {
        suggestions: {
          desiredOutcome: `Demonstrate progress toward: ${row.objective}`,
          deliverables: 'A reviewed draft and final handover package.',
          acceptanceCriteria: 'The client reviews the deliverables against the agreed scope.',
          budgetContext: 'Record your own budget; sample suggestions are not market advice.',
        },
        riskBand: row.risk_band,
      };
    },
  },
  {
    method: 'GET',
    pattern: '/scoping-cases/:id/guidance/:field',
    handler: () => ({
      guidance:
        'Describe what you know, and mark remaining assumptions for review. Sample guidance only.',
    }),
  },
  {
    method: 'PATCH',
    pattern: '/scoping-cases/:id/publish',
    handler: ({ store, params, body }) => {
      const data = store.read(),
        row = scope(data, params.id),
        input = body as { publishedJobId: string };
      if (!data.jobs.some((j) => j.id === input.publishedJobId))
        throw new ApiError('Sample job not found.', 404);
      row.status = 'published';
      row.published_job_id = input.publishedJobId;
      store.write(data);
      return row;
    },
  },
  {
    method: 'POST',
    pattern: '/scoping-cases/:id/request-review',
    handler: () => {
      throw new ApiError(
        'A real expert cannot be contacted from sample data. Create an account to request qualified review.',
        409,
      );
    },
  },
  { method: 'GET', pattern: '/scoping-cases/:id/review/diff', handler: () => null },
];
