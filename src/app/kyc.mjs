import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

const EVIDENCE_KINDS = ['government_id', 'proof_of_address', 'business_registration', 'other'];

const createSchema = z
  .object({
    provider: z.string().trim().max(120).default('manual'),
    // Real-life shape: the applicant/session id a KYC vendor's SDK hands back when a verification
    // session is started client-side. Recorded now so a later webhook can be correlated to
    // exactly this case (see mountKycWebhook) — never left for the webhook to invent or guess.
    providerReference: z.string().trim().min(1).max(200).optional(),
  })
  .strict();

// SEC-03: a real KYC vendor integration (Sumsub, per the vendor evaluation covered in this
// session) is not something a coding session can complete — it needs the account/API keys that
// only the business holder can create. What this DOES build is the governed contract that
// integration plugs into: signed, deduplicated, reference-correlated webhook processing that
// mirrors the same pattern already proven for the Paystack payment webhook. The exact header
// name and signing scheme below (HMAC-SHA256 over the raw body, hex-encoded) is a defensible,
// common default — confirm it against the real vendor's webhook docs before flipping this on in
// production, the same way paystackProvider's scheme was confirmed against Paystack's own docs.
export function genericKycProvider({
  name = 'sumsub',
  secretKey = process.env.KYC_WEBHOOK_SECRET,
  signatureHeader = 'x-kyc-signature',
} = {}) {
  if (!secretKey) return null;
  return {
    name,
    signatureHeader,
    verifyWebhookSignature(rawBody, signatureValue) {
      if (!signatureValue || !rawBody) return false;
      const expected = createHmac('sha256', secretKey).update(rawBody).digest('hex');
      const expectedBuffer = Buffer.from(expected, 'utf8');
      const providedBuffer = Buffer.from(String(signatureValue), 'utf8');
      if (expectedBuffer.length !== providedBuffer.length) return false;
      return timingSafeEqual(expectedBuffer, providedBuffer);
    },
  };
}
const evidenceSchema = z
  .object({ kind: z.enum(EVIDENCE_KINDS), fileId: z.string().uuid() })
  .strict();
const decisionSchema = z
  .object({ decision: z.enum(['verified', 'rejected']), notes: z.string().trim().max(2000).default('') })
  .strict();

const fail = (message, status) => {
  throw Object.assign(new Error(message), { status });
};

export function mountKyc(app, store, { ecosystemAdminEmails = [] } = {}) {
  const { db, transaction, log } = store;
  const isAdmin = (req) => ecosystemAdminEmails.includes((req.user.email || '').toLowerCase());

  async function withEvidence(row) {
    const evidence = await db
      .prepare('SELECT * FROM identity_evidence WHERE kyc_case_id = ? ORDER BY created_at')
      .all(row.id);
    return { ...row, evidence };
  }
  async function ownCaseFor(id, userId) {
    const row = await db.prepare('SELECT * FROM kyc_cases WHERE id = ? AND user_id = ?').get(id, userId);
    if (!row) fail('KYC case not found.', 404);
    return row;
  }

  app.post('/api/kyc/cases', async (req, res) => {
    const input = createSchema.parse(req.body);
    const openExisting = await db
      .prepare("SELECT id FROM kyc_cases WHERE user_id = ? AND status = 'pending'")
      .get(req.user.id);
    if (openExisting) fail('You already have a pending KYC case. Add evidence to it instead of starting another.', 409);
    const id = randomUUID();
    const now = new Date().toISOString();
    try {
      await transaction(async () => {
        await db
          .prepare(
            'INSERT INTO kyc_cases (id, user_id, status, provider, created_at, updated_at, provider_reference) VALUES (?, ?, ?, ?, ?, ?, ?)',
          )
          .run(id, req.user.id, 'pending', input.provider, now, now, input.providerReference || null);
        await log(req.workspace.id, req.user.name, 'KYC case opened', id, input.provider);
      });
    } catch (error) {
      // kyc_cases_provider_reference (provider, provider_reference) — the vendor's session id is
      // already tied to a case; this should never happen for a genuine new session.
      if (error.code === '23505')
        fail('This verification session is already linked to a KYC case.', 409);
      throw error;
    }
    res.status(201).json(await withEvidence(await ownCaseFor(id, req.user.id)));
  });

  app.get('/api/kyc/cases/mine', async (req, res) => {
    const rows = await db
      .prepare('SELECT * FROM kyc_cases WHERE user_id = ? ORDER BY created_at DESC')
      .all(req.user.id);
    res.json(await Promise.all(rows.map(withEvidence)));
  });

  app.post('/api/kyc/cases/:id/evidence', async (req, res) => {
    const kycCase = await ownCaseFor(req.params.id, req.user.id);
    if (kycCase.status !== 'pending') fail(`This KYC case is already "${kycCase.status}" and cannot take new evidence.`, 409);
    const input = evidenceSchema.parse(req.body);
    const file = await db
      .prepare('SELECT id FROM uploaded_files WHERE id = ? AND workspace_id = ? AND uploaded_by = ?')
      .get(input.fileId, req.workspace.id, req.user.id);
    if (!file) fail('That file was not found, or was not uploaded by you.', 404);
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    await transaction(async () => {
      await db
        .prepare('INSERT INTO identity_evidence VALUES (?, ?, ?, ?, ?)')
        .run(id, kycCase.id, input.kind, input.fileId, createdAt);
      await db.prepare('UPDATE kyc_cases SET updated_at = ? WHERE id = ?').run(createdAt, kycCase.id);
      await log(req.workspace.id, req.user.name, 'KYC evidence attached', kycCase.id, input.kind);
    });
    res.status(201).json(await withEvidence(await ownCaseFor(kycCase.id, req.user.id)));
  });

  // Admin review — mirrors the same ecosystemAdminEmails gate scoping.mjs uses for
  // jurisdiction-rules administration, not a new authority model.
  app.get('/api/admin/kyc/cases', async (req, res) => {
    if (!isAdmin(req)) fail('Only ecosystem admins can review KYC cases.', 403);
    const rows = await db
      .prepare("SELECT * FROM kyc_cases WHERE status = 'pending' ORDER BY created_at")
      .all();
    res.json(await Promise.all(rows.map(withEvidence)));
  });

  app.patch('/api/admin/kyc/cases/:id/decision', async (req, res) => {
    if (!isAdmin(req)) fail('Only ecosystem admins can decide KYC cases.', 403);
    const kycCase = await db.prepare('SELECT * FROM kyc_cases WHERE id = ?').get(req.params.id);
    if (!kycCase) fail('KYC case not found.', 404);
    if (kycCase.status !== 'pending') fail(`This KYC case has already been decided ("${kycCase.status}").`, 409);
    const input = decisionSchema.parse(req.body);
    const now = new Date().toISOString();
    await transaction(async () => {
      await db.prepare('UPDATE kyc_cases SET status = ?, updated_at = ? WHERE id = ?').run(input.decision, now, kycCase.id);
      if (input.decision === 'verified')
        await db.prepare('UPDATE users SET kyc_verified_at = ? WHERE id = ?').run(now, kycCase.user_id);
      await log(req.workspace.id, req.user.name, `KYC case ${input.decision}`, kycCase.id, input.notes);
    });
    res.json(await withEvidence(await db.prepare('SELECT * FROM kyc_cases WHERE id = ?').get(kycCase.id)));
  });
}

const webhookDecisionSchema = z
  .object({
    reference: z.string().trim().min(1).max(200),
    decision: z.enum(['verified', 'rejected']),
    notes: z.string().trim().max(2000).optional().default(''),
  })
  .strict();

// SEC-03: the governed callback contract itself. Structurally mirrors mountPaystackWebhook:
// signature-verified, deduplicated by (provider, provider_event_id), and — the part specific to
// this being an identity decision rather than a payment — a webhook can only ever act on the one
// case its signed payload's `reference` was issued for, looked up by that reference rather than
// any client- or webhook-suppliable case id, and only while that case is still 'pending'. A
// verified provider webhook is treated as an equivalent, auditable substitute for the manual
// admin PATCH /api/admin/kyc/cases/:id/decision path, not a separate trust tier.
export function mountKycWebhook(app, store, deps) {
  const { db, transaction } = store;
  app.post('/api/webhooks/kyc', async (req, res) => {
    const provider = deps.kycProvider?.();
    if (!provider) return res.status(503).json({ error: 'No KYC provider is configured.' });
    const signature = req.headers[provider.signatureHeader];
    if (!provider.verifyWebhookSignature(req.rawBody, signature))
      return res.status(401).json({ error: 'Invalid webhook signature.' });

    let payload;
    try {
      payload = webhookDecisionSchema.parse((req.body || {}).data || req.body);
    } catch {
      return res.status(400).json({ error: 'Malformed webhook payload.' });
    }
    const eventId = String(req.body?.eventId || payload.reference);

    const deduplicated = await transaction(async () => {
      const claimed = await db
        .prepare(
          'INSERT INTO kyc_webhook_events VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (provider, provider_event_id) DO NOTHING RETURNING *',
        )
        .get(
          randomUUID(),
          provider.name,
          req.body?.event || 'verification.decided',
          eventId,
          JSON.stringify(req.body),
          new Date().toISOString(),
        );
      if (!claimed) return true;
      const kycCase = await db
        .prepare(
          "SELECT * FROM kyc_cases WHERE provider = ? AND provider_reference = ? AND status = 'pending'",
        )
        .get(provider.name, payload.reference);
      if (!kycCase) return false;
      const now = new Date().toISOString();
      await db
        .prepare('UPDATE kyc_cases SET status = ?, updated_at = ? WHERE id = ?')
        .run(payload.decision, now, kycCase.id);
      if (payload.decision === 'verified')
        await db.prepare('UPDATE users SET kyc_verified_at = ? WHERE id = ?').run(now, kycCase.user_id);
      return false;
    });
    res.status(200).json({ ok: true, ...(deduplicated ? { deduplicated: true } : {}) });
  });
}

export { EVIDENCE_KINDS };
