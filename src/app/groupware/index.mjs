import { mountGroupwareWebhook } from './webhook.mjs';
import { mountGroupwareAdmin } from './admin.mjs';
import { queueOutboundSync } from './sync.mjs';
import { findOrCreateGlobalIdentity, promoteToPayingClient } from './identity.mjs';
import { getGroupwareConfig } from './config.mjs';
import { GroupwareClient } from './client.mjs';

export {
  mountGroupwareWebhook,
  mountGroupwareAdmin,
  queueOutboundSync,
  findOrCreateGlobalIdentity,
  promoteToPayingClient,
  getGroupwareConfig,
  GroupwareClient,
};

/**
 * Mounts the complete Groupware Integration Layer on the Express application.
 */
export function mountGroupwareIntegration(app, store, options = {}) {
  // Mount administrative monitoring & recovery endpoints
  mountGroupwareAdmin(app, store, options);

  // Return programmatic API for internal LAMID ONE callers
  return {
    client: new GroupwareClient(options),
    queueOutboundSync: (eventData) => queueOutboundSync(store, eventData),
    findOrCreateGlobalIdentity: (identityData) => findOrCreateGlobalIdentity(store, identityData),
    promoteToPayingClient: (conversionData) => promoteToPayingClient(store, conversionData),
  };
}

