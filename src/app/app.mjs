import express from 'express';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { z } from 'zod';
import { openStore, hashPassword, verifyPassword, seedWorkspace } from '../../server/store.mjs';
import { permissionsFor, requirePermission } from './policy.mjs';
import { createWorkflowRuntime, mountWorkflows } from './workflows.mjs';
import { mountKnowledge } from './knowledge.mjs';
import { mountAI, openAIProvider } from './ai.mjs';
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
import { mountPricing } from './pricing.mjs';
import { mountTalent } from './talent.mjs';
import { mountInvitations } from './invitations.mjs';
import { createRateLimiter } from './ratelimit.mjs';
import { mountMessaging } from './messaging.mjs';
import { mountEstimator } from './estimator.mjs';
import { JOB_CATEGORIES, PROJECT_TYPES } from './jobTaxonomy.mjs';
import { wordSet, scoreBid } from './text.mjs';

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
const tokenLifetime = 30 * 60 * 1000;
const jobPostCost = 10;
const bidCost = 2;

export function createApp({
  filename = 'data/lamid.db',
  production = false,
  rateLimits = {},
  aiProvider = openAIProvider(),
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
  const store = openStore(filename);
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
    ...limits.api,
    message: 'Too many requests. Please wait a minute and try again.',
  });
  const authLimiter = createRateLimiter(store, {
    ...limits.auth,
    message: 'Too many sign-in attempts. Please wait a minute and try again.',
  });
  const mutationLimiter = createRateLimiter(store, {
    ...limits.mutation,
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
    ...rateLimits.spend,
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
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (production)
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
      );
    if (production) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    if (req.path.startsWith('/api')) res.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (
        req.headers['sec-fetch-site'] === 'cross-site' ||
        (req.headers.origin && req.headers.origin !== `${req.protocol}://${req.get('host')}`)
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
  const session = (res, userId, workspaceId = null) => {
    const token = randomBytes(32).toString('hex');
    db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
    db.prepare(
      'INSERT INTO sessions (token, user_id, expires_at, workspace_id) VALUES (?, ?, ?, ?)',
    ).run(digest(token), userId, Date.now() + 86400000 * 7, workspaceId);
    res.cookie('lamid_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: production && process.env.COOKIE_SECURE === 'true',
      maxAge: 86400000 * 7,
      path: '/',
    });
  };
  const issueAccountToken = (userId, kind) => {
    const token = randomBytes(32).toString('hex');
    db.prepare('DELETE FROM account_tokens WHERE expires_at < ? OR used_at IS NOT NULL').run(
      Date.now(),
    );
    db.prepare('INSERT INTO account_tokens VALUES (?, ?, ?, ?, ?, NULL, ?)').run(
      randomUUID(),
      userId,
      kind,
      digest(token),
      Date.now() + tokenLifetime,
      Date.now(),
    );
    return token;
  };
  const consumeAccountToken = (token, kind) => {
    const row = db
      .prepare(
        'SELECT * FROM account_tokens WHERE token_hash = ? AND kind = ? AND used_at IS NULL AND expires_at > ?',
      )
      .get(digest(token), kind, Date.now());
    if (!row) return null;
    db.prepare('UPDATE account_tokens SET used_at = ? WHERE id = ?').run(Date.now(), row.id);
    return row;
  };
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.post('/api/auth/signup', async (req, res) => {
    const input = z
      .object({
        name: text.max(100),
        email: z
          .string()
          .trim()
          .email('Enter a valid email address using standard letters, numbers, and symbols.')
          .max(254)
          .transform((x) => x.toLowerCase()),
        password: z.string().min(12).max(128),
        context: contexts,
      })
      .strict()
      .parse(req.body);
    const password = await hashPassword(input.password);
    const user = randomUUID();
    const workspace = randomUUID();
    try {
      transaction(() => {
        db.prepare(
          'INSERT INTO users (id, email, password, name, demo, created_at, verified_at, disabled_at, points_balance) VALUES (?, ?, ?, ?, 0, ?, NULL, NULL, 100)',
        ).run(user, input.email, password, input.name, new Date().toISOString());
        db.prepare(
          'INSERT INTO workspaces (id, user_id, name, context, tier, member_limit) VALUES (?, ?, ?, ?, ?, ?)',
        ).run(
          workspace,
          user,
          `${input.name.split(' ')[0]}'s workspace`,
          input.context,
          input.context === 'Enterprise' ? 'enterprise' : 'individual',
          input.context === 'Enterprise' ? enterpriseMemberLimit : 1,
        );
        db.prepare('INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)').run(
          workspace,
          user,
          'owner',
          'active',
          Date.now(),
        );
        log(
          workspace,
          input.name,
          'Workspace created',
          workspace,
          `Starting context: ${input.context}`,
        );
      });
    } catch (error) {
      if (error.message.includes('UNIQUE'))
        return res
          .status(409)
          .json({ error: 'Unable to create this account. Try signing in instead.' });
      throw error;
    }
    const verificationToken = issueAccountToken(user, 'verification');
    session(res, user, workspace);
    res.status(201).json({ ok: true, ...(production ? {} : { verificationToken }) });
  });
  app.post('/api/auth/resend-verification', (req, res) => {
    const input = z
      .object({
        email: z
          .string()
          .trim()
          .email('Enter a valid email address using standard letters, numbers, and symbols.')
          .max(254),
      })
      .strict()
      .parse(req.body);
    const user = db
      .prepare('SELECT id, verified_at FROM users WHERE email = ? AND demo = 0')
      .get(input.email.toLowerCase());
    const response = { ok: true };
    if (user && !user.verified_at && !production)
      response.verificationToken = issueAccountToken(user.id, 'verification');
    if (user && !user.verified_at && production) issueAccountToken(user.id, 'verification');
    res.json(response);
  });
  app.post('/api/auth/verify', (req, res) => {
    const input = z
      .object({ token: z.string().regex(/^[a-f0-9]{64}$/) })
      .strict()
      .parse(req.body);
    const token = consumeAccountToken(input.token, 'verification');
    if (!token)
      return res.status(400).json({ error: 'This verification link is invalid or expired.' });
    db.prepare('UPDATE users SET verified_at = ? WHERE id = ?').run(Date.now(), token.user_id);
    res.json({ ok: true });
  });
  app.post('/api/auth/request-recovery', (req, res) => {
    const input = z
      .object({
        email: z
          .string()
          .trim()
          .email('Enter a valid email address using standard letters, numbers, and symbols.')
          .max(254),
      })
      .strict()
      .parse(req.body);
    const user = db
      .prepare('SELECT id FROM users WHERE email = ? AND demo = 0')
      .get(input.email.toLowerCase());
    const response = { ok: true };
    if (user && !production) response.recoveryToken = issueAccountToken(user.id, 'recovery');
    if (user && production) issueAccountToken(user.id, 'recovery');
    res.json(response);
  });
  app.post('/api/auth/reset-password', async (req, res) => {
    const input = z
      .object({ token: z.string().regex(/^[a-f0-9]{64}$/), password: z.string().min(12).max(128) })
      .strict()
      .parse(req.body);
    const password = await hashPassword(input.password);
    const reset = transaction(() => {
      const token = consumeAccountToken(input.token, 'recovery');
      if (!token) return false;
      db.prepare(
        'UPDATE users SET password = ?, verified_at = COALESCE(verified_at, ?) WHERE id = ?',
      ).run(password, Date.now(), token.user_id);
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(token.user_id);
      return true;
    });
    if (!reset) return res.status(400).json({ error: 'This recovery link is invalid or expired.' });
    res.json({ ok: true });
  });
  app.post('/api/auth/login', async (req, res) => {
    const input = z
      .object({
        email: z
          .string()
          .trim()
          .email('Enter a valid email address using standard letters, numbers, and symbols.')
          .max(254),
        password: z.string().min(1).max(128),
      })
      .strict()
      .parse(req.body);
    const user = db
      .prepare('SELECT * FROM users WHERE email = ? AND demo = 0')
      .get(input.email.toLowerCase());
    const valid = await verifyPassword(
      input.password,
      user?.password || `${'00'.repeat(16)}:${'00'.repeat(64)}`,
    );
    if (user?.disabled_at)
      return res.status(403).json({ error: 'This account has been disabled by an administrator.' });
    if (!user || !valid) return res.status(401).json({ error: 'Email or password is incorrect.' });
    const workspace = db.prepare('SELECT id FROM workspaces WHERE user_id = ?').get(user.id);
    session(res, user.id, workspace?.id || null);
    res.json({ ok: true });
  });
  app.post('/api/auth/demo', (_req, res) => {
    const user = randomUUID();
    const workspace = randomUUID();
    transaction(() => {
      db.prepare(
        'INSERT INTO users (id, email, password, name, demo, created_at, verified_at, disabled_at, points_balance) VALUES (?, NULL, NULL, ?, 1, ?, ?, NULL, 100)',
      ).run(user, 'Alex Morgan', new Date().toISOString(), Date.now());
      db.prepare(
        'INSERT INTO workspaces (id, user_id, name, context, tier, member_limit) VALUES (?, ?, ?, ?, ?, ?)',
      ).run(workspace, user, 'The next chapter', 'Founder', 'individual', 1);
      db.prepare('INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)').run(
        workspace,
        user,
        'owner',
        'active',
        Date.now(),
      );
      seedWorkspace(store, workspace, 'Alex Morgan');
    });
    session(res, user, workspace);
    res.status(201).json({ ok: true });
  });
  app.use('/api', (req, res, next) => {
    const token = (req.headers.cookie || '')
      .split(';')
      .map((x) => x.trim())
      .find((x) => x.startsWith('lamid_session='))
      ?.slice(14);
    if (!token) return res.status(401).json({ error: 'Sign in to continue.' });
    const user = db
      .prepare(
        'SELECT users.id, users.name, users.email, users.demo, users.disabled_at, sessions.workspace_id AS sessionWorkspaceId FROM sessions JOIN users ON users.id = sessions.user_id WHERE token = ? AND expires_at > ?',
      )
      .get(digest(token), Date.now());
    if (!user)
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    if (user.disabled_at)
      return res.status(403).json({ error: 'This account has been disabled by an administrator.' });
    req.user = user;
    req.workspace = db
      .prepare(
        "SELECT workspaces.id, workspaces.name, workspaces.context, workspaces.tier, workspaces.member_limit FROM workspace_members JOIN workspaces ON workspaces.id = workspace_members.workspace_id WHERE workspace_members.user_id = ? AND workspace_members.status = 'active' AND (? IS NULL OR workspaces.id = ?) ORDER BY workspace_members.role = 'owner' DESC LIMIT 1",
      )
      .get(user.id, user.sessionWorkspaceId, user.sessionWorkspaceId);
    if (!req.workspace && user.sessionWorkspaceId) {
      db.prepare('UPDATE sessions SET workspace_id = NULL WHERE token = ?').run(digest(token));
      req.workspace = db
        .prepare(
          "SELECT workspaces.id, workspaces.name, workspaces.context, workspaces.tier, workspaces.member_limit FROM workspace_members JOIN workspaces ON workspaces.id = workspace_members.workspace_id WHERE workspace_members.user_id = ? AND workspace_members.status = 'active' ORDER BY workspace_members.role = 'owner' DESC LIMIT 1",
        )
        .get(user.id);
    }
    if (!req.workspace) return res.status(403).json({ error: 'No active workspace membership.' });
    req.workspace.role = db
      .prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
      .get(req.workspace.id, user.id).role;
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
  app.post('/api/auth/logout', (req, res) => {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(digest(req.token));
    res.clearCookie('lamid_session', { path: '/' });
    res.json({ ok: true });
  });
  app.get('/api/workspaces', (req, res) => {
    res.json(
      db
        .prepare(
          "SELECT workspaces.id, workspaces.name, workspaces.context, workspaces.tier, workspaces.member_limit, workspace_members.role, workspace_members.status FROM workspace_members JOIN workspaces ON workspaces.id = workspace_members.workspace_id WHERE workspace_members.user_id = ? ORDER BY workspace_members.role = 'owner' DESC, workspaces.name",
        )
        .all(req.user.id),
    );
  });
  app.post('/api/workspace/switch', (req, res) => {
    const input = z.object({ workspaceId: z.string().uuid() }).strict().parse(req.body);
    const membership = db
      .prepare(
        "SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ? AND status = 'active'",
      )
      .get(input.workspaceId, req.user.id);
    if (!membership)
      return res.status(403).json({ error: 'You are not an active member of that workspace.' });
    db.prepare('UPDATE sessions SET workspace_id = ? WHERE token = ?').run(
      input.workspaceId,
      digest(req.token),
    );
    res.json({ ok: true, workspaceId: input.workspaceId });
  });
  const replayable = (req, operation, input, work) =>
    transaction(() => {
      const key = req.get('Idempotency-Key');
      if (key && !/^[a-zA-Z0-9_-]{8,128}$/.test(key))
        throw Object.assign(new Error('Use an 8–128 character idempotency key.'), { status: 400 });
      const fingerprint = digest(JSON.stringify(input));
      if (key) {
        const prior = db
          .prepare(
            'SELECT * FROM idempotency WHERE user_id = ? AND workspace_id = ? AND operation = ? AND key = ?',
          )
          .get(req.user.id, req.workspace.id, operation, key);
        if (prior) {
          if (prior.fingerprint !== fingerprint)
            throw Object.assign(
              new Error('This idempotency key was already used for different input.'),
              { status: 409 },
            );
          return JSON.parse(prior.response);
        }
      }
      const result = work();
      if (key)
        db.prepare('INSERT INTO idempotency VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
          req.user.id,
          req.workspace.id,
          operation,
          key,
          fingerprint,
          201,
          JSON.stringify(result),
          Date.now(),
        );
      return result;
    });
  app.get('/api/jobs', (req, res) => {
    res.json(
      db
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
  app.get('/api/points', (req, res) =>
    res.json({
      balance: db.prepare('SELECT points_balance FROM users WHERE id = ?').get(req.user.id)
        .points_balance,
      ledger: db
        .prepare(
          'SELECT amount, reason, reference_id, created_at FROM points_ledger WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
        )
        .all(req.user.id),
    }),
  );
  app.get('/api/bids/mine', (req, res) =>
    res.json(
      db
        .prepare('SELECT * FROM bids WHERE freelancer_user_id = ? ORDER BY created_at DESC')
        .all(req.user.id),
    ),
  );
  app.get('/api/marketplace/jobs', (req, res) => {
    if (req.user.demo) return res.json([]);
    const query = z
      .object({
        q: z.string().trim().max(200).default(''),
        offset: z.coerce.number().int().min(0).max(100000).default(0),
      })
      .strict()
      .parse(req.query);
    res.json(
      db
        .prepare(
          `SELECT job_posts.* FROM job_posts JOIN users ON users.id = job_posts.client_user_id
      WHERE job_posts.status = 'open' AND users.demo = 0 AND users.disabled_at IS NULL
      AND (instr(lower(job_posts.title), lower(?)) > 0 OR instr(lower(job_posts.category), lower(?)) > 0)
      ORDER BY job_posts.created_at DESC, job_posts.id LIMIT 50 OFFSET ?`,
        )
        .all(query.q, query.q, query.offset),
    );
  });
  app.post('/api/jobs', spendLimiter, (req, res) => {
    const input = jobPostSchema.parse(req.body);
    const id = randomUUID();
    const result = replayable(req, 'job.create', input, () => {
      const changed = db
        .prepare(
          'UPDATE users SET points_balance = points_balance - ? WHERE id = ? AND points_balance >= ?',
        )
        .run(jobPostCost, req.user.id, jobPostCost);
      if (changed.changes !== 1)
        throw Object.assign(new Error('Not enough points to post this job.'), { status: 402 });
      db.prepare('INSERT INTO points_ledger VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        randomUUID(),
        req.user.id,
        req.workspace.id,
        -jobPostCost,
        'job_post',
        id,
        Date.now(),
      );
      db.prepare('INSERT INTO job_posts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
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
      log(req.workspace.id, req.user.name, 'Job post created', id, input.title);
      return { id, ...input, status: 'open', pointsCharged: jobPostCost };
    });
    res.status(201).json(result);
  });
  app.get('/api/jobs/:id/bids', (req, res) => {
    const job = db
      .prepare('SELECT * FROM job_posts WHERE id = ? AND workspace_id = ?')
      .get(req.params.id, req.workspace.id);
    if (!job) return res.status(404).json({ error: 'Job post not found.' });
    if (job.client_user_id !== req.user.id)
      return res.status(403).json({ error: 'Only the job owner can review bids.' });
    res.json(
      db.prepare('SELECT * FROM bids WHERE job_id = ? ORDER BY created_at DESC').all(job.id),
    );
  });
  app.get('/api/jobs/:id/matches', (req, res) => {
    const job = db.prepare('SELECT * FROM job_posts WHERE id = ?').get(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job post not found.' });
    if (job.client_user_id !== req.user.id)
      return res.status(403).json({ error: 'Only the job owner can review matches.' });
    const bids = db.prepare('SELECT * FROM bids WHERE job_id = ?').all(job.id);
    const scored = bids
      .map((bid) => ({ bid, ...scoreBid(job, bid) }))
      .sort((a, b) => b.total - a.total);
    res.json(scored);
  });
  app.post('/api/jobs/:id/bids', spendLimiter, (req, res) => {
    const input = bidSchema.parse(req.body);
    const job = db.prepare('SELECT * FROM job_posts WHERE id = ?').get(req.params.id);
    if (!job || job.status !== 'open')
      return res.status(404).json({ error: 'Open job post not found.' });
    if (
      req.user.demo ||
      db.prepare('SELECT demo FROM users WHERE id = ?').get(job.client_user_id)?.demo
    )
      return res
        .status(403)
        .json({ error: 'Sample workspaces cannot participate in shared commercial work.' });
    if (job.client_user_id === req.user.id)
      return res.status(403).json({ error: 'Job owners cannot bid on their own post.' });
    if (job.currency !== input.currency)
      return res.status(400).json({ error: 'Bid currency must match the job currency.' });
    const id = randomUUID();
    const result = replayable(req, `bid.create:${job.id}`, input, () => {
      const existing = db
        .prepare('SELECT id FROM bids WHERE job_id = ? AND freelancer_user_id = ?')
        .get(job.id, req.user.id);
      if (existing)
        throw Object.assign(new Error('You already submitted a bid for this job.'), {
          status: 409,
        });
      const changed = db
        .prepare(
          'UPDATE users SET points_balance = points_balance - ? WHERE id = ? AND points_balance >= ?',
        )
        .run(bidCost, req.user.id, bidCost);
      if (changed.changes !== 1)
        throw Object.assign(new Error('Not enough points to submit this bid.'), { status: 402 });
      db.prepare('INSERT INTO points_ledger VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        randomUUID(),
        req.user.id,
        job.workspace_id,
        -bidCost,
        'bid_submission',
        id,
        Date.now(),
      );
      db.prepare('INSERT INTO bids VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
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
      log(job.workspace_id, req.user.name, 'Bid submitted', id, `Job ${job.id}`);
      return { id, jobId: job.id, ...input, status: 'submitted', pointsCharged: bidCost };
    });
    res.status(201).json(result);
  });
  app.post('/api/jobs/:id/proposals', (req, res) => {
    const input = proposalSchema.parse(req.body);
    const job = db.prepare('SELECT * FROM job_posts WHERE id = ?').get(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job post not found.' });
    if (
      job.client_user_id !== req.user.id &&
      (req.user.demo ||
        db.prepare('SELECT demo FROM users WHERE id = ?').get(job.client_user_id)?.demo)
    )
      return res
        .status(403)
        .json({ error: 'Sample workspaces cannot participate in shared commercial work.' });
    const bid = req.body.bidId
      ? db.prepare('SELECT * FROM bids WHERE id = ? AND job_id = ?').get(req.body.bidId, job.id)
      : null;
    if (job.client_user_id !== req.user.id && (!bid || bid.freelancer_user_id !== req.user.id))
      return res
        .status(403)
        .json({ error: 'Only the client or bidding freelancer can draft a proposal.' });
    if (input.currency !== job.currency)
      return res.status(400).json({ error: 'Proposal currency must match the job currency.' });
    const sourceType = job.client_user_id === req.user.id ? 'client' : 'freelancer';
    const id = randomUUID();
    const result = replayable(req, `proposal.create:${job.id}`, input, () => {
      db.prepare('INSERT INTO proposals VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
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
      log(job.workspace_id, req.user.name, 'Proposal drafted', id, input.title);
      return { id, jobId: job.id, ...input, bidId: bid?.id || null, sourceType, status: 'draft' };
    });
    res.status(201).json(result);
  });
  app.get('/api/jobs/:id/proposals', (req, res) => {
    const job = db.prepare('SELECT * FROM job_posts WHERE id = ?').get(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job post not found.' });
    if (job.client_user_id !== req.user.id) {
      const authored = db
        .prepare(
          'SELECT * FROM proposals WHERE job_id = ? AND author_user_id = ? ORDER BY created_at DESC',
        )
        .all(job.id, req.user.id);
      if (
        !authored.length &&
        !db
          .prepare('SELECT 1 FROM bids WHERE job_id = ? AND freelancer_user_id = ?')
          .get(job.id, req.user.id)
      )
        return res.status(403).json({ error: 'Only proposal participants can review drafts.' });
      return res.json(authored);
    }
    res.json(
      db.prepare('SELECT * FROM proposals WHERE job_id = ? ORDER BY created_at DESC').all(job.id),
    );
  });
  const deleteUser = (userId, actorId) => {
    const workspaces = db.prepare('SELECT id FROM workspaces WHERE user_id = ?').all(userId);
    transaction(() => {
      // Remove the account's draft commercial work; preserve other users' point history.
      db.prepare(
        'DELETE FROM workflow_runs WHERE principal_id = ? OR workspace_id IN (SELECT id FROM workspaces WHERE user_id = ?)',
      ).run(userId, userId);
      const doomedJobs = db
        .prepare(
          `SELECT id FROM job_posts WHERE client_user_id = ?
        OR workspace_id IN (SELECT id FROM workspaces WHERE user_id = ?)`,
        )
        .all(userId, userId);
      for (const job of doomedJobs) {
        db.prepare('DELETE FROM proposals WHERE job_id = ?').run(job.id);
        db.prepare('DELETE FROM bids WHERE job_id = ?').run(job.id);
        db.prepare('DELETE FROM job_posts WHERE id = ?').run(job.id);
      }
      db.prepare('DELETE FROM proposals WHERE author_user_id = ?').run(userId);
      db.prepare(
        'UPDATE proposals SET bid_id = NULL WHERE bid_id IN (SELECT id FROM bids WHERE freelancer_user_id = ?)',
      ).run(userId);
      db.prepare('DELETE FROM bids WHERE freelancer_user_id = ?').run(userId);
      db.prepare('DELETE FROM points_ledger WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM idempotency WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM account_tokens WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM workspace_members WHERE user_id = ?').run(userId);
      for (const workspace of workspaces) {
        db.prepare('DELETE FROM ai_usage WHERE workspace_id = ?').run(workspace.id);
        db.prepare('DELETE FROM idempotency WHERE workspace_id = ?').run(workspace.id);
        db.prepare('UPDATE sessions SET workspace_id = NULL WHERE workspace_id = ?').run(
          workspace.id,
        );
        db.prepare('UPDATE points_ledger SET workspace_id = NULL WHERE workspace_id = ?').run(
          workspace.id,
        );
        db.prepare('DELETE FROM workspace_members WHERE workspace_id = ?').run(workspace.id);
        db.prepare('DELETE FROM audit WHERE workspace_id = ?').run(workspace.id);
        db.prepare('DELETE FROM records WHERE workspace_id = ?').run(workspace.id);
        db.prepare('DELETE FROM workspaces WHERE id = ?').run(workspace.id);
      }
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);
      db.prepare('INSERT INTO administration_audit VALUES (?, ?, ?, ?, ?)').run(
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
    const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
    if (!user) return false;
    const valid = await verifyPassword(password, user.password);
    return (
      valid &&
      Boolean(
        db
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
    const target = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
    if (!target) return res.status(404).json({ error: 'User account not found.' });
    deleteUser(target.id, req.user.id);
    if (target.id === req.user.id) res.clearCookie('lamid_session', { path: '/' });
    res.json({ ok: true });
  });
  app.get('/api/admin/members', requirePermission('members:manage'), (req, res) => {
    res.json(
      db
        .prepare(
          `SELECT users.id AS userId, users.name, users.email,
      workspace_members.role, workspace_members.status, workspace_members.created_at AS createdAt
      FROM workspace_members JOIN users ON users.id = workspace_members.user_id
      WHERE workspace_id = ? ORDER BY role = 'owner' DESC, users.name`,
        )
        .all(req.workspace.id),
    );
  });
  app.patch('/api/admin/members/:id', requirePermission('members:manage'), (req, res) => {
    const input = z
      .object({ status: z.enum(['active', 'disabled']) })
      .strict()
      .parse(req.body);
    const owner = db
      .prepare(
        "SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ? AND role = 'owner' AND status = 'active'",
      )
      .get(req.workspace.id, req.user.id);
    if (!owner || req.workspace.tier !== 'enterprise')
      return res
        .status(403)
        .json({ error: 'Only an enterprise workspace administrator can manage members.' });
    const member = db
      .prepare(
        "SELECT user_id AS userId FROM workspace_members WHERE workspace_id = ? AND user_id = ? AND role != 'owner'",
      )
      .get(req.workspace.id, req.params.id);
    if (!member) return res.status(404).json({ error: 'Workspace member not found.' });
    transaction(() => {
      const current = db
        .prepare('SELECT status FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
        .get(req.workspace.id, member.userId);
      if (current.status === input.status) return;
      if (input.status === 'active') {
        const count = db
          .prepare(
            "SELECT COUNT(*) AS count FROM workspace_members WHERE workspace_id = ? AND status = 'active'",
          )
          .get(req.workspace.id).count;
        if (count >= req.workspace.member_limit)
          throw Object.assign(
            new Error('This enterprise workspace has reached its member limit.'),
            { status: 409 },
          );
      }
      db.prepare(
        'UPDATE workspace_members SET status = ? WHERE workspace_id = ? AND user_id = ?',
      ).run(input.status, req.workspace.id, member.userId);
      if (input.status === 'disabled')
        db.prepare(
          'UPDATE sessions SET workspace_id = NULL WHERE user_id = ? AND workspace_id = ?',
        ).run(member.userId, req.workspace.id);
      log(req.workspace.id, req.user.name, 'Membership updated', member.userId, input.status);
    });
    res.json({ ok: true, status: input.status });
  });
  app.post('/api/admin/members', (req, res) => {
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
    const owner = db
      .prepare(
        "SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ? AND role = 'owner' AND status = 'active'",
      )
      .get(req.workspace.id, req.user.id);
    if (!owner || req.workspace.tier !== 'enterprise')
      return res
        .status(403)
        .json({ error: 'Only an enterprise workspace administrator can add members.' });
    const count = db
      .prepare(
        "SELECT COUNT(*) AS count FROM workspace_members WHERE workspace_id = ? AND status = 'active'",
      )
      .get(req.workspace.id).count;
    if (count >= req.workspace.member_limit)
      return res
        .status(409)
        .json({ error: 'This enterprise workspace has reached its member limit.' });
    const member = db
      .prepare('SELECT id, disabled_at FROM users WHERE email = ? AND demo = 0')
      .get(input.email.toLowerCase());
    if (!member) return res.status(404).json({ error: 'User account not found.' });
    if (member.disabled_at)
      return res.status(409).json({ error: 'This user account is disabled.' });
    try {
      transaction(() => {
        const active = db
          .prepare(
            "SELECT COUNT(*) AS count FROM workspace_members WHERE workspace_id = ? AND status = 'active'",
          )
          .get(req.workspace.id).count;
        if (active >= req.workspace.member_limit)
          throw Object.assign(
            new Error('This enterprise workspace has reached its member limit.'),
            { status: 409 },
          );
        if (
          db
            .prepare('SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
            .get(req.workspace.id, member.id)
        )
          throw Object.assign(new Error('This user is already a workspace member.'), {
            status: 409,
          });
        db.prepare('INSERT INTO workspace_members VALUES (?, ?, ?, ?, ?)').run(
          req.workspace.id,
          member.id,
          input.role,
          'active',
          Date.now(),
        );
        log(req.workspace.id, req.user.name, 'Member added', member.id, input.role);
      });
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY')
        return res.status(409).json({ error: 'This user is already a workspace member.' });
      throw error;
    }
    res.status(201).json({ ok: true, userId: member.id, role: input.role });
  });
  const state = (req) => ({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      demo: Boolean(req.user.demo),
    },
    workspace: req.workspace,
    permissions: permissionsFor(req.workspace.role),
    workspaces: db
      .prepare(
        "SELECT workspaces.id, workspaces.name, workspaces.context, workspaces.tier, workspaces.member_limit, workspace_members.role, workspace_members.status FROM workspace_members JOIN workspaces ON workspaces.id = workspace_members.workspace_id WHERE workspace_members.user_id = ? AND workspace_members.status = 'active' ORDER BY workspace_members.role = 'owner' DESC, workspaces.name",
      )
      .all(req.user.id),
    objectives: records(req.workspace.id, 'objective'),
    actions: records(req.workspace.id, 'action'),
    reviews: records(req.workspace.id, 'review'),
    audit: db
      .prepare(
        'SELECT id, actor, action, object_id AS objectId, detail, created_at AS createdAt FROM audit WHERE workspace_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 200',
      )
      .all(req.workspace.id),
  });
  app.get('/api/state', (req, res) => res.json(state(req)));
  app.get('/api/activity', (req, res) => {
    const agentName = (agentId) => agentManifests.find((a) => a.id === agentId)?.name || agentId;
    const items = [
      ...records(req.workspace.id, 'objective').map((o) => ({
        id: o.id,
        type: 'objective',
        title: o.title,
        status: o.status,
        createdAt: o.createdAt,
      })),
      ...records(req.workspace.id, 'action').map((a) => ({
        id: a.id,
        type: 'action',
        title: a.title,
        status: a.status,
        createdAt: a.createdAt,
      })),
      ...db
        .prepare('SELECT * FROM job_posts WHERE workspace_id = ?')
        .all(req.workspace.id)
        .map((j) => ({
          id: j.id,
          type: 'job',
          title: j.title,
          status: j.status,
          createdAt: new Date(j.created_at).toISOString(),
        })),
      ...db
        .prepare('SELECT * FROM bids WHERE freelancer_user_id = ?')
        .all(req.user.id)
        .map((b) => ({
          id: b.id,
          type: 'bid',
          title: `Bid on job ${b.job_id}`,
          status: b.status,
          createdAt: new Date(b.created_at).toISOString(),
        })),
      ...db
        .prepare('SELECT * FROM proposals WHERE author_user_id = ?')
        .all(req.user.id)
        .map((p) => ({
          id: p.id,
          type: 'proposal',
          title: p.title,
          status: p.status,
          createdAt: new Date(p.created_at).toISOString(),
        })),
      ...runtime.list(req.workspace.id).map((w) => ({
        id: w.id,
        type: 'workflow',
        title: w.title,
        status: w.state,
        createdAt: w.created_at,
      })),
      ...db
        .prepare('SELECT * FROM agent_runs WHERE workspace_id = ? AND principal_id = ?')
        .all(req.workspace.id, req.user.id)
        .map((r) => ({
          id: r.id,
          type: 'agent_run',
          title: agentName(r.agent_id),
          status: r.status,
          createdAt: r.created_at,
        })),
      ...db
        .prepare('SELECT * FROM points_ledger WHERE user_id = ?')
        .all(req.user.id)
        .map((p) => ({
          id: p.id,
          type: 'points',
          title: p.reason,
          status: p.amount >= 0 ? 'credited' : 'charged',
          createdAt: new Date(p.created_at).toISOString(),
        })),
      ...db
        .prepare('SELECT * FROM job_invitations WHERE invited_by = ? OR freelancer_user_id = ?')
        .all(req.user.id, req.user.id)
        .map((i) => ({
          id: i.id,
          type: 'invitation',
          title: `Project invitation ${i.invited_by === req.user.id ? 'sent' : 'received'}`,
          status: i.status,
          createdAt: new Date(i.created_at).toISOString(),
        })),
    ];
    items.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    res.json(items.slice(0, 50));
  });
  app.get('/api/export', requirePermission('workspace:export'), (req, res) => {
    res.attachment('lamid-one-workspace.json');
    const exported = transaction(() => {
      const snapshot = state(req);
      const scoped = (table) =>
        db.prepare(`SELECT * FROM ${table} WHERE workspace_id = ?`).all(req.workspace.id);
      return {
        schemaVersion: 1,
        scope: 'workspace',
        exportedAt: new Date().toISOString(),
        workspace: snapshot.workspace,
        objectives: snapshot.objectives,
        actions: snapshot.actions,
        reviews: snapshot.reviews,
        audit: scoped('audit'),
        members: scoped('workspace_members'),
        jobs: scoped('job_posts'),
        bids: scoped('bids'),
        proposals: scoped('proposals'),
        pointsLedger: scoped('points_ledger'),
        workflows: runtime.list(req.workspace.id),
        invocations: scoped('tool_invocations'),
        progress: records(req.workspace.id, 'progress'),
        notifications: records(req.workspace.id, 'notification'),
        knowledge: records(req.workspace.id, 'knowledge'),
        aiPolicy: records(req.workspace.id, 'ai_policy'),
        aiReviews: records(req.workspace.id, 'ai_review'),
        aiUsage: scoped('ai_usage'),
      };
    });
    res.json(exported);
  });
  app.patch('/api/workspace', requirePermission('workspace:manage'), (req, res) => {
    const input = z
      .object({ name: text.max(100), context: contexts })
      .strict()
      .parse(req.body);
    transaction(() => {
      db.prepare('UPDATE workspaces SET name = ?, context = ? WHERE id = ?').run(
        input.name,
        input.context,
        req.workspace.id,
      );
      log(
        req.workspace.id,
        req.user.name,
        'Workspace updated',
        req.workspace.id,
        `${input.name} · ${input.context}`,
      );
    });
    res.json({ ok: true });
  });
  app.post('/api/objectives', (req, res) => {
    const input = objectiveSchema.parse(req.body);
    if (input.status === 'Complete')
      return res
        .status(400)
        .json({ error: 'Create an active or paused objective, then review its completion.' });
    const result = transaction(() => {
      const result = insert(req.workspace.id, 'objective', input);
      log(req.workspace.id, req.user.name, 'Objective created', result.id, input.title);
      return result;
    });
    res.status(201).json(result);
  });
  app.post('/api/plans', (req, res) => {
    const input = z
      .object({ objective: objectiveSchema, nextAction: z.string().trim().max(500).default('') })
      .strict()
      .parse(req.body);
    if (input.objective.status === 'Complete')
      return res.status(400).json({ error: 'New plans cannot start complete.' });
    const result = transaction(() => {
      const objective = insert(req.workspace.id, 'objective', input.objective);
      log(
        req.workspace.id,
        req.user.name,
        'Objective created',
        objective.id,
        input.objective.title,
      );
      const action = input.nextAction
        ? insert(req.workspace.id, 'action', {
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
        log(req.workspace.id, req.user.name, 'Action created', action.id, input.nextAction);
      return { objective, action };
    });
    res.status(201).json(result);
  });
  app.patch('/api/objectives/:id', (req, res) => {
    const { version, ...changes } = objectiveSchema
      .partial()
      .extend({ version: z.number().int().positive() })
      .strict()
      .parse(req.body);
    const result = transaction(() => {
      const row = db
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
        records(req.workspace.id, 'action').some(
          (action) => action.objectiveId === row.id && action.status !== 'Done',
        )
      )
        return {
          code: 409,
          error: 'Complete or review the remaining actions before completing this objective.',
        };
      const updated = objectiveSchema.parse({ ...JSON.parse(row.data), ...changes });
      db.prepare('UPDATE records SET data = ?, version = version + 1 WHERE id = ?').run(
        JSON.stringify(updated),
        row.id,
      );
      log(
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
  app.post('/api/actions', (req, res) => {
    const input = actionSchema.parse(req.body);
    if (input.status !== 'Planned')
      return res.status(400).json({ error: 'New actions must start as Planned.' });
    const result = transaction(() => {
      const objective = db
        .prepare(
          "SELECT data FROM records WHERE id = ? AND workspace_id = ? AND kind = 'objective'",
        )
        .get(input.objectiveId, req.workspace.id);
      if (!objective) throw Object.assign(new Error('Objective not found.'), { status: 404 });
      if (JSON.parse(objective.data).status === 'Complete')
        throw Object.assign(new Error('Reopen this objective before adding actions.'), {
          status: 409,
        });
      const result = insert(req.workspace.id, 'action', input);
      log(req.workspace.id, req.user.name, 'Action created', result.id, input.title);
      return result;
    });
    res.status(201).json(result);
  });
  app.patch('/api/actions/:id', (req, res) => {
    const input = z
      .object({
        version: z.number().int().positive(),
        status: z.enum(['Planned', 'In progress', 'Needs review', 'Done', 'Paused']),
        decision: z.enum(['approve', 'return']).optional(),
      })
      .strict()
      .parse(req.body);
    const result = transaction(() => {
      const row = db
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
      db.prepare('UPDATE records SET data = ?, version = version + 1 WHERE id = ?').run(
        JSON.stringify(updated),
        row.id,
      );
      log(
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
  app.post('/api/reviews', (req, res) => {
    const input = reviewSchema.parse(req.body);
    const result = transaction(() => {
      const result = insert(req.workspace.id, 'review', input);
      log(req.workspace.id, req.user.name, 'Weekly review saved', result.id, input.next);
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
  mountInvitations(app, store);
  mountMessaging(app, store);
  mountEstimator(app, store);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
  app.use((error, _req, res, _next) => {
    if (error instanceof z.ZodError)
      return res.status(400).json({
        error: error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '),
      });
    if (error.type === 'entity.parse.failed')
      return res.status(400).json({ error: 'Invalid JSON.' });
    if (error.type === 'entity.too.large')
      return res.status(413).json({ error: 'Request is too large.' });
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error(error);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  });
  return { app, store, runtime };
}
