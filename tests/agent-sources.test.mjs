import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectAgentSources } from '../src/app/agentSources.mjs';
import { scopeAIPayload } from '../src/app/aiRules.mjs';

test('stored records without a kind remain usable under human data-sharing rules', async () => {
  const store = {
    records: async (workspace, kind) => {
      assert.equal(workspace, 'workspace');
      return [
        {
          id: kind,
          version: 1,
          title: `A ${kind}`,
          ...(kind === 'knowledge' ? { kind: 'objective' } : {}),
        },
      ];
    },
  };
  const sources = await collectAgentSources(store, 'workspace', ['knowledge']);
  assert.deepEqual(
    sources.map((source) => source.kind),
    ['objective', 'action', 'knowledge'],
  );
  const payload = scopeAIPayload(
    { rules: { allowedSources: ['objective'] } },
    { question: 'Help', sources },
    'specialists',
  );
  assert.deepEqual(
    payload.sources.map((source) => source.id),
    ['objective'],
  );
});

test('an empty workspace can request suggestions without falsely reporting blocked data', async () => {
  const sources = await collectAgentSources({ records: async () => [] }, 'empty-workspace');
  const payload = scopeAIPayload(
    { rules: { allowedSources: [] } },
    { question: 'Help me define a goal', sources },
    'specialists',
  );
  assert.deepEqual(payload.sources, []);
  assert.equal(payload.question, 'Help me define a goal');
});
