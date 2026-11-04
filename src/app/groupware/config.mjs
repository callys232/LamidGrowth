// Configuration and secret management for LAMID ONE ↔ Groupware Integration
// Rule 11 & Rule 08: All credentials stay strictly server-side, never exposed to clients.

export function getGroupwareConfig(overrides = {}) {
  const baseUrl = (
    overrides.baseUrl ||
    process.env.GROUPWARE_API_BASE_URL ||
    'https://lamid.vercel.app'
  ).replace(/\/+$/, '');

  const apiKey = overrides.apiKey || process.env.GROUPWARE_API_KEY || '';
  const apiSecret = overrides.apiSecret || process.env.GROUPWARE_API_SECRET || '';
  const webhookSecret =
    overrides.webhookSecret ||
    process.env.GROUPWARE_WEBHOOK_SECRET ||
    apiSecret ||
    '';

  const timeoutMs = Math.max(
    1000,
    Number.parseInt(process.env.GROUPWARE_TIMEOUT_MS || '8000', 10) || 8000,
  );

  const maxRetries = Math.max(
    1,
    Number.parseInt(process.env.GROUPWARE_MAX_RETRIES || '5', 10) || 5,
  );

  const enabled =
    overrides.enabled ??
    (process.env.GROUPWARE_INTEGRATION_ENABLED !== 'false');

  return {
    baseUrl,
    apiKey,
    apiSecret,
    webhookSecret,
    timeoutMs,
    maxRetries,
    enabled,
    isConfigured: Boolean(apiKey && apiSecret),
  };
}

/** Sanitize an error or object so secrets and tokens are never leaked into logs or admin responses. */
export function sanitizeLogData(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeLogData);

  const redacted = {};
  const sensitiveKeys = new Set([
    'password',
    'password_hash',
    'secret',
    'apisecret',
    'apikey',
    'token',
    'access_token',
    'authorization',
    'webhooksecret',
    'key',
  ]);

  for (const [k, v] of Object.entries(obj)) {
    if (sensitiveKeys.has(k.toLowerCase())) {
      redacted[k] = '[REDACTED]';
    } else if (v && typeof v === 'object') {
      redacted[k] = sanitizeLogData(v);
    } else {
      redacted[k] = v;
    }
  }
  return redacted;
}

