import { randomUUID, createHash } from 'node:crypto';
import { z } from 'zod';
import { permissionsFor, requirePermission } from './policy.mjs';
import { requireApprovedModel } from './models.mjs';
import { REGULATED_KEYWORDS } from './regulatedKeywords.mjs';

const messageInput = z
  .object({
    message: z.string().trim().min(1).max(2000),
    jobId: z.string().uuid().optional(),
    proposalId: z.string().uuid().optional(),
    milestoneId: z.string().uuid().optional(),
  })
  .strict();

// Authority band -> minimum permission required to invoke that agent.
// A1 = observe/analyze only (work:write is enough); A2/A3 = may propose or
// perform consequential workflow changes, so it requires workspace:manage,
// matching the same gate mountWorkflows() already applies to workflow mutation routes.
const permissionForBand = { A1: 'work:write', A2: 'workspace:manage', A3: 'workspace:manage' };

async function reviewSources(ctx, deps, useCase, question, extraKinds = []) {
  const model = requireApprovedModel(ctx.store, useCase);
  const sources = [
    ...ctx.store.records(ctx.workspace.id, 'objective'),
    ...ctx.store.records(ctx.workspace.id, 'action'),
    ...extraKinds.flatMap((kind) => ctx.store.records(ctx.workspace.id, kind)),
  ].map((record) => ({ id: record.id, version: record.version, kind: record.kind, data: record }));
  if (!deps.aiProvider) {
    return {
      response: `AI is not configured, so this is a recorded-data summary only: ${sources.length} item(s) on file (${
        sources.filter((s) => s.kind === 'objective').length
      } objective(s), ${sources.filter((s) => s.kind === 'action').length} action(s)). No automated assessment was performed.`,
      evidence: { sourceIds: sources.map((s) => s.id), method: 'recorded-data-only', modelRegistryId: model.id },
    };
  }
  const result = await deps.aiProvider.review({ question, sources }, {});
  return {
    response: result.review.summary,
    evidence: {
      assumptions: result.review.assumptions,
      suggestions: result.review.suggestions,
      evidenceIds: result.review.evidenceIds,
      responseId: result.responseId,
      modelRegistryId: model.id,
    },
  };
}

function loadAuthorizedJob(ctx, jobId) {
  if (!jobId) return null;
  const job = ctx.store.db.prepare('SELECT * FROM job_posts WHERE id = ?').get(jobId);
  if (!job) throw Object.assign(new Error('That job was not found.'), { status: 404 });
  const isClient = job.client_user_id === ctx.principal.id;
  const hasBid = ctx.store.db
    .prepare('SELECT 1 FROM bids WHERE job_id = ? AND freelancer_user_id = ?')
    .get(job.id, ctx.principal.id);
  if (!isClient && !hasBid)
    throw Object.assign(
      new Error('You must be the job owner or have a bid on this job to use this tool.'),
      { status: 403 },
    );
  return job;
}

function loadAuthorizedProposal(ctx, proposalId) {
  if (!proposalId) return null;
  const proposal = ctx.store.db.prepare('SELECT * FROM proposals WHERE id = ?').get(proposalId);
  if (!proposal) throw Object.assign(new Error('That proposal was not found.'), { status: 404 });
  const job = ctx.store.db.prepare('SELECT * FROM job_posts WHERE id = ?').get(proposal.job_id);
  const isAuthor = proposal.author_user_id === ctx.principal.id;
  const isClient = job && job.client_user_id === ctx.principal.id;
  if (!isAuthor && !isClient)
    throw Object.assign(
      new Error('You must be the proposal author or the job owner to use this tool.'),
      { status: 403 },
    );
  return { proposal, job };
}

function loadAuthorizedMilestone(ctx, milestoneId) {
  if (!milestoneId) return null;
  const milestone = ctx.store.db.prepare('SELECT * FROM milestones WHERE id = ?').get(milestoneId);
  if (!milestone) throw Object.assign(new Error('That milestone was not found.'), { status: 404 });
  const project = ctx.store.db.prepare('SELECT * FROM projects WHERE id = ?').get(milestone.project_id);
  const job = project && ctx.store.db.prepare('SELECT * FROM job_posts WHERE id = ?').get(project.job_id);
  const isClient = job && job.client_user_id === ctx.principal.id;
  const isFreelancer = project && project.freelancer_user_id === ctx.principal.id;
  if (!isClient && !isFreelancer)
    throw Object.assign(new Error('You are not a party to this project.'), { status: 403 });
  return { milestone, project, job, isClient, isFreelancer };
}

async function draftJobDocument(ctx, deps, useCase, job, question, templateFallback) {
  const model = requireApprovedModel(ctx.store, useCase);
  if (!deps.aiProvider) {
    return {
      response: templateFallback(job),
      toolCalls: [],
      evidence: { jobId: job.id, method: 'template-only', modelRegistryId: model.id },
    };
  }
  const result = await deps.aiProvider.review(
    { question, sources: [{ id: job.id, version: 1, kind: 'job', data: job }] },
    {},
  );
  return {
    response: result.review.summary,
    toolCalls: [],
    evidence: { jobId: job.id, modelRegistryId: model.id, responseId: result.responseId },
  };
}

const noJobIdResponse = (thing) => ({
  response: `Tell me which job to ${thing} for by including its job ID.`,
  toolCalls: [],
  evidence: null,
});

const agents = {
  'context-curator': {
    name: 'Context Curator',
    engine: 'Shared',
    band: 'A1',
    points: 1,
    humanGate: 'none',
    input: messageInput,
    async execute(ctx, input, deps) {
      const { response, evidence } = await reviewSources(
        ctx,
        deps,
        'companion.context-curator',
        `Summarize the current workspace context relevant to: ${input.message}`,
      );
      return { response, toolCalls: [], evidence };
    },
  },
  'diagnostic-intelligence': {
    name: 'Diagnostic Intelligence',
    engine: 'Clarity',
    band: 'A1',
    points: 1,
    humanGate: 'none',
    input: messageInput,
    async execute(ctx, input, deps) {
      const { response, evidence } = await reviewSources(
        ctx,
        deps,
        'companion.diagnostic-intelligence',
        `Run a business-health-style diagnostic based on this request: ${input.message}`,
        ['progress'],
      );
      return { response, toolCalls: [], evidence };
    },
  },
  'signal-monitoring': {
    name: 'Signal Monitoring',
    engine: 'Shared',
    band: 'A1',
    points: 1,
    humanGate: 'none',
    input: messageInput,
    async execute(ctx, input, deps) {
      const { response, evidence } = await reviewSources(
        ctx,
        deps,
        'companion.signal-monitoring',
        `Summarize what changed recently and what deserves attention, based on: ${input.message}`,
        ['notification', 'progress'],
      );
      return { response, toolCalls: [], evidence };
    },
  },
  'capability-mapper': {
    name: 'Capability Mapper',
    engine: 'Capability',
    band: 'A1',
    points: 1,
    humanGate: 'none',
    input: messageInput,
    async execute(ctx, input, deps) {
      const { response, evidence } = await reviewSources(
        ctx,
        deps,
        'companion.capability-mapper',
        `Identify capability gaps relevant to this request: ${input.message}`,
      );
      return { response, toolCalls: [], evidence };
    },
  },
  'performance-analytics': {
    name: 'Performance Analytics',
    engine: 'Growth',
    band: 'A1',
    points: 1,
    humanGate: 'none',
    input: messageInput,
    async execute(ctx, input, deps) {
      const { response, evidence } = await reviewSources(
        ctx,
        deps,
        'companion.performance-analytics',
        `Summarize measurable progress and performance trends relevant to: ${input.message}`,
        ['progress'],
      );
      return { response, toolCalls: [], evidence };
    },
  },
  'market-intelligence': {
    name: 'Market Intelligence',
    engine: 'Growth',
    band: 'A1',
    points: 1,
    humanGate: 'none',
    input: messageInput,
    async execute(ctx, input, deps) {
      const { response, evidence } = await reviewSources(
        ctx,
        deps,
        'companion.market-intelligence',
        `Surface market, customer, or competitive insight relevant to: ${input.message}`,
        ['knowledge'],
      );
      return { response, toolCalls: [], evidence };
    },
  },
  'proposal-drafter': {
    name: 'Proposal Drafter',
    engine: 'Capability',
    band: 'A1',
    points: 2,
    humanGate: 'none',
    input: messageInput,
    async execute(ctx, input, deps) {
      if (!input.jobId) return noJobIdResponse('draft a proposal');
      const job = loadAuthorizedJob(ctx, input.jobId);
      return draftJobDocument(
        ctx,
        deps,
        'companion.proposal-drafter',
        job,
        'Draft a concise, client-ready proposal for this job using only the facts below. Do not invent scope, price, or timeline beyond what is given.',
        (j) =>
          `Draft proposal for "${j.title}"\n\nScope: ${j.deliverables}\nBudget: ${j.budget_min}-${j.budget_max} ${j.currency}\nTimeline: ${j.timeline}\n\n(AI is not configured, so this is a templated draft assembled directly from the job's recorded fields. No automated assessment was performed.)`,
      );
    },
  },
  'scope-builder': {
    name: 'Scope of Work Builder',
    engine: 'Capability',
    band: 'A1',
    points: 2,
    humanGate: 'none',
    input: messageInput,
    async execute(ctx, input, deps) {
      if (!input.jobId) return noJobIdResponse('build a scope of work');
      const job = loadAuthorizedJob(ctx, input.jobId);
      return draftJobDocument(
        ctx,
        deps,
        'companion.scope-builder',
        job,
        'Draft a scope-of-work section (objectives, in-scope work, out-of-scope, deliverables) using only the facts below.',
        (j) =>
          `Scope of Work for "${j.title}"\n\nObjectives: ${j.description}\nIn scope: ${j.deliverables}\nBudget: ${j.budget_min}-${j.budget_max} ${j.currency}\nTimeline: ${j.timeline}\n\n(AI is not configured, so this is a templated draft assembled directly from the job's recorded fields.)`,
      );
    },
  },
  'sow-builder': {
    name: 'Statement of Work Builder',
    engine: 'Capability',
    band: 'A1',
    points: 2,
    humanGate: 'none',
    input: messageInput,
    async execute(ctx, input, deps) {
      if (!input.jobId) return noJobIdResponse('build a statement of work');
      const job = loadAuthorizedJob(ctx, input.jobId);
      return draftJobDocument(
        ctx,
        deps,
        'companion.sow-builder',
        job,
        'Draft a formal statement of work (parties, scope, milestones, payment schedule, revision terms) using only the facts below.',
        (j) =>
          `Statement of Work for "${j.title}"\n\nScope: ${j.deliverables}\nPayment: ${j.budget_min}-${j.budget_max} ${j.currency}\nTimeline: ${j.timeline}\nRevision terms: not specified beyond the recorded deliverables.\n\n(AI is not configured, so this is a templated draft assembled directly from the job's recorded fields.)`,
      );
    },
  },
  'brief-builder': {
    name: 'Client Brief Builder',
    engine: 'Capability',
    band: 'A1',
    points: 2,
    humanGate: 'none',
    input: messageInput,
    async execute(ctx, input, deps) {
      if (!input.jobId) return noJobIdResponse('build a client brief');
      const job = loadAuthorizedJob(ctx, input.jobId);
      return draftJobDocument(
        ctx,
        deps,
        'companion.brief-builder',
        job,
        'Draft a short, plain-language client brief summarizing this job using only the facts below.',
        (j) =>
          `Client Brief: "${j.title}"\n\n${j.description}\n\nBudget: ${j.budget_min}-${j.budget_max} ${j.currency}\nTimeline: ${j.timeline}\n\n(AI is not configured, so this is a templated draft assembled directly from the job's recorded fields.)`,
      );
    },
  },
  'deliverable-builder': {
    name: 'Deliverable Builder',
    engine: 'Capability',
    band: 'A1',
    points: 2,
    humanGate: 'none',
    input: messageInput,
    async execute(ctx, input, deps) {
      if (!input.jobId) return noJobIdResponse('build an itemized deliverable list');
      const job = loadAuthorizedJob(ctx, input.jobId);
      return draftJobDocument(
        ctx,
        deps,
        'companion.deliverable-builder',
        job,
        'Break the recorded deliverables into a clear, itemized list using only the facts below. Do not invent deliverables beyond what is recorded.',
        (j) =>
          `Deliverables for "${j.title}"\n\n${j.deliverables}\n\n(AI is not configured, so this is the recorded deliverables text, not an itemized breakdown.)`,
      );
    },
  },
  'acceptance-builder': {
    name: 'Acceptance Criteria Builder',
    engine: 'Capability',
    band: 'A1',
    points: 2,
    humanGate: 'none',
    input: messageInput,
    async execute(ctx, input, deps) {
      if (!input.jobId) return noJobIdResponse('build acceptance criteria');
      const job = loadAuthorizedJob(ctx, input.jobId);
      return draftJobDocument(
        ctx,
        deps,
        'companion.acceptance-builder',
        job,
        'Draft testable pass/fail acceptance criteria for each deliverable, using only the facts below. Do not invent requirements beyond what is recorded.',
        (j) =>
          `Acceptance Criteria for "${j.title}"\n\nDeliverables to verify: ${j.deliverables}\n\n(AI is not configured, so criteria could not be drafted. Review the recorded deliverables directly.)`,
      );
    },
  },
  'change-order': {
    name: 'Change Order Generator',
    engine: 'Capability',
    band: 'A1',
    points: 2,
    humanGate: 'none',
    input: messageInput,
    async execute(ctx, input, deps) {
      if (!input.proposalId)
        return {
          response: 'Tell me which proposal this change order applies to by including its proposal ID.',
          toolCalls: [],
          evidence: null,
        };
      const { proposal, job } = loadAuthorizedProposal(ctx, input.proposalId);
      const model = requireApprovedModel(ctx.store, 'companion.change-order');
      const requestedChange = input.message;
      if (!deps.aiProvider) {
        return {
          response: `Change Order for proposal "${proposal.title}"\n\nOriginal scope: ${proposal.scope}\nOriginal amount: ${proposal.amount} ${proposal.currency}\nRequested change: ${requestedChange}\n\n(AI is not configured, so this is a templated draft. Review and finalize the revised scope/amount before sending.)`,
          toolCalls: [],
          evidence: { proposalId: proposal.id, jobId: job?.id, method: 'template-only', modelRegistryId: model.id },
        };
      }
      const result = await deps.aiProvider.review(
        {
          question: `Draft a change order describing how this proposal's scope and amount should change, given the requested change below. Requested change: ${requestedChange}. Do not invent scope or price beyond what is given or requested.`,
          sources: [{ id: proposal.id, version: 1, kind: 'proposal', data: proposal }],
        },
        {},
      );
      return {
        response: result.review.summary,
        toolCalls: [],
        evidence: { proposalId: proposal.id, jobId: job?.id, modelRegistryId: model.id, responseId: result.responseId },
      };
    },
  },
  'quote-generator': {
    name: 'Quote Generator',
    engine: 'Capability',
    band: 'A1',
    points: 1,
    humanGate: 'none',
    input: messageInput,
    async execute(ctx, input) {
      if (!input.jobId) return noJobIdResponse('generate a quote');
      const job = loadAuthorizedJob(ctx, input.jobId);
      const suggested = Math.round((job.budget_min + job.budget_max) / 2);
      return {
        response: `Quote for "${job.title}"\n\nRange: ${job.budget_min}-${job.budget_max} ${job.currency}\nSuggested quote: ${suggested} ${job.currency}\nTimeline: ${job.timeline}\n\nThis is a computed estimate from the job's recorded budget range, not a binding offer.`,
        toolCalls: [],
        evidence: { jobId: job.id, method: 'deterministic-calculation' },
      };
    },
  },
  'estimate-generator': {
    name: 'Estimate Generator',
    engine: 'Capability',
    band: 'A1',
    points: 1,
    humanGate: 'none',
    input: messageInput,
    async execute(ctx, input) {
      if (!input.jobId) return noJobIdResponse('generate an estimate');
      const job = loadAuthorizedJob(ctx, input.jobId);
      return {
        response: `Estimate for "${job.title}"\n\nLow: ${job.budget_min} ${job.currency}\nHigh: ${job.budget_max} ${job.currency}\nAssumptions: scope matches the recorded deliverables (${job.deliverables}); timeline ${job.timeline}. Actual cost may vary if scope changes.`,
        toolCalls: [],
        evidence: { jobId: job.id, method: 'deterministic-calculation' },
      };
    },
  },
  'invoice-generator': {
    name: 'Invoice Generator',
    engine: 'Capability',
    band: 'A1',
    points: 1,
    humanGate: 'none',
    input: messageInput,
    // Deterministic only, by design: an invoice amount must exactly match the
    // approved milestone record. It is never phrased or computed by an AI
    // model, so it cannot be hallucinated, regardless of provider configuration.
    async execute(ctx, input) {
      if (!input.milestoneId)
        return {
          response: 'Tell me which approved milestone to invoice by including its milestone ID.',
          toolCalls: [],
          evidence: null,
        };
      const { milestone, job } = loadAuthorizedMilestone(ctx, input.milestoneId);
      if (milestone.status !== 'approved')
        return {
          response: `Milestone "${milestone.title}" is not yet approved (current status: ${milestone.status}). An invoice can only be generated once the client has approved the milestone.`,
          toolCalls: [],
          evidence: { milestoneId: milestone.id, status: milestone.status },
        };
      const existing = ctx.store.db
        .prepare(
          "SELECT COUNT(*) AS count FROM agent_runs WHERE agent_id = 'invoice-generator' AND workspace_id = ?",
        )
        .get(ctx.workspace.id).count;
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(existing + 1).padStart(4, '0')}`;
      const issuedAt = new Date().toISOString().slice(0, 10);
      return {
        response: `Invoice ${invoiceNumber}\n\nFor: ${job ? job.title : milestone.title}\nMilestone: ${milestone.title}\nAmount due: ${milestone.amount} ${milestone.currency}\nIssued: ${issuedAt}\n\nThis amount is taken directly from the approved milestone record. It is not editable by this tool and was not generated or phrased by an AI model.`,
        toolCalls: [],
        evidence: {
          milestoneId: milestone.id,
          invoiceNumber,
          amount: milestone.amount,
          currency: milestone.currency,
          method: 'deterministic-calculation',
        },
      };
    },
  },
  'workflow-orchestration': {
    name: 'Workflow Orchestration',
    engine: 'Consistency',
    band: 'A2',
    points: 3,
    humanGate: 'approve',
    input: messageInput,
    async execute(ctx, input, deps) {
      const { workflowRuntime } = deps;
      const match = input.message.match(
        /\b(approve|pause|resume|cancel|start|retry)\b.*?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
      );
      if (!match) {
        const runs = workflowRuntime.list(ctx.workspace.id);
        return {
          response:
            runs.length === 0
              ? 'No workflows exist in this workspace yet. Create one from the Workflows page.'
              : `This workspace has ${runs.length} workflow(s). States: ${runs
                  .map((run) => `${run.title} (${run.state})`)
                  .join('; ')}. Say e.g. "approve workflow <id>" to act on one.`,
          toolCalls: [],
          evidence: { workflowIds: runs.map((run) => run.id) },
        };
      }
      const [, command, workflowId] = match;
      const run = workflowRuntime.read(workflowId, ctx.workspace.id);
      if (!run) throw Object.assign(new Error('That workflow was not found in this workspace.'), { status: 404 });
      const body = { version: run.version, command: command.toLowerCase() };
      if (command.toLowerCase() === 'approve') {
        const objectiveRow = ctx.store.db
          .prepare("SELECT version FROM records WHERE id = ? AND workspace_id = ? AND kind = 'objective'")
          .get(run.objective_id, ctx.workspace.id);
        if (objectiveRow) body.objectiveVersion = objectiveRow.version;
      }
      const updated = workflowRuntime.command(workflowId, ctx.workspace.id, ctx.principal.id, body);
      return {
        response: `Workflow "${updated.title}" is now ${updated.state}.`,
        toolCalls: [{ toolId: 'workflow.command', input: body }],
        evidence: { workflowId: updated.id, state: updated.state, version: updated.version },
      };
    },
  },
};

export const agentManifests = Object.entries(agents).map(([id, agent]) => ({
  id,
  name: agent.name,
  engine: agent.engine,
  authorityBand: agent.band,
  humanGate: agent.humanGate,
  pointsCost: agent.points,
}));

function route(message) {
  if (/\bworkflows?\b|\b(approve|pause|resume|cancel|start|retry)\b/i.test(message))
    return 'workflow-orchestration';
  if (/\bchange orders?\b|\bchange requests?\b/i.test(message)) return 'change-order';
  if (/\bscope\b/i.test(message)) return 'scope-builder';
  if (/\bstatement of work\b|\bsow\b/i.test(message)) return 'sow-builder';
  if (/\bbriefs?\b/i.test(message)) return 'brief-builder';
  if (/\bdeliverables?\b/i.test(message)) return 'deliverable-builder';
  if (/\bacceptance criteria\b|\bacceptance\b/i.test(message)) return 'acceptance-builder';
  if (/\binvoices?\b/i.test(message)) return 'invoice-generator';
  if (/\bquotes?\b/i.test(message)) return 'quote-generator';
  if (/\bestimates?\b/i.test(message)) return 'estimate-generator';
  if (/\bsignals?\b|\bnotifications?\b|\bchanged?\b/i.test(message)) return 'signal-monitoring';
  if (/\bcapabilit(y|ies)\b|\bgaps?\b|\bskills?\b/i.test(message)) return 'capability-mapper';
  if (/\bkpis?\b|\bperformance\b|\bmetrics?\b|\banalytics?\b/i.test(message))
    return 'performance-analytics';
  if (/\bmarkets?\b|\bcampaigns?\b|\bcustomers?\b|\bcompetitors?\b/i.test(message))
    return 'market-intelligence';
  if (/\bproposals?\b|\bdrafts?\b/i.test(message)) return 'proposal-drafter';
  if (/\bhealth\b|\bdiagnos\w*\b|\brisk\b|\bassess\w*\b/i.test(message)) return 'diagnostic-intelligence';
  return 'context-curator';
}

export function createAgentRuntime(store, deps) {
  const { db, transaction, log } = store;
  function agentFor(agentId) {
    const agent = agents[agentId];
    if (!agent) throw Object.assign(new Error('Unknown agent.'), { status: 404 });
    return agent;
  }
  async function send(workspace, principal, body, idempotencyKey) {
    const input = messageInput.parse(body);
    const agentId = route(input.message);
    const agent = agentFor(agentId);
    const points = agent.points || 0;
    const runId = randomUUID();
    const createdAt = new Date().toISOString();
    const operation = 'companion.message';
    if (idempotencyKey && !/^[a-zA-Z0-9_-]{8,128}$/.test(idempotencyKey))
      throw Object.assign(new Error('Use an 8–128 character idempotency key.'), { status: 400 });
    const fingerprint = idempotencyKey
      ? createHash('sha256').update(JSON.stringify(input)).digest('hex')
      : null;
    if (idempotencyKey) {
      const prior = db
        .prepare(
          'SELECT * FROM idempotency WHERE user_id = ? AND workspace_id = ? AND operation = ? AND key = ?',
        )
        .get(principal.id, workspace.id, operation, idempotencyKey);
      if (prior) {
        if (prior.fingerprint !== fingerprint)
          throw Object.assign(
            new Error('This idempotency key was already used for different input.'),
            { status: 409 },
          );
        return JSON.parse(prior.response);
      }
    }
    transaction(() => {
      if (points > 0) {
        const charged = db
          .prepare('UPDATE users SET points_balance = points_balance - ? WHERE id = ? AND points_balance >= ?')
          .run(points, principal.id, points);
        if (charged.changes !== 1)
          throw Object.assign(new Error('You do not have enough points for this agent.'), { status: 402 });
        db.prepare('INSERT INTO points_ledger VALUES (?, ?, ?, ?, ?, ?, ?)').run(
          randomUUID(),
          principal.id,
          workspace.id,
          -points,
          'agent_run',
          runId,
          Date.now(),
        );
      }
      db.prepare('INSERT INTO agent_runs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
        runId,
        workspace.id,
        principal.id,
        agentId,
        JSON.stringify(input),
        null,
        'running',
        createdAt,
        null,
      );
    });
    try {
      const result = await agent.execute({ store, principal, workspace }, input, deps);
      const response = transaction(() => {
        db.prepare('UPDATE agent_runs SET output = ?, status = ?, completed_at = ? WHERE id = ?').run(
          JSON.stringify(result),
          'completed',
          new Date().toISOString(),
          runId,
        );
        const balance = db.prepare('SELECT points_balance FROM users WHERE id = ?').get(principal.id)
          .points_balance;
        const built = { runId, agentId, pointsCharged: points, balance, ...result };
        if (idempotencyKey)
          db.prepare('INSERT INTO idempotency VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
            principal.id,
            workspace.id,
            operation,
            idempotencyKey,
            fingerprint,
            201,
            JSON.stringify(built),
            Date.now(),
          );
        return built;
      });
      log(workspace.id, principal.name, 'Companion agent responded', runId, agentId);
      // The agent still answers — this only additionally raises a handoff so a qualified human
      // can pick up what the agent should not decide alone. Keyword-based, same list the scoping
      // risk-band classifier uses, so "needs a licensed human" reads the same way everywhere.
      if (REGULATED_KEYWORDS.some((word) => input.message.toLowerCase().includes(word))) {
        const handoffId = randomUUID();
        db.prepare('INSERT INTO handoffs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
          handoffId,
          workspace.id,
          principal.id,
          `companion.${agentId}`,
          input.message.slice(0, 2000),
          JSON.stringify({ runId, agentId, response: result.response ?? null }),
          null,
          'pending',
          null,
          null,
          createdAt,
          null,
        );
        log(workspace.id, principal.name, 'AI-to-human handoff raised', handoffId, agentId);
        response.humanHandoffRequested = true;
        response.handoffId = handoffId;
      }
      return response;
    } catch (error) {
      transaction(() => {
        db.prepare('UPDATE agent_runs SET output = ?, status = ?, completed_at = ? WHERE id = ?').run(
          JSON.stringify({ error: error.message }),
          'failed',
          new Date().toISOString(),
          runId,
        );
        if (points > 0) {
          db.prepare('UPDATE users SET points_balance = points_balance + ? WHERE id = ?').run(
            points,
            principal.id,
          );
          db.prepare('INSERT INTO points_ledger VALUES (?, ?, ?, ?, ?, ?, ?)').run(
            randomUUID(),
            principal.id,
            workspace.id,
            points,
            'agent_run_refund',
            runId,
            Date.now(),
          );
        }
      });
      log(workspace.id, principal.name, 'Companion agent failed', runId, error.message);
      throw error;
    }
  }
  return { send, route, agentFor, agents: agentManifests };
}

export function mountAgents(app, store, runtime, { spendLimiter = (_req, _res, next) => next() } = {}) {
  app.get('/api/companion/agents', (_req, res) => res.json(runtime.agents));
  app.post(
    '/api/companion/messages',
    spendLimiter,
    requirePermission('work:write'),
    async (req, res, next) => {
      try {
        const input = messageInput.parse(req.body);
        const agentId = runtime.route(input.message);
        const manifest = runtime.agentFor(agentId);
        const requiredPermission = permissionForBand[manifest.band] || 'workspace:manage';
        if (!permissionsFor(req.workspace.role).includes(requiredPermission))
          return res.status(403).json({ error: 'Your workspace role does not allow this action.' });
        const result = await runtime.send(
          req.workspace,
          req.user,
          req.body,
          req.get('Idempotency-Key'),
        );
        res.status(201).json(result);
      } catch (error) {
        next(error);
      }
    },
  );
}
