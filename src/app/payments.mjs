import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { POINTS_UNIT_PRICE_MINOR } from './billing.mjs';
import { grantBundleEntitlements } from './entitlements.mjs';
import { logHandledError } from './errorLog.mjs';

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
      // PAY-02: a network failure or 5xx here means we genuinely do not know whether Paystack
      // received and is acting on the transfer — the request may have reached them before the
      // connection dropped. That ambiguity must survive into the caller (`outcome: 'unknown'`)
      // so the app never assumes "definitely failed" and frees the milestone for a retry that
      // could pay the freelancer twice. Only a clean 4xx rejection from Paystack itself is safe
      // to treat as a definite, retry-safe failure.
      let response;
      try {
        response = await fetchImpl('https://api.paystack.co/transfer', {
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
      } catch (networkError) {
        throw Object.assign(new Error(`Network error contacting Paystack: ${networkError.message}`), {
          outcome: 'unknown',
        });
      }
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.status)
        throw Object.assign(new Error(body.message || 'Paystack could not initiate this transfer.'), {
          outcome: response.status >= 500 ? 'unknown' : 'rejected',
        });
      return {
        providerReference: String(body.data.reference || reference),
        status: body.data.status,
      };
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
      let response;
      try {
        response = await fetchImpl('https://api.paystack.co/refund', {
          method: 'POST',
          headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ transaction: reference, amount: amountMinor }),
        });
      } catch (networkError) {
        throw Object.assign(new Error(`Network error contacting Paystack: ${networkError.message}`), {
          outcome: 'unknown',
        });
      }
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.status)
        throw Object.assign(new Error(body.message || 'Paystack could not process this refund.'), {
          outcome: response.status >= 500 ? 'unknown' : 'rejected',
        });
      return {
        refundReference: String(body.data.transaction_reference || reference),
        status: body.data.status,
      };
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
  .object({
    points: z.number().int().min(1).max(100000).optional(),
    bundleId: z.string().trim().min(1).optional(),
  })
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

  async function projectFor(id) {
    const project = await db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!project) fail('Project not found.', 404);
    return project;
  }
  async function milestoneFor(id) {
    const milestone = await db.prepare('SELECT * FROM milestones WHERE id = ?').get(id);
    if (!milestone) fail('Milestone not found.', 404);
    return milestone;
  }
  async function requireParty(project, userId) {
    const job = await db.prepare('SELECT * FROM job_posts WHERE id = ?').get(project.job_id);
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
      await transaction(async () => {
        await db
          .prepare('INSERT INTO payment_accounts VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run(
            id,
            req.user.id,
            input.provider,
            input.accountName,
            input.accountNumber,
            input.bankCode || null,
            recipientCode,
            new Date().toISOString(),
          );
        await log(
          req.workspace.id,
          req.user.name,
          'Payment account registered',
          id,
          `${input.provider}${recipientCode ? '' : ' (provider not configured; payouts pending activation)'}`,
        );
      });
      const account = await db.prepare('SELECT * FROM payment_accounts WHERE id = ?').get(id);
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

  app.get('/api/milestones/:id/transfers', async (req, res) => {
    const milestone = await milestoneFor(req.params.id);
    const project = await projectFor(milestone.project_id);
    await requireParty(project, req.user.id);
    res.json(
      await db
        .prepare('SELECT * FROM payment_transfers WHERE milestone_id = ? ORDER BY created_at DESC')
        .all(milestone.id),
    );
  });

  app.post('/api/milestones/:id/fund', async (req, res, next) => {
    try {
      const milestone = await milestoneFor(req.params.id);
      const project = await projectFor(milestone.project_id);
      const { isClient } = await requireParty(project, req.user.id);
      if (!isClient)
        return res.status(403).json({ error: 'Only the project owner can fund this milestone.' });
      const existing = await db
        .prepare(
          "SELECT 1 FROM milestone_fundings WHERE milestone_id = ? AND status IN ('pending', 'held')",
        )
        .get(milestone.id);
      if (existing)
        return res
          .status(409)
          .json({ error: 'This milestone already has a pending or held funding.' });
      const provider = providerFor('paystack');
      if (!provider)
        return res.status(503).json({
          error:
            'The paystack payment provider is not configured on this server. No funds have been held.',
        });
      const fundingId = randomUUID();
      const reference = `LMD-FUND-${fundingId.slice(0, 8)}`;
      const amountMinor = milestone.amount * 100;
      // PAY-01: the record is persisted, with its reference, BEFORE the provider is ever called
      // — a crash or DB hiccup between "Paystack accepted this" and "we saved that" would
      // otherwise leave a real pending transaction with no local trace to reconcile against.
      // 'awaiting_provider' marks that gap explicitly; it becomes 'pending' only once dispatch is
      // confirmed, or 'init_failed' (which the uniqueness/existing-funding check above ignores,
      // same as 'pending'/'held' do, so a genuine retry is not blocked) if dispatch never happens.
      await transaction(async () => {
        await db
          .prepare('INSERT INTO milestone_fundings VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .run(
            fundingId,
            milestone.id,
            project.workspace_id,
            'paystack',
            amountMinor,
            milestone.currency,
            reference,
            'awaiting_provider',
            new Date().toISOString(),
            null,
            null,
            null,
          );
      });
      let init;
      try {
        init = await provider.initializeTransaction({
          amountMinor,
          currency: milestone.currency,
          email: req.user.email || `${req.user.id}@lamidgrowth.internal`,
          reference,
        });
      } catch (error) {
        await db
          .prepare("UPDATE milestone_fundings SET status = 'init_failed' WHERE id = ?")
          .run(fundingId);
        logHandledError(req, res, 'payment_fund_init_error', error);
        return res.status(502).json({
          error: 'The payment provider could not initialize this transaction. No funds have been held.',
        });
      }
      await transaction(async () => {
        await db
          .prepare("UPDATE milestone_fundings SET status = 'pending' WHERE id = ?")
          .run(fundingId);
        await log(
          project.workspace_id,
          req.user.name,
          'Milestone funding initiated',
          fundingId,
          milestone.title,
        );
      });
      res.status(201).json({
        authorizationUrl: init.authorizationUrl,
        reference,
        amountMinor,
        currency: milestone.currency,
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/milestones/:id/funding', async (req, res) => {
    const milestone = await milestoneFor(req.params.id);
    const project = await projectFor(milestone.project_id);
    await requireParty(project, req.user.id);
    const funding = await db
      .prepare('SELECT * FROM milestone_fundings WHERE milestone_id = ? ORDER BY created_at DESC')
      .get(milestone.id);
    res.json(funding || null);
  });

  app.post('/api/milestones/:id/refund', async (req, res, next) => {
    try {
      const milestone = await milestoneFor(req.params.id);
      const project = await projectFor(milestone.project_id);
      const { isClient } = await requireParty(project, req.user.id);
      if (!isClient)
        return res.status(403).json({ error: 'Only the project owner can request a refund.' });
      if (milestone.status !== 'disputed')
        return res.status(400).json({
          error: `A refund can only be requested for a disputed milestone (current status: ${milestone.status}).`,
        });
      const provider = providerFor('paystack');
      if (!provider)
        return res.status(503).json({
          error:
            'The paystack payment provider is not configured on this server. No refund has been made.',
        });
      // Atomically claim the funding for refunding (held -> refunding) before calling the
      // provider — a plain SELECT-then-UPDATE would let two concurrent refund requests both see
      // status = 'held', both call the provider, and both issue a real refund. Only the request
      // whose UPDATE actually flips the row proceeds; a losing concurrent request affects no rows
      // and is rejected here instead of ever reaching provider.refundTransaction().
      const funding = await db
        .prepare(
          "UPDATE milestone_fundings SET status = 'refunding' WHERE milestone_id = ? AND status = 'held' RETURNING *",
        )
        .get(milestone.id);
      if (!funding)
        return res
          .status(400)
          .json({ error: 'This milestone has no funds held in escrow to refund.' });

      try {
        await provider.refundTransaction({
          reference: funding.provider_reference,
          amountMinor: funding.amount_minor,
        });
        await transaction(async () => {
          await db
            .prepare("UPDATE milestone_fundings SET status = 'refund_pending' WHERE id = ?")
            .run(funding.id);
          await log(
            project.workspace_id,
            req.user.name,
            'Milestone refund requested',
            funding.id,
            milestone.title,
          );
        });
      } catch (error) {
        logHandledError(req, res, 'payment_refund_error', error);
        // PAY-02: a rejection (error.outcome === 'rejected', e.g. Paystack's own 4xx) means the
        // refund definitely did not happen — safe to label 'refund_failed'. Anything else
        // (network failure, 5xx) is genuinely ambiguous: the refund may have gone through on
        // Paystack's side even though this request never got a clean answer. Mislabeling that as
        // 'refund_failed' would look identical to a real rejection with no way to tell them
        // apart later; 'refund_unknown' instead flags it for manual reconciliation and — because
        // it isn't 'held' — still blocks any further automatic refund attempt on this funding.
        const status = error.outcome === 'rejected' ? 'refund_failed' : 'refund_unknown';
        await transaction(async () => {
          await db.prepare('UPDATE milestone_fundings SET status = ? WHERE id = ?').run(status, funding.id);
        });
        return res.status(502).json({
          error:
            status === 'refund_unknown'
              ? 'The payment provider did not confirm this refund. It requires manual reconciliation.'
              : 'The payment provider could not process this refund.',
        });
      }
      res
        .status(201)
        .json(await db.prepare('SELECT * FROM milestone_fundings WHERE id = ?').get(funding.id));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/milestones/:id/release', async (req, res, next) => {
    try {
      const input = releaseSchema.parse(req.body);
      const milestone = await milestoneFor(req.params.id);
      const project = await projectFor(milestone.project_id);
      const { isClient } = await requireParty(project, req.user.id);
      if (!isClient)
        return res
          .status(403)
          .json({ error: 'Only the project owner can release milestone payment.' });
      if (milestone.status !== 'approved')
        return res.status(400).json({
          error: `Milestone "${milestone.title}" is not yet approved (current status: ${milestone.status}).`,
        });
      const funding = await db
        .prepare("SELECT * FROM milestone_fundings WHERE milestone_id = ? AND status = 'held'")
        .get(milestone.id);
      if (!funding)
        return res
          .status(400)
          .json({ error: 'This milestone has no funds held in escrow to release.' });

      const account = await db
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

      // Atomically claim the milestone for release before ever calling the payout provider.
      // Nothing previously stopped two concurrent /release requests from both passing the checks
      // above (milestones.status stays 'approved' until the webhook eventually confirms the
      // transfer) and both paying the freelancer. A losing concurrent request's UPDATE affects no
      // rows and is rejected here instead of ever reaching provider.initiateTransfer().
      const claimed = await db
        .prepare(
          "UPDATE milestones SET status = 'releasing' WHERE id = ? AND status = 'approved' RETURNING id",
        )
        .get(milestone.id);
      if (!claimed)
        return res
          .status(409)
          .json({ error: 'This milestone payment is already being processed.' });

      const transferId = randomUUID();
      const reference = `LMD-${transferId.slice(0, 8)}`;
      await transaction(async () => {
        await db
          .prepare('INSERT INTO payment_transfers VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .run(
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
        await transaction(async () => {
          await db
            .prepare(
              "UPDATE payment_transfers SET status = 'processing', provider_reference = ?, updated_at = ? WHERE id = ?",
            )
            .run(result.providerReference, new Date().toISOString(), transferId);
          await log(
            project.workspace_id,
            req.user.name,
            'Milestone payment initiated',
            transferId,
            milestone.title,
          );
        });
      } catch (error) {
        logHandledError(req, res, 'payment_transfer_error', error);
        // PAY-02: only a definite rejection (error.outcome === 'rejected') justifies freeing the
        // milestone claim back to 'approved' for retry — "nothing was paid" is only known for
        // certain in that case. A network failure or 5xx is ambiguous: the transfer may have
        // been accepted by Paystack before the response was lost, so this milestone must stay
        // locked in 'releasing' (not silently retryable) and the transfer marked 'unknown' for
        // manual reconciliation, instead of risking a second real payout on retry.
        const isRejected = error.outcome === 'rejected';
        const status = isRejected ? 'failed' : 'unknown';
        await transaction(async () => {
          await db
            .prepare(
              "UPDATE payment_transfers SET status = ?, failure_reason = ?, updated_at = ? WHERE id = ?",
            )
            .run(status, error.message, new Date().toISOString(), transferId);
          if (isRejected)
            await db
              .prepare(
                "UPDATE milestones SET status = 'approved' WHERE id = ? AND status = 'releasing'",
              )
              .run(milestone.id);
        });
        return res.status(502).json({
          error: isRejected
            ? 'The payment provider could not initiate this transfer.'
            : 'The payment provider did not confirm this transfer. It requires manual reconciliation before retrying.',
        });
      }
      res
        .status(201)
        .json(await db.prepare('SELECT * FROM payment_transfers WHERE id = ?').get(transferId));
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
        const bundle = await db
          .prepare("SELECT * FROM bundles WHERE id = ? AND status = 'active'")
          .get(input.bundleId);
        if (!bundle)
          return res.status(404).json({ error: 'This bundle is not available for purchase.' });
        points = bundle.points_included;
        amountMinor = bundle.price_minor;
        currency = bundle.currency;
        bundleId = bundle.id;
      }
      const provider = deps.paymentProvider('paystack');
      if (!provider)
        return res
          .status(503)
          .json({ error: 'Paystack is not configured on this server. No purchase has been made.' });
      // Points/bundles are priced in USD internally (POINTS_UNIT_PRICE_MINOR, bundle.currency),
      // but this merchant's Paystack account only settles in NGN — convert only the amount sent
      // to Paystack, using the same fx_rates table /api/fx/convert reads. The stored purchase
      // row and points ledger stay in the canonical USD amount; the webhook reconciles by
      // `reference` and credits `purchase.points` (currency-independent), not by amount, so this
      // conversion can't desync them.
      let paystackAmountMinor = amountMinor;
      let paystackCurrency = currency;
      if (currency !== 'NGN') {
        const fxRow = await db
          .prepare('SELECT * FROM fx_rates WHERE pair = ?')
          .get(`${currency}_NGN`);
        if (!fxRow)
          return res.status(503).json({
            error: `No ${currency} to NGN exchange rate is configured. No purchase has been made.`,
          });
        paystackAmountMinor = Math.round(amountMinor * fxRow.rate);
        paystackCurrency = 'NGN';
      }
      const purchaseId = randomUUID();
      const reference = `LMD-PTS-${purchaseId.slice(0, 8)}`;
      // PAY-01: persisted before the provider is ever called — see the identical reasoning in
      // /api/milestones/:id/fund above.
      await transaction(async () => {
        await db
          .prepare(
            `INSERT INTO points_purchases
             (id, user_id, workspace_id, points, amount_minor, currency, provider, provider_reference, status, created_at, bundle_id, provider_amount_minor, provider_currency)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            purchaseId,
            req.user.id,
            req.workspace.id,
            points,
            amountMinor,
            currency,
            'paystack',
            reference,
            'awaiting_provider',
            new Date().toISOString(),
            bundleId,
            paystackAmountMinor,
            paystackCurrency,
          );
      });
      let init;
      try {
        init = await provider.initializeTransaction({
          amountMinor: paystackAmountMinor,
          currency: paystackCurrency,
          email: req.user.email || `${req.user.id}@lamidgrowth.internal`,
          reference,
        });
      } catch (error) {
        await db
          .prepare("UPDATE points_purchases SET status = 'init_failed' WHERE id = ?")
          .run(purchaseId);
        logHandledError(req, res, 'payment_purchase_init_error', error);
        return res.status(502).json({
          error: 'The payment provider could not initialize this transaction. No purchase has been made.',
        });
      }
      await transaction(async () => {
        await db
          .prepare("UPDATE points_purchases SET status = 'pending' WHERE id = ?")
          .run(purchaseId);
        await log(
          req.workspace.id,
          req.user.name,
          'Points purchase initiated',
          purchaseId,
          bundleId ? `bundle ${bundleId}` : `${points} points`,
        );
      });
      res
        .status(201)
        .json({ authorizationUrl: init.authorizationUrl, reference, points, amountMinor });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/points/purchases', async (req, res) => {
    res.json(
      await db
        .prepare('SELECT * FROM points_purchases WHERE user_id = ? ORDER BY created_at DESC')
        .all(req.user.id),
    );
  });
}

// PAY-02: a webhook reporting success is only trustworthy if it says the provider moved the
// amount and currency we actually asked it to move — otherwise a compromised/misconfigured
// provider integration (or a forged-but-signature-valid replay from a rotated key) could credit
// points or release escrow for an amount that was never really charged. Comparison is against
// what was *dispatched to the provider* (see the provider_amount_minor/provider_currency
// distinction for points_purchases), not necessarily the canonical internal amount.
function providerAmountMatches(event, expectedAmountMinor, expectedCurrency) {
  const reportedAmount = Number(event.data?.amount);
  const reportedCurrency = String(event.data?.currency || '').toUpperCase();
  return (
    Number.isFinite(reportedAmount) &&
    reportedAmount === expectedAmountMinor &&
    reportedCurrency === String(expectedCurrency || '').toUpperCase()
  );
}

export function mountPaystackWebhook(app, store, deps) {
  const { db, transaction } = store;
  app.post('/api/webhooks/paystack', async (req, res) => {
    const provider = deps.paymentProvider('paystack');
    if (!provider) return res.status(503).json({ error: 'Paystack is not configured.' });
    const signature = req.headers['x-paystack-signature'];
    if (!provider.verifyWebhookSignature(req.rawBody, signature))
      return res.status(401).json({ error: 'Invalid webhook signature.' });

    const event = req.body || {};
    const eventId = String(event.data?.reference || event.data?.id || '');
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
        if (event.event === 'transfer.success') {
          if (!providerAmountMatches(event, transfer.amount_minor, transfer.currency)) {
            await db
              .prepare(
                "UPDATE payment_transfers SET status = 'amount_mismatch', failure_reason = ?, updated_at = ? WHERE id = ?",
              )
              .run(
                `Webhook reported ${event.data?.amount} ${event.data?.currency}, expected ${transfer.amount_minor} ${transfer.currency}. Requires manual reconciliation.`,
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
        } else if (event.event === 'transfer.failed') {
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
            "SELECT * FROM points_purchases WHERE provider_reference = ? AND status = 'pending'",
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
        const funding = await db
          .prepare(
            "SELECT * FROM milestone_fundings WHERE provider_reference = ? AND status = 'pending'",
          )
          .get(eventId);
        if (funding) {
          if (!providerAmountMatches(event, funding.amount_minor, funding.currency)) {
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
      if (event.event === 'refund.processed' || event.event === 'refund.failed') {
        const funding = await db
          .prepare(
            "SELECT * FROM milestone_fundings WHERE provider_reference = ? AND status = 'refund_pending'",
          )
          .get(eventId);
        if (funding) {
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
