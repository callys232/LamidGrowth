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

// Relevance: a signal used to match anything new of its class — every open job, every learning
// path — whatever the goal was. Matches now need at least one specific term in common with the
// goal (title, description, success statement), after dropping filler and generic goal words.
// A goal with no specific terms at all ("Land a new client") still gets every new item, but the
// scan says so, rather than pretending the results were matched to it.
const GENERIC_WORDS = new Set(
  `about after again also and any are because been before being better both but can could each
  every first for from further get getting goal goals grow growth have having help improve increase
  into just land make more most much must need next new our out over own per plan same should some
  such than that the their them then there these they this those through too under until very want
  was were what when where which while who why will with within would year years your you
  client clients customer customers business work works job jobs project projects start started`
    .split(/\s+/)
    .filter(Boolean),
);

/** Lowercase words of 3+ letters, crudely stemmed so "onboarding"/"onboard" and
 * "analysts"/"analysis" meet. Maps each stem to the first word it came from, for display. */
function terms(text) {
  const stems = new Map();
  for (const word of String(text || '').toLowerCase().match(/[a-z][a-z0-9+#-]{2,}/g) ?? []) {
    if (GENERIC_WORDS.has(word)) continue;
    const stem = word.replace(/(ings|ing|ers|er|ists|ist|ysis|yses|es|ed|s)$/, '').slice(0, 8) || word;
    if (!stems.has(stem)) stems.set(stem, word);
  }
  return stems;
}

async function goalTerms(db, subscription) {
  const row = await db
    .prepare("SELECT data FROM records WHERE id = ? AND kind = 'objective'")
    .get(subscription.goal_id);
  const goal = row ? JSON.parse(row.data) : {};
  return terms([goal.title, goal.description, goal.success].join(' '));
}

/** Keeps candidates sharing at least one goal term and records which. With no goal terms,
 * everything passes (the scan reports that separately). */
function relevantTo(goal, candidates, textOf) {
  if (goal.size === 0) return candidates;
  const kept = [];
  for (const candidate of candidates) {
    const shared = [...terms(textOf(candidate))]
      .filter(([stem]) => goal.has(stem))
      .map(([, word]) => word);
    if (shared.length > 0) kept.push({ candidate, matchedOn: `Matched on: ${shared.slice(0, 5).join(', ')}` });
  }
  return kept.map(({ candidate, matchedOn }) => ({ ...candidate, matchedOn }));
}

// Signal classes with a real internal data source today. The rest of the enum in goals.mjs
// (grants, tenders, events, funding, market_changes, requirement_changes) has no data source
// anywhere in this codebase — scanning for them returns an explicit "not yet supported" note
// instead of fabricating matches, per the same evidence-only discipline as the AI agents.
const withMatch = (summary, row) => [summary, row.matchedOn].filter(Boolean).join(' · ');

async function findJobMatches(db, subscription, constraints, goal) {
  const rows = await db
    .prepare(
      `SELECT job_posts.* FROM job_posts
       WHERE status = 'open' AND created_at > ?
       ORDER BY created_at DESC LIMIT 200`,
    )
    .all(new Date(subscription.created_at).getTime());
  const ceiling = parseBudgetCeiling(constraints.budget);
  const affordable = rows.filter((row) => ceiling === null || row.budget_min <= ceiling);
  return relevantTo(goal, affordable, (row) =>
    [row.title, row.description, row.deliverables, row.category, row.tags].join(' '),
  )
    .slice(0, 25)
    .map((row) => ({
      sourceKind: 'job',
      sourceId: row.id,
      title: row.title,
      summary: withMatch(
        `${row.category} · budget ${row.budget_min}-${row.budget_max} ${row.currency}`,
        row,
      ),
    }));
}

async function findTrainingMatches(db, subscription, constraints, goal) {
  const rows = await db
    .prepare('SELECT * FROM learning_paths WHERE created_at > ? ORDER BY created_at DESC LIMIT 200')
    .all(subscription.created_at);
  const allowed = rows.filter((row) => {
    if (constraints.freeOrPaid === 'free' && row.points_cost) return false;
    if (constraints.freeOrPaid === 'paid' && !row.points_cost) return false;
    if (constraints.language && row.language && row.language.toLowerCase() !== constraints.language.toLowerCase()) return false;
    return true;
  });
  return relevantTo(goal, allowed, (row) => [row.title, row.description].join(' '))
    .slice(0, 25)
    .map((row) => ({
      sourceKind: 'learning_path',
      sourceId: row.id,
      title: row.title,
      summary: withMatch(row.description, row),
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

// Engine audit 2026-10-05 (H6): the same credential rule as discovery — verified, unexpired
// and not revoked — and an expert with a restricted conflict is never suggested. The goal's
// stated constraints now apply too: language, location (as the expert's location or
// jurisdiction), and the budget — an expert whose hourly rate alone exceeds the budget ceiling,
// or who has stated no rate, is left out.
async function findExpertMatches(db, subscription, constraints, goal) {
  const now = new Date().toISOString();
  const rows = await db
    .prepare(
      `SELECT c.*, p.languages, p.location, p.jurisdiction AS profile_jurisdiction, p.hourly_rate
       FROM expert_credentials c JOIN talent_profiles p ON p.id = c.profile_id
       WHERE c.verification_status = 'verified' AND c.verified_at > ? AND c.revoked_at IS NULL
         AND (c.expires_at IS NULL OR c.expires_at > ?)
         AND NOT EXISTS (SELECT 1 FROM conflict_disclosures d WHERE d.profile_id = p.id AND d.status = 'restricted')
       ORDER BY c.verified_at DESC LIMIT 200`,
    )
    .all(subscription.created_at, now);
  const ceiling = parseBudgetCeiling(constraints.budget);
  const lower = (v) => String(v ?? '').toLowerCase();
  const fits = (row) =>
    (!constraints.language ||
      JSON.parse(row.languages || '[]').some((l) => lower(l) === lower(constraints.language))) &&
    (!constraints.location ||
      [row.location, row.profile_jurisdiction, row.jurisdiction].some(
        (v) => v && lower(v).includes(lower(constraints.location)),
      )) &&
    (ceiling == null || (row.hourly_rate != null && row.hourly_rate <= ceiling));
  return relevantTo(goal, rows.filter(fits), (row) => [row.title, row.issuer, row.type].join(' '))
    .slice(0, 25)
    .map((row) => ({
      sourceKind: 'expert_credential',
      sourceId: row.id,
      title: `${row.title} (${row.issuer})`,
      summary: withMatch('', row),
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
  const goal = await goalTerms(db, subscription);
  const found = [];
  for (const cls of signalClasses) {
    const finder = FINDERS[cls];
    if (!finder) continue;
    const matches = await finder(db, subscription, constraints, goal);
    for (const match of matches) found.push({ ...match, signalClass: cls });
  }
  return { found, unsupported, generalGoal: goal.size === 0 };
}

// Shared by the manual scan endpoint and the scheduled sweep below, so both insert matches the
// same way (dedup on conflict, same log entry shape).
async function runScan(store, subscription, actorName) {
  const { db, transaction, log } = store;
  const { found, unsupported, generalGoal } = await evaluateSubscription(db, subscription);
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
  return {
    scannedAt: now,
    newMatches: inserted,
    unsupportedSignalClasses: unsupported,
    ...(generalGoal
      ? {
          relevanceNote:
            'Your goal has no specific terms to match on, so every new item is shown. Add detail to the goal (what, for whom, which skill) to narrow the matches.',
        }
      : {}),
  };
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
