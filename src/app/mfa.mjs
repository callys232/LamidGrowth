// SEC-01: dependency-free TOTP (RFC 6238) for account MFA and step-up verification on
// high-risk admin actions. Interoperable with any standard authenticator app (Google
// Authenticator, Authy, 1Password, etc.) since it implements the same HMAC-SHA1/30s/6-digit
// scheme they all expect — no vendor account or external service required to build this part.
import {
  randomBytes,
  createHmac,
  timingSafeEqual,
  createHash,
  createCipheriv,
  createDecipheriv,
} from 'node:crypto';

// Same AES-256-GCM-at-rest pattern as the mail outbox (src/app/mail.mjs) — the TOTP secret is
// as sensitive as a password reset link and must never be recoverable from a database dump alone.
export function encryptSecret(key, secret) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64')).join('.');
}

export function decryptSecret(key, payload) {
  const [iv, tag, data] = payload.split('.').map((s) => Buffer.from(s, 'base64'));
  const cipher = createDecipheriv('aes-256-gcm', key, iv);
  cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(data), cipher.final()]).toString('utf8');
}

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function base32Decode(input) {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpSecret() {
  return base32Encode(randomBytes(20));
}

function hotp(secretBuffer, counter, digits = 6) {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', secretBuffer).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(binary % 10 ** digits).padStart(digits, '0');
}

export function totp(base32Secret, { timeStepSeconds = 30, digits = 6, at = Date.now() } = {}) {
  const counter = Math.floor(at / 1000 / timeStepSeconds);
  return hotp(base32Decode(base32Secret), counter, digits);
}

// Accepts the current step and one step on either side to tolerate clock drift, matching what
// every mainstream authenticator app assumes the server will do.
export function verifyTotp(base32Secret, token, { timeStepSeconds = 30, digits = 6, at = Date.now(), window = 1 } = {}) {
  if (!/^\d{6}$/.test(String(token || ''))) return false;
  const secretBuffer = base32Decode(base32Secret);
  const counter = Math.floor(at / 1000 / timeStepSeconds);
  for (let drift = -window; drift <= window; drift++) {
    const candidate = hotp(secretBuffer, counter + drift, digits);
    if (timingSafeEqual(Buffer.from(candidate), Buffer.from(String(token)))) return true;
  }
  return false;
}

export function otpauthUrl(base32Secret, accountLabel, issuer = 'LAMID ONE') {
  const params = new URLSearchParams({
    secret: base32Secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountLabel)}?${params.toString()}`;
}

export function generateRecoveryCodes(count = 10) {
  return Array.from({ length: count }, () => randomBytes(5).toString('hex'));
}

export function hashRecoveryCode(code) {
  return createHash('sha256').update(String(code || '').trim().toLowerCase()).digest('hex');
}
