import { isVerifiedEcosystemAdmin } from '../policy.mjs';
import { getGroupwareConfig, sanitizeLogData } from './config.mjs';
import { GroupwareClient } from './client.mjs';

/**
 * Mounts administrative monitoring and manual recovery endpoints.
 * Gated strictly to verified ecosystem administrators (Rule 02 & 03).
 */
export function mountGroupwareAdmin(app, store, options = {}) {
  const { db, transaction, log } = store;
  const config = getGroupwareConfig(options);
  const ecosystemAdminEmails = options.ecosystemAdminEmails || [];

  function requireAdmin(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const isAdmin =
      req.user.role === 'admin' ||
      isVerifiedEcosystemAdmin(req, ecosystemAdminEmails);

    if (!isAdmin) {
      return res.status(403).json({ error: 'Administrative privileges required.' });
    }
    next();
  }

  // Diagnostic status endpoint
  app.get('/api/admin/groupware/status', requireAdmin, async (req, res) => {
    try {
      const client = new GroupwareClient(options);
      let ping = { reachable: false, status: 'unconfigured' };

      if (config.isConfigured) {
        try {
          const check = await client.checkStatus();
          ping = { reachable: true, status: 'connected', response: check };
        } catch (err) {
          ping = { reachable: false, status: 'error', error: err.message };
        }
      }

      // Aggregate synchronization metrics
      const totalIdentities = await db
        .prepare('SELECT count(*)::int AS count FROM global_user_identities')
        .get()
        .then((r) => r?.count ?? 0);

      const clientsCount = await db
        .prepare('SELECT count(*)::int AS count FROM global_user_identities WHERE is_client = 1')
        .get()
        .then((r) => r?.count ?? 0);

      const prospectsCount = totalIdentities - clientsCount;

      const entityMappingsCount = await db
        .prepare('SELECT count(*)::int AS count FROM groupware_entity_mappings')
        .get()
        .then((r) => r?.count ?? 0);

      const lastSyncRow = await db
        .prepare("SELECT completed_at FROM groupware_sync_events WHERE status = 'completed' ORDER BY completed_at DESC LIMIT 1")
        .get();

      const failedEvents = await db
        .prepare("SELECT id, event_id, direction, entity_type, entity_id, action, attempt_count, last_error, created_at, next_retry_at FROM groupware_sync_events WHERE status = 'failed' ORDER BY created_at DESC LIMIT 20")
        .all();

      const pendingRetries = await db
        .prepare("SELECT count(*)::int AS count FROM groupware_sync_events WHERE status IN ('pending', 'failed') AND attempt_count < max_attempts")
        .get()
        .then((r) => r?.count ?? 0);

      res.json({
        enabled: config.enabled,
        isConfigured: config.isConfigured,
        baseUrl: config.baseUrl,
        connection: ping,
        metrics: {
          totalIdentities,
          clientsCount,
          prospectsCount,
          entityMappingsCount,
          lastSyncAt: lastSyncRow?.completed_at || null,
          pendingRetries,
        },
        failedEvents: sanitizeLogData(failedEvents || []),
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to retrieve Groupware status', message: err.message });
    }
  });

  // Re-attempt delivery of a specific failed event
  app.post('/api/admin/groupware/retry/:id', requireAdmin, async (req, res) => {
    try {
      const event = await db
        .prepare('SELECT * FROM groupware_sync_events WHERE id = ?')
        .get(req.params.id);

      if (!event) {
        return res.status(404).json({ error: 'Sync event not found.' });
      }

      const client = new GroupwareClient(options);
      const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;

      let result = null;
      if (event.direction === 'outbound') {
        if (event.entity_type === 'user') result = await client.syncUser(payload);
        else if (event.entity_type === 'client_conversion') result = await client.syncClientConversion(payload);
        else if (event.entity_type === 'project') result = await client.syncProject(payload);
        else if (event.entity_type === 'milestone') result = await client.syncMilestone(payload);
        else if (event.entity_type === 'payment' || event.entity_type === 'escrow') result = await client.syncTransaction(payload);
        else if (event.entity_type === 'review') result = await client.syncReview(payload);
      }

      const now = new Date().toISOString();
      await db
        .prepare("UPDATE groupware_sync_events SET status = 'completed', attempt_count = attempt_count + 1, completed_at = ?, last_error = NULL WHERE id = ?")
        .run(now, event.id);

      res.json({ ok: true, retried: true, eventId: event.event_id, result });
    } catch (err) {
      const now = new Date().toISOString();
      await db
        .prepare('UPDATE groupware_sync_events SET attempt_count = attempt_count + 1, last_error = ? WHERE id = ?')
        .run(err.message.slice(0, 500), req.params.id);

      res.status(500).json({ error: 'Retry failed', message: err.message });
    }
  });
}

