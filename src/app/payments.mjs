import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { POINTS_UNIT_PRICE_MINOR } from './billing.mjs';
import { logHandledError } from './errorLog.mjs';

export function paystackProvider({
  secretKey = process.env.PAYSTACK_SECRET_KEY,
  fetchImpl = fetch,
} = {}) {
  if (!secretKey) return null;
  return {
    name: 'Paystack',
    async listBanks() {
      const banks = [];
      let cursor = '';
      for (let page = 0; page < 20; page++) {
        const url = new URL('https://api.paystack.co/bank');
        url.search = new URLSearchParams({
          country: 'nigeria',
          currency: 'NGN',
          use_cursor: 'true',
          perPage: '100',
          ...(cursor ? { next: cursor } : {}),
        }).toString();
        const response = await fetchImpl(url.toString(), {
          headers: { Authorization: `Bearer ${secretKey}` },
        });
        const body = await response.json();
        if (!response.ok || !body.status || !Array.isArray(body.data))
          throw new Error('Unable to load supported banks. Please try again.');
        banks.push(
          ...body.data
            .filter((b) => b.active !== false)
            .map((b) => ({ name: b.name, code: b.code })),
        );
        if (!body.meta?.next) return banks;
        cursor = body.meta.next;
      }
      throw new Error('The bank list could not be loaded completely. Please try again.');
    },
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
        throw Object.assign(
          new Error(`Network error contacting Paystack: ${networkError.message}`),
          {
            outcome: 'unknown',
          },
        );
      }
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.status)
        throw Object.assign(
          new Error(body.message || 'Paystack could not initiate this transfer.'),
          {
            outcome: response.status >= 500 ? 'unknown' : 'rejected',
          },
        );
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
    /** Charges a saved card authorization (plan renewals). The result is only provisional: the
     * plan is renewed by the signed charge.success webhook, never by this response. */
    async chargeAuthorization({ authorizationCode, email, amountMinor, currency, reference }) {
      const response = await fetchImpl('https://api.paystack.co/transaction/charge_authorization', {
        method: 'POST',
        headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorization_code: authorizationCode,
          email,
          amount: amountMinor,
          currency,
          reference,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.status)
        throw new Error(body.message || 'Paystack could not charge the saved card.');
      return { status: body.data?.status ?? 'pending' };
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
        throw Object.assign(
          new Error(`Network error contacting Paystack: ${networkError.message}`),
          {
            outcome: 'unknown',
          },
        );
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
    /** Read-only provider lookup for an operator investigation. Never creates a payment. */
    async inspectPayment({ kind, reference, refundId }) {
      const get = async (path) => {
        const response = await fetchImpl(`https://api.paystack.co${path}`, {
          headers: { Authorization: `Bearer ${secretKey}` },
          signal: AbortSignal.timeout(15000),
        });
        const body = await response.json();
        if (!response.ok || !body.status || !body.data)
          throw Object.assign(
            new Error('Provider verification failed. No financial state was changed.'),
            { status: 502 },
          );
        return body.data;
      };
      if (!['charge', 'transfer', 'refund'].includes(kind)) throw new Error('Unsupported lookup');
      if (kind === 'refund' && !/^\d+$/.test(String(refundId || '')))
        throw Object.assign(new Error('Enter the provider refund ID.'), { status: 400 });
      const data = await get(
        kind === 'refund'
          ? `/refund/${encodeURIComponent(refundId)}`
          : `/${kind === 'transfer' ? 'transfer' : 'transaction'}/verify/${encodeURIComponent(reference)}`,
      );
      let correlated = data.reference || data.transaction_reference || data.transaction?.reference;
      if (kind === 'refund' && !correlated && data.transaction) {
        const transaction = await get(`/transaction/${encodeURIComponent(data.transaction)}`);
        correlated = transaction.reference;
      }
      return {
        reference: correlated || null,
        status: String(data.status || ''),
        amount: Number(data.amount),
        currency: String(data.currency || '').toUpperCase(),
        providerId: data.id == null ? null : String(data.id),
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

// USDT uses TRON (TRC-20). A merchant provider and credentials are still needed
// before checkout, confirmation, refunds and payouts can be enabled.
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
    toolIds: z.array(z.string().trim().min(1)).min(1).max(300).optional(),
    extraPoints: z.number().int().min(0).max(100000).optional(),
  })
  .strict()
  .refine(
    (value) =>
      [value.points, value.bundleId, value.toolIds].filter((v) => v != null).length === 1 &&
      (value.extraPoints == null || value.toolIds != null),
    {
      message: 'Provide exactly one of points, bundleId or toolIds. Extra points require toolIds.',
    },
  );

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

  app.get('/api/payment-accounts', async (req, res) => {
    const rows = await db
      .prepare(
        'SELECT id, provider, account_name, account_number, recipient_code, created_at FROM payment_accounts WHERE user_id = ? ORDER BY created_at DESC',
      )
      .all(req.user.id);
    res.json(
      rows.map(({ recipient_code, account_number, ...row }) => ({
        ...row,
        lastFour: account_number.slice(-4),
        ready: Boolean(recipient_code),
      })),
    );
  });
  app.get('/api/payment-banks', async (_req, res) => {
    const provider = providerFor('paystack');
    if (!provider?.listBanks)
      return res
        .status(503)
        .json({ error: 'Bank selection is unavailable until the payment provider is configured.' });
    res.json(await provider.listBanks());
  });
  app.get('/api/payment-transfers', async (req, res) => {
    res.json(
      await db
        .prepare(
          `SELECT payment_transfers.id, COALESCE(payment_transfers.provider_amount_minor, payment_transfers.amount_minor) AS amount_minor,
      COALESCE(payment_transfers.provider_currency, payment_transfers.currency) AS currency, payment_transfers.status,
      payment_transfers.created_at, milestones.title AS milestone_title, projects.title AS project_title
      FROM payment_transfers JOIN milestones ON milestones.id = payment_transfers.milestone_id
      JOIN projects ON projects.id = milestones.project_id WHERE projects.freelancer_user_id = ? ORDER BY payment_transfers.created_at DESC`,
        )
        .all(req.user.id),
    );
  });
  app.get('/api/payment-providers', (_req, res) =>
    res.json({
      paystack: Boolean(providerFor('paystack')),
      crypto_usdt: Boolean(providerFor('crypto_usdt')),
      crypto_usdt_network: 'TRC20',
    }),
  );
  app.post('/api/payment-accounts', async (req, res, next) => {
    try {
      const input = accountSchema.parse(req.body);
      const provider = providerFor(input.provider);
      if (!provider)
        return res
          .status(503)
          .json({ error: 'This payout provider is unavailable. No bank details have been saved.' });
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

  // Every project the user is party to, with milestones, latest funding and transfers, in one call
  // (replaces the browser's per-project and per-milestone fan-out). Same scope as GET /api/projects.
  // Money is shown only to the client and the assigned freelancer, as the funding route requires.
  app.get('/api/workspace/escrow-summary', async (req, res) => {
    const userId = req.user.id;
    const projects = await db
      .prepare(
        `SELECT projects.id, projects.title, projects.status, projects.created_at,
           projects.freelancer_user_id, job_posts.client_user_id
         FROM projects JOIN job_posts ON job_posts.id = projects.job_id
         WHERE job_posts.client_user_id = ? OR projects.freelancer_user_id = ?
           OR EXISTS (SELECT 1 FROM expert_team_members WHERE team_id = projects.assigned_team_id AND user_id = ?)
         ORDER BY projects.created_at DESC`,
      )
      .all(userId, userId, userId);
    const within = (ids) => ids.map(() => '?').join(', ');
    const projectIds = projects.map((project) => project.id);
    const milestones = projectIds.length
      ? await db
          .prepare(
            `SELECT id, project_id, title, description, amount, currency, status, created_at
             FROM milestones WHERE project_id IN (${within(projectIds)}) ORDER BY created_at`,
          )
          .all(...projectIds)
      : [];
    const isParty = (project) =>
      project.client_user_id === userId || project.freelancer_user_id === userId;
    const moneyIds = milestones
      .filter((milestone) => isParty(projects.find((p) => p.id === milestone.project_id)))
      .map((milestone) => milestone.id);
    const fundings = moneyIds.length
      ? await db
          .prepare(
            `SELECT * FROM milestone_fundings WHERE milestone_id IN (${within(moneyIds)})
             ORDER BY created_at DESC`,
          )
          .all(...moneyIds)
      : [];
    const transfers = moneyIds.length
      ? await db
          .prepare(
            `SELECT id, milestone_id, status, failure_reason, created_at,
               COALESCE(provider_amount_minor, amount_minor) AS amount_minor,
               COALESCE(provider_currency, currency) AS currency
             FROM payment_transfers WHERE milestone_id IN (${within(moneyIds)})
             ORDER BY created_at DESC`,
          )
          .all(...moneyIds)
      : [];
    res.json({
      projects: projects.map(({ client_user_id, freelancer_user_id, ...project }) => {
        const isClient = client_user_id === userId;
        const isFreelancer = freelancer_user_id === userId;
        return {
          ...project,
          isClient,
          isFreelancer,
          isTeamMember: !isClient && !isFreelancer,
          milestones: milestones
            .filter((milestone) => milestone.project_id === project.id)
            .map((milestone) => ({
              ...milestone,
              amount: Number(milestone.amount),
              funding: fundings.find((funding) => funding.milestone_id === milestone.id) ?? null,
              transfers: transfers.filter((transfer) => transfer.milestone_id === milestone.id),
            })),
        };
      }),
    });
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
          "SELECT 1 FROM milestone_fundings WHERE milestone_id = ? AND status NOT IN ('init_failed', 'refunded')",
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
      const amountMinor = milestone.amount * 100;
      const charge = await settlementAmount(db, amountMinor, milestone.currency);
      if (!charge)
        return res.status(503).json({
          error: `No ${milestone.currency} to NGN exchange rate is configured. No funds have been held.`,
        });
      const fundingId = randomUUID();
      const reference = `LMD-FUND-${fundingId.slice(0, 8)}`;
      // PAY-01: the record is persisted, with its reference, BEFORE the provider is ever called
      // — a crash or DB hiccup between "Paystack accepted this" and "we saved that" would
      // otherwise leave a real pending transaction with no local trace to reconcile against.
      // 'awaiting_provider' marks that gap explicitly; it becomes 'pending' only once dispatch is
      // confirmed. A known initialization failure can be retried; every active or uncertain
      // funding blocks another checkout until it is reconciled.
      await transaction(async () => {
        // Serialize funding claims across processes, including the gap before provider dispatch.
        await db.prepare('SELECT id FROM milestones WHERE id = ? FOR UPDATE').get(milestone.id);
        const claimed = await db
          .prepare(
            "SELECT 1 FROM milestone_fundings WHERE milestone_id = ? AND status NOT IN ('init_failed', 'refunded')",
          )
          .get(milestone.id);
        if (claimed)
          throw Object.assign(new Error('This milestone already has an active funding.'), {
            status: 409,
          });
        await db
          .prepare(
            `INSERT INTO milestone_fundings
               (id, milestone_id, workspace_id, provider, amount_minor, currency, provider_reference,
                status, created_at, held_at, released_at, refunded_at, provider_amount_minor, provider_currency)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
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
            charge.amountMinor,
            charge.currency,
          );
      });
      let init;
      try {
        init = await provider.initializeTransaction({
          amountMinor: charge.amountMinor,
          currency: charge.currency,
          email: req.user.email || `${req.user.id}@lamidgrowth.internal`,
          reference,
        });
      } catch (error) {
        await db
          .prepare("UPDATE milestone_fundings SET status = 'init_failed' WHERE id = ?")
          .run(fundingId);
        logHandledError(req, res, 'payment_fund_init_error', error);
        return res.status(502).json({
          error:
            'The payment provider could not initialize this transaction. No funds have been held.',
        });
      }
      await transaction(async () => {
        await db
          .prepare(
            "UPDATE milestone_fundings SET status = 'pending' WHERE id = ? AND status = 'awaiting_provider'",
          )
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
        providerAmountMinor: charge.amountMinor,
        providerCurrency: charge.currency,
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
      const agreed = await db
        .prepare(
          `SELECT 1 FROM disputes d JOIN records r
        ON r.kind = 'dispute_resolution' AND r.data::jsonb ->> 'disputeId' = d.id
        WHERE d.subject_type = 'milestone' AND d.subject_id = ? AND d.status = 'resolved_refund'
        AND r.data::jsonb ->> 'status' = 'accepted' AND r.data::jsonb ->> 'outcome' = 'refund'
        AND r.data::jsonb ->> 'respondedBy' IS NOT NULL
        AND r.data::jsonb ->> 'respondedBy' <> r.data::jsonb ->> 'proposedBy'`,
        )
        .get(milestone.id);
      if (!agreed)
        return res.status(409).json({
          error:
            'Both parties must accept a refund resolution in Disputes before requesting a refund.',
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
          amountMinor: funding.provider_amount_minor ?? funding.amount_minor,
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
          await db
            .prepare('UPDATE milestone_fundings SET status = ? WHERE id = ?')
            .run(status, funding.id);
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
          'SELECT * FROM payment_accounts WHERE user_id = ? AND provider = ? AND recipient_code IS NOT NULL ORDER BY created_at DESC LIMIT 1',
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

      // Pay out exactly what escrow holds, in the currency it was charged in — not a re-conversion
      // at today's rate, which could pay more (or less) than the client actually put in.
      const payout = {
        amountMinor: funding.provider_amount_minor ?? milestone.amount * 100,
        currency: funding.provider_currency ?? milestone.currency,
      };
      const transferId = randomUUID();
      const reference = `LMD-${transferId.slice(0, 8)}`;
      await transaction(async () => {
        await db
          .prepare(
            `INSERT INTO payment_transfers
               (id, workspace_id, milestone_id, provider, amount_minor, currency, recipient_code,
                status, provider_reference, failure_reason, created_at, updated_at,
                provider_amount_minor, provider_currency)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            transferId,
            project.workspace_id,
            milestone.id,
            input.provider,
            milestone.amount * 100,
            milestone.currency,
            account.recipient_code,
            'pending',
            reference,
            null,
            new Date().toISOString(),
            new Date().toISOString(),
            payout.amountMinor,
            payout.currency,
          );
      });

      try {
        const result = await provider.initiateTransfer({
          amountMinor: payout.amountMinor,
          currency: payout.currency,
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
              'UPDATE payment_transfers SET status = ?, failure_reason = ?, updated_at = ? WHERE id = ?',
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
      let customTools = null;
      if (input.toolIds) {
        customTools = [];
        for (const id of new Set(input.toolIds)) {
          const tool = await db
            .prepare('SELECT id, points_cost FROM agent_manifests WHERE id = ?')
            .get(id);
          if (!tool)
            return res
              .status(400)
              .json({ error: 'An unknown tool was selected. Refresh the catalog.' });
          customTools.push(tool);
        }
        points = customTools.reduce((sum, tool) => sum + tool.points_cost, input.extraPoints || 0);
        if (points < 1 || points > 100000)
          return res
            .status(400)
            .json({ error: 'The bundle must contain between 1 and 100000 points.' });
        amountMinor = points * POINTS_UNIT_PRICE_MINOR;
        bundleId = randomUUID();
      }
      if (input.bundleId) {
        const bundle = await db
          .prepare("SELECT * FROM bundles WHERE id = ? AND status = 'active'")
          .get(input.bundleId);
        if (!bundle)
          return res.status(404).json({ error: 'This bundle is not available for purchase.' });
        if (bundle.billing_cycle !== 'one_time')
          return res.status(409).json({
            error:
              'This legacy bundle needs its billing terms corrected before purchase. Choose a one-time bundle or a subscription plan.',
          });
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
      const charge = await settlementAmount(db, amountMinor, currency);
      if (!charge)
        return res.status(503).json({
          error: `No ${currency} to NGN exchange rate is configured. No purchase has been made.`,
        });
      const { amountMinor: paystackAmountMinor, currency: paystackCurrency } = charge;
      const purchaseId = randomUUID();
      const reference = `LMD-PTS-${purchaseId.slice(0, 8)}`;
      // PAY-01: persisted before the provider is ever called — see the identical reasoning in
      // /api/milestones/:id/fund above.
      await transaction(async () => {
        if (customTools) {
          const now = new Date().toISOString();
          await db
            .prepare(
              `INSERT INTO bundles (id,name,description,price_minor,currency,points_included,billing_cycle,status,created_by,created_at,updated_at)
            VALUES (?, 'Custom tool bundle', 'One-time custom selection', ?, ?, ?, 'one_time', 'draft', ?, ?, ?)`,
            )
            .run(bundleId, amountMinor, currency, points, req.user.id, now, now);
          for (const tool of customTools)
            await db
              .prepare(
                'INSERT INTO bundle_items (id,bundle_id,agent_id,created_at) VALUES (?,?,?,?)',
              )
              .run(randomUUID(), bundleId, tool.id, now);
        }
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
          error:
            'The payment provider could not initialize this transaction. No purchase has been made.',
        });
      }
      await transaction(async () => {
        await db
          .prepare(
            "UPDATE points_purchases SET status = 'pending' WHERE id = ? AND status = 'awaiting_provider'",
          )
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

/** What Paystack is actually asked to move for a canonical amount: this merchant's account
 * settles in NGN only, so other currencies are converted with the fx_rates table (the same
 * rates /api/fx/convert reads). Null when no rate is configured — callers must refuse rather
 * than send an unsettleable currency. */
export async function settlementAmount(db, amountMinor, currency) {
  if (currency === 'NGN') return { amountMinor, currency };
  const fxRow = await db.prepare('SELECT rate FROM fx_rates WHERE pair = ?').get(`${currency}_NGN`);
  if (!fxRow) return null;
  return { amountMinor: Math.round(amountMinor * fxRow.rate), currency: 'NGN' };
}

export { mountPaystackWebhook } from './paymentWebhook.mjs';
