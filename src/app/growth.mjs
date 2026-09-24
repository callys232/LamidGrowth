import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const title = z.string().trim().min(1).max(500);
const longText = z.string().trim().max(10000).default('');

const kpiSchema = z
  .object({ name: title, unit: z.string().trim().max(50).default(''), target: z.number().finite().optional() })
  .strict();
const observationSchema = z
  .object({
    value: z.number().finite(),
    observedAt: z.string().optional(),
    source: z.string().trim().max(200).default(''),
  })
  .strict();

const OPPORTUNITY_STATUSES = ['identified', 'qualified', 'pursuing', 'won', 'lost'];
const opportunitySchema = z
  .object({
    title,
    description: longText,
    source: z.string().trim().max(200).default(''),
    valueEstimate: z.number().finite().optional(),
  })
  .strict();
const opportunityUpdateSchema = z
  .object({
    title: title.optional(),
    description: longText.optional(),
    source: z.string().trim().max(200).optional(),
    valueEstimate: z.number().finite().nullable().optional(),
    status: z.enum(OPPORTUNITY_STATUSES).optional(),
  })
  .strict();

const experimentSchema = z
  .object({ title, hypothesis: z.string().trim().min(1).max(5000), metric: z.string().trim().min(1).max(500) })
  .strict();
const experimentCompleteSchema = z.object({ result: z.string().trim().min(1).max(5000) }).strict();

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
    return row;
  }
  async function experimentFor(id, workspaceId) {
    const row = await db.prepare('SELECT * FROM experiments WHERE id = ? AND workspace_id = ?').get(id, workspaceId);
    if (!row) fail('Experiment not found.', 404);
    return row;
  }

  // KPI definitions + observations
  app.get('/api/kpis', async (req, res) => {
    res.json(
      await db.prepare('SELECT * FROM kpi_definitions WHERE workspace_id = ? ORDER BY created_at').all(req.workspace.id),
    );
  });

  app.post('/api/kpis', async (req, res) => {
    const input = kpiSchema.parse(req.body);
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    await transaction(async () => {
      await db
        .prepare('INSERT INTO kpi_definitions VALUES (?, ?, ?, ?, ?, ?)')
        .run(id, req.workspace.id, input.name, input.unit, input.target ?? null, createdAt);
      await log(req.workspace.id, req.user.name, 'KPI defined', id, input.name);
    });
    res.status(201).json(await kpiFor(id, req.workspace.id));
  });

  app.delete('/api/kpis/:id', async (req, res) => {
    const kpi = await kpiFor(req.params.id, req.workspace.id);
    await transaction(async () => {
      await db.prepare('DELETE FROM kpi_observations WHERE kpi_id = ?').run(kpi.id);
      await db.prepare('DELETE FROM kpi_definitions WHERE id = ?').run(kpi.id);
      await log(req.workspace.id, req.user.name, 'KPI deleted', kpi.id, kpi.name);
    });
    res.status(204).end();
  });

  app.get('/api/kpis/:id/observations', async (req, res) => {
    const kpi = await kpiFor(req.params.id, req.workspace.id);
    res.json(await db.prepare('SELECT * FROM kpi_observations WHERE kpi_id = ? ORDER BY observed_at').all(kpi.id));
  });

  app.post('/api/kpis/:id/observations', async (req, res) => {
    const kpi = await kpiFor(req.params.id, req.workspace.id);
    const input = observationSchema.parse(req.body);
    const id = randomUUID();
    const observedAt = input.observedAt || new Date().toISOString();
    await transaction(async () => {
      await db
        .prepare('INSERT INTO kpi_observations VALUES (?, ?, ?, ?, ?, ?)')
        .run(id, kpi.id, input.value, observedAt, input.source, new Date().toISOString());
      await log(req.workspace.id, req.user.name, 'KPI observation recorded', kpi.id, `${kpi.name} = ${input.value}`);
    });
    res.status(201).json(await db.prepare('SELECT * FROM kpi_observations WHERE id = ?').get(id));
  });

  // Opportunity pipeline
  app.get('/api/opportunities', async (req, res) => {
    res.json(
      await db.prepare('SELECT * FROM opportunities WHERE workspace_id = ? ORDER BY created_at DESC').all(req.workspace.id),
    );
  });

  app.post('/api/opportunities', async (req, res) => {
    const input = opportunitySchema.parse(req.body);
    const id = randomUUID();
    const now = new Date().toISOString();
    await transaction(async () => {
      await db
        .prepare('INSERT INTO opportunities VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, req.workspace.id, input.title, input.description, input.source, 'identified', input.valueEstimate ?? null, now, now);
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
    };
    await transaction(async () => {
      await db
        .prepare('UPDATE opportunities SET title = ?, description = ?, source = ?, value_estimate = ?, status = ?, updated_at = ? WHERE id = ?')
        .run(next.title, next.description, next.source, next.value_estimate, next.status, new Date().toISOString(), opportunity.id);
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
    res.json(
      await db.prepare('SELECT * FROM experiments WHERE workspace_id = ? ORDER BY created_at DESC').all(req.workspace.id),
    );
  });

  app.post('/api/experiments', async (req, res) => {
    const input = experimentSchema.parse(req.body);
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    await transaction(async () => {
      await db
        .prepare('INSERT INTO experiments VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, req.workspace.id, input.title, input.hypothesis, input.metric, 'draft', '', null, null, createdAt);
      await log(req.workspace.id, req.user.name, 'Experiment drafted', id, input.title);
    });
    res.status(201).json(await experimentFor(id, req.workspace.id));
  });

  app.patch('/api/experiments/:id/start', async (req, res) => {
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
    const endedAt = new Date().toISOString();
    await transaction(async () => {
      await db
        .prepare("UPDATE experiments SET status = 'complete', result = ?, ended_at = ? WHERE id = ?")
        .run(input.result, endedAt, experiment.id);
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
