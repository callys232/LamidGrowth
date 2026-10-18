import { z } from 'zod';
import {
  providerAmountMatches,
  REVIEW_FUNDING_STATES,
  REVIEW_TRANSFER_STATES,
} from './paymentIntegrity.mjs';
const tables = { funding: 'milestone_fundings', transfer: 'payment_transfers' };
const fail = (message, status) => {
  throw Object.assign(new Error(message), { status });
};
const update = z
  .object({
    version: z.number().int().nonnegative(),
    status: z.enum(['open', 'investigating', 'waiting', 'resolved']),
    note: z.string().trim().min(10).max(2000),
  })
  .strict();
const verify = z
  .object({
    version: z.number().int().nonnegative(),
    operation: z.enum(['charge', 'transfer', 'refund']),
    refundId: z.string().regex(/^\d+$/).max(30).optional(),
    note: z.string().trim().min(10).max(2000),
  })
  .strict();

/** Dedicated ownership for payment support and reconciliation; never initiates a transfer. */
export function mountPaymentOperations(app, store, { paymentProvider, ecosystemAdminEmails = [] }) {
  const { db, transaction, log } = store;
  const isAdmin = (req) =>
    !req.user.demo && ecosystemAdminEmails.includes((req.user.email || '').toLowerCase());
  const admin = (req, _res, next) => {
    if (!isAdmin(req))
      return next(
        Object.assign(new Error('Only a platform payment operator can update a payment review.'), {
          status: 403,
        }),
      );
    next();
  };
  async function target(req, lock = false) {
    const table = Object.hasOwn(tables, req.params.kind) ? tables[req.params.kind] : null;
    if (!table) fail('Payment type not found.', 404);
    const row = await db
      .prepare(`SELECT * FROM ${table} WHERE id=?${lock ? ' FOR UPDATE' : ''}`)
      .get(req.params.id);
    if (
      !row ||
      (!isAdmin(req) && (row.workspace_id !== req.workspace.id || req.workspace.role !== 'owner'))
    )
      fail('Payment not found.', 404);
    return row;
  }
  async function review(kind, id) {
    return await db
      .prepare('SELECT * FROM payment_reviews WHERE kind=? AND payment_id=? FOR UPDATE')
      .get(kind, id);
  }
  async function record(req, row, input, providerStatus = null) {
    const current = await review(req.params.kind, row.id);
    if (Number(current?.version || 0) !== input.version)
      fail('This case changed. Refresh before saving.', 409);
    await db
      .prepare(
        `INSERT INTO payment_reviews (kind,payment_id,workspace_id,assigned_to,status,note,provider_status,version,updated_at)
      VALUES (?,?,?,?,?,?,?,1,?) ON CONFLICT(kind,payment_id) DO UPDATE SET
      assigned_to=EXCLUDED.assigned_to,status=EXCLUDED.status,note=EXCLUDED.note,
      provider_status=EXCLUDED.provider_status,version=payment_reviews.version+1,updated_at=EXCLUDED.updated_at`,
      )
      .run(
        req.params.kind,
        row.id,
        row.workspace_id,
        isAdmin(req) ? req.user.id : null,
        input.status,
        input.note,
        providerStatus,
        new Date().toISOString(),
      );
    await log(
      row.workspace_id,
      req.user.name,
      'Payment review updated',
      row.id,
      `${input.status}: ${input.note}; provider=${providerStatus || 'not checked'}`,
    );
  }
  app.get('/api/finance/payment-reviews', async (req, res) => {
    if (!isAdmin(req) && req.workspace.role !== 'owner')
      return res.status(403).json({ error: 'Workspace owners can view payment support cases.' });
    const rows = [];
    for (const [kind, table] of Object.entries(tables)) {
      const states = kind === 'funding' ? REVIEW_FUNDING_STATES : REVIEW_TRANSFER_STATES;
      rows.push(
        ...(
          await db
            .prepare(
              `SELECT p.id,p.workspace_id,p.milestone_id,p.status AS payment_status,p.amount_minor,p.currency,p.provider_reference,
        r.assigned_to,r.status AS review_status,r.note,r.provider_status,COALESCE(r.version,0) AS version
        FROM ${table} p LEFT JOIN payment_reviews r ON r.kind=? AND r.payment_id=p.id
        WHERE (p.status IN (${states.map(() => '?').join(',')}) OR r.payment_id IS NOT NULL)
        ${isAdmin(req) ? '' : 'AND p.workspace_id=?'} ORDER BY p.created_at DESC LIMIT 100`,
            )
            .all(kind, ...states, ...(isAdmin(req) ? [] : [req.workspace.id]))
        ).map((row) => ({ ...row, kind })),
      );
    }
    res.json({ operator: isAdmin(req), items: rows });
  });
  app.post('/api/finance/payment-reviews/:kind/:id/report', async (req, res) => {
    const { note } = z
      .object({ note: z.string().trim().min(10).max(2000) })
      .strict()
      .parse(req.body);
    await transaction(async () => {
      const row = await target(req, true),
        existing = await review(req.params.kind, row.id);
      if (existing && existing.status !== 'resolved')
        fail('This payment already has an open review.', 409);
      await record(req, row, { version: Number(existing?.version || 0), status: 'open', note });
    });
    res.status(201).json({ ok: true });
  });
  app.patch('/api/finance/payment-reviews/:kind/:id', admin, async (req, res) => {
    const input = update.parse(req.body);
    await transaction(async () => {
      const row = await target(req, true),
        states = req.params.kind === 'funding' ? REVIEW_FUNDING_STATES : REVIEW_TRANSFER_STATES;
      if (input.status === 'resolved' && states.includes(row.status))
        fail(
          'The payment is still uncertain. Verify and reconcile it before closing this case.',
          409,
        );
      await record(req, row, input);
    });
    res.json({ ok: true });
  });
  app.post('/api/finance/payment-reviews/:kind/:id/verify', admin, async (req, res) => {
    const input = verify.parse(req.body),
      original = await target(req);
    if ((req.params.kind === 'transfer') !== (input.operation === 'transfer'))
      fail('Choose the matching payment operation.', 400);
    const provider = paymentProvider('paystack');
    if (!provider?.inspectPayment) fail('Read-only provider verification is not configured.', 503);
    if (!original.provider_reference)
      fail(
        'This payment has no saved provider reference. Investigate with provider support before retrying.',
        409,
      );
    const evidence = await provider.inspectPayment({
      kind: input.operation,
      reference: original.provider_reference,
      refundId: input.refundId,
    });
    const result = await transaction(async () => {
      const row = await target(req, true);
      if (row.status !== original.status || row.provider_reference !== original.provider_reference)
        fail('The payment changed during verification. Refresh first.', 409);
      const matches =
        evidence.reference === row.provider_reference &&
        providerAmountMatches(
          { data: evidence },
          row.provider_amount_minor ?? row.amount_minor,
          row.provider_currency ?? row.currency,
        );
      let reconciled = false;
      const now = new Date().toISOString();
      if (
        matches &&
        input.operation === 'charge' &&
        evidence.status === 'success' &&
        ['pending', 'awaiting_provider', 'amount_mismatch', 'init_failed'].includes(row.status)
      ) {
        await db
          .prepare("UPDATE milestone_fundings SET status='held',held_at=? WHERE id=?")
          .run(now, row.id);
        reconciled = true;
      }
      if (
        matches &&
        input.operation === 'refund' &&
        evidence.status === 'processed' &&
        [
          'refund_pending',
          'refund_unknown',
          'refunding',
          'refund_failed',
          'reconciliation_required',
        ].includes(row.status)
      ) {
        await db
          .prepare("UPDATE milestone_fundings SET status='refunded',refunded_at=? WHERE id=?")
          .run(now, row.id);
        reconciled = true;
      }
      if (
        matches &&
        input.operation === 'transfer' &&
        evidence.status === 'success' &&
        ['pending', 'processing', 'unknown', 'amount_mismatch'].includes(row.status)
      ) {
        await db
          .prepare("UPDATE payment_transfers SET status='succeeded',updated_at=? WHERE id=?")
          .run(now, row.id);
        await db.prepare("UPDATE milestones SET status='paid' WHERE id=?").run(row.milestone_id);
        await db
          .prepare(
            "UPDATE milestone_fundings SET status='released',released_at=? WHERE milestone_id=? AND status='held'",
          )
          .run(now, row.milestone_id);
        reconciled = true;
      }
      // Failed/reversed payouts require provider support to confirm return of funds; this
      // console records the evidence and keeps retry protection rather than assuming cash is available.
      await record(
        req,
        row,
        { ...input, status: reconciled ? 'resolved' : 'waiting' },
        `${evidence.status}${matches ? ' (reference and amount matched)' : ' (reference or amount mismatch)'}`,
      );
      return {
        reconciled,
        message: reconciled
          ? 'Provider-confirmed status applied. No new payment was sent.'
          : 'Evidence recorded. Payment remains blocked pending provider support or a matching final webhook.',
      };
    });
    res.json(result);
  });
}
