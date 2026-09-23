import { requirePermission } from './policy.mjs';
import { POINTS_UNIT_PRICE_MINOR, ensureConciergeFeesUpToDate } from './billing.mjs';

/** /os/finance — real financial data this app actually has: the points economy and the
 * commercial-marketplace escrow/payout trail. Deliberately does not attempt "cash position",
 * "runway" or "forecast" (language from the canonical spec written for a general business-finance
 * tool) — this app has no expense tracking or revenue model to honestly back those numbers with.
 * Points and escrow are real, so those are what this workspace shows. */
export function mountFinance(app, store) {
  const { db } = store;

  // Every workspace member's own points position — not gated behind billing:manage, since it's
  // the viewer's own balance/activity, not the workspace's financial administration.
  app.get('/api/finance/points', async (req, res) => {
    const user = await db.prepare('SELECT points_balance FROM users WHERE id = ?').get(req.user.id);
    const recentLedger = await db
      .prepare(
        'SELECT amount, reason, reference_id, created_at FROM points_ledger WHERE workspace_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 20',
      )
      .all(req.workspace.id, req.user.id);
    const purchaseTotals = await db
      .prepare(
        "SELECT COALESCE(SUM(points), 0) AS points, COALESCE(SUM(amount_minor), 0) AS minor FROM points_purchases WHERE workspace_id = ? AND user_id = ? AND status = 'completed'",
      )
      .get(req.workspace.id, req.user.id);
    res.json({
      balance: user.points_balance,
      unitPriceMinor: POINTS_UNIT_PRICE_MINOR,
      currency: 'USD',
      totalPurchasedPoints: purchaseTotals.points,
      totalPurchasedMinor: purchaseTotals.minor,
      recentLedger,
    });
  });

  // Workspace-wide financial administration: escrow held/released/refunded across every project
  // in this workspace, payout transfers, and billing line items. Same billing:manage gate the
  // existing /api/billing/statement endpoint already uses — this is the same audience.
  app.get('/api/finance/overview', requirePermission('billing:manage'), async (req, res) => {
    const workspaceId = req.workspace.id;

    const fundings = await db
      .prepare(
        `SELECT mf.*, m.title AS milestone_title, p.title AS project_title
         FROM milestone_fundings mf
         JOIN milestones m ON m.id = mf.milestone_id
         JOIN projects p ON p.id = m.project_id
         WHERE mf.workspace_id = ? ORDER BY mf.created_at DESC`,
      )
      .all(workspaceId);
    const sum = (status) =>
      fundings.filter((f) => f.status === status).reduce((total, f) => total + f.amount_minor, 0);
    const escrow = {
      heldMinor: sum('held'),
      releasedMinor: sum('released'),
      refundedMinor: sum('refunded'),
      pendingMinor: sum('pending') + sum('refund_pending'),
      items: fundings.map((f) => ({
        id: f.id,
        milestoneId: f.milestone_id,
        milestoneTitle: f.milestone_title,
        projectTitle: f.project_title,
        amountMinor: f.amount_minor,
        currency: f.currency,
        status: f.status,
        createdAt: f.created_at,
        heldAt: f.held_at,
        releasedAt: f.released_at,
        refundedAt: f.refunded_at,
      })),
    };

    const transferRows = await db
      .prepare(
        `SELECT pt.*, m.title AS milestone_title
         FROM payment_transfers pt
         JOIN milestones m ON m.id = pt.milestone_id
         WHERE pt.workspace_id = ? ORDER BY pt.created_at DESC`,
      )
      .all(workspaceId);
    const transfers = transferRows.map((t) => ({
      id: t.id,
      milestoneTitle: t.milestone_title,
      amountMinor: t.amount_minor,
      currency: t.currency,
      status: t.status,
      createdAt: t.created_at,
    }));

    await ensureConciergeFeesUpToDate(store, workspaceId);
    const lineItems = await db
      .prepare('SELECT * FROM billing_line_items WHERE workspace_id = ? ORDER BY period_start')
      .all(workspaceId);
    const billingTotalMinor = lineItems.reduce((total, item) => total + item.amount_minor, 0);

    res.json({
      escrow,
      transfers,
      billing: { lineItems, totalMinor: billingTotalMinor, currency: 'USD' },
    });
  });
}
