import { createHash } from 'node:crypto';

/**
 * Checks password complexity.
 * - Min length: 8
 * - Max length: 128
 * - Disallows trivial passwords and all-identical characters
 */
export function validatePasswordComplexity(password) {
  if (typeof password !== 'string') {
    throw Object.assign(new Error('Password must be a valid string.'), { status: 400 });
  }
  if (password.length < 8) {
    throw Object.assign(new Error('Password must be at least 8 characters long.'), { status: 400 });
  }
  if (password.length > 128) {
    throw Object.assign(new Error('Password must not exceed 128 characters.'), { status: 400 });
  }

  // Reject all identical characters (e.g. "aaaaaaaa")
  if (/^(.)\1+$/.test(password)) {
    throw Object.assign(new Error('Password is too simple. Please choose a more varied password.'), { status: 400 });
  }

  // Reject common trivial passwords
  const commonTrivial = new Set([
    'password', 'password1', '12345678', '123456789', 'qwertyuiop', 'admin123', 'welcome1'
  ]);
  if (commonTrivial.has(password.toLowerCase())) {
    throw Object.assign(new Error('Password is too common. Please choose a stronger password.'), { status: 400 });
  }

  return true;
}

/**
 * Checks HaveIBeenPwned API (k-anonymity) to verify if a password has appeared in known public breaches.
 * Never sends the full password - only the 5-character SHA-1 prefix.
 * Gracefully falls back (does not block registration) if the service is unreachable or offline.
 */
export async function checkPwnedPassword(password, { timeoutMs = 1500, fetchFn = globalThis.fetch } = {}) {
  try {
    const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    if (typeof fetchFn !== 'function') {
      return { pwned: false, skipped: true };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetchFn(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'User-Agent': 'LAMID-ONE-Security-Check' },
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!response.ok) {
      return { pwned: false, skipped: true, status: response.status };
    }

    const text = await response.text();
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      const [hashSuffix, countStr] = line.trim().split(':');
      if (hashSuffix && hashSuffix.toUpperCase() === suffix) {
        const count = Number.parseInt(countStr, 10) || 1;
        return { pwned: true, count };
      }
    }

    return { pwned: false, count: 0 };
  } catch (_err) {
    // Fail-open for network timeouts/offline environments so valid users aren't locked out
    return { pwned: false, skipped: true };
  }
}

/**
 * Full password validation: complexity + compromised password check
 */
export async function validatePasswordSecurity(password, options = {}) {
  validatePasswordComplexity(password);
  const pwnedResult = await checkPwnedPassword(password, options);
  if (pwnedResult.pwned) {
    throw Object.assign(
      new Error(
        'This password has appeared in a known public data breach. For your protection, please choose a different password.'
      ),
      { status: 400 }
    );
  }
  return true;
}

