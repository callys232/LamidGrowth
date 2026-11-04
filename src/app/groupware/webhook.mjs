import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { getGroupwareConfig } from './config.mjs';
import { processInboundSync } from './sync.mjs';

const webhookPayloadSchema = z.object({
  eventId: z.string().trim().min(1).max(128),
  entityType: z.enum(['user', 'client_conversion', 'project', 'milestone', 'payment', 'escrow', 'review', 'communication']),
  entityId: z.string().trim().min(1).max(128),
  action: z.enum(['create', 'update', 'delete', 'promote', 'status_change']),
  payload: z.record(z.unknown()),
  timestamp: z.number().int().positive().optional(),
});

/**
 * Mounts the inbound Groupware webhook receiver.
 * Must be mounted early (before session/cookie auth middleware) as external webhook callers
 * have no session cookie, but authenticate via HMAC signature (Rule 04 & 06).
 */
export function mountGroupwareWebhook(app, store, options = {}) {
  const config = getGroupwareConfig(options);

  app.post('/api/groupware/webhook', async (req, res) => {
    // 1. Signature Verification
    const signature = req.get('X-Groupware-Signature') || '';
    const timestampStr = req.get('X-Groupware-Timestamp') || '';

    if (!config.webhookSecret) {
      return res.status(503).json({ error: 'Groupware webhook integration not configured.' });
    }

    if (!signature) {
      return res.status(401).json({ error: 'Missing X-Groupware-Signature header.' });
    }

    // 2. Replay Protection: Check timestamp within 5 minutes
    if (timestampStr) {
      const ts = Number.parseInt(timestampStr, 10);
      const now = Date.now();
      if (Number.isNaN(ts) || Math.abs(now - ts) > 5 * 60 * 1000) {
        return res.status(401).json({ error: 'Webhook timestamp expired or invalid.' });
      }
    }

    // 3. Compute expected signature over raw body
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
    const payloadToSign = timestampStr ? `${timestampStr}.${rawBody.toString('utf8')}` : rawBody;
    const expected = createHmac('sha256', config.webhookSecret)
      .update(payloadToSign)
      .digest('hex');

    const expectedBuf = Buffer.from(expected, 'hex');
    const signatureBuf = Buffer.from(signature, 'hex');

    if (
      signatureBuf.length !== expectedBuf.length ||
      !timingSafeEqual(signatureBuf, expectedBuf)
    ) {
      // Fallback check: try signing rawBody alone if timestamp header wasn't prefixed
      const fallbackExpected = createHmac('sha256', config.webhookSecret)
        .update(rawBody)
        .digest('hex');
      const fallbackBuf = Buffer.from(fallbackExpected, 'hex');
      if (
        signatureBuf.length !== fallbackBuf.length ||
        !timingSafeEqual(signatureBuf, fallbackBuf)
      ) {
        return res.status(401).json({ error: 'Invalid webhook signature.' });
      }
    }

    // 4. Input Validation & Sanitization (Rule 05)
    let parsedEvent;
    try {
      parsedEvent = webhookPayloadSchema.parse(req.body);
    } catch (validationErr) {
      return res.status(400).json({ error: 'Malformed webhook payload structure.', details: validationErr.errors });
    }

    // 5. Inbound Sync Processing (Idempotent & Audited)
    try {
      const result = await processInboundSync(store, parsedEvent);
      return res.status(200).json({ ok: true, ...result });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to process Groupware sync event.', message: err.message });
    }
  });
}

