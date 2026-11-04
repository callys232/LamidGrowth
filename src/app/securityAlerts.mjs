import { randomUUID } from 'node:crypto';

/**
 * Persists and dispatches a security event.
 * Alert types:
 * - 'account_locked': User exceeded maximum failed login attempts
 * - 'suspicious_login': Login from unrecognized IP or device
 * - 'malicious_file_blocked': Attempt to upload executable/script
 * - 'inactivity_timeout': Session closed after idle period
 * - 'privilege_escalation_attempt': Unauthorized admin access attempt
 */
export async function recordSecurityAlert(store, {
  userId = null,
  workspaceId = null,
  alertType,
  severity = 'info', // 'info' | 'warning' | 'critical'
  details,
  ipAddress = null,
  errorLogger = null,
} = {}) {
  const id = randomUUID();
  const now = Date.now();
  const detailStr = typeof details === 'string' ? details : JSON.stringify(details || {});

  try {
    await store.db.prepare(
      `INSERT INTO security_alerts (id, user_id, workspace_id, alert_type, severity, details, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, userId, workspaceId, alertType, severity, detailStr, ipAddress, now);
  } catch (err) {
    // If table doesn't exist yet or DB error occurs, gracefully fallback to console/errorLogger
    if (errorLogger) {
      errorLogger('security_alert_storage_failed', { error: err.message, alertType, severity });
    }
  }

  if (errorLogger && (severity === 'warning' || severity === 'critical')) {
    errorLogger('security_alert', {
      id,
      userId,
      workspaceId,
      alertType,
      severity,
      details: detailStr,
      ipAddress,
      createdAt: now,
    });
  }

  // If a dedicated security alert webhook is configured in environment, dispatch asynchronously
  const alertWebhookUrl = process.env.SECURITY_ALERT_WEBHOOK_URL;
  if (alertWebhookUrl && typeof globalThis.fetch === 'function') {
    globalThis.fetch(alertWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        service: 'lamid-one',
        alertType,
        severity,
        userId,
        workspaceId,
        details: detailStr,
        ipAddress,
        timestamp: new Date(now).toISOString(),
      }),
      signal: AbortSignal.timeout(3000),
    }).catch(() => {});
  }

  return { id, alertType, severity, createdAt: now };
}

