import { randomUUID, randomBytes, randomInt, createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { hashPassword, verifyPassword, seedWorkspace } from '../../server/store.mjs';
import { createMailOutbox, defaultMailer } from './mail.mjs';
import { createRateLimiter } from './ratelimit.mjs';
import { welcomeRewardPoints } from './rewards.mjs';

const emailSchema = z.string().trim().email().max(254).transform(s => s.toLowerCase());
const passwordSchema = z.string().min(12).max(128);
const digest = s => createHash('sha256').update(s).digest('hex');
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const lifetime = 10 * 60_000;
const normalizeIdentity = email => {
  let [local, domain] = email.split('@');
  if (domain === 'googlemail.com') domain = 'gmail.com';
  if (domain === 'gmail.com') local = local.split('+')[0].replaceAll('.', '');
  return `${local}@${domain}`;
};

export async function mountAccounts(app, store, { production, session, contexts, enterpriseMemberLimit, mailProvider = defaultMailer(), securityKey = process.env.ACCOUNT_SECURITY_KEY, publicOrigin = process.env.PUBLIC_ORIGIN || 'http://localhost:3000', welcomeIpVelocityLimit = 3 }) {
  const { db, transaction, log } = store;
  if (securityKey && !/^[a-f0-9]{64}$/i.test(securityKey)) throw new Error('ACCOUNT_SECURITY_KEY must be 32 random bytes encoded as 64 hex characters.');
  if (production && !securityKey) throw new Error('ACCOUNT_SECURITY_KEY is required in production.');
  if (!securityKey) {
    await db.prepare('INSERT INTO account_security_keys VALUES (?, ?) ON CONFLICT (name) DO NOTHING').run('development', randomBytes(32).toString('hex'));
    securityKey = (await db.prepare('SELECT value FROM account_security_keys WHERE name = ?').get('development')).value;
  }
  const key = Buffer.from(securityKey, 'hex');
  const sign = s => createHmac('sha256', key).update(s).digest('hex');
  const mail = createMailOutbox(store, mailProvider, key);
  const origin = new URL(publicOrigin);
  if (production && (origin.protocol !== 'https:' || origin.username || origin.password)) throw new Error('PUBLIC_ORIGIN must be an HTTPS origin in production.');
  // Preserve established accounts and balances; never give them a second signup reward.
  await transaction(async () => {
    for (const user of await db.prepare('SELECT id, email FROM users WHERE demo = 0 AND id NOT IN (SELECT user_id FROM signup_signals)').all()) {
      await db.prepare("INSERT INTO welcome_claims VALUES (?, ?, NULL, NULL, 'legacy', 'Existing balance preserved', ?) ON CONFLICT (user_id) DO NOTHING").run(user.id, sign(user.email ? `email:${normalizeIdentity(user.email)}` : `legacy:${user.id}`), Date.now());
    }
  });
  const accountLimiter = createRateLimiter(store, { namespace: 'auth-account', windowMs: 15 * 60_000, max: 20,
    key: req => sign(`login:${String(req.body?.email || '').trim().toLowerCase().slice(0, 254)}`), message: 'Too many attempts for this account. Try again later.' });
  app.use(['/api/auth/login', '/api/auth/resend-verification', '/api/auth/request-recovery'], accountLimiter);
  function requireDelivery() {
    if (production && !mail.configured) fail('Account email delivery is temporarily unavailable. Please try again later.', 503);
  }
  function device(req, res) {
    const raw = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('lamid_device='))?.slice(13);
    let id;
    if (raw && /^[a-f0-9]{64}\.[a-f0-9]{64}$/.test(raw)) {
      const [candidate, signature] = raw.split('.');
      if (timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(sign(`device:${candidate}`), 'hex'))) id = candidate;
    }
    if (!id) id = randomBytes(32).toString('hex');
    req.deviceCookie = `${id}.${sign(`device:${id}`)}`;
    return sign(`device-id:${id}`);
  }
  async function issue(user, purpose, { cooldown = true } = {}) {
    const recent = await db.prepare('SELECT created_at FROM otp_challenges WHERE user_id = ? AND purpose = ? ORDER BY created_at DESC LIMIT 1').get(user.id, purpose);
    if (cooldown && recent && Date.now() - recent.created_at < 60_000) fail('Please wait one minute before requesting another email.', 429);
    const id = randomUUID(), code = String(randomInt(100000, 1000000)), token = randomBytes(32).toString('hex');
    const expires = Date.now() + lifetime;
    await db.prepare('UPDATE otp_challenges SET used_at = ? WHERE user_id = ? AND purpose = ? AND used_at IS NULL').run(Date.now(), user.id, purpose);
    await db.prepare('UPDATE account_tokens SET used_at = ? WHERE user_id = ? AND kind = ? AND used_at IS NULL').run(Date.now(), user.id, purpose);
    // An older queued email must not arrive after a new challenge was issued.
    await db.prepare("UPDATE mail_outbox SET status = 'superseded', payload = '' WHERE user_id = ? AND status = 'pending'").run(user.id);
    await db.prepare('INSERT INTO otp_challenges VALUES (?, ?, ?, ?, 0, ?, NULL, ?)').run(id, user.id, purpose, sign(`${id}:${code}`), expires, Date.now());
    await db.prepare('INSERT INTO account_tokens VALUES (?, ?, ?, ?, ?, NULL, ?)').run(id, user.id, purpose, digest(token), expires, Date.now());
    const path = purpose === 'verification' ? '/verify' : '/reset-password';
    const link = `${origin.origin}${path}?token=${token}`;
    await mail.enqueue(id, user.id, { to: user.email, subject: purpose === 'verification' ? 'Verify your LAMID ONE account' : 'Reset your LAMID ONE password',
      text: purpose === 'verification' ? `Your verification code is ${code}. It expires in 10 minutes.\n\nYou can also verify here: ${link}\n\nIf you did not request this, ignore this email.` : `Reset your password using this single-use link, valid for 10 minutes:\n${link}\n\nIf you did not request this, ignore this email.` }, expires);
    return { challengeId: id, ...(production ? {} : { ...(purpose === 'verification' ? { verificationToken: token, developmentCode: code } : { recoveryToken: token }) }) };
  }
  async function award(userId) {
    const previous = await db.prepare('SELECT * FROM welcome_claims WHERE user_id = ?').get(userId);
    if (previous) return { status: previous.status, points: 0 };
    const signals = await db.prepare('SELECT * FROM signup_signals WHERE user_id = ?').get(userId);
    if (!signals) return { status: 'legacy', points: 0 };
    // Eligibility is shared across accounts; locking an OTP alone cannot protect it.
    // Fixed lock order prevents IP/device cross-account deadlocks.
    for (const key of [`welcome:ip:${signals.ip_hash}`, `welcome:device:${signals.device_hash}`, `welcome:email:${signals.email_hash}`].sort())
      await db.prepare('SELECT pg_advisory_xact_lock(hashtext(?))').get(key);
    const duplicate = await db.prepare("SELECT 1 FROM welcome_claims WHERE email_hash = ? OR (device_hash = ? AND status = 'granted')").get(signals.email_hash, signals.device_hash);
    // Email identity collisions cannot insert a second unique claim. Keep a non-PII decision in the audit.
    if (duplicate && (await db.prepare('SELECT 1 FROM welcome_claims WHERE email_hash = ?').get(signals.email_hash))) return { status: 'ineligible', points: 0 };
    const count = (await db.prepare("SELECT COUNT(*) AS n FROM welcome_claims WHERE ip_hash = ? AND status = 'granted' AND created_at > ?").get(signals.ip_hash, Date.now() - 86400000)).n;
    const status = duplicate ? 'ineligible' : count >= welcomeIpVelocityLimit ? 'review' : 'granted';
    // ON CONFLICT DO NOTHING, not a plain INSERT: a concurrent verification of the same account via
    // the other valid claim path (a token link and an OTP code both work for one challenge) can
    // race past the `previous` check above before either commits. welcome_claims.user_id is a
    // PRIMARY KEY, so without this the loser's plain INSERT would throw a raw unique_violation —
    // and inside a transaction, Postgres aborts the whole transaction on any statement error, so a
    // try/catch here couldn't recover it anyway. DO NOTHING keeps the loser's statement error-free;
    // it then reads back the winner's already-committed outcome instead of double-crediting.
    const inserted = await db
      .prepare('INSERT INTO welcome_claims VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (user_id) DO NOTHING RETURNING *')
      .get(userId, signals.email_hash, signals.device_hash, signals.ip_hash, status, duplicate ? 'Device already claimed' : count >= welcomeIpVelocityLimit ? 'Shared network velocity review' : 'Verified first claim', Date.now());
    if (!inserted) return { status: (await db.prepare('SELECT status FROM welcome_claims WHERE user_id = ?').get(userId)).status, points: 0 };
    if (status === 'granted') await credit(userId);
    return { status, points: status === 'granted' ? welcomeRewardPoints : 0 };
  }
  async function credit(userId) {
    const workspace = await db.prepare('SELECT id FROM workspaces WHERE user_id = ?').get(userId);
    await db.prepare('UPDATE users SET points_balance = points_balance + ? WHERE id = ?').run(welcomeRewardPoints, userId);
    await db.prepare('INSERT INTO points_ledger VALUES (?, ?, ?, ?, ?, ?, ?)').run(randomUUID(), userId, workspace?.id || null, welcomeRewardPoints, 'welcome_bonus', userId, Date.now());
  }
  async function finish(token, purpose) {
    // The claim itself is the atomic UPDATE (guarded by used_at IS NULL, RETURNING the row only
    // when this call is the one that flipped it) — not a preceding SELECT. Two concurrent requests
    // for the same still-valid token would otherwise both pass a plain SELECT check before either
    // commits its UPDATE, both consuming the token and both triggering whatever it grants (e.g. the
    // welcome bonus) twice.
    const row = await db
      .prepare('UPDATE account_tokens SET used_at = ? WHERE token_hash = ? AND kind = ? AND used_at IS NULL AND expires_at > ? RETURNING *')
      .get(Date.now(), digest(token), purpose, Date.now());
    if (!row || !(await db.prepare('SELECT 1 FROM users WHERE id = ? AND disabled_at IS NULL').get(row.user_id))) return null;
    await db.prepare('UPDATE otp_challenges SET used_at = ? WHERE user_id = ? AND purpose = ?').run(Date.now(), row.user_id, purpose);
    return row;
  }
  app.post('/api/auth/signup', async (req, res) => {
    requireDelivery();
    const input = z.object({ name: z.string().trim().min(1).max(100), email: emailSchema, password: passwordSchema, context: contexts }).strict().parse(req.body);
    const password = await hashPassword(input.password), user = randomUUID(), workspace = randomUUID();
    const deviceHash = device(req, res);
    let challenge;
    try {
      challenge = await transaction(async () => {
        await db.prepare('INSERT INTO users (id,email,password,name,demo,created_at,verified_at,disabled_at,points_balance) VALUES (?,?,?,?,0,?,NULL,NULL,0)').run(user, input.email, password, input.name, new Date().toISOString());
        await db.prepare('INSERT INTO workspaces (id,user_id,name,context,tier,member_limit) VALUES (?,?,?,?,?,?)').run(workspace, user, `${input.name.split(' ')[0]}'s workspace`, input.context, input.context === 'Enterprise' ? 'enterprise' : 'individual', input.context === 'Enterprise' ? enterpriseMemberLimit : 1);
        await db.prepare('INSERT INTO workspace_members VALUES (?,?,?,?,?)').run(workspace, user, 'owner', 'active', Date.now());
        await db.prepare('INSERT INTO signup_signals VALUES (?,?,?,?,?)').run(user, sign(`email:${normalizeIdentity(input.email)}`), deviceHash, sign(`ip:${req.ip}`), Date.now());
        await log(workspace, input.name, 'Workspace created', workspace, `Starting context: ${input.context}`);
        return issue({ id: user, email: input.email }, 'verification', { cooldown: false });
      });
    } catch (error) {
      // Postgres's unique_violation SQLSTATE (23505) — covers the users.email UNIQUE constraint.
      if (error.code === '23505') return res.status(409).json({ error: 'Unable to create this account. Try signing in instead.' });
      throw error;
    }
    await session(res, user, workspace);
    res.cookie('lamid_device', req.deviceCookie, { httpOnly: true, secure: production, sameSite: 'lax', path: '/', maxAge: 365 * 86400000 });
    res.status(201).json({ ok: true, verificationRequired: true, ...challenge });
  });
  app.post('/api/auth/resend-verification', async (req, res) => {
    requireDelivery();
    const { email } = z.object({ email: emailSchema }).strict().parse(req.body);
    const user = await db.prepare('SELECT * FROM users WHERE email = ? AND demo = 0 AND disabled_at IS NULL').get(email);
    const challenge = user && !user.verified_at ? await transaction(() => issue(user, 'verification')) : { challengeId: randomUUID() };
    res.json({ ok: true, ...challenge });
  });
  app.post('/api/auth/verify', async (req, res) => {
    const input = z.union([z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).strict(), z.object({ challengeId: z.string().uuid(), code: z.string().regex(/^\d{6}$/) }).strict()]).parse(req.body);
    const result = await transaction(async () => {
      let userId;
      if ('token' in input) userId = (await finish(input.token, 'verification'))?.user_id;
      else {
        // FOR UPDATE locks this row for the rest of the enclosing transaction: a second concurrent
        // request for the same challenge blocks here until the first commits, then re-reads the
        // row fresh — if the first request already consumed it, used_at IS NULL no longer holds
        // and this correctly finds no row, instead of both requests racing past a plain SELECT and
        // both consuming the same code.
        const row = await db.prepare("SELECT * FROM otp_challenges WHERE id = ? AND purpose = 'verification' AND used_at IS NULL AND expires_at > ? AND attempts < 5 FOR UPDATE").get(input.challengeId, Date.now());
        if (row) {
          await db.prepare('UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = ?').run(row.id);
          if (timingSafeEqual(Buffer.from(row.code_hash, 'hex'), Buffer.from(sign(`${row.id}:${input.code}`), 'hex')) && (await db.prepare('SELECT 1 FROM users WHERE id = ? AND disabled_at IS NULL').get(row.user_id))) {
            userId = row.user_id;
            await db.prepare("UPDATE otp_challenges SET used_at = ? WHERE user_id = ? AND purpose = 'verification'").run(Date.now(), userId);
            await db.prepare("UPDATE account_tokens SET used_at = ? WHERE user_id = ? AND kind = 'verification'").run(Date.now(), userId);
          }
        }
      }
      if (!userId) return null; // Commit failed-attempt counts rather than rolling them back.
      await db.prepare('UPDATE users SET verified_at = COALESCE(verified_at, ?) WHERE id = ?').run(Date.now(), userId);
      return award(userId);
    });
    if (!result) return res.status(400).json({ error: 'This verification code or link is invalid, expired, or has reached its attempt limit.' });
    res.json({ ok: true, welcomeReward: result });
  });
  app.post('/api/auth/request-recovery', async (req, res) => {
    requireDelivery();
    const { email } = z.object({ email: emailSchema }).strict().parse(req.body);
    const user = await db.prepare('SELECT * FROM users WHERE email = ? AND demo = 0 AND disabled_at IS NULL').get(email);
    const challenge = user ? await transaction(() => issue(user, 'recovery')) : {};
    res.json({ ok: true, ...(production ? {} : challenge) });
  });
  app.post('/api/auth/reset-password', async (req, res) => {
    const input = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), password: passwordSchema }).strict().parse(req.body);
    const password = await hashPassword(input.password);
    const success = await transaction(async () => {
      const row = await finish(input.token, 'recovery');
      if (!row) return false;
      await db.prepare('UPDATE users SET password = ?, verified_at = COALESCE(verified_at, ?) WHERE id = ?').run(password, Date.now(), row.user_id);
      await db.prepare('DELETE FROM sessions WHERE user_id = ?').run(row.user_id);
      await award(row.user_id);
      return true;
    });
    if (!success) return res.status(400).json({ error: 'This recovery link is invalid or expired.' });
    res.json({ ok: true });
  });
  app.post('/api/auth/login', async (req, res) => {
    const input = z.object({ email: emailSchema, password: z.string().min(1).max(128) }).strict().parse(req.body);
    const user = await db.prepare('SELECT * FROM users WHERE email = ? AND demo = 0').get(input.email);
    const valid = await verifyPassword(input.password, user?.password || `${'00'.repeat(16)}:${'00'.repeat(64)}`);
    if (!user || !valid || user.disabled_at) return res.status(401).json({ error: 'Email or password is incorrect.' });
    const workspace = await db.prepare('SELECT id FROM workspaces WHERE user_id = ?').get(user.id);
    await session(res, user.id, workspace?.id || null);
    res.json({ ok: true, verificationRequired: !user.verified_at });
  });
  app.post('/api/auth/demo', async (_req, res) => {
    if (production) return res.status(403).json({ error: 'Sample accounts are unavailable on this deployment.' });
    const user = randomUUID(), workspace = randomUUID();
    await transaction(async () => {
      await db.prepare('INSERT INTO users (id,email,password,name,demo,created_at,verified_at,disabled_at,points_balance) VALUES (?,NULL,NULL,?,1,?,?,NULL,100)').run(user, 'Alex Morgan', new Date().toISOString(), Date.now());
      await db.prepare('INSERT INTO workspaces (id,user_id,name,context,tier,member_limit) VALUES (?,?,?,?,?,?)').run(workspace, user, 'The next chapter', 'Founder', 'individual', 1);
      await db.prepare('INSERT INTO workspace_members VALUES (?,?,?,?,?)').run(workspace, user, 'owner', 'active', Date.now());
      await seedWorkspace(store, workspace, 'Alex Morgan');
    });
    await session(res, user, workspace);
    res.status(201).json({ ok: true });
  });
  return { mail, credit };
}
