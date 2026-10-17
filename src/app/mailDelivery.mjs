import { createHmac } from 'node:crypto';
import { Webhook } from 'svix';
import { z } from 'zod';

export const recipientHash = (address, key) =>
  createHmac('sha256', key).update(`mail-recipient:${address.trim().toLowerCase()}`).digest('hex');
const priority = {
  pending: 0,
  accepted: 1,
  delayed: 2,
  delivered: 3,
  failed: 4,
  bounced: 5,
  suppressed: 6,
  complained: 7,
};
export const outcome = (event) =>
  ({
    'email.sent': 'accepted',
    'email.delivered': 'delivered',
    'email.delivery_delayed': 'delayed',
    'email.failed': 'failed',
    'email.bounced': 'bounced',
    'email.complained': 'complained',
    'email.suppressed': 'suppressed',
  })[event];

/** Events can arrive before the send API returns. Reconcile only the matching recipient. */
export async function reconcileDelivery(db, table, queueId) {
  const message = await db
    .prepare('SELECT * FROM mail_messages WHERE outbox_table = ? AND queue_id = ? FOR UPDATE')
    .get(table, queueId);
  if (!message?.provider_message_id) return;
  const events = await db
    .prepare(
      'SELECT * FROM mail_provider_events WHERE provider_message_id = ? AND recipient_hash = ? ORDER BY occurred_at',
    )
    .all(message.provider_message_id, message.recipient_hash);
  let status = message.delivery_status,
    at = message.status_at;
  for (const event of events) {
    const next = outcome(event.event_type);
    if (
      next &&
      (priority[next] > (priority[status] ?? 0) || (next === status && event.occurred_at > at))
    ) {
      status = next;
      at = event.occurred_at;
    }
  }
  await db
    .prepare(
      'UPDATE mail_messages SET reviewed_at = CASE WHEN delivery_status <> ? THEN NULL ELSE reviewed_at END, delivery_status = ?, status_at = ? WHERE outbox_table = ? AND queue_id = ?',
    )
    .run(status, status, at, table, queueId);
}

export function mountResendWebhook(
  app,
  store,
  { key, secret = process.env.RESEND_WEBHOOK_SECRET } = {},
) {
  app.post('/api/webhooks/resend', async (req, res) => {
    if (!secret || !key) return res.status(503).json({ error: 'Mail webhook is not configured.' });
    let verified;
    const eventId = req.get('svix-id');
    if (!eventId || eventId.length > 256 || !Buffer.isBuffer(req.rawBody))
      return res.status(400).json({ error: 'Invalid mail webhook.' });
    try {
      new Webhook(secret).verify(req.rawBody.toString('utf8'), {
        'svix-id': eventId,
        'svix-timestamp': req.get('svix-timestamp'),
        'svix-signature': req.get('svix-signature'),
      });
      verified = JSON.parse(req.rawBody.toString('utf8'));
    } catch {
      return res.status(401).json({ error: 'Invalid mail webhook signature or timestamp.' });
    }
    if (!outcome(verified?.type)) return res.json({ ok: true, ignored: true });
    const parsed = z
      .object({
        type: z.string(),
        created_at: z.string().datetime({ offset: true }),
        data: z
          .object({
            email_id: z.string().min(1).max(256),
            to: z.array(z.string().email().max(254)).min(1).max(50),
            bounce: z
              .object({ type: z.string().max(40) })
              .passthrough()
              .optional(),
          })
          .passthrough(),
      })
      .safeParse(verified);
    if (!parsed.success || Date.parse(parsed.data.created_at) > Date.now() + 300000)
      return res.status(400).json({ error: 'Malformed mail webhook event.' });
    const event = parsed.data;
    // One Resend delivery event now represents one recipient. Reject ambiguous multi-recipient
    // outcomes rather than deduplicating away recipients under the same receipt identifier.
    if (event.data.to.length !== 1)
      return res.status(400).json({ error: 'Expected one delivery recipient.' });
    const hash = recipientHash(event.data.to[0], key);
    const duplicate = await store.transaction(async () => {
      const inserted = await store.db
        .prepare(
          'INSERT INTO mail_provider_events VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (event_id) DO NOTHING RETURNING event_id',
        )
        .get(
          eventId,
          event.data.email_id,
          hash,
          event.type,
          Date.parse(event.created_at),
          Date.now(),
        );
      if (!inserted) return true;
      if (['email.bounced', 'email.complained', 'email.suppressed'].includes(event.type)) {
        const scope =
          event.type !== 'email.bounced' || event.data.bounce?.type === 'Permanent'
            ? 'all'
            : 'optional';
        await store.db
          .prepare(
            `INSERT INTO mail_suppressions VALUES (?, ?, ?, ?) ON CONFLICT (recipient_hash) DO UPDATE SET
          scope = CASE WHEN mail_suppressions.scope = 'all' THEN 'all' ELSE EXCLUDED.scope END,
          reason = EXCLUDED.reason, created_at = EXCLUDED.created_at`,
          )
          .run(hash, scope, event.type, Date.now());
      }
      const message = await store.db
        .prepare(
          "SELECT outbox_table, queue_id FROM mail_messages WHERE provider = 'resend' AND provider_message_id = ?",
        )
        .get(event.data.email_id);
      if (message) await reconcileDelivery(store.db, message.outbox_table, message.queue_id);
      return false;
    });
    res.json({ ok: true, duplicate });
  });
}
