import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createRateLimiter } from './ratelimit.mjs';

const INBOX = () => process.env.CONTACT_INBOX || 'hp@lamidconsulting.com';
const clean = (value) => value.replace(/[\r\n]+/g, ' ').trim();

const topics = ['Product question', 'Pricing', 'Expert help', 'Enterprise', 'Complaint', 'Other'];

/** Public contact form: emails the inquiry to the team inbox, with the sender as reply-to. */
export function mountContact(app, store, { provider }) {
  const limiter = (namespace, max, windowMs) =>
    createRateLimiter(store, {
      namespace,
      max,
      windowMs,
      message: 'Too many messages. Please try again later.',
    });
  app.post(
    '/api/contact',
    limiter('contact-hour', 5, 60 * 60_000),
    limiter('contact-day', 15, 24 * 60 * 60_000),
    async (req, res) => {
      const input = z
        .object({
          name: z.string().trim().min(1).max(100),
          email: z.string().trim().email().max(254),
          topic: z.enum(topics).default('Other'),
          message: z.string().trim().min(10).max(4000),
          company: z.string().max(200).optional(),
        })
        .strict()
        .parse(req.body);
      // Hidden field: real people leave it empty, so a filled value is a bot. Pretend success.
      if (input.company) return res.status(202).json({ ok: true });
      if (!provider)
        return res
          .status(503)
          .json({ error: 'Messages cannot be sent right now. Please email us directly.' });
      await provider.send(
        {
          to: INBOX(),
          replyTo: input.email,
          subject: `[LamidOne contact] ${input.topic} — ${clean(input.name)}`,
          text: `Topic: ${input.topic}\nName: ${clean(input.name)}\nEmail: ${input.email}\n\n${input.message}\n`,
        },
        randomUUID(),
      );
      res.status(202).json({ ok: true });
    },
  );
}
