import { ApiError } from '../../../../api';
import engineSnapshot from '../engineCatalog.json' with { type: 'json' };
import type { SandboxRoute } from '../router';
import type { SandboxData } from '../types';

// Read-only coverage for the remaining workspace pages (crawl of 2026-10-10). Every response uses
// the shape the server route returns; data is derived from the persona's own sandbox so pages tell
// one consistent story. Personal or admin-only lists stay empty or refuse exactly as the server
// does. Mutations on these pages remain unsupported (501 "Not available in the demo.").

const DAY = 86_400_000;
const iso = (data: SandboxData, offsetDays: number) => {
  const latest = data.activity[0]?.createdAt ?? new Date().toISOString();
  return new Date(new Date(latest).getTime() + offsetDays * DAY).toISOString();
};
const adminOnly = (message: string) => () => {
  throw new ApiError(message, 403);
};
/** Points price the server quotes when POINTS_UNIT_PRICE_MINOR is unset (src/app/billing.mjs). */
const POINTS_UNIT_PRICE_MINOR = 10;
const POINTS_BALANCE = 1200;
const catalog = engineSnapshot.catalog;

const fundingRows = (data: SandboxData) =>
  data.projects.flatMap((project) =>
    project.milestones.flatMap((milestone) => {
      const funding = data.fundings[milestone.id];
      return funding ? [{ project, milestone, funding }] : [];
    }),
  );

/** Reminders from the persona's latest activity; the two newest start unread. */
function notices(data: SandboxData) {
  return data.activity.slice(0, 5).map((item, i) => {
    const id = `demo-notice-${item.id}`;
    return {
      id,
      message: `${item.title} — ${item.status}`,
      createdAt: item.createdAt,
      readAt: data.readNotices?.[id] ?? (i < 2 ? null : item.createdAt),
    };
  });
}

const OPPORTUNITY_STATUSES = ['identified', 'qualified', 'pursuing', 'won', 'lost'];
type OpportunityRow = NonNullable<SandboxData['opportunities']>[number];
/** Stored opportunities, or the persona's starting pipeline (other clients' open jobs). */
function opportunityRows(data: SandboxData): OpportunityRow[] {
  if (data.opportunities) return data.opportunities;
  return data.marketplace.map((job, i) => ({
    id: `demo-opportunity-${job.id}`,
    title: job.title,
    description: job.description,
    source: 'Marketplace',
    status: OPPORTUNITY_STATUSES[[2, 1, 0][i] ?? 0],
    // The last starter has no value estimate yet, so its readiness reads as partial.
    value_estimate: i === 2 ? null : job.budget_max,
    type: 'project',
    created_at: iso(data, -6 + i),
    updated_at: iso(data, -2 + i),
  }));
}
/** Same rule as the server (growth.mjs computeReadiness): value, source and recent activity. */
function withReadiness(row: OpportunityRow) {
  const fresh = Date.now() - new Date(row.updated_at).getTime() <= 30 * DAY;
  const score = [row.value_estimate !== null, Boolean(row.source), fresh].filter(Boolean).length;
  return { ...row, readiness: score === 3 ? 'ready' : score >= 1 ? 'partial' : 'not_ready' };
}

export const toolRoutes: SandboxRoute[] = [
  // ---------- Progress ----------
  {
    method: 'GET',
    pattern: '/progress',
    // Three snapshots per objective, completion rising to today's count of done actions.
    handler: ({ store }) => {
      const data = store.read();
      return data.state.objectives.flatMap((objective) => {
        const actions = data.state.actions.filter((a) => a.objectiveId === objective.id);
        const total = Math.max(actions.length, 1);
        const done = actions.filter((a) => a.status === 'Done').length;
        return [0, 1, 2].map((step) => ({
          id: `demo-snapshot-${objective.id}-${step}`,
          objectiveId: objective.id,
          objectiveVersion: objective.version,
          completed: Math.max(0, done - (2 - step)),
          total,
          createdAt: iso(data, -14 + step * 7),
        }));
      });
    },
  },

  // ---------- Finance, pricing, payouts ----------
  {
    method: 'GET',
    pattern: '/points',
    handler: ({ store }) => {
      const data = store.read();
      return {
        balance: POINTS_BALANCE,
        ledger: [
          {
            amount: 2000,
            reason: 'Points purchase',
            reference_id: null,
            created_at: Date.parse(iso(data, -30)),
          },
          {
            amount: -40,
            reason: 'Job post',
            reference_id: data.jobs[0]?.id ?? null,
            created_at: Date.parse(iso(data, -9)),
          },
        ],
      };
    },
  },
  {
    method: 'GET',
    pattern: '/finance/points',
    handler: ({ store }) => {
      const data = store.read();
      return {
        balance: POINTS_BALANCE,
        unitPriceMinor: POINTS_UNIT_PRICE_MINOR,
        currency: 'USD',
        totalPurchasedPoints: 2000,
        totalPurchasedMinor: 2000 * POINTS_UNIT_PRICE_MINOR,
        recentLedger: [
          {
            amount: -40,
            reason: 'Job post',
            reference_id: data.jobs[0]?.id ?? null,
            created_at: Date.parse(iso(data, -9)),
          },
          {
            amount: -65,
            reason: 'Diagnostic Intelligence run',
            reference_id: null,
            created_at: Date.parse(iso(data, -12)),
          },
          {
            amount: 2000,
            reason: 'Points purchase',
            reference_id: null,
            created_at: Date.parse(iso(data, -30)),
          },
        ],
      };
    },
  },
  {
    method: 'GET',
    pattern: '/finance/overview',
    // Escrow totals and items from the persona's milestone funding, payouts from released funds.
    handler: ({ store }) => {
      const data = store.read();
      const rows = fundingRows(data);
      const sum = (status: string) =>
        rows
          .filter((r) => r.funding.status === status)
          .reduce((t, r) => t + r.funding.amount_minor, 0);
      return {
        escrow: {
          heldMinor: sum('held'),
          releasedMinor: sum('released'),
          refundedMinor: sum('refunded'),
          pendingMinor: sum('pending'),
          items: rows.map(({ project, milestone, funding }) => ({
            id: funding.id,
            milestoneId: milestone.id,
            milestoneTitle: milestone.title,
            projectTitle: project.title,
            amountMinor: funding.amount_minor,
            currency: funding.currency,
            status: funding.status,
            createdAt: funding.created_at ?? funding.held_at ?? iso(data, -12),
            heldAt: funding.held_at,
            releasedAt: funding.released_at,
            refundedAt: funding.refunded_at ?? null,
          })),
        },
        transfers: rows
          .filter((r) => r.funding.status === 'released' && r.funding.released_at)
          .map(({ milestone, funding }) => ({
            id: `transfer-${funding.id}`,
            milestoneTitle: milestone.title,
            amountMinor: funding.amount_minor,
            currency: funding.currency,
            status: 'succeeded',
            createdAt: funding.released_at!,
          })),
        billing: { lineItems: [], totalMinor: 0, currency: 'USD' },
      };
    },
  },
  {
    method: 'GET',
    pattern: '/billables',
    handler: () => ({
      pointsUnitPriceMinor: POINTS_UNIT_PRICE_MINOR,
      currency: 'USD',
      tools: catalog.engines.map((engine) => ({
        id: engine.code,
        name: engine.engineName,
        home_engine: engine.homeEngine,
        max_authority: 'A1',
        human_gate: 'none',
        points_cost: engine.pointsCost,
      })),
      learningPaths: [],
      deepReview: {
        name: 'AI Deep Review',
        description:
          'A thorough, evidence-grounded objective review — heavier than a Companion tool call.',
        pointsCost: 100,
      },
    }),
  },
  { method: 'GET', pattern: '/bundles', handler: () => [] },
  {
    method: 'GET',
    pattern: '/admin/bundles',
    handler: adminOnly('Only an ecosystem administrator can manage bundles.'),
  },
  {
    method: 'GET',
    pattern: '/payment-accounts',
    handler: ({ store }) => store.read().personal?.payoutAccounts || [],
  },
  {
    method: 'POST',
    pattern: '/payment-accounts',
    handler: ({ store, body }) => {
      const input = body as {
        provider: string;
        accountName: string;
        accountNumber: string;
        bankCode: string;
      };
      if (
        input.provider !== 'paystack' ||
        input.bankCode !== 'demo-bank' ||
        !/^\d{10}$/.test(input.accountNumber) ||
        !input.accountName?.trim()
      )
        throw new ApiError('Use the sample bank and a ten-digit sample account number.', 400);
      const data = store.read();
      data.personal ||= {};
      data.personal.payoutAccounts ||= [];
      data.personal.payoutAccounts.unshift({
        id: crypto.randomUUID(),
        provider: 'paystack',
        account_name: input.accountName.trim(),
        lastFour: input.accountNumber.slice(-4),
        bank_code: input.bankCode,
        created_at: new Date().toISOString(),
      });
      store.write(data);
      return { ok: true, demo: true };
    },
  },
  {
    method: 'GET',
    pattern: '/payment-banks',
    handler: () => [{ name: 'Sample bank (demo only)', code: 'demo-bank' }],
  },
  // Payouts to the user as a freelancer; the sample persona is the client on its projects.
  { method: 'GET', pattern: '/payment-transfers', handler: () => [] },
  {
    method: 'GET',
    pattern: '/payment-providers',
    handler: () => ({ paystack: true, crypto_usdt: false }),
  },

  // ---------- People & members ----------
  {
    method: 'GET',
    pattern: '/people/overview',
    handler: ({ store }) => {
      const data = store.read();
      const { user, workspace } = data.state;
      const roster = [
        {
          userId: user.id,
          name: user.name,
          email: 'you@sample.lamid.one',
          role: workspace.role,
          talent: null,
        },
        {
          userId: 'demo-colleague-1',
          name: 'Priya Natarajan (sample)',
          email: 'priya@sample.lamid.one',
          role: 'member',
          talent: null,
        },
        {
          userId: 'demo-colleague-2',
          name: 'Tomás Herrera (sample)',
          email: 'tomas@sample.lamid.one',
          role: 'member',
          talent: null,
        },
      ];
      return {
        roster,
        teams: [
          {
            id: 'demo-team-delivery',
            name: 'Delivery',
            description: 'Owns active client projects and milestone reviews.',
            leadName: user.name,
            members: roster.map(({ userId, name, role }) => ({ userId, name, role })),
          },
        ],
        recentCapabilityReviews: [],
      };
    },
  },
  {
    method: 'GET',
    pattern: '/admin/escrow-overview',
    handler: adminOnly('Only an ecosystem administrator can view the escrow overview.'),
  },
  {
    method: 'GET',
    pattern: '/admin/concierge-applications',
    handler: adminOnly('Only an ecosystem administrator can view concierge applications.'),
  },

  // ---------- Opportunities & growth ----------
  {
    method: 'GET',
    pattern: '/opportunities',
    handler: ({ store }) => opportunityRows(store.read()).map(withReadiness),
  },
  {
    method: 'POST',
    pattern: '/opportunities',
    // Mirrors POST /api/opportunities: new opportunities start as identified.
    handler: ({ store, body }) => {
      const input = (body ?? {}) as { title?: string; description?: string; source?: string };
      const title = input.title?.trim();
      if (!title) throw new ApiError('Give the opportunity a title.', 400);
      const data = store.read();
      const now = new Date().toISOString();
      const row: OpportunityRow = {
        id: `demo-opportunity-${crypto.randomUUID()}`,
        title,
        description: input.description?.trim() ?? '',
        source: input.source?.trim() ?? '',
        status: 'identified',
        value_estimate: null,
        type: null,
        created_at: now,
        updated_at: now,
      };
      data.opportunities = [row, ...opportunityRows(data)];
      store.write(data);
      return withReadiness(row);
    },
  },
  {
    method: 'PATCH',
    pattern: '/opportunities/:id',
    handler: ({ store, params, body }) => {
      const input = (body ?? {}) as { status?: string };
      const data = store.read();
      const rows = opportunityRows(data);
      const row = rows.find((r) => r.id === params.id);
      if (!row) throw new ApiError('Opportunity not found.', 404);
      if (input.status) {
        if (!OPPORTUNITY_STATUSES.includes(input.status))
          throw new ApiError('Choose a valid opportunity status.', 400);
        row.status = input.status;
      }
      row.updated_at = new Date().toISOString();
      data.opportunities = rows;
      store.write(data);
      return withReadiness(row);
    },
  },
  {
    method: 'GET',
    pattern: '/kpis',
    handler: ({ store }) =>
      store.read().state.objectives.map((objective, i) => ({
        id: `demo-kpi-${objective.id}`,
        name: `${objective.title} — completion`,
        unit: '%',
        target: 100,
        calculation_method: 'Completed actions ÷ all actions linked to the objective',
        version: 1 + i,
      })),
  },
  {
    method: 'GET',
    pattern: '/kpis/:id/observations',
    // The objective's completion recorded weekly, rising to today's share of done actions.
    handler: ({ store, params }) => {
      const data = store.read();
      const objective = data.state.objectives.find((o) => `demo-kpi-${o.id}` === params.id);
      if (!objective) throw new ApiError('KPI not found.', 404);
      const actions = data.state.actions.filter((a) => a.objectiveId === objective.id);
      const done = actions.filter((a) => a.status === 'Done').length;
      const pct = (n: number) => Math.round((Math.max(0, n) / Math.max(actions.length, 1)) * 100);
      const weekly = [2, 1, 0].map((weeksAgo) => ({
        id: `demo-observation-${objective.id}-${weeksAgo}`,
        value: pct(done - weeksAgo),
        observed_at: iso(data, -7 * weeksAgo),
        source: 'Weekly review',
        hasEvidence: false,
      }));
      // Values recorded in this demo session come after the weekly history, oldest first.
      return [...weekly, ...(data.kpiObservations?.[params.id] ?? [])];
    },
  },
  {
    method: 'POST',
    pattern: '/kpis/:id/observations',
    // Mirrors POST /api/kpis/:id/observations (without evidence files, which need uploads).
    handler: ({ store, params, body }) => {
      const data = store.read();
      if (!data.state.objectives.some((o) => `demo-kpi-${o.id}` === params.id))
        throw new ApiError('KPI not found.', 404);
      const value = Number((body as { value?: unknown })?.value);
      if (!Number.isFinite(value)) throw new ApiError('Enter a number to record.', 400);
      const observation = {
        id: `demo-observation-${crypto.randomUUID()}`,
        value,
        observed_at: new Date().toISOString(),
        source: 'Recorded in the demo',
        hasEvidence: false,
      };
      data.kpiObservations = {
        ...data.kpiObservations,
        [params.id]: [...(data.kpiObservations?.[params.id] ?? []), observation],
      };
      store.write(data);
      return observation;
    },
  },
  {
    method: 'GET',
    pattern: '/experiments',
    handler: ({ store }) => {
      const objective = store.read().state.objectives[0];
      return objective
        ? [
            {
              id: `demo-experiment-${objective.id}`,
              title: `Weekly review cadence for “${objective.title}”`,
              hypothesis:
                'A fixed weekly review moves actions to done faster than ad-hoc check-ins.',
              metric: 'Actions completed per week',
              status: 'running',
              result: '',
              variants: [
                { name: 'Ad-hoc check-ins', trafficWeightPercent: 50 },
                { name: 'Weekly review', trafficWeightPercent: 50 },
              ],
              winning_variant: null,
            },
          ]
        : [];
    },
  },

  // ---------- Intelligence, knowledge, engines, learning ----------
  // AI is disabled for the sample workspace (see /ai/settings), so there are no AI reviews or
  // model executions to show.
  { method: 'GET', pattern: '/ai/reviews', handler: () => [] },
  { method: 'GET', pattern: '/models/executions', handler: () => [] },
  {
    method: 'GET',
    pattern: '/knowledge',
    handler: ({ store, query }) => {
      const data = store.read();
      const items = data.state.objectives.map((objective, i) => ({
        id: `demo-knowledge-${objective.id}`,
        title: `Context: ${objective.title}`,
        content: objective.description || `Notes and constraints behind “${objective.title}”.`,
        objectiveId: objective.id,
        sourceType: 'note',
        sourceName: 'Workspace note',
        classification: 'workspace',
        version: 1,
        observedAt: iso(data, -10 + i),
        contentHash: `sample-${objective.id}`,
      }));
      const q = (query.get('q') ?? '').trim().toLowerCase();
      const matching = items.filter((item) =>
        `${item.title} ${item.content}`.toLowerCase().includes(q),
      );
      return { items: matching, total: matching.length };
    },
  },
  { method: 'GET', pattern: '/engines', handler: () => catalog },
  { method: 'GET', pattern: '/engines/catalog/coverage', handler: () => engineSnapshot.coverage },
  {
    method: 'GET',
    pattern: '/learning/paths',
    handler: ({ store }) => {
      const data = store.read();
      const domain = data.talentProfile?.domains[0] ?? data.state.workspace.context;
      return [
        {
          title: 'Decision quality foundations',
          description: 'Frame decisions, weigh alternatives and record what you will learn.',
          hours: 3,
        },
        {
          title: `${domain} delivery essentials`,
          description: 'Scope work into milestones, agree acceptance criteria and review delivery.',
          hours: 5,
        },
        {
          title: 'Running a weekly operating rhythm',
          description: 'Reviews, priorities and follow-through that keep important work moving.',
          hours: 2,
        },
      ].map((path, i) => ({
        id: `demo-path-${i}`,
        title: path.title,
        description: path.description,
        domain,
        function: null,
        industry: null,
        estimated_hours: path.hours,
        points_cost: null,
        language: 'en',
        coach_user_id: null,
        created_by: null,
        modules: ['Read', 'Practise', 'Check'].map((step, m) => ({
          id: `demo-path-${i}-module-${m}`,
          path_id: `demo-path-${i}`,
          title: `${step}: ${path.title.toLowerCase()}`,
          description: path.description,
          format: (['reading', 'exercise', 'assessment'] as const)[m],
          order_index: m,
          estimated_minutes: 20 + m * 10,
          content_url: null,
          quiz_skill: null,
        })),
        prerequisites: [],
        feedback: { count: 4 + i * 3, average: 4.6 - i * 0.2 },
      }));
    },
  },
  {
    method: 'GET',
    pattern: '/learning/enrollments/mine',
    handler: ({ store }) => {
      const data = store.read();
      return [
        {
          id: 'demo-enrollment-0',
          path_id: 'demo-path-0',
          path_title: 'Decision quality foundations',
          user_id: data.state.user.id,
          status: 'in_progress',
          progress: 34,
          assigned_by: null,
          due_at: iso(data, 14),
          completed_at: null,
        },
      ];
    },
  },
  { method: 'GET', pattern: '/learning/compliance/mine', handler: () => [] },
  {
    method: 'GET',
    pattern: '/learning/enrollments/attention',
    handler: () => ({ needsYou: [], stalled: [] }),
  },

  // ---------- Account ----------
  {
    method: 'GET',
    pattern: '/account/profile',
    handler: ({ store }) => {
      const data = store.read();
      const { user, workspace } = data.state;
      return {
        name: user.name,
        email: 'you@sample.lamid.one',
        role: workspace.role,
        bio: 'Sample profile for exploring LAMID ONE.',
        timezone: 'Europe/London',
        context: workspace.context,
        ...data.personal?.profile,
      };
    },
  },
  {
    method: 'PATCH',
    pattern: '/account/profile',
    handler: ({ store, body }) => {
      const input = body as { name: string; role: string; bio: string; timezone: string };
      if (
        !input.name?.trim() ||
        input.name.trim().length > 100 ||
        typeof input.role !== 'string' ||
        typeof input.bio !== 'string' ||
        typeof input.timezone !== 'string'
      )
        throw new ApiError('Provide a valid profile.', 400);
      const data = store.read();
      data.personal ||= {};
      data.personal.profile = {
        name: input.name.trim(),
        role: input.role,
        bio: input.bio,
        timezone: input.timezone,
      };
      data.state.user.name = input.name.trim();
      store.write(data);
      return { ok: true };
    },
  },
  {
    method: 'GET',
    pattern: '/account/export',
    handler: ({ store }) => {
      const data = store.read();
      return {
        schemaVersion: 2,
        scope: 'personal demo',
        exportedAt: new Date().toISOString(),
        account: data.state.user,
        profile: data.personal?.profile ? [data.personal.profile] : [],
        talent: data.talentProfile ? [data.talentProfile] : [],
        credentials: data.credentials,
        bids: data.bids,
        invitations: data.invitations,
        projects: data.projects,
        payoutAccounts: data.personal?.payoutAccounts || [],
        deletionRequests: [],
      };
    },
  },
  { method: 'GET', pattern: '/mfa/status', handler: () => ({ enabled: false }) },
  { method: 'GET', pattern: '/account/deletion-request', handler: () => null },
  {
    method: 'GET',
    pattern: '/notifications',
    handler: ({ store }) => notices(store.read()),
  },
  {
    method: 'PATCH',
    pattern: '/notifications/:id',
    // Mirrors PATCH /api/notifications/:id ({ read: true } only).
    handler: ({ store, params, body }) => {
      if ((body as { read?: unknown })?.read !== true)
        throw new ApiError('Only marking as read is supported.', 400);
      const data = store.read();
      const notice = notices(data).find((n) => n.id === params.id);
      if (!notice) throw new ApiError('Notification not found.', 404);
      data.readNotices = { ...data.readNotices, [notice.id]: new Date().toISOString() };
      store.write(data);
      return { ...notice, readAt: data.readNotices[notice.id] };
    },
  },
  { method: 'GET', pattern: '/connectors', handler: () => [] },
  {
    method: 'GET',
    pattern: '/connectors/providers',
    handler: () => [
      {
        id: 'slack',
        name: 'Slack',
        configured: false,
        scopes: ['channels:read'],
        description: 'Read the names and details of public Slack channels.',
      },
    ],
  },

  // ---------- Scoping, return state, workflows ----------
  { method: 'GET', pattern: '/scoping-cases', handler: () => [] },
  {
    method: 'GET',
    pattern: '/admin/jurisdiction-rules',
    handler: adminOnly('Only an ecosystem administrator can view jurisdiction rules.'),
  },
  {
    method: 'GET',
    pattern: '/return-state',
    handler: ({ store }) => {
      const { state } = store.read();
      return {
        tasks: {
          lastReviewedAt: null,
          items: state.actions
            .filter((a) => a.status === 'Needs review')
            .map((a) => ({ id: a.id, title: a.title, attention: 'needs review' })),
        },
        learning: { lastReviewedAt: null, items: [] },
        goals: {
          lastReviewedAt: null,
          items: state.objectives.map((o) => ({ id: o.id, title: o.title })),
        },
        audit: {
          lastReviewedAt: null,
          items: state.audit
            .slice(0, 5)
            .map((e) => ({ id: e.id, action: e.action, detail: e.detail })),
        },
        workflows: { lastReviewedAt: null, items: [] },
      };
    },
  },
  { method: 'GET', pattern: '/workflows', handler: () => [] },
];
