import { randomUUID } from 'node:crypto';
import { z } from 'zod';

// Outcome Attribution & Learning (spec 20.9 / SI-11): distinct from mountOutcomes in outcomes.mjs
// (which closes the "return to OS" loop for a completed project engagement). This is the general
// mechanism for recording an observed result against any subject (a goal, a KPI, a recommendation)
// with an explicit attribution strength, so correlation is never silently presented as verified
// causation.
const ATTRIBUTION_STRENGTHS = ['correlation', 'likely_contribution', 'experiment_supported', 'verified_causal'];

// SI-03 fix: subjectKind is no longer free-form. Each entry names how to verify that kind's
// subject actually exists in the caller's workspace before an outcome can be recorded against it.
const SUBJECT_VERIFIERS = {
  goal: (db, workspaceId, subjectId) =>
    db.prepare("SELECT 1 FROM records WHERE id = ? AND workspace_id = ? AND kind = 'objective'").get(subjectId, workspaceId),
  kpi: (db, workspaceId, subjectId) =>
    db.prepare('SELECT 1 FROM kpi_definitions WHERE id = ? AND workspace_id = ?').get(subjectId, workspaceId),
};

const createSchema = z
  .object({
    subjectKind: z.enum(Object.keys(SUBJECT_VERIFIERS)),
    subjectId: z.string().uuid(),
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
    const subjectExists = await SUBJECT_VERIFIERS[input.subjectKind](db, req.workspace.id, input.subjectId);
    if (!subjectExists) fail(`No "${input.subjectKind}" with that ID exists in this workspace.`, 404);
    let recommendation = null;
    if (input.recommendationId) {
      recommendation = await db
        .prepare('SELECT id, status FROM recommendations WHERE id = ? AND workspace_id = ?')
        .get(input.recommendationId, req.workspace.id);
      if (!recommendation) fail('That recommendation was not found in this workspace.', 404);
    }
    // "verified_causal" is a claim of established causation, not an assertion any caller can
    // make by naming the enum value. It requires an authorized evidence-backed transition — here,
    // a linked recommendation that was actually seen through to completion, not merely proposed.
    if (input.attributionStrength === 'verified_causal' && recommendation?.status !== 'completed')
      fail(
        'verified_causal requires a linked recommendationId whose status is "completed" — link the completed recommendation, or use a weaker attribution strength if the evidence does not establish causation.',
        400,
      );
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
