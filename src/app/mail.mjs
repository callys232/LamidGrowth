import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { errorDetails } from './errorLog.mjs';
import { recipientHash, reconcileDelivery } from './mailDelivery.mjs';

export function mailFrontendOrigin({ origin, production = false }) {
  const url = new URL(origin);
  if (
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    !['http:', 'https:'].includes(url.protocol) ||
    (production && url.protocol !== 'https:')
  )
    throw new Error(
      'Email links require a frontend HTTP origin (HTTPS in production), without paths or credentials.',
    );
  return url;
}

function retryAfter(value) {
  if (!value) return 0;
  const seconds = Number(value);
  const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - Date.now();
  return Number.isFinite(delay) ? Math.min(86400000, Math.max(0, delay)) : 0;
}
async function providerFailure(response, provider) {
  const body = await response.json().catch(() => ({}));
  const concurrent = response.status === 409 && body.name === 'concurrent_idempotent_requests';
  // Provider error messages can echo recipient data; retain only the HTTP status.
  return Object.assign(
    new Error(`${provider} rejected the email request (HTTP ${response.status}).`),
    {
      providerStatus: response.status,
      retryable: response.status >= 500 || [408, 429].includes(response.status) || concurrent,
      retryAfterMs: retryAfter(response.headers.get('retry-after')),
    },
  );
}

export function resendMailer({
  apiKey = process.env.RESEND_API_KEY,
  from = process.env.MAIL_FROM,
  fetcher = fetch,
} = {}) {
  if (!apiKey || !from) return null;
  return {
    provider: 'resend',
    async status(id) {
      const response = await fetcher(`https://api.resend.com/emails/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw await providerFailure(response, 'Resend');
      return (await response.json()).last_event;
    },
    async send(message, id) {
      const response = await fetcher('https://api.resend.com/emails', {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': id,
        },
        body: JSON.stringify({
          from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        }),
      });
      if (!response.ok) throw await providerFailure(response, 'Resend');
      const accepted = await response.json();
      if (typeof accepted.id !== 'string' || !accepted.id || accepted.id.length > 256)
        throw new Error('Resend returned no valid email identifier; acceptance is unconfirmed.');
      return { provider: 'resend', messageId: accepted.id };
    },
  };
}

export function sendgridMailer({
  apiKey = process.env.SENDGRID_API_KEY,
  from = process.env.MAIL_FROM,
  fetcher = fetch,
} = {}) {
  if (!apiKey || !from) return null;
  return {
    async send(message, id) {
      const response = await fetcher('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: message.to }], custom_args: { message_id: id } }],
          from: { email: from },
          ...(message.replyTo ? { reply_to: { email: message.replyTo } } : {}),
          subject: message.subject,
          content: [{ type: 'text/plain', value: message.text }],
        }),
      });
      // SendGrid returns 202 Accepted with no body on success; anything else is a delivery failure.
      if (!response.ok) throw await providerFailure(response, 'SendGrid');
      return { provider: 'sendgrid', messageId: response.headers.get('x-message-id') };
    },
  };
}

// Picks whichever provider has credentials configured — Resend takes priority since it's the
// current default (fast approval), so switching back to SendGrid later is just an env var change:
// unset RESEND_API_KEY and set SENDGRID_API_KEY, no code edit required.
export function defaultMailer() {
  return resendMailer() || sendgridMailer();
}

export function createMailOutbox(
  store,
  provider,
  key,
  errorLogger = (event, fields) => console.error(JSON.stringify({ event, ...fields })),
  table = 'mail_outbox',
) {
  if (!['mail_outbox', 'demo_mail_outbox'].includes(table)) throw new Error('Invalid mail table.');
  const { db, transaction } = store;
  const encrypt = (message) => {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const data = Buffer.concat([cipher.update(JSON.stringify(message), 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64')).join('.');
  };
  const decrypt = (payload) => {
    const [iv, tag, data] = payload.split('.').map((s) => Buffer.from(s, 'base64'));
    const cipher = createDecipheriv('aes-256-gcm', key, iv);
    cipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([cipher.update(data), cipher.final()]).toString('utf8'));
  };
  return {
    configured: Boolean(provider),
    async enqueue(id, user, message, expires, scheduledAt = Date.now()) {
      await db
        .prepare(`INSERT INTO ${table} VALUES (?, ?, ?, 'pending', 0, ?, NULL, ?, ?)`)
        .run(id, user, encrypt(message), scheduledAt, expires, Date.now());
    },
    async tick() {
      if (!provider) return;
      // A crash on the final claimed attempt cannot be retried safely indefinitely. It may
      // already have been accepted by the provider; preserve that uncertainty explicitly.
      const abandoned = await db
        .prepare(
          `UPDATE ${table} SET status = 'delivery_unknown', payload = '', lease_until = NULL
         WHERE status = 'sending' AND attempts >= 5 AND lease_until <= ?`,
        )
        .run(Date.now());
      if (abandoned.changes)
        errorLogger('mail_delivery_unknown', { table, count: abandoned.changes });
      // Each claim is atomic across workers; retries reuse the provider idempotency key.
      for (let i = 0; i < 10; i++) {
        const row = await transaction(async () => {
          const now = Date.now();
          const lease = now + 30000;
          await db
            .prepare(
              `UPDATE ${table} SET status = 'expired', payload = '' WHERE expires_at <= ? AND status IN ('pending','sending')`,
            )
            .run(now);
          // A plain SELECT-then-UPDATE would let two concurrent workers both read the same
          // eligible row before either claims it, both sending the same email. FOR UPDATE SKIP
          // LOCKED makes the claim itself the point of contention: a worker already holding a
          // row's lock (mid-transaction) makes every other worker's SELECT skip straight past it
          // to the next eligible row instead of blocking or double-claiming.
          const next = await db
            .prepare(
              `SELECT * FROM ${table} WHERE expires_at > ? AND attempts < 5 AND ((status = 'pending' AND next_at <= ?) OR (status = 'sending' AND lease_until <= ?)) ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED`,
            )
            .get(now, now, now);
          if (!next) return null;
          if (provider.provider === 'resend') {
            const max = Math.min(
              100,
              Math.max(1, Number(process.env.MAIL_REQUESTS_PER_SECOND) || 2),
            );
            const budget = await db
              .prepare(
                `INSERT INTO rate_limit_buckets VALUES ('mail:resend:send', 1, ?)
              ON CONFLICT (key) DO UPDATE SET count = CASE WHEN rate_limit_buckets.reset_at <= ? THEN 1 ELSE rate_limit_buckets.count + 1 END,
              reset_at = CASE WHEN rate_limit_buckets.reset_at <= ? THEN ? ELSE rate_limit_buckets.reset_at END RETURNING count`,
              )
              .get(now + 1000, now, now, now + 1000);
            if (budget.count > max) return null;
          }
          await db
            .prepare(
              `UPDATE ${table} SET status = 'sending', attempts = attempts + 1, lease_until = ? WHERE id = ?`,
            )
            .run(lease, next.id);
          return { ...next, claimAttempt: next.attempts + 1, claimLease: lease };
        });
        if (!row) break;
        try {
          const message = decrypt(row.payload);
          const hash = recipientHash(message.to, key);
          const metadata = await db
            .prepare(
              `INSERT INTO mail_messages (outbox_table, queue_id, recipient_hash, first_attempt_at, status_at)
            VALUES (?, ?, ?, ?, ?) ON CONFLICT (outbox_table, queue_id) DO UPDATE SET recipient_hash = EXCLUDED.recipient_hash RETURNING *`,
            )
            .get(table, row.id, hash, row.attempts ? 0 : Date.now(), Date.now());
          const suppressed = await db
            .prepare('SELECT scope FROM mail_suppressions WHERE recipient_hash = ?')
            .get(hash);
          const optional = table === 'demo_mail_outbox' && row.id.startsWith('demo-followup:');
          if (suppressed && (suppressed.scope === 'all' || optional)) {
            await db
              .prepare(
                `UPDATE ${table} SET status = 'suppressed', payload = '', lease_until = NULL WHERE id = ? AND status = 'sending' AND attempts = ? AND lease_until = ?`,
              )
              .run(row.id, row.claimAttempt, row.claimLease);
            await db
              .prepare(
                "UPDATE mail_messages SET delivery_status = 'suppressed', status_at = ? WHERE outbox_table = ? AND queue_id = ?",
              )
              .run(Date.now(), table, row.id);
            continue;
          }
          // Leave an hour of margin inside Resend's 24-hour idempotency window. Legacy
          // retries without a recorded first attempt require review rather than blind resends.
          if (
            !metadata.first_attempt_at ||
            Date.now() - metadata.first_attempt_at >= 23 * 3600000
          ) {
            await db
              .prepare(
                `UPDATE ${table} SET status = 'delivery_unknown', payload = '', lease_until = NULL WHERE id = ? AND status = 'sending' AND attempts = ? AND lease_until = ?`,
              )
              .run(row.id, row.claimAttempt, row.claimLease);
            errorLogger('mail_retry_window_exceeded', { table, messageId: row.id });
            continue;
          }
          if (table === 'demo_mail_outbox' && row.id.startsWith('demo-followup:')) {
            const lead = await db
              .prepare('SELECT followup_opt_in, converted_at FROM demo_registrations WHERE id = ?')
              .get(row.user_id);
            if (!lead?.followup_opt_in || lead.converted_at) {
              await db
                .prepare(
                  `UPDATE ${table} SET status = 'cancelled', payload = '', lease_until = NULL WHERE id = ? AND status = 'sending' AND attempts = ? AND lease_until = ?`,
                )
                .run(row.id, row.claimAttempt, row.claimLease);
              continue;
            }
          }
          const accepted = await provider.send(message, row.id);
          if (accepted?.messageId && accepted?.provider)
            await transaction(async () => {
              await db
                .prepare(
                  `UPDATE mail_messages SET provider = ?, provider_message_id = ?, delivery_status = CASE WHEN delivery_status = 'pending' THEN 'accepted' ELSE delivery_status END
              WHERE outbox_table = ? AND queue_id = ?`,
                )
                .run(accepted.provider, accepted.messageId, table, row.id);
              await reconcileDelivery(db, table, row.id);
            });
          const recorded = await db
            .prepare(
              `UPDATE ${table} SET status = 'sent', payload = '', lease_until = NULL WHERE id = ? AND status = 'sending' AND attempts = ? AND lease_until = ?`,
            )
            .run(row.id, row.claimAttempt, row.claimLease);
          errorLogger('mail_provider_accepted', {
            messageId: row.id,
            table,
            recorded: Boolean(recorded.changes),
            ...(accepted?.provider ? { provider: accepted.provider } : {}),
            ...(accepted?.messageId ? { providerMessageId: accepted.messageId } : {}),
          });
        } catch (error) {
          const failed = row.claimAttempt >= 5 || error.retryable === false;
          const delay = Math.max(15000 * 2 ** (row.claimAttempt - 1), error.retryAfterMs || 0);
          const updated = await db
            .prepare(
              `UPDATE ${table} SET status = ?, next_at = ?, lease_until = NULL, payload = CASE WHEN ?::boolean THEN ? ELSE payload END WHERE id = ? AND status = 'sending' AND attempts = ? AND lease_until = ?`,
            )
            .run(
              failed ? 'failed' : 'pending',
              Date.now() + delay,
              failed,
              '',
              row.id,
              row.claimAttempt,
              row.claimLease,
            );
          if (!updated.changes) continue;
          errorLogger('mail_delivery_retry', {
            messageId: row.id,
            attempt: row.attempts + 1,
            failed,
            error: errorDetails(error),
          });
        }
      }
    },
  };
}
