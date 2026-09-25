import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { requirePermission } from './policy.mjs';

const title = z.string().trim().min(1).max(500);
const longText = z.string().trim().max(10000).default('');

// F-GROW-01: calculationMethod is user-stated (never fabricated) — an honest description of how
// the number is derived, not a validated formula. Optional so existing simple KPIs (no method
// declared) keep working exactly as before.
const kpiSchema = z
  .object({
    name: title,
    unit: z.string().trim().max(50).default(''),
    target: z.number().finite().optional(),
    calculationMethod: longText,
  })
  .strict();
const kpiUpdateSchema = kpiSchema.partial().strict();
const observationSchema = z
  .object({
    value: z.number().finite(),
    observedAt: z.string().optional(),
    source: z.string().trim().max(200).default(''),
    // Real evidence (F-GROW-01): a reference to an already-uploaded, already-validated file
    // (files.mjs — same mechanism reused for Deliverable Verification), distinguishable from a
    // bare text claim via `source`.
    evidenceFileId: z.string().uuid().optional(),
  })
  .strict();

const OPPORTUNITY_STATUSES = ['identified', 'qualified', 'pursuing', 'won', 'lost'];
const OPPORTUNITY_TYPES = ['job', 'project', 'partnership', 'referral', 'other'];
const opportunitySchema = z
  .object({
    title,
    description: longText,
    source: z.string().trim().max(200).default(''),
    valueEstimate: z.number().finite().optional(),
    type: z.enum(OPPORTUNITY_TYPES).optional(),
  })
  .strict();
const opportunityUpdateSchema = z
  .object({
    title: title.optional(),
    description: longText.optional(),
    source: z.string().trim().max(200).optional(),
    valueEstimate: z.number().finite().nullable().optional(),
    status: z.enum(OPPORTUNITY_STATUSES).optional(),
    type: z.enum(OPPORTUNITY_TYPES).nullable().optional(),
  })
  .strict();
// F-GROW-01: a deterministic readiness score from real, already-present fields — never a
// fabricated probability. Computed on read, not stored, so it's always current.
function computeReadiness(opportunity) {
  const hasValue = opportunity.value_estimate !== null && opportunity.value_estimate !== undefined;
  const hasSource = Boolean(opportunity.source);
  const staleMs = Date.now() - new Date(opportunity.updated_at).getTime();
  const notStale = staleMs <= 30 * 24 * 60 * 60 * 1000;
  const score = [hasValue, hasSource, notStale].filter(Boolean).length;
  return score === 3 ? 'ready' : score >= 1 ? 'partial' : 'not_ready';
}

// F-GROW-01: real variant/guardrail design — optional so a simple one-metric experiment (today's
// only shape) still works unchanged; trafficWeightPercent must actually sum to 100 when supplied.
const variantSchema = z
  .object({ name: z.string().trim().min(1).max(200), trafficWeightPercent: z.number().int().min(0).max(100) })
  .strict();
const experimentSchema = z
  .object({
    title,
    hypothesis: z.string().trim().min(1).max(5000),
    metric: z.string().trim().min(1).max(500),
    variants: z
      .array(variantSchema)
      .min(2)
      .max(10)
      .refine((variants) => variants.reduce((sum, v) => sum + v.trafficWeightPercent, 0) === 100, {
        message: 'Variant traffic weights must sum to 100.',
      })
      .optional(),
    guardrailMetricIds: z.array(z.string().uuid()).max(10).optional(),
  })
  .strict();
// Structured, attributable completion (F-GROW-01): the human supplies the real measured numbers
// per variant — no fabricated statistical-significance/p-value computation is added, since this
// codebase has no basis for that capability. `result` (free text) stays required, unchanged.
const experimentCompleteSchema = z
  .object({
    result: z.string().trim().min(1).max(5000),
    winningVariant: z.string().trim().max(200).optional(),
    perVariantObservedValue: z.record(z.number().finite()).optional(),
  })
  .strict();

const fail = (message, status) => {
  throw Object.assign(new Error(message), { status });
};

export function mountGrowth(app, store) {
  const { db, transaction, log } = store;

  async function kpiFor(id, workspaceId) {
    const row = await db.prepare('SELECT * FROM kpi_definitions WHERE id = ? AND workspace_id = ?').get(id, workspaceId);
    if (!row) fail('KPI not found.', 404);
    return row;
  }
  async function opportunityFor(id, workspaceId) {
    const row = await db.prepare('SELECT * FROM opportunities WHERE id = ? AND workspace_id = ?').get(id, workspaceId);
    if (!row) fail('Opportunity not found.', 404);
    return { ...row, readiness: computeReadiness(row) };
  }
  async function experimentFor(id, workspaceId) {
    const row = await db.prepare('SELECT * FROM experiments WHERE id = ? AND workspace_id = ?').get(id, workspaceId);
    if (!row) fail('Experiment not found.', 404);
    return {
      ...row,
      variants: row.variants ? JSON.parse(row.variants) : null,
      guardrail_metric_ids: row.guardrail_metric_ids ? JSON.parse(row.guardrail_metric_ids) : null,
      per_variant_observed_value: row.per_variant_observed_value ? JSON.parse(row.per_variant_observed_value) : null,
    };
  }

  // KPI definitions + observations
  app.get('/api/kpis', async (req, res) => {
    res.json(
      await db.prepare('SELECT * FROM kpi_definitions WHERE workspace_id = ? ORDER BY created_at').all(req.workspace.id),
    );
  });

  // F-GROW-01: every definition (create and later redefinition) is snapshotted into
  // kpi_definition_versions — same MAX(version)+1 pattern as scope_versions elsewhere in this
  // app — so a later redefinition doesn't silently change the meaning of historical observations
  // without a record.
  async function snapshotKpiVersion(kpiId, workspaceId, version, kpi, actorId) {
    await db
      .prepare('INSERT INTO kpi_definition_versions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(
        randomUUID(),
        kpiId,
        workspaceId,
        version,
        kpi.name,
        kpi.unit,
        kpi.target ?? null,
        kpi.calculationMethod ?? '',
        new Date().toISOString(),
        actorId,
      );
  }

  app.post('/api/kpis', async (req, res) => {
    const input = kpiSchema.parse(req.body);
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    await transaction(async () => {
      await db
        .prepare('INSERT INTO kpi_definitions VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, req.workspace.id, input.name, input.unit, input.target ?? null, createdAt, input.calculationMethod, 1);
      await snapshotKpiVersion(id, req.workspace.id, 1, input, req.user.id);
      await log(req.workspace.id, req.user.name, 'KPI defined', id, input.name);
    });
    res.status(201).json(await kpiFor(id, req.workspace.id));
  });

  // F-GROW-01: a redefinition is a new version, never a silent overwrite — GET
  // /kpis/:id/versions exposes the full history.
  app.patch('/api/kpis/:id', async (req, res) => {
    const kpi = await kpiFor(req.params.id, req.workspace.id);
    const input = kpiUpdateSchema.parse(req.body);
    const next = {
      name: input.name ?? kpi.name,
      unit: input.unit ?? kpi.unit,
      target: input.target === undefined ? kpi.target : input.target,
      calculationMethod: input.calculationMethod ?? kpi.calculation_method,
    };
    const version = kpi.version + 1;
    await transaction(async () => {
      await db
        .prepare('UPDATE kpi_definitions SET name = ?, unit = ?, target = ?, calculation_method = ?, version = ? WHERE id = ?')
        .run(next.name, next.unit, next.target ?? null, next.calculationMethod, version, kpi.id);
      await snapshotKpiVersion(kpi.id, req.workspace.id, version, next, req.user.id);
      await log(req.workspace.id, req.user.name, 'KPI redefined', kpi.id, `v${version}: ${next.name}`);
    });
    res.json(await kpiFor(kpi.id, req.workspace.id));
  });

  app.get('/api/kpis/:id/versions', async (req, res) => {
    const kpi = await kpiFor(req.params.id, req.workspace.id);
    res.json(
      await db.prepare('SELECT * FROM kpi_definition_versions WHERE kpi_id = ? ORDER BY version').all(kpi.id),
    );
  });

  app.delete('/api/kpis/:id', async (req, res) => {
    const kpi = await kpiFor(req.params.id, req.workspace.id);
    await transaction(async () => {
      await db.prepare('DELETE FROM kpi_observations WHERE kpi_id = ?').run(kpi.id);
      await db.prepare('DELETE FROM kpi_definition_versions WHERE kpi_id = ?').run(kpi.id);
      await db.prepare('DELETE FROM kpi_definitions WHERE id = ?').run(kpi.id);
      await log(req.workspace.id, req.user.name, 'KPI deleted', kpi.id, kpi.name);
    });
    res.status(204).end();
  });

  app.get('/api/kpis/:id/observations', async (req, res) => {
    const kpi = await kpiFor(req.params.id, req.workspace.id);
    const rows = await db.prepare('SELECT * FROM kpi_observations WHERE kpi_id = ? ORDER BY observed_at').all(kpi.id);
    res.json(rows.map((row) => ({ ...row, hasEvidence: Boolean(row.evidence_file_id) })));
  });

  app.post('/api/kpis/:id/observations', async (req, res) => {
    const kpi = await kpiFor(req.params.id, req.workspace.id);
    const input = observationSchema.parse(req.body);
    // Real evidence (F-GROW-01): the observer must own the uploaded file they're citing — same
    // ownership check reused from Deliverable Verification's uploadedFileId handling.
    if (input.evidenceFileId) {
      const file = await db
        .prepare('SELECT 1 FROM uploaded_files WHERE id = ? AND workspace_id = ? AND uploaded_by = ?')
        .get(input.evidenceFileId, req.workspace.id, req.user.id);
      if (!file) fail('That evidence file was not found in your workspace.', 404);
    }
    const id = randomUUID();
    const observedAt = input.observedAt || new Date().toISOString();
    await transaction(async () => {
      await db
        .prepare('INSERT INTO kpi_observations VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(id, kpi.id, input.value, observedAt, input.source, new Date().toISOString(), input.evidenceFileId ?? null);
      await log(req.workspace.id, req.user.name, 'KPI observation recorded', kpi.id, `${kpi.name} = ${input.value}`);
    });
    const row = await db.prepare('SELECT * FROM kpi_observations WHERE id = ?').get(id);
    res.status(201).json({ ...row, hasEvidence: Boolean(row.evidence_file_id) });
  });

  // Opportunity pipeline
  app.get('/api/opportunities', async (req, res) => {
    const rows = await db
      .prepare('SELECT * FROM opportunities WHERE workspace_id = ? ORDER BY created_at DESC')
      .all(req.workspace.id);
    res.json(rows.map((row) => ({ ...row, readiness: computeReadiness(row) })));
  });

  app.post('/api/opportunities', async (req, res) => {
    const input = opportunitySchema.parse(req.body);
    const id = randomUUID();
    const now = new Date().toISOString();
    await transaction(async () => {
      await db
        .prepare('INSERT INTO opportunities VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, req.workspace.id, input.title, input.description, input.source, 'identified', input.valueEstimate ?? null, now, now, input.type ?? null);
      await log(req.workspace.id, req.user.name, 'Opportunity identified', id, input.title);
    });
    res.status(201).json(await opportunityFor(id, req.workspace.id));
  });

  app.patch('/api/opportunities/:id', async (req, res) => {
    const opportunity = await opportunityFor(req.params.id, req.workspace.id);
    const input = opportunityUpdateSchema.parse(req.body);
    const next = {
      title: input.title ?? opportunity.title,
      description: input.description ?? opportunity.description,
      source: input.source ?? opportunity.source,
      value_estimate: input.valueEstimate === undefined ? opportunity.value_estimate : input.valueEstimate,
      status: input.status ?? opportunity.status,
      type: input.type === undefined ? opportunity.type : input.type,
    };
    await transaction(async () => {
      await db
        .prepare('UPDATE opportunities SET title = ?, description = ?, source = ?, value_estimate = ?, status = ?, updated_at = ?, type = ? WHERE id = ?')
        .run(next.title, next.description, next.source, next.value_estimate, next.status, new Date().toISOString(), next.type, opportunity.id);
      await log(req.workspace.id, req.user.name, 'Opportunity updated', opportunity.id, next.status);
    });
    res.json(await opportunityFor(opportunity.id, req.workspace.id));
  });

  app.delete('/api/opportunities/:id', async (req, res) => {
    const opportunity = await opportunityFor(req.params.id, req.workspace.id);
    await transaction(async () => {
      await db.prepare('DELETE FROM opportunities WHERE id = ?').run(opportunity.id);
      await log(req.workspace.id, req.user.name, 'Opportunity deleted', opportunity.id, opportunity.title);
    });
    res.status(204).end();
  });

  // Experiment lifecycle: draft -> running -> complete, with a persisted result.
  app.get('/api/experiments', async (req, res) => {
    const rows = await db
      .prepare('SELECT id FROM experiments WHERE workspace_id = ? ORDER BY created_at DESC')
      .all(req.workspace.id);
    res.json(await Promise.all(rows.map((row) => experimentFor(row.id, req.workspace.id))));
  });

  app.post('/api/experiments', async (req, res) => {
    const input = experimentSchema.parse(req.body);
    // Guardrail metrics must reference real KPIs in this workspace — never a fabricated
    // reference (F-GROW-01).
    if (input.guardrailMetricIds) {
      for (const kpiId of input.guardrailMetricIds) await kpiFor(kpiId, req.workspace.id);
    }
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    await transaction(async () => {
      await db
        .prepare('INSERT INTO experiments VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(
          id,
          req.workspace.id,
          input.title,
          input.hypothesis,
          input.metric,
          'draft',
          '',
          null,
          null,
          createdAt,
          input.variants ? JSON.stringify(input.variants) : null,
          input.guardrailMetricIds ? JSON.stringify(input.guardrailMetricIds) : null,
          null,
          null,
        );
      await log(req.workspace.id, req.user.name, 'Experiment drafted', id, input.title);
    });
    res.status(201).json(await experimentFor(id, req.workspace.id));
  });

  // F-GROW-01: starting an experiment is now a real approval gate (workspace:manage), not open
  // to any workspace member — reusing the existing permission system rather than inventing a new
  // approval workflow.
  app.patch('/api/experiments/:id/start', requirePermission('workspace:manage'), async (req, res) => {
    const experiment = await experimentFor(req.params.id, req.workspace.id);
    if (experiment.status !== 'draft') fail(`Cannot start an experiment that is already "${experiment.status}".`, 409);
    const startedAt = new Date().toISOString();
    await transaction(async () => {
      await db.prepare("UPDATE experiments SET status = 'running', started_at = ? WHERE id = ?").run(startedAt, experiment.id);
      await log(req.workspace.id, req.user.name, 'Experiment started', experiment.id, experiment.title);
    });
    res.json(await experimentFor(experiment.id, req.workspace.id));
  });

  app.patch('/api/experiments/:id/complete', async (req, res) => {
    const experiment = await experimentFor(req.params.id, req.workspace.id);
    if (experiment.status !== 'running') fail(`Cannot complete an experiment that is "${experiment.status}", not running.`, 409);
    const input = experimentCompleteSchema.parse(req.body);
    const variantNames = (experiment.variants || []).map((v) => v.name);
    if (input.winningVariant && !variantNames.includes(input.winningVariant))
      fail(`"${input.winningVariant}" is not one of this experiment's declared variants.`, 400);
    if (input.perVariantObservedValue) {
      const unknown = Object.keys(input.perVariantObservedValue).filter((name) => !variantNames.includes(name));
      if (unknown.length) fail(`Not a declared variant: ${unknown.join(', ')}.`, 400);
    }
    const endedAt = new Date().toISOString();
    await transaction(async () => {
      await db
        .prepare(
          "UPDATE experiments SET status = 'complete', result = ?, ended_at = ?, winning_variant = ?, per_variant_observed_value = ? WHERE id = ?",
        )
        .run(
          input.result,
          endedAt,
          input.winningVariant ?? null,
          input.perVariantObservedValue ? JSON.stringify(input.perVariantObservedValue) : null,
          experiment.id,
        );
      await log(req.workspace.id, req.user.name, 'Experiment completed', experiment.id, input.result);
    });
    res.json(await experimentFor(experiment.id, req.workspace.id));
  });

  app.delete('/api/experiments/:id', async (req, res) => {
    const experiment = await experimentFor(req.params.id, req.workspace.id);
    await transaction(async () => {
      await db.prepare('DELETE FROM experiments WHERE id = ?').run(experiment.id);
      await log(req.workspace.id, req.user.name, 'Experiment deleted', experiment.id, experiment.title);
    });
    res.status(204).end();
  });
}

export { OPPORTUNITY_STATUSES };
