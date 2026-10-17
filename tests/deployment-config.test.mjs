import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProductionConfig } from '../src/app/operations.mjs';

const valid = {
  ACCOUNT_SECURITY_KEY: 'a'.repeat(64),
  PUBLIC_ORIGIN: 'https://api.example.test',
  DATABASE_URL: 'postgresql://example.test/app',
  RESEND_API_KEY: 'test-only',
  MAIL_FROM: 'demo@example.test',
  FRONTEND_ORIGINS: 'https://app.example.test',
  DEMO_PUBLIC_ORIGIN: 'https://app.example.test',
  TRUST_PROXY_HOPS: '1',
};

test('mail signing, shared rate and explicit retention settings are validated', () => {
  assert.doesNotThrow(() =>
    validateProductionConfig({
      ...valid,
      RESEND_WEBHOOK_SECRET: `whsec_${Buffer.alloc(32).toString('base64')}`,
      MAIL_REQUESTS_PER_SECOND: '2',
      RETENTION_ENABLED: 'true',
      DEMO_RETENTION_DAYS: '90',
      MAIL_RETENTION_DAYS: '90',
    }),
  );
  for (const override of [
    { RESEND_WEBHOOK_SECRET: 'invalid' },
    { MAIL_REQUESTS_PER_SECOND: '1.5' },
    { MAIL_REQUESTS_PER_SECOND: '0' },
    { RETENTION_ENABLED: 'true' },
    { RETENTION_ENABLED: 'true', DEMO_RETENTION_DAYS: '1', MAIL_RETENTION_DAYS: '90' },
  ])
    assert.throws(() => validateProductionConfig({ ...valid, ...override }));
});
test('production permits a configured split frontend and API', () =>
  assert.doesNotThrow(() => validateProductionConfig(valid)));
test('account email origin must be secure and belong to the frontend allowlist', () => {
  assert.doesNotThrow(() =>
    validateProductionConfig({ ...valid, ACCOUNT_PUBLIC_ORIGIN: 'https://app.example.test' }),
  );
  for (const origin of [
    'http://app.example.test',
    'https://app.example.test/account',
    'https://other.example.test',
  ])
    assert.throws(() => validateProductionConfig({ ...valid, ACCOUNT_PUBLIC_ORIGIN: origin }));
});
test('production rejects unsafe or mismatched demo origins', () => {
  for (const origin of [
    'http://app.example.test',
    'https://user:secret@app.example.test',
    'https://app.example.test/demo',
    'https://app.example.test/?token=private',
    'https://app.example.test/#private',
    'not-a-url',
    'https://other.example.test',
  ])
    assert.throws(() => validateProductionConfig({ ...valid, DEMO_PUBLIC_ORIGIN: origin }));
  assert.throws(() =>
    validateProductionConfig({
      ...valid,
      FRONTEND_ORIGINS: 'https://app.example.test, http://untrusted.example.test',
    }),
  );
});
test('production rejects missing mail, invalid proxy settings and insecure cookies', () => {
  for (const override of [
    { MAIL_FROM: '' },
    { RESEND_API_KEY: '' },
    { TRUST_PROXY_HOPS: 'true' },
    { TRUST_PROXY_HOPS: '0' },
    { COOKIE_SECURE: 'false' },
    { ACCOUNT_SECURITY_KEY: '' },
    { DATABASE_URL: '' },
  ])
    assert.throws(() => validateProductionConfig({ ...valid, ...override }));
});
