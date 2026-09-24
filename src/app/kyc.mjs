import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const EVIDENCE_KINDS = ['government_id', 'proof_of_address', 'business_registration', 'other'];

const createSchema = z.object({ provider: z.string().trim().max(120).default('manual') }).strict();
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
    await transaction(async () => {
      await db
        .prepare('INSERT INTO kyc_cases VALUES (?, ?, ?, ?, ?, ?)')
        .run(id, req.user.id, 'pending', input.provider, now, now);
      await log(req.workspace.id, req.user.name, 'KYC case opened', id, input.provider);
    });
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

export { EVIDENCE_KINDS };
