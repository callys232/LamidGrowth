import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import { requirePermission } from './policy.mjs';
import { createConnectorProviders } from './connectorProviders.mjs';
import { emitDomainEvent } from './connectors.mjs';

const fail = (message, status) => {
  throw Object.assign(new Error(message), { status });
};
export function mountNativeConnectors(app, store, options = {}) {
  const { providers, key, origin } = createConnectorProviders(options);
  const { db, transaction, log } = store;
  const manage = requirePermission('workspace:manage');
  const encrypt = (value) => {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64')).join('.');
  };
  const decrypt = (payload) => {
    const [iv, tag, data] = payload.split('.').map((s) => Buffer.from(s, 'base64'));
    const cipher = createDecipheriv('aes-256-gcm', key, iv);
    cipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([cipher.update(data), cipher.final()]).toString('utf8'));
  };
  const providerFor = (id) => {
    const provider = providers[id];
    if (!provider) fail('Unknown connection provider.', 404);
    if (!provider.configured)
      fail(`${provider.name} connection setup is required by the platform administrator.`, 503);
    return provider;
  };
  const connectorFor = async (req) => {
    const row = await db
      .prepare('SELECT * FROM connectors WHERE id = ? AND workspace_id = ?')
      .get(req.params.id, req.workspace.id);
    if (!row) fail('Connector not found.', 404);
    return row;
  };
  const savedToken = async (row) => {
    if (!key) fail('Connector encryption is not configured.', 503);
    const saved = await db
      .prepare('SELECT * FROM connector_credentials WHERE connector_id = ?')
      .get(row.id);
    if (!saved) fail('Reconnect this service to continue.', 409);
    return saved;
  };

  app.get('/api/connectors/providers', (_req, res) =>
    res.json(
      Object.entries(providers).map(([id, p]) => ({
        id,
        name: p.name,
        configured: p.configured,
        scopes: p.scopes,
        description: p.description,
      })),
    ),
  );
  app.post('/api/connectors/oauth/:provider/start', manage, async (req, res) => {
    const provider = providerFor(req.params.provider);
    const state = randomBytes(32).toString('base64url');
    const verifier = randomBytes(32).toString('base64url');
    await db.prepare('DELETE FROM connector_oauth_states WHERE expires_at < ?').run(Date.now());
    await db
      .prepare(
        'INSERT INTO connector_oauth_states (state_hash,provider,workspace_id,user_id,verifier,expires_at) VALUES (?,?,?,?,?,?)',
      )
      .run(
        createHash('sha256').update(state).digest('hex'),
        req.params.provider,
        req.workspace.id,
        req.user.id,
        encrypt(verifier),
        Date.now() + 600000,
      );
    res.json({ url: provider.authorize(state, verifier) });
  });
  app.get('/api/connectors/oauth/:provider/callback', manage, async (req, res) => {
    const provider = providerFor(req.params.provider);
    if (typeof req.query.state !== 'string' || req.query.state.length > 200)
      fail('Invalid connection state.', 400);
    const state = await db
      .prepare(
        'DELETE FROM connector_oauth_states WHERE state_hash = ? AND provider = ? AND workspace_id = ? AND user_id = ? AND expires_at > ? RETURNING *',
      )
      .get(
        createHash('sha256').update(req.query.state).digest('hex'),
        req.params.provider,
        req.workspace.id,
        req.user.id,
        Date.now(),
      );
    if (!state) fail('This connection request expired or was already used. Start again.', 400);
    const destination = `${new URL(origin).origin}/os/integrations`;
    if (req.query.error) return res.redirect(`${destination}?connection=cancelled`);
    if (typeof req.query.code !== 'string' || !req.query.code || req.query.code.length > 4096)
      fail('Missing authorization code.', 400);
    const token = await provider.exchange(req.query.code, decrypt(state.verifier));
    if (!token.accessToken) fail('The provider did not grant access.', 502);
    const id = randomUUID();
    const now = new Date().toISOString();
    await transaction(async () => {
      await db
        .prepare(
          'INSERT INTO connectors (id,workspace_id,name,type,status,secret,last_sync_at,created_by,created_at) VALUES (?,?,?,?,?,NULL,NULL,?,?)',
        )
        .run(
          id,
          req.workspace.id,
          `${provider.name} — ${token.account}`,
          req.params.provider,
          'connected',
          req.user.id,
          now,
        );
      await db
        .prepare('INSERT INTO connector_credentials (connector_id,payload) VALUES (?,?)')
        .run(id, encrypt(token));
      for (const scope of token.scopes)
        await db
          .prepare(
            'INSERT INTO connector_grants (id,connector_id,scope,granted_by,granted_at,revoked_at) VALUES (?,?,?,?,?,NULL)',
          )
          .run(randomUUID(), id, scope, req.user.id, now);
      await log(req.workspace.id, req.user.name, 'Service connected', id, provider.name);
    });
    res.redirect(`${destination}?connection=connected`);
  });
  app.post('/api/connectors/:id/sync', manage, async (req, res) => {
    const row = await connectorFor(req);
    const provider = providerFor(row.type);
    try {
      // Lock credentials while reading/rotating tokens and importing the snapshot. This also
      // serializes disconnect, so a concurrent disconnect cannot be undone by an import.
      const snapshot = await transaction(async () => {
        const credential = await db
          .prepare('SELECT * FROM connector_credentials WHERE connector_id = ? FOR UPDATE')
          .get(row.id);
        if (!credential) fail('Reconnect this service to continue.', 409);
        let token = decrypt(credential.payload);
        const refresh = async () => {
          if (!token.refreshToken) fail('Access expired. Reconnect this service.', 409);
          token = await provider.refresh(token);
          if (!token.accessToken) fail('The provider did not refresh access.', 502);
          await db
            .prepare('UPDATE connector_credentials SET payload = ? WHERE connector_id = ?')
            .run(encrypt(token), row.id);
        };
        let data;
        try {
          if (token.expiresAt && token.expiresAt <= Date.now() + 60000) await refresh();
          try {
            data = await provider.read(token);
          } catch (error) {
            if (!token.refreshToken) throw error;
            await refresh();
            data = await provider.read(token);
          }
        } catch (error) {
          // Commit any rotated token even if the subsequent read fails.
          return { error };
        }
        const at = new Date().toISOString();
        await db
          .prepare("UPDATE connectors SET status = 'connected', last_sync_at = ? WHERE id = ?")
          .run(at, row.id);
        await db
          .prepare(
            'UPDATE connector_credentials SET snapshot = ?, synced_at = ? WHERE connector_id = ?',
          )
          .run(JSON.stringify(data), at, row.id);
        await emitDomainEvent(store, {
          workspaceId: req.workspace.id,
          eventType: `connector.${row.type}.synced`,
          payload: {
            connectorId: row.id,
            counts: Object.fromEntries(
              Object.entries(data)
                .filter(([, v]) => Array.isArray(v))
                .map(([k, v]) => [k, v.length]),
            ),
            hasMore: data.hasMore,
          },
        });
        await log(
          req.workspace.id,
          req.user.name,
          'Service snapshot imported',
          row.id,
          provider.name,
        );
        return data;
      });
      if (snapshot.error) throw snapshot.error;
      res.json(snapshot);
    } catch (error) {
      await db.prepare("UPDATE connectors SET status = 'error' WHERE id = ?").run(row.id);
      throw error;
    }
  });
  app.get('/api/connectors/:id/snapshot', manage, async (req, res) => {
    const row = await connectorFor(req);
    const saved = await savedToken(row);
    res.json({
      syncedAt: saved.synced_at,
      data: saved.snapshot ? JSON.parse(saved.snapshot) : null,
    });
  });
  app.delete('/api/connectors/:id', manage, async (req, res, next) => {
    const row = await connectorFor(req);
    if (!providers[row.type]) return next();
    const provider = providerFor(row.type);
    await transaction(async () => {
      const saved = await db
        .prepare('SELECT * FROM connector_credentials WHERE connector_id = ? FOR UPDATE')
        .get(row.id);
      if (saved) await provider.revoke(decrypt(saved.payload));
      await db.prepare('DELETE FROM connector_grants WHERE connector_id = ?').run(row.id);
      await db.prepare('DELETE FROM connector_credentials WHERE connector_id = ?').run(row.id);
      await db.prepare('DELETE FROM connectors WHERE id = ?').run(row.id);
      await log(req.workspace.id, req.user.name, 'Service disconnected', row.id, provider.name);
    });
    res.status(204).end();
  });
}
