import { randomBytes, randomUUID, createHash, createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { z } from 'zod';
import { createMailOutbox, mailFrontendOrigin } from './mail.mjs';
import { createRateLimiter } from './ratelimit.mjs';
import { encryptSecret, decryptSecret } from './mfa.mjs';
import { demoWelcomeEmail } from './emails/demoWelcome.mjs';
import { demoFollowupEmail } from './emails/demoFollowup.mjs';
import {
  catalogSummary,
  catalogCoverage,
  demoEngineDetail,
  resolve,
  runEngine,
} from './engines.mjs';
import demoCapabilities from '../shared/demoCapabilities.json' with { type: 'json' };
import { recipientHash } from './mailDelivery.mjs';
import { PLANS } from './plans.mjs';

export function demoToolCatalog(tier) {
  const plan = PLANS[demoCapabilities.tiers[tier]];
  if (!plan) fail('Unknown demo tier.');
  const all = catalogSummary().engines;
  const included = (engine) => plan.seats.includes(engine.homeEngine);
  const engines = all.filter(included);
  return {
    engines,
    count: engines.length,
    locked: all.filter((engine) => !included(engine)),
    plan: plan.id,
    capabilities: demoCapabilities.features,
    coverage: catalogCoverage(),
  };
}

const DAY = 86400000;
const hash = (token) => createHash('sha256').update(token).digest('hex');
const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
const profileSchema = z.enum([
  'Individual',
  'Professional',
  'Freelancer',
  'Creator',
  'Founder',
  'Team',
  'SME',
  'Enterprise',
  'Institution',
]);
const tierSchema = z.enum(['individual', 'team', 'enterprise']);
const emailSchema = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((v) => v.toLowerCase());
const fail = (message, status = 400) => {
  throw Object.assign(new Error(message), { status });
};

/** Normalize proxy/socket representations before recording a non-reversible IP claim. */
export function demoIpHash(address, key) {
  if (!isIP(address || ''))
    fail('Unable to verify your network address. Please try again later.', 503);
  let canonical = address;
  if (isIP(address) === 6) {
    canonical = new URL(`http://[${address}]/`).hostname.toLowerCase();
    const mapped = canonical.match(/^\[::ffff:([a-f0-9]{1,4}):([a-f0-9]{1,4})\]$/);
    if (mapped) {
      const high = parseInt(mapped[1], 16),
        low = parseInt(mapped[2], 16);
      canonical = `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
    }
  }
  return createHmac('sha256', key).update(`demo-ip:${canonical}`).digest('hex');
}

export function mountDemoAccess(app, store, { provider, key, origin, production, errorLogger }) {
  const { db, transaction } = store;
  const publicOrigin = mailFrontendOrigin({
    origin:
      process.env.DEMO_PUBLIC_ORIGIN ||
      process.env.FRONTEND_ORIGINS?.split(',')[0]?.trim() ||
      origin,
    production,
  });
  if (
    production &&
    (publicOrigin.protocol !== 'https:' || publicOrigin.username || publicOrigin.password)
  )
    throw new Error('DEMO_PUBLIC_ORIGIN must be an HTTPS origin in production.');
  const outbox = createMailOutbox(store, provider, key, errorLogger, 'demo_mail_outbox');
  const limiter = (namespace, max, windowMs, keyFn) =>
    createRateLimiter(store, {
      namespace,
      max,
      windowMs,
      ...(keyFn ? { key: keyFn } : {}),
      message: 'Too many demo requests. Please try again later.',
    });
  const link = (token, action = 'return') => `${publicOrigin.origin}/demo#${action}=${token}`;
  async function issue(lead, purpose, payload = {}) {
    const token = randomBytes(32).toString('hex');
    await db
      .prepare('INSERT INTO demo_access_tokens VALUES (?, ?, ?, ?, ?)')
      .run(hash(token), lead, purpose, JSON.stringify(payload), Date.now() + 30 * DAY);
    return token;
  }
  async function identify(token) {
    const lead = await db
      .prepare(
        `SELECT r.* FROM demo_sessions s JOIN demo_registrations r ON r.id = s.registration_id
       WHERE s.token_hash = ? AND s.expires_at > ? AND r.verified_at IS NOT NULL`,
      )
      .get(hash(token), Date.now());
    if (!lead) fail('Your demo session expired. Request a new email link to continue.', 401);
    return lead;
  }
  app.use('/api/demo', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });
  app.post(
    '/api/demo/register',
    limiter('demo-registration', 5, 60 * 60_000),
    limiter('demo-email', 3, DAY, (req) =>
      hash(
        String(req.body?.email || '')
          .trim()
          .toLowerCase()
          .slice(0, 254),
      ),
    ),
    async (req, res) => {
      if (!outbox.configured)
        fail('Demo email delivery is temporarily unavailable. Please try again later.', 503);
      const input = z
        .object({
          name: z.string().trim().min(1).max(100),
          email: emailSchema,
          profile: profileSchema.default('Founder'),
          tier: tierSchema.default('individual'),
          followup: z.boolean().default(false),
        })
        .strict()
        .parse(req.body);
      await transaction(async () => {
        const ipHash = demoIpHash(req.ip, key);
        const emailHash = createHmac('sha256', key)
          .update(`demo-email:${input.email}`)
          .digest('hex');
        const existing = await db
          .prepare('SELECT id FROM demo_registrations WHERE email = ?')
          .get(input.email);
        const candidateId = existing?.id || randomUUID();
        const inserted = await db
          .prepare(
            'INSERT INTO demo_ip_claims VALUES (?, ?, ?, ?) ON CONFLICT (ip_hash) DO NOTHING RETURNING ip_hash',
          )
          .get(ipHash, emailHash, candidateId, Date.now());
        const claim = await db
          .prepare('SELECT * FROM demo_ip_claims WHERE ip_hash = ? FOR UPDATE')
          .get(ipHash);
        if (claim.email_hash !== emailHash || (!inserted && existing?.id !== claim.registration_id))
          fail(
            'A demo has already been registered from this IP address. Use your existing personal demo link or create an account.',
            409,
          );
        // An unverified request must never change an existing visitor's name, consent, or saved demo.
        const lead = await db
          .prepare(
            `INSERT INTO demo_registrations (id, email, name, created_at, profile, tier)
           VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING *`,
          )
          .get(candidateId, input.email, input.name, Date.now(), input.profile, input.tier);
        await db
          .prepare('UPDATE demo_ip_claims SET registration_id = ? WHERE ip_hash = ?')
          .run(lead.id, ipHash);
        const token = await issue(lead.id, 'return', input);
        await outbox.enqueue(
          randomUUID(),
          lead.id,
          {
            to: input.email,
            ...demoWelcomeEmail({
              name: input.name,
              demoUrl: link(token),
              signupUrl: `${link(token)}&next=signup`,
            }),
          },
          Date.now() + DAY,
        );
      });
      res.status(202).json({ ok: true });
    },
  );
  app.post('/api/demo/redeem', limiter('demo-redeem', 30, 60 * 60_000), async (req, res) => {
    const { token } = z.object({ token: tokenSchema }).strict().parse(req.body);
    const sessionToken = randomBytes(32).toString('hex');
    const lead = await transaction(async () => {
      const access = await db
        .prepare(
          `SELECT * FROM demo_access_tokens WHERE token_hash = ? AND purpose = 'return' AND expires_at > ? FOR UPDATE`,
        )
        .get(hash(token), Date.now());
      if (!access) fail('This demo link is invalid or expired. Request a new welcome email.');
      const current = await db
        .prepare('SELECT * FROM demo_registrations WHERE id = ? FOR UPDATE')
        .get(access.registration_id);
      const requested = JSON.parse(access.payload);
      if (!current.verified_at) {
        await db
          .prepare(
            `UPDATE demo_registrations SET name = ?, profile = ?, tier = ?, followup_opt_in = ?, verified_at = ? WHERE id = ?`,
          )
          .run(
            requested.name,
            requested.profile,
            requested.tier,
            requested.followup ? 1 : 0,
            Date.now(),
            current.id,
          );
      }
      const updated = await db
        .prepare('UPDATE demo_registrations SET last_seen_at = ? WHERE id = ? RETURNING *')
        .get(Date.now(), current.id);
      await db
        .prepare('INSERT INTO demo_sessions VALUES (?, ?, ?)')
        .run(hash(sessionToken), current.id, Math.min(access.expires_at, Date.now() + 30 * DAY));
      if (updated.followup_opt_in && !updated.followup_scheduled_at && !updated.converted_at) {
        const returnToken = await issue(current.id, 'return', requested);
        const unsubscribeToken = await issue(current.id, 'unsubscribe');
        await outbox.enqueue(
          `demo-followup:${current.id}`,
          current.id,
          {
            to: current.email,
            ...demoFollowupEmail({
              name: updated.name,
              demoUrl: link(returnToken),
              signupUrl: `${link(returnToken)}&next=signup`,
              unsubscribeUrl: link(unsubscribeToken, 'unsubscribe'),
            }),
          },
          Date.now() + 7 * DAY,
          Date.now() + 2 * DAY,
        );
        await db
          .prepare('UPDATE demo_registrations SET followup_scheduled_at = ? WHERE id = ?')
          .run(Date.now(), current.id);
      }
      return updated;
    });
    res.json({
      token: sessionToken,
      id: lead.id,
      name: lead.name,
      email: lead.email,
      profile: lead.profile,
      tier: lead.tier,
    });
  });
  app.post(
    '/api/demo/unsubscribe',
    limiter('demo-unsubscribe', 30, 60 * 60_000),
    async (req, res) => {
      const { token } = z.object({ token: tokenSchema }).strict().parse(req.body);
      await transaction(async () => {
        const access = await db
          .prepare(
            "SELECT * FROM demo_access_tokens WHERE token_hash = ? AND purpose = 'unsubscribe' AND expires_at > ?",
          )
          .get(hash(token), Date.now());
        if (!access)
          fail('This unsubscribe link has expired. You can also stop reminders from your demo.');
        await db
          .prepare('UPDATE demo_registrations SET followup_opt_in = 0 WHERE id = ?')
          .run(access.registration_id);
        await db
          .prepare(
            "UPDATE demo_mail_outbox SET status = 'cancelled', payload = '', lease_until = NULL WHERE id = ? AND status IN ('pending', 'sending')",
          )
          .run(`demo-followup:${access.registration_id}`);
      });
      res.json({ ok: true });
    },
  );
  app.post('/api/demo/session', async (req, res) => {
    const { token } = z.object({ token: tokenSchema }).strict().parse(req.body);
    const lead = await identify(token);
    res.json({
      id: lead.id,
      name: lead.name,
      email: lead.email,
      profile: lead.profile,
      tier: lead.tier,
      followup: Boolean(lead.followup_opt_in),
    });
  });
  const toolRequest = z.object({ token: tokenSchema, tier: tierSchema });
  app.post('/api/demo/engines/catalog', async (req, res) => {
    const input = toolRequest.strict().parse(req.body);
    await identify(input.token);
    res.json(demoToolCatalog(input.tier));
  });
  app.post('/api/demo/engines/detail', async (req, res) => {
    const input = toolRequest
      .extend({ code: z.string().max(16) })
      .strict()
      .parse(req.body);
    await identify(input.token);
    const engine = demoToolCatalog(input.tier).engines.find(
      (engine) => engine.code === input.code.toUpperCase(),
    );
    if (!engine) fail('This tool is not included in the selected demo tier.', 403);
    res.json(demoEngineDetail(engine.code));
  });
  app.post('/api/demo/engines/run', limiter('demo-tool-runs', 30, 60_000), async (req, res) => {
    const input = toolRequest
      .extend({ code: z.string().max(16), input: z.record(z.unknown()) })
      .strict()
      .parse(req.body);
    await identify(input.token);
    const engine = demoToolCatalog(input.tier).engines.find(
      (engine) => engine.code === input.code.toUpperCase(),
    );
    if (!engine) fail('This tool is not included in the selected demo tier.', 403);
    const resolved = resolve(engine.code);
    let result;
    try {
      result = runEngine(resolved.ref, input.input);
    } catch (error) {
      // Operational metadata only: never log calculator input or access tokens.
      errorLogger?.('demo_engine_failed', {
        requestId: req.requestId,
        code: engine.code,
        tier: input.tier,
        status: error.status || 500,
      });
      throw error;
    }
    res.json({ result, demo: true, pointsCharged: 0 });
  });
  app.post('/api/demo/preferences', async (req, res) => {
    const { token } = z
      .object({ token: tokenSchema, followup: z.literal(false) })
      .strict()
      .parse(req.body);
    const lead = await identify(token);
    await transaction(async () => {
      await db
        .prepare('UPDATE demo_registrations SET followup_opt_in = 0 WHERE id = ?')
        .run(lead.id);
      await db
        .prepare(
          "UPDATE demo_mail_outbox SET status = 'cancelled', payload = '', lease_until = NULL WHERE id = ? AND status IN ('pending', 'sending')",
        )
        .run(`demo-followup:${lead.id}`);
    });
    res.json({ ok: true });
  });
  app.post('/api/demo/progress/read', async (req, res) => {
    const input = z
      .object({ token: tokenSchema, profile: profileSchema, tier: tierSchema })
      .strict()
      .parse(req.body);
    const lead = await identify(input.token);
    const row = await db
      .prepare('SELECT * FROM demo_progress WHERE registration_id = ? AND profile = ? AND tier = ?')
      .get(lead.id, input.profile, input.tier);
    res.json(
      row
        ? { data: JSON.parse(decryptSecret(key, row.payload)), revision: row.revision }
        : { data: null, revision: 0 },
    );
  });
  app.post('/api/demo/progress/save', limiter('demo-progress', 120, 60_000), async (req, res) => {
    const input = z
      .object({
        token: tokenSchema,
        profile: profileSchema,
        tier: tierSchema,
        revision: z.number().int().min(0),
        data: z.object({ version: z.number().int() }).passthrough(),
      })
      .strict()
      .parse(req.body);
    const lead = await identify(input.token);
    const savedRevision = await transaction(async () => {
      const saved = await db
        .prepare(
          `INSERT INTO demo_progress VALUES (?, ?, ?, ?, 1, ?)
         ON CONFLICT (registration_id, profile, tier) DO UPDATE SET payload = EXCLUDED.payload,
         revision = demo_progress.revision + 1, updated_at = EXCLUDED.updated_at
         WHERE demo_progress.revision = ? RETURNING revision`,
        )
        .get(
          lead.id,
          input.profile,
          input.tier,
          encryptSecret(key, JSON.stringify(input.data)),
          Date.now(),
          input.revision,
        );
      // Revision zero means no previous snapshot. An existing snapshot must never be overwritten blindly.
      if (!saved)
        fail(
          'This demo was changed in another tab or device. Reload to load its latest progress.',
          409,
        );
      await db
        .prepare(
          'UPDATE demo_registrations SET profile = ?, tier = ?, last_seen_at = ? WHERE id = ?',
        )
        .run(input.profile, input.tier, Date.now(), lead.id);
      return saved.revision;
    });
    res.json({ revision: savedRevision });
  });
  app.post('/api/demo/events', limiter('demo-events', 120, 60_000), async (req, res) => {
    const input = z
      .object({
        token: tokenSchema,
        event: z.enum([
          'workspace_opened',
          'page_viewed',
          'tool_used',
          'signup_clicked',
          'operation_failed',
          'save_failed',
          'save_conflict',
          'client_failed',
        ]),
        path: z
          .string()
          .max(160)
          .regex(/^\/(?:os|demo|signup)(?:\/[\w-]+)*$/),
        profile: profileSchema,
        tier: tierSchema,
      })
      .strict()
      .parse(req.body);
    const lead = await identify(input.token);
    await db
      .prepare('INSERT INTO demo_events VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(randomUUID(), lead.id, input.event, input.path, input.profile, input.tier, Date.now());
    await db
      .prepare('UPDATE demo_registrations SET last_seen_at = ?, profile = ?, tier = ? WHERE id = ?')
      .run(Date.now(), input.profile, input.tier, lead.id);
    res.json({ ok: true });
  });
  return {
    mail: outbox,
    async resendWelcome(id) {
      if (!outbox.configured) fail('Demo mail provider is not configured.', 503);
      return transaction(async () => {
        const lead = await db
          .prepare('SELECT * FROM demo_registrations WHERE id = ? FOR UPDATE')
          .get(id);
        if (!lead) fail('Demo registration not found.', 404);
        const suppression = await db
          .prepare('SELECT scope FROM mail_suppressions WHERE recipient_hash = ?')
          .get(recipientHash(lead.email, key));
        if (suppression?.scope === 'all')
          fail(
            'This address is suppressed after a bounce or complaint. Review it with the recipient before sending again.',
            409,
          );
        await db
          .prepare(
            "UPDATE demo_mail_outbox SET status = 'superseded', payload = '', lease_until = NULL WHERE user_id = ? AND id NOT LIKE 'demo-followup:%' AND status IN ('pending','sending')",
          )
          .run(id);
        const token = await issue(id, 'return', {
          name: lead.name,
          email: lead.email,
          profile: lead.profile,
          tier: lead.tier,
          followup: Boolean(lead.followup_opt_in),
        });
        const messageId = randomUUID();
        await outbox.enqueue(
          messageId,
          id,
          {
            to: lead.email,
            ...demoWelcomeEmail({
              name: lead.name,
              demoUrl: link(token),
              signupUrl: `${link(token)}&next=signup`,
            }),
          },
          Date.now() + DAY,
        );
        return { queued: true, messageId };
      });
    },
  };
}

// Must be mounted AFTER the real-account session middleware; demo credentials cannot read leads.
export function mountDemoAdmin(app, store, ecosystemAdminEmails, { resendWelcome } = {}) {
  const admin = (req, res, next) => {
    if (!ecosystemAdminEmails.includes(req.user?.email))
      return res.status(403).json({ error: 'Ecosystem administrator access required.' });
    res.setHeader('Cache-Control', 'no-store');
    next();
  };
  app.get('/api/admin/demo-leads', admin, async (req, res) => {
    const page = z.coerce.number().int().min(0).max(100000).default(0).parse(req.query.page);
    const leads = await store.db
      .prepare(
        `SELECT r.*, (SELECT COUNT(*) FROM demo_events e WHERE e.registration_id = r.id) AS events,
      (SELECT COUNT(*) FROM demo_events e WHERE e.registration_id = r.id AND e.event IN ('operation_failed', 'save_failed', 'save_conflict', 'client_failed')) AS failures,
      (SELECT COUNT(*) FROM demo_mail_outbox m WHERE m.user_id = r.id AND m.status = 'failed') AS failed_emails,
      (SELECT status FROM demo_mail_outbox m WHERE m.user_id = r.id ORDER BY created_at DESC LIMIT 1) AS mail_status
      , (SELECT mm.delivery_status FROM mail_messages mm JOIN demo_mail_outbox mo ON mo.id = mm.queue_id
         WHERE mm.outbox_table = 'demo_mail_outbox' AND mo.user_id = r.id ORDER BY mo.created_at DESC LIMIT 1) AS delivery_status
      FROM demo_registrations r ORDER BY r.created_at DESC, r.id LIMIT 50 OFFSET ?`,
      )
      .all(page * 50);
    res.json({ leads, page });
  });
  app.get('/api/admin/demo-leads/:id/events', admin, async (req, res) => {
    res.json(
      await store.db
        .prepare(
          'SELECT event, path, profile, tier, created_at FROM demo_events WHERE registration_id = ? ORDER BY created_at DESC LIMIT 100',
        )
        .all(req.params.id),
    );
  });
  app.post(
    '/api/admin/demo-leads/:id/resend',
    admin,
    createRateLimiter(store, {
      namespace: 'admin-demo-mail',
      windowMs: 3600000,
      max: 5,
      key: (req) => req.user.id,
      message: 'Too many fresh demo links requested. Try again later.',
    }),
    async (req, res) => {
      if (!resendWelcome)
        return res.status(503).json({ error: 'Fresh demo link recovery is unavailable.' });
      const result = await resendWelcome(req.params.id);
      await store.db
        .prepare('INSERT INTO administration_audit VALUES (?, ?, ?, ?, ?)')
        .run(
          randomUUID(),
          req.user.id,
          'Fresh demo link requested',
          req.params.id,
          new Date().toISOString(),
        );
      res.status(202).json(result);
    },
  );
  app.delete('/api/admin/demo-leads/:id', admin, async (req, res) => {
    await store.transaction(async () => {
      await store.db
        .prepare(
          "DELETE FROM mail_messages WHERE outbox_table = 'demo_mail_outbox' AND queue_id IN (SELECT id FROM demo_mail_outbox WHERE user_id = ?)",
        )
        .run(req.params.id);
      await store.db.prepare('DELETE FROM demo_registrations WHERE id = ?').run(req.params.id);
      await store.db
        .prepare('INSERT INTO administration_audit VALUES (?, ?, ?, ?, ?)')
        .run(
          randomUUID(),
          req.user.id,
          'Demo registration deleted',
          req.params.id,
          new Date().toISOString(),
        );
    });
    res.json({ ok: true });
  });
}
