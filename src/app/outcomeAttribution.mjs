import { randomUUID } from 'node:crypto';
import { z } from 'zod';

// Outcome Attribution & Learning (spec 20.9 / SI-11): distinct from mountOutcomes in outcomes.mjs
// (which closes the "return to OS" loop for a completed project engagement). This is the general
// mechanism for recording an observed result against any subject (a goal, a KPI, a recommendation)
// with an explicit attribution strength, so correlation is never silently presented as verified
// causation.
const ATTRIBUTION_STRENGTHS = ['correlation', 'likely_contribution', 'experiment_supported', 'verified_causal'];

const createSchema = z
  .object({
    subjectKind: z.string().trim().min(1).max(80),
    subjectId: z.string().trim().min(1).max(200),
    recommendationId: z.string().uuid().optional(),
    description: z.string().trim().min(1).max(3000),
    attributionStrength: z.enum(ATTRIBUTION_STRENGTHS),
    observedAt: z.string().optional(),
  })
  .strict();
const querySchema = z.object({ subjectKind: z.string().trim().min(1).max(80), subjectId: z.string().trim().min(1).max(200) }).strict();

const fail = (message, status) => {
  throw Object.assign(new Error(message), { status });
};

export function mountOutcomeAttribution(app, store) {
  const { db, transaction, log } = store;

  app.post('/api/outcome-records', async (req, res) => {
    const input = createSchema.parse(req.body);
    if (input.recommendationId) {
      const rec = await db
        .prepare('SELECT id FROM recommendations WHERE id = ? AND workspace_id = ?')
        .get(input.recommendationId, req.workspace.id);
      if (!rec) fail('That recommendation was not found in this workspace.', 404);
    }
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const observedAt = input.observedAt || createdAt;
    await transaction(async () => {
      await db
        .prepare('INSERT INTO outcomes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(
          id,
          req.workspace.id,
          input.subjectKind,
          input.subjectId,
          input.recommendationId ?? null,
          input.description,
          input.attributionStrength,
          observedAt,
          req.user.id,
          createdAt,
        );
      await log(req.workspace.id, req.user.name, 'Outcome recorded', id, `${input.subjectKind}:${input.subjectId} (${input.attributionStrength})`);
    });
    res.status(201).json(await db.prepare('SELECT * FROM outcomes WHERE id = ?').get(id));
  });

  app.get('/api/outcome-records', async (req, res) => {
    const query = querySchema.parse(req.query);
    const rows = await db
      .prepare('SELECT * FROM outcomes WHERE workspace_id = ? AND subject_kind = ? AND subject_id = ? ORDER BY observed_at DESC')
      .all(req.workspace.id, query.subjectKind, query.subjectId);
    res.json(rows);
  });
}

export { ATTRIBUTION_STRENGTHS };
