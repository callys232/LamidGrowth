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
    reason: text(500).optional(),
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

// Field Guidance Contract (spec 21.2 / PS-02): every material scoping field supports four layers —
// Explain, Example, Suggest for me, Help me decide. Explain/Example are static plain-language
// content; Help me decide is a small set of targeted questions, not an AI-generated essay; Suggest
// for me reuses the same deterministic, evidence-based suggestion logic /suggest already used.
const GUIDANCE_FIELDS = [
  'objective',
  'problemStatement',
  'desiredOutcome',
  'inScope',
  'outOfScope',
  'deliverables',
  'acceptanceCriteria',
  'assumptions',
  'category',
  'budgetContext',
  'timelineContext',
  'jurisdiction',
];
const FIELD_GUIDANCE = {
  objective: {
    explain: 'The single outcome you want this work to achieve, in plain language — the result you want, not the deliverable itself.',
    example: 'Get our new product page live and converting visitors into signups.',
    helpMeDecide: ['What would success look like in one sentence?', 'Who asked for this, and why now?'],
  },
  problemStatement: {
    explain: 'What is currently wrong, missing, or blocking progress — the "why" behind the objective.',
    example: "Our signup page has a 2% conversion rate and we don't know why visitors are leaving.",
    helpMeDecide: ['What have you already tried?', 'How do you know this is a problem — what evidence do you have?'],
  },
  desiredOutcome: {
    explain: 'A resolved version of the objective — the state you want to exist once this work is done.',
    example: 'A signup page with a conversion rate above 5%, verified with two weeks of traffic data.',
    helpMeDecide: ['How will you know when this is done?', 'Is there a number or state that proves success?'],
  },
  inScope: {
    explain: 'The specific work that is included in this engagement.',
    example: 'Redesigning the signup form, rewriting the page copy, and adding social proof.',
    helpMeDecide: ['What must be touched to reach the outcome?', "What would you be disappointed NOT to get?"],
  },
  outOfScope: {
    explain: 'Work that is explicitly excluded, to prevent scope creep and disputes later.',
    example: 'Backend infrastructure changes and unrelated pages are out of scope.',
    helpMeDecide: ['What related work should wait for a future phase?', "What might someone assume is included that isn't?"],
  },
  deliverables: {
    explain: 'The concrete artifact(s) the work produces — what you will actually receive.',
    example: 'A redesigned, deployed signup page and a short report on what changed.',
    helpMeDecide: ['What will you actually receive at the end?', 'Is it a document, a working feature, or a completed process change?'],
  },
  acceptanceCriteria: {
    explain: 'The testable conditions that must be true for you to accept the deliverable.',
    example: 'The new page is live, passes accessibility checks, and conversions are tracked in analytics.',
    helpMeDecide: ['How will you check the work is actually done, not just delivered?', 'What would make you reject it?'],
  },
  assumptions: {
    explain: 'Anything you are taking for granted that, if wrong, would change the scope or cost.',
    example: 'Assumes our current analytics setup is already tracking conversions correctly.',
    helpMeDecide: ['What are you assuming is already true or already in place?', 'What would surprise you if it turned out false?'],
  },
  category: {
    explain: 'The professional category this work falls under — helps route it to the right expertise.',
    example: 'UX/UI design, for a page-redesign objective.',
    helpMeDecide: ['What kind of specialist would you hire to do this in-house?'],
  },
  budgetContext: {
    explain: "Your budget range or constraint for this work — a range is fine if you're unsure.",
    example: '$500-1500, flexible if the approach is strongly justified.',
    helpMeDecide: ['What would you be comfortable spending without a second thought?', 'Is there a hard ceiling?'],
  },
  timelineContext: {
    explain: 'When you need this done, and any hard deadlines.',
    example: '2-3 weeks, no hard deadline but sooner is better.',
    helpMeDecide: ['Is there an external event this needs to be ready for?', 'What happens if it takes longer than expected?'],
  },
  jurisdiction: {
    explain: 'The country or region whose laws/regulations apply to this work, if relevant.',
    example: 'United States — relevant if the work touches legal, financial, or healthcare compliance.',
    helpMeDecide: ['Does this work involve regulated advice, contracts, or compliance?', 'Where is your business legally based?'],
  },
};

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

  // Scope Reconciliation: snapshot the case state as a new version on every save, source-tagged so
  // AI-suggested and human-edited/expert-reviewed changes stay distinguishable (25.1 / PS-07).
  async function snapshotVersion(caseId, source, snapshot, userId, reason = '') {
    const existing = await db
      .prepare('SELECT COALESCE(MAX(version), 0) AS max_version FROM scope_versions WHERE scoping_case_id = ?')
      .get(caseId);
    const version = existing.max_version + 1;
    await db
      .prepare('INSERT INTO scope_versions VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(randomUUID(), caseId, version, source, JSON.stringify(snapshot), reason, userId, new Date().toISOString());
    return version;
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
      await snapshotVersion(
        id,
        'user',
        { objective: input.objective, problemStatement: input.problemStatement, riskBand },
        req.user.id,
        'Case created',
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
      await snapshotVersion(req.params.id, 'user', merged, req.user.id, input.reason || '');
    });
    res.json(await db.prepare('SELECT * FROM scoping_cases WHERE id = ?').get(req.params.id));
  });

  app.get('/api/scoping-cases/:id/versions', async (req, res) => {
    await caseFor(req.params.id, req.user.id);
    const rows = await db
      .prepare('SELECT * FROM scope_versions WHERE scoping_case_id = ? ORDER BY version')
      .all(req.params.id);
    res.json(
      rows.map((row) => ({
        version: row.version,
        source: row.source,
        reason: row.reason,
        snapshot: JSON.parse(row.snapshot),
        createdBy: row.created_by,
        createdAt: row.created_at,
      })),
    );
  });

  // Deterministic, evidence-based suggestions only — consistent with this codebase's estimator
  // philosophy (src/app/estimator.mjs): never fabricate a plausible-looking figure or paragraph
  // with no basis. Suggestions are returned for the user to accept/edit, never silently applied.
  async function computeSuggestions(existing) {
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
    return suggestions;
  }

  app.post('/api/scoping-cases/:id/suggest', async (req, res) => {
    const existing = await caseFor(req.params.id, req.user.id);
    const suggestions = await computeSuggestions(existing);
    res.json({ suggestions, riskBand: existing.risk_band });
  });

  const FIELD_TO_COLUMN = {
    objective: 'objective',
    problemStatement: 'problem_statement',
    desiredOutcome: 'desired_outcome',
    inScope: 'in_scope',
    outOfScope: 'out_of_scope',
    deliverables: 'deliverables',
    acceptanceCriteria: 'acceptance_criteria',
    assumptions: 'assumptions',
    category: 'category',
    budgetContext: 'budget_context',
    timelineContext: 'timeline_context',
    jurisdiction: 'jurisdiction',
  };
  app.get('/api/scoping-cases/:id/guidance/:field', async (req, res) => {
    const existing = await caseFor(req.params.id, req.user.id);
    const field = req.params.field;
    if (!GUIDANCE_FIELDS.includes(field)) fail(`Unknown scoping field "${field}".`, 404);
    const content = FIELD_GUIDANCE[field];
    const suggestions = await computeSuggestions(existing);
    res.json({
      field,
      explain: content.explain,
      example: content.example,
      helpMeDecide: content.helpMeDecide,
      suggestion: suggestions[field] ?? null,
      currentValue: existing[FIELD_TO_COLUMN[field]] ?? null,
    });
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

  // Any qualified expert can see and claim pending review-queue work — the async queue with a
  // real, per-claim SLA computed from the claiming expert's own declared response window (21.5).
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
    const profile = await db.prepare('SELECT * FROM talent_profiles WHERE user_id = ?').get(req.user.id);
    if (!profile)
      return res
        .status(403)
        .json({ error: 'Only registered experts can claim review queue entries.' });
    const entry = await db
      .prepare('SELECT * FROM review_queue_entries WHERE id = ?')
      .get(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Review queue entry not found.' });
    if (entry.status !== 'pending')
      return res.status(400).json({ error: 'This entry has already been claimed.' });
    const claimedAt = new Date();
    // If this reviewer hasn't declared an expected response window, no SLA is fabricated — the
    // entry is claimed without one rather than inventing a plausible-looking number.
    const slaDueAt = profile.expected_response_hours
      ? new Date(claimedAt.getTime() + profile.expected_response_hours * 60 * 60 * 1000).toISOString()
      : null;
    await db
      .prepare(
        "UPDATE review_queue_entries SET status = 'claimed', claimed_by = ?, claimed_at = ?, sla_due_at = ? WHERE id = ?",
      )
      .run(req.user.id, claimedAt.toISOString(), slaDueAt, entry.id);
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
