import { randomUUID, randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

// Connector Platform (F-CORE-01): the audit asks for "connector grants and health" plus a
// "versioned event bus/outbox contract." This codebase has no existing OAuth flow or external
// provider integration to ground a specific connector type in — fabricating one would mean
// pretending to integrate with a service nothing here actually calls. What's real and buildable:
// a governance/registry layer (useful regardless of which providers get wired up later) and a
// genuinely working `webhook` connector type — an inbound URL bound to a signed HMAC secret,
// verifiable today, not a stub for an unbuilt OAuth grant. `manual` connectors just track status
// for a human-operated integration. No "typed temporal context graph" or "five-scope memory
// service" is built — both are large, novel concepts with no existing precedent or real consumer
// in this codebase (same discipline already applied to F-SI-01's "dependency graph").

const CONNECTOR_TYPES = ['webhook', 'manual'];
const CONNECTOR_STATUSES = ['connected', 'disconnected', 'error'];

const connectorSchema = z
  .object({ name: z.string().trim().min(1).max(200), type: z.enum(CONNECTOR_TYPES) })
  .strict();
const grantSchema = z.object({ scope: z.string().trim().min(1).max(200) }).strict();
const statusSchema = z.object({ status: z.enum(CONNECTOR_STATUSES) }).strict();

const fail = (message, status) => {
  throw Object.assign(new Error(message), { status });
};

// Real domain-event emission (F-CORE-01's "versioned event bus/outbox contract"), wired into
// three real write points this session already touched: objective stage change (goals.mjs),
// milestone decision (projects.mjs), recommendation status change (recommendations.mjs).
export async function emitDomainEvent(store, { workspaceId, eventType, payload }) {
  await store.db
    .prepare('INSERT INTO event_outbox (id, workspace_id, event_type, payload, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(randomUUID(), workspaceId, eventType, JSON.stringify(payload), new Date().toISOString());
}

// Mounted early, before the workspace-resolving auth middleware — same as mountKycWebhook/
// mountPaystackWebhook in app.mjs — since an external caller has no session/workspace cookie to
// resolve. Authenticated by HMAC signature instead of req.workspace/req.user.
export function mountConnectorWebhook(app, store) {
  const { db, transaction, log } = store;
  // A real, working webhook receiver: HMAC-SHA256 over the raw body, hex-encoded, in the
  // X-Signature header — the connector's own secret is the key. req.rawBody is already captured
  // app-wide by app.mjs's express.json({ verify }) middleware (the same mechanism the Paystack/
  // KYC webhooks already rely on).
  app.post('/api/connectors/:id/webhook', async (req, res) => {
    const connector = await db.prepare('SELECT * FROM connectors WHERE id = ?').get(req.params.id);
    if (!connector || connector.type !== 'webhook' || !connector.secret)
      return res.status(404).json({ error: 'Webhook connector not found.' });
    const signature = req.get('X-Signature') || '';
    const expected = createHmac('sha256', connector.secret).update(req.rawBody || Buffer.from('')).digest('hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    const signatureBuf = Buffer.from(signature, 'hex');
    if (signatureBuf.length !== expectedBuf.length || !timingSafeEqual(signatureBuf, expectedBuf))
      return res.status(401).json({ error: 'Invalid signature.' });
    await transaction(async () => {
      await db
        .prepare("UPDATE connectors SET status = 'connected', last_sync_at = ? WHERE id = ?")
        .run(new Date().toISOString(), connector.id);
      await emitDomainEvent(store, {
        workspaceId: connector.workspace_id,
        eventType: `connector.${connector.name}.received`,
        payload: req.body || {},
      });
      await log(connector.workspace_id, 'webhook', 'Connector webhook received', connector.id, connector.name);
    });
    res.json({ ok: true });
  });
}

export function mountConnectors(app, store) {
  const { db, transaction, log } = store;

  async function connectorFor(id, workspaceId) {
    const row = await db.prepare('SELECT * FROM connectors WHERE id = ? AND workspace_id = ?').get(id, workspaceId);
    if (!row) fail('Connector not found.', 404);
    return row;
  }
  const redact = (row) => {
    const { secret, ...rest } = row;
    return { ...rest, hasSecret: Boolean(secret) };
  };

  app.get('/api/connectors', async (req, res) => {
    res.json(
      (await db.prepare('SELECT * FROM connectors WHERE workspace_id = ? ORDER BY created_at').all(req.workspace.id)).map(
        redact,
      ),
    );
  });

  app.post('/api/connectors', async (req, res) => {
    const input = connectorSchema.parse(req.body);
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    // The secret is a real HMAC signing key for webhook connectors — returned once, on create,
    // never again (matching every other one-time-secret pattern in this codebase).
    const secret = input.type === 'webhook' ? randomBytes(32).toString('hex') : null;
    await transaction(async () => {
      await db
        .prepare('INSERT INTO connectors VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, req.workspace.id, input.name, input.type, 'disconnected', secret, null, req.user.id, createdAt);
      await log(req.workspace.id, req.user.name, 'Connector registered', id, `${input.name} (${input.type})`);
    });
    const row = await connectorFor(id, req.workspace.id);
    res.status(201).json({ ...redact(row), secret });
  });

  app.patch('/api/connectors/:id/status', async (req, res) => {
    const connector = await connectorFor(req.params.id, req.workspace.id);
    const input = statusSchema.parse(req.body);
    await transaction(async () => {
      await db
        .prepare('UPDATE connectors SET status = ?, last_sync_at = ? WHERE id = ?')
        .run(input.status, new Date().toISOString(), connector.id);
      await log(req.workspace.id, req.user.name, 'Connector status updated', connector.id, input.status);
    });
    res.json(redact(await connectorFor(connector.id, req.workspace.id)));
  });

  app.delete('/api/connectors/:id', async (req, res) => {
    const connector = await connectorFor(req.params.id, req.workspace.id);
    await transaction(async () => {
      await db.prepare('DELETE FROM connector_grants WHERE connector_id = ?').run(connector.id);
      await db.prepare('DELETE FROM connectors WHERE id = ?').run(connector.id);
      await log(req.workspace.id, req.user.name, 'Connector deleted', connector.id, connector.name);
    });
    res.status(204).end();
  });

  app.get('/api/connectors/:id/grants', async (req, res) => {
    const connector = await connectorFor(req.params.id, req.workspace.id);
    res.json(
      await db.prepare('SELECT * FROM connector_grants WHERE connector_id = ? ORDER BY granted_at').all(connector.id),
    );
  });

  app.post('/api/connectors/:id/grants', async (req, res) => {
    const connector = await connectorFor(req.params.id, req.workspace.id);
    const input = grantSchema.parse(req.body);
    const id = randomUUID();
    const grantedAt = new Date().toISOString();
    await transaction(async () => {
      await db
        .prepare('INSERT INTO connector_grants VALUES (?, ?, ?, ?, ?, ?)')
        .run(id, connector.id, input.scope, req.user.id, grantedAt, null);
      await log(req.workspace.id, req.user.name, 'Connector grant added', connector.id, input.scope);
    });
    res.status(201).json(await db.prepare('SELECT * FROM connector_grants WHERE id = ?').get(id));
  });

  app.delete('/api/connectors/:id/grants/:grantId', async (req, res) => {
    const connector = await connectorFor(req.params.id, req.workspace.id);
    const grant = await db
      .prepare('SELECT * FROM connector_grants WHERE id = ? AND connector_id = ?')
      .get(req.params.grantId, connector.id);
    if (!grant) return res.status(404).json({ error: 'Grant not found.' });
    if (grant.revoked_at) return res.status(409).json({ error: 'This grant is already revoked.' });
    await transaction(async () => {
      await db
        .prepare('UPDATE connector_grants SET revoked_at = ? WHERE id = ?')
        .run(new Date().toISOString(), grant.id);
      await log(req.workspace.id, req.user.name, 'Connector grant revoked', connector.id, grant.scope);
    });
    res.json({ ok: true });
  });

  // Cursor-based pagination (F-CORE-01's own "versioning/error/pagination conventions" ask, in
  // the simplest honest form): `since` is the last seq the caller has already seen.
  app.get('/api/events', async (req, res) => {
    const since = z.coerce.number().int().nonnegative().default(0).parse(req.query.since);
    const rows = await db
      .prepare('SELECT * FROM event_outbox WHERE workspace_id = ? AND seq > ? ORDER BY seq LIMIT 100')
      .all(req.workspace.id, since);
    if (rows.length)
      await db
        .prepare('UPDATE event_outbox SET delivered_at = ? WHERE id = ANY(?) AND delivered_at IS NULL')
        .run(new Date().toISOString(), rows.map((r) => r.id));
    res.json(
      rows.map((row) => ({
        seq: Number(row.seq),
        eventType: row.event_type,
        payload: JSON.parse(row.payload),
        createdAt: row.created_at,
      })),
    );
  });
}

export { CONNECTOR_TYPES, CONNECTOR_STATUSES };
