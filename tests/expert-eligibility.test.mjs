// Engine audit 2026-10-05, H6: eligibility is a gate applied before ranking, and a credential
// counts only while it is verified, unexpired and not revoked.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isCurrentCredential,
  licenceCovers,
  checkEligibility,
} from '../src/app/expertEligibility.mjs';

const NOW = '2026-10-05T00:00:00.000Z';
const profile = {
  domains: '["legal"]',
  functions: '[]',
  industries: '[]',
  jurisdiction: 'UK',
  expected_response_hours: 24,
};
const licence = {
  type: 'license',
  verification_status: 'verified',
  expires_at: '2027-01-01',
  revoked_at: null,
  jurisdiction: 'UK',
  scope: 'legal',
};

test('a credential is current only while verified, unexpired and not revoked', () => {
  assert.equal(isCurrentCredential(licence, NOW), true);
  assert.equal(isCurrentCredential({ ...licence, expires_at: '2026-01-01' }, NOW), false);
  assert.equal(isCurrentCredential({ ...licence, revoked_at: '2026-09-01' }, NOW), false);
  assert.equal(isCurrentCredential({ ...licence, verification_status: 'pending' }, NOW), false);
});

test('a licence must state the jurisdiction it covers and match the category it is scoped to', () => {
  const need = { jurisdiction: 'UK', category: 'legal' };
  assert.equal(licenceCovers(licence, need, NOW), true);
  assert.equal(licenceCovers({ ...licence, jurisdiction: null }, need, NOW), false);
  assert.equal(licenceCovers({ ...licence, jurisdiction: 'FR' }, need, NOW), false);
  assert.equal(licenceCovers({ ...licence, scope: 'tax' }, need, NOW), false);
  assert.equal(licenceCovers({ ...licence, type: 'certification' }, need, NOW), false);
});

test('a licence requirement is not met by a declared jurisdiction alone', () => {
  const need = { domain: 'legal', jurisdiction: 'UK', credentialType: 'license' };
  const without = checkEligibility(profile, [], need, { now: NOW });
  assert.equal(without.eligible, false);
  assert.match(without.reasons.join(), /no current licence for UK/);
  assert.equal(checkEligibility(profile, [licence], need, { now: NOW }).eligible, true);
  const expired = checkEligibility(profile, [{ ...licence, expires_at: '2026-01-01' }], need, {
    now: NOW,
  });
  assert.equal(expired.eligible, false);
});

test('jurisdiction, response window and conflicts are gates, and every unmet one is reported', () => {
  const r = checkEligibility(
    { ...profile, jurisdiction: 'FR', expected_response_hours: null },
    [],
    { jurisdiction: 'UK', maxResponseHours: 48 },
    { restricted: true, now: NOW },
  );
  assert.equal(r.eligible, false);
  assert.equal(r.reasons.length, 3);
});
