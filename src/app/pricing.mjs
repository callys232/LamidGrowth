import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { POINTS_UNIT_PRICE_MINOR } from './billing.mjs';

const bundleSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2000).default(''),
    priceMinor: z.number().int().positive(),
    currency: z.string().regex(/^[A-Z]{3}$/).default('USD'),
    pointsIncluded: z.number().int().min(0).default(0),
    billingCycle: z.enum(['one_time', 'monthly']).default('one_time'),
    agentIds: z.array(z.string().trim().min(1)).max(200).default([]),
  })
  .strict();
const bundleUpdateSchema = bundleSchema
  .partial()
  .extend({ status: z.enum(['draft', 'active', 'archived']).optional() })
  .strict();

function bundleWithItems(db, bundleId) {
  const bundle = db.prepare('SELECT * FROM bundles WHERE id = ?').get(bundleId);
  if (!bundle) return null;
  const items = db
    .prepare(
      `SELECT agent_manifests.id, agent_manifests.name, agent_manifests.home_engine, agent_manifests.points_cost
       FROM bundle_items JOIN agent_manifests ON agent_manifests.id = bundle_items.agent_id
       WHERE bundle_items.bundle_id = ?`,
    )
    .all(bundleId);
  return { ...bundle, items };
}

export function mountPricing(app, store, { ecosystemAdminEmails = [] } = {}) {
  const { db, transaction, log } = store;
  const isAdmin = (req) => ecosystemAdminEmails.includes((req.user.email || '').toLowerCase());

  // Every registered tool/engine is a billable — this is the same agent_manifests registry
  // the companion runs against, so the price list can never drift from what's actually callable.
  app.get('/api/billables', (req, res) => {
    const tools = db
      .prepare(
        'SELECT id, name, home_engine, max_authority, human_gate, points_cost FROM agent_manifests ORDER BY home_engine, name',
      )
      .all();
    res.json({
      pointsUnitPriceMinor: POINTS_UNIT_PRICE_MINOR,
      currency: 'USD',
      tools,
    });
  });

  app.get('/api/bundles', (req, res) => {
    const bundles = db.prepare("SELECT * FROM bundles WHERE status = 'active' ORDER BY price_minor").all();
    res.json(bundles.map((bundle) => bundleWithItems(db, bundle.id)));
  });

  app.get('/api/admin/bundles', (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Only an ecosystem administrator can manage bundles.' });
    const bundles = db.prepare('SELECT * FROM bundles ORDER BY created_at DESC').all();
    res.json(bundles.map((bundle) => bundleWithItems(db, bundle.id)));
  });

  app.post('/api/admin/bundles', (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Only an ecosystem administrator can create bundles.' });
    const input = bundleSchema.parse(req.body);
    const validAgentIds = input.agentIds.length
      ? db
          .prepare(`SELECT id FROM agent_manifests WHERE id IN (${input.agentIds.map(() => '?').join(',')})`)
          .all(...input.agentIds)
          .map((row) => row.id)
      : [];
    if (validAgentIds.length !== input.agentIds.length)
      return res.status(400).json({ error: 'One or more selected tools do not exist.' });
    const id = randomUUID();
    const now = new Date().toISOString();
    transaction(() => {
      db.prepare(
        `INSERT INTO bundles (id, name, description, price_minor, currency, points_included, billing_cycle, status, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`,
      ).run(id, input.name, input.description, input.priceMinor, input.currency, input.pointsIncluded, input.billingCycle, req.user.id, now, now);
      for (const agentId of validAgentIds)
        db.prepare('INSERT INTO bundle_items (id, bundle_id, agent_id, created_at) VALUES (?, ?, ?, ?)').run(
          randomUUID(),
          id,
          agentId,
          now,
        );
      log(req.workspace.id, req.user.name, 'Bundle created', id, input.name);
    });
    res.status(201).json(bundleWithItems(db, id));
  });

  app.patch('/api/admin/bundles/:id', (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Only an ecosystem administrator can edit bundles.' });
    const existing = db.prepare('SELECT * FROM bundles WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Bundle not found.' });
    const input = bundleUpdateSchema.parse(req.body);
    let validAgentIds = null;
    if (input.agentIds) {
      validAgentIds = input.agentIds.length
        ? db
            .prepare(`SELECT id FROM agent_manifests WHERE id IN (${input.agentIds.map(() => '?').join(',')})`)
            .all(...input.agentIds)
            .map((row) => row.id)
        : [];
      if (validAgentIds.length !== input.agentIds.length)
        return res.status(400).json({ error: 'One or more selected tools do not exist.' });
    }
    const now = new Date().toISOString();
    transaction(() => {
      db.prepare(
        `UPDATE bundles SET name = ?, description = ?, price_minor = ?, currency = ?, points_included = ?, billing_cycle = ?, status = ?, updated_at = ?
         WHERE id = ?`,
      ).run(
        input.name ?? existing.name,
        input.description ?? existing.description,
        input.priceMinor ?? existing.price_minor,
        input.currency ?? existing.currency,
        input.pointsIncluded ?? existing.points_included,
        input.billingCycle ?? existing.billing_cycle,
        input.status ?? existing.status,
        now,
        req.params.id,
      );
      if (validAgentIds) {
        db.prepare('DELETE FROM bundle_items WHERE bundle_id = ?').run(req.params.id);
        for (const agentId of validAgentIds)
          db.prepare('INSERT INTO bundle_items (id, bundle_id, agent_id, created_at) VALUES (?, ?, ?, ?)').run(
            randomUUID(),
            req.params.id,
            agentId,
            now,
          );
      }
      log(req.workspace.id, req.user.name, 'Bundle updated', req.params.id, input.name ?? existing.name);
    });
    res.json(bundleWithItems(db, req.params.id));
  });

  app.delete('/api/admin/bundles/:id', (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Only an ecosystem administrator can delete bundles.' });
    const existing = db.prepare('SELECT * FROM bundles WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Bundle not found.' });
    transaction(() => {
      db.prepare('DELETE FROM bundle_items WHERE bundle_id = ?').run(req.params.id);
      db.prepare('DELETE FROM bundles WHERE id = ?').run(req.params.id);
      log(req.workspace.id, req.user.name, 'Bundle deleted', req.params.id, existing.name);
    });
    res.json({ ok: true });
  });
}
