import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { reconcileDelivery, outcome } from './mailDelivery.mjs';

export async function mailHealth(store) {
  const queues = [];
  for (const table of ['mail_outbox', 'demo_mail_outbox']) {
    const rows = await store.db
      .prepare(`SELECT status, COUNT(*) AS count FROM ${table} GROUP BY status`)
      .all();
    const due = await store.db
      .prepare(
        `SELECT COUNT(*) AS count, MIN(next_at) AS oldest FROM ${table} WHERE status = 'pending' AND next_at <= ?`,
      )
      .get(Date.now());
    const leases = await store.db
      .prepare(
        `SELECT COUNT(*) AS count FROM ${table} WHERE status = 'sending' AND lease_until < ?`,
      )
      .get(Date.now());
    queues.push({
      table,
      statuses: rows,
      due: due.count,
      oldestDueAt: due.oldest,
      expiredLeases: leases.count,
    });
  }
  const heartbeat = await store.db
    .prepare(
      'SELECT MAX(completed_at) AS completed, MAX(failed_at) AS failed FROM mail_worker_health',
    )
    .get();
  const workerHealthy = Boolean(
    heartbeat.completed &&
    Date.now() - heartbeat.completed < 120000 &&
    (!heartbeat.failed || heartbeat.failed < heartbeat.completed),
  );
  const warnings = [];
  if (!workerHealthy) warnings.push('Mail worker has no recent successful heartbeat.');
  for (const queue of queues) {
    if (queue.oldestDueAt && Date.now() - queue.oldestDueAt > 300000)
      warnings.push(`${queue.table}: messages have waited over five minutes.`);
    if (queue.expiredLeases) warnings.push(`${queue.table}: expired sending leases need recovery.`);
    if (
      queue.statuses.some((row) => ['failed', 'delivery_unknown'].includes(row.status) && row.count)
    )
      warnings.push(`${queue.table}: failed or uncertain messages need review.`);
  }
  const problems = await store.db
    .prepare(
      "SELECT COUNT(*) AS count FROM mail_messages WHERE reviewed_at IS NULL AND delivery_status IN ('bounced','complained','failed','suppressed')",
    )
    .get();
  if (problems.count)
    warnings.push(
      `${problems.count} provider outcomes require review (bounce, complaint, suppression or failure).`,
    );
  return {
    workerHealthy,
    lastCompletedAt: heartbeat.completed,
    queues,
    warnings,
    healthy: !warnings.length,
  };
}

export function mountMailOperations(app, store, { adminEmails, provider }) {
  const admin = (req, res, next) => {
    if (!adminEmails.includes(req.user?.email))
      return res.status(403).json({ error: 'Ecosystem administrator access required.' });
    res.setHeader('Cache-Control', 'no-store');
    next();
  };
  app.get('/api/admin/mail/health', admin, async (_req, res) => res.json(await mailHealth(store)));
  app.get('/api/admin/mail/messages', admin, async (_req, res) => {
    const messages = [];
    for (const table of ['mail_outbox', 'demo_mail_outbox']) {
      messages.push(
        ...(await store.db
          .prepare(
            `SELECT '${table}' AS outbox_table, q.id AS queue_id,
        q.status AS queue_status, q.created_at, m.provider, m.provider_message_id,
        m.delivery_status, m.reviewed_at, m.status_at FROM ${table} q LEFT JOIN mail_messages m
        ON m.outbox_table = '${table}' AND m.queue_id = q.id ORDER BY q.created_at DESC LIMIT 50`,
          )
          .all()),
      );
    }
    res.json(messages.sort((a, b) => b.created_at - a.created_at).slice(0, 50));
  });
  app.post('/api/admin/mail/reconcile', admin, async (req, res) => {
    const input = z
      .object({
        table: z.enum(['mail_outbox', 'demo_mail_outbox']),
        queueId: z.string().min(1).max(256),
      })
      .strict()
      .parse(req.body);
    const message = await store.db
      .prepare('SELECT * FROM mail_messages WHERE outbox_table = ? AND queue_id = ?')
      .get(input.table, input.queueId);
    if (!message?.provider_message_id || message.provider !== 'resend')
      return res.status(409).json({
        error:
          'No Resend message identifier is available. Review provider logs before requesting a fresh link.',
      });
    if (!provider?.status)
      return res.status(503).json({ error: 'Provider reconciliation is unavailable.' });
    const status = await provider.status(message.provider_message_id);
    const event = ['opened', 'clicked'].includes(status) ? 'email.delivered' : `email.${status}`;
    if (!outcome(event))
      return res
        .status(409)
        .json({ error: 'Provider has no conclusive status. No email was resent.' });
    await store.transaction(async () => {
      await store.db
        .prepare(
          'INSERT INTO mail_provider_events VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (event_id) DO NOTHING',
        )
        .run(
          `reconcile:${message.provider_message_id}:${event}`,
          message.provider_message_id,
          message.recipient_hash,
          event,
          Date.now(),
          Date.now(),
        );
      if (['email.bounced', 'email.complained', 'email.suppressed'].includes(event))
        await store.db
          .prepare(
            `INSERT INTO mail_suppressions VALUES (?, ?, ?, ?) ON CONFLICT (recipient_hash) DO UPDATE SET scope = 'all', reason = EXCLUDED.reason`,
          )
          .run(message.recipient_hash, 'all', event, Date.now());
      await reconcileDelivery(store.db, input.table, input.queueId);
      await store.db
        .prepare(
          `UPDATE ${input.table} SET status = 'sent', payload = '', lease_until = NULL WHERE id = ? AND status = 'delivery_unknown'`,
        )
        .run(input.queueId);
    });
    await store.db
      .prepare('INSERT INTO administration_audit VALUES (?, ?, ?, ?, ?)')
      .run(
        randomUUID(),
        req.user.id,
        `Mail status reconciled: ${event}`,
        input.queueId,
        new Date().toISOString(),
      );
    res.json({ ok: true, status: event, resent: false });
  });
  app.post('/api/admin/mail/acknowledge', admin, async (req, res) => {
    const input = z
      .object({
        table: z.enum(['mail_outbox', 'demo_mail_outbox']),
        queueId: z.string().min(1).max(256),
        reason: z.string().trim().min(10).max(300),
      })
      .strict()
      .parse(req.body);
    await store.transaction(async () => {
      const row = await store.db
        .prepare(`SELECT status FROM ${input.table} WHERE id = ? FOR UPDATE`)
        .get(input.queueId);
      const message = await store.db
        .prepare(
          'SELECT delivery_status FROM mail_messages WHERE outbox_table = ? AND queue_id = ? FOR UPDATE',
        )
        .get(input.table, input.queueId);
      if (
        !row ||
        (!['failed', 'delivery_unknown'].includes(row.status) &&
          !['failed', 'bounced', 'complained', 'suppressed'].includes(message?.delivery_status))
      )
        throw Object.assign(
          new Error('Only a failed, uncertain or adverse delivery result can be acknowledged.'),
          { status: 409 },
        );
      if (['failed', 'delivery_unknown'].includes(row.status))
        await store.db
          .prepare(
            `UPDATE ${input.table} SET status = ?, payload = '', lease_until = NULL WHERE id = ?`,
          )
          .run(`reviewed_${row.status}`, input.queueId);
      await store.db
        .prepare('UPDATE mail_messages SET reviewed_at = ? WHERE outbox_table = ? AND queue_id = ?')
        .run(Date.now(), input.table, input.queueId);
      await store.db
        .prepare('INSERT INTO administration_audit VALUES (?, ?, ?, ?, ?)')
        .run(
          randomUUID(),
          req.user.id,
          `Mail result reviewed: ${input.reason}`,
          input.queueId,
          new Date().toISOString(),
        );
    });
    res.json({ ok: true, resent: false, deliveryConfirmed: false });
  });
}
