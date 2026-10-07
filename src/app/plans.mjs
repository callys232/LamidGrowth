/**
 * Plans — Free, Personal, Professional, Team, Enterprise (see the "LAMID ONE Plan Structure" doc).
 *
 * A workspace's plan decides which tool seats it can use, how many people it can hold and the
 * points it receives each month. The signup context no longer decides access; it still tailors
 * content. Seats bought as one-time bundles before plans existed keep granting access through
 * workspace_agent_entitlements, and workspaces that existed before plans keep the seats their
 * context used to open (plan_grandfathered_seats), so nobody loses access on the switch.
 *
 * Billing reuses the app's existing Paystack path: the first payment is a normal checkout
 * confirmed by the signed charge.success webhook; Paystack returns a reusable card
 * authorization, which the scheduler charges at each renewal. Prices are in USD minor units and
 * converted to NGN for Paystack exactly as points purchases are (settlementAmount).
 */
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { logHandledError } from './errorLog.mjs';

export const SEATS = ['Clarity', 'Consistency', 'Growth', 'Finance', 'Capability'];

export const PLANS = {
  free: {
    id: 'free', name: 'Free', seats: ['Clarity'], members: 1,
    monthlyMinor: 0, annualMinor: 0, monthlyPoints: 0, selfServe: false,
    summary: 'Try LAMID ONE with the strategy and decision tools. Includes the 500-point welcome reward once your account is verified.',
  },
  personal: {
    id: 'personal', name: 'Personal', seats: ['Clarity', 'Consistency'], members: 1,
    monthlyMinor: 2500, annualMinor: 25000, monthlyPoints: 600, selfServe: true,
    summary: 'For individuals and creators: strategy, decision, operations, risk and governance tools.',
  },
  professional: {
    id: 'professional', name: 'Professional', seats: ['Clarity', 'Consistency', 'Growth', 'Finance'], members: 1,
    monthlyMinor: 3900, annualMinor: 39000, monthlyPoints: 1500, selfServe: true,
    summary: 'For professionals, founders and consultants: adds the growth, change and finance tools.',
  },
  team: {
    id: 'team', name: 'Team', seats: [...SEATS], members: 10, perPerson: true, minPeople: 3, maxPeople: 10,
    monthlyMinor: 2900, annualMinor: 29000, monthlyPoints: 1000, selfServe: true,
    summary: 'For teams and small businesses: every tool, including the people tools, for 3 to 10 people.',
  },
  enterprise: {
    id: 'enterprise', name: 'Enterprise', seats: [...SEATS], members: 200, byQuote: true,
    monthlyMinor: null, annualMinor: null, monthlyPoints: null, selfServe: false,
    summary: 'For large organisations and institutions: every tool, up to 200 people or more by agreement.',
  },
};

/** An extra seat on Personal or Professional. */
export const SEAT_ADDON = { monthlyMinor: 900, annualMinor: 9000 };
/** Days a lapsed paid plan keeps working while a failed renewal is retried. */
export const GRACE_DAYS = 3;
const DAY = 86_400_000;

/** Seats each signup context opened before plans existed — kept for workspaces created then. */
const CONTEXT_SEATS = {
  Individual: ['Clarity'],
  Creator: ['Clarity'],
  Professional: ['Clarity', 'Consistency'],
  Founder: ['Clarity', 'Consistency', 'Growth'],
  SME: ['Clarity', 'Consistency', 'Growth', 'Finance'],
  Team: [...SEATS],
  Institution: [...SEATS],
  Enterprise: [...SEATS],
};
export const grandfatheredSeatsFor = (context) => CONTEXT_SEATS[context] ?? ['Clarity'];

export class PlanError extends Error {
  constructor(msg, status = 400) {
    super(msg);
    this.status = status;
  }
}

/** Adds calendar months (month-end safe: Jan 31 + 1 month = Feb 28/29). */
export function addMonths(iso, months) {
  const d = new Date(iso);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString();
}

const parseSeats = (json) => {
  try {
    const v = JSON.parse(json ?? '[]');
    return Array.isArray(v) ? v.filter((s) => SEATS.includes(s)) : [];
  } catch {
    return [];
  }
};

/** The plan in force now: enterprise tier always wins; a paid plan lapses to Free once its period
 * plus the grace window has passed. A plan with no period end (granted by an admin) never lapses. */
export function effectivePlan(workspace, now = Date.now()) {
  if (workspace?.tier === 'enterprise') return 'enterprise';
  const plan = PLANS[workspace?.plan] ? workspace.plan : 'free';
  if (plan === 'free' || !workspace.plan_period_end) return plan;
  if (workspace.plan_status === 'ended') return 'free';
  return Date.parse(workspace.plan_period_end) + GRACE_DAYS * DAY > now ? plan : 'free';
}

/** Every seat this workspace can use: its plan's, paid add-ons while the plan is live, and seats
 * kept from before plans existed. One-time seat bundles are checked separately (entitlements). */
export function seatsFor(workspace, now = Date.now()) {
  const plan = effectivePlan(workspace, now);
  const seats = new Set(PLANS[plan].seats);
  if (plan !== 'free') for (const s of parseSeats(workspace.plan_extra_seats)) seats.add(s);
  for (const s of parseSeats(workspace.plan_grandfathered_seats)) seats.add(s);
  return seats;
}

const checkoutSchema = z
  .object({
    plan: z.enum(['personal', 'professional', 'team']),
    interval: z.enum(['monthly', 'annual']),
    people: z.number().int().min(1).max(10).optional(),
    extraSeats: z.array(z.enum(SEATS)).max(4).optional(),
  })
  .strict();

/** Price, points and limits for a self-serve plan choice. Throws PlanError for an invalid one. */
export function quote(input) {
  const { plan: planId, interval, people: rawPeople, extraSeats = [] } = checkoutSchema.parse(input);
  const plan = PLANS[planId];
  const people = plan.perPerson ? (rawPeople ?? plan.minPeople) : 1;
  if (plan.perPerson && (people < plan.minPeople || people > plan.maxPeople))
    throw new PlanError(`The Team plan is for ${plan.minPeople} to ${plan.maxPeople} people. Above that, talk to us about Enterprise.`);
  const extras = [...new Set(extraSeats)];
  if (extras.length && plan.perPerson) throw new PlanError('Team already includes every tool seat.');
  const already = extras.filter((s) => plan.seats.includes(s));
  if (already.length) throw new PlanError(`${plan.name} already includes ${already.join(', ')}.`);
  const unit = interval === 'annual' ? plan.annualMinor : plan.monthlyMinor;
  const addon = interval === 'annual' ? SEAT_ADDON.annualMinor : SEAT_ADDON.monthlyMinor;
  return {
    plan: planId,
    interval,
    people,
    extraSeats: extras,
    amountMinor: unit * people + addon * extras.length,
    currency: 'USD',
    monthlyPoints: plan.monthlyPoints * people,
    members: plan.perPerson ? people : plan.members,
    seats: [...plan.seats, ...extras],
  };
}

/** Public plan list for the pricing page. */
export function publicPlans(toolsBySeat = {}) {
  return Object.values(PLANS).map((p) => ({
    id: p.id,
    name: p.name,
    summary: p.summary,
    seats: p.seats,
    tools: p.seats.reduce((n, s) => n + (toolsBySeat[s] ?? 0), 0),
    members: p.perPerson ? { min: p.minPeople, max: p.maxPeople } : { max: p.members },
    perPerson: Boolean(p.perPerson),
    byQuote: Boolean(p.byQuote),
    selfServe: p.selfServe,
    monthlyMinor: p.monthlyMinor,
    annualMinor: p.annualMinor,
    monthlyPoints: p.monthlyPoints,
    currency: 'USD',
  }));
}

/** Credits the monthly points allowance to the billing user and books the next one, for as long
 * as the paid period runs. Safe to call repeatedly: it only grants what is due. */
export async function grantDueAllowances(store, now = new Date()) {
  const { db, transaction } = store;
  const due = await db
    .prepare(
      "SELECT * FROM workspaces WHERE plan_status = 'active' AND plan_next_allowance_at IS NOT NULL AND plan_next_allowance_at <= ? AND plan_period_end > ? AND plan_billing_user_id IS NOT NULL",
    )
    .all(now.toISOString(), now.toISOString());
  let granted = 0;
  for (const ws of due) {
    const plan = PLANS[ws.plan];
    if (!plan?.monthlyPoints) continue;
    const points = plan.monthlyPoints * (plan.perPerson ? ws.plan_people || plan.minPeople : 1);
    await transaction(async () => {
      // Claim this allowance by moving the pointer first; a concurrent run then finds nothing due.
      const next = addMonths(ws.plan_next_allowance_at, 1);
      const claimed = await db
        .prepare('UPDATE workspaces SET plan_next_allowance_at = ? WHERE id = ? AND plan_next_allowance_at = ?')
        .run(next < ws.plan_period_end ? next : null, ws.id, ws.plan_next_allowance_at);
      if (claimed.changes !== 1) return;
      await db.prepare('UPDATE users SET points_balance = points_balance + ? WHERE id = ?').run(points, ws.plan_billing_user_id);
      await db
        .prepare('INSERT INTO points_ledger VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(randomUUID(), ws.plan_billing_user_id, ws.id, points, 'plan_allowance', ws.id, Date.now());
      granted++;
    });
  }
  return granted;
}

/** Activates or renews a plan once Paystack confirms the payment. Called inside the webhook's
 * transaction (payments.mjs), after the amount check, so it runs exactly once per payment. */
export async function activatePlanPayment(store, payment, event) {
  const { db, log } = store;
  const ws = await db.prepare('SELECT * FROM workspaces WHERE id = ?').get(payment.workspace_id);
  const now = new Date().toISOString();
  const sameLivePlan =
    payment.kind === 'renewal' && ws.plan === payment.plan && ws.plan_period_end && ws.plan_period_end > now;
  const start = sameLivePlan ? ws.plan_period_end : now;
  const end = addMonths(start, payment.interval === 'annual' ? 12 : 1);
  const auth = event.data?.authorization;
  const reusable = auth?.reusable && auth?.authorization_code ? auth.authorization_code : null;
  const plan = PLANS[payment.plan];
  await db
    .prepare(
      `UPDATE workspaces SET plan = ?, plan_interval = ?, plan_people = ?, plan_extra_seats = ?, plan_period_end = ?,
         plan_status = 'active', plan_cancel_at_period_end = CASE WHEN ? = 'renewal' THEN plan_cancel_at_period_end ELSE 0 END,
         plan_authorization = COALESCE(?, plan_authorization), plan_billing_email = COALESCE(?, plan_billing_email),
         plan_billing_user_id = ?, plan_next_allowance_at = COALESCE(plan_next_allowance_at, ?),
         member_limit = CASE WHEN tier = 'enterprise' THEN member_limit ELSE ? END
       WHERE id = ?`,
    )
    .run(
      payment.plan,
      payment.interval,
      payment.people,
      payment.extra_seats,
      end,
      payment.kind,
      reusable,
      event.data?.customer?.email ?? null,
      payment.user_id,
      start < now ? now : start,
      plan.perPerson ? payment.people : plan.members,
      ws.id,
    );
  // A new subscription or a plan change starts its allowance now.
  if (payment.kind !== 'renewal')
    await db.prepare('UPDATE workspaces SET plan_next_allowance_at = ? WHERE id = ?').run(now, ws.id);
  await db
    .prepare("UPDATE plan_payments SET status = 'completed', completed_at = ? WHERE id = ?")
    .run(now, payment.id);
  await log(ws.id, 'Billing', payment.kind === 'renewal' ? 'Plan renewed' : 'Plan started', payment.id, `${plan.name} until ${end.slice(0, 10)}`);
}

/** Renews plans whose period ends within a day, using the saved card authorization; ends plans
 * that were cancelled or cannot be charged. Returns counts for monitoring. */
export async function runPlanRenewals(store, provider, settle, now = new Date()) {
  const { db, transaction, log } = store;
  const soon = new Date(now.getTime() + DAY).toISOString();
  const iso = now.toISOString();
  const result = { charged: 0, failed: 0, ended: 0 };

  // Cancelled, or nothing to charge: the plan simply ends at period end.
  const ending = await db
    .prepare(
      "SELECT id FROM workspaces WHERE plan_status IN ('active','past_due') AND plan_period_end IS NOT NULL AND plan_period_end <= ? AND (plan_cancel_at_period_end = 1 OR plan_authorization IS NULL)",
    )
    .all(iso);
  for (const ws of ending) {
    await db.prepare("UPDATE workspaces SET plan_status = 'ended', plan_next_allowance_at = NULL WHERE id = ?").run(ws.id);
    await log(ws.id, 'Billing', 'Plan ended', ws.id, 'Returned to Free');
    result.ended++;
  }
  // Past due beyond grace: stop retrying.
  await db
    .prepare("UPDATE workspaces SET plan_status = 'ended', plan_next_allowance_at = NULL WHERE plan_status = 'past_due' AND plan_period_end <= ?")
    .run(new Date(now.getTime() - GRACE_DAYS * DAY).toISOString());

  if (!provider) return result;
  const due = await db
    .prepare(
      "SELECT * FROM workspaces WHERE plan_status IN ('active','past_due') AND plan_cancel_at_period_end = 0 AND plan_authorization IS NOT NULL AND plan_period_end <= ? AND plan IN ('personal','professional','team')",
    )
    .all(soon);
  for (const ws of due) {
    // One renewal attempt per period per day: skip if one is already pending or tried today.
    const recent = await db
      .prepare(
        "SELECT 1 FROM plan_payments WHERE workspace_id = ? AND kind = 'renewal' AND period_end = ? AND (status IN ('pending','awaiting_provider','completed') OR created_at > ?) LIMIT 1",
      )
      .get(ws.id, ws.plan_period_end, new Date(now.getTime() - DAY).toISOString());
    if (recent) continue;
    let q;
    try {
      q = quote({ plan: ws.plan, interval: ws.plan_interval || 'monthly', ...(PLANS[ws.plan].perPerson ? { people: ws.plan_people || 3 } : {}), extraSeats: parseSeats(ws.plan_extra_seats) });
    } catch {
      continue;
    }
    const charge = await settle(db, q.amountMinor, q.currency);
    if (!charge) continue;
    const id = randomUUID();
    const reference = `LMD-PLN-${id.slice(0, 8)}`;
    await transaction(async () => {
      await db
        .prepare(
          `INSERT INTO plan_payments (id, workspace_id, user_id, plan, interval, people, extra_seats, amount_minor, currency,
             provider_amount_minor, provider_currency, provider_reference, kind, status, period_end, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'renewal', 'awaiting_provider', ?, ?)`,
        )
        .run(id, ws.id, ws.plan_billing_user_id, ws.plan, q.interval, q.people, JSON.stringify(q.extraSeats), q.amountMinor, q.currency, charge.amountMinor, charge.currency, reference, ws.plan_period_end, iso);
    });
    try {
      const res = await provider.chargeAuthorization({
        authorizationCode: ws.plan_authorization,
        email: ws.plan_billing_email,
        amountMinor: charge.amountMinor,
        currency: charge.currency,
        reference,
      });
      // Activation happens on the charge.success webhook, the single path that credits anything.
      const failed = res.status === 'failed' || res.status === 'abandoned';
      await db.prepare('UPDATE plan_payments SET status = ? WHERE id = ?').run(failed ? 'failed' : 'pending', id);
      if (failed) {
        await db.prepare("UPDATE workspaces SET plan_status = 'past_due' WHERE id = ?").run(ws.id);
        result.failed++;
      } else result.charged++;
    } catch (error) {
      await db.prepare("UPDATE plan_payments SET status = 'failed', failure_reason = ? WHERE id = ?").run(String(error.message).slice(0, 300), id);
      await db.prepare("UPDATE workspaces SET plan_status = 'past_due' WHERE id = ?").run(ws.id);
      result.failed++;
    }
  }
  return result;
}

const ownerOnly = (req, res) => {
  if (req.workspace.role !== 'owner') {
    res.status(403).json({ error: 'Only the workspace owner can change the plan.' });
    return false;
  }
  return true;
};

function planView(ws, payments = []) {
  const plan = effectivePlan(ws);
  return {
    plan,
    name: PLANS[plan].name,
    status: plan === 'free' ? 'free' : (ws.plan_status ?? 'active'),
    interval: ws.plan_interval ?? null,
    people: ws.plan_people ?? null,
    periodEnd: ws.plan_period_end ?? null,
    cancelAtPeriodEnd: Boolean(ws.plan_cancel_at_period_end),
    autoRenew: Boolean(ws.plan_authorization) && !ws.plan_cancel_at_period_end,
    seats: [...seatsFor(ws)],
    extraSeats: parseSeats(ws.plan_extra_seats),
    keptSeats: parseSeats(ws.plan_grandfathered_seats),
    memberLimit: ws.member_limit,
    payments: payments.map((p) => ({ id: p.id, plan: p.plan, interval: p.interval, amountMinor: p.amount_minor, currency: p.currency, kind: p.kind, status: p.status, createdAt: p.created_at })),
  };
}

/** Public: the plan list. */
export function mountPublicPlans(app, { toolsBySeat }) {
  app.get('/api/plans', (req, res) => {
    res.json({ plans: publicPlans(toolsBySeat()), seatAddon: { ...SEAT_ADDON, currency: 'USD' }, graceDays: GRACE_DAYS });
  });
}

/** Signed-in: the workspace's plan, checkout, cancel and resume. */
export function mountPlans(app, store, deps) {
  const { db, transaction, log } = store;
  const load = (id) => db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id);

  app.get('/api/plan', async (req, res) => {
    const ws = await load(req.workspace.id);
    const payments = await db
      .prepare('SELECT * FROM plan_payments WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 12')
      .all(ws.id);
    res.json(planView(ws, payments));
  });

  app.post('/api/plan/quote', (req, res, next) => {
    try {
      res.json(quote(req.body ?? {}));
    } catch (error) {
      next(error instanceof z.ZodError ? Object.assign(new Error('Choose a plan and a billing interval.'), { status: 400 }) : error);
    }
  });

  app.post('/api/plan/checkout', async (req, res, next) => {
    try {
      if (!ownerOnly(req, res)) return;
      if (req.workspace.tier === 'enterprise')
        return res.status(409).json({ error: 'This workspace is on Enterprise. Contact us to change it.' });
      const q = quote(req.body ?? {});
      const members = await db
        .prepare("SELECT COUNT(*)::int AS n FROM workspace_members WHERE workspace_id = ? AND status = 'active'")
        .get(req.workspace.id);
      if (members.n > q.members)
        return res.status(409).json({ error: `This workspace has ${members.n} people; ${PLANS[q.plan].name} allows ${q.members}. Choose Team with enough people, or remove members first.` });
      const provider = deps.paymentProvider('paystack');
      if (!provider)
        return res.status(503).json({ error: 'Paystack is not configured on this server. No payment has been taken.' });
      const charge = await deps.settlementAmount(db, q.amountMinor, q.currency);
      if (!charge)
        return res.status(503).json({ error: `No ${q.currency} to NGN exchange rate is configured. No payment has been taken.` });
      const id = randomUUID();
      const reference = `LMD-PLN-${id.slice(0, 8)}`;
      await transaction(async () => {
        await db
          .prepare(
            `INSERT INTO plan_payments (id, workspace_id, user_id, plan, interval, people, extra_seats, amount_minor, currency,
               provider_amount_minor, provider_currency, provider_reference, kind, status, period_end, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', 'awaiting_provider', NULL, ?)`,
          )
          .run(id, req.workspace.id, req.user.id, q.plan, q.interval, q.people, JSON.stringify(q.extraSeats), q.amountMinor, q.currency, charge.amountMinor, charge.currency, reference, new Date().toISOString());
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
        await db.prepare("UPDATE plan_payments SET status = 'init_failed' WHERE id = ?").run(id);
        logHandledError(req, res, 'plan_checkout_init_error', error);
        return res.status(502).json({ error: 'The payment provider could not start this checkout. No payment has been taken.' });
      }
      await db.prepare("UPDATE plan_payments SET status = 'pending' WHERE id = ?").run(id);
      await log(req.workspace.id, req.user.name, 'Plan checkout started', id, `${PLANS[q.plan].name}, ${q.interval}`);
      res.status(201).json({ authorizationUrl: init.authorizationUrl, reference, quote: q });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: 'Choose a plan and a billing interval.' });
      next(error);
    }
  });

  app.post('/api/plan/cancel', async (req, res) => {
    if (!ownerOnly(req, res)) return;
    const ws = await load(req.workspace.id);
    if (effectivePlan(ws) === 'free' || !ws.plan_period_end)
      return res.status(409).json({ error: 'There is no paid plan to cancel.' });
    await db.prepare('UPDATE workspaces SET plan_cancel_at_period_end = 1 WHERE id = ?').run(ws.id);
    await log(ws.id, req.user.name, 'Plan set to end', ws.id, `at ${ws.plan_period_end.slice(0, 10)}`);
    res.json(planView(await load(ws.id)));
  });

  app.post('/api/plan/resume', async (req, res) => {
    if (!ownerOnly(req, res)) return;
    const ws = await load(req.workspace.id);
    if (!ws.plan_cancel_at_period_end) return res.status(409).json({ error: 'The plan is not set to end.' });
    await db.prepare('UPDATE workspaces SET plan_cancel_at_period_end = 0 WHERE id = ?').run(ws.id);
    res.json(planView(await load(ws.id)));
  });
}
