import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseVerificationVerdict } from '../src/app/verification.mjs';

test('prose, negation and malformed output never become positive verdicts', () => {
  for (const value of [
    'does not satisfy',
    'does not meet',
    'passes everything',
    '{}',
    '{"verdict":"satisfied"}',
    '{"verdict":"unknown","rationale":"x"}',
  ]) {
    assert.equal(parseVerificationVerdict(value).result, 'insufficient_evidence');
  }
});
test('only explicit validated verdicts are accepted', () => {
  for (const verdict of ['satisfied', 'not_satisfied', 'insufficient_evidence']) {
    assert.deepEqual(
      parseVerificationVerdict(
        JSON.stringify({ verdict, rationale: 'Reviewed supplied evidence.' }),
      ),
      { result: verdict, rationale: 'Reviewed supplied evidence.' },
    );
  }
});
