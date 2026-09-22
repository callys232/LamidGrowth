import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aiRulesSchema, enforceFeature, scopeAIPayload, rulesFor } from '../src/app/aiRules.mjs';
import { scopedProvider } from '../src/app/aiPolicy.mjs';

test('human rules reject unknown powers, enforce features and bound points', () => {
  assert.throws(() => aiRulesSchema.parse({ deleteGoals: true }));
  assert.throws(() => aiRulesSchema.parse({ changes: { 'action.prepare': 'execute-anything' } }));
  assert.throws(() => enforceFeature({ rules: { pathways: false } }, 'pathways'), /block pathways/);
  assert.throws(
    () => enforceFeature({ rules: { maxPointsPerRequest: 5 } }, 'specialists', 65),
    /points limit/,
  );
  assert.equal(rulesFor({}).changes['action.prepare'], 'ask');
});

test('only user-allowed source types leave the workspace', () => {
  const policy = {
    rules: { allowedSources: ['objective'], instructions: 'Prefer low-cost trials.' },
  };
  const payload = {
    question: 'Help me plan',
    sources: [
      { id: 'goal', kind: 'objective', data: { title: 'Goal' } },
      { id: 'private', kind: 'knowledge', data: { secret: 'excluded' } },
    ],
  };
  const scoped = scopeAIPayload(policy, payload, 'pathways');
  assert.deepEqual(
    scoped.sources.map((source) => source.id),
    ['goal'],
  );
  assert.equal(scoped.planningPreferences, 'Prefer low-cost trials.');
  assert.equal(JSON.stringify(scoped).includes('excluded'), false);
  assert.throws(
    () => scopeAIPayload({ rules: { allowedSources: [] } }, payload, 'pathways'),
    /data rules/,
  );
});

test('external AI rejects a response when the human changes rules mid-request', async () => {
  let policy = { enabled: true, version: 1, dailyLimit: 10, rules: {} };
  let calls = 0;
  const store = {
    records: async () => [policy],
    transaction: async (work) => work(),
    db: {
      prepare: (sql) => ({
        get: async () =>
          sql.includes('FROM users')
            ? { verified_at: 'today', demo: false }
            : sql.includes('workspace_members')
              ? { role: 'owner' }
              : { n: 0 },
        run: async () => ({ changes: 1 }),
      }),
    },
  };
  const provider = {
    review: async () => {
      calls++;
      policy = { ...policy, version: 2, rules: { pathways: false } };
      return { review: { evidenceIds: ['goal'] } };
    },
  };
  const payload = { question: 'Plan', sources: [{ id: 'goal', kind: 'objective', data: {} }] };
  await assert.rejects(
    () => scopedProvider(store, provider, 'workspace', 'user', false, 'pathways').review(payload),
    /consent/,
  );
  assert.equal(calls, 0);
  await assert.rejects(
    () => scopedProvider(store, provider, 'workspace', 'user', true, 'pathways').review(payload),
    /rules changed/,
  );
  assert.equal(calls, 1);
});
