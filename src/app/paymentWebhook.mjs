import { randomUUID } from 'node:crypto';
import { grantBundleEntitlements } from './entitlements.mjs';
import { activatePlanPayment } from './plans.mjs';
import { providerAmountMatches } from './paymentIntegrity.mjs';

export function mountPaystackWebhook(app, store, deps) {
  const { db, transaction } = store;
  app.post('/api/webhooks/paystack', async (req, res) => {
    const provider = deps.paymentProvider('paystack');
    if (!provider) return res.status(503).json({ error: 'Paystack is not configured.' });
    const signature = req.headers['x-paystack-signature'];
    if (!provider.verifyWebhookSignature(req.rawBody, signature))
      return res.status(401).json({ error: 'Invalid webhook signature.' });

    const event = req.body || {};
    const eventId = String(
      event.data?.transaction_reference || event.data?.reference || event.data?.id || '',
    );
    if (!event.event || !eventId)
      return res.status(400).json({ error: 'Malformed webhook payload.' });
    // Paystack reuses the same transaction/transfer reference across related events (e.g. a
    // charge and its later refund can share a reference) — so the dedup key must include the
    // event type, or a genuinely new event on the same reference would be mistaken for a replay.
    const dedupeKey = `${event.event}:${eventId}`;

    const deduplicated = await transaction(async () => {
      // The claim is the atomic INSERT itself (ON CONFLICT DO NOTHING on the table's own
      // UNIQUE(provider, provider_event_id)), not a preceding SELECT — payment providers
      // routinely redeliver webhooks, including near-simultaneously; a plain SELECT-then-INSERT
      // would let two truly-simultaneous deliveries both pass the check, and the loser's INSERT
      // would throw a raw unique_violation instead of the intended `{ deduplicated: true }` reply.
      // Kept inside the same transaction as the processing below (not committed separately): if
      // processing fails partway through, the whole transaction rolls back including this claim,
      // so a genuine retry from the provider is reprocessed rather than wrongly deduplicated.
      const claimed = await db
        .prepare(
          'INSERT INTO payment_webhook_events VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (provider, provider_event_id) DO NOTHING RETURNING *',
        )
        .get(
          randomUUID(),
          'paystack',
          event.event,
          dedupeKey,
          JSON.stringify(event),
          new Date().toISOString(),
          new Date().toISOString(),
        );
      if (!claimed) return true;
      const transfer = await db
        .prepare('SELECT * FROM payment_transfers WHERE provider_reference = ?')
        .get(eventId);
      if (transfer) {
        if (event.event === 'transfer.success' && transfer.status !== 'reversed') {
          const expectedAmount = transfer.provider_amount_minor ?? transfer.amount_minor;
          const expectedCurrency = transfer.provider_currency ?? transfer.currency;
          if (!providerAmountMatches(event, expectedAmount, expectedCurrency)) {
            await db
              .prepare(
                "UPDATE payment_transfers SET status = 'amount_mismatch', failure_reason = ?, updated_at = ? WHERE id = ?",
              )
              .run(
                `Webhook reported ${event.data?.amount} ${event.data?.currency}, expected ${expectedAmount} ${expectedCurrency}. Requires manual reconciliation.`,
                new Date().toISOString(),
                transfer.id,
              );
            return false;
          }
          await db
            .prepare(
              "UPDATE payment_transfers SET status = 'succeeded', updated_at = ? WHERE id = ?",
            )
            .run(new Date().toISOString(), transfer.id);
          await db
            .prepare("UPDATE milestones SET status = 'paid' WHERE id = ?")
            .run(transfer.milestone_id);
          await db
            .prepare(
              "UPDATE milestone_fundings SET status = 'released', released_at = ? WHERE milestone_id = ? AND status = 'held'",
            )
            .run(new Date().toISOString(), transfer.milestone_id);
        } else if (event.event === 'transfer.reversed') {
          // A reversal after success must never leave the UI claiming the contractor was paid.
          // Require reconciliation before permitting another transfer or refund.
          await db
            .prepare(
              "UPDATE payment_transfers SET status = 'reversed', failure_reason = ?, updated_at = ? WHERE id = ?",
            )
            .run(
              'Provider reported a transfer reversal. Reconcile before retrying.',
              new Date().toISOString(),
              transfer.id,
            );
          await db
            .prepare("UPDATE milestones SET status = 'payment_review' WHERE id = ?")
            .run(transfer.milestone_id);
          await db
            .prepare(
              "UPDATE milestone_fundings SET status = 'reconciliation_required', released_at = NULL WHERE milestone_id = ? AND status = 'released'",
            )
            .run(transfer.milestone_id);
        } else if (
          event.event === 'transfer.failed' &&
          transfer.status !== 'succeeded' &&
          transfer.status !== 'reversed'
        ) {
          await db
            .prepare(
              "UPDATE payment_transfers SET status = 'failed', failure_reason = ?, updated_at = ? WHERE id = ?",
            )
            .run('Reported failed by provider webhook.', new Date().toISOString(), transfer.id);
        }
      }
      if (event.event === 'charge.success') {
        const purchase = await db
          .prepare(
            "SELECT * FROM points_purchases WHERE provider_reference = ? AND status IN ('pending', 'awaiting_provider')",
          )
          .get(eventId);
        if (purchase) {
          const expectedAmount = purchase.provider_amount_minor ?? purchase.amount_minor;
          const expectedCurrency = purchase.provider_currency ?? purchase.currency;
          if (!providerAmountMatches(event, expectedAmount, expectedCurrency)) {
            await db
              .prepare("UPDATE points_purchases SET status = 'amount_mismatch' WHERE id = ?")
              .run(purchase.id);
          } else {
            await db
              .prepare("UPDATE points_purchases SET status = 'completed' WHERE id = ?")
              .run(purchase.id);
            await db
              .prepare('UPDATE users SET points_balance = points_balance + ? WHERE id = ?')
              .run(purchase.points, purchase.user_id);
            await db
              .prepare('INSERT INTO points_ledger VALUES (?, ?, ?, ?, ?, ?, ?)')
              .run(
                randomUUID(),
                purchase.user_id,
                purchase.workspace_id,
                purchase.points,
                'purchase',
                purchase.id,
                Date.now(),
              );
            // Only a CONFIRMED purchase grants real tool access — never at initiation, since an
            // unpaid/pending purchase must not unlock anything. See src/app/entitlements.mjs.
            if (purchase.bundle_id)
              await grantBundleEntitlements(store, purchase.workspace_id, purchase.bundle_id);
          }
        }
        // Plan payments (new subscriptions and renewals) — see src/app/plans.mjs.
        const planPayment = await db
          .prepare(
            "SELECT * FROM plan_payments WHERE provider_reference = ? AND status IN ('pending', 'awaiting_provider')",
          )
          .get(eventId);
        if (planPayment) {
          if (
            !providerAmountMatches(
              event,
              planPayment.provider_amount_minor ?? planPayment.amount_minor,
              planPayment.provider_currency ?? planPayment.currency,
            )
          ) {
            await db
              .prepare("UPDATE plan_payments SET status = 'amount_mismatch' WHERE id = ?")
              .run(planPayment.id);
          } else {
            await activatePlanPayment(store, planPayment, event);
          }
        }
        const funding = await db
          .prepare(
            "SELECT * FROM milestone_fundings WHERE provider_reference = ? AND status IN ('pending', 'awaiting_provider')",
          )
          .get(eventId);
        if (funding) {
          if (
            !providerAmountMatches(
              event,
              funding.provider_amount_minor ?? funding.amount_minor,
              funding.provider_currency ?? funding.currency,
            )
          ) {
            await db
              .prepare("UPDATE milestone_fundings SET status = 'amount_mismatch' WHERE id = ?")
              .run(funding.id);
          } else {
            await db
              .prepare("UPDATE milestone_fundings SET status = 'held', held_at = ? WHERE id = ?")
              .run(new Date().toISOString(), funding.id);
          }
        }
      }
      if (
        ['refund.pending', 'refund.processing', 'refund.processed', 'refund.failed'].includes(
          event.event,
        )
      ) {
        const funding = await db
          .prepare(
            "SELECT * FROM milestone_fundings WHERE provider_reference = ? AND status = 'refund_pending'",
          )
          .get(eventId);
        if (funding) {
          if (event.event === 'refund.pending' || event.event === 'refund.processing') return false;
          if (
            event.event === 'refund.processed' &&
            !providerAmountMatches(
              event,
              funding.provider_amount_minor ?? funding.amount_minor,
              funding.provider_currency ?? funding.currency,
            )
          ) {
            await db
              .prepare(
                "UPDATE milestone_fundings SET status = 'reconciliation_required' WHERE id = ?",
              )
              .run(funding.id);
            return false;
          }
          const status = event.event === 'refund.processed' ? 'refunded' : 'refund_failed';
          await db
            .prepare('UPDATE milestone_fundings SET status = ?, refunded_at = ? WHERE id = ?')
            .run(
              status,
              event.event === 'refund.processed' ? new Date().toISOString() : null,
              funding.id,
            );
        }
      }
      return false;
    });
    res.status(200).json({ ok: true, ...(deduplicated ? { deduplicated: true } : {}) });
  });
}
