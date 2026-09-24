import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { JOB_CATEGORIES } from './jobTaxonomy.mjs';
import { REGULATED_KEYWORDS } from './regulatedKeywords.mjs';

const text = (max) => z.string().trim().max(max).default('');

const createSchema = z
  .object({ objective: z.string().trim().min(1).max(2000), problemStatement: text(2000) })
  .strict();
const updateSchema = z
  .object({
    objective: z.string().trim().min(1).max(2000).optional(),
    problemStatement: text(2000).optional(),
    desiredOutcome: text(2000).optional(),
    inScope: text(4000).optional(),
    outOfScope: text(4000).optional(),
    deliverables: text(4000).optional(),
    acceptanceCriteria: text(4000).optional(),
    assumptions: text(4000).optional(),
    category: z.enum(JOB_CATEGORIES).nullish(),
    budgetContext: text(500).optional(),
    timelineContext: text(500).optional(),
    jurisdiction: z.string().trim().max(120).nullish(),
  })
  .strict();
const publishSchema = z
  .object({ publishedJobId: z.string().uuid(), confirmed: z.boolean().default(false) })
  .strict();
const jurisdictionRuleSchema = z
  .object({
    jurisdiction: z.string().trim().min(1).max(120),
    category: z.enum(JOB_CATEGORIES),
    requiresLicense: z.boolean().default(true),
    notes: z.string().trim().max(1000).default(''),
  })
  .strict();
const claimSchema = z.object({ notes: z.string().trim().max(2000).default('') }).strict();

// Exported so any content-creation route (not just the scoping-case pre-flow) can apply the same
// regulated-content check — see isRegulatedContent's use in app.mjs's POST /api/jobs, which has no
// scoping-case in front of it and would otherwise let a red-risk job post go live unreviewed.
export function isRegulatedContent(text) {
  const haystack = (text || '').toLowerCase();
  return REGULATED_KEYWORDS.some((word) => haystack.includes(word));
}

function computeRiskBand(row, jurisdictionRequiresLicense) {
  if (jurisdictionRequiresLicense || isRegulatedContent(`${row.category || ''} ${row.objective} ${row.problem_statement}`))
    return 'red';
  const hasCore = row.category && row.deliverables && row.budget_context && row.timeline_context;
  return hasCore ? 'green' : 'amber';
}

const fail = (message, status) => {
  throw Object.assign(new Error(message), { status });
};

export function mountScoping(app, store, { ecosystemAdminEmails } = {}) {
  const { db, transaction, log } = store;
  const isAdmin = (req) =>
    (ecosystemAdminEmails || []).includes((req.user.email || '').toLowerCase());

  async function jurisdictionRequiresLicense(jurisdiction, category) {
    if (!jurisdiction || !category) return false;
    const rule = await db
      .prepare(
        'SELECT requires_license FROM jurisdiction_rules WHERE jurisdiction = ? AND category = ?',
      )
      .get(jurisdiction, category);
    return Boolean(rule && rule.requires_license);
  }

  async function caseFor(id, userId) {
    const row = await db.prepare('SELECT * FROM scoping_cases WHERE id = ?').get(id);
    if (!row) fail('Scoping case not found.', 404);
    if (row.created_by !== userId) fail('You do not own this scoping case.', 403);
    return row;
  }

  app.post('/api/scoping-cases', async (req, res) => {
    const input = createSchema.parse(req.body);
    const id = randomUUID();
    const now = new Date().toISOString();
    const riskBand = computeRiskBand({
      category: null,
      objective: input.objective,
      problem_statement: input.problemStatement,
    });
    await transaction(async () => {
      await db
        .prepare(
          `INSERT INTO scoping_cases
         (id, workspace_id, created_by, status, objective, problem_statement, risk_band, created_at, updated_at)
         VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          req.workspace.id,
          req.user.id,
          input.objective,
          input.problemStatement,
          riskBand,
          now,
          now,
        );
      await log(
        req.workspace.id,
        req.user.name,
        'Scoping case started',
        id,
        input.objective.slice(0, 80),
      );
    });
    res.status(201).json(await db.prepare('SELECT * FROM scoping_cases WHERE id = ?').get(id));
  });

  app.get('/api/scoping-cases', async (req, res) => {
    res.json(
      await db
        .prepare(
          'SELECT * FROM scoping_cases WHERE workspace_id = ? AND created_by = ? ORDER BY created_at DESC',
        )
        .all(req.workspace.id, req.user.id),
    );
  });

  app.get('/api/scoping-cases/:id', async (req, res) => {
    res.json(await caseFor(req.params.id, req.user.id));
  });

  app.patch('/api/scoping-cases/:id', async (req, res) => {
    const existing = await caseFor(req.params.id, req.user.id);
    if (existing.status === 'published')
      return res.status(400).json({ error: 'A published scoping case cannot be edited.' });
    const input = updateSchema.parse(req.body);
    const merged = {
      objective: input.objective ?? existing.objective,
      problem_statement: input.problemStatement ?? existing.problem_statement,
      desired_outcome: input.desiredOutcome ?? existing.desired_outcome,
      in_scope: input.inScope ?? existing.in_scope,
      out_of_scope: input.outOfScope ?? existing.out_of_scope,
      deliverables: input.deliverables ?? existing.deliverables,
      acceptance_criteria: input.acceptanceCriteria ?? existing.acceptance_criteria,
      assumptions: input.assumptions ?? existing.assumptions,
      category: input.category !== undefined ? input.category : existing.category,
      budget_context: input.budgetContext ?? existing.budget_context,
      timeline_context: input.timelineContext ?? existing.timeline_context,
      jurisdiction: input.jurisdiction !== undefined ? input.jurisdiction : existing.jurisdiction,
    };
    const riskBand = computeRiskBand(
      merged,
      await jurisdictionRequiresLicense(merged.jurisdiction, merged.category),
    );
    const status = existing.status === 'draft' ? 'user_review' : existing.status;
    const now = new Date().toISOString();
    await transaction(async () => {
      await db
        .prepare(
          `UPDATE scoping_cases SET objective = ?, problem_statement = ?, desired_outcome = ?, in_scope = ?, out_of_scope = ?,
         deliverables = ?, acceptance_criteria = ?, assumptions = ?, category = ?, budget_context = ?, timeline_context = ?,
         jurisdiction = ?, risk_band = ?, status = ?, updated_at = ? WHERE id = ?`,
        )
        .run(
          merged.objective,
          merged.problem_statement,
          merged.desired_outcome,
          merged.in_scope,
          merged.out_of_scope,
          merged.deliverables,
          merged.acceptance_criteria,
          merged.assumptions,
          merged.category,
          merged.budget_context,
          merged.timeline_context,
          merged.jurisdiction,
          riskBand,
          status,
          now,
          req.params.id,
        );
    });
    res.json(await db.prepare('SELECT * FROM scoping_cases WHERE id = ?').get(req.params.id));
  });

  // Deterministic, evidence-based suggestions only — consistent with this codebase's estimator
  // philosophy (src/app/estimator.mjs): never fabricate a plausible-looking figure or paragraph
  // with no basis. Suggestions are returned for the user to accept/edit, never silently applied.
  app.post('/api/scoping-cases/:id/suggest', async (req, res) => {
    const existing = await caseFor(req.params.id, req.user.id);
    const suggestions = {};
    if (!existing.desired_outcome) {
      suggestions.desiredOutcome = `A resolved version of: "${existing.objective}"`;
    }
    if (!existing.deliverables) {
      suggestions.deliverables =
        'A defined output that satisfies the objective above — edit this to name the specific artifact(s) you expect (e.g. a document, a working feature, a completed process change).';
    }
    if (!existing.acceptance_criteria) {
      suggestions.acceptanceCriteria =
        'The deliverable is reviewed and explicitly accepted by you before any payment is released.';
    }
    if (existing.category) {
      const sample = await db
        .prepare('SELECT budget_min, budget_max FROM job_posts WHERE category = ?')
        .all(existing.category);
      if (sample.length >= 3) {
        const avg = (key) => Math.round(sample.reduce((sum, r) => sum + r[key], 0) / sample.length);
        suggestions.budgetContext = `Similar "${existing.category}" projects on this platform typically range ${avg('budget_min')}-${avg('budget_max')} USD (based on ${sample.length} prior posts).`;
      }
    }
    res.json({ suggestions, riskBand: existing.risk_band });
  });

  app.patch('/api/scoping-cases/:id/publish', async (req, res) => {
    const existing = await caseFor(req.params.id, req.user.id);
    if (existing.status === 'published')
      return res.status(400).json({ error: 'This scoping case is already published.' });
    if (existing.risk_band === 'red' && !req.body?.confirmed)
      return res.status(400).json({
        error:
          'This scope was flagged for qualified review. Confirm explicitly before publishing, or request expert review first.',
      });
    const input = publishSchema.parse(req.body);
    const job = await db
      .prepare('SELECT id FROM job_posts WHERE id = ? AND client_user_id = ?')
      .get(input.publishedJobId, req.user.id);
    if (!job)
      return res
        .status(400)
        .json({ error: 'That job post was not found or was not created by you.' });
    await transaction(async () => {
      await db
        .prepare(
          "UPDATE scoping_cases SET status = 'published', published_job_id = ?, updated_at = ? WHERE id = ?",
        )
        .run(input.publishedJobId, new Date().toISOString(), req.params.id);
      await log(
        req.workspace.id,
        req.user.name,
        'Scoping case published',
        req.params.id,
        input.publishedJobId,
      );
    });
    res.json(await db.prepare('SELECT * FROM scoping_cases WHERE id = ?').get(req.params.id));
  });

  // Amber/Red cases can request qualified human review instead of publishing straight through —
  // a real SLA-tracked queue, not just a redirect into generic talent matching.
  app.post('/api/scoping-cases/:id/request-review', async (req, res) => {
    const existing = await caseFor(req.params.id, req.user.id);
    if (existing.risk_band === 'green')
      return res.status(400).json({ error: 'This scope was not flagged for review.' });
    if (
      await db
        .prepare('SELECT 1 FROM review_queue_entries WHERE scoping_case_id = ?')
        .get(existing.id)
    )
      return res
        .status(400)
        .json({ error: 'Review has already been requested for this scoping case.' });
    const id = randomUUID();
    await transaction(async () => {
      await db
        .prepare('INSERT INTO review_queue_entries VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(
          id,
          existing.id,
          existing.risk_band,
          'pending',
          null,
          null,
          '',
          null,
          new Date().toISOString(),
        );
      await log(
        req.workspace.id,
        req.user.name,
        'Expert review requested',
        id,
        existing.objective.slice(0, 80),
      );
    });
    res
      .status(201)
      .json(await db.prepare('SELECT * FROM review_queue_entries WHERE id = ?').get(id));
  });

  app.get('/api/scoping-cases/:id/review', async (req, res) => {
    await caseFor(req.params.id, req.user.id);
    res.json(
      (await db
        .prepare('SELECT * FROM review_queue_entries WHERE scoping_case_id = ?')
        .get(req.params.id)) ?? null,
    );
  });

  // Any qualified expert can see and claim pending review-queue work — this is the async queue
  // the gap-table asked for, deliberately kept simple (no SLA timers yet, see plan notes).
  app.get('/api/review-queue', async (req, res) => {
    if (!(await db.prepare('SELECT 1 FROM talent_profiles WHERE user_id = ?').get(req.user.id)))
      return res.status(403).json({ error: 'Only registered experts can view the review queue.' });
    res.json(
      await db
        .prepare(
          `SELECT r.*, s.objective, s.category, s.jurisdiction FROM review_queue_entries r
           JOIN scoping_cases s ON s.id = r.scoping_case_id
           WHERE r.status = 'pending' OR r.claimed_by = ? ORDER BY r.created_at`,
        )
        .all(req.user.id),
    );
  });

  app.post('/api/review-queue/:id/claim', async (req, res) => {
    if (!(await db.prepare('SELECT 1 FROM talent_profiles WHERE user_id = ?').get(req.user.id)))
      return res
        .status(403)
        .json({ error: 'Only registered experts can claim review queue entries.' });
    const entry = await db
      .prepare('SELECT * FROM review_queue_entries WHERE id = ?')
      .get(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Review queue entry not found.' });
    if (entry.status !== 'pending')
      return res.status(400).json({ error: 'This entry has already been claimed.' });
    await db
      .prepare(
        "UPDATE review_queue_entries SET status = 'claimed', claimed_by = ?, claimed_at = ? WHERE id = ?",
      )
      .run(req.user.id, new Date().toISOString(), entry.id);
    res.json(await db.prepare('SELECT * FROM review_queue_entries WHERE id = ?').get(entry.id));
  });

  app.post('/api/review-queue/:id/complete', async (req, res) => {
    const entry = await db
      .prepare('SELECT * FROM review_queue_entries WHERE id = ?')
      .get(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Review queue entry not found.' });
    if (entry.claimed_by !== req.user.id)
      return res.status(403).json({ error: 'You have not claimed this entry.' });
    const input = claimSchema.parse(req.body ?? {});
    await db
      .prepare(
        "UPDATE review_queue_entries SET status = 'completed', notes = ?, completed_at = ? WHERE id = ?",
      )
      .run(input.notes, new Date().toISOString(), entry.id);
    res.json(await db.prepare('SELECT * FROM review_queue_entries WHERE id = ?').get(entry.id));
  });

  app.get('/api/admin/jurisdiction-rules', async (req, res) => {
    if (!isAdmin(req))
      return res
        .status(403)
        .json({ error: 'Only an ecosystem administrator can view jurisdiction rules.' });
    res.json(
      await db.prepare('SELECT * FROM jurisdiction_rules ORDER BY jurisdiction, category').all(),
    );
  });

  app.post('/api/admin/jurisdiction-rules', async (req, res) => {
    if (!isAdmin(req))
      return res
        .status(403)
        .json({ error: 'Only an ecosystem administrator can manage jurisdiction rules.' });
    const input = jurisdictionRuleSchema.parse(req.body);
    if (
      await db
        .prepare('SELECT 1 FROM jurisdiction_rules WHERE jurisdiction = ? AND category = ?')
        .get(input.jurisdiction, input.category)
    )
      return res
        .status(400)
        .json({ error: 'A rule for this jurisdiction and category already exists.' });
    const id = randomUUID();
    await db
      .prepare('INSERT INTO jurisdiction_rules VALUES (?, ?, ?, ?, ?, ?)')
      .run(
        id,
        input.jurisdiction,
        input.category,
        input.requiresLicense ? 1 : 0,
        input.notes,
        new Date().toISOString(),
      );
    res.status(201).json(await db.prepare('SELECT * FROM jurisdiction_rules WHERE id = ?').get(id));
  });

  app.delete('/api/admin/jurisdiction-rules/:id', async (req, res) => {
    if (!isAdmin(req))
      return res
        .status(403)
        .json({ error: 'Only an ecosystem administrator can manage jurisdiction rules.' });
    await db.prepare('DELETE FROM jurisdiction_rules WHERE id = ?').run(req.params.id);
    res.status(204).end();
  });
}
