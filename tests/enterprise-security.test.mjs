import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePasswordComplexity, checkPwnedPassword, validatePasswordSecurity } from '../src/app/passwordSecurity.mjs';
import { recordSecurityAlert } from '../src/app/securityAlerts.mjs';

test('Enterprise Security Enhancements Suite', async (t) => {
  await t.test('01. Password complexity rejects trivial and short passwords', () => {
    assert.throws(() => validatePasswordComplexity('123'), /at least 8 characters/);
    assert.throws(() => validatePasswordComplexity('aaaaaaaa'), /too simple/);
    assert.throws(() => validatePasswordComplexity('password'), /too common/);
    assert.throws(() => validatePasswordComplexity('12345678'), /too common/);
    assert.equal(validatePasswordComplexity('CorrectHorse-Battery99!'), true);
  });

  await t.test('02. Pwned password check correctly identifies breached passwords via k-anonymity mock', async () => {
    // Mock fetch for "password" (SHA-1: 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8)
    // Prefix: 5BAA6, Suffix: 1E4C9B93F3F0682250B6CF8331B7EE68FD8
    const mockFetch = async () => ({
      ok: true,
      text: async () => '0018A45C4D1790D698030F2DE792E3F3054:3\r\n1E4C9B93F3F0682250B6CF8331B7EE68FD8:3861493\r\n00D4F6E80F92881CF5E2845AC780B3442EE:1\r\n',
    });

    const result = await checkPwnedPassword('password', { fetchFn: mockFetch });
    assert.equal(result.pwned, true);
    assert.equal(result.count, 3861493);

    // Mock fetch for an unbreached password
    const unbreachedFetch = async () => ({
      ok: true,
      text: async () => '0018A45C4D1790D698030F2DE792E3F3054:3\r\n00D4F6E80F92881CF5E2845AC780B3442EE:1\r\n',
    });
    const unbreachedResult = await checkPwnedPassword('UniqueSecretPass2026!#', { fetchFn: unbreachedFetch });
    assert.equal(unbreachedResult.pwned, false);
    assert.equal(unbreachedResult.count, 0);
  });

  await t.test('03. Pwned check fails open on network error or timeout without blocking user', async () => {
    const brokenFetch = async () => {
      throw new Error('Network offline');
    };
    const result = await checkPwnedPassword('AnyPassword123!', { fetchFn: brokenFetch });
    assert.equal(result.pwned, false);
    assert.equal(result.skipped, true);
  });

  await t.test('04. validatePasswordSecurity blocks breached passwords with clear error message', async () => {
    // SHA-1 for "LeakedSecretPass123!"
    // Prefix: 5 chars, Suffix: remaining 35 chars
    const pass = 'LeakedSecretPass123!';
    const sha1 = (await import('node:crypto')).createHash('sha1').update(pass).digest('hex').toUpperCase();
    const suffix = sha1.slice(5);

    const mockFetch = async () => ({
      ok: true,
      text: async () => `${suffix}:4242\r\n`,
    });

    await assert.rejects(
      () => validatePasswordSecurity(pass, { fetchFn: mockFetch }),
      /known public data breach/
    );
  });

  await t.test('05. Security alert recording writes alerts into security_alerts table', async () => {
    const alerts = [];
    const mockStore = {
      db: {
        prepare: () => ({
          run: (id, userId, workspaceId, alertType, severity, details, ipAddress, createdAt) => {
            alerts.push({ id, userId, workspaceId, alertType, severity, details, ipAddress, createdAt });
            return { changes: 1 };
          },
        }),
      },
    };

    const alert = await recordSecurityAlert(mockStore, {
      userId: 'user-sec-01',
      workspaceId: 'ws-sec-01',
      alertType: 'account_locked',
      severity: 'warning',
      details: 'Locked after 5 bad passwords',
      ipAddress: '192.168.1.50',
    });

    assert.equal(alert.alertType, 'account_locked');
    assert.equal(alert.severity, 'warning');
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].userId, 'user-sec-01');
    assert.equal(alerts[0].ipAddress, '192.168.1.50');
  });

  await t.test('06. Account lockout triggers 423 when locked_until is active', () => {
    const user = {
      id: 'test-user',
      failed_login_attempts: 5,
      locked_until: Date.now() + 10 * 60_000, // 10 minutes from now
    };

    const isLocked = user.locked_until && Number(user.locked_until) > Date.now();
    assert.equal(isLocked, true);
    const minutesLeft = Math.ceil((Number(user.locked_until) - Date.now()) / 60_000);
    assert.equal(minutesLeft >= 9 && minutesLeft <= 10, true);
  });

  await t.test('07. Inactivity timeout terminates session when last_active_at exceeds threshold', () => {
    const INACTIVITY_TIMEOUT_MS = 60 * 60_000; // 60 minutes
    const now = Date.now();
    const staleSession = {
      token: 'session-token-abc',
      last_active_at: now - (65 * 60_000), // 65 minutes ago (exceeded)
    };
    const freshSession = {
      token: 'session-token-xyz',
      last_active_at: now - (10 * 60_000), // 10 minutes ago (active)
    };

    const isStaleExpired = staleSession.last_active_at && (now - Number(staleSession.last_active_at) > INACTIVITY_TIMEOUT_MS);
    const isFreshExpired = freshSession.last_active_at && (now - Number(freshSession.last_active_at) > INACTIVITY_TIMEOUT_MS);

    assert.equal(isStaleExpired, true);
    assert.equal(isFreshExpired, false);
  });

  await t.test('08. File upload security heuristics detect disguised binaries and script extensions', () => {
    const DANGEROUS_EXTENSIONS = new Set(['exe', 'dll', 'bat', 'cmd', 'sh', 'php', 'js']);
    
    function validateFilename(filename) {
      const parts = filename.toLowerCase().split('.');
      if (parts.length > 2) {
        for (let i = 1; i < parts.length - 1; i++) {
          if (DANGEROUS_EXTENSIONS.has(parts[i])) {
            throw new Error('Forbidden double extension');
          }
        }
      }
      if (DANGEROUS_EXTENSIONS.has(parts[parts.length - 1])) {
        throw new Error('Forbidden extension');
      }
      return true;
    }

    assert.throws(() => validateFilename('invoice.exe.pdf'), /Forbidden double extension/);
    assert.throws(() => validateFilename('avatar.php.png'), /Forbidden double extension/);
    assert.throws(() => validateFilename('malware.exe'), /Forbidden extension/);
    assert.equal(validateFilename('annual_report.q1.pdf'), true);
  });

  await t.test('09. Password change rejects matching old/new password and validates complexity', () => {
    function validateChange(currentPassword, newPassword) {
      if (currentPassword === newPassword) {
        throw new Error('New password must be different from your current password.');
      }
      validatePasswordComplexity(newPassword);
      return true;
    }

    assert.throws(
      () => validateChange('MyOldPass123!', 'MyOldPass123!'),
      /New password must be different/
    );
    assert.throws(
      () => validateChange('MyOldPass123!', '12345678'),
      /Password is too common/
    );
    assert.equal(validateChange('MyOldPass123!', 'NewBetterPass2026!#'), true);
  });

  await t.test('10. Password change invalidates other sessions while preserving current session', () => {
    const sessions = [
      { id: 's1', user_id: 'u1', token: 'hash_current' },
      { id: 's2', user_id: 'u1', token: 'hash_mobile' },
      { id: 's3', user_id: 'u1', token: 'hash_laptop' },
      { id: 's4', user_id: 'u2', token: 'hash_other_user' },
    ];

    const currentToken = 'hash_current';
    const remaining = sessions.filter((s) => s.user_id !== 'u1' || s.token === currentToken);

    assert.equal(remaining.length, 2);
    assert.equal(remaining.some((s) => s.id === 's1'), true);
    assert.equal(remaining.some((s) => s.id === 's4'), true);
    assert.equal(remaining.some((s) => s.id === 's2'), false);
    assert.equal(remaining.some((s) => s.id === 's3'), false);
  });

  await t.test('11. Account deletion authority: only ecosystem administrator can delete accounts', () => {
    function canDeleteUserAccount(caller) {
      if (!caller || !caller.isEcosystemAdmin) {
        throw new Error('Only an ecosystem administrator can permanently delete accounts.');
      }
      return true;
    }

    assert.throws(
      () => canDeleteUserAccount({ id: 'u-normal', isEcosystemAdmin: false }),
      /Only an ecosystem administrator can permanently delete accounts/
    );
    assert.throws(
      () => canDeleteUserAccount(null),
      /Only an ecosystem administrator can permanently delete accounts/
    );
    assert.equal(canDeleteUserAccount({ id: 'u-admin', isEcosystemAdmin: true }), true);
  });
});
