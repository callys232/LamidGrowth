import { z } from 'zod';
import { requirePermission } from './policy.mjs';

const currencyCode = z.string().regex(/^[A-Z]{3}$/);
const rateSchema = z.object({ from: currencyCode, to: currencyCode, rate: z.number().positive() }).strict();

export function mountFx(app, store) {
  const { db } = store;

  app.get('/api/fx/convert', (req, res) => {
    const input = z
      .object({
        amount: z.coerce.number().finite(),
        from: currencyCode,
        to: currencyCode,
      })
      .parse(req.query);
    if (input.from === input.to)
      return res.json({ amount: input.amount, from: input.from, to: input.to, converted: input.amount, rate: 1, asOf: null });
    const row = db.prepare('SELECT * FROM fx_rates WHERE pair = ?').get(`${input.from}_${input.to}`);
    if (!row)
      return res.status(404).json({ error: `No indicative rate is available for ${input.from} to ${input.to}.` });
    res.json({
      amount: input.amount,
      from: input.from,
      to: input.to,
      converted: Math.round(input.amount * row.rate * 100) / 100,
      rate: row.rate,
      asOf: row.updated_at,
      note: 'Indicative rate for display only; does not affect stored amounts or settlement.',
    });
  });

  app.patch('/api/fx/rates', requirePermission('workspace:manage'), (req, res) => {
    const input = rateSchema.parse(req.body);
    const pair = `${input.from}_${input.to}`;
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO fx_rates (pair, rate, updated_at) VALUES (?, ?, ?) ON CONFLICT(pair) DO UPDATE SET rate = excluded.rate, updated_at = excluded.updated_at',
    ).run(pair, input.rate, now);
    res.json({ pair, rate: input.rate, updatedAt: now });
  });
}
