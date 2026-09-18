import express from 'express';
import { createReadinessCheck } from './readiness.mjs';
import { mountAccounts } from './accounts.mjs';
import { mountPublicCompanion } from './companionTasks.mjs';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { z } from 'zod';
import { openStore, verifyPassword } from '../../server/store.mjs';
import { permissionsFor, requirePermission } from './policy.mjs';
import { createWorkflowRuntime, mountWorkflows } from './workflows.mjs';
import { mountKnowledge } from './knowledge.mjs';
import { mountAI, defaultAiProvider } from './ai.mjs';
import { createAgentRuntime, mountAgents, agentManifests } from './agents.mjs';
import { mountModelRegistry } from './models.mjs';
import { mountProjects } from './projects.mjs';
import {
  mountPayments,
  mountPaystackWebhook,
  mountPointsPurchase,
  paystackProvider,
  cryptoUsdtProvider,
} from './payments.mjs';
import { mountDocuments } from './documents.mjs';
import { mountFx } from './fx.mjs';
import { mountConcierge } from './concierge.mjs';
import { mountBilling } from './billing.mjs';
import { mountPricing, mountPublicPricing } from './pricing.mjs';
import { mountReputation } from './reputation.mjs';
import { mountScoping } from './scoping.mjs';
import { mountBooking } from './booking.mjs';
import { mountExpertTeams } from './expertTeams.mjs';
import { mountHandoff } from './handoff.mjs';
import { mountOutcomes } from './outcomes.mjs';
import { mountLearning } from './learning.mjs';
import { mountTalent } from './talent.mjs';
import { mountInvitations } from './invitations.mjs';
import { createRateLimiter } from './ratelimit.mjs';
import { mountMessaging } from './messaging.mjs';
import { mountEstimator } from './estimator.mjs';
import { JOB_CATEGORIES, PROJECT_TYPES } from './jobTaxonomy.mjs';
import { wordSet, scoreBid } from './text.mjs';
import { errorDetails } from './errorLog.mjs';

const text = z.string().trim().min(1).max(500);
const longText = z.string().trim().max(5000).default('');
const contexts = z.enum([
  'Individual',
  'Professional',
  'Creator',
  'Founder',
  'Team',
  'SME',
  'Enterprise',
  'Institution',
]);
const date = z
  .string()
  .refine(
    (value) =>
      value === '' ||
      (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
        !Number.isNaN(Date.parse(value)) &&
        new Date(value).toISOString().slice(0, 10) === value),
    'Enter a valid date',
  );
const objectiveSchema = z
  .object({
    title: text,
    description: longText,
    context: contexts,
    priority: z.enum(['High', 'Medium', 'Low']),
    status: z.enum(['Active', 'Paused', 'Complete']).default('Active'),
    targetDate: date.default(''),
    constraints: longText,
    success: longText,
  })
  .strict();
const actionSchema = z
  .object({
    title: text,
    objectiveId: z.string().uuid(),
    status: z.enum(['Planned', 'In progress', 'Needs review', 'Done', 'Paused']).default('Planned'),
    dueDate: date.default(''),
    owner: text,
    requiresApproval: z.boolean().default(false),
    notes: longText,
  })
  .strict();
const reviewSchema = z.object({ progressed: text, learned: longText, next: text }).strict();
const jobCategories = z.enum(JOB_CATEGORIES);
const projectTypes = z.enum(PROJECT_TYPES);
const currency = z.string().regex(/^[A-Z]{3}$/);
const jobPostSchema = z
  .object({
    title: text,
    category: jobCategories,
    projectType: projectTypes,
    description: z.string().trim().min(20).max(10000),
    deliverables: z.string().trim().min(1).max(5000),
    budgetMin: z.number().int().nonnegative().max(100000000),
    budgetMax: z.number().int().positive().max(100000000),
    currency,
    timeline: text.max(200),
    tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  })
  .strict()
  .refine((value) => value.budgetMax >= value.budgetMin, {
    message: 'Budget maximum must be at least the budget minimum.',
    path: ['budgetMax'],
  });
const bidSchema = z
  .object({
    coverLetter: z.string().trim().min(20).max(10000),
    proposedAmount: z.number().int().positive().max(100000000),
    currency,
    timeline: text.max(200),
  })
  .strict();
const proposalSchema = z
  .object({
    bidId: z.string().uuid().optional(),
    title: text.max(200),
    scope: z.string().trim().min(20).max(10000),
    deliverables: z.string().trim().min(1).max(5000),
    amount: z.number().int().positive().max(100000000),
    currency,
    timeline: text.max(200),
  })
  .strict();
const digest = (token) => createHash('sha256').update(token).digest('hex');
const jobPostCost = 40;
const bidCost = 20;

export async function createApp({
  errorLogger = (event, fields) => console.error(JSON.stringify({ timestamp: new Date().toISOString(), event, ...fields })),
  filename,
  poolMax,
  production = false,
  mailProvider,
  securityKey,
  publicOrigin,
  allowedOrigins = [],
  welcomeIpVelocityLimit = 3,
  rateLimits = {},
  aiProvider = defaultAiProvider(),
  paymentProvider = (name) =>
    name === 'paystack' ? paystackProvider() : name === 'crypto_usdt' ? cryptoUsdtProvider() : null,
  ecosystemAdminEmails = (process.env.ECOSYSTEM_ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
  enterpriseMemberLimit = Math.min(
    200,
    Math.max(50, Number.parseInt(process.env.ENTERPRISE_MEMBER_LIMIT || '200', 10) || 200),
  ),
} = {}) {
  const app = express();
  app.locals.errorLogger = errorLogger;
  app.use((req, res, next) => {
    const requestId = randomUUID();
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    res.on('finish', () => {
      if (res.statusCode < 400 || res.locals.errorLogged) return;
      errorLogger('http_response_error', {
        requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ...(req.user?.id ? { userId: req.user.id } : {}),
      });
    });
    next();
  });
  const store = await openStore(filename, { poolMax });
  const { db, transaction, log, insert, records } = store;
  const runtime = createWorkflowRuntime(store);
  const agentRuntime = createAgentRuntime(store, { aiProvider, workflowRuntime: runtime });
  const trustProxyHops = Number.parseInt(process.env.TRUST_PROXY_HOPS || '', 10);
  if (Number.isInteger(trustProxyHops) && trustProxyHops > 0)
    app.set('trust proxy', trustProxyHops);
  app.disable('x-powered-by');
  const limits = {
    api: { windowMs: 60_000, max: 120, ...rateLimits.api },
    auth: { windowMs: 60_000, max: 20, ...rateLimits.auth },
    mutation: { windowMs: 60_000, max: 60, ...rateLimits.mutation },
  };
  const apiLimiter = createRateLimiter(store, {
    ...limits.api, namespace: 'api',
    message: 'Too many requests. Please wait a minute and try again.',
  });
  const authLimiter = createRateLimiter(store, {
    ...limits.auth, namespace: 'auth',
    message: 'Too many sign-in attempts. Please wait a minute and try again.',
  });
  const mutationLimiter = createRateLimiter(store, {
    ...limits.mutation, namespace: 'mutation',
    message: 'Too many changes. Please wait a minute and try again.',
  });
  // Applied only on routes mounted after the session middleware below, so
  // req.user is always populated here: keying on the account (not just IP)
  // means rotating IPs cannot evade the ceiling on points-spending actions.
  // Backed by the shared rate_limit_buckets table (see ratelimit.mjs), so this
  // ceiling holds even across multiple cluster worker processes.
  const spendLimiter = createRateLimiter(store, {
    windowMs: 60_000,
    max: 20,
    ...rateLimits.spend, namespace: 'spend',
    message: 'Too many spending actions. Please wait a minute and try again.',
    key: (req) => (req.user ? `user:${req.user.id}` : `ip:${req.ip}`),
  });
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    // A split frontend/backend deployment needs the frontend's origin to be able to read API
    // responses at all — CORP applies independently of the CORS allow-origin check below, so
    // 'same-origin' would silently block every request even from an explicitly trusted origin.
    res.setHeader('Cross-Origin-Resource-Policy', allowedOrigins.length ? 'cross-origin' : 'same-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (production)
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
      );
    if (production) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    if (req.path.startsWith('/api')) res.setHeader('Cache-Control', 'no-store');
    // A trusted cross-origin frontend (e.g. a Vercel-hosted UI calling a separately hosted API)
    // is the one deliberate exception to the same-site rule below — Access-Control-Allow-Origin
    // is only ever a single explicit origin from the allowlist, never '*', since credentials are
    // involved.
    const trustedOrigin = req.headers.origin && allowedOrigins.includes(req.headers.origin);
    if (trustedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Expose-Headers', 'X-Request-Id');
      res.setHeader('Vary', 'Origin');
    }
    if (req.method === 'OPTIONS' && trustedOrigin) {
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
      // Must list every non-simple header src/api.ts sends, or the browser blocks the actual
      // request at the preflight stage before it ever reaches this server.
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Workspace-Id, Idempotency-Key');
      return res.status(204).end();
    }
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (
        !trustedOrigin &&
        (req.headers['sec-fetch-site'] === 'cross-site' ||
          (req.headers.origin && req.headers.origin !== `${req.protocol}://${req.get('host')}`))
      )
        return res.status(403).json({ error: 'This request came from a different site.' });
      if (!req.is('application/json'))
        return res.status(415).json({ error: 'JSON content is required.' });
    }
    next();
  });
  app.use(
    express.json({
      limit: '32kb',
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  mountPaystackWebhook(app, store, { paymentProvider });
  app.use('/api', apiLimiter);
  app.use('/api/auth', (req, res, next) => {
    if (req.method === 'GET') return next();
    return authLimiter(req, res, next);
  });
  app.use('/api', (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.path === '/health') return next();
    return mutationLimiter(req, res, next);
  });
  const session = async (res, userId, workspaceId = null) => {
    const token = randomBytes(32).toString('hex');
    await db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
    await db.prepare(
      'INSERT INTO sessions (token, user_id, expires_at, workspace_id) VALUES (?, ?, ?, ?)',
    ).run(digest(token), userId, Date.now() + 86400000 * 7, workspaceId);
    res.cookie('lamid_session', token, {
      httpOnly: true,
      // 'None' is required for the cookie to be sent on cross-site requests (a split
      // Vercel-frontend / separately-hosted-API deployment) — safe only alongside secure:true
      // (already tied to `production`), which browsers require for SameSite=None.
      sameSite: production ? 'none' : 'lax',
      secure: production,
      maxAge: 86400000 * 7,
      path: '/',
    });
  };
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.post('/api/client-errors', (req, res) => {
    const input = z.object({ type: z.enum(['render', 'error', 'rejection']), name: z.string().max(100), message: z.string().max(500) }).strict().parse(req.body);
    errorLogger('client_error', { requestId: req.requestId, type: input.type, name: input.name, message: input.message });
    res.status(204).end();
  });
  const checkReadiness = createReadinessCheck(store);
  app.get('/api/ready', async (_req, res) => {
    const ready = await checkReadiness();
    res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'unavailable' });
  });
  const accounts = await mountAccounts(app, store, { production, session, contexts, enterpriseMemberLimit, mailProvider, securityKey, publicOrigin, welcomeIpVelocityLimit, errorLogger });
  mountPublicCompanion(app);
  mountPublicPricing(app, store);
  app.use('/api', async (req, res, next) => {
    const token = (req.headers.cookie || '')
      .split(';')
      .map((x) => x.trim())
      .find((x) => x.startsWith('lamid_session='))
      ?.slice(14);
    if (!token) return res.status(401).json({ error: 'Sign in to continue.' });
    const user = await db
      .prepare(
        'SELECT users.id, users.name, users.email, users.demo, users.disabled_at, sessions.workspace_id AS "sessionWorkspaceId" FROM sessions JOIN users ON users.id = sessions.user_id WHERE token = ? AND expires_at > ?',
      )
      .get(digest(token), Date.now());
    if (!user)
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    if (user.disabled_at)
      return res.status(403).json({ error: 'This account has been disabled by an administrator.' });
    req.user = user;
    req.workspace = await db
      .prepare(
        "SELECT workspaces.id, workspaces.name, workspaces.context, workspaces.tier, workspaces.member_limit FROM workspace_members JOIN workspaces ON workspaces.id = workspace_members.workspace_id WHERE workspace_members.user_id = ? AND workspace_members.status = 'active' AND (?::text IS NULL OR workspaces.id = ?) ORDER BY workspace_members.role = 'owner' DESC LIMIT 1",
      )
      .get(user.id, user.sessionWorkspaceId, user.sessionWorkspaceId);
    if (!req.workspace && user.sessionWorkspaceId) {
      await db.prepare('UPDATE sessions SET workspace_id = NULL WHERE token = ?').run(digest(token));
      req.workspace = await db
        .prepare(
          "SELECT workspaces.id, workspaces.name, workspaces.context, workspaces.tier, workspaces.member_limit FROM workspace_members JOIN workspaces ON workspaces.id = workspace_members.workspace_id WHERE workspace_members.user_id = ? AND workspace_members.status = 'active' ORDER BY workspace_members.role = 'owner' DESC LIMIT 1",
        )
        .get(user.id);
    }
    if (!req.workspace) return res.status(403).json({ error: 'No active workspace membership.' });
    req.workspace.role = (await db
      .prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
      .get(req.workspace.id, user.id)).role;
    if (!permissionsFor(req.workspace.role).includes('workspace:read'))
      return res.status(403).json({ error: 'This workspace role is not supported.' });
    const expectedWorkspace = req.get('X-Workspace-Id');
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      expectedWorkspace &&
      expectedWorkspace !== req.workspace.id &&
      req.path !== '/workspace/switch'
    )
      return res
        .status(409)
        .json({ error: 'Your active workspace changed. Reload before saving.' });
    req.token = token;
    next();
  });
  app.post('/api/auth/logout', async (req, res) => {
    await db.prepare('DELETE FROM sessions WHERE token = ?').run(digest(req.token));
    res.clearCookie('lamid_session', { path: '/' });
    res.json({ ok: true });
  });
  app.get('/api/admin/welcome-rewards', async (req, res) => {
    if (!ecosystemAdminEmails.includes(req.user.email)) return res.status(403).json({ error: 'Ecosystem administrator access required.' });
    res.json(await db.prepare('SELECT user_id AS "userId", status, reason, created_at AS "createdAt" FROM welcome_claims WHERE status = \'review\' ORDER BY created_at LIMIT 100').all());
  });
  app.post('/api/admin/welcome-rewards/:id', async (req, res) => {
    if (!ecosystemAdminEmails.includes(req.user.email)) return res.status(403).json({ error: 'Ecosystem administrator access required.' });
    const input = z.object({ decision: z.enum(['approve', 'deny']), reason: text.max(500) }).strict().parse(req.body);
    await transaction(async () => {
      const claim = await db.prepare("SELECT * FROM welcome_claims WHERE user_id = ? AND status = 'review'").get(req.params.id);
      if (!claim || !(await db.prepare('SELECT 1 FROM users WHERE id = ? AND verified_at IS NOT NULL AND disabled_at IS NULL').get(req.params.id))) throw Object.assign(new Error('No eligible pending claim.'), { status: 409 });
      if (input.decision === 'approve' && (await db.prepare("SELECT 1 FROM welcome_claims WHERE device_hash = ? AND status = 'granted'").get(claim.device_hash))) throw Object.assign(new Error('This device already received a welcome reward.'), { status: 409 });
      // The claim itself is the atomic UPDATE (guarded by AND status = 'review'), not the SELECT
      // above deciding unconditionally — an admin double-clicking approve, or two admins acting on
      // the same claim at once, would otherwise both pass the SELECT before either commits, both
      // crediting the welcome bonus.
      const claimed = await db
        .prepare("UPDATE welcome_claims SET status = ?, reason = ? WHERE user_id = ? AND status = 'review' RETURNING *")
        .get(input.decision === 'approve' ? 'granted' : 'ineligible', input.reason, req.params.id);
      if (!claimed) throw Object.assign(new Error('No eligible pending claim.'), { status: 409 });
      if (input.decision === 'approve') await accounts.credit(req.params.id);
      await db.prepare('INSERT INTO administration_audit VALUES (?, ?, ?, ?, ?)').run(randomUUID(), req.user.id, `Welcome reward ${input.decision}: ${input.reason}`, req.params.id, new Date().toISOString());
    });
    res.json({ ok: true });
  });
  app.get('/api/admin/operations', async (req, res) => {
    if (!ecosystemAdminEmails.includes(req.user.email)) return res.status(403).json({ error: 'Ecosystem administrator access required.' });
    const [mail, scheduler, agents, duplicateRefunds, balanceMismatches, stuckRuns] = await Promise.all([
      db.prepare('SELECT status, COUNT(*) AS count FROM mail_outbox GROUP BY status').all(),
      db.prepare('SELECT name, expires_at AS "expiresAt" FROM service_leases').all(),
      db.prepare('SELECT status, COUNT(*) AS count FROM agent_runs GROUP BY status').all(),
      db.prepare("SELECT reference_id, reason, COUNT(*) AS count, SUM(amount) AS points FROM points_ledger WHERE reason IN ('agent_run_refund', 'ai_review_refund') GROUP BY reference_id, reason HAVING COUNT(*) > 1 LIMIT 50").all(),
      db.prepare('SELECT u.id AS user_id, u.points_balance, COALESCE(SUM(l.amount), 0) AS ledger_balance FROM users u LEFT JOIN points_ledger l ON l.user_id = u.id WHERE u.demo = 0 GROUP BY u.id HAVING u.points_balance <> COALESCE(SUM(l.amount), 0) OR u.points_balance < 0 LIMIT 50').all(),
      db.prepare("SELECT id, workspace_id, created_at FROM agent_runs WHERE status = 'running' AND created_at < ? ORDER BY created_at LIMIT 50").all(new Date(Date.now() - 120000).toISOString()),
    ]);
    res.json({ mail, scheduler, agents, ledger: { duplicateRefunds, balanceMismatches, requiresReview: duplicateRefunds.length > 0 || balanceMismatches.length > 0 }, stuckRuns });
  });
  app.get('/api/workspaces', async (req, res) => {
    res.json(
      await db
        .prepare(
          "SELECT workspaces.id, workspaces.name, workspaces.context, workspaces.tier, workspaces.member_limit, workspace_members.role, workspace_members.status FROM workspace_members JOIN workspaces ON workspaces.id = workspace_members.workspace_id WHERE workspace_members.user_id = ? ORDER BY workspace_members.role = 'owner' DESC, workspaces.name",
        )
        .all(req.user.id),
    );
  });
  app.post('/api/workspace/switch', async (req, res) => {
    const input = z.object({ workspaceId: z.string().uuid() }).strict().parse(req.body);
    const membership = await db
      .prepare(
        "SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ? AND status = 'active'",
      )
      .get(input.workspaceId, req.user.id);
    if (!membership)
      return res.status(403).json({ error: 'You are not an active member of that workspace.' });
    await db.prepare('UPDATE sessions SET workspace_id = ? WHERE token = ?').run(
      input.workspaceId,
      digest(req.token),
    );
    res.json({ ok: true, workspaceId: input.workspaceId });
  });
  const replayable = (req, operation, input, work) =>
    transaction(async () => {
      const key = req.get('Idempotency-Key');
      if (!key) return work();
      if (!/^[a-zA-Z0-9_-]{8,128}$/.test(key))
        throw Object.assign(new Error('Use an 8–128 character idempotency key.'), { status: 400 });
      const fingerprint = digest(JSON.stringify(input));
      // The claim itself must be one atomic statement, not a SELECT followed by an INSERT: two
      // truly-simultaneous requests with the same key would otherwise both pass a plain SELECT
      // check before either commits, both run work() for real, and the loser's later INSERT would
      // hit the idempotency table's PRIMARY KEY, aborting its transaction (rolling back its own
      // work() effects, at least — but surfacing as a raw 500 instead of a clean reply) rather than
      // the intended "already handled" response. ON CONFLICT DO NOTHING makes losing the race
      // error-free: it reads back whichever request actually won instead.
      const claimed = await db
        .prepare(
          'INSERT INTO idempotency VALUES (?, ?, ?, ?, ?, 202, ?, ?) ON CONFLICT (user_id, workspace_id, operation, key) DO NOTHING RETURNING *',
        )
        .get(
          req.user.id,
          req.workspace.id,
          operation,
          key,
          fingerprint,
          JSON.stringify({ error: 'This request is still processing. Retry with the same key shortly.' }),
          Date.now(),
        );
      if (!claimed) {
        const prior = await db
          .prepare(
            'SELECT * FROM idempotency WHERE user_id = ? AND workspace_id = ? AND operation = ? AND key = ?',
          )
          .get(req.user.id, req.workspace.id, operation, key);
        if (prior.fingerprint !== fingerprint)
          throw Object.assign(
            new Error('This idempotency key was already used for different input.'),
            { status: 409 },
          );
        if (prior.status === 202)
          throw Object.assign(
            new Error('This request is still processing. Retry with the same key shortly.'),
            { status: 409 },
          );
        return JSON.parse(prior.response);
      }
      const result = await work();
      await db
        .prepare(
          'UPDATE idempotency SET status = 201, response = ? WHERE user_id = ? AND workspace_id = ? AND operation = ? AND key = ?',
        )
        .run(JSON.stringify(result), req.user.id, req.workspace.id, operation, key);
      return result;
    });
  app.get('/api/jobs', async (req, res) => {
    res.json(
      await db
        .prepare('SELECT * FROM job_posts WHERE workspace_id = ? ORDER BY created_at DESC')
        .all(req.workspace.id),
    );
  });
  app.get('/api/job-options', (_req, res) =>
    res.json({
      categories: jobCategories.options,
      projectTypes: projectTypes.options,
      jobPostCost,
      bidCost,
    }),
  );
  app.get('/api/points', async (req, res) =>
    res.json({
      balance: (await db.prepare('SELECT points_balance FROM users WHERE id = ?').get(req.user.id))
        .points_balance,
      ledger: await db
        .prepare(
          'SELECT amount, reason, reference_id, created_at FROM points_ledger WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
        )
        .all(req.user.id),
    }),
  );
  app.get('/api/bids/mine', async (req, res) =>
    res.json(
      await db
        .prepare('SELECT * FROM bids WHERE freelancer_user_id = ? ORDER BY created_at DESC')
        .all(req.user.id),
    ),
  );
  app.get('/api/marketplace/jobs', async (req, res) => {
    if (req.user.demo) return res.json([]);
    const query = z
      .object({
        q: z.string().trim().max(200).default(''),
        offset: z.coerce.number().int().min(0).max(100000).default(0),
      })
      .strict()
      .parse(req.query);
    res.json(
      await db
        .prepare(
          `SELECT job_posts.* FROM job_posts JOIN users ON users.id = job_posts.client_user_id
      WHERE job_posts.status = 'open' AND users.demo = 0 AND users.disabled_at IS NULL
      AND (job_posts.title ILIKE '%'||?||'%' OR job_posts.category ILIKE '%'||?||'%')
      ORDER BY job_posts.created_at DESC, job_posts.id LIMIT 50 OFFSET ?`,
        )
        .all(query.q, query.q, query.offset),
    );
  });
  app.post('/api/jobs', spendLimiter, async (req, res) => {
    const input = jobPostSchema.parse(req.body);
    const id = randomUUID();
    const result = await replayable(req, 'job.create', input, async () => {
      const changed = await db
        .prepare(
          'UPDATE users SET points_balance = points_balance - ? WHERE id = ? AND points_balance >= ?',
        )
        .run(jobPostCost, req.user.id, jobPostCost);
      if (changed.changes !== 1)
        throw Object.assign(new Error('Not enough points to post this job.'), { status: 402 });
      await db.prepare('INSERT INTO points_ledger VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        randomUUID(),
        req.user.id,
        req.workspace.id,
        -jobPostCost,
        'job_post',
        id,
        Date.now(),
      );
      await db.prepare('INSERT INTO job_posts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
        id,
        req.workspace.id,
        req.user.id,
        input.title,
        input.category,
        input.projectType,
        input.description,
        input.deliverables,
        input.budgetMin,
        input.budgetMax,
        input.currency,
        input.timeline,
        'open',
        Date.now(),
        JSON.stringify(input.tags),
      );
      await log(req.workspace.id, req.user.name, 'Job post created', id, input.title);
      return { id, ...input, status: 'open', pointsCharged: jobPostCost };
    });
    res.status(201).json(result);
  });
  app.get('/api/jobs/:id/bids', async (req, res) => {
    const job = await db
      .prepare('SELECT * FROM job_posts WHERE id = ? AND workspace_id = ?')
      .get(req.params.id, req.workspace.id);
    if (!job) return res.status(404).json({ error: 'Job post not found.' });
    if (job.client_user_id !== req.user.id)
      return res.status(403).json({ error: 'Only the job owner can review bids.' });
    res.json(
      await db.prepare('SELECT * FROM bids WHERE job_id = ? ORDER BY created_at DESC').all(job.id),
    );
  });
  app.get('/api/jobs/:id/matches', async (req, res) => {
    const job = await db.prepare('SELECT * FROM job_posts WHERE id = ?').get(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job post not found.' });
    if (job.client_user_id !== req.user.id)
      return res.status(403).json({ error: 'Only the job owner can review matches.' });
    const bids = await db.prepare('SELECT * FROM bids WHERE job_id = ?').all(job.id);
    const scored = bids
      .map((bid) => ({ bid, ...scoreBid(job, bid) }))
      .sort((a, b) => b.total - a.total);
    res.json(scored);
  });
  app.post('/api/jobs/:id/bids', spendLimiter, async (req, res) => {
    const input = bidSchema.parse(req.body);
    const job = await db.prepare('SELECT * FROM job_posts WHERE id = ?').get(req.params.id);
    if (!job || job.status !== 'open')
      return res.status(404).json({ error: 'Open job post not found.' });
    if (
      req.user.demo ||
      (await db.prepare('SELECT demo FROM users WHERE id = ?').get(job.client_user_id))?.demo
    )
      return res
        .status(403)
        .json({ error: 'Sample workspaces cannot participate in shared commercial work.' });
    if (job.client_user_id === req.user.id)
      return res.status(403).json({ error: 'Job owners cannot bid on their own post.' });
    if (job.currency !== input.currency)
      return res.status(400).json({ error: 'Bid currency must match the job currency.' });
    const id = randomUUID();
    const result = await replayable(req, `bid.create:${job.id}`, input, async () => {
      const existing = await db
        .prepare('SELECT id FROM bids WHERE job_id = ? AND freelancer_user_id = ?')
        .get(job.id, req.user.id);
      if (existing)
        throw Object.assign(new Error('You already submitted a bid for this job.'), {
          status: 409,
        });
      const changed = await db
        .prepare(
          'UPDATE users SET points_balance = points_balance - ? WHERE id = ? AND points_balance >= ?',
        )
        .run(bidCost, req.user.id, bidCost);
      if (changed.changes !== 1)
        throw Object.assign(new Error('Not enough points to submit this bid.'), { status: 402 });
      await db.prepare('INSERT INTO points_ledger VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        randomUUID(),
        req.user.id,
        job.workspace_id,
        -bidCost,
        'bid_submission',
        id,
        Date.now(),
      );
      await db.prepare('INSERT INTO bids VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
        id,
        job.id,
        job.workspace_id,
        req.user.id,
        input.coverLetter,
        input.proposedAmount,
        input.currency,
        input.timeline,
        'submitted',
        Date.now(),
      );
      await log(job.workspace_id, req.user.name, 'Bid submitted', id, `Job ${job.id}`);
      return { id, jobId: job.id, ...input, status: 'submitted', pointsCharged: bidCost };
    });
    res.status(201).json(result);
  });
  app.post('/api/jobs/:id/proposals', async (req, res) => {
    const input = proposalSchema.parse(req.body);
    const job = await db.prepare('SELECT * FROM job_posts WHERE id = ?').get(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job post not found.' });
    if (
      job.client_user_id !== req.user.id &&
      (req.user.demo ||
        (await db.prepare('SELECT demo FROM users WHERE id = ?').get(job.client_user_id))?.demo)
    )
      return res
        .status(403)
        .json({ error: 'Sample workspaces cannot participate in shared commercial work.' });
    const bid = req.body.bidId
      ? await db.prepare('SELECT * FROM bids WHERE id = ? AND job_id = ?').get(req.body.bidId, job.id)
      : null;
    if (job.client_user_id !== req.user.id && (!bid || bid.freelancer_user_id !== req.user.id))
      return res
        .status(403)
        .json({ error: 'Only the client or bidding freelancer can draft a proposal.' });
    if (input.currency !== job.currency)
      return res.status(400).json({ error: 'Proposal currency must match the job currency.' });
    const sourceType = job.client_user_id === req.user.id ? 'client' : 'freelancer';
    const id = randomUUID();
    const result = await replayable(req, `proposal.create:${job.id}`, input, async () => {
      await db.prepare('INSERT INTO proposals VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
        id,
        job.workspace_id,
        job.id,
        bid?.id || null,
        req.user.id,
        sourceType,
        input.title,
        input.scope,
        input.deliverables,
        input.amount,
        input.currency,
        input.timeline,
        'draft',
        Date.now(),
      );
      await log(job.workspace_id, req.user.name, 'Proposal drafted', id, input.title);
      return { id, jobId: job.id, ...input, bidId: bid?.id || null, sourceType, status: 'draft' };
    });
    res.status(201).json(result);
  });
  app.get('/api/jobs/:id/proposals', async (req, res) => {
    const job = await db.prepare('SELECT * FROM job_posts WHERE id = ?').get(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job post not found.' });
    if (job.client_user_id !== req.user.id) {
      const authored = await db
        .prepare(
          'SELECT * FROM proposals WHERE job_id = ? AND author_user_id = ? ORDER BY created_at DESC',
        )
        .all(job.id, req.user.id);
      if (
        !authored.length &&
        !(await db
          .prepare('SELECT 1 FROM bids WHERE job_id = ? AND freelancer_user_id = ?')
          .get(job.id, req.user.id))
      )
        return res.status(403).json({ error: 'Only proposal participants can review drafts.' });
      return res.json(authored);
    }
    res.json(
      await db.prepare('SELECT * FROM proposals WHERE job_id = ? ORDER BY created_at DESC').all(job.id),
    );
  });
  const deleteUser = async (userId, actorId) => {
    const workspaces = await db.prepare('SELECT id FROM workspaces WHERE user_id = ?').all(userId);
    await transaction(async () => {
      // Remove the account's draft commercial work; preserve other users' point history.
      await db.prepare(
        'DELETE FROM workflow_runs WHERE principal_id = ? OR workspace_id IN (SELECT id FROM workspaces WHERE user_id = ?)',
      ).run(userId, userId);
      const doomedJobs = await db
        .prepare(
          `SELECT id FROM job_posts WHERE client_user_id = ?
        OR workspace_id IN (SELECT id FROM workspaces WHERE user_id = ?)`,
        )
        .all(userId, userId);
      for (const job of doomedJobs) {
        await db.prepare('DELETE FROM proposals WHERE job_id = ?').run(job.id);
        await db.prepare('DELETE FROM bids WHERE job_id = ?').run(job.id);
        await db.prepare('DELETE FROM job_posts WHERE id = ?').run(job.id);
      }
      await db.prepare('DELETE FROM proposals WHERE author_user_id = ?').run(userId);
      await db.prepare(
        'UPDATE proposals SET bid_id = NULL WHERE bid_id IN (SELECT id FROM bids WHERE freelancer_user_id = ?)',
      ).run(userId);
      await db.prepare('DELETE FROM bids WHERE freelancer_user_id = ?').run(userId);
      await db.prepare('DELETE FROM points_ledger WHERE user_id = ?').run(userId);
      await db.prepare('DELETE FROM idempotency WHERE user_id = ?').run(userId);
      await db.prepare('DELETE FROM account_tokens WHERE user_id = ?').run(userId);
      await db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
      await db.prepare('DELETE FROM workspace_members WHERE user_id = ?').run(userId);
      for (const workspace of workspaces) {
        await db.prepare('DELETE FROM ai_usage WHERE workspace_id = ?').run(workspace.id);
        await db.prepare('DELETE FROM idempotency WHERE workspace_id = ?').run(workspace.id);
        await db.prepare('UPDATE sessions SET workspace_id = NULL WHERE workspace_id = ?').run(
          workspace.id,
        );
        await db.prepare('UPDATE points_ledger SET workspace_id = NULL WHERE workspace_id = ?').run(
          workspace.id,
        );
        await db.prepare('DELETE FROM workspace_members WHERE workspace_id = ?').run(workspace.id);
        await db.prepare('DELETE FROM audit WHERE workspace_id = ?').run(workspace.id);
        await db.prepare('DELETE FROM records WHERE workspace_id = ?').run(workspace.id);
        await db.prepare('DELETE FROM workspaces WHERE id = ?').run(workspace.id);
      }
      await db.prepare('DELETE FROM users WHERE id = ?').run(userId);
      await db.prepare('INSERT INTO administration_audit VALUES (?, ?, ?, ?, ?)').run(
        randomUUID(),
        actorId,
        'Account deleted',
        userId,
        new Date().toISOString(),
      );
    });
  };
  const verifyCurrentPassword = async (req, password) => {
    if (req.user.demo || !password) return false;
    const user = await db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
    if (!user) return false;
    const valid = await verifyPassword(password, user.password);
    return (
      valid &&
      Boolean(
        await db
          .prepare(
            `SELECT 1 FROM sessions JOIN users ON users.id = sessions.user_id
      WHERE token = ? AND expires_at > ? AND users.disabled_at IS NULL`,
          )
          .get(digest(req.token), Date.now()),
      )
    );
  };
  app.delete('/api/admin/users/:id', async (req, res) => {
    const input = z
      .object({
        confirmation: z.literal('DELETE USER ACCOUNT'),
        password: z.string().max(128),
      })
      .strict()
      .parse(req.body);
    if (!ecosystemAdminEmails.includes((req.user.email || '').toLowerCase()))
      return res
        .status(403)
        .json({ error: 'Only an ecosystem administrator can permanently delete accounts.' });
    if (!(await verifyCurrentPassword(req, input.password)))
      return res.status(403).json({ error: 'Your administrator password is incorrect.' });
    const target = await db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
    if (!target) return res.status(404).json({ error: 'User account not found.' });
    await deleteUser(target.id, req.user.id);
    if (target.id === req.user.id) res.clearCookie('lamid_session', { path: '/' });
    res.json({ ok: true });
  });
  app.get('/api/admin/members', requirePermission('members:manage'), async (req, res) => {
    res.json(
      await db
        .prepare(
          `SELECT users.id AS "userId", users.name, users.email,
      workspace_members.role, workspace_members.status, workspace_members.created_at AS "createdAt"
      FROM workspace_members JOIN users ON users.id = workspace_members.user_id
      WHERE workspace_id = ? ORDER BY role = 'owner' DESC, users.name`,
        )
        .all(req.workspace.id),
    );
  });
  app.patch('/api/admin/members/:id', requirePermission('members:manage'), async (req, res) => {
    const input = z
      .object({ status: z.enum(['active', 'disabled']) })
      .strict()
      .parse(req.body);
    const owner = await db
      .prepare(
        "SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ? AND role = 'owner' AND status = 'active'",
      )
      .get(req.workspace.id, req.user.id);
    if (!owner || req.workspace.tier !== 'enterprise')
      return res
        .status(403)
        .json({ error: 'Only an enterprise workspace administrator can manage members.' });
    const member = await db
      .prepare(
        'SELECT user_id AS "userId" FROM workspace_members WHERE workspace_id = ? AND user_id = ? AND role != \'owner\'',
      )
      .get(req.workspace.id, req.params.id);
    if (!member) return res.status(404).json({ error: 'Workspace member not found.' });
    await transaction(async () => {
      const current = await db
        .prepare('SELECT status FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
        .get(req.workspace.id, member.userId);
      if (current.status === input.status) return;
      if (input.status === 'active') {
        const count = (await db
          .prepare(
            "SELECT COUNT(*) AS count FROM workspace_members WHERE workspace_id = ? AND status = 'active'",
          )
          .get(req.workspace.id)).count;
        if (count >= req.workspace.member_limit)
          throw Object.assign(
            new Error('This enterprise workspace has reached its member limit.'),
            { status: 409 },
          );
      }
      await db.prepare(
        'UPDATE workspace_members SET status = ? WHERE workspace_id = ? AND user_id = ?',
      ).run(input.status, req.workspace.id, member.userId);
      if (input.status === 'disabled')
        await db.prepare(
          'UPDATE sessions SET workspace_id = NULL WHERE user_id = ? AND workspace_id = ?',
        ).run(member.userId, req.workspace.id);
      await log(req.workspace.id, req.user.name, 'Membership updated', member.userId, input.status);
    });
    res.json({ ok: true, status: input.status });
  });
  app.post('/api/admin/members', async (req, res) => {
    const input = z
      .object({
        email: z
          .string()
          .trim()
          .email('Enter a valid email address using standard letters, numbers, and symbols.')
          .max(254),
        role: z.literal('member').default('member'),
      })
      .strict()
      .parse(req.body);
    const owner = await db
      .prepare(
        "SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ? AND role = 'owner' AND status = 'active'",
      )
      .get(req.workspace.id, req.user.id);
    if (!owner || req.workspace.tier !== 'enterprise')
      return res
        .status(403)
        .json({ error: 'Only an enterprise workspace administrator can add members.' });
    const count = (await db
      .prepare(
        "SELECT COUNT(*) AS count FROM workspace_members WHERE workspace_id = ? AND status = 'active'",
      )
      .get(req.workspace.id)).count;
    if (count >= req.workspace.member_limit)
      return res
        .status(409)
        .json({ error: 'This enterprise workspace has reached its member limit.' });
    const member = await db
      .prepare('SELECT id, disabled_at FROM users WHERE email = ? AND demo = 0')
      .get(input.email.toLowerCase());
    if (!member) return res.status(404).json({ error: 'User account not found.' });
    if (member.disabled_at)
      return res.status(409).json({ error: 'This user account is disabled.' });
    try {
      await transaction(async () => {
        const active = (await db
          .prepare(
            "SELECT COUNT(*) AS count FROM workspace_members WHERE workspace_id = ? AND status = 'active'",
          )
          .get(req.workspace.id)).count;
        if (active >= req.workspace.member_limit)
          throw Object.assign(
            new Error('This enterprise workspace has reached its member limit.'),
            { status: 409 },
          );
        if (
          await db
            .prepare('SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
            .get(req.workspace.id, member.id)
        )
          throw Object.assign(new Error('This user is already a workspace member.'), {
            status: 409,
          });
        await db.prepare('INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)').run(
          req.workspace.id,
          member.id,
          input.role,
          'active',
          Date.now(),
        );
        await log(req.workspace.id, req.user.name, 'Member added', member.id, input.role);
      });
    } catch (error) {
      // Postgres's unique_violation SQLSTATE (23505) also covers primary-key violations.
      if (error.code === '23505')
        return res.status(409).json({ error: 'This user is already a workspace member.' });
      throw error;
    }
    res.status(201).json({ ok: true, userId: member.id, role: input.role });
  });
  const state = async (req) => {
    const workspaces = await db
      .prepare(
        "SELECT workspaces.id, workspaces.name, workspaces.context, workspaces.tier, workspaces.member_limit, workspace_members.role, workspace_members.status FROM workspace_members JOIN workspaces ON workspaces.id = workspace_members.workspace_id WHERE workspace_members.user_id = ? AND workspace_members.status = 'active' ORDER BY workspace_members.role = 'owner' DESC, workspaces.name",
      )
      .all(req.user.id);
    const [objectives, actions, reviews, audit] = await Promise.all([
      records(req.workspace.id, 'objective'),
      records(req.workspace.id, 'action'),
      records(req.workspace.id, 'review'),
      db
        .prepare(
          'SELECT id, actor, action, object_id AS "objectId", detail, created_at AS "createdAt" FROM audit WHERE workspace_id = ? ORDER BY created_at DESC, seq DESC LIMIT 200',
        )
        .all(req.workspace.id),
    ]);
    return {
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        demo: Boolean(req.user.demo),
      },
      workspace: req.workspace,
      permissions: permissionsFor(req.workspace.role),
      workspaces,
      objectives,
      actions,
      reviews,
      audit,
    };
  };
  app.get('/api/state', async (req, res) => res.json(await state(req)));
  app.get('/api/activity', async (req, res) => {
    const agentName = (agentId) => agentManifests.find((a) => a.id === agentId)?.name || agentId;
    const [objectives, actions, jobs, bids, proposals, agentRuns, points, invitations, workflows] = await Promise.all([
      records(req.workspace.id, 'objective'),
      records(req.workspace.id, 'action'),
      db.prepare('SELECT * FROM job_posts WHERE workspace_id = ?').all(req.workspace.id),
      db.prepare('SELECT * FROM bids WHERE freelancer_user_id = ?').all(req.user.id),
      db.prepare('SELECT * FROM proposals WHERE author_user_id = ?').all(req.user.id),
      db.prepare('SELECT * FROM agent_runs WHERE workspace_id = ? AND principal_id = ?').all(req.workspace.id, req.user.id),
      db.prepare('SELECT * FROM points_ledger WHERE user_id = ?').all(req.user.id),
      db.prepare('SELECT * FROM job_invitations WHERE invited_by = ? OR freelancer_user_id = ?').all(req.user.id, req.user.id),
      runtime.list(req.workspace.id),
    ]);
    const items = [
      ...objectives.map((o) => ({
        id: o.id,
        type: 'objective',
        title: o.title,
        status: o.status,
        createdAt: o.createdAt,
      })),
      ...actions.map((a) => ({
        id: a.id,
        type: 'action',
        title: a.title,
        status: a.status,
        createdAt: a.createdAt,
      })),
      ...jobs.map((j) => ({
        id: j.id,
        type: 'job',
        title: j.title,
        status: j.status,
        createdAt: new Date(Number(j.created_at)).toISOString(),
      })),
      ...bids.map((b) => ({
        id: b.id,
        type: 'bid',
        title: `Bid on job ${b.job_id}`,
        status: b.status,
        createdAt: new Date(Number(b.created_at)).toISOString(),
      })),
      ...proposals.map((p) => ({
        id: p.id,
        type: 'proposal',
        title: p.title,
        status: p.status,
        createdAt: new Date(Number(p.created_at)).toISOString(),
      })),
      ...workflows.map((w) => ({
        id: w.id,
        type: 'workflow',
        title: w.title,
        status: w.state,
        createdAt: w.created_at,
      })),
      ...agentRuns.map((r) => ({
        id: r.id,
        type: 'agent_run',
        title: agentName(r.agent_id),
        status: r.status,
        createdAt: r.created_at,
      })),
      ...points.map((p) => ({
        id: p.id,
        type: 'points',
        title: p.reason,
        status: p.amount >= 0 ? 'credited' : 'charged',
        createdAt: new Date(Number(p.created_at)).toISOString(),
      })),
      ...invitations.map((i) => ({
        id: i.id,
        type: 'invitation',
        title: `Project invitation ${i.invited_by === req.user.id ? 'sent' : 'received'}`,
        status: i.status,
        // job_invitations.created_at is stored as an ISO string (new Date().toISOString()),
        // unlike the epoch-millisecond BIGINT columns the other entries above convert from —
        // wrapping it in Number() first produced NaN, so this needs the raw value, not Number(i.created_at).
        createdAt: new Date(i.created_at).toISOString(),
      })),
    ];
    items.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    res.json(items.slice(0, 50));
  });
  app.get('/api/export', requirePermission('workspace:export'), async (req, res) => {
    res.attachment('lamid-one-workspace.json');
    const exported = await transaction(async () => {
      const snapshot = await state(req);
      const scoped = (table) =>
        db.prepare(`SELECT * FROM ${table} WHERE workspace_id = ?`).all(req.workspace.id);
      const [audit, members, jobs, bids, proposals, pointsLedger, invocations, progress, notifications, knowledge, aiPolicy, aiReviews, aiUsage, workflowList] =
        await Promise.all([
          scoped('audit'),
          scoped('workspace_members'),
          scoped('job_posts'),
          scoped('bids'),
          scoped('proposals'),
          scoped('points_ledger'),
          scoped('tool_invocations'),
          records(req.workspace.id, 'progress'),
          records(req.workspace.id, 'notification'),
          records(req.workspace.id, 'knowledge'),
          records(req.workspace.id, 'ai_policy'),
          records(req.workspace.id, 'ai_review'),
          scoped('ai_usage'),
          runtime.list(req.workspace.id),
        ]);
      return {
        schemaVersion: 1,
        scope: 'workspace',
        exportedAt: new Date().toISOString(),
        workspace: snapshot.workspace,
        objectives: snapshot.objectives,
        actions: snapshot.actions,
        reviews: snapshot.reviews,
        audit,
        members,
        jobs,
        bids,
        proposals,
        pointsLedger,
        workflows: workflowList,
        invocations,
        progress,
        notifications,
        knowledge,
        aiPolicy,
        aiReviews,
        aiUsage,
      };
    });
    res.json(exported);
  });
  // Context is fixed at signup and not editable afterward — only the name can change here.
  app.patch('/api/workspace', requirePermission('workspace:manage'), async (req, res) => {
    const input = z.object({ name: text.max(100) }).strict().parse(req.body);
    await transaction(async () => {
      await db
        .prepare('UPDATE workspaces SET name = ? WHERE id = ?')
        .run(input.name, req.workspace.id);
      await log(req.workspace.id, req.user.name, 'Workspace updated', req.workspace.id, input.name);
    });
    res.json({ ok: true });
  });
  app.post('/api/objectives', async (req, res) => {
    const input = objectiveSchema.parse(req.body);
    if (input.status === 'Complete')
      return res
        .status(400)
        .json({ error: 'Create an active or paused objective, then review its completion.' });
    const result = await transaction(async () => {
      const result = await insert(req.workspace.id, 'objective', input);
      await log(req.workspace.id, req.user.name, 'Objective created', result.id, input.title);
      return result;
    });
    res.status(201).json(result);
  });
  app.post('/api/plans', async (req, res) => {
    const input = z
      .object({ objective: objectiveSchema, nextAction: z.string().trim().max(500).default('') })
      .strict()
      .parse(req.body);
    if (input.objective.status === 'Complete')
      return res.status(400).json({ error: 'New plans cannot start complete.' });
    const result = await transaction(async () => {
      const objective = await insert(req.workspace.id, 'objective', input.objective);
      await log(
        req.workspace.id,
        req.user.name,
        'Objective created',
        objective.id,
        input.objective.title,
      );
      const action = input.nextAction
        ? await insert(req.workspace.id, 'action', {
            title: input.nextAction,
            objectiveId: objective.id,
            status: 'Planned',
            owner: req.user.name,
            requiresApproval: false,
            dueDate: '',
            notes: '',
          })
        : null;
      if (action)
        await log(req.workspace.id, req.user.name, 'Action created', action.id, input.nextAction);
      return { objective, action };
    });
    res.status(201).json(result);
  });
  app.patch('/api/objectives/:id', async (req, res) => {
    const { version, ...changes } = objectiveSchema
      .partial()
      .extend({ version: z.number().int().positive() })
      .strict()
      .parse(req.body);
    const result = await transaction(async () => {
      const row = await db
        .prepare("SELECT * FROM records WHERE id = ? AND workspace_id = ? AND kind = 'objective'")
        .get(req.params.id, req.workspace.id);
      if (!row) return { code: 404, error: 'Objective not found.' };
      if (row.version !== version)
        return {
          code: 409,
          error: 'This objective changed. Reopen it to review the latest version.',
        };
      if (
        changes.status === 'Complete' &&
        (await records(req.workspace.id, 'action')).some(
          (action) => action.objectiveId === row.id && action.status !== 'Done',
        )
      )
        return {
          code: 409,
          error: 'Complete or review the remaining actions before completing this objective.',
        };
      const updated = objectiveSchema.parse({ ...JSON.parse(row.data), ...changes });
      await db.prepare('UPDATE records SET data = ?, version = version + 1 WHERE id = ?').run(
        JSON.stringify(updated),
        row.id,
      );
      await log(
        req.workspace.id,
        req.user.name,
        'Objective updated',
        row.id,
        `${updated.title} · ${updated.status} (prior version ${row.version})`,
      );
      return { ...updated, id: row.id, version: row.version + 1 };
    });
    if (result.error) return res.status(result.code).json({ error: result.error });
    res.json(result);
  });
  app.post('/api/actions', async (req, res) => {
    const input = actionSchema.parse(req.body);
    if (input.status !== 'Planned')
      return res.status(400).json({ error: 'New actions must start as Planned.' });
    const result = await transaction(async () => {
      const objective = await db
        .prepare(
          "SELECT data FROM records WHERE id = ? AND workspace_id = ? AND kind = 'objective'",
        )
        .get(input.objectiveId, req.workspace.id);
      if (!objective) throw Object.assign(new Error('Objective not found.'), { status: 404 });
      if (JSON.parse(objective.data).status === 'Complete')
        throw Object.assign(new Error('Reopen this objective before adding actions.'), {
          status: 409,
        });
      const result = await insert(req.workspace.id, 'action', input);
      await log(req.workspace.id, req.user.name, 'Action created', result.id, input.title);
      return result;
    });
    res.status(201).json(result);
  });
  app.patch('/api/actions/:id', async (req, res) => {
    const input = z
      .object({
        version: z.number().int().positive(),
        status: z.enum(['Planned', 'In progress', 'Needs review', 'Done', 'Paused']),
        decision: z.enum(['approve', 'return']).optional(),
      })
      .strict()
      .parse(req.body);
    const result = await transaction(async () => {
      const row = await db
        .prepare("SELECT * FROM records WHERE id = ? AND workspace_id = ? AND kind = 'action'")
        .get(req.params.id, req.workspace.id);
      if (!row) return { code: 404, error: 'Action not found.' };
      if (row.version !== input.version)
        return { code: 409, error: 'This action changed. Refresh and review the latest version.' };
      const data = JSON.parse(row.data);
      if (
        (input.decision || (data.status === 'Needs review' && input.status === 'Done')) &&
        !permissionsFor(req.workspace.role).includes('review:decide')
      )
        return { code: 403, error: 'Only a workspace owner can record review decisions.' };
      if (
        input.decision &&
        !(
          data.status === 'Needs review' &&
          ((input.decision === 'approve' && input.status === 'Done') ||
            (input.decision === 'return' && input.status === 'In progress'))
        )
      )
        return { code: 400, error: 'The review decision does not match this transition.' };
      const transitions = {
        Planned: ['In progress', 'Paused'],
        'In progress': ['Needs review', 'Done', 'Paused'],
        'Needs review': ['Done', 'In progress', 'Paused'],
        Paused: ['Planned'],
        Done: [],
      };
      if (!transitions[data.status].includes(input.status))
        return { code: 400, error: 'This status transition is not allowed.' };
      if (
        data.requiresApproval &&
        input.status === 'Done' &&
        !(data.status === 'Needs review' && input.decision === 'approve')
      )
        return { code: 403, error: 'Review and approve this action before completing it.' };
      if (
        data.status === 'Needs review' &&
        input.status === 'In progress' &&
        input.decision !== 'return'
      )
        return { code: 400, error: 'Record a return decision for this review.' };
      const updated = { ...data, status: input.status };
      await db.prepare('UPDATE records SET data = ?, version = version + 1 WHERE id = ?').run(
        JSON.stringify(updated),
        row.id,
      );
      await log(
        req.workspace.id,
        req.user.name,
        input.decision === 'approve'
          ? 'Action approved'
          : input.decision === 'return'
            ? 'Action returned for changes'
            : 'Action status changed',
        row.id,
        `${data.title}: ${data.status} → ${input.status} (reviewed version ${row.version})`,
      );
      return { ...updated, id: row.id, version: row.version + 1 };
    });
    if (result.error) return res.status(result.code).json({ error: result.error });
    res.json(result);
  });
  app.post('/api/reviews', async (req, res) => {
    const input = reviewSchema.parse(req.body);
    const result = await transaction(async () => {
      const result = await insert(req.workspace.id, 'review', input);
      await log(req.workspace.id, req.user.name, 'Weekly review saved', result.id, input.next);
      return result;
    });
    res.status(201).json(result);
  });
  mountWorkflows(app, store, runtime);
  mountKnowledge(app, store);
  mountAI(app, store, aiProvider);
  mountAgents(app, store, agentRuntime, { spendLimiter });
  mountModelRegistry(app, store);
  mountProjects(app, store, { aiProvider });
  mountPayments(app, store, { paymentProvider });
  mountPointsPurchase(app, store, { paymentProvider });
  mountDocuments(app, store);
  mountFx(app, store);
  mountConcierge(app, store, { ecosystemAdminEmails });
  mountBilling(app, store, { paymentProvider, ecosystemAdminEmails });
  mountPricing(app, store, { ecosystemAdminEmails });
  mountTalent(app, store, { ecosystemAdminEmails });
  mountReputation(app, store);
  mountScoping(app, store, { ecosystemAdminEmails });
  mountBooking(app, store);
  mountExpertTeams(app, store);
  mountHandoff(app, store);
  mountOutcomes(app, store);
  mountLearning(app, store, { ecosystemAdminEmails });
  mountInvitations(app, store);
  mountMessaging(app, store);
  mountEstimator(app, store);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
  app.use((error, req, res, _next) => {
    if (res.headersSent) return _next(error);
    if (error instanceof z.ZodError)
      return res.status(400).json({
        error: error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '),
      });
    if (error.type === 'entity.parse.failed')
      return res.status(400).json({ error: 'Invalid JSON.' });
    if (error.type === 'entity.too.large')
      return res.status(413).json({ error: 'Request is too large.' });
    const status = Number.isInteger(error?.status) && error.status >= 400 && error.status <= 599 ? error.status : 500;
    if (status < 500) return res.status(status).json({ error: error.message });
    errorLogger('http_error', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status,
      ...(req.user?.id ? { userId: req.user.id } : {}),
      error: errorDetails(error),
    });
    res.locals.errorLogged = true;
    res.status(status).json({ error: status === 500 ? 'Something went wrong. Please try again.' : error.message, requestId: req.requestId });
  });
  return { app, store, runtime, agentRuntime, mail: accounts.mail };
}
