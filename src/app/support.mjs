import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { defaultMailer } from './mail.mjs';
import { createRateLimiter } from './ratelimit.mjs';
import { errorDetails } from './errorLog.mjs';

export const SUPPORT_TOPICS = ['Product use', 'Account access', 'Billing', 'Something else'];

const supportSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(254),
    topic: z.enum(SUPPORT_TOPICS),
    message: z.string().trim().min(10).max(5000),
    // Honeypot: hidden from people, filled in by naive bots.
    website: z.string().max(200).optional(),
  })
  .strict();

// Header-safe: a name or topic must never smuggle a newline into the mail subject.
const oneLine = (value) => value.replace(/[\r\n]+/g, ' ');

// Public "Contact support" form. Anonymous visitors have no user row, so this can't use the
// per-user mail_outbox — it sends straight through the provider and reports failure to the
// visitor so they can retry or email directly.
export function mountPublicSupport(
  app,
  store,
  {
    mailProvider = defaultMailer(),
    supportEmail = process.env.SUPPORT_EMAIL || 'hp@lamidconsulting.com',
    errorLogger = () => {},
  } = {},
) {
  const limiter = createRateLimiter(store, {
    namespace: 'support-form',
    windowMs: 60 * 60_000,
    max: 5,
    message: 'Too many support messages from this connection. Please try again later.',
  });
  app.post('/api/support', limiter, async (req, res) => {
    const input = supportSchema.parse(req.body);
    if (input.website) return res.status(202).json({ ok: true });
    if (!mailProvider)
      return res.status(503).json({
        error: `Support messages can't be sent right now. Please email ${supportEmail} directly.`,
      });
    const id = randomUUID();
    try {
      await mailProvider.send(
        {
          to: supportEmail,
          replyTo: input.email,
          subject: oneLine(`[Support] ${input.topic} — ${input.name}`),
          text: [
            `Name: ${input.name}`,
            `Email: ${input.email}`,
            `Topic: ${input.topic}`,
            '',
            input.message,
            '',
            `— Sent from the LAMID ONE support form (ref ${id})`,
          ].join('\n'),
        },
        id,
      );
    } catch (error) {
      errorLogger('support_mail_failed', { requestId: req.requestId, error: errorDetails(error) });
      return res.status(502).json({
        error: `Your message couldn't be sent. Please try again, or email ${supportEmail} directly.`,
      });
    }
    res.status(202).json({ ok: true, reference: id.slice(0, 8) });
  });
}
