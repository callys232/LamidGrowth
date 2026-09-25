import { randomUUID } from 'node:crypto';

const fail = (message, status) => {
  throw Object.assign(new Error(message), { status });
};

// SI-04 fix: a subscription's stored constraints (budget, free/paid, language) were parsed and
// then never applied — every finder matched on signal class and date alone. This extracts a
// usable ceiling from the free-text budget field; unparseable text means "cannot apply this
// constraint," never "treat as unconstrained," so filtering only ever narrows results.
function parseBudgetCeiling(text) {
  if (!text) return null;
  const match = String(text).match(/(\d[\d,]*)(?!.*\d)/);
  if (!match) return null;
  return Number(match[1].replace(/,/g, ''));
}

// Signal classes with a real internal data source today. The rest of the enum in goals.mjs
// (grants, tenders, events, funding, market_changes, requirement_changes) has no data source
// anywhere in this codebase — scanning for them returns an explicit "not yet supported" note
// instead of fabricating matches, per the same evidence-only discipline as the AI agents.
async function findJobMatches(db, subscription, constraints) {
  const rows = await db
    .prepare(
      `SELECT job_posts.* FROM job_posts
       WHERE status = 'open' AND created_at > ?
       ORDER BY created_at DESC LIMIT 25`,
    )
    .all(new Date(subscription.created_at).getTime());
  const ceiling = parseBudgetCeiling(constraints.budget);
  return rows
    .filter((row) => ceiling === null || row.budget_min <= ceiling)
    .map((row) => ({
      sourceKind: 'job',
      sourceId: row.id,
      title: row.title,
      summary: `${row.category} · budget ${row.budget_min}-${row.budget_max} ${row.currency}`,
    }));
}

async function findTrainingMatches(db, subscription, constraints) {
  const rows = await db
    .prepare('SELECT * FROM learning_paths WHERE created_at > ? ORDER BY created_at DESC LIMIT 25')
    .all(subscription.created_at);
  return rows
    .filter((row) => {
      if (constraints.freeOrPaid === 'free' && row.points_cost) return false;
      if (constraints.freeOrPaid === 'paid' && !row.points_cost) return false;
      if (constraints.language && row.language && row.language.toLowerCase() !== constraints.language.toLowerCase()) return false;
      return true;
    })
    .map((row) => ({
      sourceKind: 'learning_path',
      sourceId: row.id,
      title: row.title,
      summary: row.description,
    }));
}

async function findInternalProgressMatches(db, subscription) {
  const rows = await db
    .prepare(
      `SELECT id, data, created_at FROM records
       WHERE workspace_id = ? AND kind = 'progress' AND created_at > ?
       ORDER BY created_at DESC LIMIT 25`,
    )
    .all(subscription.workspace_id, subscription.created_at);
  return rows
    .map((row) => ({ id: row.id, data: JSON.parse(row.data) }))
    .filter((row) => row.data.objectiveId === subscription.goal_id)
    .map((row) => ({
      sourceKind: 'progress',
      sourceId: row.id,
      title: row.data.title || 'Progress update',
      summary: row.data.summary || '',
    }));
}

async function findExpertMatches(db, subscription) {
  const rows = await db
    .prepare(
      `SELECT * FROM expert_credentials WHERE verification_status = 'verified' AND verified_at > ?
       ORDER BY verified_at DESC LIMIT 25`,
    )
    .all(subscription.created_at);
  return rows.map((row) => ({
    sourceKind: 'expert_credential',
    sourceId: row.id,
    title: `${row.title} (${row.issuer})`,
    summary: '',
  }));
}

const FINDERS = {
  jobs: findJobMatches,
  training: findTrainingMatches,
  certifications: findTrainingMatches,
  internal_progress: findInternalProgressMatches,
  experts: findExpertMatches,
};

async function evaluateSubscription(db, subscription) {
  const signalClasses = JSON.parse(subscription.signal_classes);
  const constraints = JSON.parse(subscription.constraints || '{}');
  const unsupported = signalClasses.filter((cls) => !FINDERS[cls]);
  const found = [];
  for (const cls of signalClasses) {
    const finder = FINDERS[cls];
    if (!finder) continue;
    const matches = await finder(db, subscription, constraints);
    for (const match of matches) found.push({ ...match, signalClass: cls });
  }
  return { found, unsupported };
}

// Shared by the manual scan endpoint and the scheduled sweep below, so both insert matches the
// same way (dedup on conflict, same log entry shape).
async function runScan(store, subscription, actorName) {
  const { db, transaction, log } = store;
  const { found, unsupported } = await evaluateSubscription(db, subscription);
  const now = new Date().toISOString();
  const inserted = [];
  await transaction(async () => {
    for (const match of found) {
      const id = randomUUID();
      const result = await db
        .prepare(
          `INSERT INTO signal_matches VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
           ON CONFLICT (subscription_id, source_kind, source_id) DO NOTHING`,
        )
        .run(
          id,
          subscription.id,
          subscription.goal_id,
          subscription.workspace_id,
          match.signalClass,
          match.sourceKind,
          match.sourceId,
          match.title,
          match.summary,
          now,
        );
      if (result.changes > 0) inserted.push({ id, ...match });
    }
    if (inserted.length)
      await log(
        subscription.workspace_id,
        actorName,
        'Signal scan found new matches',
        subscription.id,
        `${inserted.length} new match(es)`,
      );
  });
  return { scannedAt: now, newMatches: inserted, unsupportedSignalClasses: unsupported };
}

// F-SI-04 (spec-review audit): scans were endpoint-triggered only — a subscription with nobody
// clicking "scan" was never evaluated. Called from the leased workflow-scheduler tick in
// server/index.mjs, this makes monitoring actually continuous. Only active subscriptions on a
// still-live (not deleted/completed) goal are scanned — F-SI-02 disables `active` on the rest.
export async function scanAllSubscriptions(store) {
  const { db } = store;
  const subscriptions = await db
    .prepare(
      `SELECT gs.* FROM goal_subscriptions gs
       JOIN records r ON r.id = gs.goal_id AND r.kind = 'objective'
       WHERE gs.active = 1 AND r.data::jsonb ->> 'status' != 'Complete'`,
    )
    .all();
  let scanned = 0;
  for (const subscription of subscriptions) {
    await runScan(store, subscription, 'Scheduled scan');
    scanned += 1;
  }
  return scanned;
}

export function mountSignals(app, store) {
  const { db, transaction, log } = store;

  async function subscriptionFor(id, workspaceId) {
    const row = await db
      .prepare('SELECT * FROM goal_subscriptions WHERE id = ? AND workspace_id = ?')
      .get(id, workspaceId);
    if (!row) fail('Goal subscription not found.', 404);
    return row;
  }

  app.post('/api/goal-subscriptions/:id/scan', async (req, res) => {
    const subscription = await subscriptionFor(req.params.id, req.workspace.id);
    if (!subscription.active)
      return res
        .status(400)
        .json({ error: 'This subscription is no longer active (its goal was deleted or completed).' });
    res.json(await runScan(store, subscription, req.user.name));
  });

  app.get('/api/goal-subscriptions/:id/matches', async (req, res) => {
    const subscription = await subscriptionFor(req.params.id, req.workspace.id);
    const rows = await db
      .prepare('SELECT * FROM signal_matches WHERE subscription_id = ? ORDER BY matched_at DESC')
      .all(subscription.id);
    res.json(
      rows.map((row) => ({
        id: row.id,
        signalClass: row.signal_class,
        sourceKind: row.source_kind,
        sourceId: row.source_id,
        title: row.title,
        summary: row.summary,
        matchedAt: row.matched_at,
        seen: Boolean(row.seen),
      })),
    );
  });

  app.patch('/api/goal-signal-matches/:id/seen', async (req, res) => {
    const row = await db
      .prepare('SELECT * FROM signal_matches WHERE id = ? AND workspace_id = ?')
      .get(req.params.id, req.workspace.id);
    if (!row) fail('Signal match not found.', 404);
    await db.prepare('UPDATE signal_matches SET seen = 1 WHERE id = ?').run(row.id);
    res.json({ id: row.id, seen: true });
  });
}
