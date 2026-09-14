import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { POINTS_UNIT_PRICE_MINOR } from './billing.mjs';

export function paystackProvider({
  secretKey = process.env.PAYSTACK_SECRET_KEY,
  fetchImpl = fetch,
} = {}) {
  if (!secretKey) return null;
  return {
    name: 'Paystack',
    async createRecipient({ accountName, accountNumber, bankCode }) {
      const response = await fetchImpl('https://api.paystack.co/transferrecipient', {
        method: 'POST',
        headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'nuban',
          name: accountName,
          account_number: accountNumber,
          bank_code: bankCode,
          currency: 'NGN',
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.status)
        throw new Error(body.message || 'Paystack could not create this recipient.');
      return { recipientCode: body.data.recipient_code };
    },
    async initiateTransfer({ amountMinor, currency, recipientCode, reference, reason }) {
      const response = await fetchImpl('https://api.paystack.co/transfer', {
        method: 'POST',
        headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'balance',
          amount: amountMinor,
          currency,
          recipient: recipientCode,
          reference,
          reason,
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.status)
        throw new Error(body.message || 'Paystack could not initiate this transfer.');
      return { providerReference: String(body.data.reference || reference), status: body.data.status };
    },
    async initializeTransaction({ amountMinor, currency, email, reference }) {
      const response = await fetchImpl('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountMinor, currency, email, reference }),
      });
      const body = await response.json();
      if (!response.ok || !body.status)
        throw new Error(body.message || 'Paystack could not initialize this transaction.');
      return { authorizationUrl: body.data.authorization_url, accessCode: body.data.access_code };
    },
    async refundTransaction({ reference, amountMinor }) {
      const response = await fetchImpl('https://api.paystack.co/refund', {
        method: 'POST',
        headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction: reference, amount: amountMinor }),
      });
      const body = await response.json();
      if (!response.ok || !body.status)
        throw new Error(body.message || 'Paystack could not process this refund.');
      return { refundReference: String(body.data.transaction_reference || reference), status: body.data.status };
    },
    verifyWebhookSignature(rawBody, signatureHeader) {
      if (!signatureHeader || !rawBody) return false;
      const expected = createHmac('sha512', secretKey).update(rawBody).digest('hex');
      const expectedBuffer = Buffer.from(expected, 'utf8');
      const providedBuffer = Buffer.from(String(signatureHeader), 'utf8');
      if (expectedBuffer.length !== providedBuffer.length) return false;
      return timingSafeEqual(expectedBuffer, providedBuffer);
    },
  };
}

// Crypto/USDT is registered as a real provider slot for future use, but is
// deliberately unimplemented for now: no keys or on-chain integration exist
// yet, so it must stay inert rather than fake a working payout path.
export function cryptoUsdtProvider() {
  return null;
}

const accountSchema = z
  .object({
    provider: z.enum(['paystack', 'crypto_usdt']),
    accountName: z.string().trim().min(1).max(200),
    accountNumber: z.string().trim().min(1).max(64),
    bankCode: z.string().trim().min(1).max(20).optional(),
  })
  .strict();
const releaseSchema = z.object({ provider: z.enum(['paystack', 'crypto_usdt']) }).strict();
const purchaseSchema = z
  .object({ points: z.number().int().min(1).max(100000).optional(), bundleId: z.string().trim().min(1).optional() })
  .strict()
  .refine((value) => (value.points == null) !== (value.bundleId == null), {
    message: 'Provide exactly one of points or bundleId.',
  });

const fail = (message, status) => {
  throw Object.assign(new Error(message), { status });
};

export function mountPayments(app, store, deps) {
  const { db, transaction, log } = store;
  const providerFor = (name) => deps.paymentProvider(name);

  function projectFor(id) {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!project) fail('Project not found.', 404);
    return project;
  }
  function milestoneFor(id) {
    const milestone = db.prepare('SELECT * FROM milestones WHERE id = ?').get(id);
    if (!milestone) fail('Milestone not found.', 404);
    return milestone;
  }
  function requireParty(project, userId) {
    const job = db.prepare('SELECT * FROM job_posts WHERE id = ?').get(project.job_id);
    const isClient = job && job.client_user_id === userId;
    const isFreelancer = project.freelancer_user_id === userId;
    if (!isClient && !isFreelancer) fail('You are not a party to this project.', 403);
    return { job, isClient, isFreelancer };
  }

  app.post('/api/payment-accounts', async (req, res, next) => {
    try {
      const input = accountSchema.parse(req.body);
      const provider = providerFor(input.provider);
      let recipientCode = null;
      if (provider) {
        const created = await provider.createRecipient({
          accountName: input.accountName,
          accountNumber: input.accountNumber,
          bankCode: input.bankCode,
        });
        recipientCode = created.recipientCode;
      }
      const id = randomUUID();
      transaction(() => {
        db.prepare('INSERT INTO payment_accounts VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
          id,
          req.user.id,
          input.provider,
          input.accountName,
          input.accountNumber,
          input.bankCode || null,
          recipientCode,
          new Date().toISOString(),
        );
        log(
          req.workspace.id,
          req.user.name,
          'Payment account registered',
          id,
          `${input.provider}${recipientCode ? '' : ' (provider not configured; payouts pending activation)'}`,
        );
      });
      const account = db.prepare('SELECT * FROM payment_accounts WHERE id = ?').get(id);
      res.status(201).json({
        ...account,
        message: recipientCode
          ? 'Payment account registered and ready for payouts.'
          : 'Recorded, but payouts are not yet enabled for this provider.',
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/milestones/:id/transfers', (req, res) => {
    const milestone = milestoneFor(req.params.id);
    const project = projectFor(milestone.project_id);
    requireParty(project, req.user.id);
    res.json(
      db
        .prepare('SELECT * FROM payment_transfers WHERE milestone_id = ? ORDER BY created_at DESC')
        .all(milestone.id),
    );
  });

  app.post('/api/milestones/:id/fund', async (req, res, next) => {
    try {
      const milestone = milestoneFor(req.params.id);
      const project = projectFor(milestone.project_id);
      const { isClient } = requireParty(project, req.user.id);
      if (!isClient)
        return res.status(403).json({ error: 'Only the project owner can fund this milestone.' });
      const existing = db
        .prepare(
          "SELECT 1 FROM milestone_fundings WHERE milestone_id = ? AND status IN ('pending', 'held')",
        )
        .get(milestone.id);
      if (existing)
        return res.status(409).json({ error: 'This milestone already has a pending or held funding.' });
      const provider = providerFor('paystack');
      if (!provider)
        return res.status(503).json({
          error: 'The paystack payment provider is not configured on this server. No funds have been held.',
        });
      const fundingId = randomUUID();
      const reference = `LMD-FUND-${fundingId.slice(0, 8)}`;
      const amountMinor = milestone.amount * 100;
      const init = await provider.initializeTransaction({
        amountMinor,
        currency: milestone.currency,
        email: req.user.email || `${req.user.id}@lamidgrowth.internal`,
        reference,
      });
      transaction(() => {
        db.prepare('INSERT INTO milestone_fundings VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
          fundingId,
          milestone.id,
          project.workspace_id,
          'paystack',
          amountMinor,
          milestone.currency,
          reference,
          'pending',
          new Date().toISOString(),
          null,
          null,
          null,
        );
        log(project.workspace_id, req.user.name, 'Milestone funding initiated', fundingId, milestone.title);
      });
      res.status(201).json({ authorizationUrl: init.authorizationUrl, reference, amountMinor, currency: milestone.currency });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/milestones/:id/funding', (req, res) => {
    const milestone = milestoneFor(req.params.id);
    const project = projectFor(milestone.project_id);
    requireParty(project, req.user.id);
    const funding = db
      .prepare('SELECT * FROM milestone_fundings WHERE milestone_id = ? ORDER BY created_at DESC')
      .get(milestone.id);
    res.json(funding || null);
  });

  app.post('/api/milestones/:id/refund', async (req, res, next) => {
    try {
      const milestone = milestoneFor(req.params.id);
      const project = projectFor(milestone.project_id);
      const { isClient } = requireParty(project, req.user.id);
      if (!isClient)
        return res.status(403).json({ error: 'Only the project owner can request a refund.' });
      if (milestone.status !== 'disputed')
        return res.status(400).json({
          error: `A refund can only be requested for a disputed milestone (current status: ${milestone.status}).`,
        });
      const funding = db
        .prepare("SELECT * FROM milestone_fundings WHERE milestone_id = ? AND status = 'held'")
        .get(milestone.id);
      if (!funding)
        return res.status(400).json({ error: 'This milestone has no funds held in escrow to refund.' });
      const provider = providerFor('paystack');
      if (!provider)
        return res.status(503).json({
          error: 'The paystack payment provider is not configured on this server. No refund has been made.',
        });

      try {
        await provider.refundTransaction({ reference: funding.provider_reference, amountMinor: funding.amount_minor });
        transaction(() => {
          db.prepare("UPDATE milestone_fundings SET status = 'refund_pending' WHERE id = ?").run(funding.id);
          log(project.workspace_id, req.user.name, 'Milestone refund requested', funding.id, milestone.title);
        });
      } catch (error) {
        transaction(() => {
          db.prepare("UPDATE milestone_fundings SET status = 'refund_failed' WHERE id = ?").run(funding.id);
        });
        return res.status(502).json({ error: 'The payment provider could not process this refund.' });
      }
      res.status(201).json(db.prepare('SELECT * FROM milestone_fundings WHERE id = ?').get(funding.id));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/milestones/:id/release', async (req, res, next) => {
    try {
      const input = releaseSchema.parse(req.body);
      const milestone = milestoneFor(req.params.id);
      const project = projectFor(milestone.project_id);
      const { isClient } = requireParty(project, req.user.id);
      if (!isClient)
        return res.status(403).json({ error: 'Only the project owner can release milestone payment.' });
      if (milestone.status !== 'approved')
        return res
          .status(400)
          .json({ error: `Milestone "${milestone.title}" is not yet approved (current status: ${milestone.status}).` });
      const funding = db
        .prepare("SELECT * FROM milestone_fundings WHERE milestone_id = ? AND status = 'held'")
        .get(milestone.id);
      if (!funding)
        return res.status(400).json({ error: 'This milestone has no funds held in escrow to release.' });

      const account = db
        .prepare(
          'SELECT * FROM payment_accounts WHERE user_id = ? AND provider = ? AND recipient_code IS NOT NULL',
        )
        .get(project.freelancer_user_id, input.provider);
      const provider = providerFor(input.provider);
      if (!provider)
        return res.status(503).json({
          error: `The ${input.provider} payment provider is not configured on this server. No transfer has been made.`,
        });
      if (!account)
        return res.status(400).json({
          error: 'The freelancer has no active payout account registered for this provider.',
        });

      const transferId = randomUUID();
      const reference = `LMD-${transferId.slice(0, 8)}`;
      transaction(() => {
        db.prepare('INSERT INTO payment_transfers VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
          transferId,
          project.workspace_id,
          milestone.id,
          input.provider,
          milestone.amount * 100,
          milestone.currency,
          account.recipient_code,
          'pending',
          null,
          null,
          new Date().toISOString(),
          new Date().toISOString(),
        );
      });

      try {
        const result = await provider.initiateTransfer({
          amountMinor: milestone.amount * 100,
          currency: milestone.currency,
          recipientCode: account.recipient_code,
          reference,
          reason: `Milestone payment: ${milestone.title}`,
        });
        transaction(() => {
          db.prepare(
            "UPDATE payment_transfers SET status = 'processing', provider_reference = ?, updated_at = ? WHERE id = ?",
          ).run(result.providerReference, new Date().toISOString(), transferId);
          log(project.workspace_id, req.user.name, 'Milestone payment initiated', transferId, milestone.title);
        });
      } catch (error) {
        transaction(() => {
          db.prepare(
            "UPDATE payment_transfers SET status = 'failed', failure_reason = ?, updated_at = ? WHERE id = ?",
          ).run(error.message, new Date().toISOString(), transferId);
        });
        return res.status(502).json({ error: 'The payment provider could not initiate this transfer.' });
      }
      res.status(201).json(db.prepare('SELECT * FROM payment_transfers WHERE id = ?').get(transferId));
    } catch (error) {
      next(error);
    }
  });
}

export function mountPointsPurchase(app, store, deps) {
  const { db, transaction, log } = store;

  app.post('/api/points/purchase', async (req, res, next) => {
    try {
      const input = purchaseSchema.parse(req.body);
      let points = input.points;
      let amountMinor = input.points != null ? input.points * POINTS_UNIT_PRICE_MINOR : null;
      let currency = 'USD';
      let bundleId = null;
      if (input.bundleId) {
        const bundle = db.prepare("SELECT * FROM bundles WHERE id = ? AND status = 'active'").get(input.bundleId);
        if (!bundle) return res.status(404).json({ error: 'This bundle is not available for purchase.' });
        points = bundle.points_included;
        amountMinor = bundle.price_minor;
        currency = bundle.currency;
        bundleId = bundle.id;
      }
      const provider = deps.paymentProvider('paystack');
      if (!provider)
        return res.status(503).json({ error: 'Paystack is not configured on this server. No purchase has been made.' });
      const purchaseId = randomUUID();
      const reference = `LMD-PTS-${purchaseId.slice(0, 8)}`;
      const init = await provider.initializeTransaction({
        amountMinor,
        currency,
        email: req.user.email || `${req.user.id}@lamidgrowth.internal`,
        reference,
      });
      transaction(() => {
        db.prepare('INSERT INTO points_purchases VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
          purchaseId,
          req.user.id,
          req.workspace.id,
          points,
          amountMinor,
          currency,
          'paystack',
          reference,
          'pending',
          new Date().toISOString(),
          bundleId,
        );
        log(req.workspace.id, req.user.name, 'Points purchase initiated', purchaseId, bundleId ? `bundle ${bundleId}` : `${points} points`);
      });
      res.status(201).json({ authorizationUrl: init.authorizationUrl, reference, points, amountMinor });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/points/purchases', (req, res) => {
    res.json(
      db
        .prepare('SELECT * FROM points_purchases WHERE user_id = ? ORDER BY created_at DESC')
        .all(req.user.id),
    );
  });
}

export function mountPaystackWebhook(app, store, deps) {
  const { db, transaction } = store;
  app.post('/api/webhooks/paystack', (req, res) => {
    const provider = deps.paymentProvider('paystack');
    if (!provider) return res.status(503).json({ error: 'Paystack is not configured.' });
    const signature = req.headers['x-paystack-signature'];
    if (!provider.verifyWebhookSignature(req.rawBody, signature))
      return res.status(401).json({ error: 'Invalid webhook signature.' });

    const event = req.body || {};
    const eventId = String(event.data?.reference || event.data?.id || '');
    if (!event.event || !eventId) return res.status(400).json({ error: 'Malformed webhook payload.' });
    // Paystack reuses the same transaction/transfer reference across related events (e.g. a
    // charge and its later refund can share a reference) — so the dedup key must include the
    // event type, or a genuinely new event on the same reference would be mistaken for a replay.
    const dedupeKey = `${event.event}:${eventId}`;

    const already = db
      .prepare('SELECT 1 FROM payment_webhook_events WHERE provider = ? AND provider_event_id = ?')
      .get('paystack', dedupeKey);
    if (already) return res.status(200).json({ ok: true, deduplicated: true });

    transaction(() => {
      db.prepare('INSERT INTO payment_webhook_events VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        randomUUID(),
        'paystack',
        event.event,
        dedupeKey,
        JSON.stringify(event),
        new Date().toISOString(),
        new Date().toISOString(),
      );
      const transfer = db
        .prepare('SELECT * FROM payment_transfers WHERE provider_reference = ?')
        .get(eventId);
      if (transfer) {
        if (event.event === 'transfer.success') {
          db.prepare(
            "UPDATE payment_transfers SET status = 'succeeded', updated_at = ? WHERE id = ?",
          ).run(new Date().toISOString(), transfer.id);
          db.prepare("UPDATE milestones SET status = 'paid' WHERE id = ?").run(transfer.milestone_id);
          db.prepare("UPDATE milestone_fundings SET status = 'released', released_at = ? WHERE milestone_id = ? AND status = 'held'").run(
            new Date().toISOString(),
            transfer.milestone_id,
          );
        } else if (event.event === 'transfer.failed') {
          db.prepare(
            "UPDATE payment_transfers SET status = 'failed', failure_reason = ?, updated_at = ? WHERE id = ?",
          ).run('Reported failed by provider webhook.', new Date().toISOString(), transfer.id);
        }
      }
      if (event.event === 'charge.success') {
        const purchase = db
          .prepare("SELECT * FROM points_purchases WHERE provider_reference = ? AND status = 'pending'")
          .get(eventId);
        if (purchase) {
          db.prepare("UPDATE points_purchases SET status = 'completed' WHERE id = ?").run(purchase.id);
          db.prepare('UPDATE users SET points_balance = points_balance + ? WHERE id = ?').run(
            purchase.points,
            purchase.user_id,
          );
          db.prepare('INSERT INTO points_ledger VALUES (?, ?, ?, ?, ?, ?, ?)').run(
            randomUUID(),
            purchase.user_id,
            purchase.workspace_id,
            purchase.points,
            'purchase',
            purchase.id,
            Date.now(),
          );
        }
        const funding = db
          .prepare("SELECT * FROM milestone_fundings WHERE provider_reference = ? AND status = 'pending'")
          .get(eventId);
        if (funding) {
          db.prepare("UPDATE milestone_fundings SET status = 'held', held_at = ? WHERE id = ?").run(
            new Date().toISOString(),
            funding.id,
          );
        }
      }
      if (event.event === 'refund.processed' || event.event === 'refund.failed') {
        const funding = db
          .prepare("SELECT * FROM milestone_fundings WHERE provider_reference = ? AND status = 'refund_pending'")
          .get(eventId);
        if (funding) {
          const status = event.event === 'refund.processed' ? 'refunded' : 'refund_failed';
          db.prepare(
            "UPDATE milestone_fundings SET status = ?, refunded_at = ? WHERE id = ?",
          ).run(status, event.event === 'refund.processed' ? new Date().toISOString() : null, funding.id);
        }
      }
    });
    res.status(200).json({ ok: true });
  });
}
