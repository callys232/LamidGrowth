import { randomUUID } from 'node:crypto';
import { requirePermission } from './policy.mjs';
import { logHandledError } from './errorLog.mjs';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const ECOSYSTEM_FEE_MINOR = Math.max(
  0,
  Number.parseInt(process.env.ECOSYSTEM_FEE_MINOR || '50000', 10) || 50000,
);
export const POINTS_UNIT_PRICE_MINOR = Math.max(
  0,
  Number.parseInt(process.env.POINTS_UNIT_PRICE_MINOR || '10', 10) || 10,
);

export async function ensureConciergeFeesUpToDate(store, workspaceId) {
  const { db } = store;
  const concierge = await db
    .prepare(
      "SELECT * FROM workspace_members WHERE workspace_id = ? AND role = 'concierge' AND status = 'active'",
    )
    .get(workspaceId);
  if (!concierge) return;
  const application = await db
    .prepare(
      "SELECT monthly_rate_minor FROM concierge_applications WHERE user_id = ? AND status = 'approved'",
    )
    .get(concierge.user_id);
  const pmMonthlyRateMinor = application?.monthly_rate_minor || 0;
  if (pmMonthlyRateMinor <= 0) return;
  const now = Date.now();
  let periodStart = concierge.created_at;
  const insert = db.prepare(
    'INSERT INTO billing_line_items VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (workspace_id, kind, period_start) DO NOTHING',
  );
  // The ecosystem fee is a one-time payment recorded at assignment time (see
  // src/app/concierge.mjs) — only the PM's own rate recurs for as long as they stay assigned.
  while (periodStart + THIRTY_DAYS_MS <= now) {
    const periodEnd = periodStart + THIRTY_DAYS_MS;
    await insert.run(
      randomUUID(),
      workspaceId,
      'pm_fee',
      'Dedicated concierge manager fee — 30-day cycle',
      pmMonthlyRateMinor,
      'USD',
      periodStart,
      periodEnd,
      new Date().toISOString(),
      null,
    );
    periodStart = periodEnd;
  }
}

export async function recordOneTimeEcosystemFee(store, workspaceId) {
  const { db } = store;
  const now = Date.now();
  await db.prepare('INSERT INTO billing_line_items VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (workspace_id, kind, period_start) DO NOTHING').run(
    randomUUID(),
    workspaceId,
    'ecosystem_fee',
    'LAMID ONE concierge service fee — one-time',
    ECOSYSTEM_FEE_MINOR,
    'USD',
    now,
    now,
    new Date().toISOString(),
    null,
  );
}

export function mountBilling(app, store, { paymentProvider, ecosystemAdminEmails = [] } = {}) {
  const { db, transaction, log } = store;
  const isAdmin = (req) => ecosystemAdminEmails.includes((req.user.email || '').toLowerCase());

  app.get('/api/admin/escrow-overview', async (req, res) => {
    if (!isAdmin(req))
      return res.status(403).json({ error: 'Only an ecosystem administrator can view the escrow overview.' });
    const rows = await db.prepare('SELECT * FROM milestone_fundings').all();
    const sum = (status) => rows.filter((r) => r.status === status).reduce((total, r) => total + r.amount_minor, 0);
    const byStatus = {};
    for (const row of rows) byStatus[row.status] = (byStatus[row.status] || 0) + 1;
    res.json({
      totals: {
        heldMinor: sum('held'),
        releasedMinor: sum('released'),
        refundedMinor: sum('refunded'),
        pendingMinor: sum('pending') + sum('refund_pending'),
      },
      byStatus,
      currentlyHeld: rows
        .filter((r) => r.status === 'held')
        .map((r) => ({
          milestoneId: r.milestone_id,
          workspaceId: r.workspace_id,
          amountMinor: r.amount_minor,
          currency: r.currency,
          heldAt: r.held_at,
        })),
    });
  });

  app.post('/api/billing/pay-provider', requirePermission('billing:manage'), async (req, res, next) => {
    try {
      const concierge = await db
        .prepare(
          "SELECT * FROM workspace_members WHERE workspace_id = ? AND role = 'concierge' AND status = 'active'",
        )
        .get(req.workspace.id);
      if (!concierge) return res.status(400).json({ error: 'This workspace has no active concierge.' });

      const unpaid = await db
        .prepare(
          "SELECT * FROM billing_line_items WHERE workspace_id = ? AND kind = 'pm_fee' AND paid_at IS NULL",
        )
        .all(req.workspace.id);
      if (unpaid.length === 0) return res.status(400).json({ error: 'Nothing is currently owed to this concierge.' });
      const totalMinor = unpaid.reduce((sum, item) => sum + item.amount_minor, 0);

      const account = await db
        .prepare(
          "SELECT * FROM payment_accounts WHERE user_id = ? AND provider = 'paystack' AND recipient_code IS NOT NULL",
        )
        .get(concierge.user_id);
      const provider = paymentProvider?.('paystack');
      if (!provider)
        return res.status(503).json({ error: 'The paystack payment provider is not configured on this server. No transfer has been made.' });
      if (!account)
        return res.status(400).json({ error: 'This concierge has no active payout account registered.' });

      const reference = `LMD-PM-${randomUUID().slice(0, 8)}`;
      try {
        const result = await provider.initiateTransfer({
          amountMinor: totalMinor,
          currency: 'USD',
          recipientCode: account.recipient_code,
          reference,
          reason: 'Concierge manager fee payout',
        });
        await transaction(async () => {
          const now = new Date().toISOString();
          for (const item of unpaid) await db.prepare('UPDATE billing_line_items SET paid_at = ? WHERE id = ?').run(now, item.id);
          await log(req.workspace.id, req.user.name, 'Concierge manager paid', concierge.user_id, `${unpaid.length} fee cycle(s), ${totalMinor} minor units`);
        });
        res.status(201).json({ ok: true, paidMinor: totalMinor, providerReference: result.providerReference, lineItemIds: unpaid.map((i) => i.id) });
      } catch (error) {
        logHandledError(req, res, 'concierge_payout_error', error);
        res.status(502).json({ error: 'The payment provider could not initiate this transfer. No fees have been marked paid.' });
      }
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/billing/statement', requirePermission('billing:manage'), async (req, res) => {
    await ensureConciergeFeesUpToDate(store, req.workspace.id);
    const lineItems = await db
      .prepare('SELECT * FROM billing_line_items WHERE workspace_id = ? ORDER BY period_start')
      .all(req.workspace.id);
    const totalMinor = lineItems.reduce((sum, item) => sum + item.amount_minor, 0);
    const totalPointsSpent = -(
      (await db
        .prepare(
          "SELECT COALESCE(SUM(amount), 0) AS total FROM points_ledger WHERE workspace_id = ? AND amount < 0",
        )
        .get(req.workspace.id)).total || 0
    );
    res.json({
      lineItems,
      totalMinor,
      currency: 'USD',
      pointsUsage: {
        totalPointsSpent,
        estimatedCostMinor: totalPointsSpent * POINTS_UNIT_PRICE_MINOR,
        currency: 'USD',
        note: 'Informational — reflects points already deducted from your balance, not a separate charge.',
      },
    });
  });
}
