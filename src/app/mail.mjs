import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

export function resendMailer({ apiKey = process.env.RESEND_API_KEY, from = process.env.MAIL_FROM, fetcher = fetch } = {}) {
  if (!apiKey || !from) return null;
  return { async send(message, id) {
    const response = await fetcher('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': id },
      body: JSON.stringify({ from, to: [message.to], subject: message.subject, text: message.text }),
    });
    if (!response.ok) throw new Error(`Mail delivery failed (${response.status}).`);
  } };
}

export function sendgridMailer({ apiKey = process.env.SENDGRID_API_KEY, from = process.env.MAIL_FROM, fetcher = fetch } = {}) {
  if (!apiKey || !from) return null;
  return { async send(message, id) {
    const response = await fetcher('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST', signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: message.to }], custom_args: { message_id: id } }],
        from: { email: from },
        subject: message.subject,
        content: [{ type: 'text/plain', value: message.text }],
      }),
    });
    // SendGrid returns 202 Accepted with no body on success; anything else is a delivery failure.
    if (!response.ok) throw new Error(`Mail delivery failed (${response.status}).`);
  } };
}

// Picks whichever provider has credentials configured — Resend takes priority since it's the
// current default (fast approval), so switching back to SendGrid later is just an env var change:
// unset RESEND_API_KEY and set SENDGRID_API_KEY, no code edit required.
export function defaultMailer() {
  return resendMailer() || sendgridMailer();
}

export function createMailOutbox(store, provider, key) {
  const { db, transaction } = store;
  const encrypt = (message) => {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const data = Buffer.concat([cipher.update(JSON.stringify(message), 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), data].map(b => b.toString('base64')).join('.');
  };
  const decrypt = (payload) => {
    const [iv, tag, data] = payload.split('.').map(s => Buffer.from(s, 'base64'));
    const cipher = createDecipheriv('aes-256-gcm', key, iv);
    cipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([cipher.update(data), cipher.final()]).toString('utf8'));
  };
  return {
    configured: Boolean(provider),
    async enqueue(id, user, message, expires) {
      await db.prepare("INSERT INTO mail_outbox VALUES (?, ?, ?, 'pending', 0, ?, NULL, ?, ?)").run(id, user, encrypt(message), Date.now(), expires, Date.now());
    },
    async tick() {
      if (!provider) return;
      // Each claim is atomic across workers; retries reuse the provider idempotency key.
      for (let i = 0; i < 10; i++) {
        const row = await transaction(async () => {
          const now = Date.now();
          await db.prepare("UPDATE mail_outbox SET status = 'expired', payload = '' WHERE expires_at <= ? AND status IN ('pending','sending')").run(now);
          // A plain SELECT-then-UPDATE would let two concurrent workers both read the same
          // eligible row before either claims it, both sending the same email. FOR UPDATE SKIP
          // LOCKED makes the claim itself the point of contention: a worker already holding a
          // row's lock (mid-transaction) makes every other worker's SELECT skip straight past it
          // to the next eligible row instead of blocking or double-claiming.
          const next = await db.prepare("SELECT * FROM mail_outbox WHERE expires_at > ? AND attempts < 5 AND ((status = 'pending' AND next_at <= ?) OR (status = 'sending' AND lease_until <= ?)) ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED").get(now, now, now);
          if (!next) return null;
          await db.prepare("UPDATE mail_outbox SET status = 'sending', attempts = attempts + 1, lease_until = ? WHERE id = ?").run(now + 30000, next.id);
          return next;
        });
        if (!row) break;
        try {
          await provider.send(decrypt(row.payload), row.id);
          await db.prepare("UPDATE mail_outbox SET status = 'sent', payload = '', lease_until = NULL WHERE id = ?").run(row.id);
        } catch {
          const failed = row.attempts + 1 >= 5;
          await db.prepare('UPDATE mail_outbox SET status = ?, next_at = ?, lease_until = NULL, payload = CASE WHEN ?::boolean THEN ? ELSE payload END WHERE id = ?').run(failed ? 'failed' : 'pending', Date.now() + 15000 * 2 ** row.attempts, failed, '', row.id);
          console.error(JSON.stringify({ event: 'mail_delivery_retry', messageId: row.id, attempt: row.attempts + 1, failed }));
        }
      }
    },
  };
}
